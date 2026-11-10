// World maps, built from rectangle ops so layouts stay exact.
// Tiles: . grass  , tall grass  : path  ~ water  s sand  f flowers  T tree  R rock  # cliff/cave wall
//        F fence  = bridge  c cave floor  K crystal  O cave mouth  p/P spire floor  X spire wall
import { hash } from './art.js';

function build(w, h, base, ops) {
  const t = Array.from({ length: h }, () => Array(w).fill(base));
  for (const op of ops) {
    if (op[0][0] === '?') {
      // ['?X', seed, count, x, y, w, h, onto]: scatter X over tiles of type `onto`
      const [c, seed, count, x, y, rw, rh, onto = '.'] = op;
      for (let i = 0; i < count; i++) {
        const tx = x + ((hash(i, seed, 1) * rw) | 0), ty = y + ((hash(i, seed, 2) * rh) | 0);
        if (t[ty] && t[ty][tx] === onto) t[ty][tx] = c[1];
      }
      continue;
    }
    const [c, x, y, rw = 1, rh = 1] = op;
    for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) if (t[yy] && xx >= 0 && xx < w) t[yy][xx] = c;
  }
  return t;
}
const border = (w, h, c = 'T', n = 2) => [[c, 0, 0, w, n], [c, 0, h - n, w, n], [c, 0, 0, n, h], [c, w - n, 0, n, h]];

const defs = {
  hearth: {
    name: 'Hearthvale', w: 28, h: 22, base: '.', theme: 'out', edge: 'T', music: 'town', bg: 'field',
    ops: [
      ...border(28, 22),
      [':', 13, 0, 2, 18], [':', 5, 10, 18, 2], [':', 5, 8, 1, 2], [':', 19, 8, 1, 2], [':', 6, 16, 8, 1], [':', 15, 16, 6, 1],
      ['~', 8, 3, 4, 3], ['?f', 1, 30, 2, 2, 24, 18], ['?T', 2, 6, 2, 2, 24, 18],
      ['F', 15, 3, 9, 1], ['F', 23, 13, 1, 5], ['f', 16, 4, 8, 1],
    ],
    buildings: [
      { x: 4, y: 5, w: 4, h: 3, roof: 'red', dx: 1, door: 'home' },
      { x: 17, y: 5, w: 5, h: 3, roof: 'teal', sign: 'heal', dx: 2, door: 'mender' },
      { x: 4, y: 13, w: 5, h: 3, roof: 'violet', sign: 'lab', dx: 2, door: 'lab' },
      { x: 18, y: 13, w: 5, h: 3, roof: 'gold', sign: 'shop', dx: 2, door: 'shop1' },
    ],
    npcs: [
      { id: 'sable', name: 'Warden Sable', look: 'sable', x: 10, y: 15, dir: 'down', script: 'sable' },
      { id: 'elder', name: 'Old Brannoch', look: 'elder', x: 16, y: 9, dir: 'down', script: 'talk', lines: ['Under the soil runs the Lattice, a web of light older than the vale.', 'Kith do not simply grow. They walk the Lattice, node by node. Guide yours well.'] },
      { id: 'kid', name: 'Tam', look: 'kid', x: 11, y: 13, dir: 'right', script: 'talk', lines: ['Wild Kith hide in the tall grass! Weaken one, then throw a Bind Seal.', 'My sister says a Kith on the Ember arm can still learn Tide skills if it walks far enough. Weird, right?'] },
      { id: 'girl', name: 'Wynn', look: 'girl', x: 21, y: 18, dir: 'left', script: 'talk', lines: ['Tide douses Ember, Ember scorches Bloom, Bloom drinks Tide.', 'Volt shocks Tide, Stone grounds Volt, and Shade... Shade is afraid of the light.'] },
    ],
    signs: [{ x: 15, y: 2, text: 'North: Mossway. Wild Kith ahead!' }, { x: 9, y: 17, text: 'Warden\'s Lab. Lattice studies in progress.' }],
    warps: [{ x: 13, y: 0, to: 'moss', tx: 14, ty: 28, dir: 'up', need: 'starter', deny: 'It isn\'t safe out there without a Kith. Warden Sable is waiting by the lab.' }, { x: 14, y: 0, to: 'moss', tx: 15, ty: 28, dir: 'up', need: 'starter', deny: 'It isn\'t safe out there without a Kith. Warden Sable is waiting by the lab.' }],
  },
  moss: {
    name: 'Mossway', w: 30, h: 30, base: '.', theme: 'out', edge: 'T', music: 'route', bg: 'field',
    enc: { rate: 0.14, table: [['voltick', 2, 3, 30], ['mossnip', 2, 3, 30], ['coalcub', 2, 4, 22], ['gillby', 3, 4, 10], ['murklet', 3, 4, 8]] },
    ops: [
      ...border(30, 30),
      [',', 8, 22, 5, 5], [',', 17, 22, 9, 5], [',', 9, 14, 10, 5], [',', 2, 3, 10, 8], [',', 16, 7, 5, 4], [',', 25, 15, 3, 10],
      ['~', 20, 16, 4, 4], ['?T', 3, 16, 2, 2, 26, 26], ['?f', 4, 30, 2, 2, 26, 26],
      [':', 14, 22, 2, 8], [':', 6, 20, 10, 2], [':', 6, 12, 2, 10], [':', 6, 12, 18, 2], [':', 22, 4, 2, 10], [':', 14, 4, 10, 2], [':', 14, 0, 2, 6],
      [':', 24, 12, 4, 2], [',', 6, 15, 2, 3], [',', 18, 12, 3, 2],
      ['#', 25, 8, 5, 4], ['O', 27, 11],
    ],
    npcs: [
      { id: 'pip', name: 'Tamer Pip', look: 'pip', x: 10, y: 19, dir: 'down', script: 'trainer', sight: 2, trainer: { party: [['mossnip', 3], ['voltick', 4]], gold: 60, before: 'You look new! My Kith have been itching for a match.', after: 'Whoa. Spend your Sparks on the Lattice, I can tell you already have.' } },
      { id: 'rook', name: 'Tamer Rook', look: 'rook', x: 18, y: 3, dir: 'down', script: 'trainer', sight: 2, trainer: { party: [['coalcub', 5], ['murklet', 5]], gold: 90, before: 'Nobody gets to Brinecliff without getting past me.', after: 'Fine. The road\'s yours. If the rift ever clears, that is.' } },
      { id: 'juno', name: 'Tamer Juno', look: 'girl', x: 21, y: 8, dir: 'right', script: 'trainer', sight: 2, trainer: { party: [['gillby', 4], ['coalcub', 5]], gold: 80, before: 'I caught mine by the pond. Bet yours can\'t swim!', after: 'Okay, okay. The cave east of here has tougher ones, if you\'re showing off.' } },
      { id: 'rift1', name: 'Static Rift', look: 'rift', x: 14, y: 2, script: 'rift', hide: 'key1' },
      { id: 'rift2', name: 'Static Rift', look: 'rift', x: 15, y: 2, script: 'rift', hide: 'key1' },
    ],
    chests: [{ id: 'm1', x: 3, y: 25, item: 'tonic', n: 3 }, { id: 'm2', x: 26, y: 3, item: 'seal', n: 3 }],
    signs: [{ x: 23, y: 11, text: 'East: Glimmer Grotto. Mind the dark.' }, { x: 16, y: 6, text: 'North: Brinecliff.' }],
    warps: [
      { x: 14, y: 29, to: 'hearth', tx: 13, ty: 1, dir: 'down' }, { x: 15, y: 29, to: 'hearth', tx: 14, ty: 1, dir: 'down' },
      { x: 14, y: 0, to: 'brine', tx: 13, ty: 20, dir: 'up' }, { x: 15, y: 0, to: 'brine', tx: 14, ty: 20, dir: 'up' },
      { x: 27, y: 11, to: 'grotto', tx: 11, ty: 18, dir: 'up' },
    ],
  },
  grotto: {
    name: 'Glimmer Grotto', w: 24, h: 20, base: '#', theme: 'cave', edge: '#', music: 'cave', bg: 'cave', dark: true, encAll: true,
    enc: { rate: 0.09, table: [['pebblit', 5, 8, 40], ['murklet', 5, 8, 35], ['coalcub', 6, 8, 15], ['wispurr', 7, 8, 10]] },
    ops: [
      ['c', 10, 15, 4, 5], ['c', 3, 10, 18, 5], ['c', 3, 3, 4, 7], ['c', 3, 3, 10, 3], ['c', 17, 6, 4, 4], ['c', 14, 2, 6, 3],
      ['~', 15, 11, 3, 2], ['?R', 5, 8, 4, 10, 16, 5, 'c'], ['?K', 6, 5, 3, 3, 18, 12, 'c'], ['K', 14, 2], ['K', 19, 2], ['c', 13, 3], ['c', 10, 14, 4, 1],
    ],
    npcs: [
      { id: 'odo', name: 'Spelunker Odo', look: 'odo', x: 8, y: 11, dir: 'right', script: 'trainer', sight: 3, trainer: { party: [['pebblit', 7], ['pebblit', 8]], gold: 120, before: 'Shh! You\'ll wake the big one. ...Actually, let\'s battle. That\'ll wake it for sure.', after: 'The thing up north isn\'t right. It flickers. Be careful.' } },
      { id: 'bex', name: 'Hunter Bex', look: 'hale', x: 5, y: 7, dir: 'left', script: 'trainer', sight: 2, trainer: { party: [['murklet', 8], ['wispurr', 8]], gold: 140, before: 'Crystals this bright draw Shade Kith like moths. And Tamers like me.', after: 'Shade folds to Volt and Ember. You worked that out fast.' } },
      { id: 'hollow', name: 'Hollowed Cragnaw', look: 'kith:cragnaw', x: 17, y: 3, dir: 'left', script: 'hollow', hide: 'key1' },
    ],
    chests: [{ id: 'g1', x: 4, y: 4, item: 'tonic', n: 3 }, { id: 'g2', x: 19, y: 7, item: 'sealx', n: 2 }, { id: 'g3', x: 19, y: 4, item: 'shard', n: 1 }],
    warps: [{ x: 11, y: 19, to: 'moss', tx: 27, ty: 12, dir: 'down' }, { x: 12, y: 19, to: 'moss', tx: 27, ty: 12, dir: 'down' }],
  },
  brine: {
    name: 'Brinecliff', w: 28, h: 22, base: '.', theme: 'out', edge: 'T', music: 'town', bg: 'coast',
    ops: [
      ...border(28, 22), ['~', 0, 0, 28, 4], ['s', 2, 4, 24, 3], ['?f', 7, 22, 2, 7, 24, 13], ['?T', 8, 4, 2, 12, 24, 8],
      [':', 13, 10, 2, 12], [':', 4, 10, 24, 2], [':', 13, 7, 2, 3], ['=', 13, 1, 2, 3], ['=', 11, 1, 6, 1],
      [':', 6, 17, 8, 1], [':', 6, 16, 1, 1],
    ],
    buildings: [
      { x: 5, y: 7, w: 5, h: 3, roof: 'teal', sign: 'heal', dx: 2, door: 'mender' },
      { x: 17, y: 7, w: 5, h: 3, roof: 'gold', sign: 'shop', dx: 2, door: 'shop2' },
      { x: 5, y: 13, w: 4, h: 3, roof: 'blue', dx: 1, door: 'locked' },
      { x: 18, y: 14, w: 4, h: 3, roof: 'red', dx: 1, door: 'locked' },
    ],
    npcs: [
      { id: 'maris', name: 'Warden Maris', look: 'maris', x: 13, y: 1, dir: 'down', script: 'maris' },
      { id: 'breeder', name: 'Keeper Ansel', look: 'breeder', x: 10, y: 15, dir: 'left', script: 'gift' },
      { id: 'fisher', name: 'Fisher Dunn', look: 'fisher', x: 20, y: 5, dir: 'up', script: 'talk', lines: ['See that needle on the horizon? The Static Spire. It wasn\'t there last spring.', 'Kith that wander near it come back... hollow. Warden Maris is the only one who can open the gate.'] },
      { id: 'kid2', name: 'Lio', look: 'kid', x: 22, y: 12, dir: 'down', script: 'talk', lines: ['The rings between the Lattice arms are locked. You need a Key to cross them!', 'Once you cross, your Kith can learn another element\'s whole arm. My Puddlop knows Thorn now.'] },
    ],
    signs: [{ x: 15, y: 8, text: 'Warden\'s Pier. Challengers welcome.' }, { x: 25, y: 9, text: 'East: Saltmarsh, then the Spire.' }],
    warps: [
      { x: 13, y: 21, to: 'moss', tx: 14, ty: 1, dir: 'down' }, { x: 14, y: 21, to: 'moss', tx: 15, ty: 1, dir: 'down' },
      { x: 27, y: 10, to: 'marsh', tx: 1, ty: 10, dir: 'right' }, { x: 27, y: 11, to: 'marsh', tx: 1, ty: 11, dir: 'right' },
    ],
  },
  marsh: {
    name: 'Saltmarsh', w: 32, h: 22, base: '.', theme: 'out', edge: 'T', music: 'route', bg: 'coast',
    enc: { rate: 0.14, table: [['gillby', 10, 13, 30], ['mossnip', 10, 13, 20], ['voltick', 10, 12, 20], ['wispurr', 11, 13, 12], ['stagvolt', 13, 14, 10], ['sporelord', 13, 14, 8]] },
    ops: [
      ...border(32, 22),
      [',', 3, 3, 5, 6], [',', 14, 14, 12, 5], [',', 25, 8, 5, 10], ['~', 16, 2, 4, 3], ['?T', 9, 10, 2, 2, 28, 18], ['?f', 10, 20, 2, 2, 28, 18],
      ['~', 8, 6, 6, 12], [':', 0, 10, 8, 2], ['=', 8, 10, 6, 2], [':', 14, 10, 10, 2], [',', 16, 8, 6, 6],
      [':', 22, 4, 2, 8], [':', 22, 4, 10, 2],
    ],
    npcs: [
      { id: 'wren', name: 'Tamer Wren', look: 'wren', x: 15, y: 9, dir: 'down', script: 'trainer', sight: 2, trainer: { party: [['gillby', 12], ['brinelle', 13]], gold: 180, before: 'The marsh keeps what it catches. Let\'s see if it keeps you.', after: 'You swim well for a land Tamer.' } },
      { id: 'hale', name: 'Tamer Hale', look: 'hale', x: 25, y: 6, dir: 'up', script: 'trainer', sight: 2, trainer: { party: [['wispurr', 13], ['stagvolt', 13], ['noxwing', 14]], gold: 220, before: 'The Spire hums at night. My Kith hum back. Want to hear?', after: 'Go on, then. Somebody has to shut that thing up.' } },
      { id: 'sorrel', name: 'Tamer Sorrel', look: 'pip', x: 21, y: 7, dir: 'right', script: 'trainer', sight: 2, trainer: { party: [['sporelord', 13], ['finfathom', 14]], gold: 240, before: 'Nobody walks the Spire road without a warm-up.', after: 'Warmed up? Good. You will need it.' } },
      { id: 'gate1', name: 'Static Gate', look: 'rift', x: 30, y: 4, script: 'gate', hide: 'maris' },
      { id: 'gate2', name: 'Static Gate', look: 'rift', x: 30, y: 5, script: 'gate', hide: 'maris' },
    ],
    chests: [{ id: 's1', x: 4, y: 17, item: 'shard', n: 1 }, { id: 's2', x: 28, y: 16, item: 'rekindle', n: 1 }, { id: 's3', x: 20, y: 6, item: 'tonicx', n: 2 }],
    warps: [
      { x: 0, y: 10, to: 'brine', tx: 26, ty: 10, dir: 'left' }, { x: 0, y: 11, to: 'brine', tx: 26, ty: 11, dir: 'left' },
      { x: 31, y: 4, to: 'spire', tx: 10, ty: 24, dir: 'up' }, { x: 31, y: 5, to: 'spire', tx: 11, ty: 24, dir: 'up' },
    ],
  },
  spire: {
    name: 'Static Spire', w: 22, h: 26, base: 'X', theme: 'spire', edge: 'X', music: 'spire', bg: 'spire', encAll: true,
    enc: { rate: 0.08, table: [['noxwing', 15, 18, 28], ['cragnaw', 15, 18, 24], ['stagvolt', 15, 18, 24], ['magmander', 16, 18, 12], ['phantigre', 17, 19, 12]] },
    ops: [
      ['p', 9, 20, 4, 6], ['p', 3, 15, 16, 5], ['p', 3, 8, 3, 7], ['p', 16, 8, 3, 7], ['p', 3, 5, 16, 3], ['p', 10, 4, 2, 1], ['p', 7, 1, 8, 3],
      ['?P', 11, 26, 3, 1, 16, 20, 'p'],
    ],
    npcs: [
      { id: 'aco1', name: 'Null Acolyte', look: 'acolyte', x: 4, y: 9, dir: 'down', script: 'trainer', sight: 3, trainer: { party: [['noxwing', 17], ['cragnaw', 17]], gold: 300, before: 'The Lattice is a cage. We are only opening the door.', after: 'It... it doesn\'t matter. The Maw is already awake.' } },
      { id: 'aco2', name: 'Null Acolyte', look: 'acolyte', x: 17, y: 9, dir: 'down', script: 'trainer', sight: 3, trainer: { party: [['phantigre', 17], ['magmander', 18]], gold: 300, before: 'No further, Tamer. Your Kith will thank us when they are free.', after: 'Free... of what? I can\'t remember what we wanted.' } },
      { id: 'aco3', name: 'Null Adept', look: 'acolyte', x: 9, y: 5, dir: 'right', script: 'trainer', sight: 2, trainer: { party: [['stagvolt', 19], ['noxwing', 19], ['phantigre', 20]], gold: 400, before: 'The Maw is hungry and you are in its doorway.', after: 'Then go in. See what a hole in the world looks like.' } },
      { id: 'font', name: 'Lattice Font', look: 'font', x: 15, y: 17, script: 'font' },
      { id: 'null', name: 'Nullmaw', look: 'kith:nullmaw', x: 10, y: 2, dir: 'down', script: 'nullmaw', hide: 'clear' },
    ],
    chests: [{ id: 'p1', x: 17, y: 6, item: 'shard', n: 1 }, { id: 'p2', x: 4, y: 6, item: 'tonicx', n: 3 }, { id: 'p3', x: 4, y: 17, item: 'rekindle', n: 1 }],
    warps: [{ x: 10, y: 25, to: 'marsh', tx: 29, ty: 4, dir: 'left' }, { x: 11, y: 25, to: 'marsh', tx: 29, ty: 5, dir: 'left' }],
  },
};

export const MAPS = {};
for (const id in defs) {
  const d = defs[id];
  d.id = id;
  d.t = build(d.w, d.h, d.base, d.ops);
  d.npcs = d.npcs || []; d.chests = d.chests || []; d.signs = d.signs || []; d.buildings = d.buildings || []; d.warps = d.warps || [];
  const floor = d.theme === 'cave' ? 'c' : d.theme === 'spire' ? 'p' : '.';
  for (const o of [...d.npcs, ...d.chests, ...d.signs]) if ('TRK'.includes(d.t[o.y][o.x])) d.t[o.y][o.x] = floor;
  MAPS[id] = d;
}
