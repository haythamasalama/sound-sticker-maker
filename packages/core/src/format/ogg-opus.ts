import { ascii, concat } from './bytes'

export const OPUS_SAMPLE_RATE = 48000
const SAMPLES_PER_PACKET = 960
const PACKETS_PER_PAGE = 50

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let r = i << 24
    for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1
    table[i] = r >>> 0
  }
  return table
})()

export function oggCrc(bytes: Uint8Array): number {
  let crc = 0
  for (const byte of bytes) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ byte) & 0xff]!) >>> 0
  return crc >>> 0
}

const PageFlag = { None: 0x00, BeginOfStream: 0x02, EndOfStream: 0x04 } as const
type PageFlag = (typeof PageFlag)[keyof typeof PageFlag]

function oggPage(flag: PageFlag, granule: number, serial: number, sequence: number, packets: readonly Uint8Array[]): Uint8Array {
  const lacing: number[] = []
  for (const packet of packets) {
    let length = packet.length
    while (length >= 255) {
      lacing.push(255)
      length -= 255
    }
    lacing.push(length)
  }
  if (lacing.length > 255) throw new Error('Ogg page has too many segments')
  const dataLength = packets.reduce((sum, p) => sum + p.length, 0)
  const page = new Uint8Array(27 + lacing.length + dataLength)
  const view = new DataView(page.buffer)
  page.set(ascii('OggS'), 0)
  page[5] = flag
  view.setBigInt64(6, BigInt(granule), true)
  view.setUint32(14, serial, true)
  view.setUint32(18, sequence, true)
  page[26] = lacing.length
  page.set(lacing, 27)
  let offset = 27 + lacing.length
  for (const packet of packets) {
    page.set(packet, offset)
    offset += packet.length
  }
  view.setUint32(22, oggCrc(page), true)
  return page
}

export interface OggOpusInput {
  packets: readonly Uint8Array[]
  preSkip: number
  totalSamples: number
  vendor?: string
  serial?: number
}

/** Wraps raw mono Opus packets (20 ms each) in an Ogg container (RFC 3533 + RFC 7845). */
export function buildOggOpus({ packets, preSkip, totalSamples, vendor = 'SoundStickerMaker', serial }: OggOpusInput): Uint8Array {
  const streamSerial = serial ?? (Math.random() * 0xffffffff) >>> 0
  const head = new Uint8Array(19)
  const headView = new DataView(head.buffer)
  head.set(ascii('OpusHead'), 0)
  head[8] = 1
  head[9] = 1
  headView.setUint16(10, preSkip, true)
  headView.setUint32(12, OPUS_SAMPLE_RATE, true)

  const vendorBytes = ascii(vendor)
  const tags = new Uint8Array(8 + 4 + vendorBytes.length + 4)
  tags.set(ascii('OpusTags'), 0)
  new DataView(tags.buffer).setUint32(8, vendorBytes.length, true)
  tags.set(vendorBytes, 12)

  const pages = [oggPage(PageFlag.BeginOfStream, 0, streamSerial, 0, [head]), oggPage(PageFlag.None, 0, streamSerial, 1, [tags])]
  const finalGranule = preSkip + totalSamples
  let sequence = 2
  for (let i = 0; i < packets.length; i += PACKETS_PER_PAGE) {
    const group = packets.slice(i, i + PACKETS_PER_PAGE)
    const isLast = i + PACKETS_PER_PAGE >= packets.length
    const granule = isLast ? finalGranule : Math.min(finalGranule, preSkip + (i + group.length) * SAMPLES_PER_PACKET)
    pages.push(oggPage(isLast ? PageFlag.EndOfStream : PageFlag.None, granule, streamSerial, sequence++, group))
  }
  return concat(pages)
}

/** Reads pre-skip from an OpusHead decoder description, falling back to the libopus default. */
export function preSkipFromDescription(description: Uint8Array | null | undefined): number {
  if (description && description.length >= 12 && String.fromCharCode(...description.subarray(0, 8)) === 'OpusHead') {
    return description[10]! | (description[11]! << 8)
  }
  return 312
}
