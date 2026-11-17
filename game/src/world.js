// LAMPION v3's world: seven nights, one run. The lantern kindles paper lamps
// to open the gate of each night, picks one upgrade between nights, fights the
// Kite King on Night 6 and climbs to the moon on Night 7. One fixed step at a
// time; rendering and sound live elsewhere.

import {
  FIELD, STEP, LANTERN, FLAME, MOON, GATE, LIVES, COMBO_WINDOW_SECONDS,
  GUST, WISH, EMBER, BOAT, FIREWORK, KITE, WIND, POOL, NIGHTS, CLIMB, BOSS,
  WIN_BONUS, LAMP_POINTS, MIRROR_CHAIN_BONUS, NEAR_MISS_POINTS, UPGRADES,
} from './config.js';
import { createSeededRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_WISH = 1;
export const EVENT_EMBER = 2;
export const EVENT_HIT = 4;
export const EVENT_WIN = 8;
export const EVENT_OVER = 16;
export const EVENT_GUST = 32;
export const EVENT_KINDLE = 64;
export const EVENT_NIGHT = 128;
export const EVENT_BOSS_HIT = 256;
export const EVENT_GATE = 512;
export const EVENT_NEARMISS = 1024;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function createWorld() {
  const world = {
    state: null,
    run: null,
    rng: createSeededRandom(1),
    seed: 1,
  };

  function freshRun() {
    return {
      score: 0,
      lives: LIVES,
      bestCombo: 0,
      lampsKindled: 0,
      nightsCleared: 0,
      maxFlame: FLAME.max,
      gustMax: GUST.maxCharges,
      magnet: 1,
      emberBonus: 0,
      shieldOwned: false,
      comboWindow: COMBO_WINDOW_SECONDS,
      scoreMult: 1,
      upgradesTaken: [],
    };
  }

  function freshNightState(def) {
    return {
      time: 0,
      night: def.n,
      nightDef: def,
      lantern: {
        x: FIELD.width * 0.3,
        y: def.special === 'climb' ? 640 : FIELD.height * 0.55,
        vx: 0, vy: 0, invulnerable: 0, tilt: 0,
      },
      flame: world.run.maxFlame,
      flameMax: world.run.maxFlame,
      wishes: 0,
      wishesGoal: def.wishes,
      combo: 0,
      comboTimer: 0,
      gustCharges: world.run.gustMax,
      gustRecharge: 0,
      gustCooldown: 0,
      gustActive: 0,
      lamps: [],
      gateOpen: false,
      gate: { x: GATE.x, y: GATE.y, width: GATE.width, height: GATE.height },
      won: false,
      over: false,
      nightClear: false,
      nightClearBonus: 0,
      wishesList: [],
      embersList: [],
      fireworksList: [],
      kitesList: [],
      boatsList: [],
      shardsList: [],
      windBands: [],
      particles: [],
      floats: [],
      flashes: [],
      wind: { active: false, timeLeft: 0, direction: 1, timer: WIND.interval },
      wishTimer: 0.4,
      emberTimer: 1.2,
      fireworkTimer: 2.4,
      kiteTimer: 4.0,
      boatTimer: 2.0,
      boss: null,
      cameraY: 0,
      checkpointY: 640,
      bestY: 640,
      shieldActive: world.run.shieldOwned,
      nearMissChain: 0,
      nearMissTimer: 0,
      shake: 0,
      hint: def.special === 'intro' ? 9 : 0,
    };
  }

  function placeLamps(state, count) {
    const placed = [];
    for (let i = 0; i < count; i += 1) {
      let x = 0;
      let y = 0;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        x = 110 + world.rng() * (FIELD.width - 220);
        y = 110 + world.rng() * 360;
        if (distance(x, y, MOON.x, 120) < 150) continue;
        if (placed.every((p) => distance(x, y, p.x, p.y) > 170)) break;
      }
      placed.push({ x, y, lit: false, crown: false });
    }
    return placed;
  }

  world.startNight = function startNight(n) {
    const def = NIGHTS[n - 1];
    const state = freshNightState(def);
    if (def.special === 'boss') {
      state.boss = {
        x: FIELD.width / 2, y: BOSS.hoverY, vx: 0, vy: 0,
        hp: BOSS.hp, maxHp: BOSS.hp, mode: 'hover', timer: BOSS.hoverSeconds,
        warnX: 0, warnY: 0, targetX: 0, targetY: 0, flap: 0,
      };
      state.lamps = [
        { x: 0, y: 0, lit: false, crown: true, dx: -95, dy: -58 },
        { x: 0, y: 0, lit: false, crown: true, dx: 0, dy: -88 },
        { x: 0, y: 0, lit: false, crown: true, dx: 95, dy: -58 },
      ];
      syncCrownLamps(state);
    } else if (def.lamps > 0) {
      state.lamps = placeLamps(state, def.lamps);
    }
    if (def.special === 'mirrors') {
      const rows = [150, 260, 370, 480];
      state.shardsList = rows.map((y, i) => ({ x: 220 + i * 260, y, used: false }));
    }
    if (def.special === 'river') {
      state.windBands = [
        { x0: 300, x1: 470, dir: 1, push: 300 },
        { x0: 820, x1: 990, dir: -1, push: 300 },
      ];
    }
    world.state = state;
    for (let i = 0; i < 5; i += 1) spawnWish(state, true);
    return state;
  };

  function syncCrownLamps(state) {
    if (!state.boss) return;
    for (const lamp of state.lamps) {
      lamp.x = state.boss.x + lamp.dx;
      lamp.y = state.boss.y + lamp.dy;
    }
  }

  world.reset = function reset(seed) {
    world.seed = seed;
    world.rng = createSeededRandom(seed);
    world.run = freshRun();
    world.startNight(1);
  };

  /** Three distinct upgrade cards for the between-night choice. */
  world.drawUpgradeChoices = function drawUpgradeChoices() {
    const pool = UPGRADES.filter((u) => !(u.id === 'shield' && world.run.shieldOwned));
    const picks = [];
    const used = new Set();
    while (picks.length < 3 && used.size < pool.length) {
      const candidate = pool[Math.floor(world.rng() * pool.length)];
      if (used.has(candidate.id)) continue;
      used.add(candidate.id);
      picks.push(candidate);
    }
    return picks;
  };

  world.applyUpgrade = function applyUpgrade(id) {
    const run = world.run;
    run.upgradesTaken.push(id);
    if (id === 'flame') {
      run.maxFlame += 25;
      world.state.flame = run.maxFlame;
      world.state.flameMax = run.maxFlame;
    } else if (id === 'gust') {
      run.gustMax += 1;
      world.state.gustCharges += 1;
    } else if (id === 'magnet') {
      run.magnet *= 1.6;
    } else if (id === 'ember') {
      run.emberBonus += 10;
    } else if (id === 'shield') {
      run.shieldOwned = true;
      world.state.shieldActive = true;
    } else if (id === 'combo') {
      run.comboWindow += 2;
    } else if (id === 'mult') {
      run.scoreMult += 0.5;
    }
  };

  function addFloat(state, x, y, text, color) {
    if (state.floats.length >= POOL.floats) state.floats.shift();
    state.floats.push({ x, y, text, life: 1.1, maxLife: 1.1, color: color || '#fdf6e3' });
  }

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
    const def = state.nightDef;
    let y;
    if (def.special === 'climb') {
      // Wishes spiral up the climb, a little above the lantern's view.
      y = state.lantern.y - 60 - world.rng() * 500;
      y = clamp(y, CLIMB.topY + 40, 660);
    } else {
      y = anywhere
        ? 90 + world.rng() * (FIELD.marketTop - 180)
        : 70 + world.rng() * (FIELD.marketTop - 160);
    }
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
    const def = state.nightDef;
    const y = def.special === 'climb'
      ? clamp(state.lantern.y - 40 - world.rng() * 420, CLIMB.topY + 40, 660)
      : 80 + world.rng() * 180;
    state.embersList.push({
      x: 60 + world.rng() * (FIELD.width - 120),
      y,
      phase: world.rng() * Math.PI * 2,
      age: 0,
      lifetime: EMBER.lifetime,
      active: true,
    });
  }

  function spawnFirework(state) {
    if (state.fireworksList.length >= POOL.fireworks) return;
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      x = 120 + world.rng() * (FIELD.width - 240);
      y = state.nightDef.special === 'climb'
        ? clamp(state.lantern.y - 80 - world.rng() * 320, CLIMB.topY + 60, 620)
        : 90 + world.rng() * (FIELD.marketTop - 260);
      if (distance(x, y, state.lantern.x, state.lantern.y) >= 190) break;
    }
    state.fireworksList.push({ x, y, radius: 0, warn: FIREWORK.warnSeconds, active: true, hue: world.rng() });
    state.flashes.push({ x, y, life: FIREWORK.warnSeconds });
  }

  function spawnKite(state) {
    if (state.kitesList.length >= POOL.kites) return;
    const fromLeft = world.rng() < 0.5;
    const speed = KITE.speed * (0.85 + world.rng() * 0.3);
    const baseY = state.nightDef.special === 'climb'
      ? clamp(state.lantern.y - 60 - world.rng() * 300, CLIMB.topY + 80, 600)
      : 120 + world.rng() * (FIELD.marketTop - 220);
    state.kitesList.push({
      x: fromLeft ? -70 : FIELD.width + 70,
      y: baseY,
      vx: fromLeft ? speed : -speed,
      flap: world.rng() * Math.PI * 2,
      active: true,
      nearMissed: false,
    });
  }

  function spawnSquadron(state) {
    if (state.kitesList.length + 3 > POOL.kites) return;
    const fromLeft = world.rng() < 0.5;
    const speed = KITE.speed * (0.9 + world.rng() * 0.2);
    const baseY = 130 + world.rng() * 280;
    const offsets = [{ dx: 0, dy: 0 }, { dx: fromLeft ? -70 : 70, dy: -46 }, { dx: fromLeft ? -70 : 70, dy: 46 }];
    for (const off of offsets) {
      state.kitesList.push({
        x: (fromLeft ? -70 : FIELD.width + 70) + off.dx,
        y: baseY + off.dy,
        vx: fromLeft ? speed : -speed,
        flap: world.rng() * Math.PI * 2,
        active: true,
        nearMissed: false,
      });
    }
  }

  function spawnBoat(state) {
    if (state.boatsList.length >= POOL.boats) return;
    const fromLeft = world.rng() < 0.5;
    state.boatsList.push({
      x: fromLeft ? -60 : FIELD.width + 60,
      y: 606 + world.rng() * 44,
      vx: fromLeft ? BOAT.speed : -BOAT.speed,
      phase: world.rng() * Math.PI * 2,
      active: true,
    });
  }

  function hurtLantern(state, fromX, fromY) {
    const lantern = state.lantern;
    if (state.shieldActive) {
      state.shieldActive = false;
      lantern.invulnerable = LANTERN.invulnerableSeconds;
      world.burst(lantern.x, lantern.y, '#8be28b', 20, 170);
      addFloat(state, lantern.x, lantern.y - 44, 'SHIELD!', '#8be28b');
      return EVENT_HIT;
    }
    world.run.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.nearMissChain = 0;
    lantern.invulnerable = LANTERN.invulnerableSeconds;
    state.shake = 1;
    const away = Math.atan2(lantern.y - fromY, lantern.x - fromX);
    lantern.vx += Math.cos(away) * 320;
    lantern.vy += Math.sin(away) * 320 - 120;
    world.burst(lantern.x, lantern.y, '#ff5d73', 22, 190);
    if (world.run.lives <= 0) {
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function collectWish(state, wish) {
    wish.active = false;
    const run = world.run;
    state.wishes += 1;
    state.combo += 1;
    state.comboTimer = run.comboWindow;
    if (state.combo > run.bestCombo) run.bestCombo = state.combo;
    const stepMult = 1 + Math.min(4, Math.floor(state.combo / 4));
    const gained = Math.round(WISH.points * stepMult * run.scoreMult);
    run.score += gained;
    state.flame = Math.min(run.maxFlame, state.flame + FLAME.wishRefill);
    world.burst(wish.x, wish.y, '#ffe066', 12, 120);
    addFloat(state, wish.x, wish.y - 18, `+${gained}`, '#ffe066');
    checkGate(state);
    return EVENT_WISH;
  }

  function collectEmber(state, ember) {
    ember.active = false;
    const run = world.run;
    const doubled = state.nightDef.special === 'storm';
    const refill = (FLAME.emberRefill + (run.emberBonus > 0 ? 6 : 0)) * (doubled ? 2 : 1);
    state.flame = Math.min(run.maxFlame, state.flame + refill);
    const gained = Math.round((EMBER.points + run.emberBonus) * (doubled ? 2 : 1) * run.scoreMult);
    run.score += gained;
    world.burst(ember.x, ember.y, '#ff7a2f', 10, 100);
    addFloat(state, ember.x, ember.y - 18, `+${gained}`, '#ff7a2f');
    return EVENT_EMBER;
  }

  function kindleLamp(state, lamp) {
    lamp.lit = true;
    world.run.lampsKindled += 1;
    const gained = Math.round(LAMP_POINTS * world.run.scoreMult);
    world.run.score += gained;
    world.burst(lamp.x, lamp.y, '#ffd27d', 24, 200);
    addFloat(state, lamp.x, lamp.y - 26, `+${gained} KINDLED`, '#ffd27d');
    if (lamp.crown && state.boss) {
      state.boss.hp -= 1;
      world.burst(state.boss.x, state.boss.y, '#ff5d73', 18, 220);
      addFloat(state, state.boss.x, state.boss.y - 110, 'CROWN DOWN!', '#ff5d73');
    }
    checkGate(state);
    return lamp.crown ? (EVENT_KINDLE | EVENT_BOSS_HIT) : EVENT_KINDLE;
  }

  /** The gate opens once every lamp burns and the night's wishes are gathered. */
  function checkGate(state) {
    if (state.gateOpen) return;
    const lampsLit = state.lamps.every((lamp) => lamp.lit);
    if (lampsLit && state.wishes >= state.wishesGoal) {
      state.gateOpen = true;
      world.burst(GATE.x, GATE.y, '#8be28b', 26, 200);
    }
  }

  function updateBoss(state, dt) {
    const boss = state.boss;
    if (!boss || boss.hp <= 0) return;
    boss.flap += dt * 9;
    boss.timer -= dt;
    const lantern = state.lantern;
    if (boss.mode === 'hover') {
      boss.x += Math.sin(state.time * 0.7) * 130 * dt;
      boss.y = BOSS.hoverY + Math.sin(state.time * 1.1) * 46;
      if (boss.timer <= 0) {
        boss.mode = 'warn';
        boss.timer = BOSS.warnSeconds;
        boss.warnX = lantern.x;
        boss.warnY = lantern.y;
      }
    } else if (boss.mode === 'warn') {
      boss.warnX = lantern.x;
      boss.warnY = lantern.y;
      if (boss.timer <= 0) {
        boss.mode = 'swoop';
        boss.timer = BOSS.swoopSeconds;
        boss.targetX = boss.warnX;
        boss.targetY = boss.warnY;
        const d = Math.hypot(boss.targetX - boss.x, boss.targetY - boss.y) || 1;
        boss.vx = ((boss.targetX - boss.x) / d) * BOSS.swoopSpeed;
        boss.vy = ((boss.targetY - boss.y) / d) * BOSS.swoopSpeed;
      }
    } else if (boss.mode === 'swoop') {
      boss.x += boss.vx * dt;
      boss.y += boss.vy * dt;
      if (boss.timer <= 0) {
        boss.mode = 'recover';
        boss.timer = BOSS.recoverSeconds;
        boss.vx = 0;
        boss.vy = 0;
      }
    } else if (boss.mode === 'recover') {
      boss.y += (BOSS.hoverY - boss.y) * dt * 1.5;
      boss.x += (FIELD.width / 2 - boss.x) * dt * 0.8;
      if (boss.timer <= 0) {
        boss.mode = 'hover';
        boss.timer = BOSS.hoverSeconds;
      }
    }
    boss.x = clamp(boss.x, 90, FIELD.width - 90);
    boss.y = clamp(boss.y, 90, FIELD.marketTop - 60);
    syncCrownLamps(state);
  }

  /** Advance the world one fixed step. `ctrl` carries the player's steering. */
  world.step = function step(dt, ctrl) {
    const state = world.state;
    if (state.won || state.over || state.nightClear) return EVENT_NONE;
    let events = EVENT_NONE;
    const run = world.run;
    const def = state.nightDef;
    state.time += dt;
    if (state.hint > 0) state.hint -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);

    // The flame always burns, faster on later nights.
    state.flame -= FLAME.drainPerSecond * dt;
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
    if (state.nearMissTimer > 0) {
      state.nearMissTimer -= dt;
      if (state.nearMissTimer <= 0) state.nearMissChain = 0;
    }

    const lantern = state.lantern;
    if (lantern.invulnerable > 0) lantern.invulnerable -= dt;
    if (state.gustActive > 0) state.gustActive -= dt;

    if (state.gustCharges < run.gustMax) {
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
      state.gustActive = GUST.activeSeconds;
      let dx = lantern.vx;
      let dy = lantern.vy;
      const moving = Math.hypot(dx, dy);
      if (moving < 40) { dx = 0; dy = -1; } else { dx /= moving; dy /= moving; }
      lantern.vx += dx * GUST.boostSpeed;
      lantern.vy += dy * GUST.boostSpeed;
      world.burst(lantern.x, lantern.y, '#ffd27d', 10, 160);
      events |= EVENT_GUST;
    }

    // Wind: Night 3's fixed bands, other nights the roaming gust.
    if (def.special === 'river') {
      for (const band of state.windBands) {
        if (lantern.x > band.x0 && lantern.x < band.x1) {
          lantern.vx += band.dir * band.push * dt;
          if (world.rng() < 0.4) {
            state.particles.push({
              x: lantern.x + (world.rng() - 0.5) * 60, y: lantern.y + (world.rng() - 0.5) * 60,
              vx: band.dir * 420, vy: 0, life: 0.4, maxLife: 0.4,
              color: 'rgba(220, 225, 255, 0.5)', size: 1.5,
            });
          }
        }
      }
    } else if (state.wind.active) {
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
        state.wind.timer = def.wind + world.rng() * WIND.intervalJitter;
      }
    }

    lantern.x += lantern.vx * dt;
    lantern.y += lantern.vy * dt;
    if (def.special === 'climb') {
      lantern.x = clamp(lantern.x, 24, FIELD.width - 24);
      lantern.y = clamp(lantern.y, CLIMB.topY, 690);
      state.cameraY = clamp(lantern.y - 380, CLIMB.topY, 0);
      if (lantern.y < state.bestY) {
        state.bestY = lantern.y;
        const reached = 640 - Math.floor((640 - lantern.y) / CLIMB.checkpointEvery) * CLIMB.checkpointEvery;
        if (reached < state.checkpointY) state.checkpointY = reached;
      }
      // Falling below the visible screen costs a life and respawns at the checkpoint.
      const screenY = lantern.y - state.cameraY;
      if (screenY > FIELD.height + CLIMB.fallMargin) {
        events |= hurtLantern(state, lantern.x, lantern.y + 200);
        if (!state.over) {
          lantern.x = FIELD.width / 2;
          lantern.y = state.checkpointY;
          lantern.vx = 0;
          lantern.vy = 0;
          state.cameraY = clamp(lantern.y - 380, CLIMB.topY, 0);
        }
      }
    } else {
      lantern.x = clamp(lantern.x, 24, FIELD.width - 24);
      lantern.y = clamp(lantern.y, 30, FIELD.marketTop - 16);
    }
    lantern.tilt = clamp(lantern.vx * 0.0009, -0.35, 0.35);

    // --- spawning ----------------------------------------------------------
    state.wishTimer -= dt;
    if (state.wishTimer <= 0) {
      spawnWish(state, false);
      state.wishTimer = Math.max(WISH.minInterval, WISH.interval - (def.n - 1) * 0.05)
        + world.rng() * WISH.intervalJitter;
    }
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber(state);
      const base = def.special === 'storm' ? EMBER.interval * 0.55 : EMBER.interval;
      state.emberTimer = base + world.rng() * EMBER.intervalJitter;
    }
    state.fireworkTimer -= dt;
    if (state.fireworkTimer <= 0) {
      spawnFirework(state);
      state.fireworkTimer = Math.max(FIREWORK.minInterval, def.firework - (def.n - 1) * 0.1)
        + world.rng() * FIREWORK.intervalJitter;
    }
    if (def.special !== 'boss') {
      state.kiteTimer -= dt;
      if (state.kiteTimer <= 0) {
        if (def.special === 'flock') spawnSquadron(state);
        else spawnKite(state);
        state.kiteTimer = Math.max(KITE.minInterval, def.kite - (def.n - 1) * 0.2)
          + world.rng() * KITE.intervalJitter;
      }
    }
    if (def.special === 'river') {
      state.boatTimer -= dt;
      if (state.boatTimer <= 0) {
        spawnBoat(state);
        state.boatTimer = BOAT.interval + world.rng() * 1.5;
      }
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
    for (const boat of state.boatsList) {
      if (!boat.active) continue;
      boat.x += boat.vx * dt;
      boat.y += Math.sin(state.time * 2 + boat.phase) * 8 * dt;
      if (boat.x < -120 || boat.x > FIELD.width + 120) boat.active = false;
    }
    state.boatsList = state.boatsList.filter((b) => b.active);

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
      if (kite.x < -160 || kite.x > FIELD.width + 160) kite.active = false;
    }
    state.kitesList = state.kitesList.filter((k) => k.active);

    // --- the Kite King --------------------------------------------------------
    updateBoss(state, dt);

    // --- particles and floating text fade --------------------------------------
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 60 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const float of state.floats) float.life -= dt;
    state.floats = state.floats.filter((f) => f.life > 0);

    // --- collecting ------------------------------------------------------------
    const collectRadius = LANTERN.collectRadius * run.magnet;
    for (const wish of state.wishesList) {
      if (distance(lantern.x, lantern.y, wish.x, wish.y) < collectRadius + WISH.radius) {
        events |= collectWish(state, wish);
      }
    }
    state.wishesList = state.wishesList.filter((w) => w.active);
    for (const ember of state.embersList) {
      if (distance(lantern.x, lantern.y, ember.x, ember.y) < collectRadius + EMBER.radius) {
        events |= collectEmber(state, ember);
      }
    }
    state.embersList = state.embersList.filter((e) => e.active);
    for (const boat of state.boatsList) {
      if (distance(lantern.x, lantern.y, boat.x, boat.y) < collectRadius + BOAT.radius) {
        boat.active = false;
        const gained = Math.round(BOAT.points * run.scoreMult);
        run.score += gained;
        state.flame = Math.min(run.maxFlame, state.flame + FLAME.boatRefill);
        world.burst(boat.x, boat.y, '#8be28b', 12, 120);
        addFloat(state, boat.x, boat.y - 20, `+${gained} BOAT`, '#8be28b');
        events |= EVENT_WISH;
      }
    }
    state.boatsList = state.boatsList.filter((b) => b.active);

    // --- kindling lamps ---------------------------------------------------------
    if (state.flame > 0) {
      for (const lamp of state.lamps) {
        if (lamp.lit) continue;
        if (distance(lantern.x, lantern.y, lamp.x, lamp.y) < 46) {
          events |= kindleLamp(state, lamp);
        }
      }
    }

    // --- mirror shards: gust through one, its beam kindles a whole row --------
    if (state.gustActive > 0) {
      for (const shard of state.shardsList) {
        if (shard.used) continue;
        if (distance(lantern.x, lantern.y, shard.x, shard.y) < 44) {
          shard.used = true;
          const row = state.lamps.filter((lamp) => !lamp.lit && Math.abs(lamp.y - shard.y) < 80);
          let chained = 0;
          for (const lamp of row) {
            events |= kindleLamp(state, lamp);
            chained += 1;
          }
          if (chained >= 2) {
            const bonus = Math.round(MIRROR_CHAIN_BONUS * run.scoreMult);
            run.score += bonus;
            addFloat(state, shard.x, shard.y - 30, `MIRROR CHAIN +${bonus}`, '#8be28b');
          }
          world.burst(shard.x, shard.y, '#b9f6ff', 30, 260);
        }
      }
    }

    // --- near misses (Night 4): kites that brush past without hitting ----------
    if (def.special === 'flock' && lantern.invulnerable <= 0) {
      for (const kite of state.kitesList) {
        if (kite.nearMissed) continue;
        const d = distance(lantern.x, lantern.y, kite.x, kite.y);
        if (d < 110 && d > 52) {
          kite.nearMissed = true;
          state.nearMissChain += 1;
          state.nearMissTimer = 3;
          const tier = Math.min(3, state.nearMissChain);
          const gained = Math.round(NEAR_MISS_POINTS * tier * run.scoreMult);
          run.score += gained;
          addFloat(state, lantern.x, lantern.y - 44, `NEAR MISS +${gained}`, '#fdf6e3');
          events |= EVENT_NEARMISS;
        }
      }
    }

    // --- hazards ---------------------------------------------------------------
    if (lantern.invulnerable <= 0 && !state.over) {
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
      if (!state.over && state.boss && state.boss.hp > 0) {
        const boss = state.boss;
        if (distance(lantern.x, lantern.y, boss.x, boss.y) < BOSS.radius * 0.8 + LANTERN.radius * 0.6) {
          events |= hurtLantern(state, boss.x, boss.y);
        }
      }
    }

    // --- the gate, and the moon on Night 7 ---------------------------------------
    if (state.gateOpen && !state.nightClear) {
      if (def.special === 'climb') {
        if (distance(lantern.x, lantern.y, MOON.x, MOON.y) < MOON.reachDistance) {
          state.won = true;
          run.score += WIN_BONUS;
          run.nightsCleared += 1;
          world.burst(MOON.x, MOON.y, '#f7e9b8', 40, 240);
          world.burst(lantern.x, lantern.y, '#ffd27d', 30, 200);
          events |= EVENT_WIN;
        }
      } else {
        const g = state.gate;
        if (lantern.x > g.x - 8 && lantern.x < g.x + g.width + 8
          && lantern.y > g.y - 10 && lantern.y < g.y + g.height + 10) {
          state.nightClear = true;
          state.nightClearBonus = Math.round(state.flame) * 5;
          run.score += state.nightClearBonus;
          run.nightsCleared += 1;
          world.burst(g.x + g.width / 2, g.y + g.height / 2, '#8be28b', 30, 220);
          events |= EVENT_NIGHT;
        }
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
