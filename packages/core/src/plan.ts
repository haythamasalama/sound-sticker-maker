import { FRAME_RATES, MIN_QUALITY, QUALITY_BY_SIDE, SIDES, TARGET_STICKER_BYTES } from './limits'

/** How the picture fills the sticker when it's shorter than the sound. */
export type Fit = 'loop' | 'freeze'

export interface FrameSlot {
  /** Index into the captured frames. */
  index: number
  durationMs: number
}

/** Frame rate to capture at, by sticker length: what can still fit in 1 MB. */
export function captureFpsFor(seconds: number): number {
  if (seconds <= 10) return 30
  if (seconds <= 20) return 20
  return 15
}

/** Stretches the captured frames over the sticker's length, looping or holding the last frame. */
export function stretchTimeline(capturedCount: number, captureFps: number, stickerSeconds: number, fit: Fit): number[] {
  const count = Math.max(1, Math.round(stickerSeconds * captureFps))
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const index = fit === 'loop' ? i % capturedCount : Math.min(i, capturedCount - 1)
    out.push(index)
  }
  return out
}

/** Picks which captured frames to keep at a lower frame rate and how long each one shows. */
export function slotsFor(timeline: readonly number[], captureFps: number, fps: number): FrameSlot[] {
  const seconds = timeline.length / captureFps
  const totalMs = Math.round(seconds * 1000)
  const count = Math.max(1, Math.round(seconds * fps))
  const slots: FrameSlot[] = []
  for (let k = 0; k < count; k++) {
    const startMs = Math.round((k * 1000) / fps)
    const endMs = k === count - 1 ? totalMs : Math.min(totalMs, Math.round(((k + 1) * 1000) / fps))
    const at = Math.min(timeline.length - 1, Math.round((k * captureFps) / fps))
    slots.push({ index: timeline[at]!, durationMs: Math.max(1, endMs - startMs) })
  }
  return slots
}

/** Joins neighbouring slots that show the same frame (or an identical-looking one) into one longer frame. */
export function mergeSlots(slots: readonly FrameSlot[], same: (a: number, b: number) => boolean): FrameSlot[] {
  const merged: FrameSlot[] = []
  for (const slot of slots) {
    const prev = merged[merged.length - 1]
    if (prev && (prev.index === slot.index || same(prev.index, slot.index))) prev.durationMs += slot.durationMs
    else merged.push({ ...slot })
  }
  return merged
}

/**
 * Smoothness matters more than resolution (a sticker is small on screen), but not below ~192 px.
 * Above 20 fps adds almost nothing, so it only breaks ties.
 */
const FPS_SCORE: Record<number, number> = { 30: 101, 25: 100.5, 20: 100, 15: 80, 12: 55, 10: 40, 8: 25 }

export function score(side: number, fps: number): number {
  return (FPS_SCORE[fps] ?? 0) + (40 * side) / 512 - (side < 192 ? (192 - side) / 3 : 0)
}

export interface Candidate {
  side: number
  fps: number
  quality: number
  /** Estimated bytes of the finished sticker. */
  estimate: number
}

export function qualitiesFor(side: number): number[] {
  const start = QUALITY_BY_SIDE[side] ?? 0.5
  const list: number[] = []
  for (let q = start; q >= MIN_QUALITY - 1e-9; q -= 0.1) list.push(+q.toFixed(2))
  if (list[list.length - 1]! > MIN_QUALITY) list.push(MIN_QUALITY)
  return list
}

/** Every (side, fps) pair, most preferred first. A still sticker has one frame, so only the side varies. */
export function preferenceOrder(maxSide: number, maxFps: number, still: boolean): { side: number; fps: number }[] {
  const sides = SIDES.filter((s) => s <= maxSide)
  const rates = still ? [1] : FRAME_RATES.filter((f) => f <= maxFps)
  const pairs = sides.flatMap((side) => rates.map((fps) => ({ side, fps })))
  return pairs.sort((a, b) => score(b.side, b.fps) - score(a.side, a.fps))
}

export function estimateBytes(frames: number, bytesPerFrame: number): number {
  return Math.round(frames * (bytesPerFrame + 24) + 200)
}

/**
 * Walks the pairs in preference order and returns the candidates that should fit, best first.
 * `bytesPerFrame(side, quality)` comes from encoding a few sample frames, so it is called lazily;
 * `distinct(fps)` is how many frames remain at that rate after merging repeats.
 */
export async function* candidates(input: {
  maxSide: number
  maxFps: number
  still: boolean
  distinct: (fps: number) => number
  bytesPerFrame: (side: number, quality: number) => Promise<number>
  target?: number
}): AsyncGenerator<Candidate> {
  const target = input.target ?? TARGET_STICKER_BYTES
  for (const { side, fps } of preferenceOrder(input.maxSide, input.maxFps, input.still)) {
    const frames = input.still ? 1 : input.distinct(fps)
    for (const quality of qualitiesFor(side)) {
      const estimate = estimateBytes(frames, await input.bytesPerFrame(side, quality))
      if (estimate <= target) {
        yield { side, fps, quality, estimate }
        break
      }
    }
  }
}
