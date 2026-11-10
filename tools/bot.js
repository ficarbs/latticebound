// Playthrough bot: plays from a new game to the credits through the real input and UI paths.
// In the dev console:  const bot = await import('/tools/bot.js'); await bot.play('embrit');   (add 'deep' to go on to Lv 100)
// It walks with held keys, fights through the battle menus, and spends Sparks the way a sensible player would.
import { G } from '../src/state.js';
import * as I from '../src/input.js';
import { W, warpTo } from '../src/world.js';
import { MAPS, GUARDIANS, DEEP_FLOORS, deepLevel } from '../src/maps.js';
import { waypoints } from '../src/ui.js';
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
let lastMe = null, lastHp = 0, pendingItem = null, wantKith = null, starter = 'embrit', inBattle = false;

const party = () => G.p.party;
const mark = label => stats.marks.push({ label, min: +(G.p.time / 60).toFixed(1), battles: stats.battles, losses: stats.losses, party: party().map(k => `${k.name} ${k.lv}`), gold: G.p.gold });

const potion = missing => { const b = G.p.bag; return (b.elixir > 0 && missing > 180 ? 'elixir' : b.tonicx > 0 && missing > 70 ? 'tonicx' : b.tonic > 0 ? 'tonic' : b.tonicx > 0 ? 'tonicx' : b.elixir > 0 ? 'elixir' : null); };

function battleTurn(cmd) {
  const btns = [...cmd.querySelectorAll('button')];
  const name = $('.b-panel.me .bp-name').textContent, me = party().find(k => k.name === name && k.hp > 0) || party().find(k => k.hp > 0);
  const foeName = $('.b-panel.foe .bp-name').textContent;
  const foeSp = Object.values(SPECIES).find(s => foeName.endsWith(s.name)) || Object.values(SPECIES).find(s => foeName.includes(s.name)) || SPECIES.unlit;
  const foeFrac = parseFloat($('.b-panel.foe .bar.hp i').style.width) / 100;
  const max = K.statsOf(me), bag = G.p.bag;
  if (btns[0].textContent === 'FIGHT') {
    stats.turns++;
    const wild = !btns[4].disabled;
    const tonic = potion(max.hp - me.hp);
    const took = lastMe === me ? Math.max(0, lastHp - me.hp) : 0;
    lastMe = me; lastHp = me.hp;
    if ((me.hp / max.hp < 0.35 || me.hp <= took * 1.1) && me.hp < max.hp * 0.8 && tonic) { pendingItem = tonic; wantKith = me; lastHp = max.hp; return btns[3].click(); }
    const down = party().find(k => k.hp <= 0);
    if (down && bag.rekindle > 0 && me.hp / max.hp > 0.5) { pendingItem = 'rekindle'; wantKith = down; return btns[3].click(); }
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
  if (G.mode === 'title' && G.p) { $('#btn-continue').click(); return tick(0.3); }
  if (!$('#ending').classList.contains('hidden')) {
    const b = $('#ending button');
    if (b) b.click(); else { I.setVirtual('a', true); await tick(0.5); I.setVirtual('a', false); }
    return tick(0.1);
  }
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
  const arm = ELS.indexOf(SPECIES[K.rootOf(k.sp)].el);
  while (k.sparks > 0) {
    const own = new Set(k.nodes);
    const goal = NODES.find(n => n.arm === arm && n.t === 'ascend' && !own.has(n.id));
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
  }
}
// Unlock every form on offer, then wear the highest tier (the least-trained one among equals).
function forms(k) {
  for (const row of K.newForms(k)) K.shiftForm(k, row.form);
  const tier = f => (K.chartOf(k).find(r => r.form === f) || { tier: 0 }).tier;
  const best = [...K.formsOf(k)].sort((a, b) => tier(b) - tier(a) || (k.fw[a] || 0) - (k.fw[b] || 0))[0];
  if (best !== k.sp) K.shiftForm(k, best);
}
function upkeep() {
  const bag = G.p.bag;
  for (const k of [...party(), ...G.p.reserve]) spend(k);
  for (const k of party()) {
    forms(k);
    if (k.hp <= 0 && bag.rekindle > 0 && K.applyItem('rekindle', k)) bag.rekindle--;
    for (let n = 0; n < 6 && k.hp > 0 && k.hp < K.statsOf(k).hp * 0.55; n++) { const id = potion(K.statsOf(k).hp - k.hp); if (!id || !K.applyItem(id, k)) break; bag[id]--; }
    for (const id of ['etherx', 'ether']) while (k.hp > 0 && bag[id] > 0 && k.en < K.statsOf(k).en * 0.3 && K.applyItem(id, k)) bag[id]--;
    while (bag.shard > 0) { K.applyItem('shard', k); bag.shard--; spend(k); }
  }
  party().sort((a, b) => (b.hp > 0) - (a.hp > 0) || b.lv - a.lv);
}
const weak = () => party().some(k => k.hp < K.statsOf(k).hp * 0.5) && !potion(999);

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
const CHAIN = ['hearth', 'moss', 'brine', 'marsh', 'cinder', 'ashpass', 'gale', 'spire'];
for (let f = 1; f <= DEEP_FLOORS; f++) CHAIN.push('deep' + f);
function hop(cur, target) {
  if (cur === 'grotto') return 'moss';
  if (target === 'grotto') { if (cur === 'moss') return 'grotto'; target = 'moss'; }
  const i = CHAIN.indexOf(cur), j = CHAIN.indexOf(target);
  return CHAIN[i + Math.sign(j - i)];
}
// Uses Waygates the way a player would: jump to the attuned stop nearest the destination, then walk.
async function travel(target) {
  for (let n = 0; n < 80 && W.map.id !== target; n++) {
    await settle();
    const pts = waypoints(), here = CHAIN.indexOf(W.map.id), goal = CHAIN.indexOf(target === 'grotto' ? 'moss' : target);
    if (pts.length > 1 && here >= 0) {
      const best = pts.map(p => ({ p, d: Math.abs(CHAIN.indexOf(p.map) - goal) })).sort((a, b) => a.d - b.d)[0];
      if (best.d + 1 < Math.abs(here - goal)) { stats.warps++; await warpTo(best.p.map, best.p.x, best.p.y, 'down'); continue; }
    }
    const next = hop(W.map.id, target), w = W.map.warps.find(q => q.to === next);
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
const MENDER = { hearth: [19, 8], brine: [7, 10], cinder: [6, 9], gale: [6, 9] };
async function rest() {
  const DEEP_KIT = [['rekindle', 150, 8], ['elixir', 420, 30], ['etherx', 280, 6]];
  if (W.map.camp) { await useAt(W.map.id, 9, 17, 'up'); return shop(DEEP_KIT); } // the camp Waygate reaches a shop
  const here = Math.max(0, CHAIN.indexOf(W.map.id === 'grotto' ? 'moss' : W.map.id));
  const town = Object.keys(MENDER).filter(t => flag('v_' + t) && CHAIN.indexOf(t) <= here).pop() || 'hearth';
  await useAt(town, ...MENDER[town], 'up');
  if (town === 'hearth') shop([['tonic', 30, 8], ['seal', 40, 4]]);
  else if (town === 'brine') shop([['tonicx', 90, 5], ['tonic', 30, 6], ['seal', 40, 3]]);
  else shop([...DEEP_KIT, ['tonicx', 90, 6]]);
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
export async function attempt(map, x, y, dir) { await rest(); await useAt(map, x, y, dir); }
async function boss(label, done, map, x, y, dir, train) {
  for (let tries = 1; !flag(done); tries++) {
    if (tries > 12) throw new Error('stuck on ' + label);
    if (tries > 1 && train) await grind(...train);
    await rest();
    mark(`${label} attempt ${tries}`);
    await useAt(map, x, y, dir);
  }
  mark(label + ' beaten');
}

async function trainTo(lv, map, a, b) {
  for (let n = 0; n < 200 && party()[0].lv < lv; n++) await grind(map, a, b, 2);
}
async function story() {
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
  await chests('marsh');
  await boss('Warden Maris', 'maris', 'brine', 13, 2, 'up', ['marsh', [17, 9], [20, 12], 4]);
  await travel('cinder');
  await boss('Warden Kael', 'kael', 'cinder', 8, 15, 'down', ['ashpass', [18, 21], [20, 20], 4]);
  await chests('ashpass');
  await boss('Warden Yuna', 'yuna', 'gale', 9, 4, 'up', ['ashpass', [18, 21], [20, 20], 4]);
  await chests('spire');
  await boss('Nullmaw', 'clear', 'spire', 10, 3, 'up', ['spire', [5, 16], [12, 17], 4]);
}
async function deep(from = 1, to = DEEP_FLOORS) {
  for (let f = from; f <= to; f++) {
    const id = 'deep' + f, m = MAPS[id], g = GUARDIANS[f];
    if (g) {
      if (flag('dg' + f)) continue;
      await trainTo(g.party[g.party.length - 1][1] - 2, id, [9, 6], [14, 7]);
      await boss(g.name, 'dg' + f, id, 11, 4, 'up', [id, [9, 6], [14, 7], 4]);
    } else {
      await trainTo(deepLevel(f) - 2, id, m.start, m.top);
      await chests(id);
    }
  }
}

export async function play(pick = 'embrit', through = 'story') {
  starter = pick;
  stats.status = 'running'; stats.warps = stats.warps || 0;
  const t0 = performance.now();
  try {
    if (!G.p || !flag('clear')) await story();
    if (through === 'deep') await deep();
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
