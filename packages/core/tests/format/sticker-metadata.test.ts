import { describe, expect, it } from 'vitest'
import { buildStickerMetadata, packIdFor, readStickerExif, stickerExif } from '../../src/format/sticker-metadata'

describe('stickerExif', () => {
  it('round-trips the metadata, including non-Latin text', async () => {
    const meta = await buildStickerMetadata({ packName: 'ملصقاتي', publisher: 'Haytham', soundSha256: 'abc=' })
    expect(readStickerExif(stickerExif(meta))).toEqual(meta)
  })

  it('returns null for anything else', () => {
    expect(readStickerExif(new Uint8Array(30))).toBeNull()
  })
})

describe('buildStickerMetadata', () => {
  it('trims text, defaults the emoji and leaves out empty fields', async () => {
    const meta = await buildStickerMetadata({ packName: '  Pack  ', publisher: '' })
    expect(meta['sticker-pack-name']).toBe('Pack')
    expect(meta).not.toHaveProperty('sticker-pack-publisher')
    expect(meta.emojis).toEqual(['🔊'])
  })
})

describe('packIdFor', () => {
  it('gives the same pack the same id so WhatsApp groups its stickers', async () => {
    expect(await packIdFor('A', 'B')).toBe(await packIdFor('A', 'B'))
    expect(await packIdFor('A', 'B')).not.toBe(await packIdFor('A', 'C'))
    expect(await packIdFor('A', 'B')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
