import { bufferFromBase64, type ClipResult, type RuntimeMessage } from '@/lib/messages'

export class LinkError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

export function clipToFile(result: ClipResult, fallbackName: string): File {
  if (!result.ok) throw new LinkError(result.error)
  const extension = result.mime.includes('webm') ? 'webm' : 'mp4'
  const base =
    (result.title || fallbackName)
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .trim()
      .slice(0, 60) || fallbackName
  return new File([bufferFromBase64(result.base64)], `${base}.${extension}`, { type: result.mime })
}

/** The whole TikTok video comes in; the user then picks the part on the waveform. */
export async function downloadTikTok(url: string): Promise<File> {
  const result = (await chrome.runtime.sendMessage({ type: 'tiktok', url } satisfies RuntimeMessage)) as ClipResult
  return clipToFile(result, 'tiktok')
}
