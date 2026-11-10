// Keyboard and touch feed the same eight actions.
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Enter: 'a', Space: 'a', KeyX: 'b', Escape: 'b', Backspace: 'b',
  KeyQ: 'l', KeyE: 'r',
};
const DIRS = ['up', 'down', 'left', 'right'];
const held = {}, pressed = {}, repeat = {}, holdT = {};
const order = [];

function press(a) {
  if (held[a]) return;
  held[a] = true; pressed[a] = true; holdT[a] = 0;
  if (DIRS.includes(a)) order.push(a);
}
function release(a) {
  held[a] = false;
  const i = order.indexOf(a);
  if (i >= 0) order.splice(i, 1);
}

export function initInput() {
  addEventListener('keydown', e => {
    const a = KEYS[e.code];
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    press(a);
  });
  addEventListener('keyup', e => { const a = KEYS[e.code]; if (a) release(a); });
  addEventListener('blur', () => { for (const a in held) release(a); });
}
export const setVirtual = (a, on) => (on ? press(a) : release(a));
export const tap = a => { pressed[a] = true; };
export const down = a => !!held[a];
export const hit = a => !!pressed[a];
// hit, or auto-repeat while held (menus and the Lattice cursor).
export const rep = a => !!pressed[a] || !!repeat[a];
// Most recently pressed direction still held.
export const dir = () => order[order.length - 1] || null;

export function tickInput(dt) {
  for (const a of DIRS) {
    repeat[a] = false;
    if (!held[a]) continue;
    holdT[a] += dt;
    if (holdT[a] > 0.32) { holdT[a] -= 0.09; repeat[a] = true; }
  }
}
export function endFrame() {
  for (const a in pressed) delete pressed[a];
}
