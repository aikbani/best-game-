// LAMPION — boot and main loop. Owns the screen state machine (title, play,
// pause, win, game over), the fixed-step loop, the best score, and the
// ?shot= staging hook the screenshots use. The world, the renderer, the
// input and the sound each live in their own module.

import { STEP, BEST_KEY } from './config.js';
import { randomSeed } from './random.js';
import { createWorld, EVENT_WISH, EVENT_EMBER, EVENT_HIT, EVENT_WIN, EVENT_OVER, EVENT_GUST } from './world.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_OVER, SCREEN_PAUSE } from './render.js';
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

function startGame() {
  audio.ensure();
  world.reset(randomSeed());
  screen = SCREEN_PLAY;
  announce('Flying. Gather 60 wishes, feed your flame, then reach the moon.');
}

/** Play the sounds for one step's events, and remember a new best score. */
function handleEvents(events) {
  const state = world.state;
  if (events & EVENT_WISH) audio.wishChime(state.combo);
  if (events & EVENT_EMBER) audio.emberHum();
  if (events & EVENT_HIT) audio.hurtThud();
  if (events & EVENT_GUST) audio.gustWhoosh();
  if (events & EVENT_WIN) {
    screen = SCREEN_WIN;
    if (state.score > best) {
      best = state.score;
      saveBest();
    }
    audio.winArpeggio();
    announce(`You reached the moon with ${state.score} points.`);
  }
  if (events & EVENT_OVER) {
    screen = SCREEN_OVER;
    if (state.score > best) {
      best = state.score;
      saveBest();
    }
    audio.overPhrase();
    announce(`Flight over. Score ${state.score}. Press R to fly again.`);
  }
}

function stepPlaying(dt, presses) {
  const ctrl = {
    mouseX: input.mouseX,
    mouseY: input.mouseY,
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
    if (presses.start) startGame();
  } else if (screen === SCREEN_PLAY) {
    if (presses.pause) {
      screenBeforePause = SCREEN_PLAY;
      screen = SCREEN_PAUSE;
      announce('Paused. Press P to keep flying.');
    } else if (presses.restart) {
      startGame();
    } else {
      accumulator += elapsed;
      let firstStep = true;
      while (accumulator >= STEP) {
        stepPlaying(STEP, firstStep ? presses : { gust: false });
        firstStep = false;
        accumulator -= STEP;
      }
    }
  } else if (screen === SCREEN_PAUSE) {
    if (presses.pause || presses.start) {
      screen = screenBeforePause;
      announce('Flying again.');
    } else if (presses.restart) {
      startGame();
    }
  } else if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
    if (presses.restart || presses.start) startGame();
  }

  renderer.draw(world.state, screen, best);
  // A handle for play-testing and screenshots to read the live state.
  window.__lampion = {
    screen,
    score: world.state.score,
    wishes: world.state.wishes,
    flame: Math.round(world.state.flame),
    lives: world.state.lives,
    wave: world.state.wave,
    best,
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
  renderer.draw(world.state, screen, best);
  window.__lampion = {
    screen,
    score: world.state.score,
    wishes: world.state.wishes,
    flame: Math.round(world.state.flame),
    lives: world.state.lives,
    wave: world.state.wave,
    best,
    shot: shotName,
  };
} else {
  world.reset(randomSeed());
  announce('LAMPION. Click or press Enter to fly.');
  requestAnimationFrame(frame);
}
