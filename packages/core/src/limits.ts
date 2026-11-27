/** WhatsApp shows stickers at 512×512; bigger sizes only add weight. */
export const STICKER_SIDE = 512

/** WhatsApp's server rejects sticker uploads above 1 MB (HTTP 413). */
export const MAX_STICKER_BYTES = 1_000_000

/** Aim below the hard limit so the full encode rarely needs a second pass. */
export const TARGET_STICKER_BYTES = 900_000

export const MAX_AUDIO_BYTES = 1_000_000

/** WhatsApp's own sound stickers keep up to 10 s; longer clips still send but play cut on some clients. */
export const RECOMMENDED_SECONDS = 10
export const MAX_SECONDS = 30

export const SIDES = [512, 448, 384, 320, 256, 224, 192, 160, 128] as const
export const FRAME_RATES = [30, 25, 20, 15, 12, 10, 8] as const
export const MIN_QUALITY = 0.2

export const QUALITY_BY_SIDE: Record<number, number> = {
  512: 0.75,
  448: 0.7,
  384: 0.65,
  320: 0.6,
  256: 0.55,
  224: 0.55,
  192: 0.5,
  160: 0.5,
  128: 0.45,
}

/** Memory budget for captured frames (RGBA bitmaps held until encoding ends). */
export const CAPTURE_MEMORY_BYTES = 320e6
