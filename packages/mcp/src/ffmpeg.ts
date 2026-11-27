import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import { chmod, mkdir, rename } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'

/** Portable builds that include the animated WebP and Opus encoders most system builds lack. */
const RELEASE = 'b6.1.1'
const PLATFORMS = new Set(['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64', 'win32-ia32'])

export interface RunResult {
  code: number
  stderr: string
}

export function run(binary: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000)
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? 1, stderr }))
  })
}

function encoders(binary: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(binary, ['-hide_banner', '-encoders'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let stdout = ''
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()))
    child.on('error', () => resolve(''))
    child.on('close', () => resolve(stdout))
  })
}

export async function canMakeStickers(binary: string): Promise<boolean> {
  const list = await encoders(binary)
  return /\blibwebp_anim\b/.test(list) && /\blibopus\b/.test(list)
}

function cacheDir(): string {
  const base =
    process.env.XDG_CACHE_HOME ?? (process.platform === 'win32' ? (process.env.LOCALAPPDATA ?? homedir()) : join(homedir(), '.cache'))
  return join(base, 'sound-sticker-maker')
}

async function download(target: string): Promise<void> {
  const platform = `${process.platform}-${process.arch}`
  if (!PLATFORMS.has(platform))
    throw new Error(`No portable ffmpeg for ${platform}. Install ffmpeg with libwebp and libopus and set FFMPEG_BIN.`)
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${RELEASE}/ffmpeg-${platform}.gz`
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error(`Downloading ffmpeg failed (${response.status})`)
  await mkdir(cacheDir(), { recursive: true })
  const partial = `${target}.part`
  await pipeline(Readable.fromWeb(response.body as never), createGunzip(), createWriteStream(partial))
  await chmod(partial, 0o755)
  await rename(partial, target)
}

let found: Promise<string> | null = null

/** Uses FFMPEG_BIN, then a system ffmpeg that has the needed encoders, then a portable copy downloaded once. */
export function ffmpegPath(): Promise<string> {
  found ??= (async () => {
    if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN
    if (await canMakeStickers('ffmpeg')) return 'ffmpeg'
    const target = join(cacheDir(), `ffmpeg-${RELEASE}${process.platform === 'win32' ? '.exe' : ''}`)
    if (!existsSync(target)) await download(target)
    return target
  })()
  found.catch(() => (found = null))
  return found
}
