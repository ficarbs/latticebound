// The Lattice: one shared node graph every Kith grows along.
// Six element arms radiate from a hub; rings between arms sit behind Lv.1 locks.
import { ELS, ARM_SKILLS, SKILLS, STAT_NAMES, ASCEND_LV } from './data.js';

const STEP = 22, BRANCH = 20;
const VAL = { hp: 10, en: 4, atk: 2, def: 2, spd: 2 };
const FLAVOR = {
  ember: ['atk', 'hp', 'atk', 'spd', 'atk', 'en'],
  tide: ['en', 'hp', 'def', 'en', 'hp', 'atk'],
  bloom: ['hp', 'def', 'hp', 'en', 'hp', 'atk'],
  volt: ['spd', 'atk', 'spd', 'en', 'spd', 'hp'],
  stone: ['def', 'hp', 'def', 'atk', 'def', 'hp'],
  shade: ['atk', 'spd', 'en', 'atk', 'spd', 'hp'],
};

export const NODES = [], EDGES = [], ADJ = [];
export const START = {};
const add = o => { o.id = NODES.length; NODES.push(o); ADJ.push([]); return o.id; };
const link = (a, b) => { EDGES.push([a, b]); ADJ[a].push(b); ADJ[b].push(a); };

const hub = add({ x: 0, y: 0, t: 'hub', arm: -1 });
const main = [];
const counters = {};
function stat(el, big) {
  const f = FLAVOR[el];
  counters[el] = (counters[el] || 0) + 1;
  const t = f[counters[el] % f.length];
  return { t, v: VAL[t] * (big ? 2 : 1), big };
}
ELS.forEach((el, i) => {
  const ang = (-90 + 60 * i) * Math.PI / 180;
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
  const sk = ARM_SKILLS[el], m = [];
  let prev = hub;
  for (let d = 1; d <= 12; d++) {
    const bx = ux * STEP * d, by = uy * STEP * d;
    let n;
    if (d === 1) n = { t: 'skill', skill: sk[0] };
    else if (d === 11) n = { t: 'skill', skill: sk[3] };
    else if (d === 8) n = { t: 'ascend', lvl: 1 };
    else if (d === 12) n = { t: 'ascend', lvl: 2 };
    else if (d === 10) n = { t: 'lock', lvl: 2 };
    else n = stat(el, d === 9);
    const id = add({ x: Math.round(bx), y: Math.round(by), arm: i, ...n });
    link(prev, id); prev = id; m[d] = id;
    const len = { 4: 1, 5: 2, 7: 2, 9: 1 }[d];
    if (!len) continue;
    for (const side of [-1, 1]) {
      let p = id;
      for (let j = 1; j <= len; j++) {
        const tip = j === len;
        const nn = tip && side === 1 && (d === 5 || d === 7) ? { t: 'skill', skill: sk[d === 5 ? 1 : 2] } : stat(el, tip && (len > 1 || d === 9));
        const b = add({ x: Math.round(bx + vx * BRANCH * j * side), y: Math.round(by + vy * BRANCH * j * side), arm: i, ...nn });
        link(p, b); p = b;
      }
    }
  }
  main.push(m);
  START[el] = [m[1], m[2]];
});
// Rings between neighbouring arms, each gated by a Lv.1 lock.
ELS.forEach((el, i) => {
  const j = (i + 1) % 6, r = STEP * 6 * 0.96;
  let p = main[i][6];
  [0.25, 0.5, 0.75].forEach((f, n) => {
    const ang = (-90 + 60 * (i + f)) * Math.PI / 180;
    const o = n === 1 ? { t: 'lock', lvl: 1, arm: -1 } : { ...stat(n ? ELS[j] : el, true), arm: n ? j : i };
    const id = add({ x: Math.round(Math.cos(ang) * r), y: Math.round(Math.sin(ang) * r), ...o });
    link(p, id); p = id;
  });
  link(p, main[j][6]);
});

// Order wild and rival Kith fill nodes in: own arm outward first, then the rest through the hub.
const orders = {};
export function autoOrder(el) {
  if (orders[el]) return orders[el];
  const arm = ELS.indexOf(el), dist = new Map(START[el].map(id => [id, 0]));
  const q = [...START[el]];
  while (q.length) {
    const a = q.shift();
    for (const b of ADJ[a]) {
      const n = NODES[b];
      if (dist.has(b) || n.t === 'lock' || n.t === 'ascend') continue;
      dist.set(b, dist.get(a) + 1); q.push(b);
    }
  }
  const list = [...dist.keys()].filter(id => dist.get(id) > 0);
  const key = id => (NODES[id].arm === arm ? 0 : 1000) + dist.get(id);
  return (orders[el] = list.sort((a, b) => key(a) - key(b) || a - b));
}

export function nodeLabel(n) {
  if (n.t === 'hub') return 'The Heart';
  if (n.t === 'skill') return `Skill: ${SKILLS[n.skill].name}`;
  if (n.t === 'lock') return `Lock Lv.${n.lvl}`;
  if (n.t === 'ascend') return `Ascension ${n.lvl === 1 ? 'I' : 'II'}`;
  return `+${n.v} ${STAT_NAMES[n.t]}`;
}
export function nodeDesc(n) {
  if (n.t === 'hub') return 'Where every arm of the Lattice meets. +1 to all stats.';
  if (n.t === 'skill') return SKILLS[n.skill].desc;
  if (n.t === 'lock') return `Sealed. Needs Lattice Key ${n.lvl === 1 ? 'I' : 'II'}.`;
  if (n.t === 'ascend') return `A Kith of Lv ${ASCEND_LV[n.lvl]}+ ascends to its next form here. Kith with no further form gain an apex bonus.`;
  return `Permanently raises ${STAT_NAMES[n.t]} by ${n.v}.`;
}
