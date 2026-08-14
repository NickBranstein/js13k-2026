# js13k 2026 Entry

A game built for [js13kGames 2026](https://js13kgames.com/) — the 13,312 byte
(zipped) game jam.

## Controls

_TBD_

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit type checking
npm run build        # full pipeline: esbuild -> terser -> roadroller -> html -> zip
npm run watch         # rebuild on file changes in src/
npm run size          # print current zip size against the 13,312 byte budget without rebuilding
```

`npm run build` produces `game.zip` at the repo root — this is the
submission artifact. It bundles and minifies everything in `src/` into a
single `index.html` with no external requests, fonts, or assets.

## Source layout

```
src/
  main.ts     entry point, game loop
  game/       game logic (states, entities, levels)
  render/     canvas drawing helpers
  audio/      ZzFX sound defs, music
  html/       unminified index.html template
tools/
  build.mjs   the full build pipeline
```

This repository contains the full, unmangled TypeScript source as required
by the js13k rules. The final submission (`game.zip`) is generated from this
source via `npm run build` and is not committed.
