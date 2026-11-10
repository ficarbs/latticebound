// DOM overlay: dialog, menus, party, bag, shop, title. Keyboard focus is spatial:
// the top-most visible `.scope` owns input and arrows move to the nearest button in that direction.
import { G, sleep, clamp } from './state.js';
import { hit, rep, down } from './input.js';
import { sfx, audio, setMuted } from './audio.js';
import { SPECIES, SKILLS, ITEMS, EL, STARTERS, xpNeed, strongVs } from './data.js';
import { statsOf, applyItem, shiftForm, chartOf, formLv, needOk, needText, tierOpen, canUnlock, formsOf } from './kith.js';
import { kithIcon } from './kithart.js';
import { saveGame } from './save.js';
import { openLattice } from './lattice.js';
import { MAPS } from './maps.js';
import { warpTo } from './world.js';

export const $ = s => document.querySelector(s);
const D = { wait: false, full: '', n: 0, res: null, blip: 0 };
let dEl, dName, dText, dOpts, hudT = 0;

function topScope() {
  const all = [...document.querySelectorAll('#ui .scope')].filter(e => !e.closest('.hidden'));
  return all[all.length - 1];
}
export const uiActive = () => D.wait || !!topScope();

function select(sc, b, quiet) {
  if (b.classList.contains('sel')) return;
  for (const o of sc.querySelectorAll('.sel')) o.classList.remove('sel');
  b.classList.add('sel');
  b.scrollIntoView({ block: 'nearest' });
  if (sc._onsel) sc._onsel(b);
  if (!quiet) sfx('move');
}
function nearest(cur, btns, d) {
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = 1e9;
  for (const b of btns) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
    const along = d === 'up' ? -dy : d === 'down' ? dy : d === 'left' ? -dx : dx;
    const across = Math.abs(d === 'up' || d === 'down' ? dx : dy);
    if (along < 4) continue;
    const s = along + across * 2.5;
    if (s < bs) { bs = s; best = b; }
  }
  return best;
}

export function uiInput() {
  if (D.wait) { if (hit('a') || hit('b')) advance(); return true; }
  const sc = topScope();
  if (!sc) return false;
  const btns = [...sc.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent);
  let cur = btns.find(b => b.classList.contains('sel'));
  if (!cur && btns.length) select(sc, (cur = btns[0]), true);
  for (const d of ['up', 'down', 'left', 'right']) {
    if (!rep(d) || !cur) continue;
    const n = nearest(cur, btns, d);
    if (n) { select(sc, n); cur = n; }
  }
  if (hit('a') && cur) cur.click();
  else if (hit('b') && sc._cancel) sc._cancel();
  return true;
}

export function uiTick(dt) {
  if (D.wait && D.n < D.full.length) {
    D.n = Math.min(D.full.length, D.n + dt * 75);
    dText.textContent = D.full.slice(0, D.n | 0);
    if ((D.blip += dt) > 0.07) { D.blip = 0; sfx('text'); }
    if (D.n >= D.full.length) dEl.classList.add('done');
  }
  if (roll) {
    roll.y -= dt * 46 * (roll.fast || down('a') ? 8 : 1);
    roll.el.style.transform = `translateY(${Math.round(roll.y)}px)`;
    if (roll.y < roll.end) { const r = roll; roll = null; r.res(); }
  }
  if ((hudT -= dt) < 0) { hudT = 0.4; drawHud(); }
  document.body.classList.toggle('ui-open', uiActive() || G.mode === 'title' || G.mode === 'battle');
}
function advance() {
  if (D.n < D.full.length) { D.n = D.full.length; dText.textContent = D.full; dEl.classList.add('done'); return; }
  D.wait = false;
  dEl.classList.add('hidden');
  sfx('move');
  D.res();
}
export function say(text, name = '') {
  return new Promise(res => {
    dEl.classList.remove('hidden', 'done');
    dOpts.classList.add('hidden');
    dName.textContent = name; dName.classList.toggle('hidden', !name);
    dText.textContent = '';
    Object.assign(D, { wait: true, full: text, n: 0, res });
  });
}
// Pick from a short list. Resolves to the index, or -1 when cancelled.
export function choose(opts, { prompt = '', name = '', cancel = true } = {}) {
  return new Promise(res => {
    dEl.classList.remove('hidden'); dEl.classList.add('done');
    dName.textContent = name; dName.classList.toggle('hidden', !name);
    dText.textContent = prompt;
    dOpts.innerHTML = ''; dOpts.classList.remove('hidden');
    const done = i => { dOpts.classList.add('hidden'); dEl.classList.add('hidden'); sfx(i < 0 ? 'back' : 'ok'); res(i); };
    opts.forEach((o, i) => { const b = document.createElement('button'); b.textContent = o; b.onclick = () => done(i); dOpts.append(b); });
    dOpts._cancel = cancel ? () => done(-1) : null;
  });
}

export function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast pn'; t.textContent = text;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 2600);
}
export function banner(text) {
  const b = $('#banner');
  b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
// Floating text at canvas coordinates (damage numbers and the like).
export function floatText(x, y, text, cls = '') {
  const f = document.createElement('div');
  f.className = 'float ' + cls; f.textContent = text;
  f.style.left = x * 3 + 'px'; f.style.top = y * 3 + 'px';
  $('#floats').append(f);
  setTimeout(() => f.remove(), 1000);
}

export const bar = (cls, f) => `<div class="bar ${cls} ${f <= 0.2 ? 'low' : f <= 0.5 ? 'mid' : ''}"><i style="width:${clamp(f, 0, 1) * 100}%"></i></div>`;
export const elTag = el => `<span class="el el-${el}">${EL[el].name}</span>`;

function drawHud() {
  const h = $('#hud'), k = G.p && G.p.party[0];
  const show = G.mode === 'world' && !!k;
  h.classList.toggle('hidden', !show);
  if (!show) return;
  const s = statsOf(k), sparks = G.p.party.reduce((n, q) => n + q.sparks, 0);
  h.innerHTML = `<img src="${kithIcon(k.sp)}"><div><div class="h-top"><b>${k.name}</b><span>Lv ${k.lv}</span></div>${bar('hp', k.hp / s.hp)}</div>${sparks ? `<div class="h-spark">✦ ${sparks}<small>X: menu</small></div>` : ''}`;
}

function screen(cls, title) {
  const s = document.createElement('div');
  s.className = 'screen scope ' + cls;
  s.innerHTML = `<div class="s-head">${title}</div><div class="s-list"></div><div class="s-side pn"></div><div class="s-foot">Z select · X back</div>`;
  $('#screens').append(s);
  return s;
}
function kithRow(k) {
  const s = statsOf(k), sp = SPECIES[k.sp];
  return `<img src="${kithIcon(k.sp)}" class="${k.hp <= 0 ? 'out' : ''}"><div class="k-info"><div class="k-top"><b>${k.name}</b><span>Lv ${k.lv}</span></div>${bar('hp', k.hp / s.hp)}<div class="k-sub">${elTag(sp.el)}<span>${Math.max(0, k.hp)}/${s.hp} HP</span>${k.sparks ? `<span class="spk">✦ ${k.sparks}</span>` : ''}</div></div>`;
}
export function skillLine(id) {
  const sk = SKILLS[id];
  return `<div class="sk"><i class="dot el-${sk.el}"></i><b>${sk.name}</b><span>${sk.pow ? 'Pow ' + sk.pow : sk.kind}</span><span>${sk.cost} EN</span></div>`;
}
function kithDetail(k) {
  const s = statsOf(k), sp = SPECIES[k.sp];
  return `<div class="kd-top"><img src="${kithIcon(k.sp)}"><div><b>${k.name}</b><div>${elTag(sp.el)} Lv ${k.lv}</div><div class="dim">Strong vs ${strongVs(sp.el).map(e => EL[e].name).join(', ')}</div></div></div>
    <p class="dim">${sp.blurb}</p><p class="rite">Form Lv ${formLv(k, k.sp)} · ${formsOf(k).length}/${chartOf(k).length + 1} forms</p>
    <div class="stats"><span>HP <b>${Math.max(0, k.hp)}/${s.hp}</b></span><span>EN <b>${k.en}/${s.en}</b></span><span>ATK <b>${s.atk}</b></span><span>DEF <b>${s.def}</b></span><span>SPD <b>${s.spd}</b></span><span>Sparks <b class="spk">✦ ${k.sparks}</b></span></div>
    ${bar('xp', k.xp / xpNeed(k.lv))}<div class="dim">${xpNeed(k.lv) - k.xp} XP to next level · ${k.nodes.length} nodes lit</div>
    <div class="sk-list">${skillLine('strike')}${k.skills.map(skillLine).join('')}</div>`;
}

// mode 'manage' resolves to null or {lattice: kith}; mode 'pick' resolves to a Kith or null.
export function partyScreen(mode = 'manage', { title = 'KITH', disabled = () => false, force = false } = {}) {
  return new Promise(res => {
    const s = screen('party', title), list = s.querySelector('.s-list'), side = s.querySelector('.s-side');
    const close = v => { s.remove(); res(v); };
    const p = G.p;
    const draw = () => {
      list.innerHTML = '';
      const add = (k, where) => {
        const b = document.createElement('button');
        b.className = 'k-row'; b.innerHTML = kithRow(k); b._k = k;
        if (mode === 'pick' && disabled(k)) b.disabled = true;
        b.onclick = () => (mode === 'pick' ? (sfx('ok'), close(k)) : manage(k, where));
        list.append(b);
      };
      const label = t => { const l = document.createElement('div'); l.className = 's-label'; l.textContent = t; list.append(l); };
      label(`PARTY ${p.party.length}/3`);
      p.party.forEach(k => add(k, 'party'));
      if (mode === 'manage' && p.reserve.length) { label('HAVEN'); p.reserve.forEach(k => add(k, 'reserve')); }
      const first = list.querySelector('button:not(:disabled)');
      if (first) { first.classList.add('sel'); side.innerHTML = kithDetail(first._k); }
    };
    s._onsel = b => { side.innerHTML = kithDetail(b._k); };
    s._cancel = force ? null : () => { sfx('back'); close(null); };
    async function manage(k, where) {
      sfx('ok');
      const inParty = where === 'party';
      const opts = ['Open Lattice', 'Form Chart', 'Skills', inParty ? 'Make lead' : 'Bring to party'];
      if (inParty && p.party.length > 1) opts.push('Send to Haven');
      const c = opts[await choose(opts, { prompt: `${k.name}:` })];
      if (c === 'Open Lattice') return close({ lattice: k });
      if (c === 'Form Chart') await formScreen(k);
      else if (c === 'Skills') await skillScreen(k);
      else if (c === 'Make lead') { p.party.splice(p.party.indexOf(k), 1); p.party.unshift(k); }
      else if (c === 'Send to Haven') { p.party.splice(p.party.indexOf(k), 1); p.reserve.push(k); }
      else if (c === 'Bring to party') {
        if (p.party.length >= 3) {
          const i = await choose(p.party.map(q => q.name), { prompt: 'Swap with which Kith?' });
          if (i < 0) return;
          p.reserve.push(p.party[i]); p.party.splice(i, 1);
        }
        p.reserve.splice(p.reserve.indexOf(k), 1); p.party.push(k);
      }
      draw();
    }
    draw();
  });
}

// The Form Chart: every form this Kith's family can reach, what each one asks, and a way to shift between them.
export function formScreen(k) {
  return new Promise(res => {
    const s = screen('forms', `${k.name.toUpperCase()} · FORM CHART`), list = s.querySelector('.s-list'), side = s.querySelector('.s-side');
    const TIER = ['BASE', 'TIER I · Ascension I', 'TIER II · Ascension II', 'TIER III · Ascension II'];
    const rows = () => [{ form: k.base, tier: 0, need: [] }, ...chartOf(k)];
    const draw = keep => {
      list.innerHTML = '';
      let tier = -1;
      for (const row of rows()) {
        if (row.tier !== tier) { tier = row.tier; const l = document.createElement('div'); l.className = 's-label'; l.textContent = TIER[tier]; list.append(l); }
        const sp = SPECIES[row.form], have = k.forms.includes(row.form), ready = !have && canUnlock(k, row);
        const b = document.createElement('button');
        b.className = 'k-row f-row' + (row.form === (keep || k.sp) ? ' sel' : ''); b._row = row;
        b.innerHTML = `<img src="${kithIcon(row.form)}" class="${have || ready ? '' : 'out'}"><div class="k-info"><div class="k-top"><b>${have || ready ? sp.name : '???'}</b><span>${row.form === k.sp ? 'ACTIVE' : have ? 'Lv ' + formLv(k, row.form) : ready ? 'READY' : 'locked'}</span></div><div class="k-sub">${elTag(sp.el)}</div></div>`;
        b.onclick = async () => {
          if (row.form === k.sp) return toast('Already in this form.');
          if (!have && !ready) { sfx('deny'); return toast(tierOpen(k, row) ? 'Requirements not met yet.' : `Light Ascension ${row.tier === 1 ? 'I' : 'II'} on the Lattice first.`); }
          sfx('ok');
          if (have) { shiftForm(k, row.form); sfx('buff'); toast(`${k.name} shifts form.`); }
          else await evolveScene(k, row.form);
          draw(row.form);
        };
        list.append(b);
      }
      const cur = list.querySelector('.sel') || list.querySelector('button');
      cur.classList.add('sel'); s._onsel(cur);
    };
    s._onsel = b => {
      const row = b._row, sp = SPECIES[row.form], have = k.forms.includes(row.form);
      const needs = row.tier === 0 ? '<p class="dim">The form it was born in.</p>' : `<div class="needs">${[{ ok: tierOpen(k, row), text: `Ascension ${row.tier === 1 ? 'I' : 'II'} lit on the Lattice` }, ...row.need.map(r => ({ ok: needOk(k, r), text: needText(k, r) }))].map(n => `<div class="${n.ok ? 'ok' : 'no'}">${n.ok ? '✓' : '·'} ${n.text}</div>`).join('')}</div>`;
      side.innerHTML = `<div class="kd-top"><img src="${kithIcon(row.form)}"><div><b>${sp.name}</b><div>${elTag(sp.el)}</div><div class="dim">Strong vs ${strongVs(sp.el).map(e => EL[e].name).join(', ')}</div></div></div>
        <p class="dim">${sp.blurb}</p>
        <div class="stats"><span>HP <b>${sp.b[0]}</b></span><span>EN <b>${sp.b[1]}</b></span><span>ATK <b>${sp.b[2]}</b></span><span>DEF <b>${sp.b[3]}</b></span><span>SPD <b>${sp.b[4]}</b></span><span>base</span></div>
        ${sp.learn ? `<p>Teaches <b class="gold">${SKILLS[sp.learn].name}</b> for good.</p>` : ''}
        ${have ? `<p class="rite">Unlocked · form Lv ${formLv(k, row.form)}</p>` : needs}
        <p class="dim">Form levels rise as this Kith wins battles in that form. Lattice nodes carry across every form.</p>`;
    };
    s._cancel = () => { sfx('back'); s.remove(); res(); };
    formsOf(k);
    draw();
  });
}

function skillScreen(k) {
  return new Promise(res => {
    const s = screen('skills', `${k.name.toUpperCase()} · SKILLS`), list = s.querySelector('.s-list'), side = s.querySelector('.s-side');
    const draw = keep => {
      list.innerHTML = `<div class="s-label">EQUIPPED ${k.skills.length}/4 · Strike is always ready</div>`;
      for (const id of k.known) {
        const b = document.createElement('button'), on = k.skills.includes(id);
        b.className = 'k-row sk-row' + (id === keep ? ' sel' : ''); b._id = id;
        b.innerHTML = `${skillLine(id)}<span class="eq ${on ? 'on' : ''}">${on ? 'EQUIPPED' : '—'}</span>`;
        b.onclick = () => {
          if (on) { if (k.skills.length < 2) return toast('Keep at least one skill.'); k.skills.splice(k.skills.indexOf(id), 1); }
          else { if (k.skills.length >= 4) return toast('Four skills at most. Unequip one first.'); k.skills.push(id); }
          sfx('ok'); draw(id);
        };
        list.append(b);
      }
    };
    s._onsel = b => { const sk = SKILLS[b._id]; side.innerHTML = `<b>${sk.name}</b><div>${elTag(sk.el)}</div><p>${sk.desc}</p><p class="dim">${sk.pow ? `Power ${sk.pow} · ` : ''}${sk.cost} EN</p>`; };
    s._cancel = () => { sfx('back'); s.remove(); res(); };
    draw();
  });
}

const canApply = (id, k) => {
  const it = ITEMS[id], s = statsOf(k);
  if (it.heal) return k.hp > 0 && k.hp < s.hp;
  if (it.en) return k.hp > 0 && k.en < s.en;
  if (it.revive) return k.hp <= 0;
  return !!it.spark;
};
// mode 'manage' uses items in place; mode 'battle' resolves to {id, target} for the battle to apply.
export function bagScreen(mode = 'manage') {
  return new Promise(res => {
    const s = screen('bag', 'BAG'), list = s.querySelector('.s-list'), side = s.querySelector('.s-side');
    const close = v => { s.remove(); res(v); };
    const draw = keep => {
      list.innerHTML = '';
      const ids = Object.keys(ITEMS).filter(id => G.p.bag[id] > 0);
      if (!ids.length) { list.innerHTML = '<div class="s-label">Your bag is empty.</div>'; side.innerHTML = ''; return; }
      for (const id of ids) {
        const b = document.createElement('button');
        b.className = 'k-row item' + (id === keep ? ' sel' : ''); b._id = id;
        b.innerHTML = `<b>${ITEMS[id].name}</b><span>${ITEMS[id].key ? 'KEY' : '×' + G.p.bag[id]}</span>`;
        b.onclick = () => use(id);
        list.append(b);
      }
      const cur = list.querySelector('.sel') || list.querySelector('button');
      cur.classList.add('sel'); s._onsel(cur);
    };
    s._onsel = b => { const it = ITEMS[b._id]; side.innerHTML = `<b>${it.name}</b><p>${it.desc}</p>`; };
    s._cancel = () => { sfx('back'); close(null); };
    async function use(id) {
      const it = ITEMS[id];
      if (it.key) return toast('Use it from the Lattice, at a lock node.');
      if (it.bind != null) return mode === 'battle' ? (sfx('ok'), close({ id })) : toast('Bind Seals only work in battle.');
      if (mode === 'battle' && it.spark) return toast('Not in the middle of a fight.');
      sfx('ok');
      const k = await partyScreen('pick', { title: `USE ${it.name.toUpperCase()} ON…`, disabled: q => !canApply(id, q) });
      if (!k) return;
      if (mode === 'battle') return close({ id, target: k });
      const msg = applyItem(id, k);
      if (msg) { G.p.bag[id]--; sfx(it.spark ? 'node' : 'heal'); toast(msg); draw(id); }
    }
    draw();
  });
}

export function shopScreen(stock) {
  return new Promise(res => {
    const s = screen('bag shop', 'TRADING POST'), list = s.querySelector('.s-list'), side = s.querySelector('.s-side');
    const draw = keep => {
      list.innerHTML = '';
      for (const id of stock) {
        const it = ITEMS[id], b = document.createElement('button');
        b.className = 'k-row item' + (id === keep ? ' sel' : ''); b._id = id;
        b.innerHTML = `<b>${it.name}</b><span>${it.price} G</span>`;
        b.onclick = () => {
          if (G.p.gold < it.price) { sfx('deny'); return toast('Not enough gold.'); }
          G.p.gold -= it.price; G.p.bag[id] = (G.p.bag[id] || 0) + 1; sfx('item'); draw(id);
        };
        list.append(b);
      }
      const cur = list.querySelector('.sel') || list.querySelector('button');
      cur.classList.add('sel'); s._onsel(cur);
    };
    s._onsel = b => { const it = ITEMS[b._id]; side.innerHTML = `<b>${it.name}</b><p>${it.desc}</p><p>You have: ${G.p.bag[b._id] || 0}</p><p class="gold">Gold: ${G.p.gold} G</p>`; };
    s._cancel = () => { sfx('back'); s.remove(); res(); };
    draw();
  });
}

export function starterSelect() {
  return new Promise(res => {
    const s = document.createElement('div');
    s.className = 'screen scope starter';
    s.innerHTML = '<div class="s-head">CHOOSE YOUR FIRST KITH</div><div class="st-cards"></div><div class="st-blurb pn"></div>';
    const cards = s.querySelector('.st-cards'), blurb = s.querySelector('.st-blurb');
    for (const id of STARTERS) {
      const sp = SPECIES[id], b = document.createElement('button');
      b.className = 'st-card pn'; b._id = id;
      b.innerHTML = `<img src="${kithIcon(id)}"><b>${sp.name}</b>${elTag(sp.el)}`;
      b.onclick = async () => {
        sfx('ok');
        const i = await choose([`Yes, ${sp.name}!`, 'Let me think'], { prompt: `Walk the Lattice with ${sp.name}?` });
        if (i === 0) { s.remove(); res(id); }
      };
      cards.append(b);
    }
    s._onsel = b => { const sp = SPECIES[b._id]; blurb.innerHTML = `<b>${sp.name}</b> · ${EL[sp.el].name}. ${sp.blurb} <span class="dim">Strong against ${strongVs(sp.el).map(e => EL[e].name).join(' and ')}.</span>`; };
    $('#screens').append(s);
    cards.firstChild.classList.add('sel'); s._onsel(cards.firstChild);
  });
}

// Fast travel between attuned Waygates: every town visited, plus cleared guardian floors of the Hollow Deep.
export function waypoints() {
  const f = G.p.flags, out = [];
  for (const m of Object.values(MAPS)) {
    if (m.town && f['v_' + m.id]) out.push({ name: m.name, map: m.id, x: m.town[0], y: m.town[1] });
    else if (m.camp && f['dg' + m.deep]) out.push({ name: `Hollow Deep F${m.deep}`, map: m.id, x: m.start[0], y: m.start[1] });
  }
  return out;
}
export async function travelMenu() {
  const pts = waypoints().filter(p => p.map !== G.p.map);
  if (!pts.length) { toast('No other Waygate attuned yet. Reach another town first.'); return false; }
  const i = await choose(pts.map(p => p.name), { prompt: 'Ride the Lattice to which Waygate?' });
  if (i < 0) return false;
  sfx('sync');
  await warpTo(pts[i].map, pts[i].x, pts[i].y, 'down');
  return true;
}

function menuPanel() {
  return new Promise(res => {
    const m = document.createElement('div');
    m.className = 'menu scope pn';
    const items = [['kith', 'Kith'], ['lattice', 'Lattice'], ['bag', 'Bag'], ['travel', 'Travel'], ['save', 'Save'], ['sound', audio.muted ? 'Sound: off' : 'Sound: on'], ['close', 'Close']];
    m.innerHTML = `<div class="m-gold">${G.p.gold} G</div>`;
    for (const [id, label] of items) {
      const b = document.createElement('button');
      b.textContent = label; b.onclick = () => { sfx(id === 'close' ? 'back' : 'ok'); m.remove(); res(id); };
      m.append(b);
    }
    m._cancel = () => { sfx('back'); m.remove(); res('close'); };
    $('#screens').append(m);
  });
}
export async function openMenu() {
  G.busy++;
  sfx('ok');
  try {
    for (;;) {
      const c = await menuPanel();
      if (c === 'kith') {
        if (!G.p.party.length) { toast('No Kith yet.'); continue; }
        const r = await partyScreen('manage');
        if (r && r.lattice) return openLattice(r.lattice);
      } else if (c === 'lattice') {
        if (!G.p.party.length) { toast('No Kith yet.'); continue; }
        return openLattice(G.p.party.find(k => k.sparks) || G.p.party[0]);
      } else if (c === 'bag') await bagScreen('manage');
      else if (c === 'travel') { if (await travelMenu()) return; }
      else if (c === 'save') toast(saveGame() ? 'Game saved.' : 'Could not save here.');
      else if (c === 'sound') setMuted(!audio.muted);
      else return;
    }
  } finally { G.busy--; }
}

export async function evolveScene(k, to) {
  const from = k.sp, ov = $('#evo'), img = ov.querySelector('img'), cap = ov.querySelector('div');
  const old = k.name;
  ov.classList.remove('hidden');
  cap.textContent = `${old} is ascending…`;
  img.src = kithIcon(from);
  sfx('evolve');
  for (let i = 0; i < 16; i++) {
    img.src = kithIcon(i % 2 ? to : from);
    img.classList.toggle('glow', i % 2 === 0);
    await sleep(Math.max(0.05, 0.26 - i * 0.016));
  }
  shiftForm(k, to);
  img.src = kithIcon(to); img.classList.remove('glow');
  ov.classList.add('flash');
  sfx('fanfare');
  cap.textContent = '';
  await sleep(0.5);
  await say(`${old} took the form of ${SPECIES[to].name}!${SPECIES[to].learn ? ` ${SKILLS[SPECIES[to].learn].name} is now part of it.` : ''}`);
  ov.classList.add('hidden'); ov.classList.remove('flash');
}

// Ending card, then a credits roll. Hold Z (or press and hold on the screen) to fast-forward.
let roll = null;
export async function ending(deep) {
  const e = $('#ending'), p = G.p;
  await new Promise(res => {
    e.classList.remove('hidden');
    e.innerHTML = deep
      ? '<div class="e-title">EVERY NODE LIT</div><p>Twenty-four floors down, past everything hollowed and everything that hollowed it, the first node in the world is burning again.</p><p>There is no deeper than this. You and your Kith walked all of it.</p><div class="scope"><button>Continue</button></div>'
      : '<div class="e-title">THE LATTICE HOLDS</div><p>The static thins. Light runs clean through every arm again, from the Heart to the farthest node.</p><p>Your Kith walked it with you, one Spark at a time.</p><div class="scope"><button>Continue</button></div>';
    e.querySelector('button').onclick = () => { sfx('ok'); res(); };
  });
  const all = [...p.party, ...p.reserve], forms = new Set(all.flatMap(k => formsOf(k)));
  const cast = Object.values(SPECIES).filter(s => !s.raw || forms.has(s.id));
  const line = (role, name) => `<div class="cr-line"><small>${role}</small>${name}</div>`;
  e.innerHTML = `<div class="cr-roll">
    <div class="t-logo">LATTICE<span>BOUND</span></div><div class="t-sub">${deep ? 'THE HOLLOW DEEP' : "A KITH TAMER'S ROAD"}</div>
    <div class="cr-gap"></div>
    <h3>YOUR ROAD</h3>
    ${line('Time on the road', `${Math.floor(p.time / 3600)} h ${Math.floor((p.time % 3600) / 60)} min`)}
    ${line('Steps walked', p.steps)}
    ${line('Kith at your side', all.length)}
    ${line('Forms discovered', `${forms.size} of ${Object.keys(SPECIES).length - 1}`)}
    ${line('Lattice nodes lit', all.reduce((n, k) => n + k.nodes.length, 0))}
    <h3>YOUR PARTY</h3>
    <div class="cr-cast">${p.party.map(k => `<div><img src="${kithIcon(k.sp)}"><b>${k.name}</b><small>Lv ${k.lv}</small></div>`).join('')}</div>
    <h3>THE KITH</h3>
    <div class="cr-cast small">${cast.map(s => `<div><img src="${kithIcon(s.id)}" class="${forms.has(s.id) ? '' : 'out'}"><small>${forms.has(s.id) ? s.name : '???'}</small></div>`).join('')}</div>
    <h3>THE WARDENS</h3>
    ${['Sable of Hearthvale', 'Maris of Brinecliff', 'Kael of Cindermere', 'Yuna of Galehaven'].map(n => line('', n)).join('')}
    <h3>LATTICEBOUND</h3>
    ${line('Created by', 'ficarbs')}
    ${line('Design, code, pixel art, sound', 'built with Claude')}
    ${line('With a nod to', 'sphere grids, digital partners and pocket-sized companions')}
    <div class="cr-gap"></div>
    <div class="e-title">${deep ? 'THE END' : 'THE END?'}</div>
    <p class="dim">${deep ? 'Thank you for going all the way down.' : 'A stair has opened under the Spire. It goes a long way down.'}</p>
    <div class="cr-gap"></div>
  </div>`;
  e.classList.add('credits');
  const el = e.querySelector('.cr-roll');
  e.onpointerdown = () => { if (roll) roll.fast = true; };
  e.onpointerup = e.onpointercancel = () => { if (roll) roll.fast = false; };
  await new Promise(res => { roll = { el, y: 540, end: -el.offsetHeight, fast: false, res }; });
  e.classList.add('hidden'); e.classList.remove('credits'); e.innerHTML = '';
  e.onpointerdown = e.onpointerup = e.onpointercancel = null;
  if (G.toTitle) await G.toTitle();
}

export function showTitle({ canContinue, onNew, onContinue }) {
  const t = $('#title'), cont = $('#btn-continue'), fresh = $('#btn-new');
  for (const b of [cont, fresh]) b.classList.remove('sel');
  t.classList.remove('hidden');
  cont.disabled = !canContinue;
  (canContinue ? cont : fresh).classList.add('sel');
  fresh.onclick = async () => {
    sfx('ok');
    if (canContinue && (await choose(['Start over', 'Cancel'], { prompt: 'Starting a new game replaces your save.' })) !== 0) return;
    t.classList.add('hidden'); onNew();
  };
  cont.onclick = () => { sfx('ok'); t.classList.add('hidden'); onContinue(); };
}

export function initUI() {
  dEl = $('#dialog'); dName = dEl.querySelector('.d-name'); dText = dEl.querySelector('.d-text'); dOpts = dEl.querySelector('.d-opts');
  const ui = $('#ui');
  dEl.addEventListener('click', e => { if (D.wait && !e.target.closest('button')) advance(); });
  ui.addEventListener('pointerover', e => {
    const b = e.target.closest('.scope button');
    if (b && !b.disabled && b.closest('.scope') === topScope()) select(b.closest('.scope'), b, true);
  });
  // Clicks only reach the scope that currently owns input.
  ui.addEventListener('click', e => {
    const b = e.target.closest('.scope button');
    if (b && (D.wait || b.closest('.scope') !== topScope())) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}
