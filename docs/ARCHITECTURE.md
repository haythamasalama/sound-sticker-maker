# Architecture

```
packages/core      The sticker engine (TypeScript source, no build step)
apps/extension     The Chrome extension (Vue 3, Tailwind 4, shadcn-vue, Vite)
apps/site          The website and online maker (Astro), deployed to GitHub Pages
scripts            Release helpers and the end-to-end check
brand              Icon sources
```

## The engine (`packages/core`)

`createSoundSticker({ visual, audio, shape, fit, packName, publisher, signal, onProgress })` returns an animated WebP
and an Ogg Opus sound.

1. **Sound** (`media/audio.ts`): decode with `OfflineAudioContext`, cut and mix to mono 48 kHz, encode with WebCodecs
   `AudioEncoder`, wrap in Ogg (`format/ogg-opus.ts`). The bitrate drops on long clips to stay under 1 MB.
2. **Frames** (`media/video.ts`, `media/still.ts`): videos are read by seeking a `<video>` to the middle of every frame
   slot; GIF, animated WebP and APNG through `ImageDecoder`; pictures through `createImageBitmap`. Each frame is drawn
   into a square and fingerprinted (32×32) so identical frames merge. WebM recorded by `MediaRecorder` reports an
   infinite duration; `loadVideo` makes Chrome read the real one first.
3. **Size** (`plan.ts`): (side, fps) pairs are tried in preference order (smooth first, then large). A few sample frames
   are encoded per side and quality to estimate the result, and the first estimate under 900 KB is encoded in full. If
   the real file is over 500 KB, quality steps down, then the next pair is tried.
4. **File** (`format/webp.ts`, `format/sticker-metadata.ts`): frames are WebP stills from `OffscreenCanvas`, joined
   into an animated WebP with an EXIF block holding WhatsApp's sticker metadata (pack id, name, author, emoji and the
   sound's SHA-256).

Errors are `StickerError` with a `code`; the interfaces translate codes, never messages.

## The extension (`apps/extension`)

| Script           | World                         | Does                                                                                               |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `content.js`     | isolated, web.whatsapp.com    | The panel (Vue in a shadow root) and the engine.                                                   |
| `page.js`        | page (MAIN), web.whatsapp.com | Uses WhatsApp Web's own modules to upload the sound and send the sticker (`src/page/whatsapp.ts`). |
| `background.js`  | service worker                | Toolbar button, TikTok downloads, header rules, and requests from the website.                     |
| `player.html/js` | extension page                | Page inside the panel that hosts the YouTube player while it records.                              |
| `youtube.js`     | youtube-nocookie.com embeds   | Records the requested part from the player.                                                        |

The panel and `page.js` talk over `window.postMessage` with a typed protocol (`src/lib/bridge.ts`); the sticker bytes
are transferred, not copied.

**Sending.** WhatsApp has no public API for sound stickers. `page.js` turns on WhatsApp's sound-sticker flags locally,
uploads the Ogg as an audio media item, then sends the WebP as a sticker message with a `stickerAudio` field, as
WhatsApp's own editor does. `missingModules()` reports when WhatsApp renames a module, and the panel warns.

**YouTube.** WhatsApp Web is cross-origin isolated (`COEP: require-corp`) and its CSP blocks
youtube-nocookie.com. The panel adds a hidden, `credentialless` frame with the extension's `player.html`, which embeds
the youtube-nocookie player. YouTube refuses embeds whose referrer is not a website, so a session rule sets the referrer
on those frame requests only. `youtube.js` records the part with `captureStream()` at volume 0 (the stream keeps the
sound) and sends the WebM back through the background. Nothing opens in a tab and nothing is heard.

**TikTok.** The background fetches the video page, reads the video address from its JSON data and
downloads the MP4. TikTok's servers require a TikTok referrer and the cookie the page sets; a session rule adds the
referrer to the extension's own requests.

**Build.** `scripts/build.mjs` builds each entry as an IIFE with Vite into `dist/`, which loads unpacked as is;
`scripts/package.mjs` zips it for the GitHub release. The manifest's `key` keeps the extension ID the same wherever
it is loaded from, so the website's maker can reach it.

## Checks

- `pnpm check`: types, lint, formatting and unit tests (Node for the engine's pure parts, happy-dom for the extension).
- `node scripts/e2e.mjs`: loads the built extension in Chromium, opens WhatsApp Web, makes a sticker from a
  video, imports a YouTube and a TikTok link, and switches to Arabic. Sending needs a signed-in account and is tested by
  hand.
