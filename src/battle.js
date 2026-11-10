// Turn-based battles: one Kith out per side, swap freely, bind wild Kith, build Sync for a burst.
import { G, tween, sleep, wipe, ease, clamp, pick } from './state.js';
import { hit } from './input.js';
import { SPECIES, SKILLS, ITEMS, EL, effect, xpNeed } from './data.js';
import { statsOf, gainXp, applyItem, addKith, formsOf, newForms } from './kith.js';
import { kithSprite, battleSize } from './kithart.js';
import { mk, px, ell, hash, pline, sealSprite } from './art.js';
import { sfx, music } from './audio.js';
import { $, bar, elTag, floatText, partyScreen, bagScreen, toast } from './ui.js';
import { W, blackout } from './world.js';
import { saveGame } from './save.js';

let B = null, ui, msgEl, cmdEl, typer = null;
const ME = { x: 84, y: 124 }, FOE = { x: 236, y: 82 };
const FLY = ['murklet', 'noxwing', 'gillby', 'finfathom', 'wispurr', 'phantigre'];
const STATUS = { burn: 'BURN', blight: 'BLIGHT' };

function buildUI() {
  ui = $('#battle-ui');
  ui.innerHTML = `
    <div class="b-panel foe pn"><div class="bp-top"><b class="bp-name"></b><span class="bp-lv"></span></div><div class="bp-bar"></div><div class="bp-sub"></div></div>
    <div class="b-panel me pn"><div class="bp-top"><b class="bp-name"></b><span class="bp-lv"></span></div><div class="bp-bar"></div><div class="bp-sub"></div></div>
    <div class="b-sync"><label>SYNC</label><div class="bar sync"><i></i></div></div>
    <div class="b-box pn"><div class="b-msg"></div><div class="b-cmd scope hidden"></div></div>`;
  msgEl = ui.querySelector('.b-msg'); cmdEl = ui.querySelector('.b-cmd');
  ui.querySelector('.b-box').addEventListener('click', e => { if (B && !e.target.closest('button')) B.skip = true; });
}

const me = () => G.p.party[B.pi];
const foe = () => B.foes[B.fi];
const nm = k => (B.foes.includes(k) ? (B.kind === 'wild' ? `Wild ${k.name}` : `Foe ${k.name}`) : k.name);
const bstat = (k, s) => statsOf(k)[s] * (k._b.buf[s] ? k._b.buf[s].m : 1);

function refresh() {
  const panel = (sel, k, mine) => {
    const el = ui.querySelector(sel), s = statsOf(k), sp = SPECIES[k.sp];
    el.querySelector('.bp-name').textContent = k.name;
    el.querySelector('.bp-lv').textContent = 'Lv ' + k.lv;
    const st = k._b.st ? `<span class="st st-${k._b.st.id}">${STATUS[k._b.st.id]}</span>` : '';
    const bufs = Object.entries(k._b.buf).map(([key, v]) => `<span class="st ${v.m > 1 ? 'up' : 'dn'}">${key.toUpperCase()}${v.m > 1 ? '▲' : '▼'}</span>`).join('');
    el.querySelector('.bp-bar').innerHTML = bar('hp', k.hp / s.hp) + (mine ? bar('en', k.en / s.en) + bar('xp', k.xp / xpNeed(k.lv)) : '');
    el.querySelector('.bp-sub').innerHTML = elTag(sp.el) + (mine ? `<span>${Math.max(0, k.hp)}/${s.hp} HP · ${k.en} EN</span>` : `<span class="pips">${B.kind === 'wild' ? '' : B.foes.map((f, i) => `<i class="${f.hp > 0 && i >= B.fi ? 'on' : ''}"></i>`).join('')}</span>`) + st + bufs;
  };
  panel('.b-panel.foe', foe(), false);
  panel('.b-panel.me', me(), true);
  const sy = ui.querySelector('.b-sync');
  sy.querySelector('i').style.width = G.p.sync + '%';
  sy.classList.toggle('full', G.p.sync >= 100);
}

// Typewriter line in the battle box. Waits `hold` seconds after it finishes; Z or a tap skips ahead.
async function msg(text, hold = 0.75) {
  typer = { full: text, n: 0 };
  B.skip = false;
  const total = text.length / 70 + hold;
  for (let t = 0; t < total && !B.skip; t += 0.04) await sleep(0.04);
  if (typer) { msgEl.textContent = text; typer = null; }
  B.skip = false;
}
const show = text => { typer = null; msgEl.textContent = text; };

export function battleUpdate(dt) {
  if (!B) return;
  if (typer) {
    typer.n = Math.min(typer.full.length, typer.n + dt * 70);
    msgEl.textContent = typer.full.slice(0, typer.n | 0);
  }
  if (hit('a') || hit('b')) B.skip = true;
  B.shake = Math.max(0, B.shake - dt);
  B.flash = Math.max(0, B.flash - dt * 2.5);
  for (const s of [B.ms, B.fs]) s.fl = Math.max(0, s.fl - dt);
  for (let i = B.parts.length - 1; i >= 0; i--) {
    const q = B.parts[i];
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt;
    if ((q.life -= dt) <= 0) B.parts.splice(i, 1);
  }
  if (B.orb) for (let i = 0; i < 2; i++) B.parts.push({ x: B.orb.x, y: B.orb.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, g: 0, life: 0.25, col: B.orb.col, s: 2 });
  for (let i = B.bolts.length - 1; i >= 0; i--) if ((B.bolts[i].life -= dt) <= 0) B.bolts.splice(i, 1);
}

const PCOL = {
  ember: ['#ffd84a', '#ff8a3c', '#e84a2a'], tide: ['#d0f4ff', '#4aa8f0', '#2f74c4'], bloom: ['#c8f58a', '#6ccf50', '#3a8a3c'],
  volt: ['#ffffff', '#fff6a8', '#f6d743'], stone: ['#d8dce6', '#a8afc0', '#6a7080'], shade: ['#e0b8ff', '#a37cf0', '#4c3792'], none: ['#ffffff', '#f4ecd8', '#c8c0a8'],
};
function burst(x, y, el, n = 16, power = 1) {
  const cols = PCOL[el];
  const grav = el === 'ember' ? -60 : el === 'shade' ? 0 : 160;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, v = (30 + Math.random() * 70) * power;
    B.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (el === 'tide' || el === 'stone' ? 40 : 0), g: grav, life: 0.3 + Math.random() * 0.4, col: pick(cols), s: Math.random() < 0.3 ? 3 : 2 });
  }
  if (el === 'volt') for (let i = 0; i < 3; i++) {
    const pts = [[x + (Math.random() - 0.5) * 30, y - 60]];
    while (pts[pts.length - 1][1] < y) { const l = pts[pts.length - 1]; pts.push([l[0] + (Math.random() - 0.5) * 16, l[1] + 8 + Math.random() * 8]); }
    B.bolts.push({ pts, life: 0.12 + i * 0.06 });
  }
}

function makeBg(type) {
  const c = mk(320, 180), g = c.g;
  const bands = (cols, y0, y1) => cols.forEach((col, i) => px(g, 0, Math.round(y0 + ((y1 - y0) * i) / cols.length), col, 320, Math.ceil((y1 - y0) / cols.length) + 1));
  const plat = (o, a, b, w) => { ell(g, o.x, o.y + 1, w, Math.round(w / 4.2), a); ell(g, o.x, o.y - 1, w - 4, Math.round(w / 5), b); };
  if (type === 'cave') {
    bands(['#14122a', '#1c1838', '#262046', '#2e2852'], 0, 70); px(g, 0, 70, '#3d3852', 320, 110);
    for (let i = 0; i < 9; i++) { const x = hash(i, 5) * 320, h = 10 + hash(i, 6) * 26; for (let y = 0; y < h; y++) px(g, Math.round(x - (h - y) / 4), y, '#0e0c1c', Math.ceil((h - y) / 2), 1); }
    for (let i = 0; i < 40; i++) px(g, hash(i, 7) * 320, 72 + hash(i, 8) * 100, i % 2 ? '#4b4560' : '#332e48', 6 + hash(i, 9) * 10, 1);
    for (let i = 0; i < 6; i++) { const x = (hash(i, 10) * 300) | 0, y = (56 + hash(i, 11) * 10) | 0; px(g, x, y, '#63e6e0', 3, 12); px(g, x, y, '#d0fffb', 1, 9); px(g, x + 3, y + 5, '#3aa8b8', 2, 7); }
    plat(FOE, '#262046', '#5a5472', 48); plat(ME, '#262046', '#5a5472', 60);
  } else if (type === 'spire') {
    bands(['#0a0b1e', '#10122c', '#181a3c', '#20234c'], 0, 74); px(g, 0, 74, '#1c1e40', 320, 106);
    for (let i = 0; i < 12; i++) { const x = (hash(i, 12) * 320) | 0; px(g, x, 0, i % 3 ? '#2a2c58' : '#2aa8a8', 1, 74); }
    for (let y = 78; y < 180; y += Math.round(4 + (y - 74) / 7)) px(g, 0, y, '#2f3364', 320, 1);
    for (let i = -8; i < 24; i++) pline(g, 160 + (i - 8) * 10, 74, 160 + (i - 8) * 44, 180, '#2f3364');
    plat(FOE, '#10122c', '#3a3d7a', 48); plat(ME, '#10122c', '#3a3d7a', 60);
    ell(g, FOE.x, FOE.y - 1, 30, 5, '#4ae3d8'); ell(g, FOE.x, FOE.y - 1, 27, 4, '#3a3d7a');
  } else {
    const coast = type === 'coast';
    const pal = {
      ash: { sky: ['#3a2a3c', '#5c3442', '#8c4640', '#c2643c', '#ea9c4c'], cloud: ['#5c3442', '#3a2a3c'], hill: '#4a3a3c', ground: '#73665e', fleck: ['#5c514b', '#8a7c72'], plat: ['#4a403c', '#8a7c72'] },
      snow: { sky: ['#84b0e0', '#a0c6ec', '#bedaf4', '#dcecfa', '#f2f8ff'], cloud: ['#ffffff', '#e0f0fa'], hill: '#b6c6dc', ground: '#e6edf6', fleck: ['#c6d3e4', '#ffffff'], plat: ['#a8bad0', '#ffffff'] },
      coast: { sky: ['#6ab8f5', '#86c8f8', '#a4d8fa', '#c4e8fc', '#e0f4fe'], cloud: ['#ffffff', '#e0f0fa'], ground: '#ecd896', fleck: ['#d8be78', '#f8ecc0'], plat: ['#c4a868', '#f8ecc0'] },
    }[type] || { sky: ['#6ab8f5', '#86c8f8', '#a4d8fa', '#c4e8fc', '#e0f4fe'], cloud: ['#ffffff', '#e0f0fa'], hill: '#58a868', ground: '#78c858', fleck: ['#5fb04a', '#92da68'], plat: ['#4a9440', '#92da68'] };
    bands(pal.sky, 0, 62);
    for (let i = 0; i < 5; i++) { const x = (hash(i, 13) * 300) | 0, y = (8 + hash(i, 14) * 26) | 0; ell(g, x, y, 16, 4, pal.cloud[0]); ell(g, x + 9, y - 3, 9, 4, pal.cloud[0]); ell(g, x - 2, y + 2, 14, 3, pal.cloud[1]); }
    if (coast) { px(g, 0, 56, '#2f74c4', 320, 16); for (let i = 0; i < 40; i++) px(g, hash(i, 15) * 320, 57 + hash(i, 16) * 14, '#9fdcf5', 5, 1); }
    else for (let x = 0; x < 320; x++) { const h = type === 'field' || !type ? 10 + Math.sin(x / 31) * 6 + Math.sin(x / 13 + 2) * 3 : 14 + Math.abs(((x + 30) % 90) - 45) * 0.5 + Math.sin(x / 9) * 2; px(g, x, 62 - h, pal.hill, 1, h + 2); }
    if (type === 'ash') for (let i = 0; i < 3; i++) { const x = 40 + i * 110; px(g, x, 40, '#ffb03a', 3, 22); px(g, x + 1, 36, '#ffe06a', 1, 6); }
    px(g, 0, coast ? 72 : 62, pal.ground, 320, 118);
    for (let i = 0; i < 70; i++) { const y = (coast ? 74 : 64) + hash(i, 17) * 110; px(g, hash(i, 18) * 320, y, pal.fleck[i % 2], 3 + y / 24, 1); }
    plat(FOE, pal.plat[0], pal.plat[1], 48); plat(ME, pal.plat[0], pal.plat[1], 60);
  }
  return c;
}

function drawKith(g, s, base, view, t) {
  if (s.a <= 0.01 || s.s <= 0.01) return;
  const size = battleSize(s.sp), spr = kithSprite(s.sp, size, false, s.fl > 0 && ((s.fl * 22) | 0) % 2 === 0, view);
  const w = Math.round(size * s.s), h = Math.round(size * s.s), fly = FLY.includes(s.sp);
  const bob = Math.round(Math.sin(t * (fly ? 3 : 2) + base.x) * (fly ? 2.5 : 1));
  g.globalAlpha = 0.28 * s.a;
  ell(g, Math.round(base.x + s.ox), base.y, Math.round(size * 0.3 * s.s), 3, '#161228');
  g.globalAlpha = s.a;
  g.drawImage(spr, Math.round(base.x + s.ox - w / 2), Math.round(base.y + 2 + s.oy - h + bob - (fly ? 5 : 0)), w, h);
  g.globalAlpha = 1;
}

export function drawBattle(g) {
  if (!B) return;
  const t = G.t, sh = B.shake > 0 ? Math.round((Math.random() - 0.5) * 6 * Math.min(1, B.shake * 4)) : 0;
  g.drawImage(B.bg, sh, 0);
  drawKith(g, B.fs, FOE, 'front', t);
  drawKith(g, B.ms, ME, 'back', t);
  for (const q of B.parts) px(g, Math.round(q.x), Math.round(q.y), q.col, q.s, q.s);
  for (const b of B.bolts) for (let i = 1; i < b.pts.length; i++) { pline(g, b.pts[i - 1][0], b.pts[i - 1][1], b.pts[i][0], b.pts[i][1], '#ffffff'); pline(g, b.pts[i - 1][0] + 1, b.pts[i - 1][1], b.pts[i][0] + 1, b.pts[i][1], '#f6d743'); }
  if (B.orb) { ell(g, Math.round(B.orb.x), Math.round(B.orb.y), 4, 4, B.orb.col); ell(g, Math.round(B.orb.x) - 1, Math.round(B.orb.y) - 1, 2, 2, '#ffffff'); }
  if (B.seal) g.drawImage(sealSprite(), Math.round(B.seal.x - 5), Math.round(B.seal.y - 5));
  if (B.flash > 0) { g.globalAlpha = Math.min(1, B.flash); px(g, 0, 0, B.flashCol, 320, 180); g.globalAlpha = 1; }
}

const centre = side => { const b = side === 'me' ? ME : FOE, k = side === 'me' ? me() : foe(); return { x: b.x, y: b.y - battleSize(k.sp) * 0.45 }; };

async function hitFx(side, el, dmg, crit, m) {
  const s = side === 'me' ? B.ms : B.fs, c = centre(side);
  s.fl = 0.3;
  burst(c.x, c.y, el, crit ? 26 : 16, crit ? 1.3 : 1);
  if (crit || m > 1) B.shake = 0.3;
  sfx(crit ? 'crit' : m < 1 ? 'weak' : 'hit');
  floatText(c.x, c.y - 14, '-' + dmg, crit ? 'crit' : m > 1 ? 'strong' : m < 1 ? 'weak' : '');
  const dir = side === 'me' ? -1 : 1;
  await tween(s, 'ox', 6 * dir, 0.06);
  await tween(s, 'ox', 0, 0.16);
}

function calc(att, def, sk, opts = {}) {
  const A = bstat(att, 'atk'), Dv = bstat(def, 'def');
  let m = effect(sk.el, SPECIES[def.sp].el);
  if (opts.pierce) m = Math.max(1, m);
  const stab = sk.el === SPECIES[att.sp].el ? 1.2 : 1, crit = Math.random() < 0.08;
  const gap = clamp(1 + (att.lv - def.lv) * 0.012, 0.5, 1.5);
  const dmg = Math.max(1, Math.round(gap * ((sk.pow * A) / (Dv + 10) * 0.85 + 2) * m * stab * (crit ? 1.5 : 1) * (0.92 + Math.random() * 0.16)));
  return { dmg, m, crit };
}

async function useSkill(side, id, opts = {}) {
  const att = side === 'me' ? me() : foe(), def = side === 'me' ? foe() : me();
  const other = side === 'me' ? 'foe' : 'me', as = side === 'me' ? B.ms : B.fs, dir = side === 'me' ? 1 : -1;
  const sk = opts.sync ? { name: 'Sync Burst', el: SPECIES[att.sp].el, pow: 58, kind: 'atk' } : SKILLS[id];
  if (att._b.stun) { att._b.stun = false; await msg(`${nm(att)} is stunned and can't move!`); return; }
  if (!opts.sync) { att.en -= sk.cost; if (id === 'strike') att.en = Math.min(statsOf(att).en, att.en + 3); }
  refresh();
  await msg(opts.sync ? `${att.name} and you move as one. SYNC BURST!` : `${nm(att)} used ${sk.name}!`, 0.25);
  if (sk.kind === 'atk') {
    if (opts.sync) {
      sfx('sync'); B.flashCol = EL[sk.el].col; B.flash = 1;
      const c = centre(side);
      for (let i = 0; i < 3; i++) { burst(c.x, c.y, sk.el, 14, 1.4); await sleep(0.12); }
    }
    if (id === 'strike' || sk.pow <= 18) {
      await tween(as, 'ox', 26 * dir, 0.1, ease.in);
    } else {
      sfx('cast');
      const a = centre(side), b = centre(other);
      B.orb = { x: a.x, y: a.y, col: EL[sk.el].col };
      await Promise.all([tween(B.orb, 'x', b.x, 0.26, ease.in), tween(B.orb, 'y', b.y, 0.26, ease.in)]);
      B.orb = null;
    }
    const { dmg, m, crit } = calc(att, def, sk, opts);
    def.hp = Math.max(0, def.hp - dmg);
    refresh();
    const back = tween(as, 'ox', 0, 0.18);
    await hitFx(other, sk.el, dmg, crit, m);
    await back;
    if (side === 'me' && opts.sync) att.bursts = (att.bursts || 0) + 1;
    if (side === 'me') G.p.sync = opts.sync ? 0 : clamp(G.p.sync + 14, 0, 100);
    else G.p.sync = clamp(G.p.sync + 10, 0, 100);
    refresh();
    if (crit) await msg('A critical hit!', 0.4);
    if (m > 1) await msg('It struck a weakness!', 0.4);
    else if (m < 1) await msg('It barely stung...', 0.4);
    const fx = sk.fx || {};
    if (def.hp > 0) {
      if (fx.burn && !def._b.st && Math.random() < fx.burn) { def._b.st = { id: 'burn', turns: 3 }; refresh(); await msg(`${nm(def)} was burned!`, 0.4); }
      if (fx.blight && !def._b.st && Math.random() < fx.blight) { def._b.st = { id: 'blight', turns: 4 }; refresh(); await msg(`${nm(def)} was blighted!`, 0.4); }
      if (fx.stun && Math.random() < fx.stun) { def._b.stun = true; await msg(`${nm(def)} was stunned!`, 0.4); }
      if (fx.down && Math.random() < fx.down[1]) { def._b.buf[fx.down[0]] = { m: 0.72, t: 3 }; refresh(); await msg(`${nm(def)}'s ${fx.down[0].toUpperCase()} fell!`, 0.4); }
    }
    if (fx.drain && att.hp > 0) { const v = Math.min(statsOf(att).hp - att.hp, Math.round(dmg * fx.drain)); if (v > 0) { att.hp += v; const c = centre(side); floatText(c.x, c.y - 14, '+' + v, 'heal'); refresh(); } }
  } else {
    const c = centre(side);
    if (sk.kind === 'heal') {
      const max = statsOf(att).hp, v = Math.min(max - att.hp, Math.round(max * sk.amt));
      att.hp += v; if (sk.cure) att._b.st = null;
      sfx('heal'); burst(c.x, c.y, 'bloom', 12, 0.6); floatText(c.x, c.y - 14, '+' + v, 'heal');
      refresh(); await msg(`${nm(att)} recovered ${v} HP.`, 0.4);
    } else if (sk.kind === 'buff') {
      att._b.buf[sk.stat] = { m: 1.4, t: 3 };
      sfx('buff'); burst(c.x, c.y, sk.el, 10, 0.6);
      refresh(); await msg(`${nm(att)}'s ${sk.stat.toUpperCase()} rose!`, 0.4);
    } else {
      const o = centre(other);
      def._b.buf[sk.stat] = { m: 0.72, t: 3 };
      sfx('weak'); burst(o.x, o.y, sk.el, 10, 0.6);
      refresh(); await msg(`${nm(def)}'s ${sk.stat.toUpperCase()} fell!`, 0.4);
    }
  }
}

function aiPick(f, target) {
  const opts = ['strike', ...f.skills.filter(id => SKILLS[id].cost <= f.en)];
  let best = 'strike', bs = -1;
  for (const id of opts) {
    const sk = SKILLS[id];
    let s = 0;
    if (sk.kind === 'atk') s = sk.pow * effect(sk.el, SPECIES[target.sp].el) * (sk.el === SPECIES[f.sp].el ? 1.2 : 1);
    else if (sk.kind === 'heal') s = f.hp < statsOf(f).hp * 0.4 ? 42 : 0;
    else if (sk.kind === 'buff') s = f._b.buf[sk.stat] ? 0 : 20;
    else s = target._b.buf[sk.stat] ? 0 : 20;
    s *= 0.7 + Math.random() * 0.6;
    if (s > bs) { bs = s; best = id; }
  }
  return best;
}

function setCmd(items, onCancel, onSel) {
  cmdEl.innerHTML = '';
  cmdEl.classList.remove('hidden');
  items.forEach(([label, fn, off, cls], i) => {
    const b = document.createElement('button');
    b.innerHTML = label; b.disabled = !!off; if (cls) b.className = cls; b._i = i;
    b.onclick = () => { sfx('ok'); fn(); };
    cmdEl.append(b);
  });
  cmdEl._cancel = onCancel || null;
  cmdEl._onsel = onSel || null;
  const first = cmdEl.querySelector('button:not(:disabled)');
  if (first) { first.classList.add('sel'); if (onSel) onSel(first); }
}
const hideCmd = () => cmdEl.classList.add('hidden');

function command() {
  return new Promise(res => {
    const k = me();
    const done = a => { hideCmd(); res(a); };
    const root = () => {
      show(`What will ${k.name} do?`);
      cmdEl.className = 'b-cmd scope';
      setCmd([
        ['FIGHT', fight], ['SYNC', () => done({ type: 'sync' }), G.p.sync < 100, 'sync'],
        ['KITH', swap], ['BAG', bag], ['RUN', () => done({ type: 'run' }), B.kind !== 'wild'],
      ]);
    };
    const fight = () => {
      const ids = ['strike', ...k.skills];
      cmdEl.className = 'b-cmd scope skills';
      setCmd(ids.map(id => {
        const sk = SKILLS[id];
        return [`<i class="dot el-${sk.el}"></i>${sk.name}<small>${sk.cost ? sk.cost + ' EN' : 'free'}</small>`, () => done({ type: 'skill', id }), sk.cost > k.en];
      }), () => { sfx('back'); root(); }, b => {
        const sk = SKILLS[ids[b._i]], m = sk.kind === 'atk' ? effect(sk.el, SPECIES[foe().sp].el) : 1;
        show(`${sk.desc}${sk.pow ? ` Power ${sk.pow}.` : ''}${m > 1 ? ' Strong against this foe!' : m < 1 ? ' Weak against this foe.' : ''}`);
      });
    };
    const swap = async () => {
      hideCmd();
      const q = await partyScreen('pick', { title: 'SEND OUT WHICH KITH?', disabled: x => x.hp <= 0 || x === k });
      if (q) done({ type: 'swap', k: q }); else root();
    };
    const bag = async () => {
      hideCmd();
      const r = await bagScreen('battle');
      if (!r) return root();
      if (ITEMS[r.id].bind != null) {
        if (B.kind !== 'wild') { toast('You can only bind wild Kith.'); return root(); }
        return done({ type: 'bind', id: r.id });
      }
      done({ type: 'item', id: r.id, target: r.target });
    };
    root();
  });
}

async function sendOut(side, k, intro) {
  const s = side === 'me' ? B.ms : B.fs;
  Object.assign(s, { sp: k.sp, ox: side === 'me' ? -130 : 130, oy: 0, a: 1, s: 1, fl: 0 });
  refresh();
  if (intro) show(intro);
  await tween(s, 'ox', 0, 0.45);
}
async function faintAnim(side) {
  const s = side === 'me' ? B.ms : B.fs;
  sfx('faint');
  await Promise.all([tween(s, 'oy', 18, 0.5, ease.in), tween(s, 'a', 0, 0.5, ease.in)]);
}

async function tryBind(id) {
  const f = foe(), max = statsOf(f).hp, c = centre('foe');
  G.p.bag[id]--;
  await msg(`You threw a ${ITEMS[id].name}!`, 0.1);
  sfx('throw');
  B.seal = { x: ME.x, y: ME.y - 30 };
  await Promise.all([tween(B.seal, 'x', c.x, 0.4, ease.lin), tween(B.seal, 'y', c.y - 30, 0.2, ease.out).then(() => tween(B.seal, 'y', c.y, 0.2, ease.in))]);
  B.flashCol = '#d0fffb'; B.flash = 0.6;
  await tween(B.fs, 's', 0, 0.25, ease.in);
  await tween(B.seal, 'y', FOE.y - 5, 0.2, ease.in);
  const chance = 0.3 + 0.55 * (1 - f.hp / max) + (f._b.st ? 0.1 : 0) + ITEMS[id].bind;
  const ok = Math.random() < chance, shakes = ok ? 3 : 1 + ((Math.random() * 2) | 0);
  for (let i = 0; i < shakes; i++) {
    await sleep(0.35); sfx('shake');
    await tween(B.seal, 'x', c.x - 4, 0.07); await tween(B.seal, 'x', c.x + 4, 0.1); await tween(B.seal, 'x', c.x, 0.07);
  }
  await sleep(0.3);
  if (!ok) {
    B.seal = null; sfx('weak'); burst(c.x, c.y, 'none', 12);
    await tween(B.fs, 's', 1, 0.2);
    await msg(`${f.name} broke free!`);
    return false;
  }
  sfx('bound'); burst(c.x, FOE.y - 5, 'volt', 18, 0.8);
  await msg(`Bound! ${f.name} will walk the Lattice with you.`, 1);
  B.seal = null;
  delete f._b;
  const where = addKith(f);
  if (where === 'haven') await msg(`Your party is full. ${f.name} waits in the Haven.`, 0.8);
  return true;
}

async function awardXp(f) {
  const xp = Math.round((f.lv * 9 + 12 + f.lv * f.lv * 0.25) * (B.kind === 'wild' ? 1 : 1.5) * (f.boss ? 3 : 1));
  if (me().hp > 0) me().wins = (me().wins || 0) + 1;
  const alive = G.p.party.filter(k => k.hp > 0);
  sfx('xp');
  for (const k of alive) { formsOf(k); k.fw[k.sp] = (k.fw[k.sp] || 0) + 1; }
  const ups = alive.map(k => [k, gainXp(k, xp)]);
  refresh();
  await msg(alive.length > 1 ? `Your Kith each gained ${xp} XP.` : `${alive[0].name} gained ${xp} XP.`, 0.5);
  for (const [k, n] of ups) if (n) { sfx('level'); refresh(); await msg(`${k.name} grew to Lv ${k.lv}! +${n} Spark${n > 1 ? 's' : ''} for the Lattice.`, 0.9); }
}

// Returns 'win' | 'lose' | 'next' (someone was replaced; the turn ends) | null.
async function checkFaints() {
  const f = foe(), k = me();
  if (f.hp <= 0) {
    await faintAnim('foe');
    await msg(`${nm(f)} fainted!`, 0.4);
    await awardXp(f);
    if (B.fi + 1 >= B.foes.length) return 'win';
    B.fi++;
    await sendOut('foe', foe(), `${B.name} sends out ${foe().name}!`);
    await sleep(0.4);
    return 'next';
  }
  if (k.hp <= 0) {
    await faintAnim('me');
    await msg(`${k.name} fainted!`, 0.5);
    if (!G.p.party.some(q => q.hp > 0)) return 'lose';
    const q = await partyScreen('pick', { title: 'SEND OUT WHICH KITH?', disabled: x => x.hp <= 0, force: true });
    B.pi = G.p.party.indexOf(q);
    await sendOut('me', q, `Go, ${q.name}!`);
    return 'next';
  }
  return null;
}

async function endTurn() {
  for (const [side, k] of [['me', me()], ['foe', foe()]]) {
    if (k.hp <= 0) continue;
    const b = k._b, max = statsOf(k);
    if (b.st) {
      const dmg = Math.max(1, Math.round(max.hp * (b.st.id === 'burn' ? 0.07 : 0.09)));
      k.hp = Math.max(0, k.hp - dmg);
      const c = centre(side);
      burst(c.x, c.y, b.st.id === 'burn' ? 'ember' : 'shade', 8, 0.5); sfx('weak');
      floatText(c.x, c.y - 14, '-' + dmg, 'weak');
      if (--b.st.turns <= 0) b.st = null;
      refresh();
      await msg(`${nm(k)} is hurt by its ${b.st ? STATUS[b.st.id].toLowerCase() : 'fading affliction'}.`, 0.3);
    }
    for (const key in b.buf) if (--b.buf[key].t <= 0) delete b.buf[key];
    k.en = Math.min(max.en, k.en + 2);
  }
  G.p.sync = clamp(G.p.sync + 5, 0, 100);
  refresh();
}

// Some bosses change shape at half health: status wiped, ATK up for good, and (for the worst of them) two moves a turn.
async function enrage() {
  const f = foe();
  if (!f.traits || !f.traits.enrage || f._b.enraged || f.hp <= 0 || f.hp > statsOf(f).hp * f.traits.enrage) return;
  f._b.enraged = true; f._b.st = null; f._b.stun = false; f._b.buf.atk = { m: 1.15, t: 999 };
  const c = centre('foe');
  sfx('sync'); B.flashCol = '#ffffff'; B.flash = 1; B.shake = 0.6;
  for (let i = 0; i < 3; i++) { burst(c.x, c.y, 'shade', 16, 1.5); await sleep(0.12); }
  refresh();
  await msg(`${f.name} sheds its shape!${f.traits.double ? ' It moves twice a turn now.' : ''}`, 1);
}

async function loop() {
  for (;;) {
    const act = await command();
    const fact = aiPick(foe(), me());
    const quick = act.type !== 'skill' && act.type !== 'sync';
    const order = quick || bstat(me(), 'spd') + Math.random() >= bstat(foe(), 'spd') + Math.random() ? ['me', 'foe'] : ['foe', 'me'];
    let over = null;
    for (const who of order) {
      if (who === 'me') {
        if (act.type === 'skill') await useSkill('me', act.id);
        else if (act.type === 'sync') await useSkill('me', null, { sync: true, pierce: true });
        else if (act.type === 'swap') {
          await msg(`Come back, ${me().name}!`, 0.1);
          await tween(B.ms, 'ox', -130, 0.3, ease.in);
          B.pi = G.p.party.indexOf(act.k);
          await sendOut('me', act.k, `Go, ${act.k.name}!`);
        } else if (act.type === 'item') {
          const text = applyItem(act.id, act.target);
          if (text) { G.p.bag[act.id]--; sfx('heal'); refresh(); await msg(text, 0.5); }
        } else if (act.type === 'bind') { if (await tryBind(act.id)) return 'bind'; }
        else if (act.type === 'run') {
          if (bstat(me(), 'spd') >= bstat(foe(), 'spd') || Math.random() < 0.6) { await msg('Got away safely!', 0.4); return 'run'; }
          await msg('Couldn\'t get away!', 0.4);
        }
      } else {
        await useSkill('foe', fact);
        const f = foe();
        if (f.traits && f.traits.double && f._b.enraged && f.hp > 0 && me().hp > 0) await useSkill('foe', aiPick(f, me()));
      }
      await enrage();
      over = await checkFaints();
      if (over) break;
    }
    if (over === 'win' || over === 'lose') return over;
    await endTurn();
    over = await checkFaints();
    if (over === 'win' || over === 'lose') return over;
  }
}

// o: { foes, kind: 'wild' | 'trainer' | 'boss', name, gold }
export async function startBattle(o) {
  G.busy++;
  if (!ui) buildUI();
  sfx('encounter');
  await wipe(1, 0.45);
  const p = G.p;
  const blank = () => ({ sp: null, ox: 0, oy: 0, a: 1, s: 1, fl: 0 });
  B = { foes: o.foes, fi: 0, pi: p.party.findIndex(k => k.hp > 0), kind: o.kind, name: o.name || '', ms: blank(), fs: blank(), parts: [], bolts: [], orb: null, seal: null, shake: 0, flash: 0, flashCol: '#fff', skip: false, bg: makeBg(W.map.bg) };
  for (const k of [...p.party, ...o.foes]) k._b = { buf: {}, st: null, stun: false };
  B.ms.sp = me().sp; B.fs.sp = foe().sp; B.ms.ox = -130; B.fs.ox = 130;
  G.mode = 'battle';
  music(o.kind === 'boss' ? 'boss' : 'battle');
  ui.classList.remove('hidden'); hideCmd(); show(''); refresh();
  await wipe(0, 0.3);
  await tween(B.fs, 'ox', 0, 0.5);
  await msg(o.kind === 'wild' ? `A wild ${foe().name} appeared!` : o.kind === 'boss' ? `${B.name} looms over you!` : `${B.name} wants to battle!`, 0.6);
  await sendOut('me', me(), `Go, ${me().name}!`);
  await sleep(0.3);
  const result = await loop();
  if (result === 'win') {
    const gold = o.gold || (o.kind === 'wild' ? o.foes[0].lv * 3 + 4 : 0);
    p.gold += gold;
    music(null); sfx('fanfare');
    await msg(o.kind === 'wild' ? `You won! Found ${gold} G.` : `You defeated ${B.name}! Got ${gold} G.`, 1.2);
  } else if (result === 'lose') {
    music(null); sfx('lose');
    await msg('All your Kith have fainted. You hurry back to the Mender...', 1.4);
  }
  await wipe(1, 0.35);
  for (const k of [...p.party, ...p.reserve, ...o.foes]) delete k._b;
  ui.classList.add('hidden');
  $('#floats').innerHTML = '';
  B = null;
  if (result === 'lose') blackout();
  for (const k of p.party) {
    const fresh = newForms(k).map(r => r.form).filter(f => !(k.told || (k.told = [])).includes(f));
    if (fresh.length) { k.told.push(...fresh); toast(`${k.name} can take a new form! Kith, then Form Chart.`); }
  }
  G.mode = 'world';
  music(W.map.music);
  saveGame();
  await wipe(0, 0.3);
  G.busy--;
  return result;
}
