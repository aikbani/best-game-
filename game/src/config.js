// LAMPION v3 — "Seven Nights to the Moon": tuning numbers, night definitions
// and colours in one place. The playfield is a fixed 1280x720 logical area;
// Night 7 climbs above it (a taller world, scrolled by the camera), so no
// rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, marketTop: 576, groundY: 700 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The paper lantern the player flies. */
export const LANTERN = {
  radius: 26,
  followStrength: 7.5,
  keyboardAccel: 2600,
  maxSpeed: 430,
  drag: 2.6,
  invulnerableSeconds: 2.0,
  collectRadius: 40,
};

/** The flame that keeps the lantern aloft: it always burns down. */
export const FLAME = {
  max: 100,
  drainPerSecond: 1.7,
  emberRefill: 24,
  wishRefill: 2,
  boatRefill: 5,
};

/** The crescent moon, and the gate every night opens toward. */
export const MOON = { x: 640, y: -1320, radius: 64, reachDistance: 110 };
export const GATE = { x: 1180, y: 300, width: 64, height: 170 };

export const LIVES = 3;
export const COMBO_WINDOW_SECONDS = 4;

/** A gust burst: a short dash, with charges that slowly come back. */
export const GUST = {
  maxCharges: 3,
  rechargeSeconds: 6,
  boostSpeed: 620,
  cooldownSeconds: 0.45,
  activeSeconds: 0.5,
};

/** Wishes are the fireflies the lantern gathers for score. */
export const WISH = {
  points: 10,
  radius: 11,
  interval: 0.9,
  intervalJitter: 0.5,
  minInterval: 0.42,
  driftSpeed: 26,
  lifetime: 16,
};

/** Embers are the glowing coals that feed the flame. */
export const EMBER = {
  radius: 12,
  interval: 2.6,
  intervalJitter: 1.2,
  driftSpeed: 18,
  lifetime: 18,
  points: 2,
};

/** Paper boats drift on the river (Night 3): +25 and a little flame. */
export const BOAT = { points: 25, interval: 4.0, radius: 22, speed: 55 };

/** Fireworks bloom into an expanding ring; touching the ring stings. */
export const FIREWORK = {
  interval: 3.4,
  intervalJitter: 1.4,
  minInterval: 1.5,
  expandSpeed: 170,
  maxRadius: 150,
  ringWidth: 15,
  warnSeconds: 0.7,
};

/** Black kites sweep across the sky and knock the lantern about. */
export const KITE = {
  interval: 5.2,
  intervalJitter: 2.0,
  minInterval: 2.6,
  speed: 265,
  speedPerWave: 22,
};

/** A wind band that shoves the lantern sideways while it lasts. */
export const WIND = {
  interval: 7.5,
  intervalJitter: 2.5,
  duration: 2.6,
  push: 240,
};

/** How many of each thing can exist at once; pools are allocated once, at boot. */
export const POOL = { wishes: 26, embers: 10, fireworks: 6, kites: 6, boats: 5, particles: 320, floats: 24 };

/** The seven nights. Realm shifts as the run climbs: market, river, sky. */
export const NIGHTS = [
  { n: 1, name: 'First Light', sub: 'Kindle the lamps, gather the wishes', realm: 'market', wishes: 10, lamps: 3, firework: 3.8, kite: 6.0, wind: 9.0, special: 'intro' },
  { n: 2, name: 'Mirror Shards', sub: 'Gust through a shard — its beam kindles a whole row', realm: 'market', wishes: 12, lamps: 4, firework: 3.4, kite: 5.6, wind: 8.0, special: 'mirrors' },
  { n: 3, name: 'River Wind', sub: 'Strong wind bands — ride the paper boats', realm: 'river', wishes: 14, lamps: 4, firework: 3.2, kite: 5.2, wind: 5.0, special: 'river' },
  { n: 4, name: 'Kite Flock', sub: 'Kites fly in squadrons — near misses chain', realm: 'river', wishes: 16, lamps: 5, firework: 3.0, kite: 4.2, wind: 7.0, special: 'flock' },
  { n: 5, name: 'Firework Storm', sub: 'The sky is burning — embers are worth double', realm: 'sky', wishes: 18, lamps: 5, firework: 1.9, kite: 5.0, wind: 7.5, special: 'storm' },
  { n: 6, name: 'The Kite King', sub: 'Kindle his three crown-lamps to bring him down', realm: 'sky', wishes: 10, lamps: 3, firework: 3.0, kite: 99, wind: 8.0, special: 'boss' },
  { n: 7, name: 'Moon Ascent', sub: 'Climb the star-stair to the moon', realm: 'sky', wishes: 8, lamps: 0, firework: 2.6, kite: 4.6, wind: 6.5, special: 'climb' },
];

/** Night 7's taller world: the moon waits this far above the field. */
export const CLIMB = { topY: -1440, checkpointEvery: 480, fallMargin: 60 };

/** The Kite King: one huge kite, three crown-lamps, telegraphed swoops. */
export const BOSS = {
  hp: 3,
  radius: 78,
  hoverY: 190,
  warnSeconds: 0.8,
  swoopSeconds: 0.6,
  swoopSpeed: 780,
  recoverSeconds: 1.1,
  hoverSeconds: 2.4,
  defeatBonus: 500,
};

export const WIN_BONUS = 1000;
export const LAMP_POINTS = 50;
export const MIRROR_CHAIN_BONUS = 100;
export const NEAR_MISS_POINTS = 25;

/** Between-night upgrade cards (pick 1 of 3). */
export const UPGRADES = [
  { id: 'flame', name: 'Deep Wick', desc: '+25 max flame', icon: '🔥' },
  { id: 'gust', name: 'Second Wind', desc: '+1 gust charge', icon: '💨' },
  { id: 'magnet', name: 'Wish Magnet', desc: 'Pickup radius +60%', icon: '🧲' },
  { id: 'ember', name: 'Rich Embers', desc: 'Embers worth +10, +6 flame', icon: '✨' },
  { id: 'shield', name: 'Paper Shield', desc: 'Absorb one hit each night', icon: '🛡️' },
  { id: 'combo', name: 'Long Glow', desc: 'Combo window +2s', icon: '⏳' },
  { id: 'mult', name: 'Bright Wish', desc: 'Score multiplier +0.5x', icon: '⭐' },
];

export const PALETTE = {
  skyTop: '#0d1030',
  skyMid: '#1c2150',
  skyLow: '#3a2a63',
  horizonGlow: '#e8833a',
  star: '#f4ead2',
  moon: '#f7e9b8',
  moonGlow: '#f9d976',
  marketRoof: '#5d2a33',
  marketWall: '#2c1c2e',
  stallGlow: '#ffb347',
  stallGlowHot: '#ffcf7d',
  awningA: '#c94f43',
  awningB: '#f2e3c6',
  lanternBody: '#ff9e3d',
  lanternHot: '#ffd27d',
  lanternRim: '#d96f1e',
  wish: '#ffe066',
  wishCore: '#fff7ae',
  ember: '#ff7a2f',
  firework: '#ff5d73',
  kite: '#14101f',
  river: '#16264d',
  riverShine: '#3d6fb4',
  cloud: '#2a2f63',
  text: '#fdf6e3',
  muted: '#b9b3d6',
  panel: 'rgba(16, 14, 42, 0.72)',
  danger: '#ff5d73',
  good: '#8be28b',
  gate: '#8be28b',
  boss: '#ff5d73',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lampion.best.v3';
