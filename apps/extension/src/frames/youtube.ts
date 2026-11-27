/**
 * Runs in YouTube embeds. Acts only in the hidden player the panel creates, which carries the request in
 * its URL hash (#ssm=<id>:<start>:<duration>), and records that part straight from the player.
 */
import { base64FromBuffer, type ClipErrorCode, type RuntimeMessage } from '../lib/messages'

const request = location.hash.match(/ssm=([\w-]+):([\d.]+):([\d.]+)/)

class ClipError extends Error {
  constructor(readonly code: ClipErrorCode) {
    super(code)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor<T>(check: () => T | null | undefined | false, timeoutMs: number, code: ClipErrorCode): Promise<T> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const value = check()
    if (value) return value
    if (document.querySelector('.ytp-error')) throw new ClipError('blocked')
    await sleep(200)
  }
  throw new ClipError(code)
}

const adShowing = () => !!document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting')

async function skipAds(): Promise<void> {
  const start = Date.now()
  while (adShowing()) {
    if (Date.now() - start > 90000) throw new ClipError('timeout')
    document.querySelector<HTMLElement>('.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button')?.click()
    await sleep(400)
  }
}

function once(target: EventTarget, event: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs)
    target.addEventListener(event, () => (clearTimeout(timer), resolve(true)), { once: true })
  })
}

async function record(start: number, duration: number): Promise<Blob> {
  const video = await waitFor(() => document.querySelector<HTMLVideoElement>('video.html5-main-video, video'), 30000, 'no-video')
  await skipAds()
  await waitFor(() => !adShowing() && Number.isFinite(video.duration) && video.duration > 0 && video, 30000, 'no-video')
  if (start >= video.duration) throw new ClipError('past-end')
  const end = Math.min(start + duration, video.duration)

  // The captured stream keeps the sound at full level even with the element silent, so nothing is heard.
  video.volume = 0
  video.pause()
  video.currentTime = start
  await once(video, 'seeked', 15000)

  let stream: MediaStream
  try {
    stream = (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream()
  } catch {
    throw new ClipError('capture')
  }
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m))
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data)
  const stopped = once(recorder, 'stop', 10000)

  const playing = once(video, 'playing', 20000)
  await video.play().catch(async () => {
    // Without a user gesture the embed may only autoplay muted; the stream still carries the sound.
    video.muted = true
    await video.play().catch(() => undefined)
  })
  if (!(await playing) && video.paused) throw new ClipError('no-play')
  recorder.start(250)
  // Keep buffering stalls out of the clip: pause while the player waits for data.
  video.addEventListener('waiting', () => recorder.state === 'recording' && recorder.pause())
  video.addEventListener('playing', () => recorder.state === 'paused' && recorder.resume())

  const deadline = Date.now() + (end - start) * 1000 + 20000
  while (video.currentTime < end - 0.05 && !video.ended) {
    if (Date.now() > deadline) {
      recorder.stop()
      throw new ClipError('timeout')
    }
    await sleep(50)
  }
  recorder.stop()
  video.pause()
  await stopped
  stream.getTracks().forEach((track) => track.stop())
  const blob = new Blob(chunks, { type: 'video/webm' })
  if (!blob.size) throw new ClipError('capture')
  return blob
}

if (request) {
  const [, requestId, start, duration] = request
  const send = (message: RuntimeMessage) => chrome.runtime.sendMessage(message).catch(() => undefined)
  record(Number(start), Number(duration))
    .then(async (blob) =>
      send({
        type: 'clip',
        requestId: requestId!,
        ok: true,
        base64: base64FromBuffer(await blob.arrayBuffer()),
        mime: 'video/webm',
        title: document.title.replace(/\s*-\s*YouTube\s*$/, '') || 'youtube',
      }),
    )
    .catch((error: unknown) =>
      send({
        type: 'clip',
        requestId: requestId!,
        ok: false,
        error: error instanceof ClipError ? error.code : 'capture',
        detail: String((error as Error)?.message ?? error),
      }),
    )
}
