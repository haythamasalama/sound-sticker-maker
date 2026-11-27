# Privacy

Sound Sticker Maker has no account, no analytics and no servers. Last updated 2026-11-27.

## What it handles

- **Your files.** Videos, pictures and sounds you choose are read and turned into a sticker inside your browser. They
  are never uploaded anywhere by the extension or the website.
- **Sending.** When you press Send, the sticker and its sound go to WhatsApp through WhatsApp Web itself, the same way
  WhatsApp sends any sticker you make in its own editor.
- **Settings.** Your language, pack name, author name and last chosen destination are kept in the extension's local
  storage (`chrome.storage.local`) on your computer.

## Permissions

| Permission         | Why                                                        |
| ------------------ | ---------------------------------------------------------- |
| `storage`          | Remember your language, pack name, author and destination. |
| `web.whatsapp.com` | Show the panel and send stickers in WhatsApp Web.          |

These are used only when you import a link you paste:

| Permission                            | Why                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `www.youtube-nocookie.com`            | Play the part of the YouTube video you chose in a hidden player and record it.          |
| `*.tiktok.com`                        | Download the TikTok video you linked.                                                   |
| `declarativeNetRequestWithHostAccess` | Set the `Referer` header those two sites require, on the extension's own requests only. |

## The website

The website is static and hosted on GitHub Pages. Its online maker runs entirely in your browser. It uses no cookies, no
analytics and no third-party fonts or scripts. GitHub may keep standard server logs as described in
[GitHub's privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).

## Contact

Open an issue on [GitHub](https://github.com/haythamasalama/sound-sticker-maker/issues).
