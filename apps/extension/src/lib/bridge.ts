/** Messages between the panel (isolated world) and the WhatsApp script (page world), over window.postMessage. */

export const BRIDGE_TAG = 'sound-sticker-maker'

export type Destination = 'open-chat' | 'open-chat-forward' | 'own-chat-forward'

export type SendErrorCode = 'not-ready' | 'no-open-chat' | 'no-own-chat' | 'upload-failed' | 'send-failed' | 'whatsapp-changed'

export type SendStep = 'finding-chat' | 'uploading-sound' | 'sending' | 'waiting' | 'opening-forward'

export interface PageStatus {
  ready: boolean
  /** Missing internal WhatsApp modules: non-empty means WhatsApp changed and sending may fail. */
  missing: string[]
}

export type ToPage =
  | { kind: 'status'; id: string }
  | { kind: 'send'; id: string; webp: ArrayBuffer; audio: ArrayBuffer; seconds: number; side: number; destination: Destination }

export type FromPage =
  | { kind: 'status'; id: string; status: PageStatus }
  | { kind: 'progress'; id: string; step: SendStep }
  | { kind: 'sent'; id: string; forwarding: boolean }
  | { kind: 'failed'; id: string; code: SendErrorCode; detail?: string }

type Envelope<T> = T & { tag: typeof BRIDGE_TAG; to: 'page' | 'content' }

export function post<T extends ToPage | FromPage>(to: 'page' | 'content', message: T, transfer: Transferable[] = []): void {
  window.postMessage({ ...message, tag: BRIDGE_TAG, to } satisfies Envelope<T>, location.origin, transfer)
}

export function listen<T extends ToPage | FromPage>(as: 'page' | 'content', handler: (message: T) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.source !== window || event.origin !== location.origin) return
    const data = event.data as Envelope<T> | null
    if (!data || typeof data !== 'object' || data.tag !== BRIDGE_TAG || data.to !== as) return
    handler(data)
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}
