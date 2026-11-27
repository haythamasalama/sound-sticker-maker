// Loads the built extension into Chromium, opens WhatsApp Web and walks through the panel.
// Sending needs a signed-in WhatsApp account, so this stops at a created sticker.
// Usage: node scripts/e2e.mjs [store|github] [video-file]
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const target = process.argv[2] ?? 'github'
const video = resolve(process.argv[3] ?? '.playwright-mcp/test.mp4')
const extension = resolve(`apps/extension/dist/${target}`)
const out = resolve('.playwright-mcp/e2e')
mkdirSync(out, { recursive: true })

const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'ssm-')), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 860 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
})
const page = context.pages()[0] ?? (await context.newPage())
const results = {}
const step = async (name, fn) => {
  const started = Date.now()
  try {
    results[name] = { ok: true, ...(await fn()), ms: Date.now() - started }
  } catch (error) {
    results[name] = { ok: false, error: String(error?.message ?? error).split('\n')[0], ms: Date.now() - started }
    await page.screenshot({ path: `${out}/${name}-failed.png` }).catch(() => undefined)
  }
}
const panel = page.locator('#sound-sticker-maker aside')

await step('open', async () => {
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' })
  await page
    .locator(
      '#sound-sticker-maker button[aria-label="Sound Sticker Maker"], #sound-sticker-maker button[aria-label="صانع الملصقات الصوتية"]',
    )
    .click({ timeout: 30000 })
  await panel.waitFor()
  await page.screenshot({ path: `${out}/1-panel.png` })
  return {}
})

await step('create-from-video', async () => {
  await panel.locator('input[type=file]').first().setInputFiles(video)
  await panel.locator('canvas').waitFor({ timeout: 30000 })
  await page.screenshot({ path: `${out}/2-trimmer.png` })
  await panel.getByRole('button', { name: /Create sticker|اصنع الملصق/ }).click()
  await panel.locator('section img').waitFor({ timeout: 60000 })
  await page.screenshot({ path: `${out}/3-created.png` })
  return { details: await panel.locator('section span[dir=ltr]').innerText() }
})

if (target === 'github') {
  for (const [name, link] of [
    ['youtube', 'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3'],
    ['tiktok', 'https://www.tiktok.com/@scout2015/video/6718335390845095173'],
  ]) {
    await step(name, async () => {
      const input = panel.locator('input[inputmode=url]')
      await input.fill(link)
      await input.dispatchEvent('input')
      if (name === 'youtube') await panel.locator('input[type=number]').first().fill('4')
      await panel.getByRole('button', { name: /Get clip|اجلب المقطع/ }).click()
      const chosenName = () =>
        page.evaluate(
          () => document.querySelector('#sound-sticker-maker')?.shadowRoot?.querySelector('aside button span.truncate')?.textContent ?? '',
        )
      const before = await chosenName()
      await page.waitForFunction(
        (previous) => {
          const root = document.querySelector('#sound-sticker-maker')?.shadowRoot
          const name = root?.querySelector('aside button span.truncate')?.textContent ?? ''
          return (name !== previous && /\.(webm|mp4)$/.test(name)) || root?.querySelector('form [role=alert]')
        },
        before,
        { timeout: 120000 },
      )
      const alert = await panel
        .locator('[role=alert]')
        .first()
        .textContent()
        .catch(() => null)
      await page.screenshot({ path: `${out}/4-${name}.png` })
      return { chosen: await chosenName(), alert }
    })
  }
}

await step('arabic', async () => {
  await panel.getByRole('button', { name: 'ع' }).click()
  await page.screenshot({ path: `${out}/5-arabic.png` })
  return { dir: await panel.locator('xpath=..').getAttribute('dir') }
})

console.log(JSON.stringify(results, null, 2))
await context.close()
