import { createSoundSticker, type SoundSticker, type Stage, type StickerRequest } from '@sound-sticker-maker/core'
import { computed, onScopeDispose, shallowRef } from 'vue'
import { errorCode } from '@/lib/media'

export type CreateInput = Omit<StickerRequest, 'signal' | 'onProgress'>

export interface Created extends SoundSticker {
  webpUrl: string
  audioUrl: string
  /** Identifies the input it was made from, to tell when the input has changed since. */
  key: string
}

export function inputKey(input: CreateInput | null): string {
  if (!input) return ''
  const { visual, audio } = input
  const parts = [
    visual.kind,
    (visual.file as File).name,
    visual.file.size,
    visual.kind === 'video' ? `${visual.start}-${visual.duration}` : '',
    (audio.file as File).name,
    audio.file.size,
    audio.start,
    audio.duration,
    input.shape,
    input.fit,
    input.packName,
    input.publisher,
  ]
  return parts.join('|')
}

export function useCreate(input: () => CreateInput | null) {
  const stage = shallowRef<Stage | null>(null)
  const fraction = shallowRef(0)
  const result = shallowRef<Created | null>(null)
  const error = shallowRef<string | null>(null)
  let controller: AbortController | null = null

  const running = computed(() => stage.value !== null)
  const stale = computed(() => !!result.value && result.value.key !== inputKey(input()))

  function release(created: Created | null) {
    if (!created) return
    URL.revokeObjectURL(created.webpUrl)
    URL.revokeObjectURL(created.audioUrl)
  }

  async function create() {
    const request = input()
    if (!request || running.value) return
    controller = new AbortController()
    error.value = null
    stage.value = 'sound'
    fraction.value = 0
    try {
      const sticker = await createSoundSticker({
        ...request,
        signal: controller.signal,
        onProgress: (next, value) => {
          stage.value = next
          fraction.value = value
        },
      })
      release(result.value)
      result.value = {
        ...sticker,
        webpUrl: URL.createObjectURL(sticker.webp),
        audioUrl: URL.createObjectURL(sticker.audio),
        key: inputKey(request),
      }
    } catch (cause) {
      error.value = errorCode(cause)
    } finally {
      stage.value = null
      controller = null
    }
  }

  function cancel() {
    controller?.abort()
  }

  onScopeDispose(() => {
    cancel()
    release(result.value)
  })

  return { stage, fraction, result, error, running, stale, create, cancel }
}
