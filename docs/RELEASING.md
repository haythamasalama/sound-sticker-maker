# Releasing

1. `pnpm release:version 0.2.0` sets the version in `manifest.json` and every `package.json`.
2. Move the `## Unreleased` entries in `CHANGELOG.md` under `## 0.2.0 - <date>`. `pnpm release:notes 0.2.0` prints the
   notes and fails if the section is missing.
3. Test sending by hand: load `apps/extension/dist` unpacked, sign in to WhatsApp Web, and send one sticker from
   a video, one from a GIF with a song and one from a picture with a voice note, to yourself and to a second phone.
   Check the sound plays on Android and iPhone.
4. Merge, then push a tag such as `v0.2.0`. The **Release** workflow runs the checks, builds the zip, checks that the
   tag matches `manifest.json`, and creates a GitHub release with the changelog section and
   `sound-sticker-maker-<version>.zip` attached.

## Website

The **Site** workflow deploys `apps/site` to GitHub Pages at https://sound-sticker-maker.haythamasalama.me on every push
to `main` that touches it. The domain is set by `apps/site/public/CNAME` and a DNS `CNAME` record for
`sound-sticker-maker` pointing at `haythamasalama.github.io`.
