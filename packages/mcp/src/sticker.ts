import {
  buildAnimatedWebp,
  buildStickerMetadata,
  extractFrame,
  replaceWebpExif,
  sha256Base64,
  stickerExif,
} from '@sound-sticker-maker/core/format'
import { MAX_SECONDS, MAX_STICKER_BYTES, RECOMMENDED_SECONDS } from '@sound-sticker-maker/core/limits'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { ffmpegPath, run } from './ffmpeg'
import { inspect, localPath, type MediaInfo } from './media'

export interface MakeInput {
  picture: string
  sound?: string
  start?: number
  duration?: number
  soundStart?: number
  shape?: 'contain' | 'cover'
  packName?: string
  author?: string
  outputDir?: string
}

export interface MadeSticker {
  webp: string
  audio: string
  seconds: number
  side: number
  fps: number
  webpBytes: number
  audioBytes: number
  pictureKind: MediaInfo['kind']
}

/** Tried in order until the sticker fits WhatsApp's 1 MB limit. */
export const ATTEMPTS = [
  { side: 512, fps: 20, quality: 75 },
  { side: 512, fps: 15, quality: 60 },
  { side: 448, fps: 15, quality: 55 },
  { side: 384, fps: 12, quality: 50 },
  { side: 320, fps: 12, quality: 45 },
  { side: 256, fps: 10, quality: 40 },
  { side: 192, fps: 8, quality: 35 },
]

export function squareFilter(side: number, shape: 'contain' | 'cover', fps?: number): string {
  const rate = fps ? `fps=${fps},` : ''
  if (shape === 'cover')
    return `${rate}scale=${side}:${side}:force_original_aspect_ratio=increase:flags=lanczos,crop=${side}:${side},format=rgba`
  return `${rate}scale=${side}:${side}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=${side}:${side}:(ow-iw)/2:(oh-ih)/2:color=black@0`
}

function defaultOutputDir(): string {
  const downloads = join(homedir(), 'Downloads')
  return existsSync(downloads) ? downloads : process.cwd()
}

function uniqueBase(dir: string, name: string): string {
  const stem = name.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'sound-sticker'
  let base = join(dir, `${stem}-sticker`)
  for (let i = 2; existsSync(`${base}.webp`); i++) base = join(dir, `${stem}-sticker-${i}`)
  return base
}

async function ffmpeg(binary: string, args: string[]): Promise<void> {
  const { code, stderr } = await run(binary, ['-hide_banner', '-loglevel', 'error', '-y', ...args])
  if (code !== 0) throw new Error(`ffmpeg failed: ${stderr.trim().split('\n').slice(-3).join(' ')}`)
}

export async function makeSoundSticker(input: MakeInput): Promise<MadeSticker> {
  const binary = await ffmpegPath()
  const picturePath = await localPath(input.picture)
  const picture = await inspect(binary, picturePath)
  if (picture.kind === 'audio') throw new Error('The picture has no image. Pass a video, GIF or photo as "picture".')

  const soundPath = input.sound ? await localPath(input.sound) : picturePath
  const sound = input.sound ? await inspect(binary, soundPath) : picture
  if (!sound.hasAudio) {
    throw new Error(input.sound ? 'The sound file has no audio.' : 'This picture has no sound. Pass a sound file as "sound".')
  }

  const ownSound = !input.sound
  const soundStart = Math.max(0, input.soundStart ?? (ownSound ? (input.start ?? 0) : 0))
  if (soundStart >= sound.duration) throw new Error(`The sound is ${sound.duration.toFixed(1)} s long; it can't start at ${soundStart} s.`)
  const seconds = Math.min(MAX_SECONDS, input.duration ?? RECOMMENDED_SECONDS, sound.duration - soundStart)
  const pictureStart = ownSound ? soundStart : Math.max(0, input.start ?? 0)
  const shape = input.shape ?? 'contain'

  const work = await mkdtemp(join(tmpdir(), 'sound-sticker-'))
  try {
    const oggPath = join(work, 'sound.ogg')
    const bitrate = Math.max(16, Math.min(48, Math.floor((0.9 * 8_000) / seconds)))
    await ffmpeg(binary, [
      '-ss',
      String(soundStart),
      '-t',
      String(seconds),
      '-i',
      soundPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '48000',
      '-c:a',
      'libopus',
      '-b:a',
      `${bitrate}k`,
      oggPath,
    ])
    const ogg = new Uint8Array(await readFile(oggPath))
    const exif = stickerExif(
      await buildStickerMetadata({ packName: input.packName, publisher: input.author, soundSha256: await sha256Base64(ogg) }),
    )

    let made: { bytes: Uint8Array; side: number; fps: number } | null = null
    for (const attempt of ATTEMPTS) {
      const out = join(work, `${attempt.side}-${attempt.fps}.webp`)
      if (picture.kind === 'image') {
        const still = join(work, `still-${attempt.side}.webp`)
        await ffmpeg(binary, [
          '-i',
          picturePath,
          '-vf',
          squareFilter(attempt.side, shape),
          '-frames:v',
          '1',
          '-c:v',
          'libwebp',
          '-q:v',
          String(attempt.quality),
          still,
        ])
        const frame = extractFrame(new Uint8Array(await readFile(still)))
        made = {
          bytes: buildAnimatedWebp([{ ...frame, durationMs: Math.round(seconds * 1000) }], attempt.side, exif),
          side: attempt.side,
          fps: 0,
        }
      } else {
        // A picture shorter than the sound loops, the way the extension does it.
        const loop = picture.kind === 'animation' || picture.duration - pictureStart < seconds ? ['-stream_loop', '-1'] : []
        const seek = picture.kind === 'video' ? ['-ss', String(pictureStart)] : []
        await ffmpeg(binary, [
          ...loop,
          ...seek,
          '-i',
          picturePath,
          '-t',
          String(seconds),
          '-vf',
          squareFilter(attempt.side, shape, attempt.fps),
          '-an',
          '-c:v',
          'libwebp_anim',
          '-q:v',
          String(attempt.quality),
          '-loop',
          '0',
          out,
        ])
        made = { bytes: replaceWebpExif(new Uint8Array(await readFile(out)), exif), side: attempt.side, fps: attempt.fps }
      }
      if (made.bytes.length <= MAX_STICKER_BYTES) break
      made = null
    }
    if (!made) throw new Error("It doesn't fit WhatsApp's 1 MB limit. Choose a shorter part.")

    const outputDir = resolve(input.outputDir ?? defaultOutputDir())
    await mkdir(outputDir, { recursive: true })
    const base = uniqueBase(outputDir, basename(picturePath, extname(picturePath)))
    await writeFile(`${base}.webp`, made.bytes)
    await writeFile(`${base}.ogg`, ogg)
    return {
      webp: `${base}.webp`,
      audio: `${base}.ogg`,
      seconds: +seconds.toFixed(2),
      side: made.side,
      fps: made.fps,
      webpBytes: made.bytes.length,
      audioBytes: ogg.length,
      pictureKind: picture.kind,
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}
