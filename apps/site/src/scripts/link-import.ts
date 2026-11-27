// A static page can't fetch YouTube or TikTok videos; the GitHub build of the extension does it and hands back the file.

interface Port {
  postMessage(message: unknown): void
  disconnect(): void
  onMessage: { addListener(listener: (message: ClipReply) => void): void }
  onDisconnect: { addListener(listener: () => void): void }
}
interface Runtime {
  lastError?: { message?: string }
  sendMessage(id: string, message: unknown, reply: (response: unknown) => void): void
  connect(id: string, info: { name: string }): Port
}
interface FileReply {
  ok: boolean
  base64?: string
  mime?: string
  title?: string
  error?: string
}
interface ClipReply extends FileReply {
  type?: string
  requestId?: string
}

export interface LinkJob {
  done: Promise<File>
  cancel: () => void
}

const runtime = (): Runtime | undefined => (globalThis as { chrome?: { runtime?: Runtime } }).chrome?.runtime

function toFile(reply: FileReply, fallbackName: string): File {
  const mime = reply.mime || 'video/mp4'
  const bytes = Uint8Array.from(atob(reply.base64 ?? ''), (c) => c.charCodeAt(0))
  const ext = mime.includes('webm') ? 'webm' : 'mp4'
  const name =
    (reply.title || fallbackName)
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .trim()
      .slice(0, 80) || fallbackName
  return new File([bytes], `${name}.${ext}`, { type: mime })
}

function send<T>(id: string, message: unknown, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const chromeRuntime = runtime()
    if (!id || !chromeRuntime?.sendMessage) return resolve(null)
    const timer = setTimeout(() => resolve(null), timeoutMs)
    try {
      chromeRuntime.sendMessage(id, message, (response) => {
        clearTimeout(timer)
        resolve(chromeRuntime.lastError ? null : ((response as T) ?? null))
      })
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

export function createLinkImporter(extensionId: string) {
  return {
    async available(): Promise<boolean> {
      const reply = await send<{ ok?: boolean }>(extensionId, { type: 'ping' }, 1500)
      return !!reply?.ok
    },

    tiktok(url: string): LinkJob {
      let cancelled = false
      let reject: (error: Error) => void = () => undefined
      const done = new Promise<File>((resolve, fail) => {
        reject = fail
        send<FileReply>(extensionId, { type: 'tiktok', url }, 120_000).then((reply) => {
          if (cancelled) return
          if (reply?.ok && reply.base64) resolve(toFile(reply, 'tiktok'))
          else fail(new Error(reply?.error ?? 'failed'))
        })
      })
      return {
        done,
        cancel: () => {
          cancelled = true
          reject(new Error('cancelled'))
        },
      }
    },

    /** The player has to stay visible while it plays, or Chrome records a black picture. */
    youtube(id: string, start: number, length: number, host: HTMLElement): LinkJob {
      const requestId = crypto.randomUUID()
      let port: Port | null = null
      let finish: (error: Error | null, file?: File) => void = () => undefined
      const done = new Promise<File>((resolve, reject) => {
        let settled = false
        const timer = setTimeout(() => finish(new Error('timeout')), (length + 90) * 1000)
        finish = (error, file) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          try {
            port?.disconnect()
          } catch {
            // The port may already be closed by the extension.
          }
          host.replaceChildren()
          if (error) reject(error)
          else resolve(file!)
        }
        const chromeRuntime = runtime()
        if (!chromeRuntime?.connect) return finish(new Error('unavailable'))
        try {
          port = chromeRuntime.connect(extensionId, { name: 'clip' })
        } catch {
          return finish(new Error('unavailable'))
        }
        port.onMessage.addListener((message) => {
          if (message?.type !== 'clip' || message.requestId !== requestId) return
          if (message.ok && message.base64) finish(null, toFile(message, 'youtube'))
          else finish(new Error(message.error ?? 'failed'))
        })
        port.onDisconnect.addListener(() => finish(new Error('disconnected')))
        const frame = document.createElement('iframe')
        frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&controls=0&playsinline=1&rel=0&start=${Math.floor(start)}#ssm=${requestId}:${start}:${length}`
        frame.allow = 'autoplay; encrypted-media'
        frame.title = 'YouTube'
        host.replaceChildren(frame)
        port.postMessage({ type: 'watch', requestId })
      })
      return { done, cancel: () => finish(new Error('cancelled')) }
    },
  }
}
