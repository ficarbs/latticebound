// Player options, kept apart from the save so they apply on the title screen and across saves.
const KEY = 'latticebound-settings';
export const S = { bspeed: 1, text: 1 };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* storage blocked */ }
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
}
export const BSPEEDS = [1, 2, 4];
export const TEXTS = [[1, 'Normal'], [2.2, 'Fast'], [99, 'Instant']];
