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

const { disabled = false } = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ file: [file: File] }>()

const { t, errorText } = useI18n()
const { working, error, importLink } = useLinkImport()
const text = useLinkText()

const link = shallowRef('')
const from = shallowRef('0:00')
const length = shallowRef(RECOMMENDED_SECONDS)

const parsed = computed(() => parseVideoLink(link.value))
const isYouTube = computed(() => parsed.value?.site === 'youtube')
const status = computed(() =>
  working.value === 'youtube' ? text.value.recordingYoutube : working.value ? text.value.downloadingTiktok : '',
)

function onLinkInput() {
  if (parsed.value?.site === 'youtube' && parsed.value.start) from.value = formatClock(parsed.value.start)
}

async function submit() {
  if (working.value || disabled) return
  const file = await importLink(link.value, parseClock(from.value), Math.min(30, Math.max(1, Number(length.value) || RECOMMENDED_SECONDS)))
  if (file) emit('file', file)
}
</script>

<template>
  <form class="flex flex-col gap-2" @submit.prevent="submit">
    <span class="text-xs font-medium text-muted-foreground">{{ text.orLink }}</span>
    <div class="relative">
      <LinkIcon class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
      <Input
        v-model="link"
        dir="ltr"
        inputmode="url"
        class="ps-9"
        :placeholder="text.linkPlaceholder"
        :disabled="!!working"
        @input="onLinkInput"
      />
    </div>
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <template v-if="isYouTube">
        <label class="flex items-center gap-1.5">
          {{ t.from }}
          <Input v-model="from" dir="ltr" class="h-8 w-16 text-center" :disabled="!!working" />
        </label>
        <label class="flex items-center gap-1.5">
          {{ t.length }}
          <Input v-model.number="length" type="number" min="1" max="30" dir="ltr" class="h-8 w-14 text-center" :disabled="!!working" />
          {{ t.seconds }}
        </label>
      </template>
      <Button type="submit" variant="outline" size="sm" class="ms-auto" :disabled="!parsed || !!working || disabled">
        <Spinner v-if="working" class="size-3.5" />
        {{ text.getClip }}
      </Button>
    </div>
    <p v-if="status" class="text-xs text-muted-foreground" role="status">{{ status }}</p>
    <p v-else-if="error" class="text-xs text-destructive" role="alert">{{ error === 'bad-link' ? text.badLink : errorText(error) }}</p>
  </form>
</template>
