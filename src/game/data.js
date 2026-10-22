import { FISH } from '../gfx/sprites.js';
import { S } from './state.js';
export { FISH };

export const SPOTS = [
  { name: 'LAKE 1', depth: '3 m', note: 'Easy waters' },
  { name: 'LAKE 2', depth: '5 m', note: 'Fast current' },
  { name: 'LAKE 3', depth: '2 m', note: 'Cozy and quiet' },
  { name: 'LAKE 4', depth: '40 m', note: 'Big catches' },
];
/* ---- gear: three tiers each (low / medium / high) ---- */
export const RODS = [
  { n: 'BAMBOO ROD', rarity: 'common', power: 3, control: 2, luck: 1, d: 'Light starter rod.', price: 0 },
  { n: 'STEEL ROD', rarity: 'rare', power: 6, control: 5, luck: 4, d: 'Wider catch zone.', price: 1500 },
  { n: 'GOLD ROD', rarity: 'legendary', power: 9, control: 8, luck: 7, d: 'The angler\'s dream.', price: 6000 },
];
export const BAITS = [
  { n: 'WORM', icon: 'bait', rarity: 'common', d: 'Common fish bite.', price: 0 },
  { n: 'LURE', icon: 'worm', rarity: 'rare', d: 'Attracts rare fish.', price: 800 },
  { n: 'GEM BAIT', icon: 'gem', rarity: 'legendary', d: 'Legendary fish bait.', price: 3500 },
];
export const HOOKS = [
  { n: 'BENT HOOK', rarity: 'common', d: 'Basic hook.', price: 0 },
  { n: 'SHARP HOOK', rarity: 'rare', d: '+3% catch zone.', price: 600 },
  { n: 'GOLD HOOK', rarity: 'legendary', d: '+6% catch zone.', price: 2800 },
];
export const OTHERS = [
  { n: 'SMALL PACK', rarity: 'common', d: '12 bag slots.', price: 0, slots: 12 },
  { n: 'FIELD PACK', rarity: 'rare', d: '18 bag slots.', price: 500, slots: 18 },
  { n: 'ANGLER PACK', rarity: 'legendary', d: '24 bag slots.', price: 2000, slots: 24 },
];
export const GEAR = { rod: RODS, bait: BAITS, hook: HOOKS, bag: OTHERS };

/* ---- seat rental ---- */
export const PACKS = [
  { n: '15 MIN', sec: 900, price: 150, note: 'QUICK TRIP' },
  { n: '30 MIN', sec: 1800, price: 270, note: 'SAVE 10%' },
  { n: '1 HOUR', sec: 3600, price: 500, note: 'BEST VALUE' },
];
export const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

/* ---- lake: chance per species (better bait = rarer fish) and how many are left ---- */
const BASE = [[70, 25, 5], [55, 33, 12], [40, 41, 19]];
export function lakeOdds() {
  const w = BASE[S.lv.bait].map((v, i) => (S.lakeCount[i] > 0 ? v : 0)), t = w.reduce((a, b) => a + b, 0) || 1;
  return FISH.map((fish, i) => ({ fish, pct: Math.round((w[i] / t) * 100), p: w[i] / t, count: S.lakeCount[i] }));
}

export const BAG = {
  Fish: FISH.map((f, i) => ({ fish: f, q: [5, 2, 1][i], size: [9, 48, 160][i] })),
  Gear: [
    ...RODS.map((r, i) => ({ icon: 'rod', n: r.n, d: r.d, rarity: r.rarity, eq: i === 0 })),
    ...HOOKS.map((h) => ({ icon: 'hook', n: h.n, d: h.d, rarity: h.rarity })),
  ],
  Bait: BAITS.map((b, i) => ({ icon: b.icon, n: b.n, d: b.d, q: [24, 6, 1][i], rarity: b.rarity })),
  Items: [
    { icon: 'heart', n: 'Snack', d: 'Restore 20 energy.', q: 3, rarity: 'common' },
    { icon: 'star', n: 'Lucky Charm', d: '+10% rare chance.', q: 2, rarity: 'rare' },
    { icon: 'scroll', n: 'Old Map', d: 'Leads to a secret spot.', q: 1, rarity: 'legendary' },
  ],
};
export const QUESTS = {
  Daily: [
    { t: 'Catch 20 fish', p: 12, m: 20, r: '200 coins', icon: 'book' },
    { t: 'Catch a Minnow', p: 1, m: 1, r: 'Worm x5', icon: 'bait', done: true },
    { t: 'Land a perfect reel', p: 0, m: 3, r: '1 Lure', icon: 'hook' },
    { t: 'Sell 5 fish', p: 3, m: 5, r: '80 XP', icon: 'coin' },
  ],
  Weekly: [
    { t: 'Catch 3 Violet Bass', p: 2, m: 3, r: 'Steel Rod voucher', icon: 'star' },
    { t: 'Fish at 3 spots', p: 2, m: 3, r: '500 coins', icon: 'cloud' },
    { t: 'Earn 5,000 coins', p: 3200, m: 5000, r: 'Gem Bait', icon: 'gem' },
  ],
  Trophies: [
    { t: 'First Catch', p: 1, m: 1, r: 'Done', icon: 'star', done: true },
    { t: 'Fishdex 3/12', p: 3, m: 12, r: 'Title: Angler', icon: 'book' },
    { t: 'Golden Whale', p: 0, m: 1, r: 'Legend badge', icon: 'gem' },
  ],
};
export const NPC_LINES = [
  { t: 'Ahoy, Aya! I am Old Finn. Seats by the lake are for rent. What can I do for you?',
    c: [['TELL ME MORE', 'line:1'], ['RENT A SEAT', 'win:rent'], ['BUY / SELL FISH', 'win:trade'], ['UPGRADES', 'win:upgrade'], ['LAKE DETAILS', 'win:lakeinfo'], ['BYE', 'close']] },
  { t: 'Rent a seat, walk to it and press SPACE. Hold to cast, press when the bobber jumps, then keep the fish in the zone. Better gear catches rarer fish!',
    c: [['BACK', 'line:0'], ['RENT A SEAT', 'win:rent']] },
];
export const fmt = (n) => n.toLocaleString('en-US');
