# Releasing

1. `pnpm release:version 0.2.0` sets the version in `manifest.json` and every `package.json`.
2. Move the `## Unreleased` entries in `CHANGELOG.md` under `## 0.2.0 - <date>`. `pnpm release:notes 0.2.0` prints the
   notes and fails if the section is missing.
3. Test sending by hand: load `apps/extension/dist/github` unpacked, sign in to WhatsApp Web, and send one sticker from
   a video, one from a GIF with a song and one from a picture with a voice note, to yourself and to a second phone.
   Check the sound plays on Android and iPhone.
4. Merge, then push a tag such as `v0.2.0`. The **Release** workflow runs the checks, builds both zips, checks that the
   tag matches `manifest.json`, and creates a GitHub release with the changelog section and both zips:
   - `sound-sticker-maker-<version>-store.zip`: upload this one to the Chrome Web Store.
   - `sound-sticker-maker-<version>-github.zip`: for people who install by hand (with YouTube and TikTok links).
5. Upload the store zip in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole). The
   listing text and privacy answers are in [STORE_LISTING.md](STORE_LISTING.md).

## Website

The **Site** workflow deploys `apps/site` to GitHub Pages at https://sound-sticker-maker.haythamasalama.me on every push
to `main` that touches it. The domain is set by `apps/site/public/CNAME` and a DNS `CNAME` record for
`sound-sticker-maker` pointing at `haythamasalama.github.io`.
