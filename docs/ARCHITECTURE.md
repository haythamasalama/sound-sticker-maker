# Architecture

```
packages/core      The sticker engine (TypeScript source, no build step)
packages/mcp       MCP server for AI assistants (npm: sound-sticker-maker-mcp, Claude Desktop: .mcpb)
skills             Agent skill that teaches assistants to use the MCP server
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
   the real file is over 1 MB, quality steps down, then the next pair is tried.
4. **File** (`format/webp.ts`, `format/sticker-metadata.ts`): frames are WebP stills from `OffscreenCanvas`, joined
   into an animated WebP with an EXIF block holding WhatsApp's sticker metadata (pack id, name, author, emoji and the
   sound's SHA-256).

Errors are `StickerError` with a `code`; the interfaces translate codes, never messages.

## The extension (`apps/extension`)

| Script           | World                         | Does                                                                                               |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `content.js`     | isolated, web.whatsapp.com    | The panel (Vue in a shadow root) and the engine.                                                   |
| `page.js`        | page (MAIN), web.whatsapp.com | Uses WhatsApp Web's own modules to upload the sound and send the sticker (`src/page/whatsapp.ts`). |
| `background.js`  | service worker                | Toolbar button; in the GitHub build, TikTok downloads and header rules.                            |
| `player.html/js` | extension page                | GitHub build: hidden page inside WhatsApp that hosts the YouTube player.                           |
| `youtube.js`     | youtube-nocookie.com embeds   | GitHub build: records the requested part from the player.                                          |

The panel and `page.js` talk over `window.postMessage` with a typed protocol (`src/lib/bridge.ts`); the sticker bytes
are transferred, not copied.

**Sending.** WhatsApp has no public API for sound stickers. `page.js` turns on WhatsApp's sound-sticker flags locally,
uploads the Ogg as an audio media item, then sends the WebP as a sticker message with a `stickerAudio` field, as
WhatsApp's own editor does. `missingModules()` reports when WhatsApp renames a module, and the panel warns.

**YouTube (GitHub build).** WhatsApp Web is cross-origin isolated (`COEP: require-corp`) and its CSP blocks
youtube-nocookie.com. The panel adds a hidden, `credentialless` frame with the extension's `player.html`, which embeds
the youtube-nocookie player. YouTube refuses embeds whose referrer is not a website, so a session rule sets the referrer
on those frame requests only. `youtube.js` records the part with `captureStream()` at volume 0 (the stream keeps the
sound) and sends the WebM back through the background. Nothing opens in a tab and nothing is heard.

**TikTok (GitHub build).** The background fetches the video page, reads the video address from its JSON data and
downloads the MP4. TikTok's servers require a TikTok referrer and the cookie the page sets; a session rule adds the
referrer to the extension's own requests.

**Two builds.** `scripts/build.mjs store|github` builds each entry as an IIFE with Vite. `__LINKS__` is false in the
store build, `LinkImport.vue` is replaced by an empty component, and link strings live only in
`features/picture/linkText.ts`, so the store build contains no YouTube or TikTok code or text.

## Checks

- `pnpm check`: types, lint, formatting and unit tests (Node for the engine's pure parts, happy-dom for the extension).
- `node scripts/e2e.mjs github`: loads the built extension in Chromium, opens WhatsApp Web, makes a sticker from a
  video, imports a YouTube and a TikTok link, and switches to Arabic. Sending needs a signed-in account and is tested by
  hand.

## The MCP server (`packages/mcp`)

AI assistants run tools on the user's computer, not in a browser, so the server makes stickers with ffmpeg and reuses
the engine's format code (`@sound-sticker-maker/core/format`) for the WhatsApp metadata and still-picture stickers. It
uses `FFMPEG_BIN`, else a system ffmpeg that has `libwebp_anim` and `libopus`, else downloads a portable ffmpeg once into
the user's cache folder. Sizes are tried from 512 px at 20 fps down until the WebP fits 1 MB. Tools: `make_sound_sticker`
and `inspect_media`. `pnpm --filter sound-sticker-maker-mcp bundle` builds the self-contained Claude Desktop installer.
