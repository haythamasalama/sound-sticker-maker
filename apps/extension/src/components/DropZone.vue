<script setup lang="ts">
import { UploadIcon } from '@lucide/vue'
import { shallowRef, useTemplateRef } from 'vue'
import { Spinner } from '@/components/ui/spinner'

const {
  label,
  hint,
  accept,
  busy = false,
  chosen = null,
  changeLabel,
} = defineProps<{
  label: string
  hint: string
  accept: string
  busy?: boolean
  /** Name of the file already chosen, shown instead of the prompt. */
  chosen?: string | null
  changeLabel: string
}>()

const emit = defineEmits<{ pick: [file: File] }>()

const input = useTemplateRef<HTMLInputElement>('input')
const over = shallowRef(false)

function pick(file: File | undefined | null) {
  if (file && !busy) emit('pick', file)
}

function onChange() {
  const file = input.value?.files?.[0]
  if (input.value) input.value.value = ''
  pick(file)
}

function onDrop(event: DragEvent) {
  over.value = false
  pick(event.dataTransfer?.files?.[0])
}
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-xl border-[1.5px] border-dashed bg-card px-4 py-4 text-start transition-colors hover:border-brand focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
    :class="over ? 'border-brand bg-brand-soft' : chosen ? 'border-solid' : ''"
    :disabled="busy"
    @click="input?.click()"
    @dragover.prevent="over = true"
    @dragleave="over = false"
    @drop.prevent="onDrop"
  >
    <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
      <Spinner v-if="busy" class="size-5" />
      <UploadIcon v-else class="size-5" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="truncate text-sm font-semibold">{{ chosen ?? label }}</span>
      <span class="truncate text-xs text-muted-foreground">{{ hint }}</span>
    </span>
    <span v-if="chosen && !busy" class="text-xs font-medium text-brand-ink">{{ changeLabel }}</span>
  </button>
  <input ref="input" type="file" class="hidden" :accept="accept" @change="onChange" />
</template>
