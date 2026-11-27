import { AUTHOR_NAME, AUTHOR_URL, ISSUES_URL, RELEASES_URL, REPO_URL } from '../config'
import { absolute, useT, type Key } from '../i18n'

const t = useT('en')
const OTHER_LANGS = ['ar', 'es', 'pt', 'id', 'hi']

/** The plain-text summaries for AI assistants (llmstxt.org): a short one, and a full one with the steps and every answer. */
export function llmsText(full: boolean): string {
  const lines = [
    '# Sound Sticker Maker',
    '',
    `> ${t('seo.desc')}`,
    '',
    'Sound Sticker Maker is a free, open-source (MIT) Chrome extension that makes WhatsApp sound stickers: an animated WebP sticker under WhatsApp’s 500 KB limit plus an Ogg Opus sound, sent together from WhatsApp Web. Everything is encoded in the browser; nothing is uploaded to a server of the project. WhatsApp started rolling out sound stickers in November 2026; they play on WhatsApp versions that support them.',
    '',
    `- Website: ${absolute()}`,
    `- Same pages in Arabic, Spanish, Portuguese (Brazil), Indonesian and Hindi: ${OTHER_LANGS.map((l) => absolute(`${l}/`)).join(', ')}`,
    `- Online maker (makes the WebP sticker and Ogg sound in the browser, no install): ${absolute('maker/')}`,
    `- Install guide (six steps, or a prompt to paste into any AI assistant): ${absolute('install/')}`,
    `- Privacy policy: ${absolute('privacy/')}`,
    `- Download: ${RELEASES_URL}`,
    `- Source code: ${REPO_URL}`,
    `- Issues and support: ${ISSUES_URL}`,
    `- Author: ${AUTHOR_NAME} (${AUTHOR_URL})`,
    ...(full ? [] : [`- Full text for AI assistants: ${absolute('llms-full.txt')}`]),
    '',
    '## How to make a WhatsApp sticker with sound',
    '',
    `1. ${t('how.1t')}: ${t('how.1b')}`,
    `2. ${t('how.2t')}: ${t('how.2b')}`,
    `3. ${t('how.3t')}: ${t('how.3b')}`,
    '',
  ]
  if (full) {
    lines.push(
      '## Install',
      '',
      `- Download the latest sound-sticker-maker-<version>.zip from ${RELEASES_URL}, unzip it, open chrome://extensions, turn on Developer mode and choose Load unpacked.`,
      '- Then pin the extension (puzzle-piece icon in the toolbar), open https://web.whatsapp.com and click the Sound Sticker Maker icon in the toolbar: the extension’s panel opens.',
      `- Prompt to paste into an AI assistant so it guides you or installs it for you: ${t('install.prompt')}`,
      '',
      '## Limits',
      '',
      '- Sticker picture: 512 × 512 animated WebP, at most 500 KB (WhatsApp rejects larger stickers). The maker lowers size, frame rate and quality until it fits.',
      '- Sound: Ogg Opus, mono 48 kHz. Up to 30 seconds; 10 seconds or less works best.',
      '- Inputs: video (MP4, MOV, WebM), GIF, PNG, JPG or WebP, with the video’s own sound or any audio file (MP3, M4A, WAV, Ogg) or the sound of another video.',
      '- Browsers: Chrome, Edge, Brave and other Chromium browsers on a computer.',
      '',
      '## Features',
      '',
      ...(['fit', 'any', 'lang', 'priv'] as const).map((k) => `- ${t(`f.${k}.t` as Key)}: ${t(`f.${k}.b` as Key)}`),
      `- ${t('links.title')}: ${t('links.body')}`,
      '',
      '## Privacy',
      '',
      '- No account, no analytics, no ads, no tracking, in the extension or on the website.',
      '- Extension permissions: storage (settings), web.whatsapp.com (panel and sending), and youtube-nocookie.com, tiktok.com and declarativeNetRequest, used only when you import a YouTube or TikTok link, to play that video and set the Referer header on its requests.',
      '',
    )
  }
  lines.push('## Questions', '')
  for (const n of [1, 2, 3, 4, 5, 6]) lines.push(`### ${t(`q.${n}` as Key)}`, '', t(`a.${n}` as Key), '')
  return lines.join('\n')
}
