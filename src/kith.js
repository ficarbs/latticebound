// Kith instances: stats, growth along the Lattice, items.
import { G } from './state.js';
import { SPECIES, ITEMS, xpNeed, ASCEND_LV } from './data.js';
import { NODES, ADJ, START, autoOrder } from './grid.js';

const KEYS = ['hp', 'en', 'atk', 'def', 'spd'];

export function makeKith(sp, lv = 1) {
  const s = SPECIES[sp];
  const k = {
    uid: Math.random().toString(36).slice(2, 10), sp, name: s.name, lv, xp: 0, sparks: 0, apex: 0,
    nodes: s.id === 'nullmaw' ? [] : [...START[s.el]], skills: [], known: [], hp: 1, en: 1,
  };
  for (const id of s.innate) learn(k, id);
  if (k.nodes.length) {
    const order = autoOrder(s.el);
    for (let i = 0; i < lv - 1 && i < order.length; i++) activate(k, order[i]);
    k.at = k.nodes[k.nodes.length - 1];
  }
  const st = statsOf(k);
  k.hp = st.hp; k.en = st.en;
  return k;
}

export function statsOf(k) {
  const b = SPECIES[k.sp].b;
  const s = { hp: b[0], en: b[1], atk: b[2], def: b[3], spd: b[4] };
  for (const id of k.nodes) {
    const n = NODES[id];
    if (n.t in s) s[n.t] += n.v;
    else if (n.t === 'hub') for (const key of KEYS) s[key] += 1;
  }
  if (k.apex) { s.hp += 14 * k.apex; for (const key of KEYS.slice(2)) s[key] += 3 * k.apex; }
  if (k.boss) s.hp = Math.round(s.hp * k.boss);
  return s;
}

export function learn(k, id) {
  if (id === 'strike' || k.known.includes(id)) return false;
  k.known.push(id);
  if (k.skills.length < 4) k.skills.push(id);
  return true;
}

// Why a node can't be activated right now, or null if it can.
export function cantReason(k, n) {
  if (k.nodes.includes(n.id)) return 'Already active.';
  if (!ADJ[n.id].some(a => k.nodes.includes(a))) return 'Not connected yet.';
  if (n.t === 'lock' && !G.p.bag['key' + n.lvl]) return `Needs Lattice Key ${n.lvl === 1 ? 'I' : 'II'}.`;
  if (n.t === 'ascend' && k.lv < ASCEND_LV[n.lvl]) return `Needs Lv ${ASCEND_LV[n.lvl]}.`;
  if (k.sparks < 1) return 'No Sparks left.';
  return null;
}

export function activate(k, id) {
  const n = NODES[id];
  k.nodes.push(id);
  k.at = id;
  if (n.t === 'hp') k.hp += n.v;
  else if (n.t === 'en') k.en += n.v;
  else if (n.t === 'skill') learn(k, n.skill);
  return n;
}

export function evolve(k) {
  const from = SPECIES[k.sp], to = SPECIES[from.to];
  const before = statsOf(k);
  if (k.name === from.name) k.name = to.name;
  k.sp = to.id;
  const after = statsOf(k);
  k.hp += after.hp - before.hp; k.en += after.en - before.en;
  learn(k, to.learn);
  return to;
}
export function apex(k) {
  k.apex = (k.apex || 0) + 1;
  k.hp += 14;
}

// Returns the number of levels gained.
export function gainXp(k, amt) {
  let ups = 0;
  k.xp += amt;
  while (k.lv < 50 && k.xp >= xpNeed(k.lv)) { k.xp -= xpNeed(k.lv); k.lv++; k.sparks++; ups++; }
  return ups;
}

export function healAll() {
  for (const k of [...G.p.party, ...G.p.reserve]) { const s = statsOf(k); k.hp = s.hp; k.en = s.en; }
}

export function addKith(k) {
  if (G.p.party.length < 3) { G.p.party.push(k); return 'party'; }
  G.p.reserve.push(k);
  return 'haven';
}

export const give = (id, n = 1) => { G.p.bag[id] = (G.p.bag[id] || 0) + n; };

// Uses an item on a Kith. Returns a message, or null when it would have no effect.
export function applyItem(id, k) {
  const it = ITEMS[id], s = statsOf(k);
  if (it.heal) {
    if (k.hp <= 0 || k.hp >= s.hp) return null;
    const v = Math.min(it.heal, s.hp - k.hp); k.hp += v;
    return `${k.name} recovered ${v} HP.`;
  }
  if (it.en) {
    if (k.hp <= 0 || k.en >= s.en) return null;
    const v = Math.min(it.en, s.en - k.en); k.en += v;
    return `${k.name} recovered ${v} EN.`;
  }
  if (it.revive) {
    if (k.hp > 0) return null;
    k.hp = Math.round(s.hp * it.revive);
    return `${k.name} was rekindled!`;
  }
  if (it.spark) { k.sparks++; return `${k.name} gained a Spark!`; }
  return null;
}
