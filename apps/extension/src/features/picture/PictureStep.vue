<script setup lang="ts">
import { shallowRef } from 'vue'
import DropZone from '@/components/DropZone.vue'
import { useI18n } from '@/lib/i18n'
import { errorCode, readPicture, type Picture } from '@/lib/media'
import LinkImport from './LinkImport.vue'

const picture = defineModel<Picture | null>({ required: true })
const { t, errorText } = useI18n()

const busy = shallowRef(false)
const error = shallowRef<string | null>(null)
const links = __LINKS__

async function choose(file: File) {
  busy.value = true
  error.value = null
  try {
    const next = await readPicture(file)
    if (picture.value) URL.revokeObjectURL(picture.value.url)
    picture.value = next
  } catch (cause) {
    error.value = errorCode(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <DropZone
      :label="t.pickPicture"
      :hint="busy ? t.reading : t.pickPictureHint"
      accept="video/*,image/*,.gif,.webp,.mov,.mkv"
      :busy="busy"
      :chosen="picture?.file.name ?? null"
      :change-label="t.change"
      @pick="choose"
    />
    <p v-if="error" class="text-xs text-destructive" role="alert">{{ errorText(error) }}</p>
    <LinkImport v-if="links" :disabled="busy" @file="choose" />
  </div>
</template>
