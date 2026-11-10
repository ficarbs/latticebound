// Content tables: elements, skills, Kith species and items.
export const ELS = ['ember', 'tide', 'bloom', 'volt', 'stone', 'shade'];
export const EL = {
  ember: { name: 'Ember', col: '#ff8a3c' },
  tide: { name: 'Tide', col: '#4aa8f0' },
  bloom: { name: 'Bloom', col: '#6ccf50' },
  volt: { name: 'Volt', col: '#f6d743' },
  stone: { name: 'Stone', col: '#a8afc0' },
  shade: { name: 'Shade', col: '#a37cf0' },
  none: { name: 'Neutral', col: '#e8e2d0' },
};
const STRONG = {
  ember: ['bloom', 'shade'], tide: ['ember', 'stone'], bloom: ['tide', 'stone'],
  volt: ['tide', 'shade'], stone: ['ember', 'volt'], shade: ['bloom', 'shade'],
};
const WEAK = {
  ember: ['tide', 'stone', 'ember'], tide: ['bloom', 'tide'], bloom: ['ember', 'bloom'],
  volt: ['stone', 'volt'], stone: ['bloom', 'stone'], shade: ['volt'],
};
export const effect = (a, d) => (a === 'none' ? 1 : STRONG[a].includes(d) ? 1.5 : WEAK[a].includes(d) ? 0.66 : 1);
export const strongVs = el => STRONG[el];

const atk = (name, el, pow, cost, desc, fx) => ({ name, el, pow, cost, desc, fx, kind: 'atk' });
export const SKILLS = {
  strike: atk('Strike', 'none', 12, 0, 'A plain hit. Restores 3 EN.'),
  cinder: atk('Cinder', 'ember', 18, 4, 'A spit of hot coals.'),
  flamefang: atk('Flame Fang', 'ember', 30, 8, 'Burning bite. May leave a burn.', { burn: 0.35 }),
  inferno: atk('Inferno', 'ember', 48, 14, 'A roaring pillar of fire. Often burns.', { burn: 0.5 }),
  splash: atk('Splash', 'tide', 18, 4, 'A slap of cold water.'),
  riptide: atk('Riptide', 'tide', 30, 8, 'A dragging current. May sap ATK.', { down: ['atk', 0.5] }),
  maelstrom: atk('Maelstrom', 'tide', 48, 14, 'A crushing whirlpool.'),
  thorn: atk('Thorn', 'bloom', 18, 4, 'A flung barb.'),
  leechvine: atk('Leech Vine', 'bloom', 26, 8, 'Drains the foe and heals half the damage.', { drain: 0.5 }),
  overgrowth: atk('Overgrowth', 'bloom', 48, 14, 'The ground itself lashes out.'),
  zap: atk('Zap', 'volt', 18, 4, 'A quick jolt.'),
  arclash: atk('Arc Lash', 'volt', 30, 8, 'A whip of lightning. May stun.', { stun: 0.25 }),
  thunderhead: atk('Thunderhead', 'volt', 48, 14, 'A storm in one strike. May stun.', { stun: 0.3 }),
  pebble: atk('Pebble Toss', 'stone', 18, 4, 'A sharp little rock.'),
  quake: atk('Quake', 'stone', 30, 8, 'Shakes the ground. May crack DEF.', { down: ['def', 0.5] }),
  monolith: atk('Monolith', 'stone', 48, 14, 'Drops a slab from above.'),
  duskclaw: atk('Dusk Claw', 'shade', 18, 4, 'A swipe from the dark.'),
  hex: atk('Hex', 'shade', 22, 8, 'A curse that always blights.', { blight: 1 }),
  eclipse: atk('Eclipse', 'shade', 48, 14, 'Swallows the light whole.'),
  focus: { name: 'Focus', el: 'ember', cost: 5, kind: 'buff', stat: 'atk', desc: 'Raises ATK for 3 turns.' },
  mend: { name: 'Mend', el: 'bloom', cost: 8, kind: 'heal', amt: 0.4, desc: 'Restores 40% of max HP.' },
  cleanse: { name: 'Cleanse', el: 'tide', cost: 6, kind: 'heal', amt: 0.25, cure: true, desc: 'Cures status and restores 25% HP.' },
  quickstep: { name: 'Quickstep', el: 'volt', cost: 5, kind: 'buff', stat: 'spd', desc: 'Raises SPD for 3 turns.' },
  bulwark: { name: 'Bulwark', el: 'stone', cost: 5, kind: 'buff', stat: 'def', desc: 'Raises DEF for 3 turns.' },
  unnerve: { name: 'Unnerve', el: 'shade', cost: 5, kind: 'debuff', stat: 'atk', desc: 'Lowers the foe\'s ATK for 3 turns.' },
};
for (const id in SKILLS) SKILLS[id].id = id;

// Lattice arm skills: [tier 1 (innate for natives), utility, tier 2, tier 3].
export const ARM_SKILLS = {
  ember: ['cinder', 'focus', 'flamefang', 'inferno'],
  tide: ['splash', 'cleanse', 'riptide', 'maelstrom'],
  bloom: ['thorn', 'mend', 'leechvine', 'overgrowth'],
  volt: ['zap', 'quickstep', 'arclash', 'thunderhead'],
  stone: ['pebble', 'bulwark', 'quake', 'monolith'],
  shade: ['duskclaw', 'unnerve', 'hex', 'eclipse'],
};

// b = [hp, en, atk, def, spd] for first forms; later forms scale from them.
const S = (name, el, b, to, blurb) => ({ name, el, b, to, blurb, stage: 1 });
export const SPECIES = {
  embrit: S('Embrit', 'ember', [38, 20, 12, 7, 10], 'flarevane', 'A fox kit whose tail smoulders when it is happy.'),
  flarevane: { name: 'Flarevane', learn: 'flamefang' },
  solkharn: { name: 'Solkharn', learn: 'inferno' },
  puddlop: S('Puddlop', 'tide', [44, 22, 9, 10, 8], 'brinelle', 'Round, damp and unbothered. Naps in rain barrels.'),
  brinelle: { name: 'Brinelle', learn: 'riptide' },
  maelorca: { name: 'Maelorca', learn: 'maelstrom' },
  sprigit: S('Sprigit', 'bloom', [42, 20, 10, 9, 9], 'brambuck', 'A walking bulb. Its leaves turn to follow its Tamer.'),
  brambuck: { name: 'Brambuck', learn: 'leechvine' },
  eldergrove: { name: 'Eldergrove', learn: 'overgrowth' },
  voltick: S('Voltick', 'volt', [32, 18, 10, 7, 13], 'stagvolt', 'Its antenna crackles before a storm.'),
  stagvolt: { name: 'Stagvolt', learn: 'arclash' },
  pebblit: S('Pebblit', 'stone', [46, 14, 9, 13, 5], 'cragnaw', 'Mistaken for gravel until it pinches.'),
  cragnaw: { name: 'Cragnaw', learn: 'quake' },
  murklet: S('Murklet', 'shade', [30, 20, 12, 6, 12], 'noxwing', 'Hangs from rafters and giggles at night.'),
  noxwing: { name: 'Noxwing', learn: 'hex' },
  mossnip: S('Mossnip', 'bloom', [40, 18, 8, 9, 6], 'sporelord', 'Sprouts overnight wherever it rained.'),
  sporelord: { name: 'Sporelord', learn: 'leechvine' },
  gillby: S('Gillby', 'tide', [34, 18, 10, 8, 11], 'finfathom', 'Swims through fog as if it were water.'),
  finfathom: { name: 'Finfathom', learn: 'riptide' },
  coalcub: S('Coalcub', 'ember', [36, 16, 12, 8, 8], 'magmander', 'Warm to the touch. Sleeps in hearths.'),
  magmander: { name: 'Magmander', learn: 'flamefang' },
  wispurr: S('Wispurr', 'shade', [34, 24, 11, 7, 12], 'phantigre', 'A cat-shaped draught. Purrs like a far-off bell.'),
  phantigre: { name: 'Phantigre', learn: 'hex' },
  nullmaw: { name: 'Nullmaw', el: 'shade', b: [180, 80, 29, 22, 15], stage: 3, raw: true, innate: ['duskclaw', 'hex', 'eclipse', 'unnerve'], blurb: 'A hole in the Lattice that learned to bite.' },
  unlit: { name: 'The Unlit', el: 'shade', b: [200, 100, 30, 24, 16], stage: 3, raw: true, innate: ['eclipse', 'inferno', 'thunderhead', 'maelstrom'], blurb: 'What the Lattice looked like before anything lit it.' },
};
SPECIES.flarevane.to = 'solkharn';
SPECIES.brinelle.to = 'maelorca';
SPECIES.brambuck.to = 'eldergrove';
for (const id in SPECIES) {
  const s = SPECIES[id];
  s.id = id;
  if (s.stage === 1) {
    s.innate = ['strike', ARM_SKILLS[s.el][0]];
    let prev = s, m = 1.45;
    while (prev.to) {
      const n = SPECIES[prev.to];
      n.from = prev.id; n.el = s.el; n.stage = prev.stage + 1;
      n.b = s.b.map(v => Math.round(v * m));
      n.innate = [...prev.innate, n.learn];
      n.blurb = n.blurb || `The ascended form of ${prev.name}.`;
      prev = n; m = 2;
    }
  } else if (s.raw) s.innate = ['strike', ...s.innate];
}
const STATS = { hp: 'HP', en: 'EN', atk: 'ATK', def: 'DEF', spd: 'SPD' };
// Every family ascends its own way. The Ascension node is where it happens; the rite is what makes it possible.
const SEA = { t: 'place', maps: ['brine', 'marsh'], text: 'Stand by the sea: Brinecliff or Saltmarsh' };
const FIRE = { t: 'place', maps: ['cinder', 'ashpass'], text: 'Stand on volcanic ground: Cindermere or Ashen Pass' };
const RITES = {
  embrit: { t: 'lv', n: 10, text: 'Reach Lv 10' },
  flarevane: { t: 'bursts', n: 3, text: 'Unleash 3 Sync Bursts' },
  puddlop: { t: 'stat', s: 'hp', n: 74, text: 'Raise max HP to 74' },
  brinelle: SEA,
  sprigit: { t: 'nodes', n: 12, text: 'Light 12 Lattice nodes' },
  brambuck: { t: 'cross', text: 'Learn a skill from another element\'s arm' },
  voltick: { t: 'stat', s: 'spd', n: 21, text: 'Raise SPD to 21' },
  pebblit: { t: 'stat', s: 'def', n: 21, text: 'Raise DEF to 21' },
  murklet: { t: 'wins', n: 10, text: 'Win 10 battles as the Kith in play' },
  mossnip: { t: 'ally', el: 'tide', text: 'Travel with a Tide Kith in the party' },
  gillby: { t: 'lv', n: 14, text: 'Reach Lv 14' },
  coalcub: FIRE,
  wispurr: { t: 'skills', n: 4, text: 'Know 4 skills' },
};
for (const id in RITES) SPECIES[id].rite = RITES[id];
SPECIES.nullmaw.learn = 'eclipse';

// Form Charts. Every family has its own chart of seven forms over four tiers. Forms are shared between
// families but reached by different routes: levels earned in earlier forms, stats, and each family's rite.
// [kin A, stat it wants, kin B, stat it wants, first apex form, second apex form]
const KIN = {
  embrit: ['magmander', 'atk', 'phantigre', 'spd', 'solkharn', 'eldergrove'],
  puddlop: ['finfathom', 'hp', 'sporelord', 'en', 'maelorca', 'solkharn'],
  sprigit: ['sporelord', 'hp', 'stagvolt', 'spd', 'eldergrove', 'maelorca'],
  voltick: ['noxwing', 'spd', 'flarevane', 'atk', 'solkharn', 'maelorca'],
  pebblit: ['magmander', 'def', 'brambuck', 'hp', 'eldergrove', 'solkharn'],
  murklet: ['phantigre', 'atk', 'stagvolt', 'spd', 'maelorca', 'eldergrove'],
  mossnip: ['brambuck', 'hp', 'cragnaw', 'def', 'eldergrove', 'solkharn'],
  gillby: ['brinelle', 'en', 'noxwing', 'spd', 'maelorca', 'eldergrove'],
  coalcub: ['flarevane', 'atk', 'cragnaw', 'def', 'solkharn', 'maelorca'],
  wispurr: ['noxwing', 'spd', 'brinelle', 'en', 'maelorca', 'solkharn'],
};
const WANT = { hp: 105, en: 38, atk: 26, def: 24, spd: 24 };
export const CHARTS = {};
for (const base in KIN) {
  const [ka, sa, kb, sb, t3a, t3b] = KIN[base], own = SPECIES[base].to;
  const stat = s => ({ t: 'stat', s, n: WANT[s], text: `${STATS[s]} ${WANT[s]}+` });
  const form = (f, n) => ({ t: 'form', f, n, text: `${SPECIES[f].name} form Lv ${n}` });
  const rows = [
    { form: own, tier: 1, need: [RITES[base]] },
    { form: ka, tier: 1, need: [{ t: 'lv', n: 16, text: 'Reach Lv 16' }, stat(sa)] },
    { form: kb, tier: 1, need: [form(own, 6), stat(sb)] },
    { form: t3a, tier: 2, need: [form(own, 12), form(ka, 6), ...(RITES[own] && SPECIES[own].to === t3a ? [RITES[own]] : [])] },
    { form: t3b, tier: 2, need: [form(kb, 10), form(t3a, 8)] },
    { form: 'nullmaw', tier: 3, need: [form(t3a, 20), form(t3b, 15), { t: 'lv', n: 80, text: 'Reach Lv 80' }] },
  ];
  // a family never lists the same form twice
  CHARTS[base] = rows.filter((r, i) => rows.findIndex(q => q.form === r.form) === i);
}
export const MAX_LV = 100;

export const STARTERS = ['embrit', 'puddlop', 'sprigit'];

export const ITEMS = {
  tonic: { name: 'Tonic', heal: 40, price: 30, desc: 'Restores 40 HP to one Kith.' },
  tonicx: { name: 'Rich Tonic', heal: 120, price: 90, desc: 'Restores 120 HP to one Kith.' },
  elixir: { name: 'Elixir', heal: 450, price: 420, desc: 'Restores 450 HP to one Kith.' },
  ether: { name: 'Ether Drop', en: 25, price: 60, desc: 'Restores 25 EN to one Kith.' },
  etherx: { name: 'Ether Flask', en: 90, price: 280, desc: 'Restores 90 EN to one Kith.' },
  rekindle: { name: 'Rekindle', revive: 0.5, price: 150, desc: 'Revives a fainted Kith with half HP.' },
  seal: { name: 'Bind Seal', bind: 0, price: 40, desc: 'Binds a weakened wild Kith to you.' },
  sealx: { name: 'Deep Seal', bind: 0.25, price: 120, desc: 'A stronger seal for stubborn Kith.' },
  shard: { name: 'Spark Shard', spark: 1, price: 400, desc: 'Grants one Kith a Spark for the Lattice.' },
  key1: { name: 'Lattice Key I', key: true, desc: 'Opens Lv.1 locks on the Lattice.' },
  key2: { name: 'Lattice Key II', key: true, desc: 'Opens Lv.2 locks on the Lattice.' },
  charm: { name: 'Prism Charm', key: true, desc: 'Prismatic Kith appear four times as often.' },
  crest: { name: 'Warden\'s Crest', key: true, desc: 'Proof that all four Wardens fell at their strongest.' },
};
for (const id in ITEMS) ITEMS[id].id = id;

export const xpNeed = lv => Math.round(24 + lv * 10 + lv * lv * 0.9);
export const ASCEND_LV = { 1: 10, 2: 22 };
export const STAT_NAMES = { hp: 'HP', en: 'EN', atk: 'ATK', def: 'DEF', spd: 'SPD' };
