export type VideoLink = { site: 'youtube'; id: string; start: number } | { site: 'tiktok'; url: string; id: string | null }

/** "90", "90s", "1:30", "1m30s", "1h2m3s" -> seconds. */
export function parseClock(value: string): number {
  const text = value.trim().toLowerCase()
  if (!text) return 0
  if (text.includes(':')) return text.split(':').reduce((sum, part) => sum * 60 + (parseFloat(part) || 0), 0)
  const match = text.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s?)?$/)
  if (!match) return Math.max(0, parseFloat(text) || 0)
  return (Number(match[1]) || 0) * 3600 + (Number(match[2]) || 0) * 60 + (Number(match[3]) || 0)
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function toUrl(text: string): URL | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
}

export function parseVideoLink(text: string): VideoLink | null {
  const url = toUrl(text)
  if (!url) return null
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '')

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const path = url.pathname.match(/^\/(shorts|live|embed|v)\/([^/?#]+)/)
    const id = host === 'youtu.be' ? (url.pathname.slice(1).split('/')[0] ?? null) : (url.searchParams.get('v') ?? path?.[2] ?? null)
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null
    const t = url.searchParams.get('t') ?? url.searchParams.get('start')
    return { site: 'youtube', id, start: t ? parseClock(t) : 0 }
  }

  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const id = url.pathname.match(/\/(?:video|photo|v)\/(\d{8,25})/)?.[1] ?? null
    // Short links (vm.tiktok.com/…, tiktok.com/t/…) carry no id until they are followed.
    const short = host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || url.pathname.startsWith('/t/')
    if (!id && !short) return null
    url.hash = ''
    return { site: 'tiktok', url: url.toString(), id }
  }

  return null
}
