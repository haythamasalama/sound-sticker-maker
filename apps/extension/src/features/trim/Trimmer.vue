<script setup lang="ts">
import { MAX_SECONDS } from '@sound-sticker-maker/core'
import { PauseIcon, PlayIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, watchEffect } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'
import type { Picture, Range, Sound } from '@/lib/media'

const MIN_LENGTH = 0.3

const { sound, picture } = defineProps<{ sound: Sound; picture: Picture | null }>()
const range = defineModel<Range>({ required: true })
const { t } = useI18n()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const video = useTemplateRef<HTMLVideoElement>('video')
const track = useTemplateRef<HTMLDivElement>('track')
const playing = shallowRef(false)
const playhead = shallowRef<number | null>(null)

const soundUrl = computed(() => (sound.own ? null : URL.createObjectURL(sound.file)))
watch(soundUrl, (_next, previous) => previous && URL.revokeObjectURL(previous))
onBeforeUnmount(() => {
  stop()
  if (soundUrl.value) URL.revokeObjectURL(soundUrl.value)
})
let audio: HTMLAudioElement | null = null

const length = computed(() => range.value.end - range.value.start)
const percent = (seconds: number) => `${(seconds / sound.duration) * 100}%`
const selectionStyle = computed(() => ({ left: percent(range.value.start), width: percent(length.value) }))
const lengthText = computed(() => `${length.value.toFixed(1)} ${t.value.seconds}`)
const quiet = computed(() => {
  const { peaks, duration } = sound
  const from = Math.floor((range.value.start / duration) * peaks.length)
  const to = Math.ceil((range.value.end / duration) * peaks.length)
  return Math.max(0, ...peaks.subarray(from, to)) < 0.002
})

watchEffect(() => {
  const element = canvas.value
  if (!element) return
  const ratio = window.devicePixelRatio || 1
  const width = element.clientWidth * ratio
  const height = element.clientHeight * ratio
  element.width = width
  element.height = height
  const ctx = element.getContext('2d')!
  const style = getComputedStyle(element)
  const peaks = sound.peaks
  const max = Math.max(sound.peakMax, 0.01)
  const bars = Math.min(peaks.length, Math.floor(width / (3 * ratio)))
  const startX = (range.value.start / sound.duration) * width
  const endX = (range.value.end / sound.duration) * width
  ctx.clearRect(0, 0, width, height)
  for (let i = 0; i < bars; i++) {
    const level = peaks[Math.floor((i / bars) * peaks.length)]! / max
    const x = (i / bars) * width
    const h = Math.max(2 * ratio, level * height * 0.9)
    ctx.fillStyle = x >= startX && x <= endX ? style.getPropertyValue('--brand') : style.getPropertyValue('--input')
    ctx.fillRect(x, (height - h) / 2, 2 * ratio, h)
  }
})

function setRange(start: number, end: number) {
  const s = Math.max(0, Math.min(start, sound.duration - MIN_LENGTH))
  const e = Math.min(sound.duration, Math.max(end, s + MIN_LENGTH), s + MAX_SECONDS)
  range.value = { start: +s.toFixed(2), end: +e.toFixed(2) }
}

function drag(event: PointerEvent, handle: 'start' | 'end' | 'body') {
  const element = track.value
  if (!element) return
  stop()
  const box = element.getBoundingClientRect()
  const toSeconds = (x: number) => ((x - box.left) / box.width) * sound.duration
  const origin = toSeconds(event.clientX)
  const initial = { ...range.value }
  const move = (e: PointerEvent) => {
    const at = toSeconds(e.clientX)
    if (handle === 'start') setRange(Math.min(at, initial.end - MIN_LENGTH), initial.end)
    else if (handle === 'end') setRange(initial.start, Math.max(at, initial.start + MIN_LENGTH))
    else {
      const shift = Math.max(-initial.start, Math.min(at - origin, sound.duration - initial.end))
      setRange(initial.start + shift, initial.end + shift)
    }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

let frame = 0
function stop() {
  cancelAnimationFrame(frame)
  playing.value = false
  playhead.value = null
  audio?.pause()
  video.value?.pause()
}

async function play() {
  if (playing.value) return stop()
  const { start, end } = range.value
  const clock: HTMLMediaElement | null = sound.own ? video.value : (audio ??= new Audio())
  if (!clock) return
  if (!sound.own && soundUrl.value && audio!.src !== soundUrl.value) audio!.src = soundUrl.value
  if (video.value) {
    video.value.muted = !sound.own
    video.value.currentTime = sound.own ? start : 0
    if (!sound.own) video.value.loop = true
  }
  clock.currentTime = start
  playing.value = true
  await Promise.all([clock.play(), !sound.own && video.value ? video.value.play() : null]).catch(stop)
  const tick = () => {
    if (!playing.value) return
    playhead.value = clock.currentTime
    if (clock.currentTime >= end || clock.ended) return stop()
    frame = requestAnimationFrame(tick)
  }
  tick()
}

function onNumber(which: 'start' | 'end', value: string | number) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return
  if (which === 'start') setRange(seconds, Math.max(range.value.end, seconds + MIN_LENGTH))
  else setRange(range.value.start, seconds)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="picture"
      class="grid aspect-video place-items-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(var(--muted)_0_25%,var(--background)_0_50%)] bg-[length:16px_16px]"
    >
      <video v-if="picture.kind === 'video'" ref="video" :src="picture.url" class="size-full object-contain" playsinline preload="auto" />
      <img v-else :src="picture.url" alt="" class="size-full object-contain" />
    </div>

    <div ref="track" dir="ltr" class="relative h-16 touch-none rounded-lg bg-card select-none">
      <canvas ref="canvas" class="size-full" />
      <div
        class="absolute inset-y-0 cursor-grab rounded-md bg-brand/10 ring-2 ring-brand"
        :style="selectionStyle"
        @pointerdown.prevent="drag($event, 'body')"
      >
        <span
          class="absolute inset-y-0 -left-1.5 w-3 cursor-ew-resize rounded-s-md bg-brand"
          role="slider"
          :aria-label="t.from"
          :aria-valuenow="range.start"
          @pointerdown.prevent.stop="drag($event, 'start')"
        />
        <span
          class="absolute inset-y-0 -right-1.5 w-3 cursor-ew-resize rounded-e-md bg-brand"
          role="slider"
          :aria-label="t.length"
          :aria-valuenow="range.end"
          @pointerdown.prevent.stop="drag($event, 'end')"
        />
      </div>
      <div
        v-if="playhead !== null"
        class="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground"
        :style="{ left: percent(playhead) }"
      />
    </div>

    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <Button variant="outline" size="sm" @click="play">
        <PauseIcon v-if="playing" />
        <PlayIcon v-else />
        {{ playing ? t.stop : t.play }}
      </Button>
      <Input
        :model-value="range.start"
        type="number"
        step="0.1"
        min="0"
        dir="ltr"
        class="h-7 w-16 text-center"
        @update:model-value="onNumber('start', $event)"
      />
      <span>–</span>
      <Input
        :model-value="range.end"
        type="number"
        step="0.1"
        min="0"
        dir="ltr"
        class="h-7 w-16 text-center"
        @update:model-value="onNumber('end', $event)"
      />
      <span class="ms-auto rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-ink">{{ lengthText }}</span>
    </div>
    <p class="text-xs" :class="quiet ? 'text-destructive' : 'text-muted-foreground'">{{ quiet ? t.silent : t.trimHint }}</p>
  </div>
</template>
