import { describe, expect, it } from 'vitest'
import { formatClock, parseClock, parseVideoLink } from '../src/links'

describe('parseClock', () => {
  it.each([
    ['90', 90],
    ['90s', 90],
    ['1:30', 90],
    ['1m30s', 90],
    ['1h2m3s', 3723],
    ['1:02:03', 3723],
    ['', 0],
    ['2.5', 2.5],
  ])('%s is %d seconds', (input, seconds) => {
    expect(parseClock(input)).toBe(seconds)
  })
})

describe('formatClock', () => {
  it('writes minutes and padded seconds', () => {
    expect(formatClock(65.9)).toBe('1:05')
    expect(formatClock(0)).toBe('0:00')
  })
})

describe('parseVideoLink', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s', 'dQw4w9WgXcQ', 90],
    ['https://youtu.be/dQw4w9WgXcQ?t=42', 'dQw4w9WgXcQ', 42],
    ['youtube.com/shorts/abcDEF12345?feature=share', 'abcDEF12345', 0],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 0],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&t=1:05', 'dQw4w9WgXcQ', 65],
    ['https://www.youtube.com/live/xyzXYZ12345', 'xyzXYZ12345', 0],
  ])('reads YouTube link %s', (input, id, start) => {
    expect(parseVideoLink(input)).toEqual({ site: 'youtube', id, start })
  })

  it('reads TikTok video links', () => {
    expect(parseVideoLink('https://www.tiktok.com/@scout2015/video/6718335390845095173?lang=en')).toMatchObject({
      site: 'tiktok',
      id: '6718335390845095173',
    })
  })

  it('accepts TikTok short links without an id', () => {
    expect(parseVideoLink('https://vm.tiktok.com/ZMabc123/')).toEqual({ site: 'tiktok', url: 'https://vm.tiktok.com/ZMabc123/', id: null })
  })

  it.each(['https://example.com/watch?v=dQw4w9WgXcQ', 'not a link', 'https://www.tiktok.com/@someone', 'https://youtube.com/watch'])(
    'rejects %s',
    (input) => {
      expect(parseVideoLink(input)).toBeNull()
    },
  )
})
