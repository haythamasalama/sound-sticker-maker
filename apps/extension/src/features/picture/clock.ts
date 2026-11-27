export function clock(seconds: number, tenths = true): string {
  const whole = Math.floor(seconds)
  const base = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
  return tenths ? `${base}.${Math.floor((seconds - whole) * 10 + 1e-6)}` : base
}
