import { StickerError } from '../errors'
import { OPUS_SAMPLE_RATE, buildOggOpus, preSkipFromDescription } from '../format/ogg-opus'
import { MAX_AUDIO_BYTES } from '../limits'

const decoded = new WeakMap<Blob, Promise<AudioBuffer>>()

/** Decodes once per file: the waveform and the final encode both reuse it. */
export function decodeAudio(file: Blob): Promise<AudioBuffer> {
  let pending = decoded.get(file)
  if (!pending) {
    pending = (async () => {
      const data = await file.arrayBuffer()
      try {
        return await new OfflineAudioContext(1, OPUS_SAMPLE_RATE, OPUS_SAMPLE_RATE).decodeAudioData(data)
      } catch (cause) {
        throw new StickerError('unreadable-audio', "Couldn't decode the audio", { cause })
      }
    })()
    pending.catch(() => decoded.delete(file))
    decoded.set(file, pending)
  }
  return pending
}

export interface AudioProbe {
  duration: number
  channels: number
  /** Peak level per bucket, 0..1, for drawing a waveform. */
  peaks: Float32Array
  peakMax: number
}

export async function probeAudio(file: Blob, buckets = 600): Promise<AudioProbe> {
  const buffer = await decodeAudio(file)
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
  const per = Math.max(1, Math.floor(buffer.length / buckets))
  const peaks = new Float32Array(Math.ceil(buffer.length / per))
  let peakMax = 0
  for (let b = 0; b < peaks.length; b++) {
    let peak = 0
    const end = Math.min(buffer.length, (b + 1) * per)
    for (const channel of channels) {
      for (let i = b * per; i < end; i += 4) {
        const level = Math.abs(channel[i]!)
        if (level > peak) peak = level
      }
    }
    peaks[b] = peak
    if (peak > peakMax) peakMax = peak
  }
  return { duration: buffer.duration, channels: buffer.numberOfChannels, peaks, peakMax }
}

/** Mono 48 kHz PCM of one part of the file. */
export async function extractPcm(file: Blob, start: number, duration: number, fadeMs = 0): Promise<Float32Array> {
  const buffer = await decodeAudio(file)
  if (buffer.duration < start + 0.05) throw new StickerError('audio-out-of-range')
  const length = Math.max(1, Math.round(duration * OPUS_SAMPLE_RATE))
  const context = new OfflineAudioContext(1, length, OPUS_SAMPLE_RATE)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  source.start(0, start, duration)
  const pcm = (await context.startRendering()).getChannelData(0)
  // A cut in the middle of a wave is heard as a click.
  if (fadeMs > 0) {
    const fade = Math.min(Math.floor(pcm.length / 2), Math.round((fadeMs / 1000) * OPUS_SAMPLE_RATE))
    for (let i = 0; i < fade; i++) {
      const gain = i / fade
      pcm[i]! *= gain
      pcm[pcm.length - 1 - i]! *= gain
    }
  }
  return pcm
}

async function pickEncoderConfig(bitrate: number): Promise<AudioEncoderConfig> {
  if (typeof AudioEncoder === 'undefined') throw new StickerError('unsupported-browser', 'WebCodecs AudioEncoder is missing')
  const base: AudioEncoderConfig = { codec: 'opus', sampleRate: OPUS_SAMPLE_RATE, numberOfChannels: 1, bitrate }
  const candidates: AudioEncoderConfig[] = [
    { ...base, bitrateMode: 'variable', opus: { frameDuration: 20000, complexity: 10 } } as AudioEncoderConfig,
    { ...base, bitrateMode: 'variable', opus: { frameDuration: 20000 } } as AudioEncoderConfig,
    base,
  ]
  for (const config of candidates) {
    try {
      if ((await AudioEncoder.isConfigSupported(config)).supported) return config
    } catch {
      // try the next one
    }
  }
  throw new StickerError('unsupported-browser', "This browser can't encode Opus")
}

export async function encodeOggOpus(pcm: Float32Array): Promise<Uint8Array> {
  const seconds = pcm.length / OPUS_SAMPLE_RATE
  // Lower the bitrate on long clips so the file stays under WhatsApp's 1 MB audio limit.
  const bitrate = Math.max(12000, Math.min(48000, Math.floor((0.9 * MAX_AUDIO_BYTES * 8) / seconds)))
  const config = await pickEncoderConfig(bitrate)
  const packets: Uint8Array[] = []
  let description: Uint8Array | null = null
  let failure: unknown = null
  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      const bytes = new Uint8Array(chunk.byteLength)
      chunk.copyTo(bytes)
      packets.push(bytes)
      const desc = meta?.decoderConfig?.description
      if (!description && desc) {
        description = ArrayBuffer.isView(desc) ? new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength) : new Uint8Array(desc)
      }
    },
    error: (error) => {
      failure = error
    },
  })
  encoder.configure(config)
  const block = 960 * 50
  for (let i = 0; i < pcm.length; i += block) {
    const frames = Math.min(block, pcm.length - i)
    const data = new AudioData({
      format: 'f32-planar',
      sampleRate: OPUS_SAMPLE_RATE,
      numberOfFrames: frames,
      numberOfChannels: 1,
      timestamp: Math.round((i / OPUS_SAMPLE_RATE) * 1e6),
      data: pcm.slice(i, i + frames),
    })
    encoder.encode(data)
    data.close()
  }
  await encoder.flush()
  encoder.close()
  if (failure) throw new StickerError('unreadable-audio', 'Opus encoding failed', { cause: failure })
  const ogg = buildOggOpus({ packets, preSkip: preSkipFromDescription(description), totalSamples: pcm.length })
  if (ogg.length > MAX_AUDIO_BYTES) throw new StickerError('too-long', "The audio doesn't fit in 1 MB")
  return ogg
}
