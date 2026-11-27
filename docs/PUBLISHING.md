# Publishing

Everything ships from one tag. Do these once, then every release is `pnpm release:version x.y.z`, a changelog entry and
a `vx.y.z` tag (see [RELEASING.md](RELEASING.md)).

## Chrome Web Store (the extension most people install)

1. Create a developer account at the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole)
   (a one-time US$5 fee) and verify your email.
2. **New item** → upload `sound-sticker-maker-<version>-store.zip` from the GitHub release.
3. Fill in the listing from [STORE_LISTING.md](STORE_LISTING.md): name, descriptions in each language, category
   Communication, icon, screenshots (1280×800) and the small promo tile (440×280).
4. **Privacy practices**: single purpose, the `storage` and `web.whatsapp.com` justifications, no remote code, no data
   collected (all in STORE_LISTING.md). Link the privacy policy page of the website.
5. Submit for review. It usually takes a few days. After approval, put the store link in `apps/site` (the `STORE_URL`
   constant) so the site shows an "Add to Chrome" button.

Updates: upload the new store zip on the same item; Chrome updates everyone automatically.

## GitHub (the full version, with YouTube and TikTok)

Pushing a `v*` tag runs the **Release** workflow: it builds both zips and attaches them to a GitHub release. People install the GitHub zip with **Load unpacked**
(steps in the README and on the website).

## Website

The **Site** workflow deploys to GitHub Pages on every push to `main`. Turn on Pages once: Settings → Pages → Source:
GitHub Actions. For your own subdomain, see the end of [RELEASING.md](RELEASING.md).

## Getting found

- The site has full SEO and answer-engine data (JSON-LD, sitemap, hreflang in six languages, `llms.txt`).
- Submit the sitemap in [Google Search Console](https://search.google.com/search-console) and
  [Bing Webmaster Tools](https://www.bing.com/webmasters).
- Add the repository topics `whatsapp`, `stickers`, `sound-stickers`, `chrome-extension`.
