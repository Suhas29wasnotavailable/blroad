# Contributing to BLRoad

Thanks for helping make Bengaluru's roads easier to think about. Ideas, bug reports, new hotspots and better local knowledge are all welcome, and you don't need to write code to help.

## Ways to help

- **Local knowledge.** Hotspots live in `src/shared/areas.ts`, and their `context` text is fed to the model. If you know a junction well, better coordinates and context improve every review.
- **Bugs and ideas.** Open an issue. For a bug, include what you typed, which area you picked, and a screenshot.
- **Code.** Pick an open issue, or open one first for anything large, so we can agree on the approach before you build it.

## Running it locally

You need Node 20+. An Anthropic API key is optional: without one the app runs in demo mode, which is enough for most UI work.

```bash
npm install
cp .env.example .env   # optionally add ANTHROPIC_API_KEY
npm run dev            # http://localhost:5173
```

## Before opening a pull request

1. Branch off `main`.
2. Run `npm run lint`, `npm test` and `npm run build`. CI runs all three on every pull request.
3. Try your change in the browser. Add a screenshot to the PR if the UI changed.
4. Keep PRs focused: one change per PR is much easier to review.

## How the code is organised

[`CLAUDE.md`](CLAUDE.md) is the full guide: how a request flows through the app, how the AI review works, the data schema, road snapping, demo mode, compare mode and the frontend. It's written for both people and AI coding assistants, so it's the fastest way in.

Some conventions:

- `src/shared/schema.ts` is the contract between server and client. If you change it, update `KIND_STYLE`/`FACTOR_LABEL` in `src/featureStyle.ts` and the demo rules in `server/demo.ts`.
- Every external call (Claude, OSRM routing, map tiles) has a fallback, so the app works with no key and no routing. Keep it that way.
- **Design:** flat dark surfaces, thin dividing lines instead of boxes, one yellow accent, IBM Plex Mono for labels and numbers, and no gradients or glow in the interface. See the Styling section of `CLAUDE.md`.
- Never commit `.env` or API keys.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
