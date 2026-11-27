<script setup lang="ts">
import type { AudioSource, Shape, VisualSource } from '@sound-sticker-maker/core'
import { CheckIcon, DownloadIcon, SendIcon, SparklesIcon } from '@lucide/vue'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Destination, SendStep } from '@/lib/bridge'
import { storageGet, storageSet } from '@/lib/extension'
import { useI18n } from '@/lib/i18n'
import { useCreate } from './useCreate'
import { useSend } from './useSend'

const { source } = defineProps<{ source: { visual: VisualSource; audio: AudioSource } | null }>()
const { t, errorText } = useI18n()

const shape = shallowRef<Shape>('contain')
const packName = shallowRef('')
const publisher = shallowRef('')
const destination = shallowRef<Destination>('open-chat')

onMounted(async () => {
  packName.value = (await storageGet<string>('packName')) ?? ''
  publisher.value = (await storageGet<string>('publisher')) ?? ''
  destination.value = (await storageGet<Destination>('destination')) ?? 'open-chat'
})
watch([packName, publisher, destination], ([pack, author, to]) => storageSet({ packName: pack, publisher: author, destination: to }))

const input = computed(() =>
  source ? { ...source, shape: shape.value, fit: 'loop' as const, packName: packName.value, publisher: publisher.value } : null,
)
const create = useCreate(() => input.value)
const sending = useSend()
onMounted(sending.checkStatus)

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
const destinations = computed(() => [
  { value: 'open-chat', label: t.value.destinationOpen },
  { value: 'open-chat-forward', label: t.value.destinationOpenForward },
  { value: 'own-chat-forward', label: t.value.destinationOwn },
])

const player = useTemplateRef<HTMLAudioElement>('player')
function listen() {
  const audio = player.value
  if (!audio) return
  audio.currentTime = 0
  audio.play().catch(() => undefined)
}

watch(() => create.result.value, sending.reset)

function download() {
  const r = create.result.value
  if (!r) return
  for (const [url, name] of [
    [r.webpUrl, 'sound-sticker.webp'],
    [r.audioUrl, 'sound-sticker.ogg'],
  ]) {
    const link = document.createElement('a')
    link.href = url!
    link.download = name!
    link.click()
  }
}

function send() {
  const r = create.result.value
  if (r && !create.stale.value) sending.send(r, destination.value)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-medium text-muted-foreground">{{ t.shape }}</span>
      <ToggleGroup type="single" variant="outline" size="sm" :model-value="shape" @update:model-value="(v) => v && (shape = v as Shape)">
        <ToggleGroupItem value="contain">{{ t.shapeContain }}</ToggleGroupItem>
        <ToggleGroupItem value="cover">{{ t.shapeCover }}</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div class="flex flex-col gap-1.5">
        <Label for="ssm-pack" class="text-xs text-muted-foreground">{{ t.pack }}</Label>
        <Input id="ssm-pack" v-model="packName" maxlength="128" :placeholder="t.packPlaceholder" />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="ssm-author" class="text-xs text-muted-foreground">{{ t.author }}</Label>
        <Input id="ssm-author" v-model="publisher" maxlength="128" :placeholder="t.authorPlaceholder" />
      </div>
    </div>

    <div v-if="create.running.value" class="flex flex-col gap-2">
      <div class="h-1.5 overflow-hidden rounded-full bg-muted">
        <div class="h-full rounded-full bg-brand transition-[width]" :style="{ width: `${Math.round(create.fraction.value * 100)}%` }" />
      </div>
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span role="status">{{ stageText }}</span>
        <Button variant="ghost" size="sm" @click="create.cancel">{{ t.cancel }}</Button>
      </div>
    </div>
    <Button
      v-else
      size="lg"
      class="h-11 w-full rounded-full bg-brand text-white hover:bg-brand/90"
      :disabled="!input"
      @click="create.create"
    >
      <SparklesIcon />
      {{ create.result.value ? t.createAgain : t.create }}
    </Button>
    <p v-if="create.error.value" class="text-xs text-destructive" role="alert">{{ errorText(create.error.value) }}</p>

    <section v-if="create.result.value" class="flex flex-col gap-3 rounded-xl bg-card p-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="grid size-24 shrink-0 place-items-center rounded-lg bg-[repeating-conic-gradient(var(--muted)_0_25%,var(--background)_0_50%)] bg-[length:12px_12px]"
          :title="t.previewHint"
          @click="listen"
        >
          <img :src="create.result.value.webpUrl" alt="" class="size-full object-contain" />
        </button>
        <audio ref="player" :src="create.result.value.audioUrl" preload="auto" />
        <div class="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          <span class="font-medium text-foreground">{{ t.previewHint }}</span>
          <span dir="ltr" class="text-start">{{ details }}</span>
          <span v-if="create.stale.value" class="text-destructive">{{ t.stale }}</span>
        </div>
      </div>

      <label class="flex flex-col gap-1.5 text-xs text-muted-foreground">
        {{ t.destination }}
        <select v-model="destination" class="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground">
          <option v-for="option in destinations" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <div class="flex gap-2">
        <Button class="h-10 flex-1 rounded-full" :disabled="!!sending.step.value || create.stale.value" @click="send">
          <Spinner v-if="sending.step.value" />
          <CheckIcon v-else-if="sending.sent.value" />
          <SendIcon v-else />
          {{ sending.step.value ? stepText : t.send }}
        </Button>
        <Button variant="outline" class="h-10 rounded-full" :title="t.download" @click="download">
          <DownloadIcon />
        </Button>
      </div>
      <p v-if="sending.sent.value" class="text-xs text-success" role="status">
        {{ sending.sent.value.forwarding ? t.sentForward : t.sent }}
      </p>
      <p v-if="sending.error.value" class="text-xs text-destructive" role="alert">{{ errorText(sending.error.value) }}</p>
      <p v-if="sending.status.value && sending.status.value.missing.length" class="text-xs text-destructive">{{ t.whatsappChanged }}</p>
    </section>
  </div>
</template>
