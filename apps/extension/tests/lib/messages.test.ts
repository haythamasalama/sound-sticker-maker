import { describe, expect, it } from 'vitest'
import { base64FromBuffer, bufferFromBase64 } from '@/lib/messages'

describe('base64 helpers', () => {
  it('round-trips large binary data', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => (i * 31) % 256)
    const back = new Uint8Array(bufferFromBase64(base64FromBuffer(bytes.buffer)))
    expect(back).toEqual(bytes)
  })
})
