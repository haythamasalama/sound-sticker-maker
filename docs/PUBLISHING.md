# Publishing

Everything ships from one tag. Do these once, then every release is `pnpm release:version x.y.z`, a changelog entry and
a `vx.y.z` tag (see [RELEASING.md](RELEASING.md)).

## GitHub

Pushing a `v*` tag runs the **Release** workflow: it builds the extension zip and attaches it to a GitHub release. People install it with **Load unpacked**
(steps in the README and on the website).

## Website

The **Site** workflow deploys to GitHub Pages on every push to `main`. Turn on Pages once: Settings → Pages → Source:
GitHub Actions. For your own subdomain, see the end of [RELEASING.md](RELEASING.md).

## Getting found

- The site has full SEO and answer-engine data (JSON-LD, sitemap, hreflang in six languages, `llms.txt`).
- Submit the sitemap in [Google Search Console](https://search.google.com/search-console) and
  [Bing Webmaster Tools](https://www.bing.com/webmasters).
- Add the repository topics `whatsapp`, `stickers`, `sound-stickers`, `chrome-extension`.
