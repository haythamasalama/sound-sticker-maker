<script setup lang="ts">
import type { Shape } from '@sound-sticker-maker/core'
import { ImagePlusIcon, LinkIcon, MaximizeIcon, MinimizeIcon, MonitorSmartphoneIcon, RefreshCwIcon } from '@lucide/vue'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import FilePicker from '@/components/FilePicker.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { errorCode, readPicture, type Picture, type Range } from '@/lib/media'
import LinkImport from './LinkImport.vue'

type Source = 'file' | 'link'

const ACCEPT = 'video/*,image/*,.gif,.webp,.mov,.mkv'

/** The part of the picture to loop in the preview, in the picture's own seconds. */
const { loop } = defineProps<{ loop: Range | null }>()
const picture = defineModel<Picture | null>({ required: true })
const shape = defineModel<Shape>('shape', { required: true })
const { t, errorText } = useI18n()

const picker = useTemplateRef<InstanceType<typeof FilePicker>>('picker')
const video = useTemplateRef<HTMLVideoElement>('video')
const frameHost = useTemplateRef<HTMLDivElement>('frameHost')
const links = __LINKS__

const source = shallowRef<Source>('file')
// Each tab keeps its own picture, so switching tabs never mixes a file with a link.
const chosen = { file: shallowRef<Picture | null>(null), link: shallowRef<Picture | null>(null) }
const busy = shallowRef(false)
/** Set while a link is being imported; `player` means the clip plays in the stage while it records. */
const recording = shallowRef<{ player: boolean } | null>(null)
const error = shallowRef<string | null>(null)
const dragging = shallowRef(false)

const fit = computed(() => (shape.value === 'cover' ? 'object-cover' : 'object-contain'))
const tabs = computed(() => [
  { value: 'file' as const, label: t.value.tabFile, icon: MonitorSmartphoneIcon },
  { value: 'link' as const, label: t.value.tabLink, icon: LinkIcon },
])

watch(source, (next) => {
  error.value = null
  picture.value = chosen[next].value
})

async function choose(file: File, from: Source) {
  busy.value = true
  error.value = null
  try {
    const next = await readPicture(file)
    const previous = chosen[from].value
    if (previous) URL.revokeObjectURL(previous.url)
    chosen[from].value = next
    if (source.value === from) picture.value = next
  } catch (cause) {
    error.value = errorCode(cause)
  } finally {
    busy.value = false
  }
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file || busy.value || recording.value) return
  source.value = 'file'
  choose(file, 'file')
}

// Loop the chosen part silently, so the stage always shows what the sticker will look like.
function onTimeUpdate() {
  const element = video.value
  if (!element || !loop) return
  if (element.currentTime >= loop.end || element.currentTime < loop.start - 0.25) element.currentTime = loop.start
}
watch(
  () => loop?.start,
  (start) => {
    if (video.value && start !== undefined) video.value.currentTime = start
  },
)
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <FilePicker ref="picker" :accept="ACCEPT" @pick="(file) => choose(file, 'file')" />

    <div v-if="links" class="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="source === tab.value"
        class="flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        :class="source === tab.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        :disabled="!!recording"
        @click="source = tab.value"
      >
        <component :is="tab.icon" class="size-4" />
        {{ tab.label }}
      </button>
    </div>

    <div
      class="relative aspect-square w-full overflow-hidden rounded-xl bg-muted transition-shadow"
      :class="{ 'ring-2 ring-primary': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <div v-show="recording?.player" ref="frameHost" class="absolute inset-0 bg-black" />

      <div v-if="recording" class="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-black/60 px-3 py-2 text-xs text-white">
        <span class="size-2 animate-pulse rounded-full bg-red-500" />
        {{ recording.player ? t.recording : t.reading }}
      </div>

      <template v-if="picture && !recording">
        <video
          v-if="picture.kind === 'video'"
          ref="video"
          :src="picture.url"
          class="size-full"
          :class="fit"
          muted
          autoplay
          loop
          playsinline
          @timeupdate="onTimeUpdate"
        />
        <img v-else :src="picture.url" alt="" class="size-full" :class="fit" />

        <div class="absolute inset-x-2 top-2 flex justify-between gap-1.5">
          <Button
            variant="secondary"
            size="icon-sm"
            class="bg-background/85 backdrop-blur-sm"
            :title="shape === 'contain' ? t.shapeCover : t.shapeContain"
            :aria-label="shape === 'contain' ? t.shapeCover : t.shapeContain"
            @click="shape = shape === 'contain' ? 'cover' : 'contain'"
          >
            <MaximizeIcon v-if="shape === 'contain'" />
            <MinimizeIcon v-else />
          </Button>
          <Button
            v-if="source === 'file'"
            variant="secondary"
            size="sm"
            class="bg-background/85 backdrop-blur-sm"
            :disabled="busy"
            @click="picker?.open()"
          >
            <Spinner v-if="busy" />
            <RefreshCwIcon v-else />
            {{ t.change }}
          </Button>
        </div>
        <p
          class="absolute inset-x-2 bottom-2 truncate rounded-md bg-background/85 px-2 py-1 text-xs backdrop-blur-sm"
          data-testid="picture-name"
        >
          {{ picture.file.name }}
        </p>
      </template>

      <!-- v-show, not v-if: the form must stay mounted while the clip it asked for is recording. -->
      <div v-if="source === 'link' && !chosen.link.value" v-show="!recording" class="absolute inset-0 flex items-center p-5">
        <LinkImport title :host="frameHost" @working="(state) => (recording = state)" @file="(file) => choose(file, 'link')" />
      </div>

      <div
        v-else-if="source === 'file' && !picture"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <span class="grid size-14 place-items-center rounded-full bg-background text-muted-foreground shadow-sm">
          <ImagePlusIcon class="size-6" />
        </span>
        <p class="text-[15px] font-semibold text-balance">{{ t.dropTitle }}</p>
        <Button class="h-10 px-5" :disabled="busy" @click="picker?.open()">
          <Spinner v-if="busy" />
          {{ busy ? t.reading : t.chooseFromDevice }}
        </Button>
        <p class="text-xs text-muted-foreground">{{ t.dropHint }}</p>
      </div>
    </div>

    <LinkImport
      v-if="source === 'link' && chosen.link.value"
      :host="frameHost"
      @working="(state) => (recording = state)"
      @file="(file) => choose(file, 'link')"
    />
    <p v-if="error" class="text-xs text-destructive" role="alert">{{ errorText(error) }}</p>
  </div>
</template>
