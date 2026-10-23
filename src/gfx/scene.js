import { C } from './palette.js';
import { PLAYER, PLAYER_LEGS_B, NPC, PL_PAL, NPC_PAL, drawMap } from './sprites.js';
import { Img, makeTree, makeBush, makeTuft, makeStone, makeBench, makeLogs, makeCloud, makeHouse, makeCave, makeCrop, makeSeat, vnoise } from './art.js';
import { S } from '../game/state.js';
import { NW, NH, TS, SKY, LAKE, HOUSE, FARM, CAVES, BENCH, NPC as NPCW, SEATS, TREES, BUSHES, TUFTS, P, lakeShape, pathDist } from '../game/world.js';

const cv = document.getElementById('scene');
const g = cv.getContext('2d');
export const view = { W: 400, H: 225 };
let t = 0;
const cam = { x: 0, y: 0, snap: true };

export function resizeScene(W, H) { view.W = cv.width = W; view.H = cv.height = H; cam.snap = true; }

const rect = (q, c, x, y, w, h) => { q.fillStyle = c; q.fillRect(Math.round(x), Math.round(y), w, h); };
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const SKYC = '#5a24ee';
const GRASS = ['#3b9a3a', '#4aa930', '#5db82c', '#78cd3a'];

/* cream cobblestones: rows of rounded stones with dark seams */
function cobble(x, y) {
  const row = Math.floor(y / 5), xo = x + (row & 1) * 4, cx = Math.floor(xo / 8), lx = xo % 8, ly = y % 5;
  const h = hash(cx, row, 4);
  if (lx === 0 || ly === 4) return '#b8997a';
  if ((lx === 1 && ly === 0) || (lx === 7 && ly === 0)) return '#b8997a';
  return ly === 1 ? '#f6ead0' : ly === 3 ? (h > 0.5 ? '#d6bd96' : '#d0b58c') : h > 0.6 ? '#ecdcbc' : '#e6d3ae';
}
function rockRim(x, y) {
  const row = Math.floor(y / 3), cx = Math.floor((x + (row & 1) * 3) / 6), lx = (x + (row & 1) * 3) % 6, ly = y % 3, h = hash(cx, row, 8);
  if (lx === 0 || ly === 2) return '#3e2226';
  return h > 0.66 ? '#a65e4a' : h > 0.33 ? '#8a4a3c' : '#70392f';
}

/* ---------------------------- static ground layer ---------------------------- */
let ground; const WATER = [];
function buildGround() {
  const W = NW * TS, H = NH * TS, img = new Img(W, H);
  const skyEdge = (x) => SKY * TS + 4 + Math.round(vnoise(x / 9, 3, 2) * 7);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y < skyEdge(x)) { img.set(x, y, y > skyEdge(x) - 3 && y > SKY * TS - 4 ? '#4a1cd2' : SKYC); continue; }
    if (y < skyEdge(x) + 3) { img.set(x, y, '#2c7a38'); continue; }
    const wx = x / TS, wy = y / TS;
    /* grass base: big mowed patches + speckle */
    const n = vnoise(x / 26, y / 20, 1) * 0.65 + vnoise(x / 9, y / 7, 2) * 0.35;
    let col = n < 0.36 ? GRASS[0] : n < 0.58 ? GRASS[2] : GRASS[1];
    const hv = hash(x, y, 7);
    if (hv < 0.035) col = GRASS[3]; else if (hv < 0.06) col = GRASS[0];
    if (hash(x >> 2, y >> 2, 11) < 0.1 && ((x & 3) === 1 || (x & 3) === 2) && (y & 3) < 2) col = GRASS[0];   // little blade marks
    img.set(x, y, col);
    /* lake */
    const s = lakeShape(wx, wy);
    if (s < 1) {
      const above = lakeShape(wx, wy - 3 / TS) >= 1, above2 = lakeShape(wx, wy - 1.5 / TS) >= 1;
      let c = '#36adc4';
      if (vnoise(x / 5, y / 1.6, 5) > 0.72) c = '#4cc0d4';
      if (vnoise(x / 6, y / 2, 9) < 0.22) c = '#2e9ab4';
      if (above) c = '#278ba4';
      if (above2 && !above) c = '#2a93ab';
      if (lakeShape(wx, wy + 1.2 / TS) >= 1 && lakeShape(wx, wy + 3 / TS) >= 1) c = '#9ee6f0';
      img.set(x, y, c);
      if (hash(x, y, 3) < 0.012) WATER.push({ x, y, h: hash(x, y, 9) });
    } else if (s < 1.1) img.set(x, y, rockRim(x, y));
    else if (s < 1.18) img.set(x, y, hash(x, y, 2) < 0.5 ? '#2c7a34' : '#3a9a3a');
    else if (s > 1.2 && s < 1.5) {
      const edge = s < 1.25 || s > 1.45;
      img.set(x, y, edge && hash(x, y, 6) < 0.5 ? '#b8997a' : cobble(x, y));
    } else if (pathDist(wx, wy) < 0.95) img.set(x, y, cobble(x, y));
  }
  const q = img.done();
  ground = q;
}

/* ------------------------------ sprites ------------------------------ */
const SPR = {};
function buildSprites() {
  SPR.trees = [0, 1, 2, 3, 4].map((v) => [makeTree(v, 1 + v), makeTree(v, 40 + v * 3)]);
  SPR.bush = [0, 1, 2].map((v) => makeBush(v, 3 + v));
  SPR.tuft = [0, 1, 2, 3].map(makeTuft);
  SPR.stone = makeStone(); SPR.bench = makeBench(); SPR.logs = makeLogs(); SPR.cloud = makeCloud();
  SPR.house = makeHouse(); SPR.cave = makeCave(); SPR.seat = makeSeat();
}
const shadow = (x, y, w, h, a = 0.28) => { g.fillStyle = `rgba(14,40,40,${a})`; for (let j = -h; j <= h; j++) { const ww = Math.round(w * Math.sqrt(1 - (j * j) / (h * h + 0.01))); g.fillRect(Math.round(x - ww), Math.round(y + j), ww * 2, 1); } };

const Z = [];
function line(c, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let i = 0; i <= n; i++) rect(g, c, x0 + ((x1 - x0) * i) / (n || 1), y0 + ((y1 - y0) * i) / (n || 1), 1, 1);
}
const arrow = (x, ay) => { rect(g, C.navy, x - 4, ay - 1, 9, 1); rect(g, C.lime, x - 3, ay, 7, 1); rect(g, C.lime, x - 2, ay + 1, 5, 1); rect(g, C.lime, x - 1, ay + 2, 3, 1); rect(g, C.navy, x - 1, ay + 3, 3, 1); rect(g, C.lime, x, ay + 3, 1, 1); };

export function draw(dt) {
  if (!ground) { buildGround(); buildSprites(); }
  t += dt;
  const { W, H } = view, seated = S.seat !== null;
  const seat = seated ? SEATS[S.seat] : null;

  /* camera: follow the player, lean toward the lake while fishing */
  let tx = P.x * TS, ty = P.y * TS + 6;
  if (seated) { tx += (LAKE.x * TS - tx) * 0.2; ty += (LAKE.y * TS - ty) * 0.3 + 6; }
  const mw = NW * TS, mh = NH * TS, goalX = tx - W / 2, goalY = ty - H / 2;
  const cl = (v, hi, size, full) => (full <= size ? (full - size) / 2 : Math.max(0, Math.min(hi, v)));
  const gx = cl(goalX, mw - W, W, mw), gy = cl(goalY, mh - H, H, mh);
  if (cam.snap) { cam.x = gx; cam.y = gy; cam.snap = false; } else { const k = Math.min(1, dt * 5); cam.x += (gx - cam.x) * k; cam.y += (gy - cam.y) * k; }
  const cx = Math.round(cam.x), cy = Math.round(cam.y);
  const X = (wx) => Math.round(wx * TS) - cx, Y = (wy) => Math.round(wy * TS) - cy;

  rect(g, SKYC, 0, 0, W, H);
  g.drawImage(ground, -cx, -cy);
  g.drawImage(SPR.cloud, Math.round(((t * 1.2 + 300) % (mw + 120)) - 60) - cx, 8 - cy);

  /* water life: sparkles, fish shadows, lily pads */
  WATER.forEach((w) => { const ph = (t * 1.1 + w.h * 7) % 3; if (ph < 0.5) { rect(g, '#ffffff', w.x - cx, w.y - cy, 2, 1); rect(g, '#bff2fa', w.x - cx - 1, w.y - cy + 1, 4, 1); } });
  [[0, 0.9, 0.5], [2.1, 0.7, 0.4], [4.2, 0.8, 0.6]].forEach(([ph, k, sp], i) => {
    const a = t * sp * 0.5 + ph, fx = LAKE.x + Math.cos(a) * LAKE.rx * 0.6 * k, fy = LAKE.y + Math.sin(a) * LAKE.ry * 0.6 * k, d = Math.cos(a + 1.57) > 0 ? 1 : -1;
    const x = X(fx), y = Y(fy), wag = Math.round(Math.sin(t * 8 + i)), s = d;
    for (let j = 0; j < 7; j++) rect(g, '#1f7f99', x - 4 * s + j * s, y + (j > 4 ? wag : 0), 1, j < 1 || j > 5 ? 1 : 2);
    rect(g, '#1f7f99', x + 3 * s, y - 1 + wag, 1, 3);
  });
  [[0.3, 0.2], [-0.45, 0.4], [0.55, -0.35], [-0.2, -0.5], [0.05, 0.55]].forEach(([a, b], i) => {
    const x = X(LAKE.x + a * LAKE.rx * 0.8), y = Y(LAKE.y + b * LAKE.ry * 0.8) + Math.round(Math.sin(t * 1.5 + i));
    rect(g, '#1f6a3a', x - 4, y, 9, 4); rect(g, '#3aa84a', x - 3, y, 7, 3); rect(g, '#7fdc6a', x - 2, y, 3, 1); if (i % 2) { rect(g, '#ff7ab8', x + 1, y - 1, 2, 2); rect(g, '#fff', x + 1, y, 1, 1); }
  });

  /* ground-level pieces: shadows, stones, tufts */
  TREES.forEach((o) => { shadow(X(o.x), Y(o.y) - 1, 17, 4, 0.26); });
  BUSHES.forEach((o) => shadow(X(o.x), Y(o.y) - 1, 9, 2.5, 0.22));
  SEATS.forEach((s) => shadow(X(s.x), Y(s.y) + 1, 8, 2, 0.25));
  TUFTS.forEach((o) => g.drawImage(SPR.tuft[o.v], X(o.x) - 5, Y(o.y) - 11));

  /* depth-sorted scene objects */
  Z.length = 0;
  TREES.forEach((o, i) => Z.push({ d: o.y, f: () => g.drawImage(SPR.trees[o.v][i & 1], X(o.x) - 28, Y(o.y) - 68) }));
  BUSHES.forEach((o) => Z.push({ d: o.y, f: () => g.drawImage(SPR.bush[o.v], X(o.x) - 14, Y(o.y) - 18) }));
  Z.push({ d: HOUSE.y + HOUSE.d, f: () => { const fx = X(HOUSE.x + HOUSE.w / 2), fy = Y(HOUSE.y + HOUSE.d); shadow(fx + 4, fy - 1, 44, 3, 0.25); g.drawImage(SPR.house, fx - 46, fy - 112);
    for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4) % 1; g.globalAlpha = (1 - k) * 0.9; rect(g, '#fff', fx + 24 + Math.sin(k * 6 + i) * 3, fy - 112 - k * 18, 3, 3); } g.globalAlpha = 1; } });
  CAVES.forEach((o) => Z.push({ d: o.y + o.d, f: () => { const fx = X(o.x + o.w / 2), fy = Y(o.y + o.d); shadow(fx, fy - 1, 20, 3, 0.25); g.drawImage(SPR.cave, fx - 20, fy - 34); } }));
  Z.push({ d: BENCH.y + BENCH.d, f: () => g.drawImage(SPR.bench, X(BENCH.x + BENCH.w / 2) - 22, Y(BENCH.y + BENCH.d) - 26) });
  Z.push({ d: 12.2, f: () => g.drawImage(SPR.logs, X(34.6) - 17, Y(12.2) - 22) });
  SEATS.forEach((s) => Z.push({ d: s.y - 0.01, f: () => {
    const x = X(s.x), y = Y(s.y);
    g.drawImage(SPR.seat, x - 9, y - 9);
    if (S.near === s.i && !seated) arrow(x, y - 24 + Math.round(Math.sin(t * 6) * 1.5));
  } }));
  Z.push({ d: NPCW.y, f: () => {                                           // Old Finn
    const x = X(NPCW.x), y = Y(NPCW.y), b = Math.sin(t * 2.2) > 0.6 ? -1 : 0;
    shadow(x, y, 7, 2, 0.3);
    drawMap(g, NPC, x - 8, y - 22 + b, NPC_PAL, P.x * TS < NPCW.x * TS);
    S._npl = { x, y: y - 28 };
    if (S.nearNpc && !seated) arrow(x, y - 36 + Math.round(Math.sin(t * 6) * 1.5));
  } });
  Z.push({ d: P.y + 0.01, f: () => drawPlayer(X, Y, seat) });
  Z.sort((a, b) => a.d - b.d).forEach((o) => o.f());
}

function drawPlayer(X, Y, seat) {
  const px = X(P.x), py = Y(P.y);
  if (!seat) shadow(px, py, 7, 2, 0.3);
  S._pl = { x: px, y: py - (seat ? 24 : 28) };
  if (!seat) {
    S._bob = null;
    const step = P.moving && ((P.anim * 8) | 0) % 2 === 1, bob = P.moving && !step ? -1 : 0;
    const rows = step ? PLAYER.slice(0, 16).concat(PLAYER_LEGS_B) : PLAYER;
    drawMap(g, rows, px - 8, py - 22 + bob, PL_PAL, P.flip);
    return;
  }
  /* seated: torso on top of the stool, rod toward the lake */
  const vx = seat.fx, vy = seat.fy;
  const y0 = py - 21, hx = px + (vx > 0 ? 5 : -5), hy = y0 + 12;
  const ph = S.phase, wiggle = ph === 'reeling' ? Math.round(Math.sin(t * 30)) : 0;
  const reach = ph === 'charging' ? -6 : 20, lift = ph === 'charging' ? 18 : ph === 'reeling' ? 13 : 11;
  const tipX = Math.round(hx + vx * reach + wiggle), tipY = Math.round(hy + vy * reach * 0.5 - lift + (ph === 'reeling' ? Math.abs(wiggle) : 0));
  drawMap(g, PLAYER.slice(0, 16), px - 8, y0, PL_PAL, vx < 0);
  line(C.woodD, hx, hy, tipX, tipY); line(C.navy, hx, hy + 1, tipX, tipY + 1);
  rect(g, C.woodL, hx - 1, hy - 1, 2, 2);
  if (['waiting', 'bite', 'reeling'].includes(ph) && S.cast) {
    const d = 2 + S.cast.p * 5.5, bx = seat.x + seat.fx * d, by = seat.y + seat.fy * d;
    const tX = X(bx), tY = Y(by);
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
