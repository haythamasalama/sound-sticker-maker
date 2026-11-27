import { isAnimationFile, isStickerError, probeAnimation, probeAudio, probeImage, probeVideo } from '@sound-sticker-maker/core'

export type PictureKind = 'video' | 'animation' | 'image'

export interface Picture {
  file: File
  kind: PictureKind
  /** Seconds; 0 for a still picture. */
  duration: number
  url: string
}

export interface Sound {
  file: File
  duration: number
  peaks: Float32Array
  peakMax: number
  /** True when the sound comes from the picture's own video. */
  own: boolean
}

export interface Range {
  start: number
  end: number
}

export function errorCode(error: unknown): string {
  if (isStickerError(error)) return error.code
  return (error as { code?: string })?.code ?? 'unknown'
}

export async function readPicture(file: File): Promise<Picture> {
  const url = URL.createObjectURL(file)
  try {
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name)) {
      const probe = await probeVideo(file)
      return { file, kind: 'video', duration: probe.duration, url }
    }
    if (isAnimationFile(file)) {
      const image = await probeImage(file)
      if (image.animated) return { file, kind: 'animation', duration: (await probeAnimation(file)).duration, url }
      return { file, kind: 'image', duration: 0, url }
    }
    await probeImage(file)
    return { file, kind: 'image', duration: 0, url }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

export async function readSound(file: File, own: boolean): Promise<Sound> {
  const probe = await probeAudio(file)
  return { file, duration: probe.duration, peaks: probe.peaks, peakMax: probe.peakMax, own }
}
