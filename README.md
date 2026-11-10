# Latticebound

An original pixel-art monster-taming RPG that runs in the browser. Explore a small world on foot, bind wild **Kith**, fight turn-based battles, and grow every creature across one shared node map: **the Lattice**.

**Play it:** https://ficarbs.github.io/latticebound/

No install, no build step, no asset files. Every sprite, tile, sound and song is generated in code.

## What it is

- **A road through four towns.** Hearthvale, Brinecliff, volcanic Cindermere and snowbound Galehaven, joined by Mossway, Glimmer Grotto, Saltmarsh and Ashen Pass, and ending at the Static Spire. Each town has a Warden to beat before the road ahead opens.
- **Waygates.** Touch a town's Waygate once and you can ride the Lattice back to it from anywhere: Menu, then Travel.
- **Turn-based battles.** One Kith out per side, a party of three, and a Haven for the rest. Six elements (Ember, Tide, Bloom, Volt, Stone, Shade), status effects, buffs, and Bind Seals for catching wild Kith. Your Kith is drawn from behind, the foe from the front. Level gaps matter: every level you have over a foe adds damage, and every level you lack takes it away.
- **Sync Burst.** A shared gauge fills as you trade blows. At 100 your Kith unleashes a burst in its own element that ignores resistances.
- **The Lattice.** One 163-node graph shared by every Kith. Six element arms radiate from a central Heart, and rings join neighbouring arms. Each level earns a Spark and each Spark lights one node next to a node that Kith already holds: stats, skills (any Kith can learn any arm's skills if it walks far enough), key locks, and Ascension nodes.
- **Form Charts.** Every Kith family has its own chart of seven forms over four tiers. Forms are shared between families but reached by different routes: levels earned in earlier forms, stat thresholds, and each family's own rite (reach a level, stand by the sea, keep a Tide Kith in the party, win ten battles, and so on). Ascension I on the Lattice opens tier one, Ascension II the rest. A Kith can shift between any forms it has unlocked, and its Lattice nodes and learned skills carry across all of them.
- **25 Kith forms**, each drawn from the front, side and back.
- **Level 100 and the Hollow Deep.** Beating the story opens a stair under the Spire: 24 generated floors where wild Kith climb three levels a floor. Every fourth floor is a guardian's arena with a font and a Waygate stop. Floor 24 holds The Unlit, a Lv 100 boss that changes shape at 60% health and then moves twice a turn. It is meant to be the hardest thing in the game.
- **After the credits.** The four Wardens (Sable included) offer rematches whose team level follows how deep you have gone: 54, then 76, then 100 with a two-phase ace. Beat all four at their strongest for the Warden's Crest. The Kith Index tracks every form you have met and worn and pays out Spark Shards, Elixirs and a Prism Charm as it fills. And about one wild Kith in forty (one in twenty-four after the story) is prismatic: different colours, a tenth stronger, and it keeps both through every form.
- **Credits.** Finishing the story (and finishing the Deep) rolls credits with your own road stats, then returns you to the title with your save intact.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move / menu cursor | Arrow keys or WASD | Joystick (bottom left) |
| Confirm / talk / interact | Z, Enter or Space | Z button; in menus tap an option to select it, tap again to confirm |
| Menu / back | X, Esc or Backspace | X button; ✕ Back in menus |
| Switch Kith on the Lattice | Q / E | tap the Kith tabs |

Menus, battle commands and Lattice nodes can all be clicked or tapped directly. The game saves automatically when you change maps, finish a battle, rest, or close the Lattice, and from the menu.

## Run locally

```bash
node server.js
```

Then open http://localhost:8131. Add `?gallery=0` or `?gallery=1` to the URL to see every Kith sprite in all three views.

## Playthrough bot

`tools/bot.js` plays the whole game from a new save to the credits through the real input and menu code: it walks with held keys, fights through the battle menus, binds Kith, spends Sparks and rests at Menders. Use it after any balance or map change.

```js
const bot = await import('/tools/bot.js');
await bot.play('embrit');          // story: or 'puddlop', 'sprigit'
await bot.play('embrit', 'deep');  // story, then the Hollow Deep to Lv 100
```

It returns battles, losses, and the party's levels at each milestone, and fails loudly if a path, script or battle ever gets stuck.

## Files

| File | What it holds |
| --- | --- |
| `src/main.js` | Boot, game loop, title screen, screen wipes |
| `src/world.js` | Tile movement, camera, NPCs, warps, encounters, overworld rendering |
| `src/battle.js` | Battle flow, damage, AI, binding, battle rendering and effects |
| `src/lattice.js` | The Lattice screen |
| `src/grid.js` | Lattice graph generation and the order rival Kith fill it in |
| `src/kith.js` | Kith instances, stats, XP, forms and their requirements, items |
| `src/data.js` | Elements, skills, species, rites and Form Charts, items |
| `src/maps.js` | Map layouts, NPCs, chests, warps, encounter tables, Hollow Deep floor generator and guardians |
| `src/story.js` | NPC, shop, boss and ending scripts |
| `src/ui.js` | Dialog, menus, party, bag, shop, spatial keyboard focus |
| `src/art.js` | Tiles, trees, buildings, people and props |
| `src/kithart.js` | Kith sprites: vector shapes snapped to a palette, shaded and outlined |
| `src/audio.js` | Sound effects and music |
| `src/save.js`, `src/state.js`, `src/input.js` | Save slot, shared state and tweens, input |

## Credits

Design, code, art and audio are original to this project. It is a fan of the genre, not a copy of any one game: the node-growth idea nods to classic sphere-grid progression, the partner creatures to monster-taming RPGs, and the Sync gauge to GhostX Solo.
