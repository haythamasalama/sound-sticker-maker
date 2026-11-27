#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import { ffmpegPath } from './ffmpeg'
import { inspect, localPath } from './media'
import { makeSoundSticker } from './sticker'

declare const __VERSION__: string

const server = new McpServer(
  { name: 'sound-sticker-maker', version: __VERSION__ },
  {
    instructions:
      'Makes WhatsApp stickers that play sound (an animated WebP plus an Ogg Opus sound) from a video, GIF or photo and any audio. ' +
      'Call inspect_media first when you need the length of a file, then make_sound_sticker. Keep stickers at 10 seconds or less. ' +
      'Files are written to the Downloads folder unless output_dir is given. To send one as a sound sticker, the user opens WhatsApp Web ' +
      'with the Sound Sticker Maker extension, or uses WhatsApp’s own sticker editor with the WebP and the sound.',
  },
)

const fail = (error: unknown) => ({ content: [{ type: 'text' as const, text: String((error as Error)?.message ?? error) }], isError: true })

server.registerTool(
  'inspect_media',
  {
    title: 'Inspect a media file',
    description: 'Tells whether a file is a video, GIF, photo or sound, how long it is, its size and whether it has audio.',
    inputSchema: z.object({ path: z.string().describe('Path to a local file, or an http(s) link to a media file') }),
    annotations: { readOnlyHint: true },
  },
  async ({ path }) => {
    try {
      const info = await inspect(await ffmpegPath(), await localPath(path))
      return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }], structuredContent: { ...info } }
    } catch (error) {
      return fail(error)
    }
  },
)

server.registerTool(
  'make_sound_sticker',
  {
    title: 'Make a sound sticker',
    description:
      'Makes a WhatsApp sound sticker: a 512×512 animated WebP under 1 MB with WhatsApp sticker metadata, and its sound as Ogg Opus. ' +
      'Without "sound", the video’s own sound is used. A picture shorter than the sound loops; a photo stays still for the whole sound.',
    inputSchema: z.object({
      picture: z.string().describe('Video, GIF or photo: a local path or an http(s) link to the file'),
      sound: z
        .string()
        .optional()
        .describe('Optional separate sound (MP3, M4A, WAV, voice note or any video). Defaults to the video’s own sound.'),
      start: z.number().min(0).optional().describe('Second of the video to start from (default 0)'),
      duration: z.number().min(0.3).max(30).optional().describe('Length in seconds (default 10, 30 at most)'),
      sound_start: z.number().min(0).optional().describe('Second of the separate sound to start from (default 0)'),
      shape: z
        .enum(['contain', 'cover'])
        .optional()
        .describe('"contain" keeps the whole picture, "cover" fills the square (default contain)'),
      pack_name: z.string().max(128).optional().describe('Sticker pack name shown in WhatsApp'),
      author: z.string().max(128).optional().describe('Author shown in WhatsApp'),
      output_dir: z.string().optional().describe('Folder for the two files (default: Downloads)'),
    }),
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  async (args) => {
    try {
      const made = await makeSoundSticker({
        picture: args.picture,
        sound: args.sound,
        start: args.start,
        duration: args.duration,
        soundStart: args.sound_start,
        shape: args.shape,
        packName: args.pack_name,
        author: args.author,
        outputDir: args.output_dir,
      })
      const summary = [
        `Sticker: ${made.webp} (${Math.round(made.webpBytes / 1000)} KB, ${made.side} px${made.fps ? `, ${made.fps} fps` : ''})`,
        `Sound: ${made.audio} (${made.seconds} s)`,
        'Send it from WhatsApp Web with the Sound Sticker Maker extension, or in WhatsApp’s sticker editor.',
      ].join('\n')
      return { content: [{ type: 'text', text: summary }], structuredContent: { ...made } }
    } catch (error) {
      return fail(error)
    }
  },
)

await server.connect(new StdioServerTransport())
