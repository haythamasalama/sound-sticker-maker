/**
 * Runs in WhatsApp's page before WhatsApp's own scripts. WhatsApp listens for typing, pasting and focus on the whole
 * page so it can send them to the chat box, which also caught what people typed or pasted into the panel. Listeners
 * that WhatsApp adds on the window, the document, <html> or <body> skip events that come from the panel.
 */
const HOST_ID = 'sound-sticker-maker'
const TYPES = new Set([
  'keydown',
  'keyup',
  'keypress',
  'beforeinput',
  'input',
  'paste',
  'copy',
  'cut',
  'focusin',
  'focusout',
  'compositionstart',
  'compositionupdate',
  'compositionend',
])

const fromPanel = (event: Event) => event.composedPath().some((node) => (node as Element).id === HOST_ID)
const pageWide = (target: EventTarget) =>
  target === window || target === document || target === document.documentElement || target === document.body

const wrappers = new WeakMap<EventListenerOrEventListenerObject, EventListener>()
const add = EventTarget.prototype.addEventListener
const remove = EventTarget.prototype.removeEventListener

EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (!listener || !TYPES.has(type) || !pageWide(this)) return add.call(this, type, listener, options)
  let wrapper = wrappers.get(listener)
  if (!wrapper) {
    wrapper = function (this: unknown, event: Event) {
      if (fromPanel(event)) return
      if (typeof listener === 'function') return listener.call(this, event)
      return listener.handleEvent(event)
    }
    wrappers.set(listener, wrapper)
  }
  return add.call(this, type, wrapper, options)
}

EventTarget.prototype.removeEventListener = function (type, listener, options) {
  return remove.call(this, type, (listener && wrappers.get(listener)) ?? listener, options)
}
