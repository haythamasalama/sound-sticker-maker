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
  viewport: { width: 1280, height: 900 },
  locale: 'en-US',
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
const shot = (name) => panel.screenshot({ path: `${out}/${name}.png` })
const pictureName = () =>
  page.evaluate(
    () =>
      document.querySelector('#sound-sticker-maker')?.shadowRoot?.querySelector('[data-testid=picture-name]')?.textContent?.trim() ?? '',
  )

await step('open', async () => {
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' })
  await page.locator('#sound-sticker-maker button[aria-label="Sound Sticker Maker"]').click({ timeout: 30000 })
  await panel.waitFor()
  await shot('1-empty')
  if (target === 'github') {
    await panel.getByRole('tab', { name: 'From a link' }).click()
    await shot('1-link-tab')
    await panel.getByRole('tab', { name: 'From your device' }).click()
  }
  return {}
})

await step('create-from-video', async () => {
  await panel.locator('input[type=file]').first().setInputFiles(video)
  await panel.locator('canvas').waitFor({ timeout: 30000 })
  await page.waitForTimeout(600)
  await shot('2-chosen')
  await panel.getByRole('button', { name: 'Create sticker' }).click()
  await panel.locator('[data-testid=result]').waitFor({ timeout: 60000 })
  await shot('3-created')
  return { picture: await pictureName() }
})

if (target === 'github') {
  for (const [name, link] of [
    ['youtube', 'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3'],
    ['tiktok', 'https://www.tiktok.com/@scout2015/video/6718335390845095173'],
  ]) {
    await step(name, async () => {
      const before = await pictureName()
      await panel.getByRole('tab', { name: 'From a link' }).click()
      const input = panel.locator('input[inputmode=url]')
      await input.fill(link)
      await input.dispatchEvent('input')
      if (name === 'youtube') await panel.locator('input[type=number]').first().fill('4')
      await panel.getByRole('button', { name: 'Get the video' }).click()
      if (name === 'youtube') {
        await page.waitForTimeout(4000)
        await shot('4-youtube-recording')
      }
      await page.waitForFunction(
        (previous) => {
          const root = document.querySelector('#sound-sticker-maker')?.shadowRoot
          const name = root?.querySelector('[data-testid=picture-name]')?.textContent?.trim() ?? ''
          return (name !== previous && /\.(webm|mp4)$/.test(name)) || root?.querySelector('form [role=alert]')
        },
        before,
        { timeout: 120000 },
      )
      await page.waitForTimeout(800)
      await shot(`5-${name}`)
      const alert = await panel
        .locator('form [role=alert]')
        .first()
        .textContent({ timeout: 500 })
        .catch(() => null)
      return { picture: await pictureName(), alert }
    })
  }
}

for (const [code, file] of [
  ['ar', '6-arabic'],
  ['hi', '7-hindi'],
]) {
  await step(code, async () => {
    await panel.locator('select').selectOption(code)
    await page.waitForTimeout(300)
    await shot(file)
    return { dir: await panel.locator('xpath=..').getAttribute('dir') }
  })
}

console.log(JSON.stringify(results, null, 2))
await context.close()
