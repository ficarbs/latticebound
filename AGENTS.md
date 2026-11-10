# Agent notes

Read `README.md` first for the systems and the file map.

## Run and check

- `node server.js`, then open http://localhost:8131. Plain ES modules, no bundler, no dependencies.
- There is no test suite. Verify in a browser. `window.G` is the game state and `__tick(seconds)` steps the simulation by hand, which also works while the tab is hidden.
- `?gallery=0` and `?gallery=1` show every Kith sprite, front, side and back, at battle size and follower size.
- After any balance, map or script change run the bot: `(await import('/tools/bot.js')).play('embrit', 'deep')`. Current baseline: story in about 60 battles with 2 to 4 losses; The Unlit wins roughly half the time for an Ember-heavy Lv 100 team with 30 Elixirs, and about one time in ten for a team with no element edge.

## Rules

- The canvas is 320x180 and is scaled up 3x with nearest-neighbour. The DOM overlay is laid out in a fixed 960x540 space, so canvas coordinates times 3 give overlay pixels.
- All art and audio are generated in code. Do not add asset files.
- Canvas drawing uses `px`, `ell` and `pline` from `src/art.js` so edges stay hard. Text never goes on the canvas; it belongs in the DOM overlay.
- Game logic awaits `tween()` and `sleep()` from `src/state.js`, which run on game time. Do not use `setTimeout` for anything gameplay depends on.
- Keyboard focus is spatial: the last visible `.scope` in `#ui` owns input (`src/ui.js`). New menus only need a `.scope` element with buttons, plus `_cancel` and `_onsel` if wanted.
- Scripts that lock the player go through `runScript` or bump `G.busy` before their first `await`.
- Maps are built from rectangle ops in `src/maps.js`. After changing one, check that every warp, NPC, chest and door is still reachable.
- New Kith art needs both a `DRAW` (side) and a `FRONT` (front and back, `a.b` is true for the back) entry in `src/kithart.js`.
- Forms: `k.sp` is the form being worn, `k.base` the family, `k.forms` what is unlocked, `k.fw` wins per form. Go through `formsOf(k)` so old saves get these filled in.
- Bosses with fixed stats set `k.fix`; `k.traits` drives enrage and double turns in `src/battle.js`.
- Battle-only scratch lives on `kith._b` and is stripped before saving. If you add a saved field, default it in `newPlayer()` so old saves load.
- No `alert`, `confirm` or `prompt`. Use `say()`, `choose()` and `toast()`.
- Asset paths stay relative, because GitHub Pages serves the game from `/latticebound/`.
- Every push to `main` redeploys the live game from the repo root.
