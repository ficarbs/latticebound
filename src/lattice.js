// The Lattice screen: pan across the shared node graph and spend Sparks.
import { G } from './state.js';
import { hit, rep } from './input.js';
import { NODES, EDGES, ADJ, nodeLabel, nodeDesc } from './grid.js';
import { ELS, EL, SPECIES, SKILLS } from './data.js';
import { statsOf, cantReason, activate, newForms } from './kith.js';
import { mk, px, pline, hash } from './art.js';
import { kithSprite, kithIcon } from './kithart.js';
import { sfx } from './audio.js';
import { $, toast, evolveScene, elTag } from './ui.js';
import { saveGame } from './save.js';

const SIZE = 640, C0 = SIZE / 2, VX = 118, VY = 96;
const COL = { hp: '#ff5a6a', en: '#5ab4ff', atk: '#ff9a3c', def: '#c4cad6', spd: '#6ee07a', lock: '#8d93a0', ascend: '#ffd84a', hub: '#ffffff' };
const BG = [12, 10, 28];
let L = null, ui;

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (h, t) => { const c = hex(h); return `rgb(${c.map((v, i) => Math.round(v + (BG[i] - v) * t)).join(',')})`; };
const nodeCol = n => (n.t === 'skill' ? EL[SKILLS[n.skill].el].col : COL[n.t]);
const DISC = { 3: [1, 3, 3, 3, 1], 4: [3, 5, 7, 7, 7, 5, 3], 5: [3, 7, 9, 9, 9, 9, 9, 7, 3], 6: [5, 7, 9, 11, 11, 11, 11, 11, 9, 7, 5] };
function disc(g, x, y, r, col) {
  const rows = DISC[r], h = rows.length;
  rows.forEach((w, i) => px(g, x - (w >> 1), y - (h >> 1) + i, col, w, 1));
}
function diamond(g, x, y, r, col) {
  for (let i = -r; i <= r; i++) px(g, x - (r - Math.abs(i)), y + i, col, (r - Math.abs(i)) * 2 + 1, 1);
}

function drawNode(g, n, on) {
  const x = n.x + C0, y = n.y + C0, col = nodeCol(n), ink = '#0a0818';
  const body = on ? col : mix(col, 0.6), rim = on ? '#ffffff' : mix(col, 0.12);
  if (on) { g.globalAlpha = 0.22; disc(g, x, y, 6, col); g.globalAlpha = 1; }
  if (n.t === 'skill') {
    diamond(g, x, y, 6, ink); diamond(g, x, y, 5, rim); diamond(g, x, y, 4, body);
    px(g, x - 1, y - 1, on ? '#ffffff' : mix(col, 0.4), 3, 3); px(g, x, y, body);
  } else if (n.t === 'lock') {
    px(g, x - 5, y - 5, ink, 11, 11); px(g, x - 4, y - 4, n.lvl === 2 ? (on ? '#ffd84a' : '#8a6a2a') : rim, 9, 9); px(g, x - 3, y - 3, on ? '#3a3654' : '#1c1a30', 7, 7);
    if (on) px(g, x - 1, y - 2, '#6ee07a', 3, 5);
    else { px(g, x - 1, y - 2, '#c4cad6', 3, 3); px(g, x, y + 1, '#c4cad6', 1, 2); }
  } else if (n.t === 'ascend') {
    diamond(g, x, y, 7, ink); diamond(g, x, y, 6, body);
    px(g, x - 6, y - 1, ink, 13, 3); px(g, x - 1, y - 6, ink, 3, 13);
    px(g, x - 5, y, rim, 11, 1); px(g, x, y - 5, rim, 1, 11); diamond(g, x, y, 2, on ? '#ffffff' : rim);
    if (n.lvl === 2) { px(g, x - 4, y - 4, rim, 2, 2); px(g, x + 3, y - 4, rim, 2, 2); px(g, x - 4, y + 3, rim, 2, 2); px(g, x + 3, y + 3, rim, 2, 2); }
  } else if (n.t === 'hub') {
    disc(g, x, y, 6, ink); disc(g, x, y, 5, on ? '#ffffff' : '#5a5880'); disc(g, x, y, 3, '#0c0a1c'); diamond(g, x, y, 1, on ? '#ffd84a' : '#5a5880');
  } else {
    const r = n.big ? 5 : 4;
    disc(g, x, y, r + 1, ink); disc(g, x, y, r, rim);
    disc(g, x, y, r - 1, body);
    if (on) px(g, x - 1, y - 2, '#ffffff', 2, 1);
  }
}

function rebuild() {
  const c = L.cache || (L.cache = mk(SIZE, SIZE)), g = c.g, own = new Set(L.k.nodes);
  g.clearRect(0, 0, SIZE, SIZE);
  for (const [a, b] of EDGES) {
    const A = NODES[a], Bn = NODES[b], lit = own.has(a) && own.has(b);
    const arm = A.arm >= 0 ? A.arm : Bn.arm, base = arm >= 0 ? EL[ELS[arm]].col : '#8d93a0';
    pline(g, A.x + C0, A.y + C0, Bn.x + C0, Bn.y + C0, lit ? '#fff3b0' : mix(base, 0.68));
    if (lit) pline(g, A.x + C0 + 1, A.y + C0, Bn.x + C0 + 1, Bn.y + C0, mix(base, 0.1));
  }
  for (const n of NODES) drawNode(g, n, own.has(n.id));
  L.reach = NODES.filter(n => !own.has(n.id) && ADJ[n.id].some(a => own.has(a))).map(n => n.id);
}

function refresh() {
  const k = L.k, n = NODES[L.cur], s = statsOf(k), on = k.nodes.includes(n.id), why = on ? null : cantReason(k, n);
  ui.querySelector('.l-tabs').innerHTML = G.p.party.map((q, i) => `<button class="${q === k ? 'on' : ''}" data-i="${i}"><img src="${kithIcon(q.sp)}"><span>${q.name}<small>✦ ${q.sparks}</small></span></button>`).join('');
  ui.querySelector('.l-kith').innerHTML = `<b>${k.name}</b> Lv ${k.lv} ${elTag(SPECIES[k.sp].el)}<div class="l-sparks">✦ ${k.sparks} <small>Spark${k.sparks === 1 ? '' : 's'}</small></div><div class="l-stats"><span>HP ${s.hp}</span><span>EN ${s.en}</span><span>ATK ${s.atk}</span><span>DEF ${s.def}</span><span>SPD ${s.spd}</span></div>`;
  const arm = n.arm >= 0 ? `${EL[ELS[n.arm]].name} arm` : n.t === 'hub' ? 'Centre' : 'Ring';
  ui.querySelector('.l-node').innerHTML = `<small>${arm}</small><b>${nodeLabel(n)}</b><p>${nodeDesc(n)}</p><div class="l-state ${on ? 'on' : why ? 'no' : 'go'}">${on ? 'ACTIVE' : why || 'Ready · costs 1 Spark'}</div>`;
  const act = ui.querySelector('.l-act');
  act.disabled = on || !!why;
}

export function openLattice(k) {
  if (!ui) {
    ui = $('#lattice-ui');
    ui.innerHTML = '<div class="l-tabs"></div><div class="l-panel pn"><div class="l-kith"></div><div class="l-node"></div><button class="l-act">Activate</button><button class="l-close">Close</button><div class="l-help">Arrows move · Z activate · Q / E switch Kith · X close</div></div>';
    ui.querySelector('.l-act').onclick = () => activateCur();
    ui.querySelector('.l-close').onclick = () => closeLattice();
    ui.querySelector('.l-tabs').onclick = e => { const b = e.target.closest('button'); if (b) switchTo(G.p.party[+b.dataset.i]); };
    $('#view').addEventListener('pointerdown', e => {
      if (!L || G.mode !== 'lattice' || G.busy) return;
      const r = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 320 + L.cam.x - VX, y = ((e.clientY - r.top) / r.height) * 180 + L.cam.y - VY;
      let best = null, bd = 14 * 14;
      for (const n of NODES) { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } }
      if (!best) return;
      if (best.id === L.cur) activateCur(); else { L.cur = best.id; sfx('move'); refresh(); }
    });
  }
  const at = NODES[k.at != null ? k.at : k.nodes[k.nodes.length - 1]] || NODES[0];
  L = { k, cur: at.id, cam: { x: at.x, y: at.y }, cache: null, reach: [], pulse: null, t: 0 };
  G.mode = 'lattice';
  ui.classList.remove('hidden');
  rebuild(); refresh();
}
function switchTo(k) {
  if (!k || k === L.k) return;
  sfx('ok');
  const at = NODES[k.at != null ? k.at : k.nodes[k.nodes.length - 1]] || NODES[0];
  L.k = k; L.cur = at.id;
  rebuild(); refresh();
}
function closeLattice() {
  sfx('back');
  ui.classList.add('hidden');
  L = null;
  G.mode = 'world';
  saveGame();
}

async function activateCur() {
  const k = L.k, n = NODES[L.cur];
  if (G.busy) return;
  if (k.nodes.includes(n.id)) return;
  const why = cantReason(k, n);
  if (why) { sfx('deny'); toast(why); return; }
  k.sparks--;
  activate(k, n.id);
  sfx('node');
  L.pulse = { id: n.id, t: 0 };
  rebuild(); refresh();
  if (n.t === 'skill') toast(`${k.name} learned ${SKILLS[n.skill].name}!${k.skills.includes(n.skill) ? '' : ' Equip it from Kith → Skills.'}`);
  else if (n.t === 'lock') toast('The lock dissolves. A new path opens.');
  else if (n.t === 'ascend') {
    const row = newForms(k)[0];
    if (row) { G.busy++; await evolveScene(k, row.form); G.busy--; rebuild(); }
    else toast('A tier of the Form Chart opens. See Kith, then Form Chart, for what each form asks.');
    refresh();
  }
}

export function latticeUpdate(dt, locked) {
  if (!L) return;
  L.t += dt;
  if (L.pulse && (L.pulse.t += dt) > 0.6) L.pulse = null;
  const c = NODES[L.cur];
  L.cam.x += (c.x - L.cam.x) * Math.min(1, dt * 9);
  L.cam.y += (c.y - L.cam.y) * Math.min(1, dt * 9);
  if (locked || G.busy) return;
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const d in V) {
    if (!rep(d)) continue;
    const [vx, vy] = V[d];
    let best = null, bs = 0.35;
    const score = (n, bonus) => { const dx = n.x - c.x, dy = n.y - c.y, len = Math.hypot(dx, dy) || 1; return ((dx * vx + dy * vy) / len) * bonus - len / 400; };
    for (const id of ADJ[c.id]) { const s = score(NODES[id], 1); if (s > bs) { bs = s; best = id; } }
    if (best == null) for (const n of NODES) { if (n === c) continue; const len = Math.hypot(n.x - c.x, n.y - c.y); if (len > 60) continue; const s = score(n, 1); if (s > 0.6 && s > bs) { bs = s; best = n.id; } }
    if (best != null) { L.cur = best; sfx('move'); refresh(); }
  }
  if (hit('a')) activateCur();
  else if (hit('b')) closeLattice();
  else if (hit('l') || hit('r')) {
    const p = G.p.party, i = p.indexOf(L.k);
    switchTo(p[(i + (hit('r') ? 1 : p.length - 1)) % p.length]);
  }
}

export function drawLattice(g) {
  if (!L) return;
  const t = L.t, cx = Math.round(L.cam.x), cy = Math.round(L.cam.y);
  px(g, 0, 0, '#0c0a1c', 320, 180);
  for (let i = 0; i < 70; i++) {
    const x = (((hash(i, 1) * 640 - cx * (0.2 + (i % 3) * 0.12)) % 320) + 320) % 320, y = (((hash(i, 2) * 360 - cy * (0.2 + (i % 3) * 0.12)) % 180) + 180) % 180;
    if (((t * 1.5 + i) | 0) % 5) px(g, x | 0, y | 0, i % 7 ? '#3a3664' : '#8a86c8', 1, 1);
  }
  const ox = VX - cx - C0, oy = VY - cy - C0;
  g.drawImage(L.cache, ox, oy);
  // nodes within reach breathe
  if (L.k.sparks > 0) {
    g.globalAlpha = 0.35 + Math.sin(t * 5) * 0.3;
    for (const id of L.reach) { const n = NODES[id], x = n.x + C0 + ox, y = n.y + C0 + oy; px(g, x - 7, y - 7, '#fff3b0', 15, 1); px(g, x - 7, y + 7, '#fff3b0', 15, 1); px(g, x - 7, y - 7, '#fff3b0', 1, 15); px(g, x + 7, y - 7, '#fff3b0', 1, 15); }
    g.globalAlpha = 1;
  }
  if (L.pulse) {
    const n = NODES[L.pulse.id], r = Math.round(4 + L.pulse.t * 50), x = n.x + C0 + ox, y = n.y + C0 + oy;
    g.globalAlpha = 1 - L.pulse.t / 0.6;
    for (let a = 0; a < 24; a++) px(g, Math.round(x + Math.cos(a * 0.262) * r), Math.round(y + Math.sin(a * 0.262) * r), '#fff3b0', 2, 2);
    g.globalAlpha = 1;
  }
  // the Kith stands on the last node it lit
  const at = NODES[L.k.at != null ? L.k.at : 0], spr = kithSprite(L.k.sp, 20, false, false, 'front');
  g.drawImage(spr, at.x + C0 + ox - 10, at.y + C0 + oy - 26 + Math.round(Math.sin(t * 3) * 1.5));
  // cursor brackets
  const c = NODES[L.cur], x = c.x + C0 + ox, y = c.y + C0 + oy, e = 9 + Math.round(Math.sin(t * 6));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    px(g, x + sx * e - (sx > 0 ? 3 : 0), y + sy * e, '#ffffff', 4, 1);
    px(g, x + sx * e, y + sy * e - (sy > 0 ? 3 : 0), '#ffffff', 1, 4);
  }
}
