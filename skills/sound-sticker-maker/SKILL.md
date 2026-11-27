---
name: sound-sticker-maker
description: Make WhatsApp stickers that play sound from a video, GIF or photo plus any audio, using the sound-sticker-maker MCP server. Use when the user asks for a sound sticker, a sticker with sound or audio, a talking sticker, or to turn a clip, meme, GIF or photo with a voice note into a WhatsApp sticker. Triggers include "sound sticker", "sticker with sound", "audio sticker", "make this a WhatsApp sticker", «ملصق بصوت», «ستيكر بصوت», «اعمل ستيكر», "sticker con sonido", "figurinha com som", "stiker bersuara", "आवाज़ वाला स्टिकर".
---

# Sound Sticker Maker

Makes a WhatsApp sound sticker: a 512×512 animated WebP under WhatsApp's 1 MB limit, with sticker metadata, plus its
sound as an Ogg Opus file. The work is done by the `sound-sticker-maker` MCP server's tools.

## If the tools are missing

The tools are `make_sound_sticker` and `inspect_media`. If they aren't available, install the server, then ask the user to
restart their app:

- Claude Code: `claude mcp add sound-sticker-maker -- npx -y sound-sticker-maker-mcp`
- Claude Desktop: download `sound-sticker-maker.mcpb` from
  https://github.com/haythamasalama/sound-sticker-maker/releases/latest and double-click it.
- Other agents: add `{"mcpServers":{"sound-sticker-maker":{"command":"npx","args":["-y","sound-sticker-maker-mcp"]}}}`.

## How to make one

1. Find the files. Use the paths the user gives; `~` is their home folder. If they only describe a file ("the video I
   just downloaded"), look in Downloads for the newest match and confirm it with them.
2. If you need the length or want to check there is sound, call `inspect_media`.
3. Call `make_sound_sticker`:
   - `picture`: the video, GIF or photo.
   - `sound`: only when the sound comes from another file (a song, a voice note). Without it, the video's own sound is used.
   - `start` and `duration`: the part to keep, in seconds. Keep it to 10 seconds or less unless asked; 30 is the maximum.
     For a separate sound, `sound_start` picks where the sound begins.
   - `shape`: `contain` keeps the whole picture (default); `cover` fills the square, cropping the edges.
   - `pack_name` and `author`: only if the user gives them.
4. Tell the user where the two files were saved (Downloads by default) and how to send it, in their language:
   - With the Sound Sticker Maker extension on WhatsApp Web: open the panel, choose the video, and send.
   - Or in WhatsApp's own sticker editor (on versions that support sound stickers): create a sticker from the WebP and add
     the sound.

## Good to know

- YouTube and TikTok page links can't be read by the server. Ask the user to use the extension's "From a link" tab, or to
  save the video and give you the file.
- Friends hear the sound on WhatsApp versions that support sound stickers; others see the moving sticker.
- Answer in the user's language. Keep the steps short: many users are not technical.
