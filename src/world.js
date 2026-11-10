// Overworld: tile movement, camera, NPCs, warps, encounters and rendering.
import { G, flag, setFlag, wipe, sleep, rint } from './state.js';
import { hit, dir } from './input.js';
import { MAPS } from './maps.js';
import { drawGround, treeSprite, buildingSprite, charSprite, chestSprite, signSprite, bangSprite, tallOverlay, hash, SOLID, mk, px, ell } from './art.js';
import { kithSprite } from './kithart.js';
import { SPECIES, ITEMS } from './data.js';
import { makeKith, healAll, give, statsOf } from './kith.js';
import { sfx, music } from './audio.js';
import { say, banner, openMenu, toast } from './ui.js';
import { startBattle } from './battle.js';
import { runScript } from './story.js';
import { saveGame } from './save.js';

const MOVE = 0.17, VW = 320, VH = 180;
const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const W = {
  map: null, ground: null, statics: [],
  pl: { x: 0, y: 0, ox: 0, oy: 0, t: 1, moving: false, dir: 'down', steps: 0 },
  fol: { x: 0, y: 0, ox: 0, oy: 0, flip: false },
  cam: { x: 0, y: 0 }, parts: [], sinceEnc: 0, emote: null, bumpT: 0,
};
const grounds = {};
let dark;

export function loadMap(id, x, y, d = 'down') {
  const m = MAPS[id], p = W.pl;
  W.map = m;
  W.ground = grounds[id] || (grounds[id] = drawGround(m));
  W.statics = [];
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    if (m.t[ty][tx] === 'T') W.statics.push({ spr: treeSprite((hash(tx, ty, 3) * 3) | 0, m.theme), x: tx * 16 - 3, y: ty * 16 - 13, sy: ty * 16 + 15 });
  }
  for (const b of m.buildings) W.statics.push({ spr: buildingSprite(b.w, b.h, b.roof, b.sign, b.dx), x: b.x * 16, y: b.y * 16 - 8, sy: (b.y + b.h) * 16 - 2 });
  for (const s of m.signs) W.statics.push({ spr: signSprite(), x: s.x * 16, y: s.y * 16, sy: s.y * 16 + 15 });
  Object.assign(p, { x, y, ox: x, oy: y, t: 1, moving: false, dir: d });
  Object.assign(W.fol, { x, y, ox: x, oy: y });
  W.parts.length = 0; W.sinceEnc = 0;
  Object.assign(G.p, { map: id, x, y, dir: d });
  music(m.music);
  banner(m.name);
  if (m.town && !flag('v_' + id)) {
    setFlag('v_' + id);
    if (Object.keys(MAPS).filter(k => flag('v_' + k)).length > 1) toast(`Waygate attuned: ${m.name}. Travel from the menu.`);
  }
}

const visible = n => !(n.hide && flag(n.hide)) && !(n.show && !flag(n.show));
const npcAt = (x, y) => W.map.npcs.find(n => n.x === x && n.y === y && visible(n));
const chestAt = (x, y) => W.map.chests.find(c => c.x === x && c.y === y);
const buildingAt = (x, y) => W.map.buildings.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
const tileAt = (x, y) => (W.map.t[y] && W.map.t[y][x]) || '#';

function canWalk(x, y) {
  const m = W.map;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
  if (SOLID.includes(m.t[y][x])) return false;
  return !buildingAt(x, y) && !npcAt(x, y) && !chestAt(x, y) && !m.signs.some(s => s.x === x && s.y === y);
}

export async function warpTo(id, x, y, d) {
  G.busy++;
  sfx('door');
  await wipe(1, 0.28);
  loadMap(id, x, y, d);
  saveGame();
  await wipe(0, 0.28);
  G.busy--;
}

// After a loss: wake at the last Mender with everyone restored.
export function blackout() {
  const h = G.p.heal;
  healAll();
  loadMap(h.map, h.x, h.y, 'down');
}

async function wildBattle() {
  const m = W.map, total = m.enc.table.reduce((n, e) => n + e[3], 0);
  let r = Math.random() * total, e = m.enc.table[0];
  for (const row of m.enc.table) { if ((r -= row[3]) < 0) { e = row; break; } }
  const k = makeKith(e[0], rint(e[1], e[2]));
  // Rare prismatic Kith: other colours, a tenth stronger, worth a Seal.
  if (Math.random() < (flag('clear') ? 1 / 24 : 1 / 40) * (G.p.bag.charm ? 4 : 1)) { k.pr = true; const s = statsOf(k); k.hp = s.hp; k.en = s.en; }
  await startBattle({ foes: [k], kind: 'wild' });
}

async function arrive() {
  const p = W.pl, m = W.map, ch = m.t[p.y][p.x];
  G.p.x = p.x; G.p.y = p.y;
  const w = m.warps.find(q => q.x === p.x && q.y === p.y);
  if (w) {
    if (w.need && !flag(w.need)) {
      G.busy++;
      await say(w.deny);
      const [dx, dy] = DV[OPP[w.dir]];
      p.dir = OPP[w.dir];
      if (canWalk(p.x + dx, p.y + dy)) step(p.x + dx, p.y + dy);
      G.busy--;
      return;
    }
    return warpTo(w.to, w.tx, w.ty, w.dir);
  }
  // Tamers who spot you walk up and challenge.
  for (const n of m.npcs) {
    if (!n.sight || !visible(n) || flag('t_' + n.id)) continue;
    const [dx, dy] = DV[n.dir];
    for (let i = 1; i <= n.sight; i++) {
      if (n.x + dx * i === p.x && n.y + dy * i === p.y) {
        G.busy++;
        W.emote = { x: n.x, y: n.y, t: 0.7 };
        sfx('encounter');
        await sleep(0.7);
        p.dir = OPP[n.dir];
        G.busy--;
        return runScript(n.script, n);
      }
      if (!canWalk(n.x + dx * i, n.y + dy * i)) break;
    }
  }
  if (m.enc && G.p.party.some(k => k.hp > 0) && (ch === ',' || (m.encAll && 'cpP'.includes(ch)))) {
    if (ch === ',') for (let i = 0; i < 4; i++) W.parts.push({ x: p.x * 16 + 4 + Math.random() * 8, y: p.y * 16 + 10, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0.4, col: i % 2 ? '#7fd060' : '#2c6e3c' });
    if (++W.sinceEnc > 3 && Math.random() < m.enc.rate) { W.sinceEnc = 0; return wildBattle(); }
  }
}

function step(nx, ny, t = 0) {
  const p = W.pl, f = W.fol;
  f.ox = f.x; f.oy = f.y; f.x = p.x; f.y = p.y;
  if (f.x !== f.ox) { f.flip = f.x > f.ox; f.view = 'side'; } else f.view = f.y > f.oy ? 'front' : 'back';
  p.ox = p.x; p.oy = p.y; p.x = nx; p.y = ny; p.t = t; p.moving = true; p.steps++;
  G.p.steps++;
}

async function interact() {
  const p = W.pl, m = W.map, [dx, dy] = DV[p.dir], x = p.x + dx, y = p.y + dy;
  const n = npcAt(x, y);
  if (n) { if (n.dir && !n.look.startsWith('kith')) n.dir = OPP[p.dir]; return runScript(n.script, n); }
  const b = buildingAt(x, y);
  if (b && p.dir === 'up' && x === b.x + b.dx && y === b.y + b.h - 1) return runScript(b.door, b);
  const c = chestAt(x, y);
  if (c) {
    G.busy++;
    if (flag('c_' + c.id)) await say('Empty.');
    else {
      setFlag('c_' + c.id); give(c.item, c.n); sfx('item');
      await say(`Found ${c.n > 1 ? c.n + ' × ' : 'a '}${ITEMS[c.item].name}!`);
    }
    G.busy--;
    return;
  }
  const s = m.signs.find(q => q.x === x && q.y === y);
  if (s) { G.busy++; await say(s.text); G.busy--; }
}

export function worldUpdate(dt, locked) {
  const p = W.pl;
  G.p.time += dt;
  W.bumpT -= dt;
  if (W.emote && (W.emote.t -= dt) <= 0) W.emote = null;
  for (let i = W.parts.length - 1; i >= 0; i--) {
    const q = W.parts[i];
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 120 * dt;
    if ((q.life -= dt) <= 0) W.parts.splice(i, 1);
  }
  let left = 0;
  if (p.moving) {
    p.t += dt / MOVE;
    if (p.t < 1) return;
    left = (p.t - 1) * MOVE; p.t = 1; p.moving = false;
    arrive();
  }
  if (locked || G.busy || G.mode !== 'world' || G.wipe > 0) return;
  if (hit('a')) return void interact();
  if (hit('b')) return void openMenu();
  const d = dir();
  if (!d) return;
  p.dir = d;
  const [dx, dy] = DV[d];
  if (canWalk(p.x + dx, p.y + dy)) step(p.x + dx, p.y + dy, Math.min(0.9, left / MOVE));
  else if (W.bumpT <= 0) { W.bumpT = 0.3; sfx('bump'); }
}

const lerp = (a, b, t) => a + (b - a) * t;
function riftSprite(g, x, y, t, n) {
  for (let i = 0; i < 9; i++) {
    const w = 4 + ((hash(i, (t * 9) | 0, n) * 12) | 0), ox = ((hash(i, (t * 9) | 0, n + 5) * (16 - w)) | 0);
    px(g, x + ox, y - 8 + i * 3, ['#4ae3d8', '#ff4a9a', '#161228', '#d0fffb'][(hash(i, (t * 6) | 0, n + 9) * 4) | 0], w, 2);
  }
}
function fontSprite(g, x, y, t) {
  const b = Math.round(Math.sin(t * 3) * 1.5);
  ell(g, x + 8, y + 14, 6, 2, '#161228');
  px(g, x + 5, y - 2 + b, '#161228', 6, 14); px(g, x + 6, y - 1 + b, '#63e6e0', 4, 12); px(g, x + 6, y - 1 + b, '#d0fffb', 1, 9); px(g, x + 7, y - 3 + b, '#63e6e0', 2, 2);
  if (((t * 4) | 0) % 2) px(g, x + 2 + ((hash(t * 4 | 0, 1) * 12) | 0), y - 4 + ((hash(t * 4 | 0, 2) * 12) | 0), '#d0fffb', 1, 1);
}

function gateSprite(g, x, y, t) {
  px(g, x - 1, y - 14, '#161228', 18, 30);
  px(g, x, y - 13, '#8d93a0', 16, 28); px(g, x, y - 13, '#b9c0cc', 16, 2); px(g, x, y - 13, '#b9c0cc', 1, 28); px(g, x + 13, y - 11, '#666c7c', 3, 26);
  px(g, x + 3, y - 9, '#161228', 10, 24);
  for (let i = 0; i < 11; i++) {
    const w = 2 + ((hash(i, (t * 7) | 0, 3) * 6) | 0), ox = (hash(i, (t * 7) | 0, 4) * (8 - w)) | 0;
    px(g, x + 4 + ox, y - 8 + i * 2, ['#4ae3d8', '#2aa8a8', '#d0fffb', '#63e6e0'][(i + ((t * 5) | 0)) % 4], w, 2);
  }
  px(g, x + 7, y - 12, '#ffd84a', 2, 2);
}

export function drawWorld(g) {
  const p = W.pl, m = W.map, t = G.t, f = W.fol;
  const u = p.moving ? p.t : 1;
  const ppx = lerp(p.ox, p.x, u) * 16, ppy = lerp(p.oy, p.y, u) * 16;
  const mw = m.w * 16, mh = m.h * 16;
  const cx = Math.round(mw <= VW ? (mw - VW) / 2 : Math.max(0, Math.min(mw - VW, ppx + 8 - VW / 2)));
  const cy = Math.round(mh <= VH ? (mh - VH) / 2 : Math.max(0, Math.min(mh - VH, ppy + 8 - VH / 2)));
  W.cam.x = cx; W.cam.y = cy;
  g.fillStyle = { out: '#1f5638', ash: '#3a2f2c', snow: '#c6d3e4' }[m.theme] || '#0e0c1c';
  g.fillRect(0, 0, VW, VH);
  g.drawImage(W.ground[((t * 2) | 0) % 2], -cx, -cy);

  const list = [];
  for (const s of W.statics) if (s.x < cx + VW && s.x + s.spr.width > cx && s.y < cy + VH && s.y + s.spr.height > cy) list.push(s);
  for (const c of m.chests) list.push({ spr: chestSprite(), x: c.x * 16, y: c.y * 16 + 1, sy: c.y * 16 + 15, dim: flag('c_' + c.id) });
  for (const n of m.npcs) {
    if (!visible(n)) continue;
    const o = { x: n.x * 16, y: n.y * 16, sy: n.y * 16 + 15, npc: n };
    if (n.look.startsWith('kith:')) {
      const big = n.look === 'kith:nullmaw' ? 40 : 30;
      o.spr = kithSprite(n.look.slice(5), big, false, false, 'front'); o.x += 8 - big / 2; o.y += 15 - big + Math.round(Math.sin(t * 2.5));
    } else if (n.look !== 'rift' && n.look !== 'font' && n.look !== 'gate') { o.spr = charSprite(n.look, n.dir, 0); o.x -= 1; o.y -= 6; }
    list.push(o);
  }
  const lead = G.p.party[0];
  if (lead && (f.x !== p.x || f.y !== p.y || p.moving)) {
    const fx = lerp(f.ox, f.x, u) * 16, fy = lerp(f.oy, f.y, u) * 16;
    const fly = ['murklet', 'noxwing', 'gillby', 'finfathom', 'wispurr'].includes(lead.sp);
    const hop = p.moving ? Math.abs(Math.sin(u * Math.PI)) * 2 : 0;
    list.push({ spr: kithSprite(lead.sp, 20, f.view === 'side' && f.flip, false, f.view || 'front', lead.pr), x: fx - 2, y: fy - 5 - Math.round(hop) - (fly ? 3 + Math.round(Math.sin(t * 4)) : 0), sy: fy + 14, grass: tileAt(Math.round(fx / 16), Math.round(fy / 16)) === ',' && !fly, gx: fx, gy: fy });
  }
  const frame = p.moving ? (((p.t * 2) | 0) + p.steps * 2) % 4 : 0;
  list.push({ spr: charSprite('hero', p.dir, [0, 1, 0, 2][frame]), x: ppx - 1, y: ppy - 6, sy: ppy + 15, grass: tileAt(Math.round(ppx / 16), Math.round(ppy / 16)) === ',', gx: ppx, gy: ppy });
  list.sort((a, b) => a.sy - b.sy);
  for (const o of list) {
    const x = Math.round(o.x - cx), y = Math.round(o.y - cy);
    if (o.npc && o.npc.look === 'rift') riftSprite(g, x, y, t, o.npc.x);
    else if (o.npc && o.npc.look === 'font') fontSprite(g, x, y, t);
    else if (o.npc && o.npc.look === 'gate') gateSprite(g, x, y, t);
    else {
      if (o.dim) g.globalAlpha = 0.55;
      g.drawImage(o.spr, x, y);
      g.globalAlpha = 1;
    }
    if (o.grass) g.drawImage(tallOverlay(m.theme), Math.round(o.gx - cx), Math.round(o.gy - cy) + 10);
  }
  for (const q of W.parts) px(g, Math.round(q.x - cx), Math.round(q.y - cy), q.col, 2, 2);
  if (W.emote) g.drawImage(bangSprite(), W.emote.x * 16 + 4 - cx, W.emote.y * 16 - 18 - cy - Math.round(Math.min(1, (0.7 - W.emote.t) * 8) * 2));

  if (m.dark) {
    dark = dark || mk(VW, VH);
    const d = dark.g, lx = Math.round(ppx - cx) + 8, ly = Math.round(ppy - cy) + 6, fl = Math.round(Math.sin(t * 5) * 1.5);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, VW, VH);
    d.fillStyle = 'rgba(8,6,24,0.74)'; d.fillRect(0, 0, VW, VH);
    d.globalCompositeOperation = 'destination-out';
    for (const [r, a] of [[76, 0.3], [60, 0.45], [42, 1]]) { d.fillStyle = `rgba(0,0,0,${a})`; d.beginPath(); d.arc(lx, ly, r + fl, 0, 7); d.fill(); }
    g.drawImage(dark, 0, 0);
  }
  // ambient motes
  const amb = m.theme === 'cave' ? '#9ff5ee' : m.theme === 'spire' ? '#ff4a9a' : null;
  if (amb) for (let i = 0; i < 14; i++) {
    const x = (hash(i, 1) * VW + t * (6 + i % 5) - cx * 0.5) % VW, y = (hash(i, 2) * VH - t * (3 + i % 4) - cy * 0.5) % VH;
    if (((t * 2 + i) | 0) % 3) px(g, Math.round((x + VW * 4) % VW), Math.round((y + VH * 40) % VH), amb, 1, 1);
  }
}
