// Entry point: boot, game loop, title screen and screen wipes.
import { G, updateTweens, wipe, newPlayer } from './state.js';
import { initInput, tickInput, endFrame, setVirtual } from './input.js';
import { initAudio, music } from './audio.js';
import { initUI, uiInput, uiTick, uiActive, showTitle, $ } from './ui.js';
import { loadMap, worldUpdate, drawWorld } from './world.js';
import { battleUpdate, drawBattle } from './battle.js';
import { latticeUpdate, drawLattice } from './lattice.js';
import { hasSave, loadSave, saveGame } from './save.js';
import { px, hash, pline, mk } from './art.js';
import { kithSprite, ALL_KITH, battleSize } from './kithart.js';
import { NODES, EDGES } from './grid.js';
import { ELS, EL } from './data.js';

const view = $('#view'), g = view.getContext('2d');
g.imageSmoothingEnabled = false;
window.G = G;

function fit() {
  const s = Math.min(innerWidth / 960, innerHeight / 540);
  $('#game').style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener('resize', fit);
fit();

let titleBg;
function drawTitle() {
  const t = G.t;
  if (!titleBg) {
    titleBg = mk(320, 180);
    const b = titleBg.g;
    ['#0c0a1c', '#141230', '#1c1a44', '#262458', '#33306c', '#4a3f80', '#6a4f8c'].forEach((c, i) => px(b, 0, i * 20, c, 320, 22));
    for (let x = 0; x < 320; x++) { const h = 26 + Math.sin(x / 40) * 10 + Math.sin(x / 17 + 1) * 4; px(b, x, 180 - h, '#1a1638', 1, h); }
    for (let x = 0; x < 320; x++) { const h = 14 + Math.sin(x / 23 + 2) * 5; px(b, x, 180 - h, '#100e26', 1, h); }
  }
  g.drawImage(titleBg, 0, 0);
  for (let i = 0; i < 60; i++) if (((t + i * 0.37) | 0) % 4) px(g, (hash(i, 3) * 320) | 0, (hash(i, 4) * 120) | 0, i % 5 ? '#6a66a8' : '#ffffff', 1, 1);
  // a slowly turning piece of the Lattice
  const a = t * 0.06, ca = Math.cos(a), sa = Math.sin(a), P = n => [160 + (n.x * ca - n.y * sa) * 0.5, 70 + (n.x * sa + n.y * ca) * 0.26];
  for (const [i, j] of EDGES) { const A = P(NODES[i]), B = P(NODES[j]); pline(g, A[0], A[1], B[0], B[1], '#3a3470'); }
  for (const n of NODES) { const [x, y] = P(n), on = ((t * 0.8 + hash(n.id, 9) * 9) | 0) % 5 === 0; px(g, Math.round(x) - 1, Math.round(y) - 1, on ? '#fff3b0' : n.arm >= 0 ? EL[ELS[n.arm]].col : '#ffffff', on ? 3 : 2, on ? 3 : 2); }
  ['embrit', 'puddlop', 'sprigit'].forEach((sp, i) => g.drawImage(kithSprite(sp, 40, i === 0), [24, 70, 256][i], [128, 134, 130][i] + Math.round(Math.sin(t * 2 + i * 2))));
}

function drawWipe() {
  if (G.wipe <= 0) return;
  const v = G.wipe;
  for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) {
    const thr = hash(x, y, 5) * 0.55, s = Math.max(0, Math.min(1, (v - thr) / 0.45)) * 21;
    if (s > 0) px(g, Math.round(x * 20 + 10 - s / 2), Math.round(y * 20 + 10 - s / 2), '#0a0818', Math.ceil(s), Math.ceil(s));
  }
}

// Sprite sheet of every Kith, for art checks: open ?gallery
function drawGallery() {
  px(g, 0, 0, '#5fb04a', 320, 180);
  const page = +(new URLSearchParams(location.search).get('gallery') || 0);
  ALL_KITH.slice(page * 12, page * 12 + 12).forEach((sp, i) => {
    const x = 2 + (i % 4) * 80, y = 2 + ((i / 4) | 0) * 59, s = Math.min(40, battleSize(sp));
    ['front', 'side', 'back'].forEach((v, j) => g.drawImage(kithSprite(sp, s, false, false, v), x + j * 26 - (s - 26) / 2, y + 40 - s));
    ['front', 'side', 'back'].forEach((v, j) => g.drawImage(kithSprite(sp, 20, false, false, v), x + j * 22, y + 38));
  });
}

function step(dt) {
  G.t += dt;
  tickInput(dt);
  updateTweens(dt);
  uiTick(dt);
  const locked = uiInput();
  if (G.mode === 'world') worldUpdate(dt, locked);
  else if (G.mode === 'lattice') latticeUpdate(dt, locked);
  battleUpdate(dt);
  if (G.mode === 'world') drawWorld(g);
  else if (G.mode === 'battle') drawBattle(g);
  else if (G.mode === 'lattice') drawLattice(g);
  else if (G.mode === 'gallery') drawGallery();
  else drawTitle();
  drawWipe();
  endFrame();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  requestAnimationFrame(frame);
}
// Steps the game by hand, so it can be driven while the tab is hidden.
window.__tick = (sec = 1, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) step(dt); };

async function begin(p) {
  await wipe(1, 0.3);
  G.p = p;
  G.mode = 'world';
  loadMap(p.map, p.x, p.y, p.dir);
  await wipe(0, 0.4);
}

function touchControls() {
  const pad = $('#touch');
  if (!matchMedia('(pointer: coarse)').matches) return;
  document.body.classList.add('touch');
  for (const b of pad.querySelectorAll('[data-act]')) {
    const a = b.dataset.act;
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); setVirtual(a, true); });
    for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, () => setVirtual(a, false));
  }
}

const title = () => showTitle({ canContinue: hasSave(), onNew: () => begin(newPlayer()), onContinue: () => begin(loadSave() || newPlayer()) });
// After the credits: save, and hand the player back to the title screen with Continue ready.
G.toTitle = async () => {
  saveGame();
  await wipe(1, 0.6);
  G.mode = 'title';
  music('title');
  title();
  await wipe(0, 0.6);
};

initInput();
initUI();
touchControls();
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, initAudio);
music('title');
if (location.search.includes('gallery')) { G.mode = 'gallery'; G.wipe = 0; $('#title').classList.add('hidden'); } else {
  title();
  wipe(0, 0.6);
}
addEventListener('beforeunload', () => { if (G.p && G.mode === 'world' && !G.busy) saveGame(); });
requestAnimationFrame(frame);
