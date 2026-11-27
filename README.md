<p align="center">
  <img src="brand/icon.svg" alt="" width="84" />
</p>

<h1 align="center">Sound Sticker Maker</h1>

<p align="center"><strong>Make WhatsApp stickers that play sound.</strong></p>

<p align="center">
  <a href="https://github.com/haythamasalama/sound-sticker-maker/releases/latest"><strong>⬇️ Download</strong></a> ·
  <a href="https://haythamasalama.github.io/sound-sticker-maker/">🌐 Website</a> ·
  <a href="https://haythamasalama.github.io/sound-sticker-maker/maker/">🎨 Try it online</a> ·
  <a href="CHANGELOG.md">📝 Changelog</a>
</p>

<p align="center">
  <a href="https://github.com/haythamasalama/sound-sticker-maker/actions/workflows/ci.yml"><img src="https://github.com/haythamasalama/sound-sticker-maker/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/haythamasalama/sound-sticker-maker/releases/latest"><img src="https://img.shields.io/github/v/release/haythamasalama/sound-sticker-maker?label=version&color=black" alt="Latest version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-black.svg" alt="MIT license" /></a>
</p>

Pick a video, a GIF or a picture, add any sound, keep the best few seconds, and send it as a sound sticker right inside
WhatsApp Web. Everything happens in your browser. Nothing is uploaded anywhere except to WhatsApp when you press Send.

## ✨ What it does

- **Any picture, any sound.** A video with its own sound, a GIF with a song, a photo with a voice note.
- **Trim with your eyes and ears.** A waveform and a live preview show exactly what you get.
- **Always under 1 MB.** WhatsApp rejects bigger stickers, so size, frame rate and quality are picked for you.
- **Send or forward.** To the open chat, or to your own chat and then to as many chats as you like.
- **Six languages:** English, Arabic, Spanish, Portuguese, Indonesian and Hindi, light and dark.
- **YouTube and TikTok links** in the GitHub version: paste a link, choose the part, done. Nothing opens in a new tab.

## 📦 Install

**From GitHub (includes YouTube and TikTok links)**

1. Download `sound-sticker-maker-<version>-github.zip` from the [latest release](https://github.com/haythamasalama/sound-sticker-maker/releases/latest) and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose the unzipped folder.
3. Open [web.whatsapp.com](https://web.whatsapp.com) and click the orange button, or the extension's toolbar icon.

Works in Chrome, Edge, Brave, Arc, Dia and other Chromium browsers (version 120 or later).

**From the Chrome Web Store:** coming soon. That version leaves out YouTube and TikTok links, because the store doesn't
allow saving media from other sites.

## 🔊 Will my friends hear it?

Sound stickers are new in WhatsApp (rolling out since November 2026). Friends whose WhatsApp supports them hear the
sound when they tap the sticker; others see the moving sticker without sound.

## ⚠️ Good to know

WhatsApp has no public way for other apps to send sound stickers. The extension uses WhatsApp Web's own internal
features, the same ones its sticker editor uses. WhatsApp can change them at any time, which can stop sending until the
extension is updated. Use it at your own discretion.

## 🔒 Privacy

No account, no analytics, no servers of ours. Your files never leave your browser except when you send a sticker
through WhatsApp. See [PRIVACY.md](PRIVACY.md).

## 🛠️ Develop

```bash
pnpm install
pnpm check            # typecheck + lint + format check + tests
pnpm build            # builds apps/extension/dist/store and apps/extension/dist/github
pnpm site             # runs the website locally
node scripts/e2e.mjs  # loads the GitHub build into Chromium and walks through WhatsApp Web
```

Load `apps/extension/dist/github` (or `dist/store`) with **Load unpacked**. The layout is explained in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and releasing in [docs/RELEASING.md](docs/RELEASING.md).

## 📄 License

[MIT](LICENSE) © 2026 Haytham A. Salama.
