import { parseVideoLink } from '@sound-sticker-maker/core'
import { onScopeDispose, shallowRef } from 'vue'
import { bufferFromBase64, type ClipResult, type RuntimeMessage } from '@/lib/messages'

type Working = 'youtube' | 'tiktok' | null

class LinkError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

function toFile(result: ClipResult, fallbackName: string): File {
  if (!result.ok) throw new LinkError(result.error)
  const extension = result.mime.includes('webm') ? 'webm' : 'mp4'
  const name = `${
    (result.title || fallbackName)
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .trim()
      .slice(0, 60) || fallbackName
  }.${extension}`
  return new File([bufferFromBase64(result.base64)], name, { type: result.mime })
}

/**
 * Plays the part in a hidden YouTube player inside this page and waits for its recording.
 * `credentialless` lets the frame load under WhatsApp's cross-origin isolation.
 */
function recordYouTube(id: string, start: number, length: number): Promise<ClipResult> {
  const requestId = crypto.randomUUID()
  const frame = document.createElement('iframe')
  frame.setAttribute('credentialless', '')
  frame.allow = 'autoplay; encrypted-media'
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;height:360px;opacity:0;pointer-events:none;border:0'
  frame.src = chrome.runtime.getURL(`player.html#${requestId}:${id}:${start}:${length}`)

  return new Promise((resolve) => {
    const finish = (result: ClipResult) => {
      clearTimeout(timer)
      chrome.runtime.onMessage.removeListener(onMessage)
      frame.remove()
      resolve(result)
    }
    const onMessage = (message: RuntimeMessage) => {
      if (message.type === 'clip' && message.requestId === requestId) finish(message)
    }
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), length * 1000 + 120_000)
    chrome.runtime.onMessage.addListener(onMessage)
    document.body.append(frame)
  })
}

export function useLinkImport() {
  const working = shallowRef<Working>(null)
  const error = shallowRef<string | null>(null)
  let cancelled = false
  onScopeDispose(() => (cancelled = true))

  async function importLink(text: string, start: number, length: number): Promise<File | null> {
    error.value = null
    const link = parseVideoLink(text)
    if (!link) {
      error.value = 'bad-link'
      return null
    }
    working.value = link.site
    try {
      const result =
        link.site === 'youtube'
          ? await recordYouTube(link.id, start, length)
          : ((await chrome.runtime.sendMessage({ type: 'tiktok', url: link.url } satisfies RuntimeMessage)) as ClipResult)
      if (cancelled) return null
      return toFile(result, link.site)
    } catch (cause) {
      error.value = cause instanceof LinkError ? cause.code : 'network'
      return null
    } finally {
      working.value = null
    }
  }

  return { working, error, importLink }
}
