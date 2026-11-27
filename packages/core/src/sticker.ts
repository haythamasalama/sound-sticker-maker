import { StickerError, throwIfAborted } from './errors'
import { sha256Base64 } from './format/bytes'
import { buildStickerMetadata, stickerExif } from './format/sticker-metadata'
import { buildAnimatedWebp, extractFrame, type EncodedFrame, type TimedFrame } from './format/webp'
import { CAPTURE_MEMORY_BYTES, MAX_SECONDS, MAX_STICKER_BYTES, STICKER_SIDE } from './limits'
import { encodeOggOpus, extractPcm } from './media/audio'
import { releaseFrames, sameFingerprint, type CapturedFrame, type Shape } from './media/frames'
import { captureAnimation, captureImage } from './media/still'
import { captureVideo } from './media/video'
import { candidates, captureFpsFor, mergeSlots, qualitiesFor, slotsFor, stretchTimeline, type Fit } from './plan'

export type VisualSource =
  { kind: 'video'; file: Blob; start: number; duration: number } | { kind: 'animation'; file: Blob } | { kind: 'image'; file: Blob }

export interface AudioSource {
  file: Blob
  start: number
  duration: number
}

export type Stage = 'sound' | 'reading' | 'sizing' | 'encoding'

export interface StickerRequest {
  visual: VisualSource
  audio: AudioSource
  shape?: Shape
  fit?: Fit
  packName?: string
  publisher?: string
  signal?: AbortSignal
  onProgress?: (stage: Stage, fraction: number) => void
}

export interface SoundSticker {
  /** Animated WebP with WhatsApp's sticker metadata. */
  webp: Blob
  /** Ogg Opus, mono 48 kHz. */
  audio: Blob
  side: number
  fps: number
  quality: number
  frames: number
  seconds: number
  soundSha256: string
}

const SAMPLE_FRAMES = 4

function frameEncoder(side: number) {
  const canvas = new OffscreenCanvas(side, side)
  const ctx = canvas.getContext('2d')!
  return async (frame: CapturedFrame, quality: number): Promise<EncodedFrame> => {
    ctx.clearRect(0, 0, side, side)
    ctx.drawImage(frame.bitmap, 0, 0, side, side)
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
    if (blob.type !== 'image/webp') throw new StickerError('unsupported-browser', `The browser can't write WebP (got ${blob.type})`)
    return extractFrame(new Uint8Array(await blob.arrayBuffer()))
  }
}

async function captureFrames(request: StickerRequest, seconds: number, fps: number, side: number): Promise<CapturedFrame[]> {
  const { visual, signal } = request
  const shape = request.shape ?? 'contain'
  const onProgress = (fraction: number) => request.onProgress?.('reading', fraction)
  if (visual.kind === 'image') return [await captureImage(visual.file, side, shape)]
  if (visual.kind === 'animation') return captureAnimation(visual.file, { side, fps, shape, signal, onProgress })
  return captureVideo(visual.file, visual.start, Math.min(visual.duration, seconds), { side, fps, shape, signal, onProgress })
}

/**
 * Builds a sound sticker: the picture as an animated WebP under WhatsApp's 500 KB limit, and the sound as Ogg Opus.
 * The sticker lasts as long as the sound; a shorter picture loops or holds its last frame.
 */
export async function createSoundSticker(request: StickerRequest): Promise<SoundSticker> {
  const { visual, audio, signal } = request
  const seconds = audio.duration
  if (!(seconds > 0)) throw new StickerError('audio-out-of-range')
  if (seconds > MAX_SECONDS + 0.01) throw new StickerError('too-long', `Sound stickers can be up to ${MAX_SECONDS} s`)

  request.onProgress?.('sound', 0)
  const separateSound = visual.kind !== 'video' || audio.file !== visual.file
  const pcm = await extractPcm(audio.file, audio.start, audio.duration, separateSound ? 8 : 0)
  throwIfAborted(signal)
  const ogg = await encodeOggOpus(pcm)
  const soundSha256 = await sha256Base64(ogg)
  request.onProgress?.('sound', 1)

  const still = visual.kind === 'image'
  const captureFps = still ? 1 : captureFpsFor(seconds)
  const slotsNeeded = still ? 1 : Math.ceil(seconds * captureFps)
  const captureSide = Math.max(128, Math.min(STICKER_SIDE, Math.floor(Math.sqrt(CAPTURE_MEMORY_BYTES / (4 * slotsNeeded)))))
  const captured = await captureFrames(request, seconds, captureFps, captureSide)
  try {
    throwIfAborted(signal)
    const timeline = still ? [0] : stretchTimeline(captured.length, captureFps, Math.max(seconds, 1 / captureFps), request.fit ?? 'loop')
    const same = (a: number, b: number) => sameFingerprint(captured[a]!, captured[b]!)
    const slotsAt = (fps: number) =>
      still ? [{ index: 0, durationMs: Math.round(seconds * 1000) }] : mergeSlots(slotsFor(timeline, captureFps, fps), same)

    const distinctIndexes = [...new Set(timeline)].filter((index, i, all) => i === 0 || !same(all[i - 1]!, index))
    const sampleIndexes = Array.from(
      new Set(Array.from({ length: SAMPLE_FRAMES }, (_, i) => distinctIndexes[Math.floor((i * distinctIndexes.length) / SAMPLE_FRAMES)]!)),
    )
    const encoders = new Map<number, ReturnType<typeof frameEncoder>>()
    const encoderFor = (side: number) => {
      let encoder = encoders.get(side)
      if (!encoder) encoders.set(side, (encoder = frameEncoder(side)))
      return encoder
    }
    const measured = new Map<string, number>()
    const bytesPerFrame = async (side: number, quality: number) => {
      const key = `${side}@${quality}`
      if (!measured.has(key)) {
        throwIfAborted(signal)
        let total = 0
        for (const index of sampleIndexes) total += (await encoderFor(side)(captured[index]!, quality)).payload.length
        measured.set(key, total / sampleIndexes.length)
      }
      return measured.get(key)!
    }

    request.onProgress?.('sizing', 0)
    const exif = stickerExif(await buildStickerMetadata({ packName: request.packName, publisher: request.publisher, soundSha256 }))
    const plans = candidates({
      maxSide: captureSide,
      maxFps: captureFps,
      still,
      distinct: (fps) => slotsAt(fps).length,
      bytesPerFrame,
    })

    for await (const candidate of plans) {
      const slots = slotsAt(candidate.fps)
      const encode = encoderFor(candidate.side)
      for (const quality of qualitiesFor(candidate.side).filter((q) => q <= candidate.quality)) {
        request.onProgress?.('encoding', 0)
        const cache = new Map<number, EncodedFrame>()
        const frames: TimedFrame[] = []
        for (let i = 0; i < slots.length; i++) {
          throwIfAborted(signal)
          const slot = slots[i]!
          let encoded = cache.get(slot.index)
          if (!encoded) cache.set(slot.index, (encoded = await encode(captured[slot.index]!, quality)))
          frames.push({ ...encoded, durationMs: slot.durationMs })
          request.onProgress?.('encoding', (i + 1) / slots.length)
        }
        const webp = buildAnimatedWebp(frames, candidate.side, exif)
        if (webp.length <= MAX_STICKER_BYTES) {
          return {
            webp: new Blob([webp as BlobPart], { type: 'image/webp' }),
            audio: new Blob([ogg as BlobPart], { type: 'audio/ogg; codecs=opus' }),
            side: candidate.side,
            fps: still ? 0 : candidate.fps,
            quality,
            frames: frames.length,
            seconds,
            soundSha256,
          }
        }
      }
    }
    throw new StickerError('too-large', 'Nothing fits in 500 KB: choose a shorter part')
  } finally {
    releaseFrames(captured)
  }
}
