# Sound Sticker Maker

## What it is

A Chrome extension and website for making WhatsApp stickers that play sound. The extension adds a panel to WhatsApp
Web; the website has an online maker that downloads the files.

## Who uses it

People who chat on WhatsApp Web, often in Arabic, who want to turn a funny moment (a clip, a GIF, a photo with a voice
note) into a sound sticker in under a minute. Casual users, not editors.

## The task

1. Bring a picture: a video file, GIF, image, or (GitHub build) a YouTube or TikTok link.
2. Keep the sound from the video or add another one.
3. Pick the few seconds to keep (10 seconds or less works best).
4. Create, hear it, send it to the open chat or to several chats.

## Truths and constraints

- Everything runs in the browser; nothing is uploaded except to WhatsApp on send.
- WhatsApp caps stickers at 1 MB and shows them at 512×512, so the result is square.
- The panel lives on top of WhatsApp Web, inside a shadow root, about 380 px wide. Arabic (RTL) and English, light and
  dark following WhatsApp's theme.
- It must not resemble other sound-sticker extensions: no numbered step circles, no dashed upload box, no language pill.
- Brand: the talking round sticker icon on coral `#E0461F`. Free and open source (MIT).
