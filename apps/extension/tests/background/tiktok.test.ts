import { describe, expect, it } from 'vitest'
import { readVideoInfo } from '@/background/tiktok'

const page = (data: unknown) =>
  `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(data)}</script></html>`

describe('readVideoInfo', () => {
  it('finds the play address and caption', () => {
    const html = page({
      __DEFAULT_SCOPE__: {
        'webapp.video-detail': { itemInfo: { itemStruct: { desc: 'A cat', video: { playAddr: 'https://v16.tiktok.com/a.mp4' } } } },
      },
    })
    expect(readVideoInfo(html)).toEqual({ video: { playAddr: 'https://v16.tiktok.com/a.mp4' }, title: 'A cat' })
  })

  it('returns null when the page has no video data', () => {
    expect(readVideoInfo('<html></html>')).toBeNull()
    expect(readVideoInfo(page({ __DEFAULT_SCOPE__: {} }))).toBeNull()
  })

  it('returns null for broken JSON', () => {
    expect(readVideoInfo('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{oops</script>')).toBeNull()
  })
})
