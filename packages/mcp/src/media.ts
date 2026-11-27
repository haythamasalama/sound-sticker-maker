import { createWriteStream } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { run } from './ffmpeg'

export type Kind = 'video' | 'animation' | 'image' | 'audio'

export interface MediaInfo {
  path: string
  kind: Kind
  /** Seconds; 0 for a still picture. */
  duration: number
  width: number
  height: number
  hasAudio: boolean
}

const ANIMATION = new Set(['.gif', '.webp', '.apng', '.png'])
const IMAGE = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.heic', '.avif', '.tif', '.tiff'])

/** Reads what `ffmpeg -i` prints about a file: duration, picture size and whether it has sound. */
export function parseProbe(stderr: string, path: string): Omit<MediaInfo, 'kind'> & { frames: boolean } {
  const duration = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  const video = stderr.match(/Stream #\d+:\d+[^:]*: Video:.*?(\d{2,5})x(\d{2,5})/)
  const seconds = duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : 0
  return {
    path,
    duration: seconds,
    width: video ? Number(video[1]) : 0,
    height: video ? Number(video[2]) : 0,
    hasAudio: /Stream #\d+:\d+[^:]*: Audio:/.test(stderr),
    frames: !!video && !/Video: (mjpeg|png|bmp|tiff|webp)[^,]*,.*\(attached pic\)/.test(stderr),
  }
}

export function kindOf(path: string, probe: ReturnType<typeof parseProbe>): Kind {
  const ext = extname(path).toLowerCase()
  if (!probe.width) return 'audio'
  if (IMAGE.has(ext) && !ANIMATION.has(ext)) return 'image'
  if (ANIMATION.has(ext)) return probe.duration > 0.05 ? 'animation' : 'image'
  return probe.duration > 0.05 ? 'video' : 'image'
}

export async function inspect(ffmpeg: string, path: string): Promise<MediaInfo> {
  const { stderr } = await run(ffmpeg, ['-hide_banner', '-i', path])
  if (/No such file or directory/i.test(stderr)) throw new Error(`File not found: ${path}`)
  if (/Invalid data found|could not find codec parameters/i.test(stderr) && !/Stream #/.test(stderr)) {
    throw new Error(`Not a video, picture or sound ffmpeg can read: ${path}`)
  }
  const probe = parseProbe(stderr, path)
  return { path, kind: kindOf(path, probe), duration: probe.duration, width: probe.width, height: probe.height, hasAudio: probe.hasAudio }
}

/** Local paths pass through; http(s) links to a media file are downloaded to a temporary folder. */
export async function localPath(source: string): Promise<string> {
  if (!/^https?:\/\//i.test(source)) return source.replace(/^~(?=\/|\\|$)/, process.env.HOME ?? process.env.USERPROFILE ?? '~')
  const response = await fetch(source)
  if (!response.ok || !response.body) throw new Error(`Couldn't download ${source} (${response.status})`)
  const type = response.headers.get('content-type') ?? ''
  if (/text\/html/.test(type)) {
    throw new Error(
      'That link is a web page, not a media file. For YouTube or TikTok, use the Sound Sticker Maker extension, or save the video first and pass the file.',
    )
  }
  const folder = await mkdtemp(join(tmpdir(), 'sound-sticker-'))
  const name = basename(new URL(source).pathname) || 'download'
  const target = join(folder, name)
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(target))
  return target
}
