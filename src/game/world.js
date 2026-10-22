import { S, emit } from './state.js';

/* Isometric 2:1 world. Tile (i,j) covers world [i,i+1]x[j,j+1]. +x = screen right-down, +y = screen left-down. */
export const N = 28, TW = 24, TH = 12;
export const LAKE = { x: 14, y: 14, rx: 6.5, ry: 5.2 };
export const HOUSE = { x: 3, y: 3, w: 3, d: 3 };
export const MILL = { x: 21, y: 3, w: 2, d: 2 };
export const NPC = { x: 7.1, y: 6.3 };               // Old Finn, next to the house

export const sx = (wx, wy) => ((wx - wy) * TW) / 2 + (N * TW) / 2;
export const sy = (wx, wy) => ((wx + wy) * TH) / 2;
export const lakeR = (wx, wy) => Math.hypot((wx - LAKE.x) / LAKE.rx, (wy - LAKE.y) / LAKE.ry);
const ringPt = (deg, r = 1.33) => {
  const a = (deg * Math.PI) / 180;
  return [LAKE.x + Math.cos(a) * LAKE.rx * r, LAKE.y + Math.sin(a) * LAKE.ry * r];
};

/* ---- 16 seats around the lake, each faces the water ---- */
export const SEATS = Array.from({ length: 16 }, (_, i) => {
  const [x, y] = ringPt(i * 22.5);
  const fx = LAKE.x - x, fy = LAKE.y - y, l = Math.hypot(fx, fy);
  return { i, x, y, fx: fx / l, fy: fy / l };
});

/* ---- paths ---- */
const PATHS = [
  [[6.6, 6.6], ringPt(225, 1.3)], [[23.6, 5.6], ringPt(315, 1.3)],
  [ringPt(45, 1.3), [25.5, 25.5]], [ringPt(180, 1.3), [1.2, 14]],
];
function segDist(px, py, [[ax, ay], [bx, by]]) {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
export const pathDist = (x, y) => Math.min(...PATHS.map((s) => segDist(x, y, s)));

export function kindAt(i, j) {
  if (i < 0 || j < 0 || i >= N || j >= N) return 'grass';
  const x = i + 0.5, y = j + 0.5, r = lakeR(x, y);
  if (r < 1) return 'water';
  if (r < 1.15) return 'sand';
  if (r < 1.52 || pathDist(x, y) < 0.8) return 'path';
  return 'grass';
}

/* ---- scenery ---- */
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const inRect = (o, x, y, m) => x > o.x - m && x < o.x + o.w + m && y > o.y - m && y < o.y + o.d + m;
export const TREES = [], BUSHES = [];
(function scatter() {
  const r = rng(42), ok = (x, y, gap) => x > 0.7 && y > 0.7 && x < N - 0.7 && y < N - 0.7 && lakeR(x, y) > 1.75 &&
    !inRect(HOUSE, x, y, 1.3) && !inRect(MILL, x, y, 1.3) && pathDist(x, y) > 1.3 && TREES.every((t) => Math.hypot(t.x - x, t.y - y) > gap);
  for (let k = 0; k < 40; k++) { const t = k / 40 * (N - 2) + 1;       // dense border
    [[t, 0.9], [t, N - 0.9], [0.9, t], [N - 0.9, t]].forEach(([x, y]) => { x += (r() - 0.5) * 0.8; y += (r() - 0.5) * 0.8; if (ok(x, y, 1.5)) TREES.push({ x, y, v: (r() * 3) | 0 }); });
  }
  for (let k = 0; k < 600 && TREES.length < 110; k++) { const x = 1 + r() * (N - 2), y = 1 + r() * (N - 2); if (ok(x, y, 1.7)) TREES.push({ x, y, v: (r() * 3) | 0 }); }
  for (let k = 0; k < 400 && BUSHES.length < 26; k++) { const x = 1 + r() * (N - 2), y = 1 + r() * (N - 2);
    if (lakeR(x, y) > 1.65 && !inRect(HOUSE, x, y, 0.8) && !inRect(MILL, x, y, 0.8) && pathDist(x, y) > 1.1 && TREES.every((t) => Math.hypot(t.x - x, t.y - y) > 0.9)) BUSHES.push({ x, y, v: (r() * 2) | 0 }); }
})();

export function blocked(x, y) {
  if (x < 0.6 || y < 0.6 || x > N - 0.6 || y > N - 0.6) return true;
  if (lakeR(x, y) < 1.07) return true;
  if (inRect(HOUSE, x, y, 0.3) || inRect(MILL, x, y, 0.3)) return true;
  if (Math.hypot(NPC.x - x, NPC.y - y) < 0.55) return true;
  return TREES.some((t) => Math.hypot(t.x - x, t.y - y) < 0.4);
}

/* ---- player ---- */
export const P = { x: 7.8, y: 7.9, flip: false, moving: false, anim: 0 };
export const keys = new Set();
const SPEED = 62;                                   // screen px / second

export function updateWorld(dt) {
  if (S.seat !== null) { S.near = null; S.nearNpc = false; P.moving = false; return; }
  let ix = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), iy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  if (S.windows.length) ix = iy = 0;
  P.moving = !!(ix || iy);
  if (P.moving) {
    const l = Math.hypot(ix, iy), vx = (ix / l) * SPEED * dt, vy = (iy / l) * SPEED * dt;
    const dx = vx / TW + vy / TH, dy = vy / TH - vx / TW;
    if (!blocked(P.x + dx, P.y)) P.x += dx;
    if (!blocked(P.x, P.y + dy)) P.y += dy;
    if (vx) P.flip = vx < 0;
    P.anim += dt;
  }
  let best = null, bd = 1.45;
  for (const s of SEATS) { const d = Math.hypot(s.x - P.x, s.y - P.y); if (d < bd) { bd = d; best = s.i; } }
  const nd = Math.hypot(NPC.x - P.x, NPC.y - P.y);
  S.nearNpc = nd < 1.7 && nd < bd;
  S.near = S.nearNpc ? null : best;
}

export function sit(i) {
  const s = SEATS[i];
  P.x = s.x; P.y = s.y; S.seat = i; S.near = null; keys.clear(); P.moving = false;
  P.flip = (s.fx - s.fy) < 0;
  emit('seat', i);
}
export function stand(force = false) {
  if (S.seat === null) return false;
  if (!force && S.phase !== 'idle') return false;
  const s = SEATS[S.seat];
  P.x = s.x - s.fx * 0.6; P.y = s.y - s.fy * 0.6; S.seat = null;
  emit('seat', null);
  return true;
}
