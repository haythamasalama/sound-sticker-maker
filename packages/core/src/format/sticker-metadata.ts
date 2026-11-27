import { ascii } from './bytes'

export interface StickerMetadata {
  'sticker-pack-id': string
  'sticker-pack-name'?: string
  'sticker-pack-publisher'?: string
  emojis: string[]
  'sound-sha256'?: string
}

const MAX_TEXT = 128
const PACK_ID_NAMESPACE = 'sound-sticker-maker'

/** WhatsApp reads sticker info from a big-endian TIFF block holding one tag (0x5741, "WA") with JSON. */
export function stickerExif(meta: StickerMetadata): Uint8Array {
  const json = ascii(JSON.stringify(meta))
  const out = new Uint8Array(26 + json.length)
  const view = new DataView(out.buffer)
  out.set([0x4d, 0x4d, 0x00, 0x2a], 0)
  view.setUint32(4, 8)
  view.setUint16(8, 1)
  view.setUint16(10, 0x5741)
  view.setUint16(12, 7)
  view.setUint32(14, json.length)
  view.setUint32(18, 26)
  view.setUint32(22, 0)
  out.set(json, 26)
  return out
}

export function readStickerExif(exif: Uint8Array): StickerMetadata | null {
  if (exif.length < 26 || exif[0] !== 0x4d || exif[1] !== 0x4d) return null
  const view = new DataView(exif.buffer, exif.byteOffset, exif.byteLength)
  if (view.getUint16(10) !== 0x5741) return null
  const length = view.getUint32(14)
  const offset = view.getUint32(18)
  try {
    return JSON.parse(new TextDecoder().decode(exif.subarray(offset, offset + length))) as StickerMetadata
  } catch {
    return null
  }
}

/** Stickers with the same pack name and author share an id so WhatsApp groups them as one pack. */
export async function packIdFor(packName: string, publisher: string): Promise<string> {
  if (!packName && !publisher) return crypto.randomUUID()
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', ascii(`${PACK_ID_NAMESPACE}|${packName}|${publisher}`) as BufferSource),
  )
  const hex = Array.from(digest.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export async function buildStickerMetadata(input: {
  packName?: string
  publisher?: string
  soundSha256?: string
  emojis?: string[]
}): Promise<StickerMetadata> {
  const packName = (input.packName ?? '').trim().slice(0, MAX_TEXT)
  const publisher = (input.publisher ?? '').trim().slice(0, MAX_TEXT)
  const meta: StickerMetadata = {
    'sticker-pack-id': await packIdFor(packName, publisher),
    emojis: input.emojis?.length ? input.emojis : ['🔊'],
  }
  if (packName) meta['sticker-pack-name'] = packName
  if (publisher) meta['sticker-pack-publisher'] = publisher
  if (input.soundSha256) meta['sound-sha256'] = input.soundSha256
  return meta
}
