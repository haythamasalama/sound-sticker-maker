import { onScopeDispose, shallowRef } from 'vue'
import type { ClipResult, PlayerAction, PlayerState, RuntimeMessage } from '@/lib/messages'

/**
 * A YouTube player inside the panel that the user watches with its own controls. Its frame script reports the
 * player's state and takes commands by window messages through the player page; recording happens only when the
 * user has picked the part.
 * `credentialless` lets the frame load under WhatsApp's cross-origin isolation. The player must stay on screen:
 * Chrome stops drawing videos it can't see, which would record sound over a black picture.
 */
const playerOrigin = chrome.runtime.getURL('').slice(0, -1)

export function useYouTubePlayer() {
  const state = shallowRef<PlayerState | null>(null)
  const recording = shallowRef(false)
  let requestId: string | null = null
  let frame: HTMLIFrameElement | null = null
  let finish: ((result: ClipResult) => void) | null = null
  let silence: ReturnType<typeof setTimeout> | undefined

  const onMessage = (event: MessageEvent) => {
    const message = event.data as RuntimeMessage | undefined
    if (
      !frame ||
      event.source !== frame.contentWindow ||
      typeof message !== 'object' ||
      !message ||
      !('requestId' in message) ||
      message.requestId !== requestId
    )
      return
    if (message.type === 'yt-state') {
      clearTimeout(silence)
      const { type: _type, requestId: _id, ...next } = message
      state.value = next
    } else if (message.type === 'clip') {
      finish?.(message)
    }
  }
  window.addEventListener('message', onMessage)

  function close() {
    clearTimeout(silence)
    frame?.remove()
    frame = null
    requestId = null
    state.value = null
    recording.value = false
  }

  function open(id: string, start: number, host: HTMLElement, language = 'en') {
    close()
    requestId = crypto.randomUUID()
    frame = document.createElement('iframe')
    frame.setAttribute('credentialless', '')
    frame.allow = 'autoplay; encrypted-media; fullscreen'
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0'
    frame.src = chrome.runtime.getURL(`player.html#${requestId}:${id}:${start}:${language}`)
    host.append(frame)
    // Shown at once, so the player appears as soon as the user asks; the frame then reports the real state.
    state.value = { ready: false, duration: 0, time: start, paused: true, title: '' }
    silence = setTimeout(() => {
      if (state.value && !state.value.ready) state.value = { ...state.value, error: 'timeout' }
    }, 20_000)
  }

  function command(action: PlayerAction) {
    if (requestId) frame?.contentWindow?.postMessage({ type: 'yt-command', requestId, ...action } satisfies RuntimeMessage, playerOrigin)
  }

  async function record(start: number, length: number): Promise<ClipResult> {
    recording.value = true
    // Move the player to the part first, the way every other seek goes, so the recording starts there.
    command({ action: 'seek', time: start })
    for (let waited = 0; waited < 3000 && Math.abs((state.value?.time ?? start) - start) > 0.5; waited += 100) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return new Promise<ClipResult>((resolve) => {
      const timer = setTimeout(() => done({ ok: false, error: 'timeout' }), length * 1000 + 120_000)
      const done = (result: ClipResult) => {
        clearTimeout(timer)
        finish = null
        recording.value = false
        resolve(result)
      }
      finish = done
      command({ action: 'record', start, length })
    })
  }

  onScopeDispose(() => {
    window.removeEventListener('message', onMessage)
    close()
  })

  return { state, recording, open, close, command, record }
}
