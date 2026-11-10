// Code-drawn pixel art: tiles, trees, buildings, people and props. No image files.
export const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.g = c.getContext('2d', { willReadFrequently: true });
  c.g.imageSmoothingEnabled = false;
  return c;
};
export const hash = (x, y, n = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(n | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const INK = [22, 18, 40];
const P = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
export const px = P;
// Filled pixel ellipse (no anti-aliasing).
export function ell(g, cx, cy, rx, ry, col) {
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.5))));
    if (half > 0) P(g, cx - half, cy + y, col, half * 2, 1);
  }
}
// 1px line with hard pixels.
export function pline(g, x0, y0, x1, y1, col) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  g.fillStyle = col;
  for (;;) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
// Harden alpha and wrap the shape in a 1px dark outline (sprite needs a 1px margin).
export function outline(c, col = INK) {
  const g = c.g, w = c.width, h = c.height, im = g.getImageData(0, 0, w, h), d = im.data;
  const s = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) s[i] = d[i * 4 + 3] > 110 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (s[i]) { d[i * 4 + 3] = 255; continue; }
    d[i * 4 + 3] = 0;
    if ((x && s[i - 1]) || (x < w - 1 && s[i + 1]) || (y && s[i - w]) || (y < h - 1 && s[i + w])) {
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}
export function whiten(src) {
  const c = mk(src.width, src.height);
  c.g.drawImage(src, 0, 0);
  c.g.globalCompositeOperation = 'source-in';
  P(c.g, 0, 0, '#fff', c.width, c.height);
  return c;
}
export function flipH(src) {
  const c = mk(src.width, src.height);
  c.g.translate(src.width, 0); c.g.scale(-1, 1);
  c.g.drawImage(src, 0, 0);
  return c;
}

const C = {
  g1: '#5fb04a', g2: '#4a9440', g3: '#84cf5c', tg1: '#3f8f45', tg2: '#2c6e3c', tg3: '#7fd060',
  p1: '#dcc088', p2: '#c4a26a', p3: '#eed8a8', w1: '#3e8ede', w2: '#2f74c4', w3: '#9fdcf5', w0: '#245aa0',
  s1: '#ecd896', s2: '#d8be78', s3: '#f8ecc0', tr: '#6e4428', tr0: '#4e2e1c',
  l0: '#1f5638', l1: '#2f7d4a', l2: '#4fa85a', l3: '#7fd070', r1: '#8d93a0', r2: '#666c7c', r3: '#b9c0cc',
  cf: '#8a6f58', cf0: '#6a5242', cf1: '#a88c6c', c1: '#4b4560', c2: '#3d3852', c3: '#5a5472',
  cw: '#1c182e', cw1: '#6a6388', cw2: '#352f50', b1: '#b8804a', b2: '#8a5a30', b3: '#d8a468',
  x1: '#2b2d4a', x2: '#363962', x3: '#4ae3d8', xw: '#0e0f22', xw1: '#5a5fa0', xw2: '#24264e', ink: '#161228',
};
export const SOLID = 'T#RFXK~L';
// Outdoor palettes: [ground, ground dark, ground light], tall grass [base, blade, tip], tree leaves dark to light.
const THEMES = {
  out: { g: ['#5fb04a', '#4a9440', '#84cf5c'], tg: ['#3f8f45', '#2c6e3c', '#7fd060'], leaf: ['#1f5638', '#2f7d4a', '#4fa85a', '#7fd070'] },
  ash: { g: ['#73665e', '#5c514b', '#8a7c72'], tg: ['#8a5236', '#643826', '#e8943c'], leaf: ['#6e2418', '#a83c24', '#dc742c', '#f5b44a'] },
  snow: { g: ['#e6edf6', '#c6d3e4', '#ffffff'], tg: ['#a4c0d6', '#7a9cba', '#ffffff'], leaf: ['#173c3a', '#28604f', '#dfe8f2', '#ffffff'] },
};
const themeOf = t => THEMES[t] || THEMES.out;
const GRASSY = '.,fTF';

function tile(g, ch, X, Y, tx, ty, fr, at, theme) {
  const h = n => hash(tx, ty, n), TH = themeOf(theme);
  const grass = () => {
    P(g, X, Y, TH.g[0], 16, 16);
    for (let i = 0; i < 7; i++) {
      const x = (h(i) * 15) | 0, y = (h(i + 20) * 14) | 0;
      P(g, X + x, Y + y, i % 3 ? TH.g[1] : TH.g[2], 1, 2);
      if (i % 3 === 0) P(g, X + x + 1, Y + y + 1, TH.g[1]);
    }
  };
  const cave = () => {
    P(g, X, Y, C.c1, 16, 16);
    for (let i = 0; i < 5; i++) P(g, X + ((h(i) * 14) | 0), Y + ((h(i + 9) * 15) | 0), i % 2 ? C.c2 : C.c3, 2, 1);
  };
  const spire = () => { P(g, X, Y, C.x1, 16, 16); P(g, X, Y, C.x2, 16, 1); P(g, X, Y, C.x2, 1, 16); };
  const floor = () => (theme === 'cave' ? cave() : theme === 'spire' ? spire() : grass());
  const edges = (col, test) => {
    const n = test(at(tx, ty - 1)), s = test(at(tx, ty + 1)), w = test(at(tx - 1, ty)), e = test(at(tx + 1, ty));
    for (let i = 0; i < 16; i++) {
      const a = hash(tx * 16 + i, ty, 7) > 0.5 ? 1 : 0, b = hash(tx, ty * 16 + i, 8) > 0.5 ? 1 : 0;
      if (n) P(g, X + i, Y, col, 1, 1 + a);
      if (s) P(g, X + i, Y + 15 - b, col, 1, 1 + b);
      if (w) P(g, X, Y + i, col, 1 + b, 1);
      if (e) P(g, X + 15 - a, Y + i, col, 1 + a, 1);
    }
  };
  const wall = (top, face, lip, dark, solidCh) => {
    if (at(tx, ty + 1) === solidCh) {
      P(g, X, Y, top, 16, 16);
      for (let i = 0; i < 3; i++) P(g, X + ((h(i) * 14) | 0), Y + ((h(i + 4) * 14) | 0), dark, 2, 1);
    } else {
      P(g, X, Y, face, 16, 16);
      P(g, X, Y, lip, 16, 3);
      for (let i = 0; i < 3; i++) { const x = 2 + ((h(i + 30) * 12) | 0); P(g, X + x, Y + 4 + ((h(i + 40) * 4) | 0), dark, 1, 5 + ((h(i + 50) * 4) | 0)); }
      P(g, X, Y + 14, dark, 16, 2);
    }
  };
  const isWater = c => c === '~' || c === '=';
  switch (ch) {
    case '.': case 'T': grass(); break;
    case 'f': {
      grass();
      for (let i = 0; i < 3; i++) {
        const x = X + 2 + ((h(40 + i) * 11) | 0), y = Y + 2 + ((h(50 + i) * 11) | 0);
        const col = ['#f0586a', '#f5d442', '#ffffff', '#c58af0'][(h(60 + i) * 4) | 0];
        P(g, x - 1, y, col, 3, 1); P(g, x, y - 1, col, 1, 3); P(g, x, y, col === '#f5d442' ? '#e8862a' : '#f5d442');
      }
      break;
    }
    case ',': {
      P(g, X, Y, TH.tg[0], 16, 16);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
        const x = X + ((i * 4 + r * 2 + ((h(r * 4 + i) * 2) | 0)) % 16), y = Y + 3 + r * 5;
        P(g, x, y - 1, TH.tg[1], 1, 4); P(g, x + 1, y - 2, TH.tg[1], 1, 3);
        P(g, x, y - 3, TH.tg[2], 1, 2); P(g, x + 1, y - 3, TH.tg[2]);
      }
      break;
    }
    case ':':
      P(g, X, Y, C.p1, 16, 16);
      for (let i = 0; i < 5; i++) P(g, X + ((h(i) * 14) | 0), Y + ((h(i + 9) * 15) | 0), i % 2 ? C.p2 : C.p3, 2, 1);
      edges(TH.g[1], c => GRASSY.includes(c));
      break;
    case 's':
      P(g, X, Y, C.s1, 16, 16);
      for (let i = 0; i < 5; i++) P(g, X + ((h(i) * 15) | 0), Y + ((h(i + 9) * 15) | 0), i % 2 ? C.s2 : C.s3);
      edges(TH.g[1], c => GRASSY.includes(c));
      break;
    case '~': {
      P(g, X, Y, C.w1, 16, 16);
      for (let i = 0; i < 3; i++) {
        const x = ((h(i) * 11) | 0) + (fr ? 2 : 0), y = 3 + ((h(i + 5) * 11) | 0);
        P(g, X + x, Y + y, i ? C.w2 : C.w3, 3, 1);
      }
      if (!isWater(at(tx, ty - 1))) { P(g, X, Y, C.w0, 16, 3); for (let i = fr ? 2 : 0; i < 16; i += 4) P(g, X + i, Y + 3, C.w3, 2, 1); }
      if (!isWater(at(tx - 1, ty))) P(g, X, Y, C.w2, 1, 16);
      if (!isWater(at(tx + 1, ty))) P(g, X + 15, Y, C.w2, 1, 16);
      if (!isWater(at(tx, ty + 1))) P(g, X, Y + 15, C.w3, 16, 1);
      break;
    }
    case 'L': {
      P(g, X, Y, '#e8562a', 16, 16);
      for (let i = 0; i < 4; i++) {
        const x = ((h(i) * 11) | 0) + (fr ? 1 : 0), y = 2 + ((h(i + 5) * 12) | 0) - (fr ? 1 : 0);
        P(g, X + x, Y + y, i % 2 ? '#ffb03a' : '#c23a22', 4, 2); if (i === 0) P(g, X + x + 1, Y + y, '#ffe06a', 2, 1);
      }
      const crust = '#2e2224';
      if (at(tx, ty - 1) !== 'L') { P(g, X, Y, crust, 16, 2); for (let i = fr ? 3 : 1; i < 16; i += 5) P(g, X + i, Y + 2, '#ffb03a', 2, 1); }
      if (at(tx, ty + 1) !== 'L') P(g, X, Y + 14, crust, 16, 2);
      if (at(tx - 1, ty) !== 'L') P(g, X, Y, crust, 2, 16);
      if (at(tx + 1, ty) !== 'L') P(g, X + 14, Y, crust, 2, 16);
      break;
    }
    case '=':
      P(g, X, Y, C.b1, 16, 16);
      for (let y = 3; y < 16; y += 4) P(g, X, Y + y, C.b2, 16, 1);
      for (let i = 0; i < 3; i++) P(g, X + ((h(i) * 13) | 0), Y + ((h(i + 3) * 4) | 0) * 4 + 1, C.b3, 3, 1);
      if (at(tx, ty - 1) === '~') P(g, X, Y, C.b2, 16, 2);
      if (at(tx, ty + 1) === '~') P(g, X, Y + 14, C.b2, 16, 2);
      if (at(tx - 1, ty) === '~') P(g, X, Y, C.b2, 2, 16);
      if (at(tx + 1, ty) === '~') P(g, X + 14, Y, C.b2, 2, 16);
      break;
    case 'F':
      grass();
      P(g, X + 1, Y + 3, C.b2, 3, 11); P(g, X + 12, Y + 3, C.b2, 3, 11);
      P(g, X, Y + 5, C.b3, 16, 2); P(g, X, Y + 10, C.b1, 16, 2);
      P(g, X + 1, Y + 3, C.b3, 3, 1); P(g, X + 12, Y + 3, C.b3, 3, 1);
      break;
    case 'S':
      P(g, X, Y, C.ink, 16, 16);
      for (let i = 0; i < 4; i++) { P(g, X + 1 + i, Y + i * 4, theme === 'cave' ? C.c3 : C.xw1, 14 - i * 2, 3); P(g, X + 1 + i, Y + i * 4 + 3, theme === 'cave' ? C.c2 : C.xw2, 14 - i * 2, 1); }
      P(g, X + 6, Y + 6, fr ? C.x3 : '#2aa8a8', 4, 2);
      break;
    case 'c': cave(); break;
    case 'p': spire(); break;
    case 'P':
      spire();
      P(g, X + 4, Y + 7, fr ? C.x3 : '#2aa8a8', 8, 2); P(g, X + 7, Y + 4, fr ? C.x3 : '#2aa8a8', 2, 8);
      P(g, X + 7, Y + 7, '#d0fffb', 2, 2);
      break;
    case 'R':
      floor();
      ell(g, X + 8, Y + 9, 7, 6, C.ink); ell(g, X + 8, Y + 9, 6, 5, C.r1);
      ell(g, X + 6, Y + 7, 3, 2, C.r3); P(g, X + 4, Y + 12, C.r2, 9, 2); P(g, X + 10, Y + 8, C.r2, 2, 3);
      break;
    case 'K':
      cave();
      P(g, X + 5, Y + 3, C.ink, 6, 12); P(g, X + 10, Y + 7, C.ink, 4, 8); P(g, X + 2, Y + 9, C.ink, 4, 6);
      P(g, X + 6, Y + 4, '#63e6e0', 4, 10); P(g, X + 7, Y + 3, '#63e6e0', 2, 1); P(g, X + 6, Y + 4, '#d0fffb', 1, 8);
      P(g, X + 11, Y + 8, '#3aa8b8', 2, 6); P(g, X + 3, Y + 10, '#3aa8b8', 2, 4); P(g, X + 3, Y + 10, '#9ff5ee', 1, 2);
      break;
    case '#':
      if (theme === 'cave') wall(C.cw, C.cw2, C.cw1, C.cw, '#');
      else wall(C.cf1, C.cf, '#c4a888', C.cf0, '#');
      break;
    case 'X':
      wall(C.xw, C.xw2, C.xw1, C.xw, 'X');
      if (at(tx, ty + 1) !== 'X' && h(70) > 0.55) P(g, X + 7, Y + 5, fr ? C.x3 : '#2aa8a8', 2, 7);
      break;
    case 'O':
      wall(C.cf1, C.cf, '#c4a888', C.cf0, '?');
      P(g, X + 2, Y + 4, C.ink, 12, 12); P(g, X + 4, Y + 2, C.ink, 8, 2);
      P(g, X + 4, Y + 6, '#2a2440', 8, 10);
      break;
    default: floor();
  }
}

// Two animation frames of a map's ground layer.
export function drawGround(map) {
  const at = (x, y) => (map.t[y] && map.t[y][x]) || map.edge;
  return [0, 1].map(fr => {
    const c = mk(map.w * 16, map.h * 16);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) tile(c.g, map.t[y][x], x * 16, y * 16, x, y, fr, at, map.theme);
    return c;
  });
}

const tallFronts = {};
export function tallOverlay(theme) {
  if (tallFronts[theme]) return tallFronts[theme];
  const c = mk(16, 7), g = c.g, tg = themeOf(theme).tg;
  for (let i = 0; i < 5; i++) {
    const x = i * 3 + 1;
    P(g, x, 2, tg[1], 2, 5); P(g, x, 1 + (i % 2), tg[2], 1, 2); P(g, x + 1, 3, tg[0], 1, 4);
  }
  return (tallFronts[theme] = c);
}

const trees = {};
export function treeSprite(v, theme) {
  const key = v + theme;
  if (trees[key]) return trees[key];
  const c = mk(22, 30), g = c.g, [l0, l1, l2, l3] = themeOf(theme).leaf;
  P(g, 9, 19, C.tr, 4, 10); P(g, 12, 19, C.tr0, 1, 10); P(g, 8, 27, C.tr, 6, 2); P(g, 8, 28, C.tr0, 1, 1);
  ell(g, 11, 11, 10, 10, l1);
  for (let y = 15; y < 22; y++) for (let x = 1; x < 21; x++) if (hash(x, y, v) > 0.35) { const d = (x - 11) ** 2 + (y - 11) ** 2; if (d < 100) P(g, x, y, l0); }
  ell(g, 9, 9, 7, 6, l2); ell(g, 8, 7, 4, 3, l3);
  for (let i = 0; i < 16; i++) {
    const x = 3 + ((hash(i, v, 1) * 15) | 0), y = 3 + ((hash(i, v, 2) * 13) | 0);
    if ((x - 11) ** 2 + (y - 11) ** 2 < 80) P(g, x, y, i % 2 ? l1 : l3, 2, 1);
  }
  return (trees[key] = outline(c));
}

const ROOFS = {
  red: ['#d8503c', '#a83228', '#f08a6a'], blue: ['#4a7ad8', '#2f4f9a', '#8ab4f0'],
  teal: ['#3fa7a0', '#256e6c', '#7fd8cc'], violet: ['#8a5ac8', '#5a3792', '#b894f0'], gold: ['#e0a83c', '#a8742a', '#f8d67a'],
};
export function buildingSprite(w, h, roof, sign, dx) {
  const W = w * 16, H = h * 16 + 8, c = mk(W, H), g = c.g, rh = Math.round(H * 0.52);
  P(g, 0, rh - 2, C.ink, W, H - rh + 2);
  P(g, 1, rh - 2, '#efe2c0', W - 2, H - rh + 1);
  for (let y = rh + 4; y < H - 4; y += 5) P(g, 1, y, '#d9c9a0', W - 2, 1);
  P(g, 1, H - 4, C.r1, W - 2, 3); P(g, 1, H - 4, C.r3, W - 2, 1);
  P(g, 1, rh, '#b8a880', W - 2, 2);
  const [r1, r2, r3] = ROOFS[roof];
  for (let y = 0; y < rh; y++) { const inset = Math.max(0, 3 - y); P(g, inset, y, C.ink, W - inset * 2, 1); P(g, inset + 1, y, r1, W - inset * 2 - 2, 1); }
  for (let y = 4; y < rh; y += 4) { P(g, 1, y, r2, W - 2, 1); for (let x = 1 + ((y / 4) % 2) * 4; x < W - 1; x += 8) P(g, x, y - 3, r2, 1, 3); }
  P(g, 3, 0, C.ink, W - 6, 1); P(g, 4, 1, r3, W - 8, 1); P(g, 0, rh - 1, C.ink, W, 1);
  for (let col = 0; col < w; col++) {
    if (col === dx) {
      const x = col * 16 + 2, y = H - 16;
      P(g, x - 1, y - 1, C.ink, 14, 16); P(g, x, y, C.b2, 12, 15); P(g, x + 1, y + 1, '#a87040', 10, 14);
      P(g, x + 5, y + 1, C.b2, 1, 14); P(g, x + 9, y + 8, '#ffd84a', 1, 2);
    } else {
      const x = col * 16 + 4, y = H - 14;
      P(g, x - 1, y - 1, C.ink, 10, 9); P(g, x, y, '#9fdcf5', 8, 7); P(g, x, y, '#d8f4ff', 3, 2);
      P(g, x + 3, y, C.cf0, 1, 7); P(g, x, y + 3, C.cf0, 8, 1);
    }
  }
  if (sign) {
    const x = dx * 16 + 3, y = rh - 9;
    P(g, x - 1, y - 1, C.ink, 12, 11); P(g, x, y, '#fff8e4', 10, 9);
    if (sign === 'heal') { P(g, x + 4, y + 1, '#e8485a', 2, 7); P(g, x + 2, y + 3, '#e8485a', 6, 3); }
    else if (sign === 'shop') { ell(g, x + 5, y + 4, 3, 3, '#e0a83c'); P(g, x + 4, y + 2, '#fff3b0', 1, 3); }
    else if (sign === 'lab') { P(g, x + 4, y + 1, '#3fa7a0', 2, 7); P(g, x + 2, y + 3, '#3fa7a0', 6, 3); P(g, x + 4, y + 3, '#d0fffb', 2, 3); P(g, x + 1, y + 1, '#8a5ac8', 2, 2); P(g, x + 7, y + 6, '#8a5ac8', 2, 2); }
  }
  return c;
}

export const LOOKS = {
  hero: { hair: '#5a3a22', hat: '#e0503c', shirt: '#3fa7a0', pants: '#34406a' },
  sable: { hair: '#e4e4f0', shirt: '#6a4fb8', robe: true },
  mender: { hair: '#f08aa8', shirt: '#f4f0e8', pants: '#e8485a' },
  elder: { hair: '#c8c8d4', shirt: '#8a6238', pants: '#5a4630', skin: '#e0b088' },
  kid: { hair: '#f0c040', shirt: '#f08a3c', pants: '#4a7ad8' },
  girl: { hair: '#8a3a2a', shirt: '#f5d442', pants: '#6a4fb8' },
  pip: { hair: '#3a8a3c', hat: '#f5d442', shirt: '#5cb84a', pants: '#6e4428' },
  rook: { hair: '#2a2636', shirt: '#d8503c', pants: '#2e2c48', skin: '#c89068' },
  odo: { hair: '#8d93a0', hat: '#e0a83c', shirt: '#666c7c', pants: '#3d3852' },
  maris: { hair: '#2f74c4', shirt: '#f4f0e8', pants: '#2f4f9a', robe: true, skin: '#d8a078' },
  fisher: { hair: '#6e4428', hat: '#ecd896', shirt: '#4a7ad8', pants: '#8a6238' },
  breeder: { hair: '#f08a3c', shirt: '#7fd070', pants: '#4a9440' },
  wren: { hair: '#f4f0e8', shirt: '#3fa7a0', pants: '#245aa0', skin: '#c89068' },
  hale: { hair: '#4e2e1c', hat: '#5a3792', shirt: '#a37cf0', pants: '#2e2c48' },
  kael: { hair: '#e8562a', shirt: '#3a2a2a', pants: '#8a5236', skin: '#c89068' },
  yuna: { hair: '#dfe8f2', hat: '#4a7ad8', shirt: '#f6d743', robe: true },
  smith: { hair: '#2a2636', shirt: '#b8442a', pants: '#3a2a2a', skin: '#c89068' },
  scout: { hair: '#6e4428', hat: '#dfe8f2', shirt: '#4a7ad8', pants: '#34406a' },
  acolyte: { hair: '#12132a', hat: '#12132a', shirt: '#2a2c58', robe: true, skin: '#b8c0d8' },
};
const chars = {};
export function charSprite(id, dir, f) {
  const key = id + dir + f;
  if (chars[key]) return chars[key];
  const o = LOOKS[id] || LOOKS.kid, skin = o.skin || '#f6c9a0', dark = '#2a1c2e';
  const c = mk(18, 22), g = c.g;
  const R = (x, y, w, h, col) => P(g, x + 1, y + 1, col, w, h);
  const pants = o.robe ? o.shirt : o.pants, side = dir === 'left' || dir === 'right';
  if (side) {
    if (o.robe) { R(5, 15, 6, 4, pants); R(5 + (f === 1 ? -1 : 0), 19, 6, 1, dark); }
    else if (f === 0) { R(6, 15, 4, 4, pants); R(5, 19, 5, 1, dark); }
    else if (f === 1) { R(4, 15, 3, 3, pants); R(9, 15, 3, 3, pants); R(3, 18, 4, 1, dark); R(9, 18, 4, 1, dark); }
    else { R(6, 15, 4, 3, pants); R(5, 18, 3, 1, dark); R(8, 17, 3, 1, dark); }
    R(5, 10, 6, 5, o.shirt);
    R(7, 10 + (f === 1 ? 1 : 0), 2, 4, o.robe ? '#00000030' : o.shirt); R(7, 13 + (f === 1 ? 1 : 0), 2, 1, skin);
    R(4, 2, 8, 8, skin); R(4, 1, 9, 3, o.hair); R(8, 4, 5, 4, o.hair); R(5, 6, 1, 2, dark);
    if (o.hat) { R(3, 0, 10, 3, o.hat); R(2, 3, 5, 1, o.hat); }
  } else {
    const up = dir === 'up';
    if (o.robe) { R(4, 15, 8, 4, pants); R(4, 19, 3, 1, dark); R(9, 19, 3, 1, dark); }
    else {
      R(5, 15, 2, f === 1 ? 2 : 4, pants); R(5, f === 1 ? 17 : 19, 2, 1, dark);
      R(9, 15, 2, f === 2 ? 2 : 4, pants); R(9, f === 2 ? 17 : 19, 2, 1, dark);
    }
    R(4, 10, 8, 5, o.shirt); R(4, 14, 8, 1, pants);
    R(3, 10 + (f === 1 ? 1 : 0), 1, 4, o.shirt); R(12, 10 + (f === 2 ? 1 : 0), 1, 4, o.shirt);
    R(3, 13 + (f === 1 ? 1 : 0), 1, 1, skin); R(12, 13 + (f === 2 ? 1 : 0), 1, 1, skin);
    R(4, 2, 8, 8, skin);
    if (up) R(3, 1, 10, 7, o.hair);
    else {
      R(3, 1, 10, 3, o.hair); R(3, 4, 1, 3, o.hair); R(12, 4, 1, 3, o.hair); R(4, 4, 8, 1, o.hair);
      R(5, 6, 1, 2, dark); R(10, 6, 1, 2, dark); R(4, 8, 1, 1, '#f0a090'); R(11, 8, 1, 1, '#f0a090');
    }
    if (o.hat) { R(3, 0, 10, 3, o.hat); if (!up) R(3, 3, 10, 1, o.hat); }
  }
  outline(c);
  return (chars[key] = dir === 'right' ? flipH(c) : c);
}

let chestS, signS, bang, seal;
export function chestSprite() {
  if (chestS) return chestS;
  const c = mk(16, 14), g = c.g;
  P(g, 2, 3, C.b2, 12, 10); P(g, 2, 3, C.b1, 12, 4); P(g, 3, 3, C.b3, 10, 1);
  P(g, 2, 7, '#e0a83c', 12, 1); P(g, 7, 6, '#f8d67a', 2, 3); P(g, 2, 3, '#e0a83c', 1, 10); P(g, 13, 3, '#e0a83c', 1, 10);
  return (chestS = outline(c));
}
export function signSprite() {
  if (signS) return signS;
  const c = mk(16, 16), g = c.g;
  P(g, 7, 9, C.b2, 2, 6); P(g, 2, 2, C.b1, 12, 8); P(g, 3, 3, C.b3, 10, 1);
  P(g, 4, 5, C.b2, 8, 1); P(g, 4, 7, C.b2, 6, 1);
  return (signS = outline(c));
}
export function bangSprite() {
  if (bang) return bang;
  const c = mk(9, 12), g = c.g;
  P(g, 1, 1, '#fff8e4', 7, 9); P(g, 4, 2, '#e8485a', 1, 5); P(g, 4, 8, '#e8485a', 1, 1);
  return (bang = outline(c));
}
export function sealSprite() {
  if (seal) return seal;
  const c = mk(11, 11), g = c.g;
  ell(g, 5, 5, 4, 4, '#3fa7a0'); P(g, 3, 5, '#fff8e4', 5, 1); P(g, 5, 3, '#fff8e4', 1, 5); P(g, 4, 4, '#ffd84a', 3, 3); P(g, 3, 3, '#9ff5ee');
  return (seal = outline(c));
}
