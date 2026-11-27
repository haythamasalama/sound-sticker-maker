// Captures the README and website images from the real extension on WhatsApp Web.
// Usage: node scripts/capture.mjs  (needs `pnpm build` first; writes media/)
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const extension = resolve('apps/extension/dist')
const out = resolve('media')
const work = mkdtempSync(join(tmpdir(), 'ssm-capture-'))
mkdirSync(out, { recursive: true })

// A short "Yalla!" clip with sound, the same sticker the website's chat shows. Needs an ffmpeg with drawtext
// (set FFMPEG to its path if the system one lacks it).
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
const clip = join(work, 'yalla.mp4')
const font = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
execFileSync(ffmpeg, [
  '-v',
  'error',
  '-y',
  '-f',
  'lavfi',
  '-i',
  'gradients=s=720x720:c0=0xffe7dc:c1=0xffc2ad:x0=0:y0=0:x1=720:y1=720:speed=0.01:rate=30,trim=duration=8',
  '-f',
  'lavfi',
  '-i',
  'aevalsrc=0.6*sin(2*PI*220*t)*abs(sin(2*PI*1.3*t))+0.3*sin(2*PI*330*t)*abs(sin(2*PI*0.7*t)):d=8',
  '-vf',
  `drawtext=fontfile='${font}':text='Yalla!':fontsize=190:fontcolor=0xe0461f:borderw=16:bordercolor=white:x=(w-text_w)/2:y=(h-text_h)/2+26*sin(2*PI*t*1.4)`,
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-shortest',
  clip,
])

const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'ssm-')), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  locale: 'en-US',
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
})
const page = context.pages()[0] ?? (await context.newPage())
await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded' })
// WhatsApp's sign-in screen is replaced by a plain backdrop so the panel is the subject.
await page.addStyleTag({
  content: 'body > *:not(#sound-sticker-maker):not(#ssm-caption){visibility:hidden!important} body{background:#efeae2!important}',
})
// The panel opens from the extension's toolbar icon, which sends the tab this message.
await page.locator('#sound-sticker-maker').waitFor({ state: 'attached', timeout: 30000 })
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
await worker.evaluate(async () => {
  const [tab] = await globalThis.chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
  await globalThis.chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' })
})
const panel = page.locator('#sound-sticker-maker aside')
await panel.waitFor()

async function setTheme(dark) {
  await page.evaluate((on) => {
    document.body.classList.toggle('dark', on)
    document.body.style.setProperty('background', on ? '#0b141a' : '#efeae2', 'important')
  }, dark)
  await page.waitForTimeout(300)
}
const shot = (name) => panel.screenshot({ path: join(out, `${name}.png`) })

await shot('panel-empty')
await panel.getByRole('tab', { name: 'From your device' }).click()
await panel.locator('input[type=file]').first().setInputFiles(clip)
await panel.locator('canvas').waitFor({ timeout: 30000 })
await page.waitForTimeout(1500)
await shot('panel-trim')
await panel.getByRole('button', { name: 'Create sticker' }).click()
await panel.locator('[data-testid=result]').waitFor({ timeout: 60000 })
await page.waitForTimeout(800)
await shot('panel-ready')
await setTheme(true)
await shot('panel-ready-dark')
await panel.locator('select').selectOption('ar')
await page.waitForTimeout(400)
await shot('panel-ready-dark-ar')
await setTheme(false)
await shot('panel-ready-ar')
await panel.locator('select').selectOption('en')

// Wide hero images for the README, 1280×800.
await page.setViewportSize({ width: 1280, height: 800 })
const captions = {
  'hero-light': ['Stickers that talk.', 'Turn any video, GIF or photo plus a sound into a WhatsApp sound sticker, right in WhatsApp Web.'],
  'hero-dark': ['Pick the part. Hear it. Send.', 'Trim on the waveform, preview the square sticker, then send it to one chat or many.'],
}
for (const [name, dark] of [
  ['hero-light', false],
  ['hero-dark', true],
]) {
  await setTheme(dark)
  await page.evaluate(
    ([title, body, on]) => {
      document.getElementById('ssm-caption')?.remove()
      const box = document.createElement('div')
      box.id = 'ssm-caption'
      box.style.cssText = `position:fixed;left:72px;top:50%;transform:translateY(-50%);width:640px;visibility:visible;font-family:system-ui,-apple-system,sans-serif;color:${on ? '#f5f5f7' : '#0a0a0b'}`
      const h = document.createElement('h1')
      h.textContent = title
      h.style.cssText = 'margin:0 0 20px;font-size:60px;line-height:1.05;letter-spacing:-0.03em;font-weight:700'
      const p = document.createElement('p')
      p.textContent = body
      p.style.cssText = `margin:0;font-size:24px;line-height:1.4;color:${on ? '#a3a3a3' : '#565a63'}`
      box.append(h, p)
      document.body.append(box)
    },
    [...captions[name], dark],
  )
  await page.screenshot({ path: join(out, `${name}@2x.png`) })
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', join(out, `${name}@2x.png`), '-vf', 'scale=1280:800', join(out, `${name}.png`)])
}

await context.close()
writeFileSync(join(out, 'README.md'), 'Images made by `node scripts/capture.mjs` from the real extension. Regenerate after UI changes.\n')
console.log(`Saved images in ${out}`)
