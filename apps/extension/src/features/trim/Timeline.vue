<script setup lang="ts">
import { MAX_SECONDS } from '@sound-sticker-maker/core'
import { PauseIcon, PlayIcon } from '@lucide/vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, watchEffect } from 'vue'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import type { Range, Sound } from '@/lib/media'

const MIN_LENGTH = 0.3

const { sound } = defineProps<{ sound: Sound }>()
const range = defineModel<Range>({ required: true })
const { t } = useI18n()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const playing = shallowRef(false)
const playhead = shallowRef<number | null>(null)

const url = computed(() => URL.createObjectURL(sound.file))
watch(url, (_next, previous) => previous && URL.revokeObjectURL(previous))
const audio = new Audio()
onBeforeUnmount(() => {
  stop()
  URL.revokeObjectURL(url.value)
})

const length = computed(() => range.value.end - range.value.start)
const lengthText = computed(() => `${length.value.toFixed(1)} ${t.value.seconds}`)
const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
const timesText = computed(() => `${clock(range.value.start)} – ${clock(range.value.end)}`)
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
  const bar = 2 * ratio
  const gap = 1.5 * ratio
  const bars = Math.floor(width / (bar + gap))
  const max = Math.max(sound.peakMax, 0.01)
  const startX = (range.value.start / sound.duration) * width
  const endX = (range.value.end / sound.duration) * width
  const head = playhead.value === null ? -1 : (playhead.value / sound.duration) * width
  ctx.clearRect(0, 0, width, height)
  for (let i = 0; i < bars; i++) {
    const x = i * (bar + gap)
    const level = sound.peaks[Math.floor((i / bars) * sound.peaks.length)]! / max
    const h = Math.max(bar, level * height * 0.86)
    const inside = x >= startX && x <= endX
    ctx.fillStyle = style.getPropertyValue(inside ? (head >= 0 && x <= head ? '--foreground' : '--primary') : '--waveform-idle')
    ctx.beginPath()
    ctx.roundRect(x, (height - h) / 2, bar, h, bar / 2)
    ctx.fill()
  }
})

const sliderValue = computed(() => [range.value.start, range.value.end])

function onSlide(value: number[] | undefined) {
  if (!value || value.length < 2) return
  stop()
  let [start, end] = value as [number, number]
  if (end - start > MAX_SECONDS) {
    if (start !== range.value.start) end = start + MAX_SECONDS
    else start = end - MAX_SECONDS
  }
  range.value = { start: +start.toFixed(2), end: +Math.max(end, start + MIN_LENGTH).toFixed(2) }
}

let frame = 0
function stop() {
  cancelAnimationFrame(frame)
  audio.pause()
  playing.value = false
  playhead.value = null
}

async function play() {
  if (playing.value) return stop()
  if (audio.src !== url.value) audio.src = url.value
  audio.currentTime = range.value.start
  playing.value = true
  await audio.play().catch(stop)
  const tick = () => {
    if (!playing.value) return
    playhead.value = audio.currentTime
    if (audio.currentTime >= range.value.end || audio.ended) return stop()
    frame = requestAnimationFrame(tick)
  }
  tick()
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center gap-2">
      <Button variant="secondary" size="icon" class="size-9 shrink-0 rounded-full" :aria-label="playing ? t.stop : t.play" @click="play">
        <PauseIcon v-if="playing" />
        <PlayIcon v-else class="translate-x-px" />
      </Button>
      <div dir="ltr" class="relative h-11 flex-1">
        <canvas ref="canvas" class="absolute inset-0 size-full" />
        <SliderRoot
          :model-value="sliderValue"
          :min="0"
          :max="sound.duration"
          :step="0.05"
          :min-steps-between-thumbs="6"
          class="absolute inset-0 flex touch-none items-center select-none"
          :aria-label="t.clip"
          @update:model-value="onSlide"
        >
          <SliderTrack class="relative h-full grow">
            <SliderRange class="absolute h-full rounded-md bg-primary/8" />
          </SliderTrack>
          <SliderThumb
            v-for="index in 2"
            :key="index"
            class="block h-11 w-1 cursor-ew-resize rounded-full bg-primary outline-none after:absolute after:-inset-x-2.5 after:inset-y-0 focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </SliderRoot>
      </div>
    </div>
    <div class="flex items-center justify-between ps-11 text-xs text-muted-foreground">
      <span dir="ltr" class="tabular-nums">{{ timesText }}</span>
      <span class="font-medium tabular-nums" :class="length > 10 ? 'text-destructive' : 'text-foreground'" dir="ltr">{{ lengthText }}</span>
    </div>
    <p v-if="quiet" class="ps-11 text-xs text-destructive">{{ t.silent }}</p>
  </div>
</template>
