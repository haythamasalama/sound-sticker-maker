import { describe, expect, it } from 'vitest'
import { kindOf, parseProbe } from '../src/media'
import { squareFilter } from '../src/sticker'

const VIDEO = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'a.mp4':
  Duration: 00:01:02.50, start: 0.000000, bitrate: 1200 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1280x720, 1000 kb/s, 30 fps
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s`
const GIF = `Input #0, gif, from 'b.gif':
  Duration: 00:00:02.00, start: 0.000000, bitrate: 300 kb/s
  Stream #0:0: Video: gif, bgra, 240x180, 12 fps`
const JPG = `Input #0, image2, from 'c.jpg':
  Duration: 00:00:00.04, start: 0.000000, bitrate: 9000 kb/s
  Stream #0:0: Video: mjpeg (Baseline), yuvj420p(pc, bt470bg/unknown/unknown), 640x480, 25 fps`
const MP3 = `Input #0, mp3, from 'd.mp3':
  Duration: 00:00:03.03, start: 0.025057, bitrate: 64 kb/s
  Stream #0:0: Audio: mp3, 44100 Hz, mono, fltp, 64 kb/s`

describe('parseProbe and kindOf', () => {
  it('reads a video with sound', () => {
    const probe = parseProbe(VIDEO, 'a.mp4')
    expect(probe).toMatchObject({ duration: 62.5, width: 1280, height: 720, hasAudio: true })
    expect(kindOf('a.mp4', probe)).toBe('video')
  })

  it('tells GIFs, photos and sounds apart', () => {
    expect(kindOf('b.gif', parseProbe(GIF, 'b.gif'))).toBe('animation')
    expect(kindOf('c.jpg', parseProbe(JPG, 'c.jpg'))).toBe('image')
    const sound = parseProbe(MP3, 'd.mp3')
    expect(sound.hasAudio).toBe(true)
    expect(kindOf('d.mp3', sound)).toBe('audio')
  })
})

describe('squareFilter', () => {
  it('pads to keep the whole picture or crops to fill', () => {
    expect(squareFilter(512, 'contain', 20)).toContain('pad=512:512')
    expect(squareFilter(512, 'cover')).toContain('crop=512:512')
    expect(squareFilter(384, 'cover', 12).startsWith('fps=12,')).toBe(true)
  })
})
