// Echo Duels: a party packed into a short shareable code, and unpacked into an AI-driven copy to fight.
import { G } from './state.js';
import { SPECIES, SKILLS } from './data.js';
import { statsOf, makeKith } from './kith.js';

const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const sum = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1679616; return h.toString(36).padStart(4, '0'); };

export function encodeParty(name = 'Tamer') {
  const team = G.p.party.map(k => {
    const s = statsOf(k);
    return [k.sp, k.lv, [s.hp, s.en, s.atk, s.def, s.spd], k.skills, k.name, k.pr ? 1 : 0];
  });
  const body = b64(JSON.stringify({ v: 1, n: name, t: team }));
  return `LB1.${body}.${sum(body)}`;
}

const clean = s => String(s || '').replace(/[<>&"]/g, '').slice(0, 14);
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || lo)));
// Returns { name, foes, id } or throws with a reason a player can act on.
export function decodeParty(code) {
  const m = String(code || '').trim().match(/^LB1\.([A-Za-z0-9_-]+)\.([0-9a-z]{4})$/);
  if (!m) throw new Error('That isn\'t an Echo code. They start with LB1.');
  if (sum(m[1]) !== m[2]) throw new Error('That code has a typo in it somewhere.');
  let d;
  try { d = JSON.parse(unb64(m[1])); } catch (e) { throw new Error('That code could not be read.'); }
  if (!d || d.v !== 1 || !Array.isArray(d.t) || !d.t.length || d.t.length > 3) throw new Error('That code could not be read.');
  const foes = d.t.map(([sp, lv, st, sk, name, pr]) => {
    if (!SPECIES[sp]) throw new Error('That code names a Kith this version doesn\'t know.');
    const k = makeKith(sp, num(lv, 1, 100));
    const [hp, en, atk, def, spd] = Array.isArray(st) ? st : [];
    k.fix = { hp: num(hp, 1, 3000), en: num(en, 1, 999), atk: num(atk, 1, 300), def: num(def, 1, 300), spd: num(spd, 1, 300) };
    k.hp = k.fix.hp; k.en = k.fix.en;
    const skills = (Array.isArray(sk) ? sk : []).filter(id => SKILLS[id] && id !== 'strike').slice(0, 4);
    if (skills.length) { k.skills = skills; k.known = [...skills]; }
    k.name = clean(name) || SPECIES[sp].name;
    k.pr = !!pr;
    return k;
  });
  return { name: clean(d.n) || 'Tamer', foes, id: m[2] };
}
