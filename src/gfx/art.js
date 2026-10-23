/* Procedural pixel-art sprites, hand-tuned to a lush top-down farm look. Everything is drawn pixel by pixel. */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const rngf = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export const vnoise = (x, y, s = 0) => {                      // smooth value noise
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
class Img {                                                    // tiny raster helper with ImageData
  constructor(w, h) { this.w = w; this.h = h; this.c = mk(w, h); this.q = this.c.getContext('2d'); this.d = this.q.createImageData(w, h); }
  set(x, y, col) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const o = (y * this.w + x) * 4, c = typeof col === 'string' ? rgb(col) : col; this.d.data[o] = c[0]; this.d.data[o + 1] = c[1]; this.d.data[o + 2] = c[2]; this.d.data[o + 3] = 255; }
  has(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d.data[(y * this.w + x) * 4 + 3] > 0; }
  rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col); }
  done() { this.q.putImageData(this.d, 0, 0); return this.c; }
}
export { Img };

/* ------------------------------ canopies ------------------------------ */
const RAMPS = {
  olive:  ['#1d4630', '#2e6a2e', '#4d982f', '#8cc03a', '#c4d84a'],
  green:  ['#14402f', '#1e6a36', '#2f9a3d', '#51c04a', '#86df62'],
  deep:   ['#12363a', '#1b5a47', '#2a8049', '#41a850', '#6fcc5a'],
  autumn: ['#4a2a22', '#8a4a20', '#bd6e20', '#e8a03a', '#f6cc66'],
  bush:   ['#17402c', '#22693a', '#38993f', '#5cc04c', '#92e064'],
};
const OUTLINE = { olive: '#15302a', green: '#0f2c26', deep: '#0d2a2e', autumn: '#32201d', bush: '#10301f' };
const TRUNK = ['#42303c', '#6f564f', '#9d856f', '#c9b69d'];

function canopy(img, lumps, ramp, ol, seed) {
  const own = new Int16Array(img.w * img.h).fill(-1), nx = new Float32Array(img.w * img.h), ny = new Float32Array(img.w * img.h);
  lumps.forEach(([cx, cy, rad], k) => {
    const ph = hash(k, seed, 3) * 6.28, ph2 = hash(k, seed, 5) * 6.28;
    for (let y = Math.floor(cy - rad - 3); y <= cy + rad + 3; y++) for (let x = Math.floor(cx - rad - 3); x <= cx + rad + 3; x++) {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
      const dx = x - cx, dy = (y - cy) * 1.08, a = Math.atan2(dy, dx);
      const rr = rad * (1 + 0.09 * Math.sin(a * 5 + ph) + 0.06 * Math.sin(a * 9 + ph2)) + (hash(x, y, seed + k) - 0.5) * 1.6;
      if (Math.hypot(dx, dy) <= rr) { const i = y * img.w + x; own[i] = k; nx[i] = dx / rr; ny[i] = dy / rr; }
    }
  });
  const n = ramp.length, lvl = new Int8Array(img.w * img.h).fill(-1);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = y * img.w + x; if (own[i] < 0) continue;
    const k = own[i], cy = lumps[k][1];
    let b = 0.5 - 0.5 * (nx[i] * 0.45 + ny[i] * 0.9);                 // light from the top-left
    b += (1 - cy / img.h) * 0.22 - 0.08 + (hash(x >> 1, y >> 1, seed) - 0.5) * 0.34 + (((x + y) & 1) ? 0.04 : -0.04);
    lvl[i] = Math.max(0, Math.min(n - 1, Math.floor(b * n)));
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [ox, oy] of nb) { const j = (y + oy) * img.w + x + ox; if (own[j] > k && x + ox >= 0 && x + ox < img.w) { lvl[i] = Math.min(lvl[i], 0); break; } }
  }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = y * img.w + x; if (lvl[i] < 0) continue;
    let edge = false;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + ox, yy = y + oy; if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h || own[yy * img.w + xx] < 0) edge = true; }
    img.set(x, y, edge ? ol : ramp[lvl[i]]);
  }
}

function trunk(img, cx, y0, y1, seed) {
  const h = y1 - y0;
  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / h, half = 3 + t * 1.5 + (y > y1 - 4 ? (y - (y1 - 4)) * 1.1 : 0);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = (x - (cx - half)) / (half * 2 || 1);
      let li = u < 0.25 ? 3 : u < 0.55 ? 2 : u < 0.85 ? 1 : 0;
      if (hash(x, y >> 1, seed) < 0.22) li = Math.max(0, li - 1);
      if (x === Math.round(cx - half) || x === Math.round(cx + half)) li = 0;
      img.set(x, y, TRUNK[li]);
    }
  }
  [[-1, -4], [1, -4]].forEach(([s]) => {                              // two branches into the canopy
    for (let i = 0; i < 9; i++) img.rect(Math.round(cx + s * (2 + i * 0.8)), Math.round(y0 - i * 0.9), 2, 2, TRUNK[i % 3 === 0 ? 1 : 2]);
  });
}

export function makeTree(v, seed = 1) {
  const kind = ['olive', 'green', 'deep', 'autumn', 'green'][v % 5], W = 56, H = 70, img = new Img(W, H), r = rngf(seed * 91 + v * 7 + 3);
  if (v === 4) return makePine(seed);
  trunk(img, 28, 40, 68, seed);
  const j = () => (r() - 0.5) * 3;
  const lumps = [[28, 25, 21], [11, 31, 11], [45, 31, 11], [18, 17, 13], [38, 17, 13], [28, 11, 12], [17, 39, 9], [39, 39, 9], [28, 36, 12]]
    .map(([x, y, rr]) => [x + j(), y + j(), rr + (r() - 0.5) * 2]);
  lumps.push([21 + j(), 22 + j(), 8], [35 + j(), 24 + j(), 8], [28 + j(), 17 + j(), 7]);   // inner clumps give the leafy "bubbles"
  canopy(img, lumps, RAMPS[kind], OUTLINE[kind], seed + v * 13);
  return img.done();
}
function makePine(seed) {
  const W = 40, H = 70, img = new Img(W, H);
  trunk(img, 20, 54, 68, seed);
  const lumps = [];
  for (let i = 0; i < 5; i++) { const w = 5 + i * 3.4, y = 12 + i * 10; for (let k = -2; k <= 2; k++) lumps.push([20 + k * (w / 2.4), y + Math.abs(k) * 2.4, w / 2.2]); }
  canopy(img, lumps, RAMPS.deep, OUTLINE.deep, seed + 5);
  return img.done();
}
export function makeBush(v, seed = 1) {
  const W = 28, H = 22, img = new Img(W, H), r = rngf(seed * 31 + v);
  const lumps = [[9, 12, 8], [19, 12, 8], [14, 8, 8], [14, 14, 7]];
  canopy(img, lumps, RAMPS.bush, OUTLINE.bush, seed + v);
  const cols = [['#7fd0ff', '#ffffff'], ['#ff7ab8', '#ffe0f0'], ['#ffd23a', '#fff6b0']][v % 3];
  for (let i = 0; i < 9; i++) { const x = 4 + ((r() * 20) | 0), y = 4 + ((r() * 13) | 0); if (img.has(x, y)) { img.set(x, y, cols[0]); if (r() > 0.5) img.set(x + 1, y, cols[1]); } }
  return img.done();
}

/* ------------------------------ small props ------------------------------ */
export function makeTuft(v) {
  const img = new Img(10, 12), cols = [['#ffd23a', '#c88a1e'], ['#ffffff', '#c9d4e8'], ['#ff7ab8', '#c84488'], ['#8fd0ff', '#4a90d0']][v % 4];
  [[2, 3], [6, 5], [4, 1]].forEach(([x, y]) => { img.set(x, y, cols[1]); img.set(x + 1, y, cols[0]); img.set(x - 1, y, cols[0]); img.set(x, y - 1, cols[0]); img.set(x, y + 1, cols[0]); img.set(x, y, '#ffd23a');
    for (let s = y + 2; s < 11; s++) img.set(x, s, '#2a8a2e'); });
  for (let i = 0; i < 4; i++) { img.set(1 + i * 2, 11, '#1f6a2a'); img.set(2 + i * 2, 10, '#3da63a'); }
  return img.done();
}
export function makeStone() {
  const img = new Img(15, 9);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 15; x++) { const d = Math.hypot((x - 7) / 7.5, (y - 4) / 4.3); if (d < 1) img.set(x, y, d > 0.82 ? '#8f8a86' : y < 4 ? '#d6d0c6' : '#bdb6ac'); }
  for (let x = 4; x < 10; x++) img.set(x, 2, '#ebe6dc');
  return img.done();
}
export function makeBench() {
  const img = new Img(44, 28);
  img.rect(3, 6, 38, 14, '#6b3a2c'); for (let x = 5; x < 40; x += 4) img.rect(x, 7, 1, 12, '#4c261f');     // back planks
  for (let x = 3; x < 41; x++) { img.set(x, 5, '#8a4f3a'); }
  img.rect(1, 14, 42, 9, '#865037'); img.rect(1, 14, 42, 2, '#a96a48'); img.rect(1, 22, 42, 2, '#4c261f');   // seat
  img.rect(0, 22, 4, 5, '#4c261f'); img.rect(40, 22, 4, 5, '#4c261f');
  [[0, 5], [43, 5]].forEach(([x]) => img.rect(x, 6, 1, 17, '#301812'));
  return img.done();
}
export function makeLogs() {
  const img = new Img(34, 24);
  const log = (x, y, w) => { for (let i = 0; i < w; i++) { img.rect(x + i, y, 1, 8, i < 2 ? '#e6cf9a' : i > w - 3 ? '#a8864a' : '#d3b676'); } img.rect(x + 1, y, w - 2, 1, '#f1e0b4'); img.rect(x + 1, y + 7, w - 2, 1, '#8a6a3a');
    for (let k = 0; k < 8; k++) { img.set(x - 2, y + k, '#6f4a2a'); img.set(x + w + 1, y + k, '#6f4a2a'); } img.rect(x - 1, y + 1, 1, 6, '#e8c97e'); img.rect(x + w, y + 1, 1, 6, '#c7a05a'); };
  log(3, 14, 26); log(6, 8, 24); log(9, 2, 20);
  return img.done();
}
export function makeCloud() {
  const img = new Img(76, 34);
  [[18, 22, 12], [36, 16, 15], [54, 21, 13], [28, 24, 10], [46, 25, 10]].forEach(([cx, cy, rr]) => {
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { if (Math.hypot(x, y * 1.1) <= rr) img.set(cx + x, cy + y, y > rr * 0.35 ? '#c9d2f0' : y > -rr * 0.2 ? '#f0f4ff' : '#ffffff'); }
  });
  return img.done();
}

/* ------------------------------ buildings ------------------------------ */
const P1 = ['#2d1f4d', '#43306b', '#5a4390', '#6f57a8'];          // purple roof ramp
function tiles(img, x0, y0, x1, y1, inside, dark) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inside(x, y)) continue;
    const row = Math.floor((y - y0) / 4), off = (row & 1) * 3, xx = x - x0 + off, tx = xx % 6, ty = (y - y0) % 4;
    let c = dark ? 1 : 2;
    if (ty === 3) c = 0; else if (tx === 0) c = dark ? 0 : 1; else if (ty === 0) c = dark ? 2 : 3;
    img.set(x, y, P1[c]);
  }
}
export function makeHouse() {
  const W = 92, H = 112, img = new Img(W, H), cx = 46;
  /* big roof: two slopes meeting at the ridge */
  const roof = (x, y) => y >= 3 && y <= 54 && Math.abs(x - cx) <= 3 + (y - 3) * 0.86 + (y > 40 ? 0 : 0);
  tiles(img, 0, 0, W - 1, 56, (x, y) => roof(x, y) && x < cx, true);
  tiles(img, 0, 0, W - 1, 56, (x, y) => roof(x, y) && x >= cx, false);
  for (let y = 3; y <= 54; y++) { const e = Math.round(3 + (y - 3) * 0.86); img.set(cx - e - 1, y, '#1c1233'); img.set(cx + e + 1, y, '#1c1233'); }
  for (let x = 0; x < W; x++) if (img.has(x, 54)) img.set(x, 55, '#1c1233');
  img.rect(cx - 1, 3, 2, 52, '#7a63b8');                              // ridge
  /* timber-framed gable under the roof */
  const gable = (x, y) => y >= 33 && y <= 62 && Math.abs(x - cx) <= (y - 33) * 1.05 + 3;
  for (let y = 33; y <= 62; y++) for (let x = 0; x < W; x++) if (gable(x, y)) img.set(x, y, y < 56 && (x + y) % 11 === 0 ? '#e7dcc2' : '#f1e8d2');
  const beam = '#7a4630', beamD = '#4c2a20';
  for (let y = 33; y <= 62; y++) for (let x = 0; x < W; x++) if (gable(x, y) && !gable(x - 1, y) || gable(x, y) && !gable(x + 1, y)) img.set(x, y, beamD);
  img.rect(cx - 30, 56, 61, 3, beam); img.rect(cx - 30, 59, 61, 1, beamD); img.rect(cx - 17, 45, 35, 2, beam); img.rect(cx - 1, 33, 3, 24, beam);
  for (let i = 0; i < 12; i++) { img.rect(cx - 13 + i, 56 - i * 1, 2, 2, beam); img.rect(cx + 12 - i, 56 - i * 1, 2, 2, beam); }
  for (let i = 0; i < 10; i++) { img.rect(cx - 8 + i * 1.7 | 0, 46 + i, 2, 2, beam); img.rect(cx + 8 - i * 1.7 | 0, 46 + i, 2, 2, beam); }
  const win = (x, y, w, h) => { img.rect(x - 1, y - 1, w + 2, h + 2, beam); img.rect(x, y, w, h, '#355d94'); img.rect(x, y, w, 2, '#5f9bd8'); for (let i = 1; i < w; i += 5) img.rect(x + i + 1, y, 1, h, beam); img.rect(x, y + (h >> 1), w, 1, beam); };
  win(cx - 5, 36, 10, 8); win(cx - 30, 48, 12, 9); win(cx + 18, 48, 12, 9);
  const flowers = (x, y, w) => { img.rect(x - 1, y, w + 2, 4, '#3a2a28'); img.rect(x, y - 2, w, 3, '#2e8a34'); for (let i = 0; i < w; i += 2) img.set(x + i, y - 2 - (i % 3 === 0 ? 1 : 0), ['#ff7ab8', '#ffd23a', '#ff9a2e', '#ffffff'][(i >> 1) % 4]); };
  flowers(cx - 31, 58, 14); flowers(cx + 17, 58, 14);
  /* lower lean-to roof band */
  const band = (x, y) => y >= 63 && y <= 79 && x >= 3 && x <= W - 4;
  tiles(img, 0, 63, W - 1, 79, (x, y) => band(x, y) && x < cx, true); tiles(img, 0, 63, W - 1, 79, (x, y) => band(x, y) && x >= cx, false);
  for (let x = 3; x <= W - 4; x++) img.set(x, 80, '#1c1233');
  /* porch gable above the door */
  const porch = (x, y) => y >= 58 && y <= 90 && Math.abs(x - cx) <= 3 + (y - 58) * 0.55;
  tiles(img, 0, 58, W - 1, 90, (x, y) => porch(x, y) && x < cx, true); tiles(img, 0, 58, W - 1, 90, (x, y) => porch(x, y) && x >= cx, false);
  for (let y = 58; y <= 90; y++) { const e = Math.round(3 + (y - 58) * 0.55); img.set(cx - e - 1, y, '#1c1233'); img.set(cx + e + 1, y, '#1c1233'); }
  img.rect(cx - 1, 58, 2, 33, '#7a63b8');
  /* ground floor */
  img.rect(8, 80, W - 16, 30, '#7a4a38'); img.rect(8, 80, W - 16, 2, '#4a2a22');
  for (let x = 9; x < W - 8; x += 3) img.rect(x, 82, 1, 28, '#5a362a');
  img.rect(cx - 12, 90, 24, 20, '#efe5cc'); img.rect(cx - 12, 90, 24, 1, beamD);
  img.rect(cx - 8, 92, 16, 18, beamD); img.rect(cx - 7, 93, 14, 17, '#5e4670'); img.rect(cx - 6, 92, 12, 1, '#5e4670');
  for (let x = cx - 6; x < cx + 6; x += 3) img.rect(x, 94, 1, 16, '#47345a'); img.rect(cx - 6, 100, 12, 1, '#3a2a4a'); img.rect(cx + 3, 102, 2, 2, '#e8b872');
  const win2 = (x) => { img.rect(x - 1, 84, 20, 17, beamD); img.rect(x, 85, 18, 15, '#2f5a94'); img.rect(x, 85, 18, 4, '#5f9bd8'); for (let i = 3; i < 18; i += 5) img.rect(x + i, 85, 1, 15, '#7a4630'); img.rect(x, 92, 18, 1, '#7a4630'); flowers(x - 1, 101, 20); };
  win2(14); win2(W - 32);
  img.rect(8, 109, W - 16, 3, '#2d1f2c');
  return img.done();
}
export function makeCave() {
  const W = 40, H = 36, img = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - 20) / 19.5, dy = (y - 22) / 21;
    if (dx * dx + dy * dy < 1 && y < 30) {
      const cell = hash((x / 5) | 0, ((y + ((x / 5 | 0) & 1) * 2) / 4) | 0, 9), seam = x % 5 === 0 || (y + (((x / 5) | 0) & 1) * 2) % 4 === 0;
      let li = Math.floor((1 - (dx * 0.5 + dy * 0.9 + 1) / 2) * 3 + cell * 0.9); li = Math.max(0, Math.min(3, li));
      img.set(x, y, seam ? '#4d5260' : ['#7d8492', '#9aa1ae', '#b4bac6', '#cdd2da'][li]);
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.has(x, y) && (!img.has(x - 1, y) || !img.has(x + 1, y) || !img.has(x, y - 1))) img.set(x, y, '#2a2e3c');
  img.rect(11, 15, 18, 18, '#5a3b26'); img.rect(12, 16, 16, 17, '#1d1620'); img.rect(14, 18, 12, 15, '#2a2030');
  img.rect(10, 15, 2, 18, '#7a5030'); img.rect(28, 15, 2, 18, '#5a3a24'); img.rect(10, 14, 20, 3, '#8a5c34'); img.rect(14, 24, 12, 2, '#6a4628');
  for (let x = 12; x < 28; x += 4) img.rect(x, 26, 2, 7, '#4a331f');
  img.rect(3, 30, 34, 4, '#6a4a38'); img.rect(3, 30, 34, 1, '#8a644c');
  return img.done();
}
export function makeCrop() {
  const img = new Img(16, 16);
  [[8, 9, 7], [4, 11, 4], [12, 11, 4]].forEach(([cx, cy, rr]) => { for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, y); if (d <= rr) img.set(cx + x, cy + y, d > rr - 1 ? '#1b4a58' : y < -1 && x < 1 ? '#7fe0d8' : y < 1 ? '#3fb4c0' : '#2d8a9c'); } });
  img.rect(6, 5, 4, 2, '#b8f0e8');
  return img.done();
}
export function makeSeat() {
  const img = new Img(18, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 18; x++) { const d = Math.hypot((x - 8.5) / 9, (y - 4.5) / 5.2); if (d < 1 && y < 9) img.set(x, y, d > 0.8 ? '#6a4228' : y < 5 ? '#e8c47c' : '#c99a5a'); }
  img.rect(3, 9, 12, 3, '#6a4228'); img.rect(4, 9, 10, 2, '#8a5a34');
  for (let i = 0; i < 6; i++) img.set(5 + i, 3 + (i % 2), '#b88a4a');
  return img.done();
}
