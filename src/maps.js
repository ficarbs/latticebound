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
    name: 'Hearthvale', w: 28, h: 22, base: '.', theme: 'out', edge: 'T', music: 'town', bg: 'field', town: [14, 12],
    ops: [
      ...border(28, 22),
      [':', 13, 0, 2, 18], [':', 5, 10, 18, 2], [':', 5, 8, 1, 2], [':', 19, 8, 1, 2], [':', 6, 16, 8, 1], [':', 15, 16, 6, 1],
      ['~', 8, 3, 4, 3], ['?f', 1, 30, 2, 2, 24, 18], ['?T', 2, 6, 2, 2, 24, 18],
      ['F', 15, 3, 9, 1], ['F', 23, 13, 1, 5], ['f', 16, 4, 8, 1], [':', 16, 14],
    ],
    buildings: [
      { x: 4, y: 5, w: 4, h: 3, roof: 'red', dx: 1, door: 'home' },
      { x: 17, y: 5, w: 5, h: 3, roof: 'teal', sign: 'heal', dx: 2, door: 'mender' },
      { x: 4, y: 13, w: 5, h: 3, roof: 'violet', sign: 'lab', dx: 2, door: 'lab' },
      { x: 18, y: 13, w: 5, h: 3, roof: 'gold', sign: 'shop', dx: 2, door: 'shop1' },
    ],
    npcs: [
      { id: 'sable', name: 'Warden Sable', look: 'sable', x: 10, y: 15, dir: 'down', script: 'sable' },
      { id: 'way', name: 'Waygate', look: 'gate', x: 16, y: 13, script: 'waygate' },
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
    name: 'Brinecliff', w: 28, h: 22, base: '.', theme: 'out', edge: 'T', music: 'town', bg: 'coast', town: [13, 12],
    ops: [
      ...border(28, 22), ['~', 0, 0, 28, 4], ['s', 2, 4, 24, 3], ['?f', 7, 22, 2, 7, 24, 13], ['?T', 8, 4, 2, 12, 24, 8],
      [':', 13, 10, 2, 12], [':', 4, 10, 24, 2], [':', 13, 7, 2, 3], ['=', 13, 1, 2, 3], ['=', 11, 1, 6, 1],
      [':', 6, 17, 8, 1], [':', 6, 16, 1, 1], [':', 11, 9],
    ],
    buildings: [
      { x: 5, y: 7, w: 5, h: 3, roof: 'teal', sign: 'heal', dx: 2, door: 'mender' },
      { x: 17, y: 7, w: 5, h: 3, roof: 'gold', sign: 'shop', dx: 2, door: 'shop2' },
      { x: 5, y: 13, w: 4, h: 3, roof: 'blue', dx: 1, door: 'locked' },
      { x: 18, y: 14, w: 4, h: 3, roof: 'red', dx: 1, door: 'locked' },
    ],
    npcs: [
      { id: 'maris', name: 'Warden Maris', look: 'maris', x: 13, y: 1, dir: 'down', script: 'maris' },
      { id: 'way', name: 'Waygate', look: 'gate', x: 11, y: 8, script: 'waygate' },
      { id: 'breeder', name: 'Keeper Ansel', look: 'breeder', x: 10, y: 15, dir: 'left', script: 'gift' },
      { id: 'fisher', name: 'Fisher Dunn', look: 'fisher', x: 20, y: 5, dir: 'up', script: 'talk', lines: ['See that needle on the horizon? The Static Spire. It wasn\'t there last spring.', 'Kith that wander near it come back... hollow. Warden Maris is the only one who can open the gate.'] },
      { id: 'kid2', name: 'Lio', look: 'kid', x: 22, y: 12, dir: 'down', script: 'talk', lines: ['The rings between the Lattice arms are locked. You need a Key to cross them!', 'Once you cross, your Kith can learn another element\'s whole arm. My Puddlop knows Thorn now.'] },
    ],
    signs: [{ x: 15, y: 8, text: 'Warden\'s Pier. Challengers welcome.' }, { x: 25, y: 9, text: 'East: Saltmarsh, then Cindermere.' }],
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
      { x: 31, y: 4, to: 'cinder', tx: 1, ty: 10, dir: 'right' }, { x: 31, y: 5, to: 'cinder', tx: 1, ty: 11, dir: 'right' },
    ],
  },
  spire: {
    name: 'Static Spire', w: 22, h: 26, base: 'X', theme: 'spire', edge: 'X', music: 'spire', bg: 'spire', encAll: true,
    enc: { rate: 0.08, table: [['noxwing', 27, 30, 28], ['cragnaw', 27, 30, 24], ['stagvolt', 27, 30, 24], ['magmander', 28, 30, 12], ['phantigre', 29, 31, 12]] },
    ops: [
      ['p', 9, 20, 4, 6], ['p', 3, 15, 16, 5], ['p', 3, 8, 3, 7], ['p', 16, 8, 3, 7], ['p', 3, 5, 16, 3], ['p', 10, 4, 2, 1], ['p', 7, 1, 8, 3],
      ['?P', 11, 26, 3, 1, 16, 20, 'p'], ['S', 14, 1],
    ],
    npcs: [
      { id: 'aco1', name: 'Null Acolyte', look: 'acolyte', x: 4, y: 9, dir: 'down', script: 'trainer', sight: 3, trainer: { party: [['noxwing', 28], ['cragnaw', 29]], gold: 500, before: 'The Lattice is a cage. We are only opening the door.', after: 'It... it doesn\'t matter. The Maw is already awake.' } },
      { id: 'aco2', name: 'Null Acolyte', look: 'acolyte', x: 17, y: 9, dir: 'down', script: 'trainer', sight: 3, trainer: { party: [['phantigre', 29], ['magmander', 29]], gold: 500, before: 'No further, Tamer. Your Kith will thank us when they are free.', after: 'Free... of what? I can\'t remember what we wanted.' } },
      { id: 'aco3', name: 'Null Adept', look: 'acolyte', x: 9, y: 5, dir: 'right', script: 'trainer', sight: 2, trainer: { party: [['stagvolt', 30], ['noxwing', 30], ['phantigre', 31]], gold: 700, before: 'The Maw is hungry and you are in its doorway.', after: 'Then go in. See what a hole in the world looks like.' } },
      { id: 'font', name: 'Lattice Font', look: 'font', x: 15, y: 17, script: 'font' },
      { id: 'null', name: 'Nullmaw', look: 'kith:nullmaw', x: 10, y: 2, dir: 'down', script: 'nullmaw', hide: 'clear' },
    ],
    chests: [{ id: 'p1', x: 17, y: 6, item: 'shard', n: 1 }, { id: 'p2', x: 4, y: 6, item: 'tonicx', n: 3 }, { id: 'p3', x: 4, y: 17, item: 'rekindle', n: 1 }],
    warps: [{ x: 10, y: 25, to: 'gale', tx: 13, ty: 1, dir: 'down' }, { x: 11, y: 25, to: 'gale', tx: 14, ty: 1, dir: 'down' }, { x: 14, y: 1, to: 'deep1', tx: 11, ty: 18, dir: 'up', need: 'clear', deny: 'A stair of raw static drops into the dark. Something at the top of this tower is holding it shut.' }],
  },
  cinder: {
    name: 'Cindermere', w: 28, h: 22, base: '.', theme: 'ash', edge: 'T', music: 'town', bg: 'ash', town: [10, 10],
    ops: [
      ...border(28, 22), ['L', 15, 14, 9, 5], ['?f', 21, 16, 2, 2, 24, 18], ['?T', 22, 5, 2, 2, 24, 18], ['?R', 23, 6, 2, 12, 12, 8],
      [':', 0, 10, 24, 2], [':', 6, 9], [':', 14, 9], [':', 18, 9], [':', 22, 0, 2, 12], [':', 8, 12, 2, 4],
    ],
    buildings: [
      { x: 4, y: 6, w: 5, h: 3, roof: 'teal', sign: 'heal', dx: 2, door: 'mender' },
      { x: 12, y: 6, w: 5, h: 3, roof: 'gold', sign: 'shop', dx: 2, door: 'shop3' },
      { x: 3, y: 14, w: 4, h: 3, roof: 'red', dx: 1, door: 'locked' },
    ],
    npcs: [
      { id: 'kael', name: 'Warden Kael', look: 'kael', x: 8, y: 16, dir: 'up', script: 'kael' },
      { id: 'way', name: 'Waygate', look: 'gate', x: 18, y: 8, script: 'waygate' },
      { id: 'rift3', name: 'Static Rift', look: 'rift', x: 22, y: 2, script: 'rift2', hide: 'kael' },
      { id: 'rift4', name: 'Static Rift', look: 'rift', x: 23, y: 2, script: 'rift2', hide: 'kael' },
      { id: 'smith', name: 'Smith Oda', look: 'smith', x: 12, y: 13, dir: 'down', script: 'talk', lines: ['The lake never cools. Coalcub come down from the pass to bathe in it, and some of them come out... bigger.', 'Every Kith family has its own rite. Ours ascend on hot ground. Try the Lattice while you stand here.'] },
      { id: 'kid3', name: 'Pell', look: 'girl', x: 20, y: 12, dir: 'left', script: 'talk', lines: ['Touch a Waygate once and you can ride the Lattice back to it from anywhere. Menu, then Travel!', 'Warden Kael says the higher your level over a foe, the harder you hit. And the other way round. Ow.'] },
    ],
    signs: [{ x: 21, y: 4, text: 'North: Ashen Pass, then Galehaven.' }],
    warps: [
      { x: 0, y: 10, to: 'marsh', tx: 30, ty: 4, dir: 'left' }, { x: 0, y: 11, to: 'marsh', tx: 30, ty: 5, dir: 'left' },
      { x: 22, y: 0, to: 'ashpass', tx: 14, ty: 28, dir: 'up' }, { x: 23, y: 0, to: 'ashpass', tx: 15, ty: 28, dir: 'up' },
    ],
  },
  ashpass: {
    name: 'Ashen Pass', w: 30, h: 30, base: '.', theme: 'ash', edge: 'T', music: 'route', bg: 'ash',
    enc: { rate: 0.14, table: [['magmander', 20, 23, 24], ['cragnaw', 20, 23, 22], ['coalcub', 19, 21, 16], ['noxwing', 20, 23, 18], ['pebblit', 19, 21, 10], ['phantigre', 22, 24, 10]] },
    ops: [
      ...border(30, 30),
      [',', 16, 22, 8, 5], [',', 2, 13, 4, 6], [',', 10, 3, 10, 5], [',', 24, 8, 4, 10], ['L', 17, 13, 4, 6], ['L', 9, 14, 4, 4],
      ['?T', 31, 14, 2, 2, 26, 26], ['?R', 32, 12, 2, 2, 26, 26], ['?f', 33, 20, 2, 2, 26, 26],
      [':', 14, 20, 2, 10], [':', 14, 20, 10, 2], [':', 22, 10, 2, 12], [':', 6, 10, 18, 2], [':', 6, 0, 2, 12],
      [',', 18, 20, 3, 2], [',', 12, 10, 4, 2],
    ],
    npcs: [
      { id: 'brask', name: 'Tamer Brask', look: 'rook', x: 21, y: 15, dir: 'right', script: 'trainer', sight: 2, trainer: { party: [['magmander', 22], ['cragnaw', 23]], gold: 320, before: 'The pass burns the weak ones off. Let\'s see which you are.', after: 'Not weak. Noted.' } },
      { id: 'isolde', name: 'Tamer Isolde', look: 'wren', x: 8, y: 6, dir: 'left', script: 'trainer', sight: 2, trainer: { party: [['noxwing', 23], ['magmander', 24], ['phantigre', 24]], gold: 380, before: 'Galehaven is close. So am I. Unlucky.', after: 'The snow up there will feel kind after this.' } },
    ],
    chests: [{ id: 'a1', x: 26, y: 26, item: 'tonicx', n: 3 }, { id: 'a2', x: 3, y: 10, item: 'shard', n: 1 }, { id: 'a3', x: 26, y: 4, item: 'sealx', n: 2 }],
    signs: [{ x: 16, y: 19, text: 'Ashen Pass. Lava does not move for travellers.' }],
    warps: [
      { x: 14, y: 29, to: 'cinder', tx: 22, ty: 1, dir: 'down' }, { x: 15, y: 29, to: 'cinder', tx: 23, ty: 1, dir: 'down' },
      { x: 6, y: 0, to: 'gale', tx: 13, ty: 20, dir: 'up' }, { x: 7, y: 0, to: 'gale', tx: 14, ty: 20, dir: 'up' },
    ],
  },
  gale: {
    name: 'Galehaven', w: 28, h: 22, base: '.', theme: 'snow', edge: 'T', music: 'town', bg: 'snow', town: [13, 12],
    ops: [
      ...border(28, 22), ['~', 20, 2, 5, 3], ['?T', 41, 6, 2, 12, 24, 8], ['?f', 42, 14, 2, 2, 24, 18],
      [':', 13, 10, 2, 12], [':', 4, 10, 20, 2], [':', 6, 9], [':', 19, 9], [':', 16, 9], [':', 13, 0, 2, 10], [':', 9, 4, 4, 2],
    ],
    buildings: [
      { x: 4, y: 6, w: 5, h: 3, roof: 'teal', sign: 'heal', dx: 2, door: 'mender' },
      { x: 17, y: 6, w: 5, h: 3, roof: 'gold', sign: 'shop', dx: 2, door: 'shop3' },
      { x: 5, y: 14, w: 4, h: 3, roof: 'blue', dx: 1, door: 'locked' },
      { x: 18, y: 14, w: 4, h: 3, roof: 'violet', dx: 1, door: 'locked' },
    ],
    npcs: [
      { id: 'yuna', name: 'Warden Yuna', look: 'yuna', x: 9, y: 3, dir: 'down', script: 'yuna' },
      { id: 'way', name: 'Waygate', look: 'gate', x: 16, y: 8, script: 'waygate' },
      { id: 'gate3', name: 'Static Gate', look: 'rift', x: 13, y: 2, script: 'gate2', hide: 'yuna' },
      { id: 'gate4', name: 'Static Gate', look: 'rift', x: 14, y: 2, script: 'gate2', hide: 'yuna' },
      { id: 'scout', name: 'Scout Ferro', look: 'scout', x: 10, y: 13, dir: 'right', script: 'talk', lines: ['The Spire is one ridge north. On clear nights you can see the Lattice bend toward it.', 'They say there is a stair under the Spire that goes down further than the tower goes up. Nobody has found the bottom.'] },
      { id: 'kid4', name: 'Miri', look: 'kid', x: 21, y: 12, dir: 'down', script: 'talk', lines: ['My Voltick ascended when it got fast enough! My brother\'s Murklet needed ten wins first.', 'Kith can reach Lv 100. I counted the Lattice once. There are enough nodes for almost all of it.'] },
    ],
    signs: [{ x: 15, y: 4, text: 'North: the Static Spire.' }],
    warps: [
      { x: 13, y: 21, to: 'ashpass', tx: 6, ty: 1, dir: 'down' }, { x: 14, y: 21, to: 'ashpass', tx: 7, ty: 1, dir: 'down' },
      { x: 13, y: 0, to: 'spire', tx: 10, ty: 24, dir: 'up' }, { x: 14, y: 0, to: 'spire', tx: 11, ty: 24, dir: 'up' },
    ],
  },
};

// The Hollow Deep: 24 generated floors under the Spire. Wild levels climb 3 per floor to Lv 100,
// and every fourth floor is a guardian's arena with a font and a Waygate before it.
export const DEEP_FLOORS = 24;
export const deepLevel = f => 28 + f * 3;
const DEEP_POOL = ['stagvolt', 'cragnaw', 'noxwing', 'sporelord', 'finfathom', 'magmander', 'phantigre'];
const DEEP_RARE = ['brinelle', 'flarevane', 'brambuck', 'maelorca', 'solkharn', 'eldergrove'];
export const GUARDIANS = {
  4: { name: 'Hollowed Maelorca', look: 'kith:maelorca', party: [['maelorca', 42]], boss: 3 },
  8: { name: 'Hollowed Eldergrove', look: 'kith:eldergrove', party: [['eldergrove', 54]], boss: 3.3, traits: { enrage: 0.3 } },
  12: { name: 'Hollowed Solkharn', look: 'kith:solkharn', party: [['solkharn', 66]], boss: 3.6, traits: { enrage: 0.4 } },
  16: { name: 'Null Herald', look: 'acolyte', party: [['phantigre', 77], ['magmander', 77], ['noxwing', 78], ['stagvolt', 79], ['maelorca', 80]] },
  20: { name: 'Nullmaw Echo', look: 'kith:nullmaw', party: [['nullmaw', 90]], fix: { hp: 2100, en: 400, atk: 100, def: 62, spd: 64 }, traits: { enrage: 0.4 } },
  24: { name: 'The Unlit', look: 'kith:unlit', party: [['unlit', 100]], fix: { hp: 2700, en: 900, atk: 94, def: 68, spd: 80 }, traits: { enrage: 0.6, double: true } },
};
function deepFloor(f) {
  const cave = (((f - 1) / 4) | 0) % 2 === 1, fl = cave ? 'c' : 'p', L = deepLevel(f), g = GUARDIANS[f];
  const r = n => hash(f, n, 77), ri = (n, a, b) => a + ((r(n) * (b - a + 1)) | 0);
  const d = {
    name: `Hollow Deep · F${f}`, w: 24, h: 22, base: cave ? '#' : 'X', theme: cave ? 'cave' : 'spire', edge: cave ? '#' : 'X',
    music: cave ? 'cave' : 'spire', bg: cave ? 'cave' : 'spire', encAll: true, deep: f, ops: [], npcs: [], chests: [], warps: [],
    enc: { rate: 0.085, table: [...DEEP_POOL.map((sp, i) => [sp, L - 1, L + 1, 12 + ((r(40 + i) * 10) | 0)]), [DEEP_RARE[(f + ((r(50) * 3) | 0)) % DEEP_RARE.length], L, L + 1, 5]] },
  };
  const down = (x, y) => d.warps.push({ x, y, to: f === 1 ? 'spire' : 'deep' + (f - 1), tx: -1, ty: -1, dir: 'down', back: true });
  const up = (x, y) => { if (f < DEEP_FLOORS) d.warps.push({ x, y, to: 'deep' + (f + 1), tx: -1, ty: -1, dir: 'up' }); };
  if (g) {
    d.ops.push([fl, 8, 15, 8, 5], [fl, 11, 9, 2, 6], [fl, 6, 3, 12, 6], [fl, 11, 1, 1, 2], ['S', 11, 19], ['S', 12, 19]);
    if (f < DEEP_FLOORS) d.ops.push(['S', 11, 1]);
    d.start = [11, 18]; d.top = [11, 2];
    down(11, 19); down(12, 19); up(11, 1);
    d.npcs.push({ id: 'g' + f, name: g.name, look: g.look, x: 11, y: 3, dir: 'down', script: 'guardian', hide: 'dg' + f, g, floor: f });
    d.npcs.push({ id: 'font', name: 'Lattice Font', look: 'font', x: 9, y: 16, script: 'font' }, { id: 'way', name: 'Waygate', look: 'gate', x: 14, y: 16, script: 'waygate' });
    d.chests.push({ id: 'dg' + f + 'a', x: 7, y: 4, item: 'shard', n: 2 }, { id: 'dg' + f + 'b', x: 16, y: 4, item: 'elixir', n: 2 });
    d.camp = true;
  } else {
    const rooms = [];
    for (let i = 0; i < 5; i++) { const w = ri(i, 4, 7), h = ri(i + 10, 3, 4); rooms.push({ x: ri(i + 20, 2, 22 - w - 1), y: 17 - i * 4, w, h }); }
    for (const q of rooms) d.ops.push([fl, q.x, q.y, q.w, q.h]);
    for (let i = 0; i < 4; i++) {
      const a = rooms[i], b = rooms[i + 1], ax = a.x + (a.w >> 1), bx = b.x + (b.w >> 1);
      d.ops.push([fl, Math.min(ax, bx), a.y, Math.abs(ax - bx) + 2, 2], [fl, bx, b.y, 2, a.y - b.y + 1]);
    }
    if (!cave) d.ops.push(['?P', 100 + f, 14, 1, 1, 22, 20, 'p']);
    const a = rooms[0], z = rooms[4], sx = a.x + (a.w >> 1), ex = z.x + (z.w >> 1);
    d.ops.push([fl, sx, a.y + a.h, 1, 1], ['S', sx, a.y + a.h], [fl, ex, z.y - 1, 1, 1], ['S', ex, z.y - 1]);
    d.start = [sx, a.y + a.h - 1]; d.top = [ex, z.y];
    down(sx, a.y + a.h); up(ex, z.y - 1);
    const c = rooms[2 + (f % 2)];
    d.chests.push({ id: 'd' + f, x: c.x, y: c.y, item: ['tonicx', 'elixir', 'rekindle', 'etherx', 'shard'][f % 5], n: f % 5 === 4 ? 1 : 2 });
  }
  return d;
}
for (let f = 1; f <= DEEP_FLOORS; f++) defs['deep' + f] = deepFloor(f);
for (let f = 1; f <= DEEP_FLOORS; f++) for (const w of defs['deep' + f].warps) {
  if (w.to === 'spire') { w.tx = 13; w.ty = 1; w.dir = 'left'; continue; }
  const t = defs[w.to];
  [w.tx, w.ty] = w.back ? t.top : t.start;
}
{ const w = defs.spire.warps.find(q => q.to === 'deep1'); [w.tx, w.ty] = defs.deep1.start; }

export const MAPS = {};
for (const id in defs) {
  const d = defs[id];
  d.id = id;
  d.t = build(d.w, d.h, d.base, d.ops);
  d.npcs = d.npcs || []; d.chests = d.chests || []; d.signs = d.signs || []; d.buildings = d.buildings || []; d.warps = d.warps || [];
  const floor = d.theme === 'cave' ? 'c' : d.theme === 'spire' ? 'p' : '.';
  for (const o of [...d.npcs, ...d.chests, ...d.signs]) if ('TRKL,'.includes(d.t[o.y][o.x])) d.t[o.y][o.x] = floor;
  MAPS[id] = d;
}
