# Sound Sticker Maker: notes for contributors and coding agents

A Chrome extension that makes WhatsApp stickers with sound inside WhatsApp Web, and a website with an online maker.
Read `docs/ARCHITECTURE.md` first.

## Commands

```bash
pnpm install
pnpm check            # typecheck + lint + format check + tests; must pass
pnpm build            # apps/extension/dist/store and apps/extension/dist/github, each loadable unpacked
pnpm site             # the website
node scripts/e2e.mjs  # end-to-end run of the GitHub build on WhatsApp Web (no sign-in needed)
```

## Rules

- The sticker engine lives in `packages/core`: no Vue and no `chrome`. Pure parts (formats, planning, links) are tested
  in Node under `packages/core/tests`; browser parts are checked with `scripts/e2e.mjs`.
- Extension feature code goes in `apps/extension/src/features/<feature>`, tests in `apps/extension/tests`.
- Anything that touches WhatsApp's internal modules stays in `apps/extension/src/page/whatsapp.ts`.
- YouTube and TikTok code must stay out of the store build: guard it with `__LINKS__` or keep it in files only the
  GitHub build includes. Check with `grep -ci "youtube\|tiktok" apps/extension/dist/store/*.js` (must be 0).
- Use the vendored shadcn-vue components and semantic colour tokens. No raw colours in components.
- Every user-facing string exists in English and Arabic.
- Comments only for a non-obvious reason. No comments that restate the code.
- Commits follow Conventional Commits. Short subjects, no AI attribution lines.
- No third-party hosts at runtime: no remote fonts, analytics or CDNs (see `PRIVACY.md`).
