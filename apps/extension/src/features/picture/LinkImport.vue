<script setup lang="ts">
import { formatClock, parseClock, parseVideoLink, RECOMMENDED_SECONDS } from '@sound-sticker-maker/core'
import { ArrowRightIcon } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '@/lib/i18n'
import { useLinkText } from './linkText'
import { useLinkImport } from './useLinkImport'

const { host } = defineProps<{ host: HTMLElement | null }>()
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
  <form class="flex flex-col gap-2" @submit.prevent="submit">
    <div class="flex gap-1.5">
      <Input
        v-model="link"
        dir="ltr"
        inputmode="url"
        class="h-9 flex-1"
        :placeholder="text.linkPlaceholder"
        :disabled="!!working"
        :aria-label="text.linkPlaceholder"
        @input="onLinkInput"
      />
      <Button type="submit" size="icon" class="size-9" :disabled="!parsed || !!working" :aria-label="text.getClip">
        <Spinner v-if="working" />
        <ArrowRightIcon v-else class="rtl:-scale-x-100" />
      </Button>
    </div>
    <div v-if="isYouTube" class="flex items-center gap-3 text-xs text-muted-foreground">
      <label class="flex items-center gap-1.5">
        {{ t.from }}
        <Input v-model="from" dir="ltr" class="h-7 w-16 text-center text-xs" :disabled="!!working" />
      </label>
      <label class="flex items-center gap-1.5">
        {{ t.length }}
        <Input
          v-model.number="length"
          type="number"
          min="1"
          max="30"
          dir="ltr"
          class="h-7 w-14 text-center text-xs"
          :disabled="!!working"
        />
        {{ t.seconds }}
      </label>
    </div>
    <p v-if="error" class="text-xs text-destructive" role="alert">{{ error === 'bad-link' ? text.badLink : errorText(error) }}</p>
  </form>
</template>
