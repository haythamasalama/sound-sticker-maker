import { ascii, concat, writeUint24LE } from './bytes'

export interface RiffChunk {
  fourcc: string
  data: Uint8Array
}

/** One encoded picture: the ALPH/VP8/VP8L sub-chunks of a still WebP, ready to wrap in ANMF. */
export interface EncodedFrame {
  payload: Uint8Array
  hasAlpha: boolean
}

export interface TimedFrame extends EncodedFrame {
  durationMs: number
}

const MAX_FRAME_DURATION_MS = 0xffffff

export function readWebpChunks(bytes: Uint8Array): RiffChunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (offset: number) => String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!)
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') throw new Error('Not a WebP file')
  const chunks: RiffChunk[] = []
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const size = view.getUint32(offset + 4, true)
    chunks.push({ fourcc: tag(offset), data: bytes.subarray(offset + 8, offset + 8 + size) })
    offset += 8 + size + (size & 1)
  }
  return chunks
}

export function riffChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const pad = data.length & 1
  const out = new Uint8Array(8 + data.length + pad)
  out.set(ascii(fourcc), 0)
  new DataView(out.buffer).setUint32(4, data.length, true)
  out.set(data, 8)
  return out
}

function riffFile(body: Uint8Array): Uint8Array {
  const header = new Uint8Array(12)
  header.set(ascii('RIFF'), 0)
  new DataView(header.buffer).setUint32(4, 4 + body.length, true)
  header.set(ascii('WEBP'), 8)
  return concat([header, body])
}

function vp8x(side: number, flags: { animated: boolean; alpha: boolean; exif: boolean }): Uint8Array {
  const data = new Uint8Array(10)
  data[0] = (flags.animated ? 0x02 : 0) | (flags.alpha ? 0x10 : 0) | (flags.exif ? 0x08 : 0)
  writeUint24LE(data, 4, side - 1)
  writeUint24LE(data, 7, side - 1)
  return riffChunk('VP8X', data)
}

/** Takes the bytes of a still WebP (as produced by canvas.convertToBlob) and keeps only the picture. */
export function extractFrame(stillWebp: Uint8Array): EncodedFrame {
  const parts = readWebpChunks(stillWebp).filter((c) => c.fourcc === 'ALPH' || c.fourcc === 'VP8 ' || c.fourcc === 'VP8L')
  if (!parts.some((c) => c.fourcc === 'VP8 ' || c.fourcc === 'VP8L')) throw new Error('WebP has no image data')
  return {
    payload: concat(parts.map((c) => riffChunk(c.fourcc, c.data))),
    hasAlpha: parts.some((c) => c.fourcc === 'ALPH' || c.fourcc === 'VP8L'),
  }
}

export function buildAnimatedWebp(frames: readonly TimedFrame[], side: number, exif?: Uint8Array): Uint8Array {
  if (frames.length === 0) throw new Error('No frames to encode')
  const parts = [vp8x(side, { animated: true, alpha: frames.some((f) => f.hasAlpha), exif: !!exif })]
  // Transparent background colour, loop forever.
  parts.push(riffChunk('ANIM', new Uint8Array(6)))
  for (const frame of frames) {
    const header = new Uint8Array(16)
    writeUint24LE(header, 6, side - 1)
    writeUint24LE(header, 9, side - 1)
    writeUint24LE(header, 12, Math.max(1, Math.min(MAX_FRAME_DURATION_MS, Math.round(frame.durationMs))))
    // No blending: each frame replaces the previous one, so transparent areas don't keep old pixels.
    header[15] = 0x02
    parts.push(riffChunk('ANMF', concat([header, frame.payload])))
  }
  if (exif) parts.push(riffChunk('EXIF', exif))
  return riffFile(concat(parts))
}

export function buildStillWebp(frame: EncodedFrame, side: number, exif?: Uint8Array): Uint8Array {
  const parts = [vp8x(side, { animated: false, alpha: frame.hasAlpha, exif: !!exif }), frame.payload]
  if (exif) parts.push(riffChunk('EXIF', exif))
  return riffFile(concat(parts))
}

/** Replaces the EXIF chunk of an existing WebP without re-encoding the picture. */
export function replaceWebpExif(webp: Uint8Array, exif: Uint8Array): Uint8Array {
  const chunks = readWebpChunks(webp).filter((c) => c.fourcc !== 'EXIF')
  const parts = chunks.map((c) => {
    if (c.fourcc !== 'VP8X') return riffChunk(c.fourcc, c.data)
    const data = new Uint8Array(c.data)
    data[0] = data[0]! | 0x08
    return riffChunk('VP8X', data)
  })
  parts.push(riffChunk('EXIF', exif))
  return riffFile(concat(parts))
}
