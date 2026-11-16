// LAMPION — tuning numbers and colours in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

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
  drainPerWave: 0.22,
  emberRefill: 24,
  wishRefill: 2,
};

/** The goal: gather this many wishes, then fly up to the crescent moon. */
export const WISH_GOAL = 60;
export const MOON = { x: 1130, y: 108, radius: 56, reachDistance: 96 };

export const LIVES = 3;
export const COMBO_WINDOW_SECONDS = 4;

/** A gust burst: a short dash, with a few charges that slowly come back. */
export const GUST = {
  maxCharges: 3,
  rechargeSeconds: 6,
  boostSpeed: 620,
  cooldownSeconds: 0.45,
};

/** Wishes are the fireflies the lantern gathers for score. */
export const WISH = {
  points: 10,
  radius: 11,
  interval: 0.9,
  intervalJitter: 0.5,
  minInterval: 0.42,
  driftSpeed: 26,
  lifetime: 14,
};

/** Embers are the glowing coals that feed the flame. */
export const EMBER = {
  radius: 12,
  interval: 2.6,
  intervalJitter: 1.2,
  driftSpeed: 18,
  lifetime: 16,
};

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

/** Seconds of play per wave; difficulty stops growing at the last wave. */
export const WAVE = { seconds: 20, max: 10 };

/** How many of each thing can exist at once; pools are allocated once, at boot. */
export const POOL = { wishes: 26, embers: 10, fireworks: 6, kites: 5, particles: 320, windStreaks: 40 };

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
  text: '#fdf6e3',
  muted: '#b9b3d6',
  panel: 'rgba(16, 14, 42, 0.72)',
  danger: '#ff5d73',
  good: '#8be28b',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lampion.best';
