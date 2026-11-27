import { StickerError, throwIfAborted } from '../errors'
import { createSnapper, type CapturedFrame, type Shape } from './frames'

/** GIF, animated WebP and APNG: <video> can't open them, WebCodecs' ImageDecoder can. */
export function isAnimationFile(file: File | Blob): boolean {
  const name = 'name' in file ? file.name : ''
  return /^image\/(gif|webp|png|apng)$/i.test(file.type) || /\.(gif|webp|png|apng)$/i.test(name)
}

function imageType(file: File | Blob): string {
  if (file.type.startsWith('image/')) return file.type
  const ext = ('name' in file ? file.name : '').split('.').pop()?.toLowerCase() ?? ''
  return (
    (
      { gif: 'image/gif', webp: 'image/webp', png: 'image/png', apng: 'image/apng', jpg: 'image/jpeg', jpeg: 'image/jpeg' } as Record<
        string,
        string
      >
    )[ext] ?? 'image/gif'
  )
}

interface DecodedAnimation {
  decoder: ImageDecoder
  frameCount: number
  /** Milliseconds each frame stays on screen. */
  durations: number[]
  width: number
  height: number
}

async function openAnimation(file: Blob): Promise<DecodedAnimation> {
  if (typeof ImageDecoder === 'undefined') throw new StickerError('unsupported-browser', 'ImageDecoder is missing')
  const type = imageType(file)
  if (!(await ImageDecoder.isTypeSupported(type))) throw new StickerError('unreadable-image', `Unsupported image type ${type}`)
  const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type })
  try {
    await decoder.tracks.ready
    await decoder.completed
    const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 1
    const durations: number[] = []
    let width = 0
    let height = 0
    for (let i = 0; i < frameCount; i++) {
      const { image } = await decoder.decode({ frameIndex: i })
      // Browsers treat frame delays under ~20 ms as 100 ms, so we do the same.
      const ms = (image.duration ?? 100000) / 1000
      durations.push(ms < 20 ? 100 : ms)
      width = image.displayWidth
      height = image.displayHeight
      image.close()
    }
    return { decoder, frameCount, durations, width, height }
  } catch (cause) {
    decoder.close()
    if (cause instanceof StickerError) throw cause
    throw new StickerError('unreadable-image', "Couldn't decode the animation", { cause })
  }
}

export interface AnimationProbe {
  duration: number
  frameCount: number
  width: number
  height: number
}

export async function probeAnimation(file: Blob): Promise<AnimationProbe> {
  const animation = await openAnimation(file)
  animation.decoder.close()
  const total = animation.durations.reduce((sum, ms) => sum + ms, 0) / 1000
  return { duration: total, frameCount: animation.frameCount, width: animation.width, height: animation.height }
}

export async function captureAnimation(
  file: Blob,
  options: { side: number; fps: number; shape: Shape; signal?: AbortSignal; onProgress?: (fraction: number) => void },
): Promise<CapturedFrame[]> {
  const animation = await openAnimation(file)
  try {
    const snap = createSnapper(options.side, options.shape)
    const starts: number[] = []
    let total = 0
    for (const ms of animation.durations) {
      starts.push(total)
      total += ms
    }
    const count = Math.max(1, Math.round((total / 1000) * options.fps))
    const byIndex = new Map<number, CapturedFrame>()
    const frames: CapturedFrame[] = []
    let source = 0
    for (let i = 0; i < count; i++) {
      throwIfAborted(options.signal)
      const at = ((i + 0.5) * 1000) / options.fps
      while (source + 1 < starts.length && starts[source + 1]! <= at) source++
      let frame = byIndex.get(source)
      if (!frame) {
        const { image } = await animation.decoder.decode({ frameIndex: source })
        frame = await snap(image)
        image.close()
        byIndex.set(source, frame)
      }
      frames.push(frame)
      options.onProgress?.((i + 1) / count)
    }
    return frames
  } finally {
    animation.decoder.close()
  }
}

export interface ImageProbe {
  width: number
  height: number
  animated: boolean
}

export async function probeImage(file: Blob): Promise<ImageProbe> {
  if (isAnimationFile(file) && typeof ImageDecoder !== 'undefined') {
    try {
      const animation = await probeAnimation(file)
      return { width: animation.width, height: animation.height, animated: animation.frameCount > 1 }
    } catch {
      // fall back to a still decode below
    }
  }
  const bitmap = await createImageBitmap(file).catch((cause: unknown) => {
    throw new StickerError('unreadable-image', "Couldn't read the image", { cause })
  })
  const result = { width: bitmap.width, height: bitmap.height, animated: false }
  bitmap.close()
  return result
}

export async function captureImage(file: Blob, side: number, shape: Shape): Promise<CapturedFrame> {
  const bitmap = await createImageBitmap(file).catch((cause: unknown) => {
    throw new StickerError('unreadable-image', "Couldn't read the image", { cause })
  })
  try {
    return await createSnapper(side, shape)(bitmap)
  } finally {
    bitmap.close()
  }
}
