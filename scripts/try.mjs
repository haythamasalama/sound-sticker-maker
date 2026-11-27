// Opens Chromium with the built extension and WhatsApp Web, for trying it by hand.
// The profile is kept in .playwright-mcp/profile, so you sign in to WhatsApp once.
// Usage: node scripts/try.mjs
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const extension = resolve('apps/extension/dist')

const context = await chromium.launchPersistentContext(resolve('.playwright-mcp/profile'), {
  channel: 'chromium',
  headless: false,
  viewport: null,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--start-maximized', '--remote-debugging-port=9333'],
})
const page = context.pages()[0] ?? (await context.newPage())
await page.goto('https://web.whatsapp.com/')
console.log('Chromium is open with the extension. Close the window to stop.')
await new Promise((done) => context.on('close', done))
