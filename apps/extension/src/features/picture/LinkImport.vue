<script setup lang="ts">
import { RECOMMENDED_SECONDS, parseVideoLink } from '@sound-sticker-maker/core'
import { computed, shallowRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { useLinkText } from './linkText'
import PartPicker from './PartPicker.vue'
import { LinkError, clipToFile, downloadTikTok } from './useLinkImport'
import { useYouTubePlayer } from './useYouTubePlayer'

export type LinkStatus = 'idle' | 'watching' | 'recording' | 'downloading'

const { host } = defineProps<{ host: HTMLElement | null }>()
const emit = defineEmits<{ file: [file: File]; status: [status: LinkStatus] }>()

const { t, errorText, locale } = useI18n()
const text = useLinkText()
const player = useYouTubePlayer()
const state = player.state

const link = shallowRef('')
const downloading = shallowRef(false)
const error = shallowRef<string | null>(null)
// The part starts where the video is; only its length is chosen. It stays put while the part itself plays.
const start = shallowRef(0)
const length = shallowRef(RECOMMENDED_SECONDS)
const previewing = shallowRef(false)
let settling = 0

const parsed = computed(() => parseVideoLink(link.value))
const ready = computed(() => !!state.value?.ready)
const status = computed<LinkStatus>(() =>
  player.recording.value ? 'recording' : downloading.value ? 'downloading' : state.value ? 'watching' : 'idle',
)
const busy = computed(() => status.value === 'recording' || status.value === 'downloading')
const end = computed(() => Math.min(state.value?.duration ?? 0, start.value + length.value))

watch(status, (next) => emit('status', next), { immediate: true })

watch(
  () => state.value?.error,
  (code) => {
    if (code) error.value = code
  },
)

watch(
  () => state.value?.time ?? 0,
  (time) => {
    if (player.recording.value || Date.now() - settling < 800) return
    if (previewing.value) {
      // Moving the video away from the part, with YouTube's own bar too, ends the preview and takes the part along.
      const away = time < start.value - 0.5 || time > end.value + 1
      if (!away && time < end.value) return
      if (!away) {
        stopPreview()
        return
      }
      previewing.value = false
    }
    start.value = Math.round(time * 10) / 10
  },
)

function stopPreview() {
  previewing.value = false
  settling = Date.now()
  player.command({ action: 'pause' })
  player.command({ action: 'seek', time: start.value })
}

async function open() {
  error.value = null
  const target = parsed.value
  if (!target) {
    error.value = 'bad-link'
    return
  }
  if (target.site === 'youtube') {
    if (host) player.open(target.id, target.start, host, locale.value)
    return
  }
  player.close()
  downloading.value = true
  try {
    emit('file', await downloadTikTok(target.url))
  } catch (cause) {
    error.value = cause instanceof LinkError ? cause.code : 'network'
  } finally {
    downloading.value = false
  }
}

function seek(time: number) {
  previewing.value = false
  player.command({ action: 'seek', time })
}

function togglePreview() {
  if (previewing.value) {
    stopPreview()
    return
  }
  previewing.value = true
  settling = Date.now()
  player.command({ action: 'seek', time: start.value })
  player.command({ action: 'play' })
}

async function usePart() {
  error.value = null
  if (previewing.value) stopPreview()
  const result = await player.record(start.value, end.value - start.value)
  try {
    const file = clipToFile(result, state.value?.title || 'youtube')
    player.close()
    emit('file', file)
  } catch (cause) {
    error.value = cause instanceof LinkError ? cause.code : 'capture'
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-2.5">
    <form class="flex gap-1.5" @submit.prevent="open">
      <Input
        v-model="link"
        dir="ltr"
        inputmode="url"
        class="h-10 min-w-0 flex-1 bg-background"
        placeholder="https://…"
        :disabled="busy"
        :aria-label="text.linkPlaceholder"
      />
      <Button type="submit" class="h-10" :variant="state ? 'outline' : 'default'" :disabled="!parsed || busy">
        <Spinner v-if="downloading" />
        {{ parsed?.site === 'tiktok' ? text.getClip : text.openVideo }}
      </Button>
    </form>

    <div v-if="state && status === 'watching'" class="flex flex-col gap-2.5 rounded-xl border p-3" data-testid="part-picker">
      <p v-if="!ready" class="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner class="size-3.5" />
        {{ t.reading }}
      </p>
      <template v-else>
        <PartPicker
          v-model:length="length"
          :start="start"
          :duration="state.duration"
          :time="state.time"
          :playing="previewing"
          @seek="seek"
          @play="togglePreview"
        />
        <Button class="h-11 w-full text-base" data-testid="use-part" @click="usePart">{{ text.usePart }}</Button>
      </template>
    </div>

    <p v-if="error" class="text-xs text-destructive" role="alert">{{ error === 'bad-link' ? text.badLink : errorText(error) }}</p>
  </div>
</template>
