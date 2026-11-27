# Changelog

## 0.1.2 - 2026-11-28

### Added

- YouTube links open the video in the panel. Watch it, pause on the moment you like, and the part starts there. Type a
  time to jump to it, and set the length with − and +.
- A close-up bar around the part with a strip for the whole video, zoom in and out, and dragging the part or its ends,
  so a few seconds stay easy to pick in a video of an hour.
- The panel can be made wider or narrower by dragging its edge, and remembers its width.
- When sending fails, the panel shows WhatsApp's own reason under the message.

### Changed

- One version of the extension, from GitHub, with link import built in. The Chrome Web Store build is gone.
- The panel opens from the extension's icon in the browser toolbar. The floating button inside WhatsApp is gone.
- "From a link" is the first tab.
- Stickers stay under 500 KB, WhatsApp's guideline for animated stickers.

### Fixed

- Sound stickers failed to send with "ERROR_UNKNOWN": the sound's length is now sent in whole seconds, as WhatsApp
  requires.
- Pasting or typing in the panel no longer goes to WhatsApp's message box.
- YouTube videos load in about a second, also when the browser blocks autoplay.

## 0.1.1 - 2026-11-27

The first public release: make WhatsApp stickers that play sound, right inside WhatsApp Web.

### Added

- Extension: a panel on WhatsApp Web to choose a video, GIF or photo, keep its sound or add another, trim on the
  waveform, preview the square sticker and send it to the open chat or to several chats.
- Extension: two clear starting points, "From your device" and "From a link".
- Extension: bring in part of a YouTube video, recorded in the panel without opening a tab, or a whole
  TikTok video.
- Engine: animated WebP stickers always under WhatsApp's 1 MB limit, with WhatsApp sticker metadata, and the sound as
  Ogg Opus. Size, frame rate and quality are picked automatically.
- Six languages: English, Arabic, Spanish, Portuguese, Indonesian and Hindi, in light and dark.
- Website with an online maker that runs in your browser, an install guide with steps to copy into any AI assistant,
  and full search data in six languages.

### Fixed

- Security: updated `glob` and `minimatch` in the development tools to patched versions.
- Releases now attach the extension zips.
