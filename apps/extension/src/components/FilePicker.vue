<script setup lang="ts">
import { useTemplateRef } from 'vue'

const { accept } = defineProps<{ accept: string }>()
const emit = defineEmits<{ pick: [file: File] }>()

const input = useTemplateRef<HTMLInputElement>('input')

function onChange() {
  const file = input.value?.files?.[0]
  if (input.value) input.value.value = ''
  if (file) emit('pick', file)
}

defineExpose({ open: () => input.value?.click() })
</script>

<template>
  <input ref="input" type="file" class="hidden" :accept="accept" @change="onChange" />
</template>
