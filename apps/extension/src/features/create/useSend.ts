import type { SoundSticker } from '@sound-sticker-maker/core'
import { onScopeDispose, shallowRef } from 'vue'
import { listen, post, type Destination, type FromPage, type PageStatus, type SendStep, type ToPage } from '@/lib/bridge'

export function useSend() {
  const status = shallowRef<PageStatus | null>(null)
  const step = shallowRef<SendStep | null>(null)
  const error = shallowRef<string | null>(null)
  /** WhatsApp's own words for a failure, shown small so people can report it. */
  const detail = shallowRef<string | null>(null)
  const sent = shallowRef<{ forwarding: boolean } | null>(null)
  const pending = new Map<string, (message: FromPage) => void>()

  const stopListening = listen<FromPage>('content', (message) => pending.get(message.id)?.(message))
  onScopeDispose(stopListening)

  function checkStatus() {
    const id = crypto.randomUUID()
    pending.set(id, (message) => {
      if (message.kind !== 'status') return
      status.value = message.status
      pending.delete(id)
    })
    post<ToPage>('page', { kind: 'status', id })
  }

  async function send(sticker: SoundSticker, destination: Destination) {
    if (step.value) return
    error.value = null
    detail.value = null
    sent.value = null
    step.value = 'finding-chat'
    const id = crypto.randomUUID()
    const [webp, audio] = await Promise.all([sticker.webp.arrayBuffer(), sticker.audio.arrayBuffer()])
    await new Promise<void>((resolve) => {
      pending.set(id, (message) => {
        if (message.kind === 'progress') step.value = message.step
        if (message.kind !== 'sent' && message.kind !== 'failed') return
        if (message.kind === 'sent') sent.value = { forwarding: message.forwarding }
        else {
          error.value = message.code
          detail.value = message.detail ?? null
        }
        pending.delete(id)
        resolve()
      })
      post<ToPage>('page', { kind: 'send', id, webp, audio, seconds: sticker.seconds, side: sticker.side, destination }, [webp, audio])
    })
    step.value = null
  }

  function reset() {
    sent.value = null
    error.value = null
    detail.value = null
  }

  return { status, step, error, detail, sent, checkStatus, send, reset }
}
