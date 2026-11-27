/** Seconds as shown under the waveform: one decimal, never negative. */
export function formatSeconds(seconds: number): string {
  return (Math.max(0, Math.round(seconds * 10)) / 10).toFixed(1)
}

export interface Range {
  start: number
  end: number
}

/** Keeps a picked part inside the sound, at least `min` long and at most `max` long. */
export function clampRange(start: number, end: number, duration: number, min: number, max: number): Range {
  const length = Math.min(min, duration)
  const s = Math.max(0, Math.min(start, duration - length))
  const e = Math.min(duration, Math.max(end, s + length), s + max)
  return { start: +s.toFixed(2), end: +e.toFixed(2) }
}
