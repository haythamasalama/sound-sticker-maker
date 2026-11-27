<script setup lang="ts">
import type { Shape } from '@sound-sticker-maker/core'
import { ImagePlusIcon, LinkIcon, MaximizeIcon, MinimizeIcon, RefreshCwIcon } from '@lucide/vue'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import FilePicker from '@/components/FilePicker.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { errorCode, readPicture, type Picture, type Range } from '@/lib/media'
import LinkImport from './LinkImport.vue'

const ACCEPT = 'video/*,image/*,.gif,.webp,.mov,.mkv'

/** The part of the picture to loop in the preview, in the picture's own seconds. */
const { loop } = defineProps<{ loop: Range | null }>()
const picture = defineModel<Picture | null>({ required: true })
const shape = defineModel<Shape>('shape', { required: true })
const { t, errorText } = useI18n()

const picker = useTemplateRef<InstanceType<typeof FilePicker>>('picker')
const video = useTemplateRef<HTMLVideoElement>('video')
const frameHost = useTemplateRef<HTMLDivElement>('frameHost')
const busy = shallowRef(false)
/** Set while a link is being imported; `player` means the clip plays in the stage while it records. */
const recording = shallowRef<{ player: boolean } | null>(null)
const showLink = shallowRef(false)
const error = shallowRef<string | null>(null)
const dragging = shallowRef(false)
const links = __LINKS__

const fit = computed(() => (shape.value === 'cover' ? 'object-cover' : 'object-contain'))

async function choose(file: File) {
  busy.value = true
  error.value = null
  try {
    const next = await readPicture(file)
    if (picture.value) URL.revokeObjectURL(picture.value.url)
    picture.value = next
    showLink.value = false
  } catch (cause) {
    error.value = errorCode(cause)
  } finally {
    busy.value = false
  }
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && !busy.value && !recording.value) choose(file)
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
    <FilePicker ref="picker" :accept="ACCEPT" @pick="choose" />

    <div
      class="relative aspect-square w-full overflow-hidden rounded-xl bg-muted transition-shadow"
      :class="{ 'ring-2 ring-primary': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <div v-show="recording?.player" ref="frameHost" class="absolute inset-0 bg-black" />

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

        <div class="absolute inset-x-2 top-2 flex gap-1.5">
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
          <span class="ms-auto" />
          <Button
            v-if="links"
            variant="secondary"
            size="icon-sm"
            class="bg-background/85 backdrop-blur-sm"
            :title="t.pasteLink"
            :aria-label="t.pasteLink"
            @click="showLink = !showLink"
          >
            <LinkIcon />
          </Button>
          <Button variant="secondary" size="sm" class="bg-background/85 backdrop-blur-sm" :disabled="busy" @click="picker?.open()">
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

      <div v-else-if="recording" class="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/60 px-3 py-2 text-xs text-white">
        <span class="size-2 animate-pulse rounded-full bg-red-500" />
        {{ recording.player ? t.recording : t.reading }}
      </div>

      <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span class="grid size-12 place-items-center rounded-full bg-background text-muted-foreground shadow-sm">
          <ImagePlusIcon class="size-5" />
        </span>
        <p class="text-sm font-medium text-balance">{{ t.dropTitle }}</p>
        <div class="flex gap-2">
          <Button size="sm" :disabled="busy" @click="picker?.open()">
            <Spinner v-if="busy" />
            {{ busy ? t.reading : t.chooseFile }}
          </Button>
          <Button v-if="links" variant="outline" size="sm" class="bg-background" @click="showLink = !showLink">
            <LinkIcon />
            {{ t.pasteLink }}
          </Button>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-xs text-destructive" role="alert">{{ errorText(error) }}</p>
    <LinkImport v-if="links && (showLink || recording)" :host="frameHost" @working="(state) => (recording = state)" @file="choose" />
  </div>
</template>
