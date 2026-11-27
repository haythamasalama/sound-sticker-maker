import { describe, expect, it } from 'vitest'
import { buildOggOpus, oggCrc, preSkipFromDescription } from '../../src/format/ogg-opus'

function pages(bytes: Uint8Array) {
  const out: { flag: number; granule: bigint; sequence: number; crcOk: boolean }[] = []
  let offset = 0
  while (offset < bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset)
    const segments = bytes[offset + 26]!
    let size = 27 + segments
    for (let i = 0; i < segments; i++) size += bytes[offset + 27 + i]!
    const page = bytes.slice(offset, offset + size)
    const stored = new DataView(page.buffer).getUint32(22, true)
    new DataView(page.buffer).setUint32(22, 0, true)
    out.push({
      flag: bytes[offset + 5]!,
      granule: view.getBigInt64(6, true),
      sequence: view.getUint32(18, true),
      crcOk: oggCrc(page) === stored,
    })
    offset += size
  }
  return out
}

describe('buildOggOpus', () => {
  const packets = Array.from({ length: 120 }, (_, i) => new Uint8Array(40 + (i % 7)).fill(i))
  const ogg = buildOggOpus({ packets, preSkip: 312, totalSamples: 120 * 960, serial: 42 })
  const list = pages(ogg)

  it('starts with OpusHead and OpusTags pages', () => {
    expect(new TextDecoder().decode(ogg.subarray(28, 36))).toBe('OpusHead')
    expect(list[0]!.flag).toBe(0x02)
    expect(list.length).toBe(2 + Math.ceil(120 / 50))
  })

  it('numbers pages in order with valid checksums', () => {
    expect(list.map((p) => p.sequence)).toEqual(list.map((_, i) => i))
    expect(list.every((p) => p.crcOk)).toBe(true)
  })

  it('ends the stream at pre-skip plus every sample', () => {
    const last = list[list.length - 1]!
    expect(last.flag).toBe(0x04)
    expect(last.granule).toBe(BigInt(312 + 120 * 960))
  })
})

describe('preSkipFromDescription', () => {
  it('reads pre-skip from an OpusHead', () => {
    const head = new Uint8Array(19)
    head.set(new TextEncoder().encode('OpusHead'))
    head[10] = 0x38
    head[11] = 0x01
    expect(preSkipFromDescription(head)).toBe(312)
    head[10] = 0x00
    head[11] = 0x02
    expect(preSkipFromDescription(head)).toBe(512)
  })

  it('falls back to 312 without a description', () => {
    expect(preSkipFromDescription(null)).toBe(312)
  })
})
