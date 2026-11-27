<script setup lang="ts">
import { RECOMMENDED_SECONDS, type Shape } from '@sound-sticker-maker/core'
import { ChevronDownIcon, LanguagesIcon, XIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import BrandMark from '@/components/BrandMark.vue'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import ActionBar from '@/features/create/ActionBar.vue'
import Stage from '@/features/picture/Stage.vue'
import SoundSource from '@/features/sound/SoundSource.vue'
import Timeline from '@/features/trim/Timeline.vue'
import { storageGet, storageSet } from '@/lib/extension'
import { LOCALES, useI18n, type Locale } from '@/lib/i18n'
import type { Picture, Range, Sound } from '@/lib/media'

const open = defineModel<boolean>('open', { required: true })
const { t, dir, locale, setLocale } = useI18n()

const picture = shallowRef<Picture | null>(null)
const sound = shallowRef<Sound | null>(null)
const range = ref<Range>({ start: 0, end: 0 })
const shape = shallowRef<Shape>('contain')
const packName = shallowRef('')
const publisher = shallowRef('')

onMounted(async () => {
  packName.value = (await storageGet<string>('packName')) ?? ''
  publisher.value = (await storageGet<string>('publisher')) ?? ''
})
watch([packName, publisher], ([pack, author]) => storageSet({ packName: pack, publisher: author }))

const MIN_WIDTH = 340
const MAX_WIDTH = 760
const width = shallowRef(360)
const resizing = shallowRef(false)
const panel = useTemplateRef<HTMLElement>('panel')
const fitWidth = (value: number) => Math.round(Math.min(MAX_WIDTH, window.innerWidth - 32, Math.max(MIN_WIDTH, value)))
onMounted(async () => {
  width.value = fitWidth((await storageGet<number>('panelWidth')) ?? 360)
})

// The panel sits against the screen's end edge, so its width grows as its free (start) edge is pulled away.
function onResizeMove(event: PointerEvent) {
  const rect = panel.value?.getBoundingClientRect()
  if (!resizing.value || !rect) return
  width.value = fitWidth(dir.value === 'rtl' ? event.clientX - rect.left : rect.right - event.clientX)
}
function onResizeEnd() {
  if (!resizing.value) return
  resizing.value = false
  storageSet({ panelWidth: width.value })
}
function onResizeKey(event: KeyboardEvent) {
  const wider = dir.value === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
  const narrower = dir.value === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
  if (event.key !== wider && event.key !== narrower) return
  event.preventDefault()
  width.value = fitWidth(width.value + (event.key === wider ? 20 : -20))
  storageSet({ panelWidth: width.value })
}

watch(sound, (next) => {
  range.value = { start: 0, end: next ? +Math.min(next.duration, RECOMMENDED_SECONDS).toFixed(2) : 0 }
})

const length = computed(() => range.value.end - range.value.start)

/** What the stage loops: the chosen part when the sound is the video's own, else the start of the video. */
const loop = computed<Range | null>(() => {
  const p = picture.value
  if (p?.kind !== 'video' || !sound.value || !(length.value > 0)) return null
  return sound.value.own ? range.value : { start: 0, end: Math.min(p.duration, length.value) }
})

const input = computed(() => {
  const p = picture.value
  const s = sound.value
  if (!p || !s || !(length.value > 0)) return null
  const visual =
    p.kind === 'video'
      ? { kind: 'video' as const, file: p.file, start: loop.value!.start, duration: loop.value!.end - loop.value!.start }
      : { kind: p.kind, file: p.file }
  return {
    visual,
    audio: { file: s.file, start: range.value.start, duration: length.value },
    shape: shape.value,
    fit: 'loop' as const,
    packName: packName.value,
    publisher: publisher.value,
  }
})

const dark = shallowRef(document.body.classList.contains('dark'))
const observer = new MutationObserver(() => (dark.value = document.body.classList.contains('dark')))
observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
onBeforeUnmount(() => observer.disconnect())

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}
</script>

<template>
  <div class="ssm-root" :class="{ dark }" :dir="dir" :lang="locale" @keydown="onKeydown">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <aside
        v-if="open"
        ref="panel"
        class="fixed end-4 top-4 z-[2147483000] flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-background text-foreground shadow-[0_24px_64px_-12px_rgb(0_0_0/0.35),0_0_0_1px_var(--border)]"
        :class="{ 'select-none': resizing }"
        :style="{ width: `${width}px` }"
        role="dialog"
        :aria-label="t.title"
      >
        <div
          role="separator"
          aria-orientation="vertical"
          tabindex="0"
          :aria-label="t.resize"
          :title="t.resize"
          :aria-valuenow="width"
          :aria-valuemin="MIN_WIDTH"
          :aria-valuemax="MAX_WIDTH"
          class="group absolute inset-y-0 start-0 z-10 flex w-3 cursor-ew-resize touch-none items-center justify-center outline-none"
          data-testid="panel-resize"
          @pointerdown.prevent="(($event.currentTarget as HTMLElement).setPointerCapture($event.pointerId), (resizing = true))"
          @pointermove="onResizeMove"
          @pointerup="onResizeEnd"
          @pointercancel="onResizeEnd"
          @dblclick="((width = 360), storageSet({ panelWidth: 360 }))"
          @keydown="onResizeKey"
        >
          <span
            class="h-10 w-1 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-muted-foreground/60 group-focus-visible:bg-primary"
            :class="{ 'bg-primary': resizing }"
          />
        </div>
        <header class="flex items-center gap-2 px-3 py-2.5">
          <BrandMark class="size-7 shrink-0" />
          <h2 class="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">{{ t.title }}</h2>
          <label
            class="relative grid h-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            :title="t.language"
          >
            <span class="pointer-events-none flex items-center gap-1 px-2 text-xs font-medium uppercase">
              <LanguagesIcon class="size-4" />
              {{ locale }}
            </span>
            <select
              class="absolute inset-0 cursor-pointer appearance-none opacity-0"
              :value="locale"
              :aria-label="t.language"
              @change="setLocale(($event.target as HTMLSelectElement).value as Locale)"
            >
              <option v-for="option in LOCALES" :key="option.code" :value="option.code">{{ option.name }}</option>
            </select>
          </label>
          <Button variant="ghost" size="icon-sm" :aria-label="t.close" @click="open = false"><XIcon /></Button>
        </header>

        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-3">
          <Stage v-model="picture" v-model:shape="shape" :loop="loop" />

          <template v-if="picture">
            <SoundSource v-model="sound" :picture="picture" />
            <Timeline v-if="sound" v-model="range" :sound="sound" />

            <Collapsible>
              <CollapsibleTrigger
                class="group flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {{ t.info }}
                <span v-if="packName" class="truncate font-normal">· {{ packName }}</span>
                <ChevronDownIcon class="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent class="grid grid-cols-2 gap-2 pt-2">
                <Input v-model="packName" maxlength="128" class="h-8 text-xs" :placeholder="t.packPlaceholder" :aria-label="t.pack" />
                <Input v-model="publisher" maxlength="128" class="h-8 text-xs" :placeholder="t.authorPlaceholder" :aria-label="t.author" />
              </CollapsibleContent>
            </Collapsible>
          </template>
        </div>

        <footer v-if="picture" class="border-t bg-background p-3">
          <ActionBar :input="input" />
        </footer>
      </aside>
    </Transition>
  </div>
</template>
