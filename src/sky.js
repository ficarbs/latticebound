// Time of day and weather. One in-game minute passes per real second, so a full day is 24 minutes.
// Weather is chosen per map every three in-game hours from that map's own pool.
import { G } from './state.js';
import { hash, mk, px } from './art.js';

const VW = 320, VH = 180;
const POOLS = {
  hearth: ['clear', 'clear', 'rain', 'clear'], moss: ['clear', 'rain', 'clear', 'fog'],
  brine: ['clear', 'rain', 'fog', 'clear'], marsh: ['rain', 'fog', 'clear', 'rain'],
  cinder: ['ash', 'clear', 'ash', 'ash'], ashpass: ['ash', 'ash', 'clear', 'ash'],
  gale: ['snow', 'snow', 'clear', 'snow'],
};
export const WEATHER = {
  clear: { name: 'Clear', icon: '☀', night: '☾' },
  rain: { name: 'Rain', icon: '☂', boost: { tide: 1.2, ember: 0.8 }, line: 'Rain is falling. Tide skills grow stronger and Ember skills weaken.' },
  fog: { name: 'Fog', icon: '≋', boost: { shade: 1.2, volt: 0.85 }, line: 'Fog hangs low. Shade skills grow stronger and Volt skills scatter.' },
  ash: { name: 'Ashfall', icon: '✶', boost: { ember: 1.2, bloom: 0.8 }, line: 'Ash drifts down. Ember skills burn hotter and Bloom skills wilt.' },
  snow: { name: 'Snow', icon: '❄', boost: { stone: 1.2, ember: 0.85 }, line: 'Snow is falling. Stone skills hit harder and Ember skills sputter.' },
};

export const clock = () => (G.p ? G.p.clock ?? 480 : 480);
export const hour = () => Math.floor(clock() / 60) % 24;
export const timeText = () => { const m = Math.floor(clock()) % 1440; return `${String((m / 60) | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export function phase() {
  const h = hour();
  return h >= 20 || h < 5 ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk';
}
export const isNight = () => phase() === 'night';
const outdoor = m => m && ['out', 'ash', 'snow'].includes(m.theme);

export function weatherOf(m) {
  const pool = m && POOLS[m.id];
  if (!pool) return 'clear';
  const slot = Math.floor(clock() / 180);
  return pool[(hash(slot, m.id.length, m.id.charCodeAt(0)) * pool.length) | 0];
}
// How dark the outdoors is right now, 0 (noon) to 0.62 (midnight), easing through dusk and dawn.
export function darkness() {
  const m = clock() % 1440, h = m / 60;
  if (h >= 7 && h < 18) return 0;
  if (h >= 20 || h < 5) return 0.62;
  return h < 7 ? 0.62 * (1 - (h - 5) / 2) : 0.62 * ((h - 18) / 2);
}

// Element multiplier for a battle on this map right now.
export function boostFor(m, el) {
  if (!outdoor(m)) return 1;
  let k = (WEATHER[weatherOf(m)].boost || {})[el] || 1;
  if (isNight() && el === 'shade') k *= 1.2;
  return k;
}
export function battleLine(m) {
  if (!outdoor(m)) return '';
  const w = WEATHER[weatherOf(m)];
  const parts = [];
  if (w.line) parts.push(w.line);
  if (isNight()) parts.push('Night has fallen. Shade skills are stronger in the dark.');
  return parts.join(' ');
}

// Who comes out when: Shade Kith mostly at night, Volt Kith in the rain, Tide Kith in the fog.
const NIGHT = ['murklet', 'noxwing', 'wispurr', 'phantigre'];
export function encWeight(m, sp, w) {
  if (!outdoor(m)) return w;
  const wx = weatherOf(m), night = isNight();
  if (NIGHT.includes(sp)) w *= night ? 3 : 0.35;
  if (wx === 'rain' && (sp === 'voltick' || sp === 'stagvolt' || sp === 'gillby')) w *= 2;
  if (wx === 'fog' && (sp === 'gillby' || sp === 'wispurr')) w *= 2;
  if (wx === 'ash' && (sp === 'coalcub' || sp === 'magmander')) w *= 1.6;
  return w;
}

export function hudSky() {
  const m = G.p && G.p.map, w = WEATHER[weatherOf({ id: m })], night = isNight();
  return `${w.icon === '☀' && night ? w.night : w.icon} ${timeText()}`;
}

// ---- drawing ----
let shade;
function particles(g, kind, t, cx, cy) {
  if (kind === 'rain') {
    for (let i = 0; i < 70; i++) {
      const sp = 220 + hash(i, 3) * 80, x = ((hash(i, 1) * 400 - t * sp * 0.35 - cx) % 400 + 400) % 400 - 40, y = ((hash(i, 2) * 220 + t * sp - cy) % 220 + 220) % 220 - 20;
      g.globalAlpha = 0.55; px(g, x | 0, y | 0, '#b8d4f4', 1, 3); px(g, (x | 0) - 1, (y | 0) + 3, '#b8d4f4', 1, 2);
    }
    g.globalAlpha = 1;
  } else if (kind === 'snow') {
    for (let i = 0; i < 60; i++) {
      const sp = 14 + hash(i, 3) * 18, x = ((hash(i, 1) * 360 + Math.sin(t * 1.3 + i) * 8 - cx * 0.9) % 360 + 360) % 360 - 20, y = ((hash(i, 2) * 200 + t * sp - cy * 0.9) % 200 + 200) % 200 - 10;
      px(g, x | 0, y | 0, '#ffffff', i % 4 ? 1 : 2, i % 4 ? 1 : 2);
    }
  } else if (kind === 'ash') {
    for (let i = 0; i < 46; i++) {
      const up = i % 5 === 0, sp = up ? -18 : 9 + hash(i, 3) * 10;
      const x = ((hash(i, 1) * 360 + Math.sin(t + i) * 10 - cx * 0.9) % 360 + 360) % 360 - 20, y = ((hash(i, 2) * 200 + t * sp - cy * 0.9) % 200 + 200) % 200 - 10;
      px(g, x | 0, y | 0, up ? (((t * 6 + i) | 0) % 2 ? '#ffb03a' : '#ff6a2a') : '#9a8c84', 1, 1);
    }
  } else if (kind === 'fog') {
    for (let i = 0; i < 4; i++) {
      const y = 20 + i * 44 + Math.sin(t * 0.3 + i) * 8, x = ((t * (6 + i * 3) + i * 90 - cx * 0.6) % 480 + 480) % 480 - 160;
      g.globalAlpha = 0.16;
      for (let j = 0; j < 3; j++) px(g, (x + j * 160) | 0, y | 0, '#e8eef8', 130, 18 + (i % 2) * 8);
    }
    g.globalAlpha = 1;
  }
}

// Called last by the overworld renderer. `lights` are [x, y, radius, colour] in screen space.
export function drawSky(g, m, t, cx, cy, lights) {
  if (!outdoor(m)) return;
  const wx = weatherOf(m), dk = darkness() + (wx === 'rain' || wx === 'fog' ? 0.12 : wx === 'snow' ? 0.04 : 0);
  particles(g, wx, t, cx, cy);
  if (dk <= 0.01) return;
  shade = shade || mk(VW, VH);
  const d = shade.g, dusk = phase() === 'dusk' || phase() === 'dawn';
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, VW, VH);
  d.fillStyle = dusk ? `rgba(70,30,78,${dk})` : `rgba(10,14,48,${dk})`;
  d.fillRect(0, 0, VW, VH);
  d.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of lights) {
    const gr = d.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill();
  }
  g.drawImage(shade, 0, 0);
  if (dusk && darkness() < 0.4) { g.globalAlpha = 0.12; px(g, 0, 0, '#ff8a4a', VW, VH); g.globalAlpha = 1; }
  // warm glow on top of each light
  if (dk > 0.25) {
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, r, col] of lights) {
      if (!col) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 0.6);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 0.6, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
}

// A battle backdrop dressed for the hour and the weather.
export function skyBattleBg(bg, m) {
  if (!outdoor(m)) return bg;
  const dk = darkness();
  if (dk <= 0.01) return bg;
  const c = mk(VW, VH), g = c.g;
  g.drawImage(bg, 0, 0);
  g.fillStyle = phase() === 'night' ? `rgba(10,14,48,${dk * 0.62})` : `rgba(70,30,78,${dk * 0.62})`;
  g.fillRect(0, 0, VW, VH);
  if (isNight()) for (let i = 0; i < 40; i++) px(g, (hash(i, 31) * VW) | 0, (hash(i, 32) * 56) | 0, i % 6 ? '#8a90c8' : '#ffffff', 1, 1);
  return c;
}
export const battleWeather = (g, m, t) => { if (outdoor(m)) particles(g, weatherOf(m), t, 0, 0); };
