// LAMPION's world: the lantern, its flame, the wishes and embers it gathers,
// the fireworks, kites and wind that threaten it, and the waves that make the
// night busier. One fixed step at a time; rendering and sound live elsewhere.

import {
  FIELD, STEP, LANTERN, FLAME, WISH_GOAL, MOON, LIVES, COMBO_WINDOW_SECONDS,
  GUST, WISH, EMBER, FIREWORK, KITE, WIND, WAVE, POOL,
} from './config.js';
import { createSeededRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_WISH = 1;
export const EVENT_EMBER = 2;
export const EVENT_HIT = 4;
export const EVENT_WIN = 8;
export const EVENT_OVER = 16;
export const EVENT_GUST = 32;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld() {
  const world = {
    state: null,
    rng: createSeededRandom(1),
    seed: 1,
  };

  function freshState() {
    return {
      time: 0,
      lantern: { x: FIELD.width * 0.3, y: FIELD.height * 0.55, vx: 0, vy: 0, invulnerable: 0, tilt: 0 },
      flame: FLAME.max,
      score: 0,
      wishes: 0,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      lives: LIVES,
      wave: 1,
      waveTimer: 0,
      gustCharges: GUST.maxCharges,
      gustRecharge: 0,
      gustCooldown: 0,
      moonReady: false,
      won: false,
      over: false,
      wishesList: [],
      embersList: [],
      fireworksList: [],
      kitesList: [],
      particles: [],
      wind: { active: false, timeLeft: 0, direction: 1, timer: WIND.interval },
      wishTimer: 0.4,
      emberTimer: 1.2,
      fireworkTimer: 2.4,
      kiteTimer: 4.0,
      flashes: [],
    };
  }

  world.reset = function reset(seed) {
    world.seed = seed;
    world.rng = createSeededRandom(seed);
    world.state = freshState();
    // A few wishes are already drifting when play begins.
    for (let i = 0; i < 5; i += 1) spawnWish(world.state, true);
  };

  function spawnParticle(state, x, y, color, speed, life, size) {
    if (state.particles.length >= POOL.particles) state.particles.shift();
    const angle = world.rng() * Math.PI * 2;
    const v = speed * (0.4 + world.rng() * 0.8);
    state.particles.push({
      x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 20,
      life, maxLife: life, color, size: size * (0.6 + world.rng() * 0.8),
    });
  }

  world.burst = function burst(x, y, color, count, speed) {
    const state = world.state;
    for (let i = 0; i < count; i += 1) spawnParticle(state, x, y, color, speed, 0.5 + world.rng() * 0.7, 2.5);
  };

  function spawnWish(state, anywhere) {
    if (state.wishesList.length >= POOL.wishes) return;
    const y = anywhere
      ? 90 + world.rng() * (FIELD.marketTop - 180)
      : 70 + world.rng() * (FIELD.marketTop - 160);
    state.wishesList.push({
      x: 60 + world.rng() * (FIELD.width - 120),
      y,
      phase: world.rng() * Math.PI * 2,
      age: 0,
      lifetime: WISH.lifetime,
      active: true,
    });
  }

  function spawnEmber(state) {
    if (state.embersList.length >= POOL.embers) return;
    state.embersList.push({
      x: 60 + world.rng() * (FIELD.width - 120),
      y: 80 + world.rng() * 180,
      phase: world.rng() * Math.PI * 2,
      age: 0,
      lifetime: EMBER.lifetime,
      active: true,
    });
  }

  function spawnFirework(state) {
    if (state.fireworksList.length >= POOL.fireworks) return;
    // Never bloom right on top of the lantern: the warning must be dodgeable.
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      x = 120 + world.rng() * (FIELD.width - 240);
      y = 90 + world.rng() * (FIELD.marketTop - 260);
      if (distance(x, y, state.lantern.x, state.lantern.y) >= 190) break;
    }
    state.fireworksList.push({ x, y, radius: 0, warn: FIREWORK.warnSeconds, active: true, hue: world.rng() });
    state.flashes.push({ x, y, life: FIREWORK.warnSeconds });
  }

  function spawnKite(state) {
    if (state.kitesList.length >= POOL.kites) return;
    const fromLeft = world.rng() < 0.5;
    const speed = (KITE.speed + (state.wave - 1) * KITE.speedPerWave) * (0.85 + world.rng() * 0.3);
    state.kitesList.push({
      x: fromLeft ? -70 : FIELD.width + 70,
      y: 120 + world.rng() * (FIELD.marketTop - 220),
      vx: fromLeft ? speed : -speed,
      flap: world.rng() * Math.PI * 2,
      active: true,
    });
  }

  function difficultyScale(state) {
    return Math.min(WAVE.max, state.wave);
  }

  function hurtLantern(state, fromX, fromY) {
    const lantern = state.lantern;
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    lantern.invulnerable = LANTERN.invulnerableSeconds;
    const away = Math.atan2(lantern.y - fromY, lantern.x - fromX);
    lantern.vx += Math.cos(away) * 320;
    lantern.vy += Math.sin(away) * 320 - 120;
    world.burst(lantern.x, lantern.y, '#ff5d73', 22, 190);
    if (state.lives <= 0) {
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function collectWish(state, wish) {
    wish.active = false;
    state.wishes += 1;
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW_SECONDS;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const multiplier = 1 + Math.min(4, Math.floor(state.combo / 4));
    state.score += WISH.points * multiplier;
    state.flame = Math.min(FLAME.max, state.flame + FLAME.wishRefill);
    world.burst(wish.x, wish.y, '#ffe066', 12, 120);
    if (state.wishes >= WISH_GOAL) state.moonReady = true;
    return EVENT_WISH;
  }

  function collectEmber(state, ember) {
    ember.active = false;
    state.flame = Math.min(FLAME.max, state.flame + FLAME.emberRefill);
    state.score += 2;
    world.burst(ember.x, ember.y, '#ff7a2f', 10, 100);
    return EVENT_EMBER;
  }

  /** Advance the world one fixed step. `ctrl` carries the player's steering. */
  world.step = function step(dt, ctrl) {
    const state = world.state;
    if (state.won || state.over) return EVENT_NONE;
    let events = EVENT_NONE;
    state.time += dt;

    // Waves: every WAVE.seconds the night gets busier, up to the last wave.
    state.waveTimer += dt;
    if (state.waveTimer >= WAVE.seconds && state.wave < WAVE.max) {
      state.wave += 1;
      state.waveTimer = 0;
    }
    const waveScale = difficultyScale(state);

    // The flame always burns, faster in later waves.
    state.flame -= (FLAME.drainPerSecond + (waveScale - 1) * FLAME.drainPerWave) * dt;
    if (state.flame <= 0) {
      state.flame = 0;
      state.over = true;
      world.burst(state.lantern.x, state.lantern.y, '#8b93a3', 26, 120);
      return EVENT_OVER;
    }

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    const lantern = state.lantern;
    if (lantern.invulnerable > 0) lantern.invulnerable -= dt;

    // Gust charges come back slowly, one at a time.
    if (state.gustCharges < GUST.maxCharges) {
      state.gustRecharge += dt;
      if (state.gustRecharge >= GUST.rechargeSeconds) {
        state.gustCharges += 1;
        state.gustRecharge = 0;
      }
    }
    if (state.gustCooldown > 0) state.gustCooldown -= dt;

    // --- steering ---------------------------------------------------------
    const keyboard = ctrl.keyboard || { x: 0, y: 0 };
    if (keyboard.x !== 0 || keyboard.y !== 0) {
      lantern.vx += keyboard.x * LANTERN.keyboardAccel * dt;
      lantern.vy += keyboard.y * LANTERN.keyboardAccel * dt;
    } else if (ctrl.mouseSeen && ctrl.mouseX !== null) {
      const desiredVx = (ctrl.mouseX - lantern.x) * LANTERN.followStrength;
      const desiredVy = (ctrl.mouseY - lantern.y) * LANTERN.followStrength;
      const ease = Math.min(1, 9 * dt);
      lantern.vx += (desiredVx - lantern.vx) * ease;
      lantern.vy += (desiredVy - lantern.vy) * ease;
    }
    // Drag and speed cap.
    lantern.vx -= lantern.vx * LANTERN.drag * dt * 0.4;
    lantern.vy -= lantern.vy * LANTERN.drag * dt * 0.4;
    const speed = Math.hypot(lantern.vx, lantern.vy);
    if (speed > LANTERN.maxSpeed) {
      lantern.vx = (lantern.vx / speed) * LANTERN.maxSpeed;
      lantern.vy = (lantern.vy / speed) * LANTERN.maxSpeed;
    }

    // Gust burst: a dash along the current motion, or straight up when still.
    if (ctrl.gust && state.gustCharges > 0 && state.gustCooldown <= 0) {
      state.gustCharges -= 1;
      state.gustCooldown = GUST.cooldownSeconds;
      state.gustRecharge = 0;
      let dx = lantern.vx;
      let dy = lantern.vy;
      const moving = Math.hypot(dx, dy);
      if (moving < 40) { dx = 0; dy = -1; } else { dx /= moving; dy /= moving; }
      lantern.vx += dx * GUST.boostSpeed;
      lantern.vy += dy * GUST.boostSpeed;
      world.burst(lantern.x, lantern.y, '#ffd27d', 10, 160);
      events |= EVENT_GUST;
    }

    // Wind shoves the lantern sideways while it blows.
    if (state.wind.active) {
      state.wind.timeLeft -= dt;
      lantern.vx += state.wind.direction * WIND.push * dt;
      if (world.rng() < 0.5) {
        state.particles.push({
          x: world.rng() * FIELD.width, y: 60 + world.rng() * (FIELD.marketTop - 120),
          vx: state.wind.direction * 420, vy: 0, life: 0.5, maxLife: 0.5,
          color: 'rgba(220, 225, 255, 0.5)', size: 1.5,
        });
      }
      if (state.wind.timeLeft <= 0) state.wind.active = false;
    } else {
      state.wind.timer -= dt;
      if (state.wind.timer <= 0) {
        state.wind.active = true;
        state.wind.timeLeft = WIND.duration;
        state.wind.direction = world.rng() < 0.5 ? -1 : 1;
        state.wind.timer = WIND.interval + world.rng() * WIND.intervalJitter;
      }
    }

    lantern.x += lantern.vx * dt;
    lantern.y += lantern.vy * dt;
    lantern.x = Math.max(24, Math.min(FIELD.width - 24, lantern.x));
    lantern.y = Math.max(30, Math.min(FIELD.marketTop - 16, lantern.y));
    lantern.tilt = Math.max(-0.35, Math.min(0.35, lantern.vx * 0.0009));

    // --- spawning ----------------------------------------------------------
    state.wishTimer -= dt;
    if (state.wishTimer <= 0) {
      spawnWish(state, false);
      state.wishTimer = Math.max(WISH.minInterval, WISH.interval - (waveScale - 1) * 0.05)
        + world.rng() * WISH.intervalJitter;
    }
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber(state);
      state.emberTimer = EMBER.interval + world.rng() * EMBER.intervalJitter;
    }
    state.fireworkTimer -= dt;
    if (state.fireworkTimer <= 0) {
      spawnFirework(state);
      state.fireworkTimer = Math.max(FIREWORK.minInterval, FIREWORK.interval - (waveScale - 1) * 0.2)
        + world.rng() * FIREWORK.intervalJitter;
    }
    state.kiteTimer -= dt;
    if (state.kiteTimer <= 0) {
      spawnKite(state);
      state.kiteTimer = Math.max(KITE.minInterval, KITE.interval - (waveScale - 1) * 0.3)
        + world.rng() * KITE.intervalJitter;
    }

    // --- wishes and embers drift and age -----------------------------------
    for (const wish of state.wishesList) {
      if (!wish.active) continue;
      wish.age += dt;
      wish.x += Math.sin(wish.age * 1.3 + wish.phase) * WISH.driftSpeed * dt;
      wish.y += Math.cos(wish.age * 0.9 + wish.phase) * WISH.driftSpeed * 0.6 * dt;
      if (wish.age > wish.lifetime) wish.active = false;
    }
    state.wishesList = state.wishesList.filter((w) => w.active);
    for (const ember of state.embersList) {
      if (!ember.active) continue;
      ember.age += dt;
      ember.x += Math.sin(ember.age + ember.phase) * EMBER.driftSpeed * dt;
      ember.y += 12 * dt;
      if (ember.age > ember.lifetime) ember.active = false;
    }
    state.embersList = state.embersList.filter((e) => e.active);

    // --- fireworks bloom ----------------------------------------------------
    for (const firework of state.fireworksList) {
      if (!firework.active) continue;
      if (firework.warn > 0) {
        firework.warn -= dt;
        continue;
      }
      firework.radius += FIREWORK.expandSpeed * dt;
      if (firework.radius >= FIREWORK.maxRadius) {
        firework.active = false;
        world.burst(firework.x, firework.y, '#ff5d73', 26, 260);
        world.burst(firework.x, firework.y, '#ffd27d', 14, 200);
      }
    }
    state.fireworksList = state.fireworksList.filter((f) => f.active);
    for (const flash of state.flashes) flash.life -= dt;
    state.flashes = state.flashes.filter((f) => f.life > 0);

    // --- kites sweep across --------------------------------------------------
    for (const kite of state.kitesList) {
      if (!kite.active) continue;
      kite.x += kite.vx * dt;
      kite.flap += dt * 9;
      if (kite.x < -120 || kite.x > FIELD.width + 120) kite.active = false;
    }
    state.kitesList = state.kitesList.filter((k) => k.active);

    // --- particles fade -------------------------------------------------------
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 60 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    // --- collecting ------------------------------------------------------------
    for (const wish of state.wishesList) {
      if (distance(lantern.x, lantern.y, wish.x, wish.y) < LANTERN.collectRadius + WISH.radius) {
        events |= collectWish(state, wish);
      }
    }
    state.wishesList = state.wishesList.filter((w) => w.active);
    for (const ember of state.embersList) {
      if (distance(lantern.x, lantern.y, ember.x, ember.y) < LANTERN.collectRadius + EMBER.radius) {
        events |= collectEmber(state, ember);
      }
    }
    state.embersList = state.embersList.filter((e) => e.active);

    // --- hazards ---------------------------------------------------------------
    if (lantern.invulnerable <= 0) {
      for (const firework of state.fireworksList) {
        if (firework.warn > 0) continue;
        const d = distance(lantern.x, lantern.y, firework.x, firework.y);
        if (Math.abs(d - firework.radius) < FIREWORK.ringWidth / 2 + LANTERN.radius * 0.55) {
          events |= hurtLantern(state, firework.x, firework.y);
          break;
        }
      }
      if (!state.over) {
        for (const kite of state.kitesList) {
          if (Math.abs(kite.x - lantern.x) < 46 && Math.abs(kite.y - lantern.y) < 30) {
            events |= hurtLantern(state, kite.x, kite.y);
            break;
          }
        }
      }
    }

    // --- the moon ---------------------------------------------------------------
    if (state.moonReady && !state.won) {
      if (distance(lantern.x, lantern.y, MOON.x, MOON.y) < MOON.reachDistance) {
        state.won = true;
        world.burst(MOON.x, MOON.y, '#f7e9b8', 40, 240);
        world.burst(lantern.x, lantern.y, '#ffd27d', 30, 200);
        events |= EVENT_WIN;
      }
    }

    return events;
  };

  /** Ambient drift for the title screen: the lantern floats, wishes glow, nothing hurts. */
  world.stepAmbient = function stepAmbient(dt) {
    const state = world.state;
    state.time += dt;
    const lantern = state.lantern;
    lantern.x = FIELD.width * 0.3 + Math.sin(state.time * 0.35) * 130;
    lantern.y = FIELD.height * 0.5 + Math.sin(state.time * 0.5) * 46;
    lantern.tilt = Math.cos(state.time * 0.35) * 0.12;
    state.wishTimer -= dt;
    if (state.wishTimer <= 0) {
      spawnWish(state, false);
      state.wishTimer = 1.1 + world.rng() * 0.8;
    }
    for (const wish of state.wishesList) {
      wish.age += dt;
      wish.x += Math.sin(wish.age * 1.3 + wish.phase) * WISH.driftSpeed * dt;
      wish.y += Math.cos(wish.age * 0.9 + wish.phase) * WISH.driftSpeed * 0.6 * dt;
    }
    state.wishesList = state.wishesList.filter((w) => w.age < w.lifetime);
    if (world.rng() < 0.12) {
      spawnParticle(state, lantern.x, lantern.y + 26, '#ffb347', 24, 1.1, 2);
    }
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  };

  world.reset(1);
  return world;
}
