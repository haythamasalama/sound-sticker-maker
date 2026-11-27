<script setup lang="ts">
import { RECOMMENDED_SECONDS, type Shape } from '@sound-sticker-maker/core'
import { ChevronDownIcon, LanguagesIcon, XIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
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
    <button
      v-if="!open"
      type="button"
      class="fixed end-5 bottom-24 z-[2147483000] size-12 overflow-hidden rounded-[14px] bg-transparent p-0 shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50"
      :title="t.title"
      :aria-label="t.title"
      @click="open = true"
    >
      <BrandMark bleed class="block size-full" />
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <aside
        v-if="open"
        class="fixed end-4 top-4 z-[2147483000] flex max-h-[calc(100vh-2rem)] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-background text-foreground shadow-[0_24px_64px_-12px_rgb(0_0_0/0.35),0_0_0_1px_var(--border)]"
        role="dialog"
        :aria-label="t.title"
      >
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
