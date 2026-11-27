<script setup lang="ts">
import { RECOMMENDED_SECONDS } from '@sound-sticker-maker/core'
import { AudioLinesIcon, XIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import CreateStep from '@/features/create/CreateStep.vue'
import PictureStep from '@/features/picture/PictureStep.vue'
import SoundStep from '@/features/sound/SoundStep.vue'
import Trimmer from '@/features/trim/Trimmer.vue'
import { useI18n, type Locale } from '@/lib/i18n'
import type { Picture, Range, Sound } from '@/lib/media'

const open = defineModel<boolean>('open', { required: true })
const { t, dir, locale, setLocale } = useI18n()

const picture = shallowRef<Picture | null>(null)
const sound = shallowRef<Sound | null>(null)
const range = ref<Range>({ start: 0, end: 0 })

watch(sound, (next) => {
  range.value = { start: 0, end: next ? +Math.min(next.duration, RECOMMENDED_SECONDS).toFixed(2) : 0 }
})

const source = computed(() => {
  const p = picture.value
  const s = sound.value
  const length = range.value.end - range.value.start
  if (!p || !s || !(length > 0)) return null
  const visual =
    p.kind === 'video'
      ? {
          kind: 'video' as const,
          file: p.file,
          start: s.own ? range.value.start : 0,
          duration: s.own ? length : Math.min(p.duration, length),
        }
      : { kind: p.kind, file: p.file }
  return { visual, audio: { file: s.file, start: range.value.start, duration: length } }
})

const dark = shallowRef(document.body.classList.contains('dark'))
const observer = new MutationObserver(() => (dark.value = document.body.classList.contains('dark')))
observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
onBeforeUnmount(() => observer.disconnect())

const languages: { code: Locale; label: string }[] = [
  { code: 'ar', label: 'ع' },
  { code: 'en', label: 'EN' },
]

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}
</script>

<template>
  <div class="ssm-root" :class="{ dark }" :dir="dir" :lang="locale" @keydown="onKeydown">
    <button
      v-if="!open"
      type="button"
      class="fixed end-5 bottom-24 z-[2147483000] grid size-12 place-items-center rounded-full bg-brand text-white shadow-[0_10px_26px_-12px_var(--brand)] transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50"
      :title="t.title"
      :aria-label="t.title"
      @click="open = true"
    >
      <AudioLinesIcon class="size-6" />
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <aside
        v-if="open"
        class="fixed end-4 top-4 bottom-4 z-[2147483000] flex w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-[0_0_0_0.5px_rgba(128,128,128,0.35),0_24px_60px_-24px_rgba(10,30,60,0.45)]"
        role="dialog"
        :aria-label="t.title"
      >
        <header class="flex items-center gap-3 border-b px-4 py-3">
          <span class="grid size-9 place-items-center rounded-xl bg-brand text-white"><AudioLinesIcon class="size-5" /></span>
          <h2 class="flex-1 truncate text-[15px] font-semibold tracking-tight">{{ t.title }}</h2>
          <div class="flex rounded-full bg-muted p-0.5" role="group" :aria-label="t.language">
            <button
              v-for="language in languages"
              :key="language.code"
              type="button"
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="language.code === locale ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
              :aria-pressed="language.code === locale"
              @click="setLocale(language.code)"
            >
              {{ language.label }}
            </button>
          </div>
          <Button variant="ghost" size="icon" :aria-label="t.close" @click="open = false"><XIcon /></Button>
        </header>

        <div class="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
          <section class="flex flex-col gap-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <span class="grid size-6 place-items-center rounded-full bg-foreground text-xs text-background">1</span>{{ t.stepPicture }}
            </h3>
            <PictureStep v-model="picture" />
          </section>

          <section class="flex flex-col gap-3" :class="{ 'pointer-events-none opacity-40': !picture }">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <span class="grid size-6 place-items-center rounded-full bg-foreground text-xs text-background">2</span>{{ t.stepSound }}
            </h3>
            <SoundStep v-model="sound" :picture="picture" />
            <Trimmer v-if="sound" v-model="range" :sound="sound" :picture="picture" />
          </section>

          <section class="flex flex-col gap-3" :class="{ 'pointer-events-none opacity-40': !source }">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <span class="grid size-6 place-items-center rounded-full bg-foreground text-xs text-background">3</span>{{ t.stepMake }}
            </h3>
            <CreateStep :source="source" />
          </section>
        </div>

        <footer class="border-t px-4 py-2.5 text-[11px] text-muted-foreground">{{ t.notice }}</footer>
      </aside>
    </Transition>
  </div>
</template>
