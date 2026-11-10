// Chiptune sound effects and looping music, all synthesised with WebAudio.
let ac, master, musicBus, timer, cur = null, want = null, step = 0, nextT = 0;
export const audio = { muted: false };

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = audio.muted ? 0 : 0.5; master.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.gain.value = 0.42;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  musicBus.connect(lp); lp.connect(master);
  if (want) { const w = want; cur = null; music(w); }
}
export function setMuted(m) {
  audio.muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
  try { localStorage.setItem('latticebound-muted', m ? '1' : ''); } catch (e) { /* storage blocked */ }
}
try { audio.muted = !!localStorage.getItem('latticebound-muted'); } catch (e) { /* storage blocked */ }

function tone(f, t, dur, type = 'square', vol = 0.2, f2 = 0, out = master) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03);
}
function noise(t, dur, vol = 0.2, out = master) {
  const n = Math.ceil(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(out); s.start(t);
}
const seq = (t, notes, d = 0.07, type = 'square', vol = 0.16) => notes.forEach((f, i) => f && tone(f, t + i * d, d * 1.6, type, vol));

const SFX = {
  move: t => tone(660, t, 0.04, 'square', 0.07),
  ok: t => seq(t, [660, 990], 0.05, 'square', 0.1),
  back: t => seq(t, [520, 390], 0.05, 'square', 0.09),
  deny: t => seq(t, [180, 150], 0.08, 'sawtooth', 0.1),
  text: t => tone(880, t, 0.02, 'square', 0.03),
  bump: t => tone(110, t, 0.07, 'triangle', 0.18),
  door: t => seq(t, [330, 262, 196], 0.06, 'triangle', 0.2),
  hit: t => { noise(t, 0.12, 0.3); tone(220, t, 0.12, 'square', 0.14, 70); },
  crit: t => { noise(t, 0.2, 0.4); tone(440, t, 0.2, 'sawtooth', 0.16, 60); },
  weak: t => { noise(t, 0.08, 0.16); tone(160, t, 0.1, 'triangle', 0.16, 90); },
  cast: t => tone(300, t, 0.22, 'sawtooth', 0.1, 1200),
  heal: t => seq(t, [523, 659, 784, 1047], 0.08, 'triangle', 0.2),
  buff: t => seq(t, [392, 523, 659], 0.06, 'square', 0.1),
  faint: t => tone(440, t, 0.5, 'square', 0.14, 60),
  xp: t => seq(t, [784, 988], 0.05, 'square', 0.08),
  level: t => seq(t, [523, 659, 784, 1047, 784, 1047], 0.09, 'square', 0.14),
  node: t => { seq(t, [784, 1175, 1568], 0.06, 'triangle', 0.22); tone(1568, t + 0.18, 0.5, 'sine', 0.12); },
  throw: t => tone(500, t, 0.25, 'triangle', 0.16, 1100),
  shake: t => tone(140, t, 0.08, 'square', 0.12),
  bound: t => seq(t, [659, 784, 988, 1319], 0.1, 'square', 0.14),
  encounter: t => { for (let i = 0; i < 6; i++) tone(i % 2 ? 880 : 587, t + i * 0.07, 0.07, 'square', 0.12); },
  sync: t => { tone(120, t, 0.7, 'sawtooth', 0.16, 1800); noise(t + 0.5, 0.4, 0.3); },
  evolve: t => { for (let i = 0; i < 12; i++) tone(330 * 2 ** (i / 12), t + i * 0.09, 0.12, 'triangle', 0.16); },
  fanfare: t => seq(t, [523, 523, 523, 659, 784, 0, 659, 784, 1047, 1047], 0.11, 'square', 0.14),
  item: t => seq(t, [988, 1319, 1568], 0.07, 'square', 0.1),
  lose: t => seq(t, [392, 330, 262, 196], 0.18, 'triangle', 0.2),
};
export function sfx(name) {
  if (!ac || audio.muted) return;
  SFX[name]?.(ac.currentTime);
}

// Music: tokens are eighth notes. '.' rests, '-' holds the previous note.
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function parse(str) {
  const out = [];
  let last = null;
  for (const tok of str.split(/[\s|]+/).filter(Boolean)) {
    if (tok === '-') { if (last) last.len++; out.push(null); continue; }
    if (tok === '.') { last = null; out.push(null); continue; }
    const m = tok.match(/^([A-G])([#b]?)(\d)$/);
    const midi = 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    out.push((last = { f: 440 * 2 ** ((midi - 69) / 12), len: 1 }));
  }
  return out;
}
const T = (bpm, lead, bass, type = 'square') => ({ bpm, lead: parse(lead), bass: parse(bass), type });
const TRACKS = {
  town: T(104, 'E5 - G5 - C6 - B5 A5 | G5 - E5 - D5 - C5 - | F5 - A5 - C6 - A5 G5 | E5 - D5 - C5 - - .', 'C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . G2 .', 'triangle'),
  route: T(138, 'G4 B4 D5 G5 - D5 B4 D5 | E5 - D5 B4 A4 - B4 - | C5 E5 G5 C6 - B5 A5 G5 | A5 - F#5 - G5 - - .', 'G2 G3 G2 G3 G2 G3 G2 G3 | E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 G2 G3 G2 G3'),
  cave: T(84, 'D5 . . A4 . . F5 . | E5 . . . C5 . . . | D5 . . A4 . . G4 . | A4 - - - . . . .', 'D2 - - - . . . . | C2 - - - . . . . | Bb1 - - - . . . . | A1 - - - . . . .', 'triangle'),
  spire: T(112, 'E4 F4 E4 . B4 . A4 G4 | E4 F4 E4 . D5 . C5 B4 | E5 . D5 C5 B4 . A4 G4 | F4 - E4 - . . . .', 'E2 . E2 E2 . E2 . E2 | E2 . E2 E2 . E2 . E2 | C2 . C2 C2 . C2 . C2 | F2 . F2 F2 E2 . E2 .', 'sawtooth'),
  battle: T(164, 'A4 C5 E5 A5 E5 C5 A4 C5 | G4 B4 D5 G5 D5 B4 G4 B4 | F4 A4 C5 F5 E5 D5 C5 B4 | E5 - G#4 B4 E5 - E5 D5', 'A2 A2 A3 A2 A2 A3 A2 A3 | G2 G2 G3 G2 G2 G3 G2 G3 | F2 F2 F3 F2 F2 F3 F2 F3 | E2 E2 E3 E2 E2 E3 G#2 B2'),
  boss: T(178, 'C5 . C5 Eb5 . C5 G5 . | Bb4 . Bb4 D5 . Bb4 F5 . | Ab4 C5 Eb5 Ab5 G5 Eb5 C5 Eb5 | G5 - F5 Eb5 D5 - B4 D5', 'C2 C3 C2 C3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 | Ab1 Ab2 Ab1 Ab2 Ab1 Ab2 Ab1 Ab2 | G1 G2 G1 G2 G1 G2 B1 D2', 'sawtooth'),
  title: T(92, 'C5 - G5 - E5 - C6 - | B5 - G5 - E5 - D5 - | A4 - E5 - C5 - A5 - | G5 - F5 - E5 D5 C5 -', 'C3 - - - G2 - - - | E3 - - - B2 - - - | A2 - - - E2 - - - | F2 - - - G2 - - -', 'triangle'),
};

function tick() {
  if (!ac || !cur) return;
  const tr = TRACKS[cur], d = 30 / tr.bpm;
  while (nextT < ac.currentTime + 0.25) {
    const i = step % tr.lead.length, l = tr.lead[i], b = tr.bass[i % tr.bass.length];
    if (l) tone(l.f, nextT, d * l.len * 0.95, tr.type, tr.type === 'triangle' ? 0.3 : 0.13, 0, musicBus);
    if (b) tone(b.f, nextT, d * b.len * 0.9, 'triangle', 0.3, 0, musicBus);
    if (cur === 'battle' || cur === 'boss') { if (i % 2 === 0) noise(nextT, 0.03, i % 4 ? 0.06 : 0.12, musicBus); }
    nextT += d; step++;
  }
}
export function music(name) {
  want = name;
  if (!ac || cur === name) return;
  cur = name; step = 0; nextT = ac.currentTime + 0.08;
  clearInterval(timer);
  if (name) timer = setInterval(tick, 60);
}
