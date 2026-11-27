import { createApp, h, shallowRef } from 'vue'
import App from './App.vue'
import { ignoreInvalidatedContext } from '../lib/extension'
import type { RuntimeMessage } from '../lib/messages'
import styles from './style.css?inline'

ignoreInvalidatedContext()

// @property rules are ignored inside a shadow root, so Tailwind's must be registered on the document.
const properties = styles.match(/@property[^{]+\{[^}]*\}/g) ?? []
if (properties.length) {
  const registered = new CSSStyleSheet()
  registered.replaceSync(properties.join('\n'))
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, registered]
}

const host = document.createElement('div')
host.id = 'sound-sticker-maker'
const shadow = host.attachShadow({ mode: 'open' })
const style = document.createElement('style')
style.textContent = styles
const mountPoint = document.createElement('div')
shadow.append(style, mountPoint)
document.documentElement.appendChild(host)

const open = shallowRef(false)
createApp({ render: () => h(App, { open: open.value, 'onUpdate:open': (value: boolean) => (open.value = value) }) }).mount(mountPoint)

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message.type === 'toggle-panel') open.value = !open.value
})

setInterval(() => {
  if (!host.isConnected) document.documentElement.appendChild(host)
}, 1000)
