<script setup lang="ts">
import { MAX_SECONDS, parseClock } from '@sound-sticker-maker/core'
import { MinusIcon, PauseIcon, PlayIcon, PlusIcon, RotateCcwIcon, ZoomInIcon, ZoomOutIcon } from '@lucide/vue'
import { useElementSize } from '@vueuse/core'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'
import { clock } from './clock'
import { useLinkText } from './linkText'

/**
 * The part always starts where the video is: moving the video, by any means, moves the part. Its length is the only
 * other thing to choose. What a pointer on the bars does: move the end, move the start, slide the part, scrub, or
 * travel the whole-video strip.
 */
type Drag = { kind: 'end' } | { kind: 'start'; end: number } | { kind: 'part'; offset: number } | { kind: 'scrub' } | { kind: 'strip' }

const MIN_LENGTH = 0.5
/** Up to this length the bar shows the whole video. Longer videos get a close-up bar and a strip for the whole. */
const SHORT_VIDEO = 90
const CLOSE_UP = 60
const MIN_SPAN = 10
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600]

const { duration, time, start, playing } = defineProps<{ duration: number; time: number; start: number; playing: boolean }>()
const length = defineModel<number>('length', { required: true })
const emit = defineEmits<{ seek: [time: number]; play: [] }>()

const { t } = useI18n()
const text = useLinkText()
const bar = useTemplateRef<HTMLDivElement>('bar')
const strip = useTemplateRef<HTMLDivElement>('strip')
const drag = shallowRef<Drag | null>(null)

const round = (value: number) => Math.round(value * 10) / 10
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const long = computed(() => duration > SHORT_VIDEO)

// The player reports its time every quarter second, so a seek asked for here counts until the report catches up.
const target = shallowRef<{ time: number; at: number } | null>(null)
const recent = () => !!target.value && Date.now() - target.value.at < 1200
const shownStart = computed(() => (recent() ? target.value!.time : start))
const shownEnd = computed(() => Math.min(duration, shownStart.value + length.value))
function seekTo(seconds: number) {
  const next = round(clamp(seconds, 0, Math.max(0, duration - MIN_LENGTH)))
  target.value = { time: next, at: Date.now() }
  emit('seek', next)
}
const setLength = (value: number) => (length.value = round(clamp(value, MIN_LENGTH, MAX_SECONDS)))

const view = shallowRef<[number, number]>([0, duration])
const span = computed(() => view.value[1] - view.value[0] || 1)
const zoomed = computed(() => span.value < duration - 0.05)
// Zooming in stops while the part keeps room on both sides.
const minSpan = computed(() => Math.min(duration, Math.max(MIN_SPAN, length.value * 2)))
const inView = (seconds: number) => seconds >= view.value[0] - 0.01 && seconds <= view.value[1] + 0.01

function setView(from: number, size = span.value) {
  const next = clamp(size, minSpan.value, duration)
  const first = clamp(from, 0, duration - next)
  view.value = [first, first + next]
}
const centerOn = (seconds: number, size = span.value) => setView(seconds - size / 2, size)
const showPart = () => centerOn((shownStart.value + shownEnd.value) / 2, Math.max(span.value, length.value * 2))

watch(
  () => duration,
  () => (long.value ? centerOn(start + length.value / 2, Math.max(CLOSE_UP, length.value * 2.5)) : setView(0, duration)),
  { immediate: true },
)
// The close-up follows the part wherever the video goes, also when it is moved with YouTube's own bar.
watch([shownStart, length], () => {
  if (drag.value?.kind === 'part' || drag.value?.kind === 'start' || drag.value?.kind === 'end') return
  if (!inView(shownStart.value) || !inView(shownEnd.value)) showPart()
})

function zoomBy(factor: number, anchor = (shownStart.value + shownEnd.value) / 2) {
  const size = clamp(span.value * factor, minSpan.value, duration)
  setView(anchor - (anchor - view.value[0]) * (size / span.value), size)
}
const canZoomIn = computed(() => span.value > minSpan.value + 0.05)

const ratio = (seconds: number) => clamp((seconds - view.value[0]) / span.value, 0, 1)
const place = (seconds: number) => ({ left: `${ratio(seconds) * 100}%` })
const rangeStyle = computed(() => ({
  left: `${ratio(shownStart.value) * 100}%`,
  width: `${(ratio(shownEnd.value) - ratio(shownStart.value)) * 100}%`,
}))

const { width: barWidth } = useElementSize(bar)
// About one label per 64 px, so times never run into each other.
const ticks = computed(() => {
  const most = clamp(Math.floor((barWidth.value || 300) / 64), 3, 10)
  const step = TICK_STEPS.find((candidate) => span.value / candidate <= most) ?? 7200
  const minor = step / (step >= 5 ? 5 : 2)
  const labels: { value: number; edge: 'first' | 'last' | 'middle' }[] = []
  const marks: number[] = []
  for (let value = Math.ceil(view.value[0] / minor) * minor; value <= view.value[1] + 1e-6; value += minor) {
    const exact = round(value)
    if (Math.abs(exact / step - Math.round(exact / step)) < 1e-6) {
      labels.push({ value: exact, edge: ratio(exact) < 0.05 ? 'first' : ratio(exact) > 0.95 ? 'last' : 'middle' })
    } else {
      marks.push(exact)
    }
  }
  return { labels, marks }
})

const whole = (seconds: number) => `${(duration > 0 ? clamp(seconds / duration, 0, 1) : 0) * 100}%`
const overview = computed(() => ({
  view: { left: whole(view.value[0]), width: `max(6px, calc(${whole(view.value[1])} - ${whole(view.value[0])}))` },
  part: { left: whole(shownStart.value), width: `max(3px, calc(${whole(shownEnd.value)} - ${whole(shownStart.value)}))` },
}))

function timeAt(clientX: number): number {
  const rect = bar.value!.getBoundingClientRect()
  return view.value[0] + clamp((clientX - rect.left) / rect.width, 0, 1) * span.value
}
function stripTimeAt(clientX: number): number {
  const rect = strip.value!.getBoundingClientRect()
  return clamp((clientX - rect.left) / rect.width, 0, 1) * duration
}

function begin(next: Drag, element: HTMLElement | null, event: PointerEvent) {
  element?.setPointerCapture(event.pointerId)
  drag.value = next
}
function onBarDown(event: PointerEvent) {
  begin({ kind: 'scrub' }, bar.value, event)
  seekTo(timeAt(event.clientX))
}
function grabStart(event: PointerEvent) {
  begin({ kind: 'start', end: shownEnd.value }, bar.value, event)
}
function grabEnd(event: PointerEvent) {
  begin({ kind: 'end' }, bar.value, event)
}
function grabPart(event: PointerEvent) {
  begin({ kind: 'part', offset: timeAt(event.clientX) - shownStart.value }, bar.value, event)
}
function onBarMove(event: PointerEvent) {
  const current = drag.value
  if (!current || current.kind === 'strip') return
  // Holding a grip or the part past either end of the bar moves the close-up along, so it can travel the whole video.
  const rect = bar.value!.getBoundingClientRect()
  const past = event.clientX < rect.left ? event.clientX - rect.left : event.clientX > rect.right ? event.clientX - rect.right : 0
  if (past && current.kind !== 'scrub') setView(view.value[0] + (past / rect.width) * span.value * 0.25)
  const at = timeAt(event.clientX)
  if (current.kind === 'scrub') {
    seekTo(at)
  } else if (current.kind === 'part') {
    seekTo(Math.min(at - current.offset, duration - length.value))
  } else if (current.kind === 'end') {
    setLength(at - shownStart.value)
  } else {
    const next = clamp(at, Math.max(0, current.end - MAX_SECONDS), current.end - MIN_LENGTH)
    seekTo(next)
    setLength(current.end - next)
  }
}
function onStripDown(event: PointerEvent) {
  begin({ kind: 'strip' }, strip.value, event)
  onStripMove(event)
}
function onStripMove(event: PointerEvent) {
  if (drag.value?.kind !== 'strip') return
  const at = stripTimeAt(event.clientX)
  centerOn(at)
  seekTo(at)
}
function onDragEnd() {
  if (!drag.value) return
  drag.value = null
  if (!inView(shownStart.value) || !inView(shownEnd.value)) showPart()
}

// Ctrl or ⌘ with the wheel, or a trackpad pinch, zooms around the pointer; a sideways or Shift scroll moves along.
function onWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    zoomBy(Math.exp(event.deltaY * 0.01), timeAt(event.clientX))
    return
  }
  const sideways = event.shiftKey ? event.deltaY || event.deltaX : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0
  if (!sideways || !zoomed.value) return
  event.preventDefault()
  setView(view.value[0] + (sideways / bar.value!.clientWidth) * span.value)
}
const zoomKey = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

function nudgeStart(event: KeyboardEvent) {
  const step = event.shiftKey ? 1 : 0.1
  const delta = ({ ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step } as Record<string, number>)[event.key]
  if (!delta) return
  event.preventDefault()
  seekTo(shownStart.value + delta)
}
function nudgeEnd(event: KeyboardEvent) {
  const step = event.shiftKey ? 1 : 0.1
  const delta = ({ ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step } as Record<string, number>)[event.key]
  if (!delta) return
  event.preventDefault()
  setLength(length.value + delta)
}

// A typed time stays as typed until the field is left or Enter is pressed; then the video goes there.
const draft = shallowRef<string | null>(null)
function commit() {
  const typed = draft.value
  draft.value = null
  if (typed?.trim()) seekTo(parseClock(typed))
}

const skip = (seconds: number) => seekTo(shownStart.value + seconds)
const backSkips = computed(() => [10, 5].map((n) => ({ n, label: text.value.back.replace('{n}', String(n)) })))
const forwardSkips = computed(() => [5, 10].map((n) => ({ n, label: text.value.forward.replace('{n}', String(n)) })))
const lengthText = computed(() => String(round(length.value)))
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Playback controls and the bars run left to right in every language, like the video's own bar above them. -->
    <div dir="ltr" class="flex items-center justify-center gap-2.5">
      <button
        v-for="item in backSkips"
        :key="`back-${item.n}`"
        type="button"
        class="relative grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        :title="item.label"
        :aria-label="item.label"
        @click="skip(-item.n)"
      >
        <RotateCcwIcon class="size-7 stroke-[1.6]" />
        <span class="absolute inset-0 grid place-items-center pt-0.5 text-[10px] font-bold">{{ item.n }}</span>
      </button>
      <button
        type="button"
        class="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        :title="text.playPart"
        :aria-label="text.playPart"
        :aria-pressed="playing"
        data-testid="play-part"
        @click="emit('play')"
      >
        <PauseIcon v-if="playing" class="size-6 fill-current" />
        <PlayIcon v-else class="size-6 translate-x-px fill-current" />
      </button>
      <button
        v-for="item in forwardSkips"
        :key="`forward-${item.n}`"
        type="button"
        class="relative grid size-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        :title="item.label"
        :aria-label="item.label"
        @click="skip(item.n)"
      >
        <RotateCcwIcon class="size-7 -scale-x-100 stroke-[1.6]" />
        <span class="absolute inset-0 grid place-items-center pt-0.5 text-[10px] font-bold">{{ item.n }}</span>
      </button>
    </div>
    <p class="text-center text-xs text-balance text-muted-foreground">{{ text.followHint }}</p>

    <div class="grid grid-cols-2 gap-2">
      <label class="flex flex-col gap-1 rounded-xl bg-primary/7 p-2.5">
        <span class="text-xs font-semibold text-primary">{{ text.startPoint }}</span>
        <Input
          :model-value="draft ?? clock(shownStart, false)"
          dir="ltr"
          inputmode="decimal"
          placeholder="0:00"
          class="h-10 bg-background text-center text-lg font-bold tabular-nums"
          data-testid="part-start"
          @update:model-value="(value) => (draft = String(value))"
          @keydown.enter.prevent="commit"
          @blur="commit"
        />
      </label>
      <div class="flex flex-col gap-1 rounded-xl bg-primary/7 p-2.5">
        <span class="text-xs font-semibold text-primary">{{ t.length }}</span>
        <div dir="ltr" class="flex h-10 items-center gap-1 rounded-md border bg-background px-1">
          <Button
            variant="ghost"
            size="icon-sm"
            :aria-label="text.shorter"
            :title="text.shorter"
            :disabled="length <= 1"
            data-testid="shorter"
            @click="setLength(Math.ceil(length) - 1)"
          >
            <MinusIcon />
          </Button>
          <span class="flex-1 text-center text-lg font-bold tabular-nums" data-testid="part-length">
            {{ lengthText }}<span class="ms-0.5 text-sm font-medium text-muted-foreground">{{ t.seconds }}</span>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            :aria-label="text.longer"
            :title="text.longer"
            :disabled="length >= 30"
            data-testid="longer"
            @click="setLength(Math.floor(length) + 1)"
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
    </div>

    <!-- The grips sit just outside the part, so its middle stays free to drag; the margin leaves them room. -->
    <div dir="ltr" class="mx-4 flex flex-col gap-2">
      <div v-if="long" class="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
        <span>0:00</span>
        <div
          ref="strip"
          class="relative h-5 flex-1 cursor-pointer touch-none rounded-md bg-muted select-none"
          :title="text.overview"
          :aria-label="text.overview"
          data-testid="overview"
          @pointerdown="onStripDown"
          @pointermove="onStripMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <span
            class="pointer-events-none absolute inset-y-0 rounded-md border-2 border-foreground/45 bg-background/70"
            :style="overview.view"
          />
          <span class="pointer-events-none absolute inset-y-1 rounded-sm bg-primary" :style="overview.part" />
        </div>
        <span>{{ clock(duration, false) }}</span>
      </div>

      <div
        ref="bar"
        class="relative h-12 cursor-pointer touch-none rounded-[10px] bg-muted select-none"
        @pointerdown="onBarDown"
        @pointermove="onBarMove"
        @pointerup="onDragEnd"
        @pointercancel="onDragEnd"
        @wheel="onWheel"
      >
        <span
          v-for="mark in ticks.marks"
          :key="mark"
          class="pointer-events-none absolute bottom-0 h-1.5 w-px bg-foreground/20"
          :style="place(mark)"
        />
        <span
          v-for="tick in ticks.labels"
          :key="`line-${tick.value}`"
          class="pointer-events-none absolute bottom-0 h-3 w-px bg-foreground/40"
          :style="place(tick.value)"
        />
        <span
          class="absolute inset-y-0 min-w-1 border-y-2 border-primary bg-primary/15 hover:bg-primary/25"
          :class="drag?.kind === 'part' ? 'cursor-grabbing' : 'cursor-grab'"
          :style="rangeStyle"
          :title="text.movePart"
          data-testid="part-range"
          @pointerdown.stop="grabPart"
        />
        <span
          v-show="playing && inView(time)"
          class="pointer-events-none absolute inset-y-1.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/80"
          :style="place(time)"
        />
        <button
          type="button"
          role="slider"
          :aria-label="text.startPoint"
          :aria-valuemin="0"
          :aria-valuemax="Math.round(duration * 10) / 10"
          :aria-valuenow="shownStart"
          :aria-valuetext="clock(shownStart)"
          class="absolute -inset-y-[3px] flex w-4 -translate-x-full cursor-ew-resize items-center justify-center gap-0.5 rounded-s-[7px] bg-primary shadow-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          data-testid="grip-start"
          :style="place(shownStart)"
          @pointerdown.stop="grabStart"
          @keydown="nudgeStart"
        >
          <span class="h-3.5 w-px rounded-full bg-primary-foreground" />
          <span class="h-3.5 w-px rounded-full bg-primary-foreground" />
        </button>
        <button
          type="button"
          role="slider"
          :aria-label="t.length"
          :aria-valuemin="MIN_LENGTH"
          :aria-valuemax="MAX_SECONDS"
          :aria-valuenow="length"
          :aria-valuetext="`${lengthText} ${t.seconds}`"
          class="absolute -inset-y-[3px] flex w-4 cursor-ew-resize items-center justify-center gap-0.5 rounded-e-[7px] bg-primary shadow-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          data-testid="grip-end"
          :style="place(shownEnd)"
          @pointerdown.stop="grabEnd"
          @keydown="nudgeEnd"
        >
          <span class="h-3.5 w-px rounded-full bg-primary-foreground" />
          <span class="h-3.5 w-px rounded-full bg-primary-foreground" />
        </button>
      </div>
      <div class="relative h-4 text-[11px] text-muted-foreground tabular-nums" aria-hidden="true">
        <span
          v-for="tick in ticks.labels"
          :key="tick.value"
          class="absolute top-0 whitespace-nowrap"
          :class="{ '-translate-x-1/2': tick.edge === 'middle', '-translate-x-full': tick.edge === 'last' }"
          :style="place(tick.value)"
        >
          {{ clock(tick.value, false) }}
        </span>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <p class="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{{ text.zoomHint.replace('{key}', zoomKey) }}</p>
      <Button
        variant="ghost"
        size="icon-sm"
        :title="text.zoomOut"
        :aria-label="text.zoomOut"
        :disabled="!zoomed"
        data-testid="zoom-out"
        @click="zoomBy(2)"
      >
        <ZoomOutIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        :title="text.zoomIn"
        :aria-label="text.zoomIn"
        :disabled="!canZoomIn"
        data-testid="zoom-in"
        @click="zoomBy(0.5)"
      >
        <ZoomInIcon />
      </Button>
    </div>
  </div>
</template>
