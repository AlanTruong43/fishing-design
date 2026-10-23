import { C } from './palette.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ---------- 9-slice generator: ring-bevel box, drawn pixel by pixel ---------- */
function nine({ size = 12, outline = C.navy, fill, light, dark, bevel = 2, notch = true }) {
  const c = mk(size, size), g = c.getContext('2d');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.min(x, y, size - 1 - x, size - 1 - y);
    const corner = (x === 0 || x === size - 1) && (y === 0 || y === size - 1);
    let col = null;
    if (d === 0) col = corner && notch ? null : outline;
    else if (d <= bevel) {
      const tl = Math.min(x, y), br = Math.min(size - 1 - x, size - 1 - y);
      col = tl < br ? light : tl > br ? dark : (x < size / 2 ? light : dark);
    } else col = fill;
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return c.toDataURL();
}

const skins = {
  panel:      { fill: C.indigo, light: C.violet, dark: C.violetD, bevel: 1 },
  panelDark:  { fill: C.navy, light: C.indigo, dark: '#15132e', bevel: 1, outline: '#15132e' },
  panelLight: { fill: C.cloud, light: C.white, dark: C.greyL, bevel: 1 },
  btn:        { fill: C.lime, light: '#f6ffa0', dark: C.limeD },
  btnHover:   { fill: '#f1ff7c', light: C.white, dark: C.limeD },
  btnDown:    { fill: C.limeD, light: '#8aa012', dark: C.limeD },
  btnV:       { fill: C.violet, light: C.violetL, dark: C.violetD },
  btnVHover:  { fill: '#7a4aff', light: '#b19bff', dark: C.violetD },
  btnVDown:   { fill: C.violetD, light: '#2c1280', dark: C.violetD },
  btnGrey:    { fill: C.grey, light: C.greyL, dark: C.greyD },
  btnPink:    { fill: C.pink, light: '#ff8cc8', dark: C.pinkD },
  slot:       { fill: '#15132e', light: '#0d0c20', dark: C.indigo, bevel: 1, outline: C.navy },
  slotSel:    { fill: '#15132e', light: C.limeD, dark: C.limeD, bevel: 1, outline: C.lime },
  bar:        { fill: '#15132e', light: '#0d0c20', dark: C.indigo, bevel: 1, size: 8 },
  tab:        { fill: C.violetD, light: C.violet, dark: '#2c1280', bevel: 1 },
  tabOn:      { fill: C.lime, light: '#f6ffa0', dark: C.limeD, bevel: 1 },
  plate:      { fill: C.violet, light: C.violetL, dark: C.violetD, outline: C.navy },
  wood:       { fill: C.wood, light: C.woodL, dark: C.woodD },
};

/* ---------- icon maps: '.' transparent, letters index into the pal ---------- */
const ICON_PAL = {
  o: C.navy, w: C.white, l: C.lime, y: C.gold, O: C.orange, r: C.red, p: C.pink, g: C.green, G: C.greenM,
  b: C.waterL, B: C.water, v: C.violet, V: C.violetL, n: C.wood, N: C.woodD, k: C.greyL, K: C.grey, c: C.cloud,
};
const ICONS = {
  coin: ['..oooo..', '.oyyyyo.', 'oyywwyyo', 'oyywyyyo', 'oyywyyyo', 'oyyyyyOo', '.oOOOOo.', '..oooo..'],
  rod: ['......oo', '.....onO', '....onO.', '...onO..', '..onO...', '.onO....', 'onO.....', 'oo......'],
  bait: ['........', '..oooo..', '.opppro.', 'oppooppo', 'opo..opo', '.oo..opo', '......oo', '........'],
  bag: ['..oooo..', '.onNNno.', '.onnnno.', 'onnnnnno', 'onnyynno', 'onnnnnno', 'onnnnnno', '.oooooo.'],
  shop: ['.oooooo.', 'orwrwrwo', 'orwrwrwo', '.oooooo.', '.onnnno.', '.onoono.', '.onoono.', '.oooooo.'],
  book: ['.oooooo.', 'obbbbbbo', 'obwwbwbo', 'obbbbbbo', 'obwwwbbo', 'obbbbbbo', 'oBBBBBBo', '.oooooo.'],
  scroll: ['.oooooo.', 'occccccco'.slice(0, 8), 'ocooooco', 'occccccco'.slice(0, 8), 'ocooooco', 'occccccco'.slice(0, 8), 'ocooooco', '.oooooo.'],
  cog: ['...oo...', 'o.oKKo.o', '.oKkkKo.', 'oKkookKo', 'oKkookKo', '.oKkkKo.', 'o.oKKo.o', '...oo...'],
  sun: ['o..oo..o', '.o.yy.o.', '..yyyy..', 'oyyyyyyo', 'oyyyyyyo', '..yyyy..', '.o.yy.o.', 'o..oo..o'],
  cloud: ['........', '...cc...', '..cccc..', '.ccccccc', 'cccccccc', 'cccccccc', '.cKKKKc.', '........'],
  rain: ['..cccc..', '.cccccc.', 'cccccccc', '.cccccc.', '..b..b..', '.b..b...', '..b..b..', '.b..b...'],
  star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyy yy.'.replace(' ', 'y'), '.yy..yy.', '.y....y.'],
  clock: ['..oooo..', '.owwwwo.', 'owwowwwo', 'owwowwwo', 'owwooowo', 'owwwwwwo', '.owwwwo.', '..oooo..'],
  heart: ['.oo..oo.', 'orrooorro'.slice(0, 8), 'orwrrrro', 'orrrrrro', '.orrrro.', '..orro..', '...oo...', '........'],
  hook: ['...oo...', '...oK...', '...oK...', '...oK...', 'o..oK...', 'oK.oK...', '.oKKo...', '..oo....'],
  worm: ['........', '........', '.oo.....', 'opoo.oo.', 'oppppppo', '.oooooo.', '........', '........'],
  fork: ['........', '.o....o.', '.o.oo.o.', '.oooooo.', '..oKKo..', '...oo...', '...oo...', '........'],
  gem: ['..oooo..', '.obbbbo.', 'obwbbBbo', 'obbbbBBo', '.obbBBo.', '..obBo..', '...oo...', '........'],
  lock: ['..oooo..', '.oK..Ko.', '.o....o.', 'oyyyyyyo', 'oyyooyyo', 'oyyooyyo', 'oyyyyyyo', '.oooooo.'],
  x: ['........', '.oo..oo.', '..oooo..', '...oo...', '..oooo..', '.oo..oo.', '........', '........'],
  plus: ['........', '...oo...', '...oo...', '.oooooo.', '.oooooo.', '...oo...', '...oo...', '........'],
  arrowL: ['....o...', '...oo...', '..ooo...', '.oooooo.', '.oooooo.', '..ooo...', '...oo...', '....o...'],
  arrowR: ['...o....', '...oo...', '...ooo..', '.oooooo.', '.oooooo.', '...ooo..', '...oo...', '...o....'],
  bobber: ['...oo...', '..orro..', '.orrrro.', '.owwwwo.', '.owwwwo.', '..owwo..', '...oo...', '........'],
};
ICONS.scroll = ['.oooooo.', 'occccccc', 'ocooooco', 'occccccc', 'ocooooco', 'occccccc', 'ocooooco', '.oooooo.'].map(r => r.slice(0, 8));
ICONS.star = ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', '.y....y.'];
ICONS.heart = ['.oo..oo.', 'orrooorr', 'orwrrrro', 'orrrrrro', '.orrrro.', '..orro..', '...oo...', '........'];

/* ---------- fish template: 16x10 ---------- */
const FISH_LONG = [
  '................', '..........ooo...', '....oooooo.FFo..', '..ooBBBBBBoFFFo.', '.oBBBBBBBBBoFFo.',
  'oBBeBBBBBBBBooo.', 'oBBBBbbbbbbBoo..', '.oobbbbbbboo....', '...oooooooo.....', '................',
];
const FISH_ROUND = [
  '................', '....oooooo......', '..ooBBBBBBoo.oo.', '.oBBBBBBBBBoFFFo', 'oBBeBBBBBBBBoFFo',
  'oBBBBBBBBBBBBoFo', 'oBBBBbbbbbBBoFFo', '.oobbbbbbbboFFo.', '...oooooooooo...', '................',
];
export const FISH = [
  { id: 'minnow', name: 'Minnow',       rarity: 'common',    tier: 'LOW',  shape: FISH_LONG,  body: C.greyL,  belly: C.cloud,  fin: C.grey,   price: 20,  size: [6, 14],    bait: 'Worm',     time: 'Any',   weather: 'Any',   area: 'Lake' },
  { id: 'bass',   name: 'Violet Bass',  rarity: 'rare',      tier: 'MID',  shape: FISH_ROUND, body: C.violet, belly: C.violetL, fin: C.violetD, price: 120, size: [35, 70],   bait: 'Lure',     time: 'Dusk',  weather: 'Any',   area: 'Lake' },
  { id: 'gold',   name: 'Golden Whale', rarity: 'legendary', tier: 'HIGH', shape: FISH_ROUND, body: C.gold,   belly: C.white,  fin: C.orange, price: 600, size: [120, 240], bait: 'Gem Bait', time: 'Night', weather: 'Clear', area: 'Lake' },
];

const fishCache = {};
function fishCanvas(f, silhouette) {
  const c = mk(16, 10), g = c.getContext('2d');
  f.shape.forEach((row, y) => [...row].forEach((ch, x) => {
    let col = null;
    if (ch === 'o') col = C.navy;
    else if (ch === 'B') col = f.body;
    else if (ch === 'b') col = f.belly;
    else if (ch === 'F') col = f.fin;
    else if (ch === 'e') col = C.white;
    if (!col) return;
    g.fillStyle = silhouette ? '#0d0c20' : col; g.fillRect(x, y, 1, 1);
    if (ch === 'e' && !silhouette) { g.fillStyle = C.navy; g.fillRect(x, y, 1, 1); g.fillStyle = C.white; g.fillRect(x - 1, y - 0, 0, 0); }
  }));
  return c;
}
export function fishURL(f, silhouette = false) {
  const k = f.id + silhouette;
  return fishCache[k] || (fishCache[k] = fishCanvas(f, silhouette).toDataURL());
}

const iconCache = {};
export function iconURL(name) {
  if (iconCache[name]) return iconCache[name];
  const rows = ICONS[name]; const c = mk(8, 8), g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const col = ICON_PAL[ch]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }));
  return (iconCache[name] = c.toDataURL());
}
export const iconNames = Object.keys(ICONS);

/* ---------- character & NPC (16x24 maps) ---------- */
const fix = (rows) => rows.map((r) => r.padEnd(16, '.').slice(0, 16));
export const PLAYER = fix([
  '.....oooooo.....', '...ooHhhhhHoo...', '..oHhhhhhhhhHo..', '..ohhhhhhhhhho..', '..ohhhhhhhhhho..',
  '..ohhsshhsshho..', '..ossssssssso...', '..ossessssesso..', '..ossessssesso..', '..osccsmmsccso..',
  '....ooosssooo...', '...obbbbbbbbbo..', '..obbbbbbbbbbbo.', '..osobbbbbbboso.', '..osobbbBBbboso.',
  '..ooobbbbbbooo..',
  '....ojjjjjjo....', '....ojjJJjjo....', '....ojjo.ojjo...', '....ojjo.ojjo...', '....ojjo.ojjo...',
  '...okkko.okkko..', '...ooooo.ooooo..', '................',
]);
export const PLAYER_LEGS_B = fix([
  '....ojjjjjjo....', '....ojjJJjjo....', '...ojjo...ojjo..', '...ojjo....ojjo.', '..ojjo......ojjo',
  '..okko......okko', '..oooo......oooo', '................',
]);
export const NPC = fix([
  '.....oooooo.....', '...ootttttttoo..', '...otttttttttTo.', '...oRRRRRRRRRTo.', '.oottttttttttToo',
  '..onnSSSSSSSnno.', '..onnsesssesnno.', '..onnssssssssno.', '..onnmmmmmmmnno.', '...onnssssssno..',
  '....onnnnnnno...', '...oggggggggggo.', '..ogjggggggjggo.', '..osojjjjjjjjoso', '..osojjyjjyjjoso',
  '..ooojjjjjjjooo.',
  '...ojjjjjjjjjo..', '...ojjJjjJjjjo..', '...ojjo..ojjo...', '...ojjo..ojjo...', '...ojjo..ojjo...',
  '..okkko..okkko..', '..oooo....oooo..', '................',
]);
export const PL_PAL = { o: '#26253f', h: '#eab43e', H: '#b87a2a', s: '#ffd2a8', S: '#e2a47e', g: '#3d6a9a', l: '#bfe6f4', w: '#ffffff', c: '#f09a8a', e: '#2a2a44', m: '#c8584a', b: '#4aa4e8', B: '#2f78c0', j: '#4d68ac', J: '#2e4380', k: '#3b2a2e' };
export const NPC_PAL = { o: '#26253f', t: '#f2d79c', T: '#c79a58', R: '#b8402e', n: '#6a3e2a', s: '#f0b890', S: '#d79a78', e: '#2a2a44', m: '#4a2a1c', g: '#3f9a5a', j: '#3f5fa6', J: '#2b4486', y: '#e8c060', k: '#4a2a1e' };
export const CH_PAL = PL_PAL;
export function drawMap(g, rows, x, y, pal = PL_PAL, flip = false) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    const col = pal[ch]; if (!col) return;
    g.fillStyle = col; g.fillRect(x + (flip ? row.length - 1 - i : i), y + j, 1, 1);
  }));
}
function mapURL(rows, pal) { const c = mk(16, 24), g = c.getContext('2d'); drawMap(g, rows, 0, 0, pal); return c.toDataURL(); }
export const portraitURL = { player: () => mapURL(PLAYER, PL_PAL), npc: () => mapURL(NPC, NPC_PAL) };

/* ---------- install: CSS vars for nine-slices + cursor ---------- */
export function installSkins() {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(skins)) root.setProperty('--n-' + k, `url(${nine(v)})`);
}
export function installCursor(px) {
  const rows = ['o.......', 'oo......', 'owo.....', 'owwo....', 'owwwo...', 'owwwwo..', 'owwoooo.', 'owo.....', 'oo......', 'o.......'];
  const c = mk(8 * px, 10 * px), g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = ch === 'o' ? C.navy : C.lime; g.fillRect(x * px, y * px, px, px); }));
  let st = document.getElementById('cursor-style');
  if (!st) { st = document.createElement('style'); st.id = 'cursor-style'; document.head.append(st); }
  st.textContent = `*{cursor:url(${c.toDataURL()}) 0 0, auto !important}`;
}
