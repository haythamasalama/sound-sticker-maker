<script setup lang="ts">
import { MusicIcon, Volume2Icon } from '@lucide/vue'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import FilePicker from '@/components/FilePicker.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useI18n } from '@/lib/i18n'
import { errorCode, readSound, type Picture, type Sound } from '@/lib/media'

type Mode = 'own' | 'other'

const ACCEPT = 'audio/*,video/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac,.mp4,.mov,.webm'

const { picture } = defineProps<{ picture: Picture }>()
const sound = defineModel<Sound | null>({ required: true })
const { t, errorText } = useI18n()

const picker = useTemplateRef<InstanceType<typeof FilePicker>>('picker')
const mode = shallowRef<Mode>('own')
const ownMissing = shallowRef(false)
const otherSound = shallowRef<Sound | null>(null)
const busy = shallowRef(false)
const error = shallowRef<string | null>(null)

const canUseOwn = computed(() => picture.kind === 'video' && !ownMissing.value)
const label = computed(() => {
  if (mode.value === 'own') return t.value.ownSound
  return otherSound.value?.file.name ?? t.value.otherSoundHint
})

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
  () => picture.file,
  async (file, _previous, onCleanup) => {
    let stale = false
    onCleanup(() => (stale = true))
    ownMissing.value = false
    if (picture.kind !== 'video') {
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
  mode.value = 'other'
  sound.value = next
}

async function setMode(next: Mode) {
  if (next === mode.value) return
  if (next === 'other' && !otherSound.value) return picker.value?.open()
  mode.value = next
  sound.value = next === 'other' ? otherSound.value : await read(picture.file, true)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <FilePicker ref="picker" :accept="ACCEPT" @pick="chooseOther" />
    <div class="flex items-center gap-2.5">
      <span class="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <Spinner v-if="busy" />
        <Volume2Icon v-else-if="mode === 'own'" class="size-4" />
        <MusicIcon v-else class="size-4" />
      </span>
      <span class="min-w-0 flex-1 truncate text-sm" :class="{ 'text-muted-foreground': mode === 'other' && !otherSound }">{{ label }}</span>
      <ToggleGroup
        v-if="picture.kind === 'video'"
        type="single"
        variant="outline"
        size="sm"
        :model-value="mode"
        @update:model-value="(value) => value && setMode(value as Mode)"
      >
        <ToggleGroupItem value="own" :disabled="!canUseOwn">{{ t.soundFromVideo }}</ToggleGroupItem>
        <ToggleGroupItem value="other">{{ t.soundFromFile }}</ToggleGroupItem>
      </ToggleGroup>
      <Button v-else variant="outline" size="sm" :disabled="busy" @click="picker?.open()">
        {{ otherSound ? t.change : t.chooseSound }}
      </Button>
      <Button v-if="mode === 'other' && otherSound && picture.kind === 'video'" variant="ghost" size="sm" @click="picker?.open()">
        {{ t.change }}
      </Button>
    </div>
    <p v-if="ownMissing" class="ps-11 text-xs text-muted-foreground">{{ t.noOwnSound }}</p>
    <p v-if="error" class="ps-11 text-xs text-destructive" role="alert">{{ errorText(error) }}</p>
  </div>
</template>
