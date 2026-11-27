/**
 * Extension page the panel loads inside WhatsApp Web. WhatsApp's page rules don't allow the youtube-nocookie
 * player, but they allow this page, and this page can host that player.
 * Hash: #<request id>:<video id>:<start>:<language> — the player shows in the panel's language, so its bar runs
 * the same way as the panel's.
 */
const [requestId, videoId, start, language] = location.hash.slice(1).split(':')

if (requestId && videoId && /^[\w-]{6,20}$/.test(videoId)) {
  const frame = document.createElement('iframe')
  frame.allow = 'autoplay; encrypted-media'
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0'
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '1',
    playsinline: '1',
    rel: '0',
    enablejsapi: '1',
    origin: location.origin,
    hl: /^[a-z]{2}$/.test(language ?? '') ? language! : 'en',
    start: String(Math.floor(Number(start) || 0)),
  })
  frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}#ssm=${requestId}:watch`
  document.addEventListener('DOMContentLoaded', () => document.body.append(frame))

  const youtube = 'https://www.youtube-nocookie.com'
  // Seeking goes through YouTube's own player commands: before a video first plays, YouTube puts back its own
  // position after a seek made on the video element.
  const command = (func: string, args: unknown[] = []) =>
    frame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args, id: requestId, channel: 'widget' }), youtube)
  frame.addEventListener('load', () =>
    frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: requestId, channel: 'widget' }), youtube),
  )

  window.addEventListener('message', (event) => {
    const data = event.data as { requestId?: string; type?: string; action?: string; time?: number } | string
    if (typeof data !== 'object' || data?.requestId !== requestId) return
    if (event.source === frame.contentWindow && event.origin === youtube) {
      parent.postMessage(data, '*')
    } else if (event.source === parent) {
      if (data.type === 'yt-command' && data.action === 'seek') command('seekTo', [data.time, true])
      else frame.contentWindow?.postMessage(data, youtube)
    }
  })
}
