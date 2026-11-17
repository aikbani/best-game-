// The screenshot scenes behind ?shot=start|play|boss|win. Each one plays the
// real rules forward from a fresh world for a fixed stretch, steered by a
// simple autopilot (chase the nearest wish, kindle the nearest lamp, fly the
// gate, pick the first upgrade card, dodge the hazards, crown the Kite King),
// so every frame is what a real game looks like and the same seed always
// gives the same frame. The win scene plays the whole seven-night run.

import { FIELD, STEP, MOON, GATE } from './config.js';
import { EVENT_OVER, EVENT_WIN, EVENT_NIGHT } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const LIMIT_SECONDS = 1500;

/** Steer the lantern toward `target`, shoved away from danger when `careful`. */
function autopilot(state, run, careful) {
  const lantern = state.lantern;
  const boss = state.boss;
  let targetX = FIELD.width / 2;
  let targetY = FIELD.height / 2;
  let targetingCrown = false;

  // The Kite King's telegraph: get clear of the warn shadow first.
  if (boss && boss.hp > 0 && boss.mode === 'warn') {
    const d = Math.hypot(boss.warnX - lantern.x, boss.warnY - lantern.y) || 1;
    targetX = lantern.x + ((lantern.x - boss.warnX) / d) * 220;
    targetY = lantern.y + ((lantern.y - boss.warnY) / d) * 220;
  } else if (state.flame < 35 && state.embersList.length > 0) {
    // Flame low: feed it before anything else.
    let nearest = null;
    let nearestDistance = Infinity;
    for (const ember of state.embersList) {
      const d = Math.hypot(ember.x - lantern.x, ember.y - lantern.y);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = ember;
      }
    }
    if (nearest) {
      targetX = nearest.x;
      targetY = nearest.y;
    }
  } else if (state.nightDef.special === 'climb') {
    if (state.wishes < state.wishesGoal) {
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
        targetY = lantern.y - 200;
      }
    } else {
      targetX = MOON.x;
      targetY = MOON.y;
    }
  } else if (state.wishes < state.wishesGoal) {
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
    }
  } else {
    const unlit = state.lamps.filter((lamp) => !lamp.lit);
    if (unlit.length > 0) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const lamp of unlit) {
        const d = Math.hypot(lamp.x - lantern.x, lamp.y - lantern.y);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = lamp;
        }
      }
      targetX = nearest.x;
      targetY = nearest.y;
      targetingCrown = !!nearest.crown;
    } else if (state.gateOpen) {
      targetX = GATE.x + GATE.width / 2;
      targetY = GATE.y + GATE.height / 2;
    }
  }

  let dx = targetX - lantern.x;
  let dy = targetY - lantern.y;
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  if (careful) {
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
    for (const kite of state.kitesList) {
      const d = Math.hypot(kite.x - lantern.x, kite.y - lantern.y);
      if (d < 150) {
        dy += (lantern.y < kite.y ? -1 : 1) * 1.2;
        dx += (lantern.x < kite.x ? -1 : 1) * 0.4;
      }
    }
    if (boss && boss.hp > 0 && !targetingCrown) {
      const d = Math.hypot(boss.x - lantern.x, boss.y - lantern.y);
      if (d < 170) {
        dx += ((lantern.x - boss.x) / (d || 1)) * 1.4;
        dy += ((lantern.y - boss.y) / (d || 1)) * 1.4;
      }
    }
    const steerLength = Math.hypot(dx, dy) || 1;
    dx /= steerLength;
    dy /= steerLength;
  }

  // Gust when the target is far and a charge is ready.
  const gust = length > 320 && state.gustCharges > 0 && state.gustCooldown <= 0;

  return {
    mouseX: lantern.x + dx * 170,
    mouseY: lantern.y + dy * 170,
    mouseSeen: true,
    keyboard: { x: 0, y: 0 },
    gust,
  };
}

/**
 * Set `world` to the named scene (start, play, boss or win; any other name
 * is start) and return the screen to draw over it and the best score.
 */
export function stageShot(name, world, seed = 1) {
  world.reset(seed);
  if (name !== 'play' && name !== 'boss' && name !== 'win') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.stepAmbient(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
    const events = world.step(STEP, autopilot(world.state, world.run, true));
    if (events & EVENT_NIGHT) {
      // Between nights the autopilot takes the first blessing card.
      const choices = world.drawUpgradeChoices();
      if (choices.length > 0) world.applyUpgrade(choices[0].id);
      world.startNight(world.state.night + 1);
      continue;
    }
    if (events & EVENT_OVER) break;
    if (name === 'play' && world.state.night === 3 && world.state.time >= 10) {
      const ringShowing = world.state.fireworksList.some(
        (f) => f.warn <= 0 && f.radius > 25 && f.radius < 130,
      );
      const waitedTooLong = world.state.time >= 18;
      if (ringShowing || waitedTooLong) return { screen: SCREEN_PLAY, best: world.run.score };
    }
    if (name === 'boss' && world.state.night === 6 && world.state.boss
      && world.state.boss.hp <= 2 && world.state.time >= 8) {
      return { screen: SCREEN_PLAY, best: world.run.score };
    }
    if (name === 'win' && (events & EVENT_WIN)) {
      return { screen: SCREEN_WIN, best: world.run.score };
    }
  }
  if (name === 'win') return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.run.score };
  return { screen: SCREEN_PLAY, best: world.run.score };
}
