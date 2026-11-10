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
    return p && p.party ? { ...newPlayer(), ...p } : null;
  } catch (e) { return null; }
}
