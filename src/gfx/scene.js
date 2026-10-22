import { C } from './palette.js';
import { PLAYER, NPC, drawMap, CH_PAL } from './sprites.js';
import { S } from '../game/state.js';
import { N, TW, TH, LAKE, HOUSE, MILL, NPC as NPCW, SEATS, TREES, BUSHES, P, sx, sy, lakeR, kindAt } from '../game/world.js';

const cv = document.getElementById('scene');
const g = cv.getContext('2d');
export const view = { W: 400, H: 225 };
let t = 0;
const cam = { x: 0, y: 0, snap: true };

export function resizeScene(W, H) { view.W = cv.width = W; view.H = cv.height = H; cam.snap = true; }

const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rect = (q, c, x, y, w, h) => { q.fillStyle = c; q.fillRect(Math.round(x), Math.round(y), w, h); };
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

/* 2:1 diamond, drawn row by row so edges stay pixel-exact (no anti-aliasing) */
function diamond(q, c, cx, top, w, h) {
  q.fillStyle = c; const half = h / 2, k = w / h;
  for (let j = 0; j < h; j++) { const ww = (j < half ? j + 1 : h - j) * k; q.fillRect(Math.round(cx - ww), top + j, Math.round(ww * 2), 1); }
}
function disc(q, c, cx, cy, r) {
  q.fillStyle = c;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + 0.5)); q.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
/* iso box: front-bottom corner at (fx,fy); each visible face is L px wide */
function box(q, fx, fy, L, h, cL, cR, cT) {
  for (let i = 0; i < L; i++) {
    rect(q, cL, fx - L + i, fy - h - (L >> 1) + (i >> 1), 1, h);
    rect(q, cR, fx + i, fy - h - (i >> 1), 1, h);
  }
  diamond(q, cT, fx, fy - h - L, L * 2, L);
}
const faceL = (q, c, x0, y0, i0, w, h, yo = 0) => { for (let i = i0; i < i0 + w; i++) rect(q, c, x0 + i, y0 + (i >> 1) + yo, 1, h); };
const faceR = (q, c, x0, y0, i0, w, h, yo = 0) => { for (let i = i0; i < i0 + w; i++) rect(q, c, x0 + i, y0 - (i >> 1) + yo, 1, h); };

/* ---------------------------- static ground layer ---------------------------- */
let ground;
const WATER = [];                                              // water tiles, for animation
function buildGround() {
  ground = mkc(N * TW, N * TH); const q = ground.getContext('2d'), r = rng(11);
  rect(q, C.greenD, 0, 0, ground.width, ground.height);
  const land = (i, j) => kindAt(i, j) !== 'water';
  const specks = (cx, top, list) => list.forEach(([col, n]) => { for (let k = 0; k < n; k++) {
    const dx = ((r() * 20) | 0) - 10, dy = 1 + ((r() * 10) | 0);
    if (Math.abs(dx) / 12 + Math.abs(dy - 5.5) / 6 < 0.85) rect(q, col, cx + dx, top + dy, r() > 0.6 ? 2 : 1, 1);
  } });
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const kind = kindAt(i, j), cx = sx(i + 0.5, j + 0.5), top = sy(i, j);
    if (kind === 'grass') {
      diamond(q, (i + j) % 7 === 0 ? C.green : C.greenM, cx, top, TW, TH);
      specks(cx, top, [[C.green, 5], [C.greenD, 3]]);
      if (r() < 0.07) { const fx = cx + ((r() * 10) | 0) - 5, fy = top + 4 + ((r() * 3) | 0), col = [C.white, C.pink, C.gold, C.red][(r() * 4) | 0];
        rect(q, col, fx, fy, 1, 1); rect(q, col, fx - 1, fy + 1, 1, 1); rect(q, col, fx + 1, fy + 1, 1, 1); rect(q, col, fx, fy + 2, 1, 1); rect(q, C.gold, fx, fy + 1, 1, 1); }
    } else if (kind === 'sand') {
      diamond(q, C.woodL, cx, top, TW, TH); specks(cx, top, [[C.wood, 5], [C.white, 2]]);
    } else if (kind === 'path') {
      diamond(q, C.wood, cx, top, TW, TH); specks(cx, top, [[C.woodL, 5], [C.woodD, 4]]);
    } else {
      diamond(q, C.water, cx, top, TW, TH); WATER.push({ cx, top, h: (i * 7 + j * 13) % 17 });
      const rim = (side, col) => { for (let k = 0; k < 6; k++) {
        if (side === 'tl') rect(q, col, cx - (k + 1) * 2, top + k, 2, 1);
        if (side === 'tr') rect(q, col, cx + (k + 1) * 2 - 2, top + k, 2, 1);
        if (side === 'bl') rect(q, col, cx - (6 - k) * 2, top + 6 + k, 2, 1);
        if (side === 'br') rect(q, col, cx + (6 - k) * 2 - 2, top + 6 + k, 2, 1); } };
      if (land(i - 1, j)) { rim('tl', C.waterD); rim('tl', C.waterD); }
      if (land(i, j - 1)) rim('tr', C.waterD);
      if (land(i, j + 1)) rim('bl', C.waterL);
      if (land(i + 1, j)) rim('br', C.waterL);
    }
  }
}

/* ------------------------------ object sprites ------------------------------ */
const SPR = {};
function tree(v) {
  const c = mkc(40, 50), q = c.getContext('2d');
  rect(q, C.navy, 17, 36, 7, 14); rect(q, C.woodD, 18, 36, 5, 13); rect(q, C.wood, 18, 36, 2, 13);
  if (v === 2) {                                                    // pine
    for (let i = 0; i < 4; i++) { const w = 8 + i * 6, y = 4 + i * 8;
      rect(q, C.navy, 20 - w / 2 - 1, y, w + 2, 11); rect(q, i % 2 ? C.greenM : C.green, 20 - w / 2, y + 1, w, 9); rect(q, C.greenD, 20, y + 1, w / 2, 9); }
    return c;
  }
  const s = v ? 6 : 8, blobs = [[-7, 20, s], [7, 20, s], [0, 12, s + 2], [-3, 24, s - 1], [4, 25, s - 1]];
  blobs.forEach(([dx, y, r]) => disc(q, C.navy, 20 + dx, y, r + 1));
  blobs.forEach(([dx, y, r]) => disc(q, C.greenD, 20 + dx + 1, y + 2, r));
  blobs.forEach(([dx, y, r]) => disc(q, C.greenM, 20 + dx, y, r - 1));
  blobs.slice(0, 3).forEach(([dx, y, r]) => disc(q, C.green, 20 + dx - 2, y - 3, Math.max(2, r - 5)));
  return c;
}
function bush(v) {
  const c = mkc(16, 12), q = c.getContext('2d');
  [[5, 7, 4], [10, 7, 4], [8, 5, 4]].forEach(([x, y, r]) => disc(q, C.navy, x, y, r + 1));
  [[5, 7, 4], [10, 7, 4], [8, 5, 4]].forEach(([x, y, r]) => disc(q, C.greenM, x, y, r));
  disc(q, C.green, 7, 4, 2); if (v) { rect(q, C.pink, 10, 6, 2, 2); rect(q, C.white, 4, 7, 1, 1); } else rect(q, C.red, 11, 5, 2, 2);
  return c;
}
const STUMP = ['................', '....oooooooo....', '..ooLLLLLLLLoo..', '.oLLLLwwwwLLLLo.', '.oLLwwLLLLwwLLo.', '..ooLLwwwwLLoo..', '...oDDDDDDDDo...', '...oDDDDDDDDo...', '...oDDDDDDDDo...', '....oooooooo....'];
function stump() {
  const c = mkc(16, 10), q = c.getContext('2d');
  drawMap(q, STUMP, 0, 0, { o: C.navy, L: C.woodL, w: C.wood, D: C.woodD }); return c;
}
function house() {
  const c = mkc(90, 84), q = c.getContext('2d'), fx = 45, fy = 78, L = 36, h = 22;
  box(q, fx, fy, L, h, C.woodL, C.wood, C.wood);
  for (let k = 5; k < h; k += 5) { faceL(q, C.wood, fx - L, fy - h - (L >> 1), 0, L, 1, k); faceR(q, C.woodD, fx, fy - h, 0, L, 1, k); }
  const FLX = fx - L, FLY = fy - h - (L >> 1), FRY = fy - h;
  faceL(q, C.navy, FLX, FLY, 9, 12, 12, 5); faceL(q, C.waterL, FLX, FLY, 10, 10, 10, 6); faceL(q, C.white, FLX, FLY, 10, 2, 3, 6);
  faceL(q, C.navy, FLX, FLY, 24, 8, 12, 5); faceL(q, C.waterL, FLX, FLY, 25, 6, 10, 6);
  faceR(q, C.navy, fx, FRY, 6, 12, 18, 4); faceR(q, C.woodD, fx, FRY, 7, 10, 17, 5); faceR(q, C.gold, fx, FRY, 15, 1, 2, 14 + 4);
  faceR(q, C.navy, fx, FRY, 22, 10, 11, 5); faceR(q, C.waterL, fx, FRY, 23, 8, 9, 6);
  for (let k = 0; k < 6; k++) {                                       // hip roof: stacked shrinking diamonds, two shades
    const w = 88 - k * 14, top = 38 - k * 3 - w / 4 - 1;
    diamond(q, C.navy, fx, top - 1, w + 4, w / 2 + 2);
    diamond(q, k % 2 ? C.violetL : C.violet, fx, top, w, w / 2);
    // left half darker
    for (let j = 0; j < w / 2; j++) { const half = j < w / 4 ? (j + 1) * 2 : (w / 2 - j) * 2; rect(q, k % 2 ? C.violet : C.violetD, fx - half, top + j, half, 1); }
  }
  rect(q, C.navy, 64, 16, 8, 14); rect(q, C.greyD, 65, 17, 6, 12); rect(q, C.greyL, 65, 17, 2, 12); rect(q, C.navy, 63, 14, 10, 3); rect(q, C.greyL, 64, 15, 8, 1);
  return c;
}
function mill() {
  const c = mkc(60, 80), q = c.getContext('2d'), fx = 30;
  box(q, fx, 76, 26, 18, C.cloud, C.greyL, C.cloud);
  box(q, fx, 58, 22, 14, C.cloud, C.greyL, C.cloud);
  box(q, fx, 44, 18, 8, C.cloud, C.greyL, C.cloud);
  faceR(q, C.navy, fx, 76 - 18, 6, 9, 14, 4); faceR(q, C.woodD, fx, 76 - 18, 7, 7, 13, 5);
  faceL(q, C.navy, fx - 22, 58 - 14 - 11, 6, 8, 8, 2); faceL(q, C.waterL, fx - 22, 58 - 14 - 11, 7, 6, 6, 3);
  for (let k = 0; k < 4; k++) {                                       // cap
    const w = 28 - k * 7, top = 18 - k * 3;
    diamond(q, C.navy, fx, top - 1, w + 4, w / 2 + 2); diamond(q, k % 2 ? C.violet : C.violetD, fx, top, w, w / 2);
  }
  return c;
}
function blades(q, hx, hy, a) {
  for (let b = 0; b < 4; b++) {
    const ang = a + (b * Math.PI) / 2, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let r = 3; r <= 24; r++) {
      const x = hx + ca * r, y = hy + sa * r * 0.8;
      rect(q, C.navy, x - 1, y - 1, 3, 3); }
    for (let r = 3; r <= 24; r++) {
      const x = hx + ca * r, y = hy + sa * r * 0.8;
      rect(q, r > 8 ? C.cloud : C.woodD, x, y, 2, 2);
      if (r > 9) rect(q, C.white, x - sa * 3, y + ca * 2.4, 2, 2); }
  }
  rect(q, C.navy, hx - 3, hy - 3, 6, 6); rect(q, C.gold, hx - 2, hy - 2, 4, 4);
}

/* -------------------------------- frame -------------------------------- */
const Z = [];                                                         // sorted drawables
function line(c, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let i = 0; i <= n; i++) rect(g, c, x0 + ((x1 - x0) * i) / (n || 1), y0 + ((y1 - y0) * i) / (n || 1), 1, 1);
}
const WALK_B = ['....oBBooBBo....', '.....oBBBBo.....', '.....oNNNNo.....', '....onNNNNn.....', '....oooooooo....'];

export function draw(dt) {
  if (!ground) { buildGround(); SPR.t = [tree(0), tree(1), tree(2)]; SPR.b = [bush(0), bush(1)]; SPR.s = stump(); SPR.h = house(); SPR.m = mill(); }
  t += dt;
  const { W, H } = view, seated = S.seat !== null;
  const seat = seated ? SEATS[S.seat] : null;

  /* camera: follow the player, lean toward the lake while fishing */
  let tx = sx(P.x, P.y), ty = sy(P.x, P.y) - 10;
  if (seated) { tx += (sx(LAKE.x, LAKE.y) - tx) * 0.22; ty += (sy(LAKE.x, LAKE.y) - ty) * 0.22 + 14; }
  const goalX = tx - W / 2, goalY = ty - H / 2;
  const mw = N * TW, mh = N * TH;
  const cl = (v, lo, hi, size, full) => (full <= size ? (full - size) / 2 : Math.max(lo, Math.min(hi, v)));
  const gx = cl(goalX, 0, mw - W, W, mw), gy = cl(goalY, 0, mh - H, H, mh);
  if (cam.snap) { cam.x = gx; cam.y = gy; cam.snap = false; } else { const k = Math.min(1, dt * 5); cam.x += (gx - cam.x) * k; cam.y += (gy - cam.y) * k; }
  const cx = Math.round(cam.x), cy = Math.round(cam.y);
  const X = (wx, wy) => Math.round(sx(wx, wy)) - cx, Y = (wx, wy) => Math.round(sy(wx, wy)) - cy;

  rect(g, C.greenD, 0, 0, W, H);
  g.drawImage(ground, -cx, -cy);

  /* water life */
  WATER.forEach((w) => {
    const ph = (t * 1.4 + w.h * 0.37) % 4;
    if (ph < 1) rect(g, C.waterL, w.cx - cx - 3 + w.h % 5, w.top - cy + 4 + (w.h % 3), 4, 1);
    else if (ph > 2.6 && ph < 3.2) rect(g, C.waterD, w.cx - cx - 5 + (w.h % 7), w.top - cy + 7, 5, 1);
  });
  [[0.3, 0.2], [-0.4, 0.5], [0.6, -0.3], [-0.2, -0.5], [0.1, 0.65]].forEach(([a, b], i) => {                 // lily pads
    const x = X(LAKE.x + a * LAKE.rx * 0.8, LAKE.y + b * LAKE.ry * 0.8), y = Y(LAKE.x + a * LAKE.rx * 0.8, LAKE.y + b * LAKE.ry * 0.8) + Math.round(Math.sin(t * 1.5 + i));
    rect(g, C.navy, x - 4, y, 9, 4); rect(g, C.greenM, x - 3, y, 7, 3); rect(g, C.green, x - 2, y, 3, 1); if (i % 2) { rect(g, C.pink, x + 1, y - 1, 2, 2); }
  });

  /* depth-sorted scene objects */
  Z.length = 0;
  TREES.forEach((o) => Z.push({ d: o.x + o.y, f: () => g.drawImage(SPR.t[o.v], X(o.x, o.y) - 20, Y(o.x, o.y) - 47) }));
  BUSHES.forEach((o) => Z.push({ d: o.x + o.y, f: () => g.drawImage(SPR.b[o.v], X(o.x, o.y) - 8, Y(o.x, o.y) - 10) }));
  Z.push({ d: HOUSE.x + HOUSE.w / 2 + HOUSE.y + HOUSE.d / 2, f: () => {
    const fx = X(HOUSE.x + HOUSE.w, HOUSE.y + HOUSE.d), fy = Y(HOUSE.x + HOUSE.w, HOUSE.y + HOUSE.d);
    g.drawImage(SPR.h, fx - 45, fy - 78);
    for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4) % 1; g.globalAlpha = 1 - k; rect(g, C.cloud, fx + 22 + Math.sin(k * 6 + i) * 3, fy - 86 - k * 22, 3, 3); }
    g.globalAlpha = 1;
  } });
  Z.push({ d: MILL.x + MILL.w / 2 + MILL.y + MILL.d / 2, f: () => {
    const fx = X(MILL.x + MILL.w, MILL.y + MILL.d), fy = Y(MILL.x + MILL.w, MILL.y + MILL.d);
    g.drawImage(SPR.m, fx - 30, fy - 76);
    blades(g, fx + 2, fy - 52, t * 0.9);
  } });
  SEATS.forEach((s) => Z.push({ d: s.x + s.y, f: () => {
    const x = X(s.x, s.y), y = Y(s.x, s.y);
    g.drawImage(SPR.s, x - 8, y - 6);
    if (S.near === s.i && !seated) {                                   // bouncing arrow over the closest free seat
      const b = Math.round(Math.sin(t * 6) * 1.5), ay = y - 22 + b;
      [[7, 0], [5, 1], [3, 2], [1, 3]].forEach(([w, j]) => { rect(g, C.navy, x - (w >> 1) - 1, ay + j * 1 - 0, w + 2, 1); });
      rect(g, C.navy, x - 4, ay - 1, 9, 1); rect(g, C.lime, x - 3, ay, 7, 1); rect(g, C.lime, x - 2, ay + 1, 5, 1); rect(g, C.lime, x - 1, ay + 2, 3, 1); rect(g, C.navy, x - 1, ay + 3, 3, 1); rect(g, C.lime, x, ay + 3, 1, 1);
    }
  } }));
  Z.push({ d: NPCW.x + NPCW.y + 0.01, f: () => {                        // Old Finn
    const x = X(NPCW.x, NPCW.y), y = Y(NPCW.x, NPCW.y), b = Math.sin(t * 2.2) > 0.6 ? -1 : 0;
    g.globalAlpha = 0.3; rect(g, C.navy, x - 7, y - 1, 14, 3); g.globalAlpha = 1;
    drawMap(g, NPC, x - 8, y - 21 + b, CH_PAL, sx(P.x, P.y) < sx(NPCW.x, NPCW.y));
    S._npl = { x, y: y - 28 };
    if (S.nearNpc && !seated) {
      const ay = y - 34 + Math.round(Math.sin(t * 6) * 1.5);
      rect(g, C.navy, x - 4, ay - 1, 9, 1); rect(g, C.lime, x - 3, ay, 7, 1); rect(g, C.lime, x - 2, ay + 1, 5, 1); rect(g, C.lime, x - 1, ay + 2, 3, 1); rect(g, C.navy, x - 1, ay + 3, 3, 1); rect(g, C.lime, x, ay + 3, 1, 1);
    }
  } });
  Z.push({ d: P.x + P.y + 0.01, f: () => drawPlayer(X, Y, seat) });
  Z.sort((a, b) => a.d - b.d).forEach((o) => o.f());
}

function drawPlayer(X, Y, seat) {
  const px = X(P.x, P.y), py = Y(P.x, P.y);
  g.globalAlpha = 0.3; rect(g, C.navy, px - 7, py - 1, 14, 3); g.globalAlpha = 1;
  S._pl = { x: px, y: py - (seat ? 24 : 28) };
  if (!seat) {
    S._bob = null;
    const step = P.moving && ((P.anim * 8) | 0) % 2 === 1, bob = P.moving && !step ? -1 : 0;
    const rows = step ? PLAYER.slice(0, 17).concat(WALK_B.map((r) => r.padEnd(16, '.').slice(0, 16)), ['................', '................']).slice(0, 24) : PLAYER;
    drawMap(g, rows, px - 8, py - 21 + bob, CH_PAL, P.flip);
    return;
  }
  /* seated: torso on top of the stump, rod toward the lake */
  const wx = seat.fx - seat.fy, wy = (seat.fx + seat.fy) / 2, l = Math.hypot(wx, wy), vx = wx / l, vy = wy / l;
  const y0 = py - 20, hx = px + (vx > 0 ? 5 : -5), hy = y0 + 12;
  const ph = S.phase, wiggle = ph === 'reeling' ? Math.round(Math.sin(t * 30)) : 0;
  const reach = ph === 'charging' ? -6 : 20, lift = ph === 'charging' ? 18 : ph === 'reeling' ? 13 : 11;
  const tipX = Math.round(hx + vx * reach + wiggle), tipY = Math.round(hy + vy * reach * 0.5 - lift + (ph === 'reeling' ? Math.abs(wiggle) : 0));
  drawMap(g, PLAYER.slice(0, 16), px - 8, y0, CH_PAL, vx < 0);
  line(C.woodD, hx, hy, tipX, tipY); line(C.navy, hx, hy + 1, tipX, tipY + 1);
  rect(g, C.woodL, hx - 1, hy - 1, 2, 2);
  if (['waiting', 'bite', 'reeling'].includes(ph) && S.cast) {
    const d = 2.5 + S.cast.p * 6.5, bx = seat.x + seat.fx * d, by = seat.y + seat.fy * d;
    const tX = X(bx, by), tY = Y(bx, by);
    const bobY = tY + (ph === 'bite' ? Math.round(Math.sin(t * 28) * 2) : Math.round(Math.sin(t * 3)));
    const taut = ph === 'reeling';
    for (let i = 0; i <= 44; i++) { const f = i / 44, x = tipX + (tX - tipX) * f, sag = taut ? 0 : Math.sin(f * Math.PI) * 10;
      rect(g, C.white, x, tipY + (bobY - tipY) * f + sag, 1, 1); }
    const k = (t * 2) % 1;
    g.strokeStyle = C.white; g.globalAlpha = 1 - k; g.strokeRect(tX - 4 - k * 6 + 0.5, bobY + 3 - k * 2 + 0.5, 8 + k * 12, 2 + k * 4); g.globalAlpha = 1;
    rect(g, C.navy, tX - 2, bobY - 3, 5, 7); rect(g, C.red, tX - 1, bobY - 2, 3, 2); rect(g, C.white, tX - 1, bobY, 3, 3);
    if (taut) for (let i = 0; i < 5; i++) rect(g, C.white, tX + ((Math.sin(t * 20 + i * 2) * 8) | 0), bobY + 2 - ((t * 30 + i * 5) % 8 | 0), 1, 1);
    S._bob = { x: tX, y: bobY };
  } else S._bob = null;
}
