import { S, emit } from './state.js';
import { FISH, lakeOdds } from './data.js';
import { stand } from './world.js';

let biteT = 0, waitT = 0;
const rnd = (a, b) => a + Math.random() * (b - a);

function pickFish() {
  let r = Math.random();
  const odds = lakeOdds();
  for (const o of odds) { if ((r -= o.p) < 0) return o.fish; }
  return odds[0].fish;
}

function newReel(fish) {
  return { fish: fish || pickFish(), pos: 0.35, vel: 0, fp: 0.5, target: 0.5, tt: 0, prog: 0.3, size: 0.26 + S.rod * 0.05 + S.lv.hook * 0.03, hold: false, in: false };
}

export function setPhase(p, fish) {
  S.phase = p;
  if (p === 'idle') { S.power = 0; S.cast = null; S.reel = null; }
  if (p === 'charging') { S.power = 0; S._dir = 1; S.cast = null; }
  if (p === 'waiting') waitT = rnd(1.6, 3.2);
  if (p === 'bite') { biteT = 1.6; S.biteLeft = 1; }
  if (p === 'reeling') S.reel = newReel(fish);
  emit('phase', p);
}

export function press() {
  if (S.phase === 'idle') { if (S.seat !== null) setPhase('charging'); }
  else if (S.phase === 'bite') setPhase('reeling');
  else if (S.phase === 'reeling') S.reel.hold = true;
}
export function release() {
  if (S.phase === 'charging') { S.cast = { p: S.power }; setPhase('waiting'); }
  else if (S.phase === 'reeling') S.reel.hold = false;
}

function finish(win) {
  const f = S.reel.fish;
  const size = Math.round(rnd(f.size[0], f.size[1]));
  S.last = { fish: f, size, win, xp: Math.round(f.price / 4) + 5, record: win && Math.random() > 0.6 };
  if (win) { const k = FISH.indexOf(f); if (S.lakeCount[k] > 0) S.lakeCount[k]--; S.caught++; S.streak++; S.xp = Math.min(100, S.xp + 8); S.bait = Math.max(0, S.bait - 1); S.durability = Math.max(1, S.durability - 1); }
  else S.streak = 0;
  S.phase = 'result'; S.reel = null;
  emit('phase', 'result');
}

export function tick(dt) {
  S.clock = (S.clock + dt * 2) % 1440;
  if (S.rent.left > 0 && (S.rent.left -= dt) <= 0) {
    S.rent.left = 0;
    if (S.seat !== null) { setPhase('idle'); stand(true); }
    emit('toast', { t: 'RENTAL ENDED - SEE OLD FINN', icon: 'clock' });
  }
  if (S.phase === 'charging') {
    S.power += dt * 0.9 * S._dir;
    if (S.power >= 1) { S.power = 1; S._dir = -1; } else if (S.power <= 0) { S.power = 0; S._dir = 1; }
  } else if (S.phase === 'waiting') {
    if ((waitT -= dt) <= 0) setPhase('bite');
  } else if (S.phase === 'bite') {
    biteT -= dt; S.biteLeft = Math.max(0, Math.min(1, biteT / 1.6)) * (biteT > 5 ? 0.7 : 1);
    if (biteT <= 0) { setPhase('idle'); emit('toast', { t: 'IT GOT AWAY...', icon: 'x' }); }
  } else if (S.phase === 'reeling') {
    const r = S.reel;
    const lvl = { common: 0.8, uncommon: 1, rare: 1.25, epic: 1.5, legendary: 1.8 }[r.fish.rarity];
    r.vel += (r.hold ? 2.6 : -2.0) * dt; r.vel *= 0.95; r.pos += r.vel * dt;
    const maxPos = 1 - r.size;
    if (r.pos < 0) { r.pos = 0; r.vel = Math.abs(r.vel) * 0.25; }
    if (r.pos > maxPos) { r.pos = maxPos; r.vel = -Math.abs(r.vel) * 0.25; }
    /* the fish drifts up and down: short hops, capped speed, eased in and out */
    if ((r.tt -= dt) <= 0) { r.target = Math.max(0.05, Math.min(0.9, r.fp + rnd(-0.32, 0.32))); r.tt = rnd(1.2, 2.4) / lvl; }
    const want = (r.target - r.fp) * 1.6, cap = 0.2 * lvl;
    r.fp += Math.max(-cap, Math.min(cap, want)) * dt;
    const c = r.fp + 0.04;
    r.in = c >= r.pos && c <= r.pos + r.size;
    r.prog += (r.in ? 0.2 : -0.1 * lvl) * dt;
    if (r.prog >= 1) finish(true);
    else if (r.prog <= 0) finish(false);
  }
}

/* demo helper: jump straight to a phase */
export function demoPhase(p) {
  if (p === 'idle') return setPhase('idle');
  if (p === 'charging') { setPhase('charging'); S.power = 0.65; S._dir = 1; return; }
  if (p === 'waiting') { setPhase('waiting'); S.cast = { p: 0.6 }; waitT = 999; return; }
  if (p === 'bite') { setPhase('bite'); S.cast = { p: 0.6 }; biteT = 999; S.biteLeft = 0.7; return; }
  if (p === 'reeling') { S.cast = { p: 0.6 }; setPhase('reeling', FISH[1]); S.cast = { p: 0.6 }; return; }
  if (p === 'result') { S.reel = newReel(FISH[1]); finish(true); S.last.record = true; }
}
