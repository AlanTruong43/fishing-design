import { S, emit } from './state.js';

/* Top-down 3/4 world. 1 world unit = 1 tile = TS screen px. */
export const NW = 48, NH = 34, TS = 16, SKY = 4;
export const LAKE = { x: 24, y: 23, rx: 5.6, ry: 3.7 };
export const HOUSE = { x: 20.2, y: 8, w: 5.6, d: 2.2 };           // footprint of the lower walls (roof draws above)
export const FARM = { x: 3, y: 10, w: 8, d: 6 };
export const CAVES = [];
export const BENCH = { x: 6, y: 6.2, w: 2.6, d: 1.3 };
export const NPC = { x: 27.2, y: 11.6 };                           // Old Finn, beside the front door

export const lakeR = (wx, wy) => Math.hypot((wx - LAKE.x) / LAKE.rx, (wy - LAKE.y) / LAKE.ry);
/* organic outline: wobble the radius so the pond is not a perfect ellipse */
export const lakeShape = (wx, wy) => {
  const a = Math.atan2((wy - LAKE.y) / LAKE.ry, (wx - LAKE.x) / LAKE.rx);
  return lakeR(wx, wy) / (1 + 0.07 * Math.sin(a * 3 + 1) + 0.045 * Math.sin(a * 5 + 2));
};
const ringPt = (deg, r = 1.36) => {
  const a = (deg * Math.PI) / 180;
  return [LAKE.x + Math.cos(a) * LAKE.rx * r, LAKE.y + Math.sin(a) * LAKE.ry * r];
};

/* ---- 16 seats around the lake, each faces the water ---- */
export const SEATS = Array.from({ length: 16 }, (_, i) => {
  const [x, y] = ringPt(i * 22.5);
  const fx = LAKE.x - x, fy = LAKE.y - y, l = Math.hypot(fx, fy);
  return { i, x, y, fx: fx / l, fy: fy / l };
});

/* ---- cobble paths ---- */
const PATHS = [[[22.9, 10.6], [24, 18.9]], [[22.9, 10.6], [27.2, 11.9]]];
function segDist(px, py, [[ax, ay], [bx, by]]) {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
export const pathDist = (x, y) => Math.min(...PATHS.map((s) => segDist(x, y, s)));

/* ---- scenery ---- */
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const inRect = (o, x, y, m) => x > o.x - m && x < o.x + o.w + m && y > o.y - m && y < o.y + o.d + m;
const SOLIDS = [HOUSE, BENCH];
export const TREES = [], BUSHES = [], TUFTS = [];
(function scatter() {
  const r = rng(77);
  const ok = (x, y, gap) => x > 0.8 && x < NW - 0.8 && y > SKY - 0.4 && y < NH - 0.8 && lakeShape(x, y) > 2.3 && !(x > 17 && x < 31 && y > 9 && y < 21) &&
    SOLIDS.every((o) => !inRect(o, x, y, 1.1)) && pathDist(x, y) > 2.4 && Math.hypot(x - NPC.x, y - NPC.y) > 1.6 && TREES.every((t) => Math.hypot(t.x - x, (t.y - y) * 1.15) > gap);
  for (let k = 0; k < 44; k++) {                                       // dense tree line along the sky + side borders
    const t = (k / 44) * (NW - 2) + 1;
    [[t, SKY + 0.2], [t, NH - 0.9], [0.9, SKY + 1 + (k / 44) * (NH - SKY - 2)], [NW - 0.9, SKY + 1 + (k / 44) * (NH - SKY - 2)]].forEach(([x, y]) => {
      x += (r() - 0.5) * 1.2; y += (r() - 0.5) * 1.2; if (ok(x, y, 3.0)) TREES.push({ x, y, v: (r() * 5) | 0 }); });
  }
  for (let k = 0; k < 900 && TREES.length < 62; k++) { const x = 1 + r() * (NW - 2), y = SKY + r() * (NH - SKY - 1); if (ok(x, y, 4.2)) TREES.push({ x, y, v: (r() * 5) | 0 }); }
  for (let k = 0; k < 500 && BUSHES.length < 30; k++) { const x = 1 + r() * (NW - 2), y = SKY + 1 + r() * (NH - SKY - 2);
    if (lakeShape(x, y) > 1.6 && SOLIDS.every((o) => !inRect(o, x, y, 0.7)) && pathDist(x, y) > 1.1 && TREES.every((t) => Math.hypot(t.x - x, t.y - y) > 1.2)) BUSHES.push({ x, y, v: (r() * 3) | 0 }); }
  for (let k = 0; k < 120; k++) { const x = 1 + r() * (NW - 2), y = SKY + 1 + r() * (NH - SKY - 2);
    if (lakeShape(x, y) > 1.55 && SOLIDS.every((o) => !inRect(o, x, y, 0.3)) && pathDist(x, y) > 0.9) TUFTS.push({ x, y, v: (r() * 4) | 0 }); }
})();

export function blocked(x, y) {
  if (x < 0.6 || y < SKY + 0.6 || x > NW - 0.6 || y > NH - 0.6) return true;
  if (lakeShape(x, y) < 1.1) return true;
  if (SOLIDS.some((o) => inRect(o, x, y, 0.15))) return true;
  if (Math.hypot(NPC.x - x, NPC.y - y) < 0.55) return true;
  return TREES.some((t) => Math.hypot(t.x - x, (t.y - y) * 1.4) < 0.45);
}

/* ---- player ---- */
export const P = { x: 24.4, y: 13.2, flip: false, moving: false, anim: 0, dir: 'down' };
export const keys = new Set();
const SPEED = 62;                                   // screen px / second

export function updateWorld(dt) {
  if (S.seat !== null) { S.near = null; S.nearNpc = false; P.moving = false; return; }
  let ix = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), iy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  if (S.windows.length) ix = iy = 0;
  P.moving = !!(ix || iy);
  if (P.moving) {
    const l = Math.hypot(ix, iy), dx = ((ix / l) * SPEED * dt) / TS, dy = ((iy / l) * SPEED * dt) / TS;
    if (!blocked(P.x + dx, P.y)) P.x += dx;
    if (!blocked(P.x, P.y + dy)) P.y += dy;
    if (ix) P.flip = ix < 0;
    P.dir = iy ? (iy < 0 ? 'up' : 'down') : 'side';
    P.anim += dt;
  }
  let best = null, bd = 1.7;
  for (const s of SEATS) { const d = Math.hypot(s.x - P.x, s.y - P.y); if (d < bd) { bd = d; best = s.i; } }
  const nd = Math.hypot(NPC.x - P.x, NPC.y - P.y);
  S.nearNpc = nd < 1.9 && nd < bd;
  S.near = S.nearNpc ? null : best;
}

export function sit(i) {
  const s = SEATS[i];
  P.x = s.x; P.y = s.y; S.seat = i; S.near = null; keys.clear(); P.moving = false;
  P.flip = s.fx < 0;
  emit('seat', i);
}
export function stand(force = false) {
  if (S.seat === null) return false;
  if (!force && S.phase !== 'idle') return false;
  const s = SEATS[S.seat];
  P.x = s.x - s.fx * 0.8; P.y = s.y - s.fy * 0.8; S.seat = null;
  emit('seat', null);
  return true;
}
