# Contributing

Thanks for helping. Read [AGENTS.md](AGENTS.md) for the rules and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how
it fits together.

1. Fork, then `pnpm install`.
2. Make your change on a branch, with tests where it makes sense.
3. `pnpm check` must pass. For changes to sending or link import, also run `node scripts/e2e.mjs` and test sending by
   hand.
4. Add a line under `## Unreleased` in `CHANGELOG.md`.
5. Open a pull request with a Conventional Commits title, such as `fix(core): keep the last frame on short GIFs`.

Every user-facing string needs English and Arabic.
