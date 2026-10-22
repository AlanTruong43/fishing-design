import { S, on, emit } from '../game/state.js';
import { FISH, SPOTS, RODS, GEAR, OTHERS, PACKS, BAG, QUESTS, NPC_LINES, fmt, mmss, lakeOdds } from '../game/data.js';
import { setPhase } from '../game/fishing.js';
import { iconURL, fishURL, portraitURL } from '../gfx/sprites.js';
import { view } from '../gfx/scene.js';

const ui = document.getElementById('ui');
const ico = (n, c = '') => `<img class="ico ${c}" src="${iconURL(n)}" alt="">`;
const fimg = (f, k = 1, sil = false) => `<img src="${fishURL(f, sil)}" style="width:${16 * k}px;height:${10 * k}px" alt="">`;
const up = (s) => s.toUpperCase();
const bar = (pct, cls = '', label = '', tall = false) =>
  `<div class="bar ${cls} ${tall ? 'tall' : ''}"><i style="width:${Math.round(pct * 100)}%"></i>${label ? `<span>${label}</span>` : ''}</div>`;
const tip = (t) => `data-tip="${t}"`;

/* ============================== HUD ============================== */
function hudHTML() {
  const sp = SPOTS[S.spot];
  return `
  <div class="abs hud-card panel hit">
    <div class="row">
      <div class="slot" style="width:28px;height:28px"><img src="${portraitURL.player()}" style="width:16px;height:24px;margin-top:-4px"></div>
      <div class="col sp" style="gap:1px">
        <div class="row"><span class="name">${S.name}</span><span class="sp"></span><span class="gold sh">LV ${S.level}</span></div>
        <div id="h-xp">${bar(S.xp / 100, '', '', false)}</div>
      </div>
    </div>
  </div>

  <div class="abs hud-coin panel hit"><div class="row">${ico('coin', 'ico2')}<span class="sp r gold sh" id="h-coins">${fmt(S.coins)}</span></div></div>
  <div class="abs hud-rent panel hit" id="hud-rent" style="display:none" ${tip('SEAT RENTAL|TIME LEFT ON YOUR SEAT')}><div class="row">${ico('clock', 'ico2')}<span class="sp">SEAT</span><span class="r lime sh" id="h-rent">00:00</span></div></div>
  <div class="abs hud-menu hit">
    ${[['bag', 'bag', 'BAG [B]'], ['dex', 'book', 'FISHDEX [F]'], ['quests', 'scroll', 'QUESTS [Q]'], ['pause', 'cog', 'MENU [ESC]']]
      .map(([id, ic, t]) => `<button class="btn v sq" data-act="open" data-id="${id}" ${tip(t)}>${ico(ic, 'ico2')}</button>`).join('')}
  </div>

  <div class="abs hud-chat hit">
    <div class="chat-log">${[['MIRA', 'lime', 'Hi all!'], ['TOBY', 'pinkc', 'Got bass!'], ['AYA', 'gold', 'Nice one!'], ['FINN', 'lime', 'Rent here']]
      .map(([n, c, t]) => `<div><span class="${c}">${n}:</span> ${t}</div>`).join('')}</div>
    <div class="chat-in dim">ENTER TO CHAT</div>
  </div>
  <button class="abs hud-spotsel btn v hit" data-act="open" data-id="lakes" id="h-spot">${sp.name}</button>
  <div class="abs hud-seat col hit" id="hud-seat" style="display:none">
    <button class="btn v" data-act="open" data-id="pick" id="h-rodbtn" ${tip('CHANGE ROD [E]')}>${ico('rod')}<span id="h-rod">${RODS[S.rod].n}</span></button>
    <button class="btn" data-act="stand" ${tip('STAND UP [X]')}>STAND UP</button>
  </div>
  <div class="abs prompt panel hit" id="prompt" style="display:none"><span class="sh">PRESS <kbd>SPACE</kbd> TO SIT HERE</span></div>
  <div class="abs toasts" id="toasts"></div>`;
}
/* ============================== windows ============================== */
const WS = {
  bag: { tab: 'Fish', sel: 0 }, trade: { tab: 'Sell', sel: 0, qty: 1 }, dex: { sel: 0 },
  upg: { tab: 'rod' }, quests: { tab: 'Daily' }, set: { music: 0.7, sfx: 0.5, shake: true, hints: true, fps: false },
};
const frame = (title, body, w, closable = true) => `
  <div class="win-wrap" data-act="backdrop"><div class="win panel" style="width:${w}px">
    <div class="plate">${title}</div>
    ${closable ? `<button class="btn x" style="width:16px;min-height:16px;padding:0" data-act="close">${ico('x')}</button>` : ''}
    <div class="body">${body}</div></div></div>`;
const tabs = (list, cur, act) => `<div class="tabs">${list.map((t) => `<button class="tab ${t === cur ? 'on' : ''}" data-act="${act}" data-v="${t}">${up(t)}</button>`).join('')}</div>`;
const rar = (r) => `<span class="rt r-${r}">${up(r)}</span>`;

function slotHTML(it, i, sel, act) {
  if (!it) return `<div class="slot empty"></div>`;
  const img = it.fish ? `<img class="fish" src="${fishURL(it.fish)}">` : `<img src="${iconURL(it.icon)}">`;
  const r = it.fish ? it.fish.rarity : it.rarity;
  return `<div class="slot r-${r} ${sel ? 'sel' : ''}" data-act="${act}" data-i="${i}" ${tip(up(it.fish ? it.fish.name : it.n))}>${img}${it.q > 1 ? `<span class="n">${it.q}</span>` : ''}</div>`;
}
const detailCard = (it, extra = '') => {
  if (!it) return `<div class="dim c" style="padding:30px 0">SELECT AN ITEM</div>`;
  const f = it.fish, r = f ? f.rarity : it.rarity;
  return `<div class="col">
    <div class="panel-dark c" style="padding:6px 0 4px;border-width:4px">${f ? fimg(f, 3) : `<img class="ico3" src="${iconURL(it.icon)}" style="width:32px;height:32px">`}</div>
    <div class="sh lime">${up(f ? f.name : it.n)}</div>${rar(r)}
    <div class="dim" style="font-size:8px">${f ? `SIZE ${it.size || '-'} CM<br>VALUE ${f.price} COINS` : it.d}</div>
    ${extra}</div>`;
};

function bagWin() {
  const w = WS.bag, items = BAG[w.tab], cap = OTHERS[S.lv.bag].slots, cells = Array.from({ length: cap }, (_, i) => items[i]);
  const it = items[w.sel];
  const btns = w.tab === 'Fish' ? `<div class="row"><span class="dim">SELL AT OLD FINN</span></div>`
    : w.tab === 'Gear' ? `<span class="dim">UPGRADE AT OLD FINN</span>`
      : `<button class="btn" data-act="toast" data-t="USED" data-i="star">USE</button>`;
  return frame('BACKPACK', `
    <div class="row" style="align-items:flex-start;gap:6px">
      <div>${tabs(['Fish', 'Gear', 'Bait', 'Items'], w.tab, 'bagtab')}
        <div class="panel-dark"><div class="grid">${cells.map((c, i) => slotHTML(c, i, i === w.sel, 'bagsel')).join('')}</div></div>
        <div class="row dim" style="margin-top:3px"><span class="sp">${items.length}/${cap} SLOTS</span>${ico('coin')}<span class="gold">${fmt(S.coins)}</span></div></div>
      <div style="width:100px">${detailCard(it, it ? btns : '')}</div>
    </div>`, 300);
}

function tradeWin() {
  const w = WS.trade, buy = w.tab === 'Buy';
  const list = BAG.Fish.map((b) => ({ fish: b.fish, n: b.fish.name, d: `SIZE ${b.size} CM`, rarity: b.fish.rarity, p: buy ? b.fish.price * 2 : b.fish.price, q: b.q, size: b.size }));
  const it = list[w.sel] || list[0], total = it.p * w.qty, bad = buy ? total > S.coins : it.q < w.qty;
  return frame('FISH MARKET', `
    <div class="row" style="align-items:flex-start;gap:6px">
      <div style="flex:1">${tabs(['Buy', 'Sell'], w.tab, 'tradetab')}
        <div class="panel-dark"><div class="list">${list.map((x, i) => `
          <button class="item-row ${i === w.sel ? 'sel' : ''}" data-act="tradesel" data-i="${i}">
            <span class="slot r-${x.rarity}" style="width:20px;height:20px">${fimg(x.fish)}</span>
            <div class="col sp" style="gap:1px"><span>${up(x.n)}</span><span class="dim">OWNED x${x.q}</span></div>${ico('coin')}<span class="gold">${fmt(x.p)}</span></button>`).join('')}</div></div></div>
      <div style="width:112px" class="col">
        ${detailCard({ fish: it.fish, size: it.size })}
        <div class="row"><button class="btn v sq" style="width:16px;min-height:16px" data-act="qty" data-d="-1">-</button><span class="sp c">x${w.qty}</span><button class="btn v sq" style="width:16px;min-height:16px" data-act="qty" data-d="1">${ico('plus')}</button></div>
        <button class="btn ${bad ? 'dis' : ''}" data-act="trade">${buy ? 'BUY' : 'SELL'} ${fmt(total)}</button>
      </div>
    </div>
    <div class="row dim" style="margin-top:4px"><span class="sp">YOUR COINS</span>${ico('coin')}<span class="gold">${fmt(S.coins)}</span></div>`, 330);
}

function dexWin() {
  const w = WS.dex, known = FISH.length, total = 12, it = FISH[w.sel];
  const cells = Array.from({ length: total }, (_, i) => FISH[i] || null);
  return frame('FISHDEX', `
    <div class="row" style="align-items:flex-start;gap:6px">
      <div><div class="row" style="margin-bottom:3px"><span class="sp lime sh">COLLECTION</span><span>${known}/${total}</span></div>
        <div class="panel-dark"><div class="grid" style="grid-template-columns:repeat(4,30px);gap:6px 4px">${cells.map((f, i) => !f ? `<div class="slot empty" style="width:30px;height:30px"><span class="dim">?</span></div>`
          : `<div class="slot r-${f.rarity} ${i === w.sel ? 'sel' : ''}" style="width:30px;height:30px" data-act="dexsel" data-i="${i}">${fimg(f)}</div>`).join('')}</div></div>
        <div style="margin-top:4px">${bar(known / total, 'water', 'COMPLETE ' + Math.round(known / total * 100) + '%', true)}</div></div>
      <div style="width:130px" class="col">
        <div class="panel-dark c" style="padding:8px 0 6px">${fimg(it, 4)}</div>
        <div class="sh lime">${up(it.name)}</div>${rar(it.rarity)}
        <div class="hr"></div>
        ${[['TIER', it.tier], ['BEST', it.size[1] + ' CM'], ['SPOT', up(it.area)], ['TIME', up(it.time)], ['BAIT', up(it.bait)]]
          .map(([a, b]) => `<div class="row"><span class="dim sp">${a}</span><span>${b}</span></div>`).join('')}
      </div>
    </div>`, 320);
}

const TIERS = ['LOW', 'MEDIUM', 'HIGH'];
function upgradeWin() {
  const w = WS.upg, cat = w.tab, list = GEAR[cat], own = S.lv[cat];
  const names = { rod: 'RODS', bait: 'BAITS', hook: 'HOOKS', bag: 'OTHER' };
  return frame('UPGRADES', `${tabs(['rod', 'bait', 'hook', 'bag'].map((k) => k), cat, 'upgtab').replace(/>(ROD|BAIT|HOOK|BAG)</g, (m, x) => '>' + names[x.toLowerCase()] + '<')}
    <div class="panel-dark"><div class="col" style="padding:3px;gap:3px;width:330px">${list.map((g, i) => `
      <div class="item-row ${i === own ? 'sel' : ''}" style="cursor:default"><span class="slot r-${g.rarity}" style="width:20px;height:20px">${ico(g.icon || (cat === 'hook' ? 'hook' : cat === 'bag' ? 'bag' : 'rod'), 'ico2')}</span>
        <div class="col sp" style="gap:1px;white-space:nowrap"><span class="sh">${g.n}</span><span class="dim">${TIERS[i]} &middot; ${up(g.d)}</span></div>
        <span class="sp"></span>${i <= own ? `<span class="lime">${i === own ? 'CURRENT' : 'OWNED'}</span>`
          : i === own + 1 ? `<button class="btn ${g.price > S.coins ? 'dis' : ''}" data-act="upg" data-i="${i}">${ico('coin')}${fmt(g.price)}</button>` : `${ico('lock')}`}</div>`).join('')}</div></div>
    <div class="row dim" style="margin-top:4px"><span class="sp">UPGRADE ONE TIER AT A TIME</span>${ico('coin')}<span class="gold">${fmt(S.coins)}</span></div>`, 360);
}

function rentWin() {
  const on = S.rent.left > 0;
  return frame('RENT A SEAT', `<div class="panel-dark"><div class="col" style="padding:3px;gap:3px;width:232px">${PACKS.map((p, i) => `
      <div class="item-row" style="cursor:default"><span class="slot" style="width:20px;height:20px">${ico('clock', 'ico2')}</span>
        <div class="col sp" style="gap:1px"><span class="sh">${p.n}</span><span class="dim">${p.note}</span></div>
        <button class="btn ${p.price > S.coins ? 'dis' : ''}" data-act="rent" data-i="${i}">${ico('coin')}${fmt(p.price)}</button></div>`).join('')}</div></div>
    <div class="row" style="margin-top:4px"><span class="dim sp">${on ? 'TIME LEFT ON YOUR SEAT' : 'NO ACTIVE RENTAL'}</span><span class="${on ? 'lime' : 'pinkc'}">${on ? mmss(S.rent.left) : '--:--'}</span></div>
    <div class="dim" style="margin-top:2px">RENT, THEN SIT AT ANY SEAT. TIME ADDS UP.</div>`, 256);
}

function lakeInfoWin() {
  const sp = SPOTS[S.spot], odds = lakeOdds(), total = S.lakeCount.reduce((a, b) => a + b, 0);
  return frame(sp.name + ' DETAILS', `<div class="row" style="margin-bottom:3px"><span class="dim sp">DEPTH ${sp.depth}</span><span class="dim">BAIT: ${GEAR.bait[S.lv.bait].n}</span></div>
    <div class="panel-dark"><div class="col" style="padding:3px;gap:3px;width:252px">${odds.map((o) => `
      <div class="item-row" style="cursor:default"><span class="slot r-${o.fish.rarity}" style="width:20px;height:20px">${fimg(o.fish)}</span>
        <div class="col sp" style="gap:2px"><div class="row"><span class="sp">${up(o.fish.name)}</span><span class="lime">${o.pct}%</span></div>${bar(o.p, o.fish.rarity === 'common' ? 'water' : o.fish.rarity === 'rare' ? 'pink' : 'green')}</div>
        <span class="dim" style="width:34px;text-align:right">x${o.count}</span></div>`).join('')}</div></div>
    <div class="row" style="margin-top:4px"><span class="dim sp">FISH IN THE LAKE</span><span class="gold">${total}</span></div>
    <div class="dim" style="margin-top:2px">BETTER BAIT = RARER FISH</div>`, 276);
}

function questsWin() {
  const w = WS.quests, list = QUESTS[w.tab];
  return frame('QUESTS', `${tabs(Object.keys(QUESTS), w.tab, 'qtab')}
    <div class="panel-dark"><div class="col" style="padding:3px;gap:4px;min-height:106px">${list.map((q) => `
      <div class="row panel" style="padding:1px 3px;gap:5px">
        <span class="slot" style="width:20px;height:20px">${ico(q.icon, 'ico2')}</span>
        <div class="col sp" style="gap:2px"><div class="row"><span class="sp">${up(q.t)}</span><span class="dim">${fmt(q.p)}/${fmt(q.m)}</span></div>
          ${bar(Math.min(1, q.p / q.m), q.done || q.p >= q.m ? 'green' : 'water')}
          <span class="dim">REWARD: <span class="gold">${up(q.r)}</span></span></div>
        <button class="btn ${q.p >= q.m ? '' : 'dis'}" data-act="toast" data-t="REWARD CLAIMED" data-i="star">${q.p >= q.m ? 'CLAIM' : '...'}</button>
      </div>`).join('')}</div></div>`, 300);
}

function pauseWin() {
  return frame('PAUSED', `<div class="col" style="width:104px;gap:5px;padding:4px 0 2px">
    <button class="btn" data-act="close">RESUME</button><button class="btn v" data-act="open" data-id="set">SETTINGS</button>
    <button class="btn v" data-act="open" data-id="dex">FISHDEX</button><button class="btn pink" data-act="toast" data-t="DEMO ONLY" data-i="x">QUIT</button></div>`, 124);
}
function setWin() {
  const s = WS.set, sl = (k, n) => `<div class="row"><span class="sp">${n}</span><div class="sl" data-act="slide" data-k="${k}"><i style="width:${s[k] * 100}%"></i><b style="left:${s[k] * 100}%"></b></div><span class="lime" style="width:20px;text-align:right">${Math.round(s[k] * 100)}</span></div>`;
  const tg = (k, n) => `<div class="row"><span class="sp">${n}</span><div class="tog ${s[k] ? 'on' : ''}" data-act="tog" data-k="${k}"></div></div>`;
  return frame('SETTINGS', `<div class="col" style="width:172px;gap:6px;padding:3px 0">${sl('music', 'MUSIC')}${sl('sfx', 'SOUND')}<div class="hr"></div>${tg('shake', 'SCREEN SHAKE')}${tg('hints', 'CAST HINTS')}${tg('fps', 'SHOW FPS')}
    <div class="hr"></div><div class="row"><span class="sp dim">UI SCALE</span><span class="lime">x${Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')))}  ${view.W}x${view.H}</span></div>
    <button class="btn" data-act="close">DONE</button></div>`, 196);
}

function resultWin() {
  const L = S.last; if (!L) return '';
  const f = L.fish;
  if (!L.win) return frame('IT GOT AWAY', `<div class="col c" style="width:140px;align-items:center;padding:4px 0">
    <div class="panel-dark" style="padding:8px 14px">${fimg(f, 4, true)}</div><div class="pinkc sh">TOO SLOW...</div><div class="dim">THE FISH SLIPPED OFF.<br>STREAK LOST.</div>
    <button class="btn" data-act="again">TRY AGAIN</button></div>`, 164, false);
  return frame('NICE CATCH!', `<div class="col c" style="width:156px;align-items:center;padding:2px 0 0">
    <div class="panel-dark" style="padding:8px 16px 6px;position:relative;width:100%"><div class="bob" style="display:inline-block">${fimg(f, 5)}</div>
      </div>
    <div class="sh lime" style="font-size:8px">${up(f.name)}</div>${rar(f.rarity)}
    <div class="col" style="width:100%;gap:3px;margin:3px 0">
      <div class="row"><span class="dim sp">SIZE</span><span>${L.size} CM ${L.record ? '<span class="lime blink">NEW!</span>' : ''}</span></div>
      <div class="row"><span class="dim sp">VALUE</span>${ico('coin')}<span class="gold">${f.price}</span></div>
      <div class="row"><span class="dim sp">XP</span><span class="lime">+${L.xp}</span></div>${bar(S.xp / 100, '', 'LV ' + S.level)}</div>
    <div class="row" style="width:100%"><button class="btn sp" data-act="keep">KEEP</button><button class="btn v sp" data-act="sellc">SELL ${f.price}</button></div></div>`, 180, false);
}

function lakesWin() {
  return frame('SELECT LAKE', `<div class="panel-dark"><div class="col" style="padding:3px;gap:3px;width:176px">${SPOTS.map((l, i) => `
    <button class="item-row ${i === S.spot ? 'sel' : ''}" data-act="lake" data-i="${i}"><span class="slot" style="width:20px;height:20px">${ico('cloud', 'ico2')}</span>
      <div class="col sp" style="gap:1px"><span class="sh">${l.name}</span><span class="dim">${up(l.note)}</span></div>
      ${i === S.spot ? '<span class="lime">HERE</span>' : `<span class="dim">${l.depth}</span>`}</button>`).join('')}</div></div>`, 200);
}
function pickWin() {
  return frame('CHOOSE YOUR ROD', `<div class="panel-dark"><div class="col" style="padding:3px;gap:3px;width:252px">${RODS.map((r, i) => `
    <button class="item-row ${i === S.rod ? 'sel' : ''}" data-act="rodpick" data-i="${i}"><span class="slot r-${r.rarity}" style="width:20px;height:20px">${ico('rod', 'ico2')}</span>
      <div class="col sp" style="gap:1px;white-space:nowrap"><span class="sh">${r.n}</span><span class="dim">${i > S.lv.rod ? 'BUY AT OLD FINN' : up(r.d)}</span></div>
      ${i > S.lv.rod ? ico('lock') : `<span class="dim">P${r.power} C${r.control} L${r.luck}</span>`}</button>`).join('')}</div></div>
    <div class="row dim" style="margin-top:4px"><span class="sp">P=POWER C=CONTROL L=LUCK</span></div>`, 280);
}

const WINS = { lakes: lakesWin, pick: pickWin, bag: bagWin, trade: tradeWin, dex: dexWin, rent: rentWin, upgrade: upgradeWin, lakeinfo: lakeInfoWin, quests: questsWin, pause: pauseWin, set: setWin, result: resultWin };

/* ============================== NPC dialogue ============================== */
let npc = null;
function npcHTML() {
  const l = NPC_LINES[npc.i];
  return `<div class="dlg panel hit">
    <div class="portrait panel-dark"><img src="${portraitURL.npc()}"></div>
    <div class="nameplate plate lime">OLD FINN</div>
    <div class="col sp"><div class="text" id="npc-text"></div>
      <div class="row"><span class="sp dim blink" id="npc-skip">CLICK TO SKIP</span><span class="lime bob" id="npc-more" style="display:none">▼</span></div></div>
    <div class="choices" id="npc-ch"></div>
  </div>`;
}
export function openNPC() { closeAll(); npc = { i: 0, n: 0, done: false }; renderNPC(); }
function renderNPC() { const el = ui.querySelector('#npcwrap'); el.innerHTML = npc ? npcHTML() : ''; }

/* ============================== fishing layer ============================== */
let fl, rf = {}, dots = 0;
function fishLayer() {
  const p = S.phase, k = (t) => `<kbd>${t}</kbd>`;
  if (p === 'idle') return S.seat === null ? `<div class="cast-hint">${k('WASD')} OR ARROWS TO WALK</div><div class="dim sh">${S.rent.left > 0 ? 'WALK TO A SEAT AND PRESS SPACE' : 'TALK TO OLD FINN TO RENT A SEAT'}</div>` : `<div class="cast-hint">HOLD ${k('SPACE')} TO CAST</div><div class="dim sh">${k('E')} CHANGE ROD &middot; ${k('X')} STAND UP</div>`;
  if (p === 'charging') return `<div class="sh">RELEASE TO CAST!</div><div class="panel-dark" style="padding:1px 2px;border-width:4px"><div class="power bar tall" id="f-pow"><i style="--c1:var(--lime);--c2:var(--lime-d)"></i><span id="f-powt"></span></div><div class="row dim" style="font-size:8px"><span>NEAR</span><span class="sp"></span><span>FAR</span></div></div>`;
  if (p === 'waiting') return `<div class="panel-dark" style="padding:2px 8px"><span class="sh" id="f-wait">WAITING</span></div><div class="dim sh">TIP: RARE FISH LOVE LURES</div>`;
  if (p === 'bite') return `<div class="sh lime blink" style="font-size:8px">PRESS ${k('SPACE')} NOW!</div><div class="panel-dark" style="padding:1px 2px;border-width:4px"><div class="bar tall red" style="width:80px"><i id="f-bite" style="width:100%"></i></div></div>`;
  if (p === 'reeling') return `<div class="sh lime" style="margin-right:150px">HOLD ${k('SPACE')} TO FOLLOW THE FISH</div>`;
  return '';
}
function reelPanel() {
  return `<div class="abs reel panel" style="padding:3px 5px">
    <div class="col rc"><span class="dim">FISH</span><div class="track" id="r-track"><div class="zone" id="r-zone"></div><img class="fishy" id="r-fish" src="${fishURL(S.reel.fish)}"></div></div>
    <div class="col rc"><span class="dim">CATCH</span><div class="prog" id="r-prog"><i></i></div></div></div>`;
}
function renderFishLayer() {
  fl.innerHTML = fishLayer();
  ui.querySelector('#reelwrap').innerHTML = S.phase === 'reeling' ? reelPanel() : '';
  ui.querySelector('#bangwrap').innerHTML = S.phase === 'bite' ? '<div class="bangs" id="f-bang">!</div>' : '';
  rf = {};
  ['f-pow', 'f-powt', 'f-wait', 'f-bite', 'f-bang', 'r-zone', 'r-fish', 'r-prog'].forEach((id) => (rf[id] = ui.querySelector('#' + id)));
}

/* ============================== public API ============================== */
export function openWindow(id) { closeNPC(); S.windows = [id]; renderWindow(true); }
export function closeAll() { S.windows = []; closeNPC(); renderWindow(); }
function closeNPC() { npc = null; const w = ui.querySelector('#npcwrap'); if (w) w.innerHTML = ''; }
export const topWindow = () => S.windows[S.windows.length - 1];
function renderWindow(anim = false) {
  const id = topWindow(), box = ui.querySelector('#winwrap');
  box.innerHTML = id ? WINS[id]() : '';
  if (id && !anim) box.querySelectorAll('.win-wrap,.win').forEach((e) => (e.style.animation = 'none'));
}
export function toast({ t, icon }) {
  const el = document.createElement('div'); el.className = 'toast panel';
  el.innerHTML = `${icon ? ico(icon, 'ico2') : ''}<span class="sh">${t}</span>`;
  ui.querySelector('#toasts').append(el); setTimeout(() => el.remove(), 2700);
}

let tipEl;
function showTip(e) {
  const t = e.target.closest('[data-tip]');
  if (!t) { tipEl.style.display = 'none'; return; }
  const [a, b] = t.dataset.tip.split('|'), z = parseFloat(getComputedStyle(document.getElementById('stage')).zoom) || 1;
  tipEl.innerHTML = `<div>${a}</div>${b ? `<div style="color:#6d767e;margin-top:2px">${b}</div>` : ''}`;
  tipEl.style.display = 'block';
  const x = e.clientX / z + 8, y = e.clientY / z - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) / z) + 8;
  const r = tipEl.getBoundingClientRect();
  tipEl.style.left = Math.min(x, view.W - r.width / z - 4) + 'px';
  tipEl.style.top = Math.max(2, Math.min(y, view.H - r.height / z - 4)) + 'px';
}

const ACT = {
  open: (d) => openWindow(d.id),
  close: () => closeAll(),
  backdrop: (d, e) => { if (e.target.classList.contains('win-wrap') && topWindow() !== 'result') closeAll(); },
  lake: (d) => { S.spot = +d.i; toast({ t: 'MOVED TO ' + SPOTS[S.spot].name, icon: 'cloud' }); closeAll(); },
  rodpick: (d) => { const r = RODS[+d.i]; if (+d.i > S.lv.rod) return toast({ t: 'BUY IT FROM OLD FINN', icon: 'lock' }); S.rod = +d.i; toast({ t: 'EQUIPPED ' + r.n, icon: 'rod' }); closeAll(); },
  stand: () => { emit('stand'); },
  toast: (d) => toast({ t: d.t, icon: d.i }),
  bagtab: (d) => { WS.bag.tab = d.v; WS.bag.sel = 0; renderWindow(); },
  bagsel: (d) => { WS.bag.sel = +d.i; renderWindow(); },
  tradetab: (d) => { WS.trade.tab = d.v; WS.trade.sel = 0; WS.trade.qty = 1; renderWindow(); },
  tradesel: (d) => { WS.trade.sel = +d.i; renderWindow(); },
  qty: (d) => { WS.trade.qty = Math.max(1, Math.min(99, WS.trade.qty + (+d.d))); renderWindow(); },
  trade: () => {
    const w = WS.trade, b = BAG.Fish[w.sel], buy = w.tab === 'Buy', p = (buy ? b.fish.price * 2 : b.fish.price) * w.qty;
    if (buy ? p > S.coins : b.q < w.qty) return toast({ t: buy ? 'NOT ENOUGH COINS' : 'NOT ENOUGH FISH', icon: 'x' });
    S.coins += buy ? -p : p; b.q += buy ? w.qty : -w.qty;
    toast({ t: (buy ? 'BOUGHT ' : 'SOLD ') + w.qty + ' ' + up(b.fish.name), icon: 'coin' }); w.qty = 1; renderWindow();
  },
  upgtab: (d) => { WS.upg.tab = d.v; renderWindow(); },
  upg: (d) => {
    const c = WS.upg.tab, g = GEAR[c][+d.i];
    if (g.price > S.coins) return toast({ t: 'NOT ENOUGH COINS', icon: 'x' });
    S.coins -= g.price; S.lv[c] = +d.i; if (c === 'rod') S.rod = +d.i;
    toast({ t: 'UPGRADED: ' + g.n, icon: 'star' }); renderWindow();
  },
  rent: (d) => {
    const p = PACKS[+d.i];
    if (p.price > S.coins) return toast({ t: 'NOT ENOUGH COINS', icon: 'x' });
    S.coins -= p.price; S.rent.left += p.sec; S.rent.total = S.rent.left;
    toast({ t: 'SEAT RENTED: ' + p.n, icon: 'clock' }); closeAll(); renderFishLayer();
  },
  dexsel: (d) => { WS.dex.sel = +d.i; renderWindow(); },
  qtab: (d) => { WS.quests.tab = d.v; renderWindow(); },
  tog: (d) => { WS.set[d.k] = !WS.set[d.k]; renderWindow(); },
  slide: (d, e) => { const r = e.target.closest('.sl').getBoundingClientRect(); WS.set[d.k] = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); renderWindow(); },
  keep: () => { BAG.Fish[FISH.indexOf(S.last.fish)].q++; toast({ t: 'ADDED TO BACKPACK', icon: 'bag' }); closeAll(); setPhase('idle'); },
  sellc: () => { S.coins += S.last.fish.price; toast({ t: '+' + S.last.fish.price + ' COINS', icon: 'coin' }); closeAll(); setPhase('idle'); },
  again: () => { closeAll(); setPhase('idle'); },
  npcc: (d) => {
    const [k, v] = d.a.split(':');
    if (k === 'line') { npc = { i: +v, n: 0, done: false }; renderNPC(); }
    else if (k === 'win') openWindow(v);
    else closeNPC();
  },
};

export function initUI() {
  ui.innerHTML = hudHTML() + `<div id="reelwrap"></div><div id="bangwrap"></div><div class="abs fish-layer" id="fl"></div><div id="winwrap"></div><div id="npcwrap"></div><div class="tip" id="tip" style="display:none"></div>`;
  fl = ui.querySelector('#fl'); tipEl = ui.querySelector('#tip');
  renderFishLayer();
  ui.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'); if (!a) { if (npc) skipNPC(); return; }
    const fn = ACT[a.dataset.act]; if (fn) fn(a.dataset, e);
  });
  ui.addEventListener('mousemove', showTip);
  on((type, d) => {
    if (type === 'phase') {
      renderFishLayer();
      if (d === 'result') { S.windows = ['result']; renderWindow(true); }
      else if (topWindow() === 'result') { S.windows = []; renderWindow(); }
    }
    if (type === 'toast') toast(d);
    if (type === 'seat') renderFishLayer();
  });
}

export function skipNPC() { if (!npc) return; const l = NPC_LINES[npc.i]; if (npc.n < l.t.length) npc.n = l.t.length; }

const cache = {};
const setText = (id, v) => { if (cache[id] !== v) { cache[id] = v; const el = ui.querySelector('#' + id); if (el) el.textContent = v; } };
const setHTML = (id, v) => { if (cache[id] !== v) { cache[id] = v; const el = ui.querySelector('#' + id); if (el) el.innerHTML = v; } };

export function frame_(dt) {
  const m = Math.floor(S.clock % 60), h = Math.floor(S.clock / 60);
  setText('h-clock', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  setText('h-coins', fmt(S.coins)); setText('h-spot', SPOTS[S.spot].name); setText('h-rod', RODS[S.rod].n);
  setHTML('h-xp', bar(S.xp / 100));
  const seated = S.seat !== null, showP = !seated && (S.near !== null || S.nearNpc) && !S.windows.length && !npc;
  const hs = ui.querySelector('#hud-seat'), pr = ui.querySelector('#prompt'), hr = ui.querySelector('#hud-rent');
  if (hs) hs.style.display = seated ? '' : 'none';
  if (hr) hr.style.display = S.rent.left > 0 ? '' : 'none';
  setText('h-rent', mmss(S.rent.left));
  if (pr) {
    setHTML('prompt', S.nearNpc ? '<span class="sh">PRESS <kbd>SPACE</kbd> TO TALK</span>' : S.rent.left > 0 ? '<span class="sh">PRESS <kbd>SPACE</kbd> TO SIT HERE</span>' : '<span class="sh pinkc">RENT A SEAT FROM OLD FINN</span>'); pr.style.display = showP && S._pl ? 'block' : 'none'; if (showP && S._pl) { const a = S.nearNpc && S._npl ? S._npl : S._pl; pr.style.left = a.x + 'px'; pr.style.top = a.y - 10 + 'px'; } }

  const p = S.phase;
  if (p === 'charging' && rf['f-pow']) {
    rf['f-pow'].firstChild.style.width = S.power * 100 + '%';
    rf['f-pow'].firstChild.style.setProperty('--c1', S.power > 0.8 ? 'var(--pink)' : S.power > 0.5 ? 'var(--gold)' : 'var(--lime)');
    rf['f-powt'].textContent = Math.round(3 + S.power * 27) + ' M';
  } else if (p === 'waiting' && rf['f-wait']) {
    dots += dt; rf['f-wait'].textContent = 'WAITING' + '.'.repeat(1 + ((dots * 2) | 0) % 3);
  } else if (p === 'bite') {
    if (rf['f-bite']) rf['f-bite'].style.width = S.biteLeft * 100 + '%';
    if (rf['f-bang'] && S._bob) { rf['f-bang'].style.left = S._bob.x - 4 + 'px'; rf['f-bang'].style.top = S._bob.y - 34 + 'px'; }
  } else if (p === 'reeling' && S.reel && rf['r-zone']) {
    const r = S.reel, H = 114;
    rf['r-zone'].style.bottom = r.pos * H + 'px'; rf['r-zone'].style.height = r.size * H + 'px';
    rf['r-zone'].style.filter = r.in ? 'none' : 'saturate(.4) brightness(.8)';
    rf['r-fish'].style.bottom = r.fp * H + 'px';
    rf['r-prog'].firstChild.style.height = r.prog * 100 + '%';
  }
  fl.style.display = npc ? 'none' : '';
  const ch = ui.querySelector('.hud-chat'); if (ch) ch.style.display = npc ? 'none' : '';
  if (npc) {
    const l = NPC_LINES[npc.i];
    if (npc.n < l.t.length) { npc.n = Math.min(l.t.length, npc.n + dt * 36); }
    else if (!npc.done) {
      npc.done = true;
      ui.querySelector('#npc-ch').innerHTML = l.c.map(([t, a], k) => `<button class="btn ${k % 2 ? 'v' : ''}" data-act="npcc" data-a="${a}">${t}</button>`).join('');
      ui.querySelector('#npc-skip').textContent = '';
    }
    const el = ui.querySelector('#npc-text'); if (el) el.textContent = l.t.slice(0, Math.floor(npc.n));
    const more = ui.querySelector('#npc-more'); if (more) more.style.display = npc.done ? 'inline' : 'none';
  }
}
