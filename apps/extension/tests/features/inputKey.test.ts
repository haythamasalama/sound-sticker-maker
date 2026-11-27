import { describe, expect, it } from 'vitest'
import { inputKey, type CreateInput } from '@/features/create/useCreate'

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name)

describe('inputKey', () => {
  const base: CreateInput = {
    visual: { kind: 'video', file: file('a.mp4'), start: 1, duration: 3 },
    audio: { file: file('a.mp4'), start: 1, duration: 3 },
    shape: 'contain',
    packName: 'Pack',
  }

  it('changes when the chosen part or a setting changes', () => {
    expect(inputKey(base)).toBe(inputKey({ ...base }))
    expect(inputKey({ ...base, audio: { ...base.audio, start: 2 } })).not.toBe(inputKey(base))
    expect(inputKey({ ...base, shape: 'cover' })).not.toBe(inputKey(base))
    expect(inputKey({ ...base, packName: 'Other' })).not.toBe(inputKey(base))
  })

  it('is empty without input', () => {
    expect(inputKey(null)).toBe('')
  })
})
