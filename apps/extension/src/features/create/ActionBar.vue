<script setup lang="ts">
import type { StickerRequest } from '@sound-sticker-maker/core'
import { CheckIcon, DownloadIcon, SendIcon, Volume2Icon } from '@lucide/vue'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Destination, SendStep } from '@/lib/bridge'
import { storageGet, storageSet } from '@/lib/extension'
import { useI18n } from '@/lib/i18n'
import { useCreate, type CreateInput } from './useCreate'
import { useSend } from './useSend'

const { input } = defineProps<{ input: Omit<StickerRequest, 'signal' | 'onProgress'> | null }>()
const { t, errorText } = useI18n()

const create = useCreate(() => input as CreateInput | null)
const sending = useSend()
const destination = shallowRef<Destination>('open-chat')
const player = useTemplateRef<HTMLAudioElement>('player')

onMounted(async () => {
  sending.checkStatus()
  const saved = await storageGet<Destination>('destination')
  if (saved === 'open-chat' || saved === 'own-chat-forward') destination.value = saved
})
watch(destination, (to) => storageSet({ destination: to }))
watch(() => create.result.value, sending.reset)

const result = computed(() => (create.stale.value ? null : create.result.value))
const percent = computed(() => `${Math.round(create.fraction.value * 100)}%`)
const stageText = computed(() => {
  const labels = { sound: t.value.stageSound, reading: t.value.stageReading, sizing: t.value.stageSizing, encoding: t.value.stageEncoding }
  return create.stage.value ? labels[create.stage.value] : ''
})
const stepText = computed(() => {
  const labels: Record<SendStep, string> = {
    'finding-chat': t.value.stepFindingChat,
    'uploading-sound': t.value.stepUploadingSound,
    sending: t.value.stepSending,
    waiting: t.value.stepWaiting,
    'opening-forward': t.value.stepOpeningForward,
  }
  return sending.step.value ? labels[sending.step.value] : ''
})
const details = computed(() => {
  const r = create.result.value
  return r ? t.value.details(r.side, r.fps, Math.round(r.webp.size / 1000)) : ''
})

function hear() {
  const audio = player.value
  if (!audio) return
  audio.currentTime = 0
  audio.play().catch(() => undefined)
}

function download() {
  const r = create.result.value
  if (!r) return
  for (const [url, name] of [
    [r.webpUrl, 'sound-sticker.webp'],
    [r.audioUrl, 'sound-sticker.ogg'],
  ] as const) {
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
  }
}

function send() {
  if (result.value) sending.send(result.value, destination.value)
}
</script>

<template>
  <div class="flex flex-col gap-2.5" data-testid="action-bar">
    <template v-if="result">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="group relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
          :title="t.hear"
          :aria-label="t.hear"
          @click="hear"
        >
          <img :src="result.webpUrl" alt="" class="size-full object-contain" data-testid="result" />
          <span class="absolute end-1 bottom-1 grid size-5 place-items-center rounded-full bg-background/90 text-foreground shadow-sm">
            <Volume2Icon class="size-3" />
          </span>
        </button>
        <audio ref="player" :src="result.audioUrl" preload="auto" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            class="w-full"
            :model-value="destination"
            :aria-label="t.destination"
            @update:model-value="(value) => value && (destination = value as Destination)"
          >
            <ToggleGroupItem value="open-chat" class="flex-1">{{ t.toThisChat }}</ToggleGroupItem>
            <ToggleGroupItem value="own-chat-forward" class="flex-1">{{ t.toManyChats }}</ToggleGroupItem>
          </ToggleGroup>
          <span dir="ltr" class="truncate text-start text-[11px] text-muted-foreground tabular-nums">{{ details }}</span>
        </div>
        <Button variant="ghost" size="icon" :title="t.download" :aria-label="t.download" @click="download"><DownloadIcon /></Button>
      </div>
      <Button size="lg" class="w-full" :disabled="!!sending.step.value" @click="send">
        <Spinner v-if="sending.step.value" />
        <CheckIcon v-else-if="sending.sent.value" />
        <SendIcon v-else class="rtl:-scale-x-100" />
        {{ sending.step.value ? stepText : sending.sent.value ? (sending.sent.value.forwarding ? t.sentForward : t.sent) : t.send }}
      </Button>
      <p v-if="sending.error.value" class="text-xs text-destructive" role="alert">{{ errorText(sending.error.value) }}</p>
      <p v-else-if="sending.status.value?.missing.length" class="text-xs text-destructive">{{ t.whatsappChanged }}</p>
    </template>

    <template v-else>
      <div v-if="create.running.value" class="relative h-10 overflow-hidden rounded-lg bg-muted">
        <div class="absolute inset-y-0 start-0 bg-primary/20 transition-[width] duration-200" :style="{ width: percent }" />
        <div class="relative flex h-full items-center justify-between px-3 text-sm">
          <span role="status">{{ stageText }}</span>
          <button type="button" class="text-xs text-muted-foreground hover:text-foreground" @click="create.cancel">{{ t.cancel }}</button>
        </div>
      </div>
      <Button v-else size="lg" class="w-full" :disabled="!input" @click="create.create">
        {{ t.create }}
      </Button>
      <p v-if="create.error.value" class="text-xs text-destructive" role="alert">{{ errorText(create.error.value) }}</p>
    </template>
  </div>
</template>
