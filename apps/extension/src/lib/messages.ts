/** chrome.runtime messages between the background, the panel and the YouTube recorder frame. */

export type ClipErrorCode = 'blocked' | 'no-video' | 'past-end' | 'no-play' | 'capture' | 'timeout' | 'not-found' | 'network'

export interface ClipPayload {
  base64: string
  mime: string
  title: string
}

export type ClipResult = ({ ok: true } & ClipPayload) | { ok: false; error: ClipErrorCode; detail?: string }

export interface PlayerState {
  ready: boolean
  duration: number
  time: number
  paused: boolean
  title: string
  error?: ClipErrorCode
}

export type PlayerAction =
  { action: 'seek'; time: number } | { action: 'play' } | { action: 'pause' } | { action: 'record'; start: number; length: number }

export type RuntimeMessage =
  | { type: 'toggle-panel' }
  | { type: 'tiktok'; url: string }
  | ({ type: 'clip'; requestId: string } & ClipResult)
  | ({ type: 'yt-state'; requestId: string } & PlayerState)
  | ({ type: 'yt-command'; requestId: string } & PlayerAction)

export function base64FromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step))
  return btoa(binary)
}

export function bufferFromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
