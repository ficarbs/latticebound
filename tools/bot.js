// Playthrough bot: plays from a new game to the credits through the real input and UI paths.
// In the dev console:  const bot = await import('/tools/bot.js'); await bot.play('embrit');
// It walks with held keys, fights through the battle menus, and spends Sparks the way a sensible player would.
import { G } from '../src/state.js';
import * as I from '../src/input.js';
import { W } from '../src/world.js';
import { MAPS } from '../src/maps.js';
import * as K from '../src/kith.js';
import { NODES, ADJ } from '../src/grid.js';
import { SKILLS, SPECIES, ELS, effect } from '../src/data.js';
import { SOLID } from '../src/art.js';

const ch = new MessageChannel();
let wake = null;
ch.port1.onmessage = () => { const w = wake; wake = null; if (w) w(); };
const pause = () => new Promise(r => { wake = r; ch.port2.postMessage(0); });
const tick = async (t = 0.1) => { window.__tick(t); await pause(); };
const $ = s => document.querySelector(s);
const vis = el => !!el && !el.closest('.hidden');
const flag = k => !!G.p.flags[k];

export const stats = { battles: 0, wins: 0, losses: 0, binds: 0, runs: 0, steps: 0, turns: 0, marks: [], status: 'idle', error: null };
let pendingItem = null, wantKith = null, starter = 'embrit', inBattle = false;

const party = () => G.p.party;
const mark = label => stats.marks.push({ label, min: +(G.p.time / 60).toFixed(1), battles: stats.battles, losses: stats.losses, party: party().map(k => `${k.name} ${k.lv}`), gold: G.p.gold });

function battleTurn(cmd) {
  const btns = [...cmd.querySelectorAll('button')];
  const name = $('.b-panel.me .bp-name').textContent, me = party().find(k => k.name === name && k.hp > 0) || party().find(k => k.hp > 0);
  const foeName = $('.b-panel.foe .bp-name').textContent;
  const foeSp = Object.values(SPECIES).find(s => foeName.endsWith(s.name));
  const foeFrac = parseFloat($('.b-panel.foe .bar.hp i').style.width) / 100;
  const max = K.statsOf(me), bag = G.p.bag;
  if (btns[0].textContent === 'FIGHT') {
    stats.turns++;
    const wild = !btns[4].disabled;
    const tonic = bag.tonicx > 0 && max.hp - me.hp > 70 ? 'tonicx' : bag.tonic > 0 ? 'tonic' : bag.tonicx > 0 ? 'tonicx' : null;
    if (me.hp / max.hp < 0.35 && tonic) { pendingItem = tonic; wantKith = me; return btns[3].click(); }
    if (wild && party().length < 3 && foeFrac < 0.45 && bag.seal > 0) { pendingItem = 'seal'; return btns[3].click(); }
    if (!btns[1].disabled) return btns[1].click();
    return btns[0].click();
  }
  const ids = ['strike', ...me.skills];
  let best = 0, bs = -1;
  ids.forEach((id, i) => {
    const sk = SKILLS[id];
    if (btns[i].disabled || sk.kind !== 'atk') return;
    const s = sk.pow * effect(sk.el, foeSp.el) * (sk.el === SPECIES[me.sp].el ? 1.2 : 1);
    if (s > bs) { bs = s; best = i; }
  });
  btns[best].click();
}

async function act() {
  const scr = [...document.querySelectorAll('.screen')].pop();
  if (vis($('.d-opts'))) { I.tap('a'); return tick(0.1); }
  if (scr) {
    if (scr.classList.contains('starter')) scr.querySelectorAll('button')[['embrit', 'puddlop', 'sprigit'].indexOf(starter)].click();
    else if (scr.classList.contains('party')) {
      const bs = [...scr.querySelectorAll('button:not(:disabled)')];
      const b = bs.find(x => x._k === wantKith) || bs[0];
      wantKith = null;
      if (b) b.click(); else I.tap('b');
    } else if (scr.classList.contains('bag') && pendingItem) {
      const b = [...scr.querySelectorAll('button')].find(x => x._id === pendingItem);
      pendingItem = null;
      if (b) b.click(); else I.tap('b');
    } else I.tap('b');
    return tick(0.1);
  }
  if (!$('#ending').classList.contains('hidden')) { $('#ending button').click(); return tick(0.1); }
  if (G.mode === 'battle') {
    if (!inBattle) { inBattle = true; stats.battles++; }
    const cmd = $('.b-cmd');
    if (vis(cmd)) battleTurn(cmd); else I.tap('a');
    return tick(0.15);
  }
  if (inBattle && G.mode === 'world') {
    inBattle = false;
    const m = $('.b-msg').textContent;
    if (m.startsWith('All your Kith')) stats.losses++; else if (m.startsWith('Bound')) stats.binds++; else if (m.startsWith('Got away')) stats.runs++; else stats.wins++;
  }
  I.tap('a');
  return tick(0.12);
}
const idle = () => G.mode === 'world' && !G.busy && !W.pl.moving && G.wipe <= 0 && $('#dialog').classList.contains('hidden') && !$('.screen') && !$('.menu') && $('#ending').classList.contains('hidden');
async function settle() {
  await tick(0.02);
  for (let i = 0; i < 6000; i++) { if (idle()) { if (inBattle) await act(); return; } await act(); }
  throw new Error(`settle timeout: mode ${G.mode}, busy ${G.busy}, msg "${($('.b-msg') || {}).textContent}", dialog "${$('.d-text').textContent}"`);
}

// Spend Sparks: head for the Ascension node while the Kith can still evolve, favour its own arm, ATK and skills.
const distTo = {};
function dist(target) {
  if (distTo[target]) return distTo[target];
  const d = new Map([[target, 0]]), q = [target];
  while (q.length) { const a = q.shift(); for (const b of ADJ[a]) if (!d.has(b)) { d.set(b, d.get(a) + 1); q.push(b); } }
  return (distTo[target] = d);
}
function spend(k) {
  const arm = ELS.indexOf(SPECIES[k.sp].el);
  while (k.sparks > 0) {
    const own = new Set(k.nodes);
    const goal = SPECIES[k.sp].to && NODES.find(n => n.arm === arm && n.t === 'ascend' && !own.has(n.id));
    let best = null, bs = -1e9;
    for (const n of NODES) {
      if (own.has(n.id) || K.cantReason(k, n)) continue;
      let s = (n.arm === arm ? 10 : 0) + ({ atk: 5, hp: 4, spd: 3, def: 3, en: 2, skill: 4, lock: 1, hub: 0, ascend: 100 }[n.t]) + (n.big ? 2 : 0);
      if (n.t === 'skill' && k.known.includes(n.skill)) s -= 12;
      if (goal) s += (12 - dist(goal.id).get(n.id)) * 1.5;
      if (s > bs) { bs = s; best = n; }
    }
    if (!best) break;
    k.sparks--;
    K.activate(k, best.id);
    if (best.t === 'ascend') { if (SPECIES[k.sp].to) K.evolve(k); else K.apex(k); }
  }
}
function upkeep() {
  const bag = G.p.bag;
  for (const k of [...party(), ...G.p.reserve]) spend(k);
  for (const k of party()) {
    if (k.hp <= 0 && bag.rekindle > 0 && K.applyItem('rekindle', k)) bag.rekindle--;
    while (k.hp > 0 && k.hp < K.statsOf(k).hp * 0.55 && (bag.tonic > 0 || bag.tonicx > 0)) { const id = bag.tonic > 0 ? 'tonic' : 'tonicx'; if (!K.applyItem(id, k)) break; bag[id]--; }
    while (bag.shard > 0) { K.applyItem('shard', k); bag.shard--; spend(k); }
  }
  // strongest healthy Kith leads
  party().sort((a, b) => (b.hp > 0) - (a.hp > 0) || b.lv - a.lv);
}
const weak = () => party().some(k => k.hp < K.statsOf(k).hp * 0.5) && !(G.p.bag.tonic > 0 || G.p.bag.tonicx > 0);

const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function blocked(x, y, goal) {
  const m = W.map;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h || SOLID.includes(m.t[y][x])) return true;
  if (m.buildings.some(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return true;
  if (m.npcs.some(n => n.x === x && n.y === y && !(n.hide && flag(n.hide)))) return true;
  if (m.chests.some(c => c.x === x && c.y === y) || m.signs.some(s => s.x === x && s.y === y)) return true;
  return m.warps.some(w => w.x === x && w.y === y) && !(goal[0] === x && goal[1] === y);
}
function nextStep(tx, ty) {
  const p = W.pl, key = (x, y) => x + ',' + y, from = new Map([[key(tx, ty), null]]), q = [[tx, ty]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const d in DV) {
      const nx = x - DV[d][0], ny = y - DV[d][1];
      if (from.has(key(nx, ny)) || blocked(nx, ny, [tx, ty])) continue;
      from.set(key(nx, ny), d);
      if (nx === p.x && ny === p.y) return d;
      q.push([nx, ny]);
    }
  }
  return null;
}
// Walks to a tile. Returns false if the map changed underneath us (a loss sends you back to the Mender).
async function walkTo(tx, ty) {
  const map = W.map.id;
  for (let n = 0; n < 600; n++) {
    await settle(); upkeep();
    if (W.map.id !== map) return false;
    const p = W.pl;
    if (p.x === tx && p.y === ty) return true;
    const d = nextStep(tx, ty);
    if (!d) throw new Error(`no path on ${map} from ${p.x},${p.y} to ${tx},${ty}`);
    const x0 = p.x, y0 = p.y;
    I.setVirtual(d, true);
    for (let i = 0; i < 12 && p.x === x0 && p.y === y0 && !G.busy && G.mode === 'world'; i++) await tick(0.03);
    I.setVirtual(d, false);
    stats.steps++;
  }
  throw new Error('walk timeout on ' + map);
}
const HOP = {
  hearth: () => 'moss', grotto: () => 'moss', spire: () => 'marsh',
  moss: t => (t === 'hearth' || t === 'grotto' ? t : 'brine'),
  brine: t => (t === 'marsh' || t === 'spire' ? 'marsh' : 'moss'),
  marsh: t => (t === 'spire' ? 'spire' : 'brine'),
};
async function travel(target) {
  for (let n = 0; n < 40 && W.map.id !== target; n++) {
    await settle();
    const hop = HOP[W.map.id](target), w = W.map.warps.find(q => q.to === hop);
    await walkTo(w.x, w.y);
    await settle();
  }
}
async function useAt(map, x, y, dir) {
  for (let n = 0; n < 30; n++) {
    await travel(map);
    if (!(await walkTo(x, y))) continue;
    I.setVirtual(dir, true); await tick(0.05); I.setVirtual(dir, false); await tick(0.05);
    if (W.pl.x !== x || W.pl.y !== y || W.map.id !== map) continue;
    I.tap('a'); await tick(0.05);
    await settle(); upkeep();
    return;
  }
  throw new Error(`could not use ${map} ${x},${y}`);
}
function shop(list) {
  for (const [id, price, want] of list) while (G.p.gold >= price && (G.p.bag[id] || 0) < want) { G.p.gold -= price; K.give(id, 1); }
}
async function rest() {
  const m = W.map.id;
  if (m === 'spire') return useAt('spire', 15, 18, 'up');
  if (m === 'brine' || m === 'marsh') { await useAt('brine', 7, 10, 'up'); return shop([['tonicx', 90, 5], ['tonic', 30, 6], ['seal', 40, 3]]); }
  await useAt('hearth', 19, 8, 'up');
  shop([['tonic', 30, 8], ['seal', 40, 4]]);
}
async function chests(map) {
  await travel(map);
  for (const c of MAPS[map].chests) {
    if (flag('c_' + c.id)) continue;
    for (const d in DV) {
      const x = c.x - DV[d][0], y = c.y - DV[d][1];
      if (blocked(x, y, [x, y])) continue;
      await useAt(map, x, y, d);
      break;
    }
  }
}
async function grind(map, a, b, n) {
  const goal = stats.battles + n;
  while (stats.battles < goal) {
    if (weak()) await rest();
    await travel(map);
    if (await walkTo(...a)) await walkTo(...b);
  }
}
// Keep challenging a boss until its flag is set, resting (and training a little) between attempts.
async function boss(label, done, map, x, y, dir, train) {
  for (let tries = 1; !flag(done); tries++) {
    if (tries > 8) throw new Error('stuck on ' + label);
    if (tries > 1 && train) await grind(...train);
    await rest();
    mark(`${label} attempt ${tries}`);
    await useAt(map, x, y, dir);
  }
  mark(label + ' beaten');
}

export async function play(pick = 'embrit') {
  starter = pick;
  stats.status = 'running';
  const t0 = performance.now();
  try {
    if (G.mode === 'title') { $('#btn-new').click(); await tick(0.2); if (vis($('.d-opts'))) { I.tap('a'); await tick(0.2); } }
    await settle();
    await useAt('hearth', 10, 16, 'up');
    mark('starter chosen');
    await chests('moss');
    await grind('moss', [9, 23], [12, 25], 4);
    await chests('grotto');
    await boss('Hollowed Cragnaw', 'key1', 'grotto', 16, 3, 'right', ['grotto', [5, 12], [12, 12], 3]);
    await travel('brine');
    await useAt('brine', 9, 15, 'right');
    mark('reached Brinecliff');
    await chests('marsh');
    await boss('Warden Maris', 'maris', 'brine', 13, 2, 'up', ['marsh', [17, 9], [20, 12], 4]);
    await chests('spire');
    await boss('Nullmaw', 'clear', 'spire', 10, 3, 'up', ['spire', [5, 16], [12, 17], 4]);
    stats.status = 'finished';
  } catch (e) {
    stats.status = 'failed'; stats.error = String(e.message || e);
  }
  for (const d in DV) I.setVirtual(d, false);
  stats.realSeconds = +((performance.now() - t0) / 1000).toFixed(1);
  stats.gameMinutes = +(G.p.time / 60).toFixed(1);
  stats.turnsPerBattle = +(stats.turns / Math.max(1, stats.battles)).toFixed(1);
  return stats;
}
