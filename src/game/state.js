// Single mock game state + tiny pub/sub. No persistence: this is a UI showcase.
export const S = {
  name: 'AYA', level: 7, xp: 62, coins: 12480, day: 12, clock: 9 * 60 + 40, weather: 'SUNNY',
  spot: 0, sel: 0,               // selected area, selected hotbar slot
  caught: 12, goal: 20, streak: 3,
  durability: 78, bait: 24,
  phase: 'idle',                 // idle | charging | waiting | bite | reeling | result
  power: 0, _dir: 1, cast: null, // cast = {p} power of the cast (0..1)
  reel: null, last: null,        // reel sim / last catch
  biteLeft: 1,
  seat: null, near: null, nearNpc: false, rod: 0,
  lv: { rod: 0, bait: 0, hook: 0, bag: 0 },   // owned tier (0 low / 1 medium / 2 high); bait & hook use the owned tier
  rent: { left: 0, total: 0 },   // seat rental, seconds
  lakeCount: [48, 16, 3],        // fish left in the lake, per species
  windows: [],                   // open window ids
};
const subs = new Set();
export const on = (fn) => (subs.add(fn), () => subs.delete(fn));
export const emit = (type, data) => subs.forEach((fn) => fn(type, data));
