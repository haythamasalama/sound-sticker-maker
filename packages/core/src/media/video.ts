import { StickerError, throwIfAborted } from '../errors'
import { createSnapper, type CapturedFrame, type Shape } from './frames'

interface LoadedVideo {
  video: HTMLVideoElement
  /** Some trimmed files keep timestamps that start later than 0; Chrome lands on the first frame. */
  offset: number
  release(): void
}

function waitFor(target: EventTarget, event: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs)
    target.addEventListener(
      event,
      () => {
        clearTimeout(timer)
        resolve(true)
      },
      { once: true },
    )
  })
}

async function seekTo(video: HTMLVideoElement, time: number, timeoutMs = 8000): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.0005 && video.readyState >= 2) return
  const seeked = waitFor(video, 'seeked', timeoutMs)
  video.currentTime = time
  if (!(await seeked)) throw new StickerError('timeout', `Seeking to ${time.toFixed(2)} s took too long`)
}

/** WebM written by MediaRecorder has no duration, so Chrome reports Infinity until it has read the whole file. */
async function resolveDuration(video: HTMLVideoElement): Promise<void> {
  if (video.duration === Infinity) {
    const known = new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 10000)
      const check = () => {
        if (!Number.isFinite(video.duration)) return
        clearTimeout(timer)
        video.removeEventListener('durationchange', check)
        resolve()
      }
      video.addEventListener('durationchange', check)
    })
    video.currentTime = 1e101
    await known
  }
  // Chrome may also under-report a duration until it reaches the end: jump there while it keeps growing.
  for (let i = 0; i < 8 && Number.isFinite(video.duration); i++) {
    const before = video.duration
    const seeked = waitFor(video, 'seeked', 3000)
    video.currentTime = Math.max(0, before - 0.01)
    await seeked
    if (!(video.duration > before + 0.01)) break
  }
}

export async function loadVideo(file: Blob): Promise<LoadedVideo> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  const url = URL.createObjectURL(file)
  const release = () => {
    URL.revokeObjectURL(url)
    video.removeAttribute('src')
    video.load()
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new StickerError('timeout', 'Loading the video took too long')), 30000)
      video.onloadeddata = () => {
        clearTimeout(timer)
        resolve()
      }
      video.onerror = () => {
        clearTimeout(timer)
        reject(new StickerError('unreadable-video', video.error?.message || 'The browser cannot play this video'))
      }
      video.src = url
    })
    const offset = Number.isFinite(video.currentTime) ? video.currentTime : 0
    if (video.readyState < 4) await waitFor(video, 'canplaythrough', 5000)
    await resolveDuration(video)
    if (!Number.isFinite(video.duration)) throw new StickerError('unreadable-video', 'The video has no readable duration')
    await seekTo(video, offset, 3000).catch(() => undefined)
    return { video, offset, release }
  } catch (error) {
    release()
    throw error
  }
}

export interface VideoProbe {
  duration: number
  width: number
  height: number
}

export async function probeVideo(file: Blob): Promise<VideoProbe> {
  const { video, offset, release } = await loadVideo(file)
  try {
    if (!video.videoWidth || !video.videoHeight) throw new StickerError('no-picture')
    return { duration: video.duration - offset, width: video.videoWidth, height: video.videoHeight }
  } finally {
    release()
  }
}

export interface CaptureOptions {
  side: number
  fps: number
  shape: Shape
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

/** Seeks to the middle of every frame slot: a seek that lands on a boundary sometimes returns the previous frame. */
export async function captureVideo(file: Blob, start: number, duration: number, options: CaptureOptions): Promise<CapturedFrame[]> {
  const { video, offset, release } = await loadVideo(file)
  try {
    if (!video.videoWidth || !video.videoHeight) throw new StickerError('no-picture')
    const snap = createSnapper(options.side, options.shape)
    const count = Math.max(1, Math.round(duration * options.fps))
    const last = Math.max(0, video.duration - 0.001)
    const frames: CapturedFrame[] = []
    for (let i = 0; i < count; i++) {
      throwIfAborted(options.signal)
      await seekTo(video, Math.min(offset + start + (i + 0.5) / options.fps, last))
      frames.push(await snap(video))
      options.onProgress?.((i + 1) / count)
    }
    return frames
  } finally {
    release()
  }
}
