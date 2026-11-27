import { describe, expect, it } from 'vitest'
import { candidates, captureFpsFor, estimateBytes, mergeSlots, preferenceOrder, qualitiesFor, slotsFor, stretchTimeline } from '../src/plan'

describe('stretchTimeline', () => {
  it('loops a short picture over a longer sound', () => {
    expect(stretchTimeline(3, 10, 0.7, 'loop')).toEqual([0, 1, 2, 0, 1, 2, 0])
  })

  it('holds the last frame when asked to freeze', () => {
    expect(stretchTimeline(3, 10, 0.5, 'freeze')).toEqual([0, 1, 2, 2, 2])
  })
})

describe('slotsFor', () => {
  it('keeps the total length when lowering the frame rate', () => {
    const timeline = Array.from({ length: 30 }, (_, i) => i)
    const slots = slotsFor(timeline, 30, 10)
    expect(slots).toHaveLength(10)
    expect(slots.reduce((sum, s) => sum + s.durationMs, 0)).toBe(1000)
    expect(slots.map((s) => s.index)).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24, 27])
  })
})

describe('mergeSlots', () => {
  it('joins repeated frames into one longer frame', () => {
    const merged = mergeSlots(
      [
        { index: 0, durationMs: 50 },
        { index: 0, durationMs: 50 },
        { index: 1, durationMs: 50 },
        { index: 2, durationMs: 50 },
      ],
      (a, b) => a + b === 3,
    )
    expect(merged).toEqual([
      { index: 0, durationMs: 100 },
      { index: 1, durationMs: 100 },
    ])
  })
})

describe('preferenceOrder', () => {
  it('puts smooth, large stickers first', () => {
    const order = preferenceOrder(512, 30, false)
    expect(order[0]).toEqual({ side: 512, fps: 30 })
    expect(order.findIndex((p) => p.fps === 8)).toBeGreaterThan(order.findIndex((p) => p.side === 256 && p.fps === 20))
  })

  it('respects the capture limits', () => {
    expect(preferenceOrder(320, 15, false).every((p) => p.side <= 320 && p.fps <= 15)).toBe(true)
    expect(preferenceOrder(512, 30, true).every((p) => p.fps === 1)).toBe(true)
  })
})

describe('candidates', () => {
  it('returns the best combination whose estimate fits', async () => {
    const it = candidates({
      maxSide: 512,
      maxFps: 30,
      still: false,
      distinct: (fps) => fps * 10,
      bytesPerFrame: async (side, quality) => side * side * quality * 0.05,
      target: 900_000,
    })
    const first = (await it.next()).value!
    expect(first.estimate).toBeLessThanOrEqual(900_000)
    expect(first.estimate).toBe(estimateBytes(first.fps * 10, first.side * first.side * first.quality * 0.05))
  })

  it('only measures what it needs', async () => {
    let calls = 0
    const it = candidates({ maxSide: 512, maxFps: 30, still: false, distinct: () => 10, bytesPerFrame: async () => (calls++, 1000) })
    await it.next()
    expect(calls).toBe(1)
  })
})

describe('captureFpsFor and qualitiesFor', () => {
  it('captures fewer frames for longer stickers', () => {
    expect(captureFpsFor(5)).toBe(30)
    expect(captureFpsFor(15)).toBe(20)
    expect(captureFpsFor(30)).toBe(15)
  })

  it('steps quality down to the minimum', () => {
    expect(qualitiesFor(512)).toEqual([0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.2])
  })
})
