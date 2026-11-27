export type StickerErrorCode =
  | 'unsupported-browser'
  | 'unreadable-video'
  | 'unreadable-image'
  | 'unreadable-audio'
  | 'no-picture'
  | 'audio-out-of-range'
  | 'too-long'
  | 'too-large'
  | 'timeout'
  | 'aborted'

export class StickerError extends Error {
  readonly code: StickerErrorCode

  constructor(code: StickerErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code, options)
    this.name = 'StickerError'
    this.code = code
  }
}

export function isStickerError(error: unknown): error is StickerError {
  return error instanceof StickerError
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new StickerError('aborted')
}
