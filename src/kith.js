// Kith instances: stats, growth along the Lattice, items.
import { G } from './state.js';
import { SPECIES, SKILLS, ITEMS, CHARTS, xpNeed, ASCEND_LV, MAX_LV } from './data.js';
import { NODES, ADJ, START, autoOrder } from './grid.js';

const KEYS = ['hp', 'en', 'atk', 'def', 'spd'];

export function makeKith(sp, lv = 1) {
  const s = SPECIES[sp];
  const k = {
    uid: Math.random().toString(36).slice(2, 10), sp, name: s.name, lv, xp: 0, sparks: 0, apex: 0, wins: 0, bursts: 0,
    nodes: s.raw ? [] : [...START[s.el]], skills: [], known: [], hp: 1, en: 1,
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
  if (k.fix) return { ...k.fix };
  const b = SPECIES[k.sp].b;
  const s = { hp: b[0], en: b[1], atk: b[2], def: b[3], spd: b[4] };
  for (const id of k.nodes) {
    const n = NODES[id];
    if (n.t in s) s[n.t] += n.v;
    else if (n.t === 'hub') for (const key of KEYS) s[key] += 1;
  }
  if (k.apex) { s.hp += 14 * k.apex; for (const key of KEYS.slice(2)) s[key] += 3 * k.apex; }
  if (k.boss) s.hp = Math.round(s.hp * k.boss);
  if (k.pr) for (const key of KEYS) s[key] = Math.round(s[key] * 1.1);
  return s;
}

export function learn(k, id) {
  if (id === 'strike' || k.known.includes(id)) return false;
  k.known.push(id);
  if (k.skills.length < 4) k.skills.push(id);
  return true;
}

// ---- Forms ----
export const rootOf = sp => { while (SPECIES[sp].from) sp = SPECIES[sp].from; return sp; };
// Older saves and freshly caught Kith get their form records filled in here.
export function formsOf(k) {
  if (!k.base || !CHARTS[k.base]) k.base = rootOf(k.sp);
  if (!k.forms) { k.forms = []; for (let sp = k.sp; sp; sp = SPECIES[sp].from) k.forms.unshift(sp); }
  if (!k.fw) k.fw = {};
  return k.forms;
}
export const chartOf = k => (formsOf(k), CHARTS[k.base] || []);
// A form's level rises with every two battles won while wearing it.
export const formLv = (k, f) => (formsOf(k).includes(f) ? Math.min(99, 1 + ((k.fw[f] || 0) >> 1)) : 0);
export const tierCap = k => k.nodes.filter(id => NODES[id].t === 'ascend').length;
export function needOk(k, r) {
  const el = SPECIES[k.sp].el;
  if (r.t === 'lv') return k.lv >= r.n;
  if (r.t === 'stat') return statsOf(k)[r.s] >= r.n;
  if (r.t === 'form') return formLv(k, r.f) >= r.n;
  if (r.t === 'nodes') return k.nodes.length >= r.n;
  if (r.t === 'wins') return (k.wins || 0) >= r.n;
  if (r.t === 'bursts') return (k.bursts || 0) >= r.n;
  if (r.t === 'skills') return k.known.length >= r.n;
  if (r.t === 'cross') return k.known.some(id => SKILLS[id].el !== el);
  if (r.t === 'ally') return G.p.party.some(q => q !== k && SPECIES[q.sp].el === r.el);
  if (r.t === 'place') return r.maps.includes(G.p.map);
  return true;
}
export function needText(k, r) {
  const now = r.t === 'stat' ? statsOf(k)[r.s] : r.t === 'form' ? formLv(k, r.f) : r.t === 'nodes' ? k.nodes.length : r.t === 'wins' ? k.wins || 0 : r.t === 'bursts' ? k.bursts || 0 : r.t === 'skills' ? k.known.length : null;
  return needOk(k, r) || now == null || r.t === 'stat' ? r.text : `${r.text} (now ${now})`;
}
// Tier 1 forms need Ascension I lit, tiers 2 and 3 need Ascension II.
export const tierOpen = (k, row) => tierCap(k) >= Math.min(2, row.tier);
export const canUnlock = (k, row) => tierOpen(k, row) && row.need.every(r => needOk(k, r));
export const newForms = k => chartOf(k).filter(row => !k.forms.includes(row.form) && canUnlock(k, row));
export function shiftForm(k, to) {
  formsOf(k);
  const from = SPECIES[k.sp], next = SPECIES[to], before = statsOf(k);
  if (k.name === from.name) k.name = next.name;
  k.sp = to;
  if (!k.forms.includes(to)) k.forms.push(to);
  if (G.p) dexMark(to, 2);
  const after = statsOf(k);
  k.hp = k.hp <= 0 ? 0 : Math.max(1, Math.round(k.hp * after.hp / before.hp));
  k.en = Math.min(after.en, Math.round(k.en * after.en / before.en));
  if (next.learn) learn(k, next.learn);
  return next;
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

// Returns the number of levels gained.
export function gainXp(k, amt) {
  let ups = 0;
  k.xp += amt;
  while (k.lv < MAX_LV && k.xp >= xpNeed(k.lv)) { k.xp -= xpNeed(k.lv); k.lv++; k.sparks++; ups++; }
  return ups;
}

export function healAll() {
  for (const k of [...G.p.party, ...G.p.reserve]) { const s = statsOf(k); k.hp = s.hp; k.en = s.en; }
}

// The Index: 1 = met in battle, 2 = a form one of your Kith has worn.
export function dexMark(sp, n) { const d = G.p.dex || (G.p.dex = {}); if ((d[sp] || 0) < n) d[sp] = n; }
export function syncDex() { for (const k of [...G.p.party, ...G.p.reserve]) for (const f of formsOf(k)) dexMark(f, 2); }

export function addKith(k) {
  for (const f of formsOf(k)) dexMark(f, 2);
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
