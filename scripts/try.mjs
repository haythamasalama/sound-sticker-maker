// Opens Chromium with the built extension and WhatsApp Web, for trying it by hand.
// The profile is kept in .playwright-mcp/profile, so you sign in to WhatsApp once.
// Usage: node scripts/try.mjs [store|github]
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const target = process.argv[2] ?? 'github'
const extension = resolve(`apps/extension/dist/${target}`)

const context = await chromium.launchPersistentContext(resolve('.playwright-mcp/profile'), {
  channel: 'chromium',
  headless: false,
  viewport: null,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--start-maximized'],
})
const page = context.pages()[0] ?? (await context.newPage())
await page.goto('https://web.whatsapp.com/')
console.log(`Chromium is open with the ${target} build. Close the window to stop.`)
await new Promise((done) => context.on('close', done))
