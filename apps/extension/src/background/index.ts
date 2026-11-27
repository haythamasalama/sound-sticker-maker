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

if (__LINKS__) {
  allowYouTubeEmbeds()
  chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    if (message.type === 'tiktok') {
      fetchTikTok(message.url).then(sendResponse)
      return true
    }
    // The YouTube recorder runs in a hidden frame inside the WhatsApp tab; hand its clip to that tab's panel.
    if (message.type === 'clip' && sender.tab?.id !== undefined) {
      chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 }).catch(() => undefined)
    }
  })
}
