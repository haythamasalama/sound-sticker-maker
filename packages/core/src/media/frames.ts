export type Shape = 'contain' | 'cover'

export interface CapturedFrame {
  bitmap: ImageBitmap
  /** 32×32 RGBA thumbnail: two frames with the same fingerprint are treated as one. */
  fingerprint: Uint8ClampedArray
}

type Drawable = HTMLVideoElement | VideoFrame | ImageBitmap

function sizeOf(source: Drawable): { width: number; height: number } {
  if ('videoWidth' in source) return { width: source.videoWidth, height: source.videoHeight }
  if ('displayWidth' in source) return { width: source.displayWidth, height: source.displayHeight }
  return { width: source.width, height: source.height }
}

export function drawSquare(ctx: OffscreenCanvasRenderingContext2D, source: Drawable, side: number, shape: Shape): void {
  const { width, height } = sizeOf(source)
  const scale = shape === 'cover' ? Math.max(side / width, side / height) : Math.min(side / width, side / height)
  const w = width * scale
  const h = height * scale
  ctx.clearRect(0, 0, side, side)
  ctx.drawImage(source as CanvasImageSource, (side - w) / 2, (side - h) / 2, w, h)
}

/** Draws sources into a square and keeps a bitmap plus a fingerprint of each. */
export function createSnapper(side: number, shape: Shape): (source: Drawable) => Promise<CapturedFrame> {
  const canvas = new OffscreenCanvas(side, side)
  const ctx = canvas.getContext('2d')!
  const thumb = new OffscreenCanvas(32, 32)
  const thumbCtx = thumb.getContext('2d', { willReadFrequently: true })!
  return async (source) => {
    drawSquare(ctx, source, side, shape)
    thumbCtx.clearRect(0, 0, 32, 32)
    thumbCtx.drawImage(canvas, 0, 0, 32, 32)
    const fingerprint = thumbCtx.getImageData(0, 0, 32, 32).data
    return { bitmap: await createImageBitmap(canvas), fingerprint }
  }
}

export function sameFingerprint(a: CapturedFrame, b: CapturedFrame): boolean {
  if (a === b) return true
  const x = a.fingerprint
  const y = b.fingerprint
  if (x.length !== y.length) return false
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false
  return true
}

export function releaseFrames(frames: readonly CapturedFrame[]): void {
  for (const frame of new Set(frames)) frame.bitmap.close()
}
