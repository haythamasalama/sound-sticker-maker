# Sound Sticker Maker: notes for contributors and coding agents

A Chrome extension that makes WhatsApp stickers with sound inside WhatsApp Web, and a website with an online maker.
Read `docs/ARCHITECTURE.md` first.

## Commands

```bash
pnpm install
pnpm check            # typecheck + lint + format check + tests; must pass
pnpm build            # apps/extension/dist, loadable unpacked
pnpm site             # the website
node scripts/e2e.mjs  # end-to-end run of the extension on WhatsApp Web (no sign-in needed)
```

## Rules

- The sticker engine lives in `packages/core`: no Vue and no `chrome`. Pure parts (formats, planning, links) are tested
  in Node under `packages/core/tests`; browser parts are checked with `scripts/e2e.mjs`.
- Extension feature code goes in `apps/extension/src/features/<feature>`, tests in `apps/extension/tests`.
- Anything that touches WhatsApp's internal modules stays in `apps/extension/src/page/whatsapp.ts`.
- Use the vendored shadcn-vue components and semantic colour tokens. No raw colours in components.
- Every user-facing string exists in English and Arabic.
- Comments only for a non-obvious reason. No comments that restate the code.
- Commits follow Conventional Commits. Short subjects, no AI attribution lines.
- No third-party hosts at runtime: no remote fonts, analytics or CDNs (see `PRIVACY.md`).
