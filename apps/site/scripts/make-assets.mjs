// Builds the favicons and the 1200×630 share image from brand/icon.svg. Run again whenever the icon changes:
// node apps/site/scripts/make-assets.mjs
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = (path) => fileURLToPath(new URL(path, import.meta.url))
const brand = here('../../../brand/icon.svg')
const pub = (name) => here(`../public/${name}`)

const svg = await readFile(brand, 'utf8')
await copyFile(brand, pub('icon.svg'))
await copyFile(brand, pub('favicon.svg'))

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

async function png(size, name, { pad = 0, background = 'transparent' } = {}) {
  await page.setViewportSize({ width: size, height: size })
  const inner = size - pad * 2
  await page.setContent(
    `<html><body style="margin:0;background:${background}"><div style="width:${size}px;height:${size}px;display:grid;place-items:center">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div></body></html>`,
  )
  return page.screenshot({ path: name ? pub(name) : undefined, omitBackground: background === 'transparent' })
}

await png(256, 'icon-256.png')
await png(512, 'icon-512.png')
await png(192, 'favicon-192.png')
// iOS fills transparent corners with black; give the touch icon the page colour instead.
await png(180, 'apple-touch-icon.png', { background: '#FFFFFF' })

// favicon.ico holding one 48 px PNG, which every current browser reads.
const ico48 = await png(48)
const header = Buffer.alloc(22)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)
header.writeUInt8(48, 6)
header.writeUInt8(48, 7)
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(ico48.length, 14)
header.writeUInt32LE(22, 18)
await writeFile(pub('favicon.ico'), Buffer.concat([header, ico48]))

// The page is about:blank, which can't load file URLs, so the fonts go in as data.
const font = async (file) => `url("data:font/woff2;base64,${(await readFile(pub(`fonts/${file}`))).toString('base64')}") format("woff2")`
const latin = await font('plus-jakarta-sans-latin.woff2')
const sky = await readFile(pub('art/sky-day.svg'), 'utf8')
await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(`<!doctype html><html><head><style>
@font-face { font-family: "Plus Jakarta Sans"; font-weight: 400 700; src: ${latin}; }
body { margin: 0; width: 1200px; height: 630px; overflow: hidden; font-family: "Plus Jakarta Sans", sans-serif; color: #2A120A;
  background: url("data:image/svg+xml;base64,${Buffer.from(sky).toString('base64')}") center bottom / cover; }
.wrap { display: grid; grid-template-columns: 1fr 380px; align-items: center; gap: 40px; height: 100%; padding: 0 90px; box-sizing: border-box; }
.brand { display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 600; letter-spacing: -.015em; }
.brand svg { width: 64px; height: 64px; }
.brand span { color: #B8360F; }
h1 { margin: 44px 0 0; font-size: 92px; line-height: 1.02; letter-spacing: -.035em; font-weight: 700; }
p { margin: 22px 0 0; font-size: 28px; color: #5A3A2E; }
.stk { position: relative; width: 340px; height: 340px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.55); box-shadow: 0 30px 60px -30px rgba(60,20,8,.5); }
.ring { position: absolute; inset: 10px; border-radius: 50%; background: conic-gradient(#E0461F 0 64%, rgba(122,111,106,.25) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px)); }
.word { rotate: -7deg; font-size: 92px; font-weight: 700; color: #E0461F; letter-spacing: -.02em;
  text-shadow: 7px 0 #FFF, -7px 0 #FFF, 0 7px #FFF, 0 -7px #FFF, 5px 5px #FFF, -5px 5px #FFF, 5px -5px #FFF, -5px -5px #FFF, 0 14px 18px rgba(60,20,8,.35); }
.badge { position: absolute; right: 34px; bottom: 34px; width: 58px; height: 58px; border-radius: 50%; background: rgba(24,12,8,.8); display: grid; place-items: center; }
</style></head><body><div class="wrap">
<div><div class="brand">${svg.replace('<svg ', '<svg aria-hidden="true" ')}<div>Sound <span>Sticker Maker</span></div></div>
<h1>Stickers that talk.</h1><p>WhatsApp stickers that play sound, made in your browser.</p></div>
<div class="stk"><i class="ring"></i><span class="word">Yalla!</span>
<span class="badge"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M3 10v4M7.5 6v12M12 3v18M16.5 7v10M21 10v4"/></svg></span></div>
</div></body></html>`)
await page.evaluate('document.fonts.ready')
await page.screenshot({ path: pub('og.png') })
await browser.close()
console.log('Wrote icons, favicons and og.png to apps/site/public')
