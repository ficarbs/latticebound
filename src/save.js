// One save slot in localStorage. Keys starting with "_" are battle-only scratch and never saved.
import { G, newPlayer } from './state.js';

const KEY = 'latticebound-save-v1';

export function saveGame() {
  if (!G.p) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(G.p, (k, v) => (k[0] === '_' ? undefined : v)));
    return true;
  } catch (e) { return false; }
}
export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}
export function loadSave() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (!p || !p.party) return null;
    const f = p.flags || (p.flags = {});
    if (f.starter) f.v_hearth = 1;
    if (f.maris || f.gift) f.v_brine = 1;
    return { ...newPlayer(), ...p };
  } catch (e) { return null; }
}
