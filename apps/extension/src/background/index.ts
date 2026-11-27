import type { RuntimeMessage } from '../lib/messages'
import { fetchTikTok } from './tiktok'
import { allowYouTubeEmbeds } from './youtube'

const WHATSAPP = 'https://web.whatsapp.com/'

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id !== undefined && tab.url?.startsWith(WHATSAPP)) {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' } satisfies RuntimeMessage).catch(() => chrome.tabs.reload(tab.id!))
    return
  }
  const [existing] = await chrome.tabs.query({ url: `${WHATSAPP}*` })
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true })
    if (existing.windowId !== undefined) await chrome.windows.update(existing.windowId, { focused: true })
    chrome.tabs.sendMessage(existing.id, { type: 'toggle-panel' } satisfies RuntimeMessage).catch(() => undefined)
    return
  }
  await chrome.tabs.create({ url: WHATSAPP })
})

allowYouTubeEmbeds()

// The website's online maker records YouTube clips through the extension; it waits on a port per request.
const sitePorts = new Map<string, chrome.runtime.Port>()

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message.type === 'tiktok') {
    fetchTikTok(message.url).then(sendResponse)
    return true
  }
  if (message.type !== 'clip') return
  const port = sitePorts.get(message.requestId)
  if (port) {
    port.postMessage(message)
    sitePorts.delete(message.requestId)
  } else if (sender.tab?.id !== undefined) {
    // The recorder runs in a frame inside the WhatsApp tab; hand the clip to that tab's panel.
    chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 }).catch(() => undefined)
  }
})

chrome.runtime.onMessageExternal.addListener((message: { type?: string; url?: string }, _sender, sendResponse) => {
  if (message?.type === 'ping') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version })
    return
  }
  if (message?.type === 'tiktok' && typeof message.url === 'string') {
    fetchTikTok(message.url).then(sendResponse)
    return true
  }
})

chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name !== 'clip') return
  port.onMessage.addListener((message: { type?: string; requestId?: string }) => {
    if (message?.type === 'watch' && typeof message.requestId === 'string') sitePorts.set(message.requestId, port)
  })
  port.onDisconnect.addListener(() => {
    for (const [id, open] of sitePorts) if (open === port) sitePorts.delete(id)
  })
})
