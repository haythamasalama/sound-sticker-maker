<script setup lang="ts">
import { formatClock, parseClock, parseVideoLink, RECOMMENDED_SECONDS } from '@sound-sticker-maker/core'
import { LinkIcon } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { useLinkText } from './linkText'
import { useLinkImport } from './useLinkImport'

const { host, title = false } = defineProps<{ host: HTMLElement | null; title?: boolean }>()
const emit = defineEmits<{ file: [file: File]; working: [state: { player: boolean } | null] }>()

const { t, errorText } = useI18n()
const { working, error, importLink } = useLinkImport()
const text = useLinkText()

const link = shallowRef('')
const from = shallowRef('0:00')
const length = shallowRef(RECOMMENDED_SECONDS)

const parsed = computed(() => parseVideoLink(link.value))
const isYouTube = computed(() => parsed.value?.site === 'youtube')

function onLinkInput() {
  if (parsed.value?.site === 'youtube' && parsed.value.start) from.value = formatClock(parsed.value.start)
}

async function submit() {
  if (working.value || !host || !parsed.value) return
  const seconds = Math.min(30, Math.max(1, Number(length.value) || RECOMMENDED_SECONDS))
  emit('working', { player: parsed.value.site === 'youtube' })
  const file = await importLink(link.value, parseClock(from.value), seconds, host)
  emit('working', null)
  if (file) emit('file', file)
}
</script>

<template>
  <form class="flex w-full flex-col gap-2.5" @submit.prevent="submit">
    <p v-if="title" class="flex items-center justify-center gap-2 text-sm font-medium text-balance">
      <LinkIcon class="size-4 shrink-0 text-muted-foreground" />
      {{ text.linkTitle }}
    </p>
    <Input
      v-model="link"
      dir="ltr"
      inputmode="url"
      class="h-10 bg-background"
      placeholder="https://…"
      :disabled="!!working"
      :aria-label="text.linkPlaceholder"
      @input="onLinkInput"
    />
    <div v-if="isYouTube" class="flex items-center justify-center gap-4 text-xs text-muted-foreground">
      <label class="flex items-center gap-1.5">
        {{ t.from }}
        <Input v-model="from" dir="ltr" class="h-8 w-16 bg-background text-center text-xs" :disabled="!!working" />
      </label>
      <label class="flex items-center gap-1.5">
        {{ t.length }}
        <Input
          v-model.number="length"
          type="number"
          min="1"
          max="30"
          dir="ltr"
          class="h-8 w-14 bg-background text-center text-xs"
          :disabled="!!working"
        />
        {{ t.seconds }}
      </label>
    </div>
    <Button type="submit" class="h-10 w-full" :disabled="!parsed || !!working">
      <Spinner v-if="working" />
      {{ text.getClip }}
    </Button>
    <p v-if="error" class="text-center text-xs text-destructive" role="alert">
      {{ error === 'bad-link' ? text.badLink : errorText(error) }}
    </p>
  </form>
</template>
