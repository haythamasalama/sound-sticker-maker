/**
 * Extension page the panel loads, hidden, inside WhatsApp Web. WhatsApp's page rules don't allow the
 * youtube-nocookie player, but they allow this page, and this page can host that player.
 * Hash: #<request id>:<video id>:<start>:<length>
 */
const [requestId, videoId, start, seconds] = location.hash.slice(1).split(':')

if (requestId && videoId && /^[\w-]{6,20}$/.test(videoId)) {
  const frame = document.createElement('iframe')
  frame.allow = 'autoplay; encrypted-media'
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0'
  const params = new URLSearchParams({ autoplay: '1', controls: '0', playsinline: '1', rel: '0', start: String(Math.floor(Number(start))) })
  frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}#ssm=${requestId}:${start}:${seconds}`
  document.addEventListener('DOMContentLoaded', () => document.body.append(frame))
}
