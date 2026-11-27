<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import DropZone from '@/components/DropZone.vue'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useI18n } from '@/lib/i18n'
import { errorCode, readSound, type Picture, type Sound } from '@/lib/media'

type Mode = 'own' | 'other'

const { picture } = defineProps<{ picture: Picture | null }>()
const sound = defineModel<Sound | null>({ required: true })
const { t, errorText } = useI18n()

const mode = shallowRef<Mode>('own')
const ownMissing = shallowRef(false)
const otherSound = shallowRef<Sound | null>(null)
const busy = shallowRef(false)
const error = shallowRef<string | null>(null)

const canUseOwn = computed(() => picture?.kind === 'video' && !ownMissing.value)

async function read(file: File, own: boolean): Promise<Sound | null> {
  busy.value = true
  error.value = null
  try {
    return await readSound(file, own)
  } catch (cause) {
    if (!own) error.value = errorCode(cause)
    return null
  } finally {
    busy.value = false
  }
}

watch(
  () => picture?.file,
  async (file, _previous, onCleanup) => {
    let stale = false
    onCleanup(() => (stale = true))
    ownMissing.value = false
    if (!file || picture?.kind !== 'video') {
      mode.value = 'other'
      sound.value = otherSound.value
      return
    }
    const own = await read(file, true)
    if (stale) return
    ownMissing.value = !own
    mode.value = own ? 'own' : 'other'
    sound.value = own ?? otherSound.value
  },
  { immediate: true },
)

async function chooseOther(file: File) {
  const next = await read(file, false)
  if (!next) return
  otherSound.value = next
  if (mode.value === 'other') sound.value = next
}

async function setMode(next: Mode) {
  if (next === mode.value) return
  mode.value = next
  if (next === 'other') sound.value = otherSound.value
  else if (picture) sound.value = await read(picture.file, true)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <ToggleGroup
      v-if="picture?.kind === 'video'"
      type="single"
      variant="outline"
      class="w-full"
      :model-value="mode"
      @update:model-value="(value) => value && setMode(value as Mode)"
    >
      <ToggleGroupItem value="own" class="flex-1" :disabled="!canUseOwn">{{ t.ownSound }}</ToggleGroupItem>
      <ToggleGroupItem value="other" class="flex-1">{{ t.otherSound }}</ToggleGroupItem>
    </ToggleGroup>
    <p v-if="ownMissing" class="text-xs text-muted-foreground">{{ t.noOwnSound }}</p>
    <DropZone
      v-if="mode === 'other'"
      :label="t.pickSound"
      :hint="busy ? t.reading : t.pickSoundHint"
      accept="audio/*,video/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac,.mp4,.mov,.webm"
      :busy="busy"
      :chosen="otherSound?.file.name ?? null"
      :change-label="t.change"
      @pick="chooseOther"
    />
    <p v-if="error" class="text-xs text-destructive" role="alert">{{ errorText(error) }}</p>
  </div>
</template>
