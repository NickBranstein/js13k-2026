# 🦄 Rainbow Depths

A procedural unicorn dungeon crawl, built for [js13kGames 2026](https://js13kgames.com/)
— theme "unicorns and rainbows" — under the 13,312-byte (zipped) budget.

**[▶ Try it](https://nickbranstein.github.io/js13k-2026/)**

Descend a linear sequence of dungeon floors as a procedurally generated unicorn,
fighting turn-based, menu-driven battles against procedurally generated monsters
(10 archetypes, each with its own suffix-driven silhouette variants). Everything
is drawn from code and seeded traits — no sprite sheets, no external assets, no
network requests. Permadeath: HP persists across floors, and a run ends when it
runs out.

## Controls

- **↑ / ↓** or **W / S** — move the command-bar selection
- **Enter** or **Space** — confirm the selected option
- **M** — mute / unmute audio

Every screen (battle actions, Treasure Collect/Leave, floor advances, menus)
is driven by the same keyboard-only command bar.

### The gist

- **Attack / Potion / Charm** in battle — Charm (driven by a Charisma stat) gives
  a small chance to win without fighting; Potions heal a percentage of max HP and
  aren't guaranteed every fight, so use them deliberately.
- **Treasure** rooms heal on Collect and have a chance to drop a permanent
  "Rainbow Fruit" mutation item, which alters both a stat and the unicorn's look.
- **Trap** rooms always hurt, but never enough to end the run outright.
- Boss floors (every 10th floor) are boosted monster encounters and always drop
  a Rainbow Fruit on defeat.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit type checking
npm run build        # full pipeline: esbuild -> terser -> roadroller -> html -> zip
npm run watch         # writes an unminified dist/bundle.js on change, for local dev
npm run size          # print current zip size against the 13,312 byte budget without rebuilding
```

`npm run build` produces `game.zip` at the repo root — this is the submission
artifact. It bundles and minifies everything in `src/` into a single
`index.html` with no external requests, fonts, or assets, then recompresses
the zip with `advzip`.

For local iteration, run `npm run watch` in one terminal and serve the repo
root (e.g. `python3 -m http.server 8842`) in another, then open
`src/html/index.html` — it loads the unminified `dist/bundle.js` directly, so
you get real gameplay without running the full production pipeline each time.

## Source layout

```
src/
  main.ts          entry point: top-level game state machine + render loop
  game/            game logic, no canvas code
    rng.ts           shared seeded RNG (mulberry32) + roll helpers
    battle.ts          turn-based battle state machine
    monster.ts           procedural monster trait generation (10 archetypes)
    dungeon.ts             linear floor sequence generation
    item.ts                  consumables + permanent mutation items
    progression.ts             player leveling/XP
  render/          canvas drawing, no game logic
    unicorn.ts         player unicorn renderer
    monster.ts            monster archetype renderers
    ui.ts                    HP bars, menus, log, badges, modal panels
    event.ts                   treasure/trap room visuals
    fx.ts                        combat animation timing + impact bursts
  audio/
    audio.ts         WebAudio-generated SFX + ambient music (no sample files)
  html/
    index.html      unminified template, inlined into the build output
tools/
  build.mjs        the full build pipeline (and the --watch dev loop)
```

This repository contains the full, unmangled TypeScript source as required by
the js13k rules. The final submission (`game.zip`) is generated from this
source via `npm run build` and is not committed.
