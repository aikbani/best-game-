// LAMPION v3 — boot and main loop. Owns the screen state machine (title,
// night intro, upgrade choice, play, pause, win, game over), the fixed-step
// loop, the best score, and the ?shot= staging hook the screenshots use. The
// world, the renderer, the input and the sound each live in their own module.

import { STEP, BEST_KEY } from './config.js';
import { randomSeed } from './random.js';
import {
  createWorld,
  EVENT_WISH, EVENT_EMBER, EVENT_HIT, EVENT_WIN, EVENT_OVER, EVENT_GUST,
  EVENT_KINDLE, EVENT_NIGHT, EVENT_BOSS_HIT, EVENT_GATE, EVENT_NEARMISS,
} from './world.js';
import {
  createRenderer,
  SCREEN_TITLE, SCREEN_INTRO, SCREEN_UPGRADE, SCREEN_PLAY,
  SCREEN_WIN, SCREEN_OVER, SCREEN_PAUSE,
} from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') || '', 10);
const shotSeed = Number.isFinite(seedParam) ? seedParam : 1;

const world = createWorld();
const renderer = createRenderer(canvas, shotSeed);
const input = createInput(canvas);
const audio = createAudio();

let screen = SCREEN_TITLE;
let screenBeforePause = SCREEN_PLAY;
let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10) || 0;
} catch {
  best = 0;
}
let upgradeChoices = [];
let introElapsed = 0;
const INTRO_SECONDS = 2.8;
/** Upgrade card hit-boxes (must match the renderer's card layout). */
const CARD_BOXES = [
  { x: 190, y: 220, w: 260, h: 220 },
  { x: 490, y: 220, w: 260, h: 220 },
  { x: 790, y: 220, w: 260, h: 220 },
];

function saveBest() {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode or no storage: the best score simply does not persist.
  }
}

function announce(message) {
  statusLine.textContent = message;
}

function startRun() {
  audio.ensure();
  world.reset(randomSeed());
  upgradeChoices = [];
  screen = SCREEN_INTRO;
  introElapsed = 0;
  announce(`Night 1 — ${world.state.nightDef.name}. ${world.state.nightDef.sub}`);
}

function beginNight() {
  screen = SCREEN_PLAY;
  announce(`Night ${world.state.night} — kindle the lamps, gather the wishes.`);
}

function pickUpgrade(index) {
  const choice = upgradeChoices[index];
  if (!choice) return;
  world.applyUpgrade(choice.id);
  audio.kindleChime();
  world.startNight(world.state.night + 1);
  screen = SCREEN_INTRO;
  introElapsed = 0;
  announce(`Night ${world.state.night} — ${world.state.nightDef.name}. ${world.state.nightDef.sub}`);
}

/** Play the sounds for one step's events, and remember a new best score. */
function handleEvents(events) {
  const state = world.state;
  const run = world.run;
  if (events & EVENT_WISH) audio.wishChime(state.combo);
  if (events & EVENT_EMBER) audio.emberHum();
  if (events & EVENT_HIT) audio.hurtThud();
  if (events & EVENT_GUST) audio.gustWhoosh();
  if (events & EVENT_KINDLE) audio.kindleChime();
  if (events & EVENT_BOSS_HIT) audio.bossHit();
  if (events & EVENT_GATE) audio.gateChime();
  if (events & EVENT_NEARMISS) audio.wishChime(state.combo);
  if (events & EVENT_NIGHT) {
    screen = SCREEN_UPGRADE;
    upgradeChoices = world.drawUpgradeChoices();
    audio.nightFanfare();
    announce(`Night ${state.night} cleared! +${state.nightClearBonus} points. Choose a blessing.`);
  }
  if (events & EVENT_WIN) {
    screen = SCREEN_WIN;
    if (run.score > best) {
      best = run.score;
      saveBest();
    }
    audio.winArpeggio();
    announce(`You reached the moon with ${run.score} points.`);
  }
  if (events & EVENT_OVER) {
    screen = SCREEN_OVER;
    if (run.score > best) {
      best = run.score;
      saveBest();
    }
    audio.overPhrase();
    announce(`Flight over on Night ${state.night}. Score ${run.score}. Press R to fly again.`);
  }
}

function stepPlaying(dt, presses) {
  // The mouse aims in screen space; Night 7's world is taller than the
  // screen, so shift the aim down by the climb camera.
  const cameraY = world.state.cameraY || 0;
  const ctrl = {
    mouseX: input.mouseX,
    mouseY: input.mouseY === null ? null : input.mouseY + cameraY,
    mouseSeen: input.mouseSeen,
    keyboard: input.keyboardVector(),
    gust: presses.gust,
  };
  const events = world.step(dt, ctrl);
  handleEvents(events);
}

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  const presses = input.takePresses();

  if (presses.mute) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }

  if (screen === SCREEN_TITLE) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      world.stepAmbient(STEP);
      accumulator -= STEP;
    }
    if (presses.start) startRun();
  } else if (screen === SCREEN_INTRO) {
    introElapsed += elapsed;
    if (presses.start || introElapsed >= INTRO_SECONDS) beginNight();
    else if (presses.restart) startRun();
  } else if (screen === SCREEN_UPGRADE) {
    if (presses.choice >= 1 && presses.choice <= 3) {
      pickUpgrade(presses.choice - 1);
    } else if (presses.click) {
      for (let i = 0; i < CARD_BOXES.length; i += 1) {
        const box = CARD_BOXES[i];
        if (presses.clickX >= box.x && presses.clickX <= box.x + box.w
          && presses.clickY >= box.y && presses.clickY <= box.y + box.h) {
          pickUpgrade(i);
          break;
        }
      }
    } else if (presses.restart) {
      startRun();
    }
  } else if (screen === SCREEN_PLAY) {
    if (presses.pause) {
      screenBeforePause = SCREEN_PLAY;
      screen = SCREEN_PAUSE;
      announce('Paused. Press P to keep flying.');
    } else if (presses.restart) {
      startRun();
    } else {
      accumulator += elapsed;
      let firstStep = true;
      while (accumulator >= STEP) {
        stepPlaying(STEP, firstStep ? presses : { gust: false });
        firstStep = false;
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    }
  } else if (screen === SCREEN_PAUSE) {
    if (presses.pause || presses.start) {
      screen = screenBeforePause;
      announce('Flying again.');
    } else if (presses.restart) {
      startRun();
    }
  } else if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
    if (presses.restart || presses.start) startRun();
  }

  renderer.draw(world.state, screen, best, { run: world.run, choices: upgradeChoices });
  // A handle for play-testing and screenshots to read the live state.
  const lampsLit = world.state.lamps.filter((lamp) => lamp.lit).length;
  window.__lampion = {
    screen,
    night: world.state.night,
    score: world.run.score,
    wishes: world.state.wishes,
    wishesGoal: world.state.wishesGoal,
    lampsLit,
    lampsTotal: world.state.lamps.length,
    gateOpen: world.state.gateOpen,
    bossHp: world.state.boss ? world.state.boss.hp : null,
    flame: Math.round(world.state.flame),
    lives: world.run.lives,
    best,
    shot: shotName || null,
  };
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => renderer.resize());

// Screenshot mode: stage one deterministic scene from the real rules, draw
// it once, and hold it still — no loop, no clock, no sound.
if (shotName) {
  const staged = stageShot(shotName, world, shotSeed);
  screen = staged.screen;
  best = Math.max(best, staged.best);
  renderer.draw(world.state, screen, best, { run: world.run, choices: [] });
  const lampsLit = world.state.lamps.filter((lamp) => lamp.lit).length;
  window.__lampion = {
    screen,
    night: world.state.night,
    score: world.run.score,
    wishes: world.state.wishes,
    wishesGoal: world.state.wishesGoal,
    lampsLit,
    lampsTotal: world.state.lamps.length,
    gateOpen: world.state.gateOpen,
    bossHp: world.state.boss ? world.state.boss.hp : null,
    flame: Math.round(world.state.flame),
    lives: world.run.lives,
    best,
    shot: shotName,
  };
} else {
  world.reset(randomSeed());
  announce('LAMPION. Click or press Enter to fly.');
  requestAnimationFrame(frame);
}
