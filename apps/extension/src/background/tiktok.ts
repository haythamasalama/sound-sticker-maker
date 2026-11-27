import { base64FromBuffer, type ClipResult } from '../lib/messages'

const REFERER_RULE_ID = 1

/**
 * TikTok's video servers refuse requests without a TikTok referrer. A session rule adds it, only for
 * requests the extension makes itself (they belong to no tab).
 */
async function ensureRefererRule(): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [REFERER_RULE_ID],
    addRules: [
      {
        id: REFERER_RULE_ID,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            { header: 'referer', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'https://www.tiktok.com/' },
          ],
        },
        condition: {
          requestDomains: ['tiktok.com'],
          tabIds: [chrome.tabs.TAB_ID_NONE],
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST, chrome.declarativeNetRequest.ResourceType.MEDIA],
        },
      },
    ],
  })
}

interface VideoInfo {
  playAddr?: string
  downloadAddr?: string
}

/** TikTok puts the video's details in a JSON script on the video page. */
export function readVideoInfo(html: string): { video: VideoInfo; title: string } | null {
  const match = html.match(/<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return null
  try {
    const data = JSON.parse(match[1]!)
    const item = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
    if (!item?.video) return null
    return { video: item.video as VideoInfo, title: String(item.desc ?? '').slice(0, 60) }
  } catch {
    return null
  }
}

export async function fetchTikTok(url: string): Promise<ClipResult> {
  try {
    await ensureRefererRule()
    const page = await fetch(url, { credentials: 'include', redirect: 'follow' })
    if (!page.ok) return { ok: false, error: page.status === 404 ? 'not-found' : 'network', detail: `page ${page.status}` }
    const info = readVideoInfo(await page.text())
    const address = info?.video.playAddr || info?.video.downloadAddr
    if (!info || !address) return { ok: false, error: 'not-found', detail: 'no video data on the page' }
    const video = await fetch(address, { credentials: 'include' })
    if (!video.ok) return { ok: false, error: 'blocked', detail: `video ${video.status}` }
    const buffer = await video.arrayBuffer()
    return {
      ok: true,
      base64: base64FromBuffer(buffer),
      mime: video.headers.get('content-type')?.split(';')[0] || 'video/mp4',
      title: info.title || 'tiktok',
    }
  } catch (error) {
    return { ok: false, error: 'network', detail: String((error as Error)?.message ?? error) }
  }
}
