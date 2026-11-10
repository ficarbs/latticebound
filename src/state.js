// Shared game state, tweens and small helpers.
export const G = { mode: 'title', p: null, t: 0, wipe: 1, busy: 0 };

const tweens = [];
export const ease = {
  lin: t => t,
  out: t => 1 - (1 - t) ** 3,
  in: t => t * t,
  io: t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
};

// Animate o[k] to `to` over `dur` seconds of game time.
export function tween(o, k, to, dur, e = ease.out) {
  return new Promise(res => tweens.push({ o, k, a: o[k], b: to, dur, t: 0, e, res }));
}
export function sleep(dur) {
  return new Promise(res => tweens.push({ dur, t: 0, res }));
}
export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i];
    w.t += dt;
    const u = Math.min(1, w.t / w.dur);
    if (w.o) w.o[w.k] = w.a + (w.b - w.a) * w.e(u);
    if (u >= 1) { tweens.splice(i, 1); w.res(); }
  }
}
// Screen transition: 1 = fully covered, 0 = clear.
export const wipe = (to, dur = 0.35) => tween(G, 'wipe', to, dur, ease.lin);

export const flag = k => !!G.p.flags[k];
export const setFlag = k => { G.p.flags[k] = 1; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pick = a => a[(Math.random() * a.length) | 0];
export const rint = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);

export function newPlayer() {
  return {
    map: 'hearth', x: 5, y: 8, dir: 'down',
    party: [], reserve: [], bag: {}, gold: 120, flags: {}, dex: {}, sync: 0,
    heal: { map: 'hearth', x: 19, y: 8 }, steps: 0, time: 0,
  };
}
