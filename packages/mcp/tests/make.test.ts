import { readStickerExif, readWebpChunks } from '@sound-sticker-maker/core/format'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { ffmpegPath } from '../src/ffmpeg'
import { makeSoundSticker } from '../src/sticker'

// Real files made with the same ffmpeg the server uses (a system one with the encoders, or the portable copy).
const dir = mkdtempSync(join(tmpdir(), 'ssm-mcp-'))
let ffmpeg = ''
beforeAll(async () => {
  ffmpeg = await ffmpegPath()
  const make = (...args: string[]) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args])
  make(
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=640x360:rate=30:duration=6',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=6',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    join(dir, 'clip.mp4'),
  )
  make('-f', 'lavfi', '-i', 'testsrc=size=240x180:rate=12:duration=2', join(dir, 'loop.gif'))
  make('-f', 'lavfi', '-i', 'testsrc2=size=800x600', '-frames:v', '1', join(dir, 'photo.png'))
  make('-f', 'lavfi', '-i', 'sine=frequency=660:duration=4', '-c:a', 'libmp3lame', join(dir, 'voice.mp3'))
})

function check(webp: string, audio: string) {
  const bytes = new Uint8Array(readFileSync(webp))
  const chunks = readWebpChunks(bytes)
  expect(bytes.length).toBeLessThanOrEqual(1_000_000)
  expect(chunks[0]!.fourcc).toBe('VP8X')
  expect(chunks.some((c) => c.fourcc === 'ANMF')).toBe(true)
  const meta = readStickerExif(chunks.find((c) => c.fourcc === 'EXIF')!.data)
  expect(meta?.['sound-sha256']).toBeTruthy()
  expect(statSync(audio).size).toBeGreaterThan(1000)
  expect(readFileSync(audio).subarray(0, 4).toString()).toBe('OggS')
  return meta!
}

describe('makeSoundSticker', () => {
  it('makes a sticker from a video with its own sound', async () => {
    const made = await makeSoundSticker({ picture: join(dir, 'clip.mp4'), start: 1, duration: 3, packName: 'Test', outputDir: dir })
    expect(made).toMatchObject({ seconds: 3, side: 512, pictureKind: 'video' })
    expect(check(made.webp, made.audio)['sticker-pack-name']).toBe('Test')
  })

  it('loops a GIF over a longer sound', async () => {
    const made = await makeSoundSticker({ picture: join(dir, 'loop.gif'), sound: join(dir, 'voice.mp3'), outputDir: dir })
    expect(made.pictureKind).toBe('animation')
    // MP3 files report a few milliseconds of encoder padding on top of the sound itself.
    expect(made.seconds).toBeCloseTo(4, 1)
    check(made.webp, made.audio)
  })

  it('keeps a photo still for the whole sound', async () => {
    const made = await makeSoundSticker({ picture: join(dir, 'photo.png'), sound: join(dir, 'voice.mp3'), shape: 'cover', outputDir: dir })
    expect(made).toMatchObject({ pictureKind: 'image', fps: 0 })
    check(made.webp, made.audio)
  })

  it('explains what is missing', async () => {
    await expect(makeSoundSticker({ picture: join(dir, 'photo.png'), outputDir: dir })).rejects.toThrow(/no sound/)
    await expect(makeSoundSticker({ picture: join(dir, 'nope.mp4'), outputDir: dir })).rejects.toThrow(/not found/i)
  })
})
