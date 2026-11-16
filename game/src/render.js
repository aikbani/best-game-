// LAMPION's renderer: one indigo night, one warm market below it, one glowing
// paper lantern. Everything is drawn with canvas paths and gradients — no
// images, no fonts from the network. The playfield is always 1280x720 logical
// units, scaled to fit the window.

import { FIELD, LANTERN, FLAME, WISH_GOAL, MOON, WISH, EMBER, FIREWORK, GUST, PALETTE, FONT, FONT_UI } from './config.js';
import { createSeededRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSE = 'pause';

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: rng() * FIELD.width,
      y: rng() * (FIELD.marketTop - 120),
      size: 0.6 + rng() * 1.7,
      phase: rng() * Math.PI * 2,
      speed: 0.4 + rng() * 1.4,
    });
  }
  return stars;
}

function makeStalls(rng) {
  const stalls = [];
  let x = 8;
  while (x < FIELD.width - 90) {
    const width = 120 + rng() * 90;
    stalls.push({ x, width, hue: rng(), awning: rng() < 0.5, lanterns: 1 + Math.floor(rng() * 3) });
    x += width + 14 + rng() * 26;
  }
  return stalls;
}

export function createRenderer(canvas, seed) {
  const ctx = canvas.getContext('2d');
  const rng = createSeededRandom(seed || 7);
  const stars = makeStars(rng);
  const stalls = makeStalls(rng);
  const renderer = { canvas, ctx, stars, stalls };

  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
  }

  renderer.resize = fitCanvas;

  function drawSky(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.marketTop);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.marketTop + 2);
    // Warm haze where the market's light meets the sky.
    const haze = ctx.createLinearGradient(0, FIELD.marketTop - 150, 0, FIELD.marketTop);
    haze.addColorStop(0, 'rgba(232, 131, 58, 0)');
    haze.addColorStop(1, 'rgba(232, 131, 58, 0.22)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, FIELD.marketTop - 150, FIELD.width, 150);
    // Stars, twinkling.
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * star.speed + star.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // A slow shooting star every so often.
    const cycle = time % 17;
    if (cycle < 0.9) {
      const sx = 200 + cycle * 700;
      const sy = 60 + cycle * 130;
      const trail = ctx.createLinearGradient(sx, sy, sx - 90, sy + 34);
      trail.addColorStop(0, 'rgba(244, 234, 210, 0.9)');
      trail.addColorStop(1, 'rgba(244, 234, 210, 0)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 90, sy + 34);
      ctx.stroke();
    }
  }

  function drawMoon(state, time) {
    const ready = state ? state.moonReady : false;
    const glowRadius = ready ? 150 + Math.sin(time * 3) * 14 : 110;
    const glow = ctx.createRadialGradient(MOON.x, MOON.y, 10, MOON.x, MOON.y, glowRadius);
    glow.addColorStop(0, ready ? 'rgba(249, 217, 118, 0.55)' : 'rgba(249, 217, 118, 0.28)');
    glow.addColorStop(1, 'rgba(249, 217, 118, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(MOON.x, MOON.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    // Crescent: a bright disc with a sky-coloured bite taken out of it.
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(MOON.x, MOON.y, MOON.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.skyMid;
    ctx.beginPath();
    ctx.arc(MOON.x + 26, MOON.y - 12, MOON.radius - 6, 0, Math.PI * 2);
    ctx.fill();
    if (ready) {
      ctx.strokeStyle = 'rgba(247, 233, 184, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(MOON.x, MOON.y, MOON.radius + 12 + Math.sin(time * 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawMarket(time) {
    // Rooftops and walls.
    ctx.fillStyle = PALETTE.marketWall;
    ctx.fillRect(0, FIELD.marketTop, FIELD.width, FIELD.height - FIELD.marketTop);
    for (const stall of stalls) {
      const top = FIELD.marketTop + 6;
      const height = FIELD.height - top - 8;
      // Warm lit interior.
      const glow = ctx.createLinearGradient(stall.x, top, stall.x, top + height);
      glow.addColorStop(0, 'rgba(255, 179, 71, 0.5)');
      glow.addColorStop(1, 'rgba(255, 179, 71, 0.12)');
      ctx.fillStyle = glow;
      ctx.fillRect(stall.x + 4, top + 18, stall.width - 8, height - 18);
      // Roof.
      ctx.fillStyle = PALETTE.marketRoof;
      ctx.beginPath();
      ctx.moveTo(stall.x - 4, top + 22);
      ctx.lineTo(stall.x + stall.width + 4, top + 22);
      ctx.lineTo(stall.x + stall.width - 8, top);
      ctx.lineTo(stall.x + 8, top);
      ctx.closePath();
      ctx.fill();
      // Striped awning.
      if (stall.awning) {
        for (let i = 0; i < 6; i += 1) {
          ctx.fillStyle = i % 2 === 0 ? PALETTE.awningA : PALETTE.awningB;
          const seg = stall.width / 6;
          ctx.fillRect(stall.x + i * seg, top + 22, seg, 12);
        }
      }
      // Counter line and goods: little jars and boxes.
      ctx.fillStyle = '#1d1220';
      ctx.fillRect(stall.x + 4, top + height - 26, stall.width - 8, 6);
      for (let i = 0; i < 4; i += 1) {
        const gx = stall.x + 16 + i * ((stall.width - 32) / 4);
        ctx.fillStyle = i % 2 === 0 ? '#e8833a' : '#7fb069';
        ctx.beginPath();
        ctx.arc(gx, top + height - 32, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Hanging paper lanterns on the stall front.
      for (let i = 0; i < stall.lanterns; i += 1) {
        const lx = stall.x + 18 + i * 26;
        const flicker = 0.75 + 0.25 * Math.sin(time * 2.4 + stall.x + i);
        const lg = ctx.createRadialGradient(lx, top + 34, 1, lx, top + 34, 16);
        lg.addColorStop(0, `rgba(255, 207, 125, ${0.85 * flicker})`);
        lg.addColorStop(1, 'rgba(255, 158, 61, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, top + 34, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.lanternBody;
        ctx.beginPath();
        ctx.ellipse(lx, top + 34, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Strings of lights between the rooftops.
    ctx.strokeStyle = 'rgba(20, 14, 32, 0.9)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < stalls.length - 1; i += 1) {
      const a = stalls[i];
      const b = stalls[i + 1];
      const x1 = a.x + a.width / 2;
      const x2 = b.x + b.width / 2;
      const y = FIELD.marketTop + 2;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.quadraticCurveTo((x1 + x2) / 2, y + 26, x2, y);
      ctx.stroke();
      for (let k = 1; k < 6; k += 1) {
        const t = k / 6;
        const bx = x1 + (x2 - x1) * t;
        const by = y + 26 * 2 * t * (1 - t) * 2 - 8;
        const warm = 0.6 + 0.4 * Math.sin(time * 3 + i * 2 + k);
        ctx.fillStyle = `rgba(255, 207, 125, ${warm})`;
        ctx.beginPath();
        ctx.arc(bx, by + 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Light pools on the ground.
    for (const stall of stalls) {
      const pool = ctx.createRadialGradient(
        stall.x + stall.width / 2, FIELD.height - 4, 4,
        stall.x + stall.width / 2, FIELD.height - 4, stall.width * 0.7,
      );
      pool.addColorStop(0, 'rgba(255, 179, 71, 0.20)');
      pool.addColorStop(1, 'rgba(255, 179, 71, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(stall.x + stall.width / 2, FIELD.height - 4, stall.width * 0.7, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLantern(state, time) {
    const lantern = state.lantern;
    if (lantern.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return; // blinking while hurt
    const flicker = 0.9 + 0.1 * Math.sin(time * 9) * Math.sin(time * 5.3);
    const glow = ctx.createRadialGradient(lantern.x, lantern.y, 6, lantern.x, lantern.y, 92);
    glow.addColorStop(0, `rgba(255, 190, 90, ${0.5 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 158, 61, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(lantern.x, lantern.y);
    ctx.rotate(lantern.tilt);
    // Tassel and string.
    ctx.strokeStyle = '#c94f43';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, LANTERN.radius + 4);
    ctx.lineTo(0, LANTERN.radius + 20);
    ctx.stroke();
    ctx.fillStyle = '#c94f43';
    ctx.beginPath();
    ctx.moveTo(-4, LANTERN.radius + 20);
    ctx.lineTo(4, LANTERN.radius + 20);
    ctx.lineTo(0, LANTERN.radius + 30);
    ctx.closePath();
    ctx.fill();
    // Paper body: a warm ellipse with ribs.
    const body = ctx.createLinearGradient(-LANTERN.radius, 0, LANTERN.radius, 0);
    body.addColorStop(0, PALETTE.lanternRim);
    body.addColorStop(0.35, PALETTE.lanternHot);
    body.addColorStop(0.65, PALETTE.lanternBody);
    body.addColorStop(1, PALETTE.lanternRim);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, LANTERN.radius, LANTERN.radius * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 111, 30, 0.55)';
    ctx.lineWidth = 1.5;
    for (const offset of [-16, -8, 0, 8, 16]) {
      ctx.beginPath();
      ctx.ellipse(offset * 0.7, 0, 5, LANTERN.radius * 1.05, 0, -Math.PI / 2.6, Math.PI / 2.6);
      ctx.stroke();
    }
    // Top and bottom caps.
    ctx.fillStyle = '#8a4b1f';
    ctx.fillRect(-10, -LANTERN.radius * 1.12 - 3, 20, 6);
    ctx.fillRect(-8, LANTERN.radius * 1.12 - 2, 16, 5);
    // The flame heart glowing through the paper.
    const heart = ctx.createRadialGradient(0, 2, 1, 0, 2, 16);
    heart.addColorStop(0, 'rgba(255, 244, 200, 0.95)');
    heart.addColorStop(1, 'rgba(255, 158, 61, 0)');
    ctx.fillStyle = heart;
    ctx.beginPath();
    ctx.arc(0, 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWishes(state, time) {
    for (const wish of state.wishesList) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 4 + wish.phase);
      const glow = ctx.createRadialGradient(wish.x, wish.y, 1, wish.x, wish.y, 26);
      glow.addColorStop(0, `rgba(255, 224, 102, ${0.7 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 224, 102, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(wish.x, wish.y, 26, 0, Math.PI * 2);
      ctx.fill();
      // A tiny firefly: bright core, two wings.
      ctx.fillStyle = PALETTE.wishCore;
      ctx.beginPath();
      ctx.arc(wish.x, wish.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 247, 174, 0.7)';
      const wing = Math.sin(time * 14 + wish.phase) * 4;
      ctx.beginPath();
      ctx.ellipse(wish.x - 6, wish.y - 3, 5, 2.5, -0.5 + wing * 0.04, 0, Math.PI * 2);
      ctx.ellipse(wish.x + 6, wish.y - 3, 5, 2.5, 0.5 - wing * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEmbers(state, time) {
    for (const ember of state.embersList) {
      const pulse = 0.65 + 0.35 * Math.sin(time * 5 + ember.phase);
      const glow = ctx.createRadialGradient(ember.x, ember.y, 1, ember.x, ember.y, 30);
      glow.addColorStop(0, `rgba(255, 122, 47, ${0.75 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 122, 47, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd27d';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, EMBER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7a2f';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, EMBER_RADIUS * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const EMBER_RADIUS = 9;

  function drawFireworks(state, time) {
    for (const firework of state.fireworksList) {
      if (firework.warn > 0) {
        // Warning sparkle where the burst is about to bloom.
        const pulse = 0.5 + 0.5 * Math.sin(time * 16);
        ctx.fillStyle = `rgba(255, 93, 115, ${pulse})`;
        ctx.beginPath();
        ctx.arc(firework.x, firework.y, 5 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 93, 115, ${0.35 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(firework.x, firework.y, 14 + pulse * 8, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      const fade = 1 - firework.radius / FIREWORK.maxRadius;
      ctx.strokeStyle = `rgba(255, 93, 115, ${0.9 * fade + 0.1})`;
      ctx.lineWidth = FIREWORK.ringWidth * fade + 3;
      ctx.beginPath();
      ctx.arc(firework.x, firework.y, firework.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 210, 125, ${0.7 * fade})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(firework.x, firework.y, firework.radius * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const flash of state.flashes) {
      ctx.fillStyle = `rgba(255, 93, 115, ${0.25 * (flash.life / FIREWORK.warnSeconds)})`;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawKites(state) {
    for (const kite of state.kitesList) {
      ctx.save();
      ctx.translate(kite.x, kite.y);
      ctx.rotate(kite.vx > 0 ? 0.12 : Math.PI - 0.12);
      ctx.fillStyle = PALETTE.kite;
      // Diamond kite with a flapping tail.
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 30);
      ctx.lineTo(-20, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 16, 31, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 30);
      const sway = Math.sin(kite.flap) * 8;
      ctx.quadraticCurveTo(sway, 48, -sway * 0.5, 62);
      ctx.stroke();
      ctx.fillStyle = '#c94f43';
      ctx.beginPath();
      ctx.arc(sway * 0.5, 46, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawWindBanner(state) {
    if (!state.wind.active) return;
    const dir = state.wind.direction > 0 ? '→' : '←';
    ctx.fillStyle = 'rgba(220, 225, 255, 0.85)';
    ctx.font = `600 20px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText(`wind ${dir} ${dir} ${dir}`, FIELD.width / 2, 96);
  }

  function drawMoonCall(state, time) {
    if (!state.moonReady || state.won) return;
    const pulse = 0.7 + 0.3 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(247, 233, 184, ${pulse})`;
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('The moon is calling — fly up to it!', FIELD.width / 2, 132);
  }

  function drawHud(state) {
    // Top bar panel.
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(12, 10, FIELD.width - 24, 56, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.textBaseline = 'middle';
    // Score, left.
    ctx.textAlign = 'left';
    ctx.font = `700 24px ${FONT_UI}`;
    ctx.fillText(`Score ${state.score}`, 28, 32);
    if (state.combo >= 2) {
      ctx.fillStyle = PALETTE.wish;
      ctx.font = `700 18px ${FONT_UI}`;
      ctx.fillText(`combo x${state.combo}`, 28, 54);
      ctx.fillStyle = PALETTE.text;
    }
    // Wishes, centre.
    ctx.textAlign = 'center';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.fillText(`Wishes ${state.wishes} / ${WISH_GOAL}`, FIELD.width / 2, 28);
    // Flame bar under the wishes.
    const barWidth = 220;
    const barX = FIELD.width / 2 - barWidth / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(barX, 44, barWidth, 12, 6);
    ctx.fill();
    const flameFraction = state.flame / FLAME.max;
    ctx.fillStyle = flameFraction > 0.35 ? '#ff9e3d' : PALETTE.danger;
    ctx.beginPath();
    ctx.roundRect(barX, 44, Math.max(4, barWidth * flameFraction), 12, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 12px ${FONT_UI}`;
    ctx.fillText('FLAME', FIELD.width / 2, 51);
    // Gust charges as small flames beside the bar.
    for (let i = 0; i < GUST.maxCharges; i += 1) {
      ctx.fillStyle = i < state.gustCharges ? '#ffd27d' : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(barX + barWidth + 18 + i * 16, 50, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wave and lives, right.
    ctx.textAlign = 'right';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.fillText(`Wave ${state.wave}`, FIELD.width - 28, 28);
    for (let i = 0; i < 3; i += 1) {
      const lx = FIELD.width - 52 - i * 26;
      const lit = i < state.lives;
      ctx.fillStyle = lit ? PALETTE.lanternBody : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.ellipse(lx, 50, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function dimPanel() {
    ctx.fillStyle = 'rgba(10, 8, 30, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function centrePanel(y, height) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(FIELD.width / 2 - 360, y, 720, height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 207, 125, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(FIELD.width / 2 - 360, y, 720, height, 18);
    ctx.stroke();
  }

  function drawTitle(state, best) {
    dimPanel();
    centrePanel(120, 470);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.moonGlow;
    ctx.font = `700 84px ${FONT}`;
    ctx.fillText('LAMPION', FIELD.width / 2, 185);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 24px ${FONT}`;
    ctx.fillText('a paper lantern’s flight over the night market', FIELD.width / 2, 240);
    ctx.font = `17px ${FONT_UI}`;
    ctx.fillStyle = PALETTE.muted;
    const lines = [
      'Follow your mouse, or steer with Arrow keys / WASD.',
      'Gather 60 wishes (fireflies) — then fly up to the crescent moon to win.',
      'Catch glowing embers to feed your flame. The flame always burns down.',
      'Dodge the blooming firework rings and the black kites. Wind will push you.',
      'Space or click: gust burst (3 charges).  P pause · R restart · M mute',
    ];
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 292 + i * 28));
    ctx.fillStyle = PALETTE.lanternBody;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Click or press Enter to fly', FIELD.width / 2, 470);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT_UI}`;
    ctx.fillText(best > 0 ? `Best score: ${best}` : 'Your first flight awaits — good luck, little lantern.', FIELD.width / 2, 512);
    ctx.fillText('3 lives · the night grows busier every wave', FIELD.width / 2, 544);
  }

  function drawWin(state, best) {
    dimPanel();
    centrePanel(150, 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.moonGlow;
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText('The Moon Welcomes You', FIELD.width / 2, 215);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 22px ${FONT}`;
    ctx.fillText('Sixty wishes carried home — the little lantern rests in moonlight.', FIELD.width / 2, 268);
    ctx.font = `700 30px ${FONT_UI}`;
    ctx.fillText(`Score ${state.score}`, FIELD.width / 2, 330);
    ctx.font = `20px ${FONT_UI}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Wishes ${state.wishes} / ${WISH_GOAL}   ·   Best combo x${state.bestCombo}   ·   Wave ${state.wave}`, FIELD.width / 2, 372);
    ctx.fillText(`Best score: ${Math.max(best, state.score)}`, FIELD.width / 2, 404);
    ctx.fillStyle = PALETTE.lanternBody;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Press R or click to fly again', FIELD.width / 2, 468);
  }

  function drawOver(state, best) {
    dimPanel();
    centrePanel(150, 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText(state.lives <= 0 ? 'Torn by the Night' : 'The Flame Has Gone Out', FIELD.width / 2, 215);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 22px ${FONT}`;
    ctx.fillText(
      state.lives <= 0
        ? 'The lantern falls, gently, back toward the warm market below.'
        : 'The little flame flickered down to embers — feed it next time.',
      FIELD.width / 2, 268,
    );
    ctx.font = `700 30px ${FONT_UI}`;
    ctx.fillText(`Score ${state.score}`, FIELD.width / 2, 330);
    ctx.font = `20px ${FONT_UI}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Wishes ${state.wishes} / ${WISH_GOAL}   ·   Best combo x${state.bestCombo}   ·   Wave ${state.wave}`, FIELD.width / 2, 372);
    ctx.fillText(`Best score: ${Math.max(best, state.score)}`, FIELD.width / 2, 404);
    ctx.fillStyle = PALETTE.lanternBody;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Press R or click to try again', FIELD.width / 2, 468);
  }

  function drawPause() {
    dimPanel();
    centrePanel(240, 200);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 48px ${FONT}`;
    ctx.fillText('Paused', FIELD.width / 2, 300);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `20px ${FONT_UI}`;
    ctx.fillText('Press P to keep flying', FIELD.width / 2, 360);
  }

  /** Draw one frame: the world, then the HUD, then the screen on top. */
  renderer.draw = function draw(state, screen, best) {
    fitCanvas();
    const time = state.time;
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawSky(time);
    drawMoon(state, time);
    drawMarket(time);
    drawFireworks(state, time);
    drawEmbers(state, time);
    drawWishes(state, time);
    drawKites(state);
    drawParticles(state);
    drawLantern(state, time);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) {
      drawHud(state);
      drawWindBanner(state);
      drawMoonCall(state, time);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_WIN) drawWin(state, best);
    if (screen === SCREEN_OVER) drawOver(state, best);
    if (screen === SCREEN_PAUSE) drawPause();
  };

  fitCanvas();
  return renderer;
}
