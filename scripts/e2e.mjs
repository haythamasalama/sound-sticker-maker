// Loads the built extension into Chromium, opens WhatsApp Web and walks through the panel.
// Sending needs a signed-in WhatsApp account, so this stops at a created sticker.
// Usage: node scripts/e2e.mjs [video-file]
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const video = resolve(process.argv[2] ?? '.playwright-mcp/test.mp4')
const extension = resolve('apps/extension/dist')
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
  // The panel opens from the extension's toolbar icon, which sends the tab this message.
  await page.locator('#sound-sticker-maker').waitFor({ state: 'attached', timeout: 30000 })
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await worker.evaluate(async () => {
    const [tab] = await globalThis.chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
    await globalThis.chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' })
  })
  await panel.waitFor()
  await shot('1-empty')
  await panel.getByRole('tab', { name: 'From a link' }).click()
  await shot('1-link-tab')
  await panel.getByRole('tab', { name: 'From your device' }).click()
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

{
  for (const [name, link] of [
    ['youtube', 'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3'],
    ['tiktok', 'https://www.tiktok.com/@scout2015/video/6718335390845095173'],
  ]) {
    await step(name, async () => {
      const before = await pictureName()
      let moved
      await panel.getByRole('tab', { name: 'From a link' }).click()
      const input = panel.locator('input[inputmode=url]')
      await input.fill(link)
      await input.dispatchEvent('input')
      if (name === 'youtube') {
        // The video opens in the stage; the part is picked from anywhere in it, then only that part is recorded.
        await panel.getByRole('button', { name: 'Open', exact: true }).click()
        const use = panel.getByRole('button', { name: 'Use this part' })
        await use.waitFor({ timeout: 60000 })
        await panel.getByTestId('part-start').fill('0:03')
        await panel.getByTestId('part-start').press('Enter')
        for (let i = 0; i < 8; i++) await panel.getByTestId('shorter').click()
        await page.waitForTimeout(1200)
        const range = await panel.getByTestId('part-range').boundingBox()
        await page.mouse.move(range.x + range.width / 2, range.y + range.height / 2)
        await page.mouse.down()
        await page.mouse.move(range.x + range.width / 2 + 40, range.y + range.height / 2, { steps: 6 })
        await page.mouse.up()
        await page.waitForTimeout(1200)
        moved = [await panel.getByTestId('part-start').inputValue(), await panel.getByTestId('part-length').textContent()]
        await shot('4-youtube-pick')
        await panel.locator('select').selectOption('ar')
        await page.waitForTimeout(500)
        await shot('4-youtube-pick-ar')
        const grip = await panel.getByTestId('panel-resize').boundingBox()
        await page.mouse.move(grip.x + 4, grip.y + grip.height / 2)
        await page.mouse.down()
        await page.mouse.move(grip.x + 160, grip.y + grip.height / 2, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(300)
        await shot('4-youtube-pick-ar-wide')
        await panel.locator('select').selectOption('en')
        await page.waitForTimeout(300)
        await use.click()
        await page.waitForTimeout(2000)
        await shot('4-youtube-recording')
      } else {
        await panel.getByRole('button', { name: 'Get the video' }).click()
      }
      await page.waitForFunction(
        (previous) => {
          const root = document.querySelector('#sound-sticker-maker')?.shadowRoot
          const name = root?.querySelector('[data-testid=picture-name]')?.textContent?.trim() ?? ''
          return (name !== previous && /\.(webm|mp4)$/.test(name)) || root?.querySelector('[role=alert]')
        },
        before,
        { timeout: 120000 },
      )
      await page.waitForTimeout(800)
      await shot(`5-${name}`)
      const alert = await panel
        .locator('[role=alert]')
        .first()
        .textContent({ timeout: 500 })
        .catch(() => null)
      return { picture: await pictureName(), alert, moved }
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
