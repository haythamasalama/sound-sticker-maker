import { describe, expect, it } from 'vitest'
import { concat } from '../../src/format/bytes'
import { buildAnimatedWebp, buildStillWebp, extractFrame, readWebpChunks, replaceWebpExif, riffChunk } from '../../src/format/webp'

function stillWebp(fourcc: 'VP8 ' | 'VP8L', alpha = false): Uint8Array {
  const parts = [...(alpha ? [riffChunk('ALPH', new Uint8Array([1, 2, 3]))] : []), riffChunk(fourcc, new Uint8Array([9, 8, 7, 6, 5]))]
  const body = concat(parts)
  const header = new Uint8Array(12)
  header.set(new TextEncoder().encode('RIFF'), 0)
  new DataView(header.buffer).setUint32(4, 4 + body.length, true)
  header.set(new TextEncoder().encode('WEBP'), 8)
  return concat([header, body])
}

describe('riffChunk', () => {
  it('pads odd sizes to an even length but records the real size', () => {
    const chunk = riffChunk('TEST', new Uint8Array([1, 2, 3]))
    expect(chunk.length).toBe(12)
    expect(new DataView(chunk.buffer).getUint32(4, true)).toBe(3)
  })
})

describe('extractFrame', () => {
  it('keeps the picture chunks and reports alpha', () => {
    expect(extractFrame(stillWebp('VP8 ')).hasAlpha).toBe(false)
    expect(extractFrame(stillWebp('VP8 ', true)).hasAlpha).toBe(true)
    expect(extractFrame(stillWebp('VP8L')).hasAlpha).toBe(true)
  })

  it('rejects a file without image data', () => {
    expect(() => extractFrame(new Uint8Array(12))).toThrow()
  })
})

describe('buildAnimatedWebp', () => {
  const frame = extractFrame(stillWebp('VP8 ', true))

  it('writes VP8X, ANIM, one ANMF per frame and EXIF', () => {
    const webp = buildAnimatedWebp(
      [
        { ...frame, durationMs: 100 },
        { ...frame, durationMs: 250 },
      ],
      512,
      new Uint8Array([1, 2]),
    )
    const chunks = readWebpChunks(webp)
    expect(chunks.map((c) => c.fourcc)).toEqual(['VP8X', 'ANIM', 'ANMF', 'ANMF', 'EXIF'])
    const flags = chunks[0]!.data[0]!
    expect(flags & 0x02).toBe(0x02)
    expect(flags & 0x10).toBe(0x10)
    expect(flags & 0x08).toBe(0x08)
    const anmf = chunks[3]!.data
    expect(anmf[12]! | (anmf[13]! << 8) | (anmf[14]! << 16)).toBe(250)
    expect(new DataView(webp.buffer).getUint32(4, true)).toBe(webp.length - 8)
  })

  it('stores the canvas size minus one', () => {
    const vp8x = readWebpChunks(buildAnimatedWebp([{ ...frame, durationMs: 40 }], 448))[0]!.data
    expect(vp8x[4]! | (vp8x[5]! << 8) | (vp8x[6]! << 16)).toBe(447)
  })

  it('refuses an empty animation', () => {
    expect(() => buildAnimatedWebp([], 512)).toThrow()
  })
})

describe('buildStillWebp and replaceWebpExif', () => {
  it('swaps the EXIF chunk without touching the picture', () => {
    const frame = extractFrame(stillWebp('VP8 '))
    const original = buildStillWebp(frame, 512, new Uint8Array([1]))
    const replaced = replaceWebpExif(original, new Uint8Array([7, 7, 7]))
    const chunks = readWebpChunks(replaced)
    expect(chunks.filter((c) => c.fourcc === 'EXIF')).toHaveLength(1)
    expect([...chunks.find((c) => c.fourcc === 'EXIF')!.data]).toEqual([7, 7, 7])
    expect(chunks.find((c) => c.fourcc === 'VP8 ')).toBeTruthy()
  })
})
