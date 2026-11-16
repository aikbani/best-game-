// The screenshot scenes behind ?shot=start|play|moon|win|over. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (chase the nearest wish, keep clear of the
// firework rings and kites, fly to the moon once the wishes are gathered),
// so every frame is what a real game looks like and the same seed always
// gives the same frame.

import { FIELD, STEP, MOON } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 600;

/** Steer the lantern toward `target`, shoved away from danger when `careful`. */
function autopilot(state, careful, holdPoint, keepMoonClear) {
  const lantern = state.lantern;
  let targetX;
  let targetY;
  if (state.moonReady && holdPoint) {
    // Park beside the moon instead of flying into it, so the shot holds
    // the "almost there" moment instead of winning mid-staging.
    targetX = holdPoint.x;
    targetY = holdPoint.y;
  } else if (state.moonReady) {
    targetX = MOON.x;
    targetY = MOON.y;
  } else {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const wish of state.wishesList) {
      const d = Math.hypot(wish.x - lantern.x, wish.y - lantern.y);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = wish;
      }
    }
    if (nearest) {
      targetX = nearest.x;
      targetY = nearest.y;
    } else {
      targetX = FIELD.width / 2;
      targetY = FIELD.height / 2;
    }
  }

  let dx = targetX - lantern.x;
  let dy = targetY - lantern.y;
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  if (careful) {
    // Keep clear of an expanding firework ring that is about to reach us.
    for (const firework of state.fireworksList) {
      if (firework.warn > 0) continue;
      const d = Math.hypot(firework.x - lantern.x, firework.y - lantern.y);
      const ringGap = d - firework.radius;
      if (ringGap > -40 && ringGap < 90) {
        const awayX = (lantern.x - firework.x) / (d || 1);
        const awayY = (lantern.y - firework.y) / (d || 1);
        dx += awayX * 1.6;
        dy += awayY * 1.6;
      }
    }
    // Duck away from a kite sweeping toward us.
    for (const kite of state.kitesList) {
      const d = Math.hypot(kite.x - lantern.x, kite.y - lantern.y);
      if (d < 150) {
        dy += (lantern.y < kite.y ? -1 : 1) * 1.2;
        dx += (lantern.x < kite.x ? -1 : 1) * 0.4;
      }
    }
    const steerLength = Math.hypot(dx, dy) || 1;
    dx /= steerLength;
    dy /= steerLength;
  }

  if (keepMoonClear && !state.moonReady) {
    // While the wishes are still being gathered, stay out of the moon's
    // reach, so the 60th wish cannot be collected inside the win radius.
    const moonDistance = Math.hypot(MOON.x - lantern.x, MOON.y - lantern.y);
    if (moonDistance < 210) {
      dx += ((lantern.x - MOON.x) / (moonDistance || 1)) * 2.2;
      dy += ((lantern.y - MOON.y) / (moonDistance || 1)) * 2.2;
      const cleared = Math.hypot(dx, dy) || 1;
      dx /= cleared;
      dy /= cleared;
    }
  }

  return {
    mouseX: lantern.x + dx * 170,
    mouseY: lantern.y + dy * 170,
    mouseSeen: true,
    keyboard: { x: 0, y: 0 },
    gust: false,
  };
}

/**
 * Set `world` to the named scene (start, play, moon, win or over; any other
 * name is start) and return the screen to draw over it and the best score.
 */
export function stageShot(name, world, seed = 1) {
  world.reset(seed);
  if (name !== 'play' && name !== 'moon' && name !== 'win' && name !== 'over') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.stepAmbient(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  const careful = name !== 'over';

  // The moon shot parks the lantern beside the moon once the wishes are
  // gathered, holding the "almost there" frame instead of winning.
  if (name === 'moon') {
    const holdPoint = { x: MOON.x - 150, y: MOON.y + 35 };
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(world.state, true, holdPoint, true));
      if (events & EVENT_OVER) break;
      if (world.state.moonReady && !world.state.won) {
        const holdDistance = Math.hypot(
          world.state.lantern.x - holdPoint.x,
          world.state.lantern.y - holdPoint.y,
        );
        if (holdDistance < 30) return { screen: SCREEN_PLAY, best: world.state.score };
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }

  for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
    const events = world.step(STEP, autopilot(world.state, careful));
    if (name === 'play' && world.state.time >= PLAY_SECONDS) {
      // Hold the frame until a firework ring is mid-bloom, so the shot shows
      // the hazard as well as the wishes and the HUD (a few seconds at most).
      const ringShowing = world.state.fireworksList.some(
        (f) => f.warn <= 0 && f.radius > 25 && f.radius < 130,
      );
      const waitedTooLong = world.state.time >= PLAY_SECONDS + 6;
      if (ringShowing || waitedTooLong) return { screen: SCREEN_PLAY, best: world.state.score };
    }
    if (name === 'win' && (events & EVENT_WIN)) {
      return { screen: SCREEN_WIN, best: world.state.score };
    }
    if (events & EVENT_OVER) break;
    if (name === 'over' && world.state.time > 240) {
      // A careless pilot that never gets caught: let the flame run out instead.
      world.state.flame = 1;
    }
  }
  const over = world.state.over || world.state.lives === 0 || world.state.flame <= 0;
  if (name === 'over') return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  if (name === 'win') return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}
