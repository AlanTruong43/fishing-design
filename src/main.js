import './styles/ui.css';
import './styles/screens.css';
import { installSkins, installCursor } from './gfx/sprites.js';
import { resizeScene, draw } from './gfx/scene.js';
import { S, on } from './game/state.js';
import { keys, sit, stand, updateWorld } from './game/world.js';
import { tick, press, release, demoPhase, setPhase } from './game/fishing.js';
import { initUI, frame_, openWindow, closeAll, topWindow, openNPC, toast, skipNPC } from './ui/screens.js';

const root = document.documentElement, stage = document.getElementById('stage'), bar = document.getElementById('demobar');
let barOn = true, px = 3;

/* ---- integer UI scale: logical canvas is (window / px), every sprite is an exact multiple ---- */
function fit() {
  const barH = barOn ? 28 : 0, w = innerWidth, h = innerHeight - barH;
  px = Math.max(2, Math.floor(Math.min(w / 400, h / 225)));
  root.style.setProperty('--px', px); root.style.setProperty('--bar', barH + 'px');
  const W = Math.floor(w / px), H = Math.floor(h / px);
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  resizeScene(W, H); installCursor(px);
  bar.style.display = barOn ? 'flex' : 'none';
}

/* ---- presenter bar (not part of the game UI) ---- */
const DEMO_SEAT = 6;
const demoSit = () => { if (S.rent.left <= 0) S.rent = { left: 1500, total: 1500 }; if (S.seat === null) sit(DEMO_SEAT); };
const fish = (p) => () => go(() => { demoSit(); demoPhase(p); });
const STEPS = [
  ['WALK', () => go(() => { setPhase('idle'); stand(true); S.rent = { left: 0, total: 0 }; })], ['RENT', () => go(() => { setPhase('idle'); stand(true); openWindow('rent'); })],
  ['SIT', () => go(() => { setPhase('idle'); demoSit(); openWindow('pick'); })],
  ['READY', fish('idle')], ['CHARGE', fish('charging')], ['WAIT', fish('waiting')],
  ['BITE', fish('bite')], ['REEL', fish('reeling')], ['CATCH', fish('result')],
  null,
  ['NPC', () => { setPhase('idle'); openNPC(); }], ['TRADE', () => win('trade')], ['UPGRADE', () => win('upgrade')], ['LAKE INFO', () => win('lakeinfo')],
  ['LAKES', () => win('lakes')], ['BAG', () => win('bag')], ['FISHDEX', () => win('dex')], ['QUESTS', () => win('quests')], ['PAUSE', () => win('pause')], ['SETTINGS', () => win('set')],
];
const flat = STEPS.filter(Boolean);
let cur = 0;
function go(fn) { closeAll(); fn(); }
function win(id) { setPhase('idle'); openWindow(id); }
function select(i) {
  cur = (i + flat.length) % flat.length; flat[cur][1]();
  [...bar.querySelectorAll('button')].forEach((b, k) => b.classList.toggle('on', k === cur));
}
bar.innerHTML = `<b>UI DEMO</b>` + STEPS.map((s) => (s ? `<button>${s[0]}</button>` : '<i></i>')).join('') +
  `<span>WASD walk &middot; SPACE sit/cast/reel &middot; E rod &middot; X stand &middot; , . step &middot; B F Q windows &middot; N talk &middot; H hide bar</span>`;
[...bar.querySelectorAll('button')].forEach((b, k) => b.addEventListener('click', () => select(k)));

/* ---- input ---- */
const blocked = () => S.windows.length > 0 && topWindow() !== 'result';
const DIRS = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (DIRS[k]) { e.preventDefault(); if (!blocked()) keys.add(DIRS[k]); return; }
  if (e.repeat) return;
  if (k === ' ') {
    e.preventDefault();
    if (document.querySelector('.dlg')) { skipNPC(); return; }
    if (blocked()) return;
    if (S.seat === null) {
      if (S.nearNpc) openNPC();
      else if (S.near !== null) { if (S.rent.left > 0) { sit(S.near); openWindow('pick'); } else toast({ t: 'RENT A SEAT FROM OLD FINN', icon: 'lock' }); }
      return;
    }
    press(); return;
  }
  if (k === 'escape') { if (S.windows.length || document.querySelector('.dlg')) closeAll(); else if (S.seat !== null && stand()) return; else openWindow('pause'); return; }
  if (k === '.') return select(cur + 1);
  if (k === ',') return select(cur - 1);
  if (k === 'h') { barOn = !barOn; fit(); return; }
  if (k === 'x' && !blocked()) { stand(); return; }
  if (k === 'e' && S.seat !== null && S.phase === 'idle') { S.windows[0] === 'pick' ? closeAll() : openWindow('pick'); return; }
  const m = { b: 'bag', f: 'dex', q: 'quests' }[k];
  if (m) { S.windows[0] === m ? closeAll() : openWindow(m); }
  if (k === 'n' && S.seat === null) openNPC();
});
addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (DIRS[k]) keys.delete(DIRS[k]); if (k === ' ' && !blocked()) release(); });
addEventListener('blur', () => keys.clear());
on((type) => { if (type === 'stand') stand(); });
document.getElementById('scene').addEventListener('pointerdown', () => { if (!blocked()) press(); });
addEventListener('pointerup', () => release());
addEventListener('resize', fit);

/* ---- boot ---- */
installSkins(); fit(); initUI(); select(0);
let last = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  tick(dt); updateWorld(dt); draw(dt); frame_(dt);
  requestAnimationFrame(loop);
})(last);
