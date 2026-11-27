/**
 * WhatsApp Web's own modules, reached through its module loader. WhatsApp has no public API for sound
 * stickers, so this uploads the sound and sends the sticker the way WhatsApp's own sticker editor does.
 * Module names change between WhatsApp releases; `missingModules()` reports which ones are gone.
 */

// WhatsApp's internal modules are untyped.
type Module = any // eslint-disable-line @typescript-eslint/no-explicit-any

declare global {
  interface Window {
    require?: (name: string) => Module
    importNamespace?: (name: string) => Module
    requireLazy?: (names: string[], callback: () => void) => void
    __d?: unknown
  }
}

const SOUND_FLAGS = ['sound_stickers_consumption_enabled', 'sound_stickers_creation_enabled', 'sound_stickers_audio_playing_enabled']

const REQUIRED = [
  'WAWebChatCollection',
  'WAWebMsgCollection',
  'WAWebMediaPrep',
  'WAWebMediaOpaqueData',
  'WAWebUploadManager',
  'WAWebMmsMediaTypes',
  'WAWebSoundStickerUtils',
  'WAWebABProps',
  'WAWebModalManager',
  'WAWebStateUtils',
  'WAWebUserPrefsMeUser',
  'WAWebFindChatAction',
  'WAWebSendMsgResultAction',
  'WAWebAck',
  'react',
]

export class WhatsAppError extends Error {
  constructor(
    readonly code: 'no-open-chat' | 'no-own-chat' | 'upload-failed' | 'send-failed' | 'whatsapp-changed',
    detail?: string,
  ) {
    super(detail ?? code)
  }
}

export function loaderReady(): boolean {
  return typeof window.require === 'function' && typeof window.__d === 'function'
}

function ns(name: string): Module {
  if (typeof window.importNamespace === 'function') {
    try {
      const module = window.importNamespace(name)
      if (module) return module
    } catch {
      // fall back to require
    }
  }
  return window.require!(name)
}

function def(name: string): Module {
  const module = ns(name)
  return module && module.default !== undefined ? module.default : module
}

async function load(name: string, timeoutMs = 15000): Promise<Module> {
  try {
    return ns(name)
  } catch {
    // deferred module, load it below
  }
  if (typeof window.requireLazy !== 'function') throw new WhatsAppError('whatsapp-changed', `Module ${name} is not available`)
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new WhatsAppError('whatsapp-changed', `Loading ${name} timed out`)), timeoutMs)
    window.requireLazy!([name], () => {
      clearTimeout(timer)
      resolve()
    })
  })
  return ns(name)
}

export function missingModules(): string[] {
  if (!loaderReady()) return ['loader']
  return REQUIRED.filter((name) => {
    try {
      return !ns(name)
    } catch {
      return true
    }
  })
}

/**
 * Sound stickers reach accounts gradually. Turning the flags on locally lets this browser send them;
 * the receiving app decides on its own whether it plays the sound.
 */
let flagsForced = false
function enableSoundStickers(): void {
  if (flagsForced) return
  try {
    const props = ns('WAWebABProps')
    const original = props.getABPropConfigValue as (...args: unknown[]) => unknown
    props.getABPropConfigValue = function (this: unknown, name: string, ...rest: unknown[]) {
      if (SOUND_FLAGS.includes(name)) return true
      return original.call(this, name, ...rest)
    }
  } catch {
    // older builds gate through the module below only
  }
  try {
    const gating = ns('WAWebSoundStickerGating')
    gating.isSoundStickerConsumptionEnabled = () => true
    gating.isSoundStickerCreationEnabled = () => true
    gating.isSoundStickerPlaybackEnabled = () => true
  } catch {
    // not present in every build
  }
  flagsForced = true
}

type Chat = Module

export function openChat(): Chat | null {
  return ns('WAWebChatCollection').ChatCollection.getActive() ?? null
}

async function ownChat(): Promise<Chat> {
  const me = ns('WAWebUserPrefsMeUser')
  const chats = ns('WAWebChatCollection').ChatCollection
  let firstWid: unknown = null
  for (const getter of ['getMaybeMePnUser', 'getMeUserOrThrow', 'getMaybeMeLidUser']) {
    try {
      const wid = me[getter]?.()
      if (!wid) continue
      firstWid ??= wid
      const chat = chats.get(wid) ?? chats.get(String(wid._serialized ?? wid))
      if (chat) return chat
    } catch {
      // try the next getter
    }
  }
  if (!firstWid) throw new WhatsAppError('no-own-chat')
  const result = await ns('WAWebFindChatAction').findOrCreateLatestChat(firstWid, 'forwardSelectedModals')
  return result?.chat ?? result
}

function toBase64(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array((value as ArrayBufferView).buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function sha256(bytes: Uint8Array): Promise<string> {
  return toBase64(await crypto.subtle.digest('SHA-256', bytes as BufferSource))!
}

const silentQpl = new Proxy({}, { get: () => () => undefined })

async function uploadSound(audio: Blob, seconds: number, chat: Chat): Promise<Module> {
  const types = ns('WAWebMmsMediaTypes').MEDIA_TYPES
  let uploadOrigin = 1
  try {
    uploadOrigin = def('WAWebMediaGetUploadOriginForChat')(chat)
  } catch {
    // default origin
  }
  const params = {
    blob: audio,
    type: types.AUDIO,
    signal: new AbortController().signal,
    uploadQpl: silentQpl,
    uploadOrigin,
    fileOrigin: undefined,
    userUploadAttemptCount: 0,
    forwardedFromWeb: false,
    isViewOnce: false,
    isHdPhoto: false,
  }
  let result: Module
  try {
    try {
      const metrics = def('WAWebCreateMediaUploadMetrics')(params)
      result = await def('WAWebUploadManagerMainThread').encryptAndUpload(params, metrics)
    } catch {
      result = await def('WAWebUploadManager').encryptAndUpload(params)
    }
  } catch (cause) {
    throw new WhatsAppError('upload-failed', String((cause as Error)?.message ?? cause))
  }
  const bytes = new Uint8Array(await audio.arrayBuffer())
  const stickerAudio = {
    deprecatedMms3Url: result.url || undefined,
    directPath: result.directPath,
    mediaKey: toBase64(result.mediaKey),
    mediaKeyTimestamp: result.mediaKeyTimestamp,
    filehash: await sha256(bytes),
    encFilehash: toBase64(result.encFilehash),
    size: bytes.length,
    mimetype: 'audio/ogg; codecs=opus',
    // WhatsApp encodes this as whole seconds and fails the whole send (ERROR_UNKNOWN) on a fraction.
    duration: Math.max(1, Math.round(seconds)),
  }
  if (!isCompleteSound(stickerAudio)) throw new WhatsAppError('upload-failed', 'WhatsApp did not accept the uploaded sound')
  return stickerAudio
}

function isCompleteSound(stickerAudio: { directPath?: string; mediaKey?: string }): boolean {
  try {
    return ns('WAWebSoundStickerUtils').isCompleteStickerAudio(stickerAudio) === true
  } catch {
    return Boolean(stickerAudio.directPath && stickerAudio.mediaKey)
  }
}

async function sendSticker(chat: Chat, webp: Blob, side: number, stickerAudio: Module): Promise<Module> {
  const opaque = await def('WAWebMediaOpaqueData').createFromData(webp, 'image/webp')
  const MediaPrep = def('WAWebMediaPrep')
  const prep = new MediaPrep(
    'sticker',
    Promise.resolve({
      type: 'sticker',
      mediaBlob: opaque,
      mimetype: 'image/webp',
      size: webp.size,
      fullWidth: side,
      fullHeight: side,
      isAnimated: true,
      emojis: ['🔊'],
    }),
  )
  const result = await prep.sendToChat({ chat, options: { stickerAudio } })
  if (result?.messageSendResult !== ns('WAWebSendMsgResultAction').SendMsgResult.OK) {
    throw new WhatsAppError('send-failed', String(result?.messageSendResult ?? 'no result'))
  }
  return result.msg
}

async function waitForServer(message: Module, timeoutMs = 30000): Promise<void> {
  const ack = ns('WAWebAck').ACK
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (message.ack >= ack.SENT) return
    if (message.ack < 0) throw new WhatsAppError('send-failed', `ack ${message.ack}`)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

async function openForward(message: Module): Promise<void> {
  const React = ns('react')
  const modals = ns('WAWebModalManager')
  const flow = await load('WAWebForwardMessageFlowLoadable')
  let model = message
  try {
    model = ns('WAWebMsgCollection').MsgCollection.get(message.id) ?? message
  } catch {
    // use the message we have
  }
  const close = modals.closeModalManager ?? (() => modals.ModalManager.close())
  modals.ModalManager.open(
    React.createElement(flow.ForwardMessageFlowLoadable, { msgs: [ns('WAWebStateUtils').unproxy(model)], onClose: close }),
    { transition: 'modal-flow' },
  )
}

export interface SendInput {
  webp: Blob
  audio: Blob
  seconds: number
  side: number
  toOwnChat: boolean
  forward: boolean
  onStep: (step: 'finding-chat' | 'uploading-sound' | 'sending' | 'waiting' | 'opening-forward') => void
}

export async function sendSoundSticker(input: SendInput): Promise<void> {
  if (missingModules().length) throw new WhatsAppError('whatsapp-changed', missingModules().join(', '))
  enableSoundStickers()
  input.onStep('finding-chat')
  const chat = input.toOwnChat ? await ownChat() : openChat()
  if (!chat) throw new WhatsAppError('no-open-chat')
  input.onStep('uploading-sound')
  const stickerAudio = await uploadSound(input.audio, input.seconds, chat)
  input.onStep('sending')
  const message = await sendSticker(chat, input.webp, input.side, stickerAudio)
  if (!input.forward) return
  input.onStep('waiting')
  await waitForServer(message)
  input.onStep('opening-forward')
  await openForward(message)
}
