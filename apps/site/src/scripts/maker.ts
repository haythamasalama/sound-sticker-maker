import {
  MAX_SECONDS,
  RECOMMENDED_SECONDS,
  createSoundSticker,
  formatClock,
  isAnimationFile,
  isStickerError,
  parseClock,
  parseVideoLink,
  probeAnimation,
  probeAudio,
  probeImage,
  probeVideo,
  type Shape,
  type SoundSticker,
  type Stage,
  type StickerRequest,
} from '@sound-sticker-maker/core'
import { clampRange, formatSeconds, type Range } from '../lib/time'
import { createLinkImporter } from './link-import'

type Kind = 'video' | 'animation' | 'image'
interface Picture {
  file: File
  kind: Kind
  duration: number
  url: string
}
interface Sound {
  file: File
  duration: number
  peaks: Float32Array
  peakMax: number
  own: boolean
}
type View = 'empty' | 'picture' | 'rec' | 'result'

const MIN_LENGTH = 0.3
const strings = JSON.parse(document.getElementById('mk-strings')?.textContent ?? '{}') as Record<string, string>
const config = JSON.parse(document.getElementById('mk-config')?.textContent ?? '{}') as { extensionId?: string }
const s = (key: string) => strings[`maker.${key}`] ?? key
const errorText = (code: string) => strings[`err.${code}`] ?? strings['err.unknown'] ?? code
const codeOf = (error: unknown) => (isStickerError(error) ? error.code : 'unknown')

function el<T extends HTMLElement = HTMLElement>(name: string): T {
  const found = document.querySelector<T>(`[data-mk="${name}"]`)
  if (!found) throw new Error(`Missing [data-mk="${name}"]`)
  return found
}
const show = (node: HTMLElement, visible: boolean) => (node.hidden = !visible)
function showText(node: HTMLElement, text: string | null) {
  node.textContent = text ?? ''
  show(node, !!text)
}
const showError = (node: HTMLElement, code: string | null) => showText(node, code ? errorText(code) : null)

const ui = {
  root: el('root'),
  stage: el('stage'),
  unsupported: el('unsupported'),
  pictureInput: el<HTMLInputElement>('picture-input'),
  empty: el('empty'),
  view: el('view'),
  rec: el('rec'),
  recFrame: el('rec-frame'),
  recText: el('rec-text'),
  pictureRow: el('picture-row'),
  pictureName: el('picture-name'),
  pictureKind: el('picture-kind'),
  pictureError: el('picture-error'),
  tabs: el('tabs'),
  linkForm: el<HTMLFormElement>('link-form'),
  link: el<HTMLInputElement>('link'),
  linkFrom: el<HTMLInputElement>('link-from'),
  linkLength: el<HTMLInputElement>('link-length'),
  linkGo: el<HTMLButtonElement>('link-go'),
  linkNeed: el('link-need'),
  linkError: el('link-error'),
  soundCard: el('sound-card'),
  soundModes: el('sound-modes'),
  soundNote: el('sound-note'),
  soundInput: el<HTMLInputElement>('sound-input'),
  soundEmpty: el('sound-empty'),
  soundRow: el('sound-row'),
  soundName: el('sound-name'),
  soundKind: el('sound-kind'),
  soundBusy: el('sound-busy'),
  soundError: el('sound-error'),
  clipCard: el('clip-card'),
  clipLength: el('clip-length'),
  clipHint: el('clip-hint'),
  wave: el<HTMLCanvasElement>('wave'),
  start: el<HTMLInputElement>('start'),
  end: el<HTMLInputElement>('end'),
  startText: el('start-text'),
  endText: el('end-text'),
  play: el<HTMLButtonElement>('play'),
  playIcon: el('play-icon'),
  pauseIcon: el('pause-icon'),
  details: el<HTMLDetailsElement>('details'),
  pack: el<HTMLInputElement>('pack'),
  author: el<HTMLInputElement>('author'),
  result: el<HTMLButtonElement>('result'),
  resultImg: el<HTMLImageElement>('result-img'),
  resultAudio: el<HTMLAudioElement>('result-audio'),
  resultMeta: el('result-meta'),
  act: el('act'),
  stale: el('stale'),
  progress: el('progress'),
  bar: el('bar'),
  stageText: el('stage-text'),
  cancel: el<HTMLButtonElement>('cancel'),
  create: el<HTMLButtonElement>('create'),
  createLabel: el('create-label'),
  createError: el('create-error'),
  downloads: el('downloads'),
  dlWebp: el<HTMLAnchorElement>('dl-webp'),
  dlOgg: el<HTMLAnchorElement>('dl-ogg'),
}

const state = {
  picture: null as Picture | null,
  own: null as Sound | null,
  other: null as Sound | null,
  sound: null as Sound | null,
  mode: 'own' as 'own' | 'other',
  range: { start: 0, end: 0 } as Range,
  pendingRange: null as Range | null,
  result: null as (SoundSticker & { webpUrl: string; audioUrl: string; key: string }) | null,
  controller: null as AbortController | null,
  view: 'empty' as View,
}

if (typeof AudioEncoder === 'undefined' || typeof OffscreenCanvas === 'undefined') show(ui.unsupported, true)

function setView(view: View) {
  state.view = view
  show(ui.empty, view === 'empty')
  show(ui.view, view === 'picture')
  show(ui.rec, view === 'rec')
  show(ui.result, view === 'result')
  show(ui.pictureRow, view === 'picture')
  show(ui.tabs, !!state.result && (view === 'picture' || view === 'result'))
  ui.tabs.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)))
  ui.stage.dataset.view = view
  if (view !== 'picture') stopPlaying()
}

// Reading files

async function readPicture(file: File): Promise<Picture> {
  const url = URL.createObjectURL(file)
  try {
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name)) {
      return { file, kind: 'video', duration: (await probeVideo(file)).duration, url }
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

async function readSound(file: File, own: boolean): Promise<Sound> {
  const probe = await probeAudio(file)
  return { file, duration: probe.duration, peaks: probe.peaks, peakMax: probe.peakMax, own }
}

const kindLabel = (kind: Kind, seconds: number) =>
  seconds > 0 ? `${s(`kind.${kind}`)} · ${formatSeconds(seconds)} ${s('s')}` : s(`kind.${kind}`)

function previewOf(picture: Picture): HTMLElement {
  if (picture.kind === 'video') {
    const video = document.createElement('video')
    video.src = picture.url
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    return video
  }
  const img = document.createElement('img')
  img.src = picture.url
  img.alt = ''
  return img
}

async function pickPicture(file: File, range: Range | null = null) {
  stopPlaying()
  showError(ui.pictureError, null)
  showError(ui.linkError, null)
  ui.stage.classList.add('busy')
  try {
    const picture = await readPicture(file)
    if (state.picture) URL.revokeObjectURL(state.picture.url)
    state.picture = picture
    state.pendingRange = range
    ui.view.replaceChildren(previewOf(picture))
    ui.pictureName.textContent = file.name
    ui.pictureKind.textContent = kindLabel(picture.kind, picture.duration)
    setView('picture')
    show(ui.soundCard, true)
    show(ui.details, true)
    await pictureChanged(picture)
  } catch (error) {
    showError(state.view === 'empty' ? ui.linkError : ui.pictureError, codeOf(error))
  } finally {
    ui.stage.classList.remove('busy')
  }
}

async function pictureChanged(picture: Picture) {
  const isVideo = picture.kind === 'video'
  state.own = null
  show(ui.soundModes, isVideo)
  showText(ui.soundNote, null)
  if (isVideo) {
    show(ui.soundBusy, true)
    const own = await readSound(picture.file, true).catch(() => null)
    show(ui.soundBusy, false)
    if (state.picture !== picture) return
    state.own = own
    if (!own) showText(ui.soundNote, s('noOwn'))
  } else if (!state.other) {
    showText(ui.soundNote, s('needSound'))
  }
  state.mode = state.own ? 'own' : 'other'
  ui.soundModes.querySelectorAll<HTMLInputElement>('input').forEach((r) => {
    r.checked = r.value === state.mode
    if (r.value === 'own') r.disabled = !state.own
  })
  setSound(state.mode === 'own' ? state.own : state.other)
}

// Sound

function renderSoundPicker() {
  const other = state.mode === 'other'
  show(ui.soundEmpty, other && !state.other)
  show(ui.soundRow, other && !!state.other)
  if (state.other) {
    ui.soundName.textContent = state.other.file.name
    ui.soundKind.textContent = `${formatSeconds(state.other.duration)} ${s('s')}`
  }
}

async function pickSound(file: File) {
  showError(ui.soundError, null)
  show(ui.soundBusy, true)
  try {
    state.other = await readSound(file, false)
    showText(ui.soundNote, null)
    if (state.mode === 'other') setSound(state.other)
  } catch (error) {
    showError(ui.soundError, codeOf(error))
  } finally {
    show(ui.soundBusy, false)
    renderSoundPicker()
  }
}

function setSound(sound: Sound | null) {
  stopPlaying()
  state.sound = sound
  renderSoundPicker()
  show(ui.clipCard, !!sound)
  if (sound) {
    const wanted = sound.own && state.pendingRange ? state.pendingRange : { start: 0, end: Math.min(sound.duration, RECOMMENDED_SECONDS) }
    state.range = clampRange(wanted.start, wanted.end, sound.duration, MIN_LENGTH, MAX_SECONDS)
    for (const input of [ui.start, ui.end]) input.max = String(sound.duration)
    renderRange()
  }
  refresh()
}

// Trimming

function setRange(start: number, end: number) {
  if (!state.sound) return
  state.range = clampRange(start, end, state.sound.duration, MIN_LENGTH, MAX_SECONDS)
  renderRange()
  refresh()
}

function renderRange() {
  const { start, end } = state.range
  ui.start.value = String(start)
  ui.end.value = String(end)
  ui.startText.textContent = `${formatSeconds(start)} ${s('s')}`
  ui.endText.textContent = `${formatSeconds(end)} ${s('s')}`
  ui.clipLength.textContent = `${formatSeconds(end - start)} ${s('s')}`
  ui.start.setAttribute('aria-valuetext', ui.startText.textContent)
  ui.end.setAttribute('aria-valuetext', ui.endText.textContent)
  const silent = isSilent()
  ui.clipHint.textContent = silent ? s('silent') : s('trimHint')
  ui.clipHint.classList.toggle('warn', silent)
  drawWave()
}

function isSilent() {
  const sound = state.sound
  if (!sound) return false
  const from = Math.floor((state.range.start / sound.duration) * sound.peaks.length)
  const to = Math.ceil((state.range.end / sound.duration) * sound.peaks.length)
  return Math.max(0, ...sound.peaks.subarray(from, to)) < 0.002
}

let playhead: number | null = null

function drawWave() {
  const sound = state.sound
  const canvas = ui.wave
  if (!sound || !canvas.clientWidth) return
  const ratio = window.devicePixelRatio || 1
  const width = Math.round(canvas.clientWidth * ratio)
  const height = Math.round(canvas.clientHeight * ratio)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const style = getComputedStyle(canvas)
  const on = style.getPropertyValue('--wave-on').trim()
  const off = style.getPropertyValue('--wave-off').trim()
  const max = Math.max(sound.peakMax, 0.01)
  const step = 3 * ratio
  const bars = Math.max(1, Math.floor(width / step))
  const startX = (state.range.start / sound.duration) * width
  const endX = (state.range.end / sound.duration) * width
  ctx.clearRect(0, 0, width, height)
  for (let i = 0; i < bars; i++) {
    const level = sound.peaks[Math.floor((i / bars) * sound.peaks.length)]! / max
    const x = i * step
    const h = Math.max(2 * ratio, level * height * 0.92)
    ctx.fillStyle = x >= startX && x <= endX ? on : off
    ctx.fillRect(x, (height - h) / 2, 2 * ratio, h)
  }
  if (playhead !== null) {
    ctx.fillStyle = style.getPropertyValue('--wave-head').trim()
    ctx.fillRect((playhead / sound.duration) * width - ratio, 0, 2 * ratio, height)
  }
}

let frame = 0
let audio: HTMLAudioElement | null = null
let audioUrl: string | null = null
let playing = false

const stageVideo = () => ui.view.querySelector('video')

function stopPlaying() {
  cancelAnimationFrame(frame)
  playing = false
  playhead = null
  audio?.pause()
  stageVideo()?.pause()
  show(ui.playIcon, true)
  show(ui.pauseIcon, false)
  ui.play.setAttribute('aria-label', s('play'))
  drawWave()
}

async function play() {
  const sound = state.sound
  if (!sound) return
  if (playing) return stopPlaying()
  if (state.view !== 'picture') setView('picture')
  const { start, end } = state.range
  const video = stageVideo()
  let clock: HTMLMediaElement
  if (sound.own && video) {
    clock = video
    video.muted = false
    video.loop = false
  } else {
    const id = sound.file.name + sound.file.size
    if (!audio || audio.dataset.file !== id) {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      audioUrl = URL.createObjectURL(sound.file)
      audio = new Audio(audioUrl)
      audio.dataset.file = id
    }
    clock = audio
    if (video) {
      video.muted = true
      video.loop = true
      video.currentTime = 0
    }
  }
  clock.currentTime = start
  playing = true
  show(ui.playIcon, false)
  show(ui.pauseIcon, true)
  ui.play.setAttribute('aria-label', s('stop'))
  try {
    await Promise.all([clock.play(), clock !== video && video ? video.play() : null])
  } catch {
    return stopPlaying()
  }
  const tick = () => {
    if (!playing) return
    playhead = clock.currentTime
    drawWave()
    if (clock.currentTime >= end || clock.ended) return stopPlaying()
    frame = requestAnimationFrame(tick)
  }
  tick()
}

// Creating

function request(): Omit<StickerRequest, 'signal' | 'onProgress'> | null {
  const p = state.picture
  const snd = state.sound
  const length = state.range.end - state.range.start
  if (!p || !snd || !(length > 0)) return null
  const visual =
    p.kind === 'video'
      ? {
          kind: 'video' as const,
          file: p.file,
          start: snd.own ? state.range.start : 0,
          duration: snd.own ? length : Math.min(p.duration, length),
        }
      : { kind: p.kind, file: p.file }
  const shape = (document.querySelector<HTMLInputElement>('input[name="mk-shape"]:checked')?.value ?? 'contain') as Shape
  return {
    visual,
    audio: { file: snd.file, start: state.range.start, duration: length },
    shape,
    fit: 'loop',
    packName: ui.pack.value.trim() || undefined,
    publisher: ui.author.value.trim() || undefined,
  }
}

function keyOf(input: ReturnType<typeof request>): string {
  if (!input) return ''
  const { visual, audio: a } = input
  return [
    visual.kind,
    (visual.file as File).name,
    visual.file.size,
    visual.kind === 'video' ? `${visual.start}-${visual.duration}` : '',
    (a.file as File).name,
    a.file.size,
    a.start,
    a.duration,
    input.shape,
    input.packName,
    input.publisher,
  ].join('|')
}

function refresh() {
  const input = request()
  const running = !!state.controller
  const fresh = !!state.result && state.result.key === keyOf(input)
  show(ui.act, !!input || !!state.result)
  show(ui.progress, running)
  show(ui.create, !running && !!input && !fresh)
  show(ui.downloads, !running && fresh)
  show(ui.stale, !running && !!state.result && !fresh && !!input)
  ui.createLabel.textContent = state.result ? s('again') : s('create')
}

const STAGES: Record<Stage, string> = {
  sound: s('stage.sound'),
  reading: s('stage.reading'),
  sizing: s('stage.sizing'),
  encoding: s('stage.encoding'),
}

async function create() {
  const input = request()
  if (!input || state.controller) return
  stopPlaying()
  const controller = new AbortController()
  state.controller = controller
  showError(ui.createError, null)
  ui.bar.style.width = '0%'
  ui.stageText.textContent = STAGES.sound
  refresh()
  try {
    const sticker = await createSoundSticker({
      ...input,
      signal: controller.signal,
      onProgress: (stage, fraction) => {
        ui.stageText.textContent = STAGES[stage]
        ui.bar.style.width = `${Math.round(fraction * 100)}%`
      },
    })
    if (state.result) {
      URL.revokeObjectURL(state.result.webpUrl)
      URL.revokeObjectURL(state.result.audioUrl)
    }
    state.result = {
      ...sticker,
      webpUrl: URL.createObjectURL(sticker.webp),
      audioUrl: URL.createObjectURL(sticker.audio),
      key: keyOf(input),
    }
    showResult()
  } catch (error) {
    const code = codeOf(error)
    if (code !== 'aborted') showError(ui.createError, code)
  } finally {
    state.controller = null
    refresh()
  }
}

function showResult() {
  const r = state.result!
  ui.resultImg.src = r.webpUrl
  ui.resultAudio.src = r.audioUrl
  ui.dlWebp.href = r.webpUrl
  ui.dlOgg.href = r.audioUrl
  const kb = Math.round(r.webp.size / 1000)
  ui.resultMeta.textContent = [`${r.side} px`, r.fps ? `${r.fps} fps` : '', `${kb} KB`, `${formatSeconds(r.seconds)} s`]
    .filter(Boolean)
    .join(' · ')
  setView('result')
  ui.result.animate?.(
    [
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1 },
    ],
    { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
  )
}

function listen() {
  const player = ui.resultAudio
  if (!player.src) return
  if (!player.paused) return player.pause()
  player.currentTime = 0
  player.play().catch(() => undefined)
}

// Links, through the GitHub build of the extension

const importer = createLinkImporter(config.extensionId ?? '')

importer.available().then((ok) => {
  show(ui.linkNeed, !ok)
  for (const input of [ui.link, ui.linkFrom, ui.linkLength, ui.linkGo]) input.disabled = !ok
})

ui.link.addEventListener('input', () => {
  const link = parseVideoLink(ui.link.value)
  if (link?.site === 'youtube' && link.start) ui.linkFrom.value = formatClock(link.start)
})

let cancelLink: (() => void) | null = null

ui.linkForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  showError(ui.linkError, null)
  const link = parseVideoLink(ui.link.value)
  if (!link) return showText(ui.linkError, s('link.bad'))
  const start = parseClock(ui.linkFrom.value)
  const length = Math.min(MAX_SECONDS, Math.max(1, Math.round(Number(ui.linkLength.value) || RECOMMENDED_SECONDS)))
  ui.linkLength.value = String(length)
  setView('rec')
  ui.recText.textContent = s(link.site === 'youtube' ? 'link.recording' : 'link.fetching')
  const job = link.site === 'youtube' ? importer.youtube(link.id, start, length, ui.recFrame) : importer.tiktok(link.url)
  cancelLink = job.cancel
  try {
    const file = await job.done
    setView('empty')
    await pickPicture(file, link.site === 'tiktok' ? { start, end: start + length } : null)
  } catch (error) {
    setView(state.picture ? 'picture' : 'empty')
    if ((error as Error)?.message !== 'cancelled') showText(state.picture ? ui.pictureError : ui.linkError, s('link.failed'))
  } finally {
    cancelLink = null
    ui.recFrame.replaceChildren()
  }
})
el('rec-cancel').addEventListener('click', () => cancelLink?.())

// Wiring

function dropTarget(zone: HTMLElement, onFile: (file: File) => void) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault()
    zone.classList.add('over')
  })
  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget as Node)) zone.classList.remove('over')
  })
  zone.addEventListener('drop', (e) => {
    e.preventDefault()
    zone.classList.remove('over')
    const file = e.dataTransfer?.files[0]
    if (file) onFile(file)
  })
}

function filePicker(input: HTMLInputElement, onFile: (file: File) => void, ...buttons: HTMLElement[]) {
  buttons.forEach((b) => b.addEventListener('click', () => input.click()))
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    input.value = ''
    if (file) onFile(file)
  })
}

filePicker(ui.pictureInput, (file) => pickPicture(file), el('picture-choose'), el('picture-replace'))
filePicker(ui.soundInput, pickSound, el('sound-choose'), el('sound-replace'))
dropTarget(ui.stage, (file) => pickPicture(file))
dropTarget(ui.soundCard, (file) => {
  state.mode = 'other'
  ui.soundModes.querySelectorAll<HTMLInputElement>('input').forEach((r) => (r.checked = r.value === 'other'))
  pickSound(file)
})

ui.soundModes.addEventListener('change', (e) => {
  state.mode = (e.target as HTMLInputElement).value as 'own' | 'other'
  setSound(state.mode === 'own' ? state.own : state.other)
})
ui.tabs.addEventListener('click', (e) => {
  const view = (e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.view
  if (view === 'picture' || view === 'result') setView(view)
})

ui.start.addEventListener('input', () => setRange(Math.min(+ui.start.value, state.range.end - MIN_LENGTH), state.range.end))
ui.end.addEventListener('input', () => setRange(state.range.start, Math.max(+ui.end.value, state.range.start + MIN_LENGTH)))
for (const input of [ui.start, ui.end]) input.addEventListener('pointerdown', stopPlaying)
ui.play.addEventListener('click', play)
ui.create.addEventListener('click', create)
ui.cancel.addEventListener('click', () => state.controller?.abort())
ui.result.addEventListener('click', listen)
ui.root.addEventListener('change', (e) => {
  if ((e.target as HTMLInputElement).name === 'mk-shape') refresh()
})
ui.pack.addEventListener('input', refresh)
ui.author.addEventListener('input', refresh)
new ResizeObserver(() => drawWave()).observe(ui.wave)
setView('empty')
