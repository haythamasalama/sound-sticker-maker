import { listen, post, type FromPage, type ToPage } from '../lib/bridge'
import { WhatsAppError, loaderReady, missingModules, sendSoundSticker } from './whatsapp'

let busy = false

listen<ToPage>('page', async (message) => {
  if (message.kind === 'status') {
    // Before sign-in WhatsApp hasn't loaded its chat list; only a missing module after that means WhatsApp renamed something.
    const found = missingModules()
    const signedIn = !found.includes('loader') && !found.includes('WAWebChatCollection')
    const missing = signedIn ? found : []
    post<FromPage>('content', { kind: 'status', id: message.id, status: { ready: loaderReady() && missing.length === 0, missing } })
    return
  }
  if (message.kind !== 'send') return
  if (busy || !loaderReady()) {
    post<FromPage>('content', { kind: 'failed', id: message.id, code: 'not-ready' })
    return
  }
  busy = true
  const forward = message.destination !== 'open-chat'
  try {
    await sendSoundSticker({
      webp: new Blob([message.webp], { type: 'image/webp' }),
      audio: new Blob([message.audio], { type: 'audio/ogg; codecs=opus' }),
      seconds: message.seconds,
      side: message.side,
      toOwnChat: message.destination === 'own-chat-forward',
      forward,
      onStep: (step) => post<FromPage>('content', { kind: 'progress', id: message.id, step }),
    })
    post<FromPage>('content', { kind: 'sent', id: message.id, forwarding: forward })
  } catch (error) {
    const code = error instanceof WhatsAppError ? error.code : 'send-failed'
    post<FromPage>('content', { kind: 'failed', id: message.id, code, detail: String((error as Error)?.message ?? error) })
  } finally {
    busy = false
  }
})
