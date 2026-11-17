// LAMPION v3's renderer: three realms (night market, river, open sky), one
// glowing paper lantern, kindleable lamps, the gate, the Kite King, and the
// climb to the moon. Everything is drawn with canvas paths and gradients —
// no images, no fonts from the network. The playfield is always 1280x720
// logical units, scaled to fit the window; Night 7 scrolls through a taller
// world via the camera offset in state.cameraY.

import {
  FIELD, LANTERN, FLAME, MOON, GATE, GUST, PALETTE, FONT, FONT_UI, BOSS, NIGHTS,
} from './config.js';
import { createSeededRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_INTRO = 'intro';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSE = 'pause';

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 190; i += 1) {
    stars.push({
      x: rng() * FIELD.width,
      y: rng() * FIELD.height,
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

function makeClouds(rng) {
  const clouds = [];
  for (let i = 0; i < 14; i += 1) {
    clouds.push({
      x: rng() * FIELD.width, y: rng() * FIELD.height,
      w: 120 + rng() * 160, h: 26 + rng() * 26, speed: 6 + rng() * 14,
    });
  }
  return clouds;
}

export function createRenderer(canvas, seed) {
  const ctx = canvas.getContext('2d');
  const rng = createSeededRandom(seed || 7);
  const stars = makeStars(rng);
  const stalls = makeStalls(rng);
  const clouds = makeClouds(rng);
  const renderer = { canvas, ctx, stars, stalls, clouds };

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

  function realmOf(state) {
    return state && state.nightDef ? state.nightDef.realm : 'market';
  }

  function drawSky(state, time) {
    const cameraY = state ? state.cameraY || 0 : 0;
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      // Parallax: stars drift slower than the climb.
      let sy = star.y - cameraY * 0.25;
      sy = ((sy % FIELD.height) + FIELD.height) % FIELD.height;
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * star.speed + star.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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

  function moonPosition(state) {
    if (state && state.nightDef && state.nightDef.special === 'climb') {
      return { x: MOON.x, y: MOON.y - (state.cameraY || 0) };
    }
    return { x: 1130, y: 108 };
  }

  function drawMoon(state, time) {
    const pos = moonPosition(state);
    const ready = state ? state.gateOpen : false;
    const glowRadius = ready ? 150 + Math.sin(time * 3) * 14 : 110;
    const glow = ctx.createRadialGradient(pos.x, pos.y, 10, pos.x, pos.y, glowRadius);
    glow.addColorStop(0, ready ? 'rgba(249, 217, 118, 0.55)' : 'rgba(249, 217, 118, 0.28)');
    glow.addColorStop(1, 'rgba(249, 217, 118, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, MOON.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.skyMid;
    ctx.beginPath();
    ctx.arc(pos.x + 26, pos.y - 12, MOON.radius - 6, 0, Math.PI * 2);
    ctx.fill();
    if (ready) {
      ctx.strokeStyle = 'rgba(247, 233, 184, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, MOON.radius + 12 + Math.sin(time * 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawMarket(time) {
    ctx.fillStyle = PALETTE.marketWall;
    ctx.fillRect(0, FIELD.marketTop, FIELD.width, FIELD.height - FIELD.marketTop);
    for (const stall of stalls) {
      const top = FIELD.marketTop + 6;
      const height = FIELD.height - top - 8;
      const glow = ctx.createLinearGradient(stall.x, top, stall.x, top + height);
      glow.addColorStop(0, 'rgba(255, 179, 71, 0.5)');
      glow.addColorStop(1, 'rgba(255, 179, 71, 0.12)');
      ctx.fillStyle = glow;
      ctx.fillRect(stall.x + 4, top + 18, stall.width - 8, height - 18);
      ctx.fillStyle = PALETTE.marketRoof;
      ctx.beginPath();
      ctx.moveTo(stall.x - 4, top + 22);
      ctx.lineTo(stall.x + stall.width + 4, top + 22);
      ctx.lineTo(stall.x + stall.width - 8, top);
      ctx.lineTo(stall.x + 8, top);
      ctx.closePath();
      ctx.fill();
      if (stall.awning) {
        for (let i = 0; i < 6; i += 1) {
          ctx.fillStyle = i % 2 === 0 ? PALETTE.awningA : PALETTE.awningB;
          const seg = stall.width / 6;
          ctx.fillRect(stall.x + i * seg, top + 22, seg, 12);
        }
      }
      ctx.fillStyle = '#1d1220';
      ctx.fillRect(stall.x + 4, top + height - 26, stall.width - 8, 6);
      for (let i = 0; i < 4; i += 1) {
        const gx = stall.x + 16 + i * ((stall.width - 32) / 4);
        ctx.fillStyle = i % 2 === 0 ? '#e8833a' : '#7fb069';
        ctx.beginPath();
        ctx.arc(gx, top + height - 32, 6, 0, Math.PI * 2);
        ctx.fill();
      }
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
  }

  function drawRiver(state, time) {
    // Dark water with moonlight shimmer and reeds at the near bank.
    ctx.fillStyle = PALETTE.river;
    ctx.fillRect(0, FIELD.marketTop, FIELD.width, FIELD.height - FIELD.marketTop);
    for (let i = 0; i < 26; i += 1) {
      const rx = ((i * 173 + time * 22) % (FIELD.width + 80)) - 40;
      const ry = FIELD.marketTop + 18 + ((i * 37) % 110);
      ctx.strokeStyle = `rgba(61, 111, 180, ${0.25 + 0.2 * Math.sin(time * 2 + i)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx - 26, ry);
      ctx.lineTo(rx + 26, ry);
      ctx.stroke();
    }
    const shine = ctx.createLinearGradient(0, FIELD.marketTop, 0, FIELD.height);
    shine.addColorStop(0, 'rgba(249, 217, 118, 0.14)');
    shine.addColorStop(1, 'rgba(249, 217, 118, 0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, FIELD.marketTop, FIELD.width, FIELD.height - FIELD.marketTop);
    // Wind bands shimmer on the water.
    for (const band of state.windBands) {
      ctx.fillStyle = 'rgba(220, 225, 255, 0.10)';
      ctx.fillRect(band.x0, FIELD.marketTop, band.x1 - band.x0, FIELD.height - FIELD.marketTop);
    }
    ctx.strokeStyle = 'rgba(127, 176, 105, 0.8)';
    ctx.lineWidth = 2;
    for (let x = 30; x < FIELD.width; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, FIELD.height - 6);
      ctx.quadraticCurveTo(x + 6, FIELD.height - 34, x - 4, FIELD.height - 52);
      ctx.stroke();
    }
  }

  function drawClouds(state, time) {
    const cameraY = state ? state.cameraY || 0 : 0;
    for (const cloud of clouds) {
      let cx = (cloud.x + time * cloud.speed) % (FIELD.width + 260);
      if (cx > FIELD.width + 60) cx -= FIELD.width + 260;
      let cy = cloud.y - cameraY * 0.55;
      cy = ((cy % (FIELD.height + 120)) + (FIELD.height + 120)) % (FIELD.height + 120) - 60;
      ctx.fillStyle = 'rgba(42, 47, 99, 0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cloud.w * 0.28, cy + 8, cloud.w * 0.3, cloud.h * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(244, 234, 210, 0.10)';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 6, cloud.w * 0.42, cloud.h * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // A soft cloud bank along the bottom of the sky nights.
    const bank = ctx.createLinearGradient(0, FIELD.height - 130, 0, FIELD.height);
    bank.addColorStop(0, 'rgba(42, 47, 99, 0)');
    bank.addColorStop(1, 'rgba(42, 47, 99, 0.9)');
    ctx.fillStyle = bank;
    ctx.fillRect(0, FIELD.height - 130, FIELD.width, 130);
  }

  function drawLantern(state, time) {
    const lantern = state.lantern;
    if (lantern.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;
    const flameFrac = state.flame / (state.flameMax || 100);
    const flicker = 0.9 + 0.1 * Math.sin(time * 9) * Math.sin(time * 5.3);
    const glowRadius = 70 + 34 * flameFrac;
    const glow = ctx.createRadialGradient(lantern.x, lantern.y, 6, lantern.x, lantern.y, glowRadius);
    glow.addColorStop(0, `rgba(255, 190, 90, ${0.5 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 158, 61, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    // Paper shield ring, when active.
    if (state.shieldActive) {
      ctx.strokeStyle = 'rgba(139, 226, 139, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(lantern.x, lantern.y, LANTERN.radius + 12 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(lantern.x, lantern.y);
    ctx.rotate(lantern.tilt);
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
    ctx.fillStyle = '#8a4b1f';
    ctx.fillRect(-10, -LANTERN.radius * 1.12 - 3, 20, 6);
    ctx.fillRect(-8, LANTERN.radius * 1.12 - 2, 16, 5);
    const heart = ctx.createRadialGradient(0, 2, 1, 0, 2, 16);
    heart.addColorStop(0, `rgba(255, 244, 200, ${0.55 + 0.4 * flameFrac})`);
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
      ctx.arc(ember.x, ember.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7a2f';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBoats(state, time) {
    for (const boat of state.boatsList) {
      const bob = Math.sin(time * 2 + boat.phase) * 2;
      ctx.save();
      ctx.translate(boat.x, boat.y + bob);
      ctx.fillStyle = '#f2e3c6';
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(22, 0);
      ctx.lineTo(14, 10);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c94f43';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff9e3d';
      ctx.beginPath();
      ctx.arc(0, -2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawLamps(state, time) {
    for (const lamp of state.lamps) {
      if (lamp.crown) continue; // crown-lamps ride on the boss, drawn there
      const lit = lamp.lit;
      const pulse = lit ? 0.85 + 0.15 * Math.sin(time * 3 + lamp.x) : 0.5 + 0.2 * Math.sin(time * 2 + lamp.x);
      const glow = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, lit ? 52 : 34);
      glow.addColorStop(0, lit ? `rgba(255, 210, 125, ${0.9 * pulse})` : `rgba(180, 175, 210, ${0.4 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 158, 61, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, lit ? 52 : 34, 0, Math.PI * 2);
      ctx.fill();
      // Hanging string.
      ctx.strokeStyle = 'rgba(20, 14, 32, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lamp.x, lamp.y - 52);
      ctx.lineTo(lamp.x, lamp.y - 16);
      ctx.stroke();
      ctx.fillStyle = lit ? PALETTE.lanternBody : '#5a5470';
      ctx.beginPath();
      ctx.ellipse(lamp.x, lamp.y, 13, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = lit ? 'rgba(217, 111, 30, 0.8)' : 'rgba(90, 84, 112, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(lamp.x, lamp.y, 6, 16, 0, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.stroke();
      if (lit) {
        ctx.fillStyle = 'rgba(255, 244, 200, 0.95)';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGate(state, time) {
    if (state.nightDef && state.nightDef.special === 'climb') return;
    if (state.nightDef && state.nightDef.special === 'boss' && state.boss && state.boss.hp > 0) return;
    const g = state.gate;
    const open = state.gateOpen;
    const pulse = open ? 0.75 + 0.25 * Math.sin(time * 4) : 0.35;
    ctx.save();
    ctx.globalAlpha = open ? 1 : 0.55;
    ctx.strokeStyle = open ? `rgba(139, 226, 139, ${pulse})` : 'rgba(185, 179, 214, 0.7)';
    ctx.fillStyle = open ? `rgba(139, 226, 139, ${0.25 * pulse})` : 'rgba(16, 14, 42, 0.5)';
    ctx.lineWidth = 5;
    // Torii arch: two pillars, two lintels.
    ctx.fillRect(g.x, g.y, 10, g.height);
    ctx.fillRect(g.x + g.width - 10, g.y, 10, g.height);
    ctx.fillRect(g.x - 12, g.y, g.width + 24, 12);
    ctx.fillRect(g.x - 4, g.y + 22, g.width + 8, 8);
    ctx.beginPath();
    ctx.rect(g.x + 5, g.y + 12, g.width - 10, g.height - 12);
    ctx.fill();
    ctx.strokeRect(g.x + 5, g.y + 12, g.width - 10, g.height - 12);
    if (open) {
      const glow = ctx.createRadialGradient(
        g.x + g.width / 2, g.y + g.height / 2, 4,
        g.x + g.width / 2, g.y + g.height / 2, 110,
      );
      glow.addColorStop(0, `rgba(139, 226, 139, ${0.4 * pulse})`);
      glow.addColorStop(1, 'rgba(139, 226, 139, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(g.x + g.width / 2, g.y + g.height / 2, 110, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = open ? '#8be28b' : PALETTE.muted;
    ctx.font = `700 15px ${FONT_UI}`;
    ctx.textAlign = 'center';
    const labelX = Math.min(g.x + g.width / 2, FIELD.width - 85);
    ctx.fillText(open ? 'GATE OPEN!' : 'kindle every lamp', labelX, g.y + g.height + 22);
  }

  function drawShards(state, time) {
    for (const shard of state.shardsList) {
      const pulse = shard.used ? 0.25 : 0.7 + 0.3 * Math.sin(time * 5 + shard.x);
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = shard.used ? 'rgba(120, 130, 160, 0.4)' : `rgba(185, 246, 255, ${pulse})`;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.strokeStyle = shard.used ? 'rgba(120, 130, 160, 0.5)' : 'rgba(244, 234, 210, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
      if (!shard.used) {
        ctx.strokeStyle = `rgba(185, 246, 255, ${0.35 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shard.x - 90, shard.y);
        ctx.lineTo(shard.x + 90, shard.y);
        ctx.stroke();
      }
    }
  }

  function drawWindBands(state, time) {
    for (const band of state.windBands) {
      ctx.fillStyle = 'rgba(220, 225, 255, 0.07)';
      ctx.fillRect(band.x0, 80, band.x1 - band.x0, FIELD.marketTop - 80);
      ctx.fillStyle = 'rgba(220, 225, 255, 0.8)';
      ctx.font = `700 18px ${FONT_UI}`;
      ctx.textAlign = 'center';
      const arrow = band.dir > 0 ? '→ → →' : '← ← ←';
      const y = 120 + ((time * 40) % 60);
      ctx.fillText(arrow, (band.x0 + band.x1) / 2, y);
    }
  }

  function drawBoss(state, time) {
    const boss = state.boss;
    if (!boss || boss.hp <= 0) return;
    // Telegraph: the warn shadow, 0.8s before each swoop.
    if (boss.mode === 'warn') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 18);
      ctx.strokeStyle = `rgba(255, 93, 115, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(boss.warnX, boss.warnY, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255, 93, 115, ${pulse})`;
      ctx.font = `700 30px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', boss.warnX, boss.warnY + 10);
    }
    ctx.save();
    ctx.translate(boss.x, boss.y);
    const tilt = boss.mode === 'swoop' ? Math.atan2(boss.vy, boss.vx) - Math.PI / 2 : Math.sin(time * 1.1) * 0.1;
    ctx.rotate(tilt);
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
    glow.addColorStop(0, 'rgba(255, 93, 115, 0.28)');
    glow.addColorStop(1, 'rgba(255, 93, 115, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1026';
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.lineTo(62, 0);
    ctx.lineTo(0, 92);
    ctx.lineTo(-62, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c94f43';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.lineTo(0, 92);
    ctx.moveTo(-62, 0);
    ctx.lineTo(62, 0);
    ctx.stroke();
    // Crown: a golden band with three sockets; lit sockets glow.
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(-58, -72);
    ctx.lineTo(58, -72);
    ctx.lineTo(48, -58);
    ctx.lineTo(-48, -58);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 16, 31, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 92);
    const sway = Math.sin(boss.flap) * 16;
    ctx.quadraticCurveTo(sway, 140, -sway * 0.5, 180);
    ctx.stroke();
    ctx.fillStyle = '#c94f43';
    ctx.beginPath();
    ctx.arc(sway * 0.5, 150, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Crown-lamps ride above the boss in world space.
    for (const lamp of state.lamps) {
      if (!lamp.crown) continue;
      const pulse = lamp.lit ? 0.9 : 0.55 + 0.25 * Math.sin(time * 4 + lamp.dx);
      const glow2 = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 40);
      glow2.addColorStop(0, lamp.lit ? `rgba(255, 210, 125, ${pulse})` : `rgba(180, 175, 210, ${0.4 * pulse})`);
      glow2.addColorStop(1, 'rgba(255, 158, 61, 0)');
      ctx.fillStyle = glow2;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lamp.lit ? PALETTE.lanternBody : '#5a5470';
      ctx.beginPath();
      ctx.ellipse(lamp.x, lamp.y, 12, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      if (lamp.lit) {
        ctx.fillStyle = 'rgba(255, 244, 200, 0.95)';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawFireworks(state, time) {
    for (const firework of state.fireworksList) {
      if (firework.warn > 0) {
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
      const fade = 1 - firework.radius / 150;
      ctx.strokeStyle = `rgba(255, 93, 115, ${0.9 * fade + 0.1})`;
      ctx.lineWidth = 15 * fade + 3;
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
      ctx.fillStyle = `rgba(255, 93, 115, ${0.25 * (flash.life / 0.7)})`;
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

  function drawFloats(state) {
    ctx.textAlign = 'center';
    for (const float of state.floats) {
      const rise = (1 - float.life / float.maxLife) * 34;
      ctx.globalAlpha = Math.max(0, float.life / float.maxLife);
      ctx.fillStyle = float.color;
      ctx.font = `700 17px ${FONT_UI}`;
      ctx.fillText(float.text, float.x, float.y - rise);
    }
    ctx.globalAlpha = 1;
  }

  function drawWindBanner(state) {
    if (!state.wind.active) return;
    const dir = state.wind.direction > 0 ? '→' : '←';
    ctx.fillStyle = 'rgba(220, 225, 255, 0.85)';
    ctx.font = `600 20px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText(`wind ${dir} ${dir} ${dir}`, FIELD.width / 2, 118);
  }

  function drawHud(state, run) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(12, 10, FIELD.width - 24, 56, 12);
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 24px ${FONT_UI}`;
    ctx.fillText(`Score ${run.score}`, 28, 30);
    if (state.combo >= 2) {
      ctx.fillStyle = PALETTE.wish;
      ctx.font = `700 16px ${FONT_UI}`;
      ctx.fillText(`combo x${state.combo}  ·  ${run.scoreMult.toFixed(1)}x`, 28, 54);
      ctx.fillStyle = PALETTE.text;
    }
    ctx.textAlign = 'center';
    ctx.font = `700 20px ${FONT_UI}`;
    ctx.fillText(`Night ${state.night}/7 — ${state.nightDef.name}`, FIELD.width / 2, 26);
    // Wishes + lamps, centre row.
    ctx.font = `600 15px ${FONT_UI}`;
    const lampsLit = state.lamps.filter((l) => l.lit).length;
    const lampWord = state.nightDef.special === 'climb' ? '' : `   ·   🏮 ${lampsLit}/${state.lamps.length}`;
    ctx.fillText(`✦ ${state.wishes}/${state.wishesGoal}${lampWord}`, FIELD.width / 2, 50);
    // Flame bar, right of centre.
    const barWidth = 200;
    const barX = FIELD.width / 2 + 260;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(barX, 44, barWidth, 12, 6);
    ctx.fill();
    const flameFraction = state.flame / (state.flameMax || 100);
    ctx.fillStyle = flameFraction > 0.35 ? '#ff9e3d' : PALETTE.danger;
    ctx.beginPath();
    ctx.roundRect(barX, 44, Math.max(4, barWidth * flameFraction), 12, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 11px ${FONT_UI}`;
    ctx.fillText('FLAME', barX + barWidth / 2, 50);
    for (let i = 0; i < run.gustMax; i += 1) {
      ctx.fillStyle = i < state.gustCharges ? '#ffd27d' : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(barX + barWidth + 16 + i * 15, 50, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.font = `700 20px ${FONT_UI}`;
    ctx.fillText(`❤ ${'●'.repeat(Math.max(0, run.lives))}${'○'.repeat(Math.max(0, 3 - run.lives))}`, FIELD.width - 28, 30);
    if (state.shieldActive) {
      ctx.fillStyle = '#8be28b';
      ctx.font = `700 15px ${FONT_UI}`;
      ctx.fillText('🛡️ shield', FIELD.width - 28, 54);
    }
    // Boss health bar.
    if (state.boss && state.boss.hp > 0) {
      const bw = 420;
      const bx = FIELD.width / 2 - bw / 2;
      ctx.fillStyle = 'rgba(16, 14, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(bx, 78, bw, 22, 11);
      ctx.fill();
      ctx.fillStyle = PALETTE.boss;
      ctx.beginPath();
      ctx.roundRect(bx + 3, 81, (bw - 6) * (state.boss.hp / state.boss.maxHp), 16, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 15px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.fillText('THE KITE KING', FIELD.width / 2, 89);
    }
  }

  function drawHint(state) {
    if (state.hint <= 0 || state.night !== 1) return;
    ctx.fillStyle = 'rgba(253, 246, 227, 0.9)';
    ctx.font = `600 18px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText('Fly through a paper lamp to KINDLE it — kindle them all to open the gate →', FIELD.width / 2, 690);
  }

  function drawMoonCall(state, time) {
    if (!state.gateOpen || state.won) return;
    const pulse = 0.7 + 0.3 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(247, 233, 184, ${pulse})`;
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'center';
    const label = state.nightDef.special === 'climb' ? 'The moon is open — climb to it!' : 'The gate is open — fly through it!';
    ctx.fillText(label, FIELD.width / 2, 148);
  }

  function dimPanel() {
    ctx.fillStyle = 'rgba(10, 8, 30, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function centrePanel(y, height, width) {
    const w = width || 720;
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(FIELD.width / 2 - w / 2, y, w, height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 207, 125, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(FIELD.width / 2 - w / 2, y, w, height, 18);
    ctx.stroke();
  }

  function drawTitle(state, best) {
    dimPanel();
    centrePanel(100, 500);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.moonGlow;
    ctx.font = `700 84px ${FONT}`;
    ctx.fillText('LAMPION', FIELD.width / 2, 165);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 24px ${FONT}`;
    ctx.fillText('Seven Nights to the Moon', FIELD.width / 2, 220);
    ctx.font = `17px ${FONT_UI}`;
    ctx.fillStyle = PALETTE.muted;
    const lines = [
      'Follow your mouse, or steer with Arrow keys / WASD. Space or click: gust.',
      'KINDLE every paper lamp to open the gate — then fly through it.',
      'Gather the night’s wishes, feed your flame with embers, dodge fireworks & kites.',
      'Between nights, pick one upgrade. Night 6: the Kite King. Night 7: the climb.',
      'P pause · R restart · M mute',
    ];
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 272 + i * 28));
    ctx.fillStyle = PALETTE.lanternBody;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Click or press Enter to fly', FIELD.width / 2, 452);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT_UI}`;
    ctx.fillText(best > 0 ? `Best score: ${best}` : 'Your first flight awaits — good luck, little lantern.', FIELD.width / 2, 494);
    ctx.fillText('7 nights · 3 lives · the night grows harder as you climb', FIELD.width / 2, 526);
  }

  function drawIntro(state) {
    dimPanel();
    centrePanel(180, 330);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 20px ${FONT_UI}`;
    ctx.fillText(`NIGHT ${state.night} OF 7`, FIELD.width / 2, 225);
    ctx.fillStyle = PALETTE.moonGlow;
    ctx.font = `700 52px ${FONT}`;
    ctx.fillText(state.nightDef.name, FIELD.width / 2, 285);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 22px ${FONT}`;
    ctx.fillText(state.nightDef.sub, FIELD.width / 2, 338);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `19px ${FONT_UI}`;
    const goal = state.nightDef.special === 'climb'
      ? `Gather ${state.wishesGoal} wishes, then climb to the moon`
      : state.nightDef.special === 'boss'
        ? `Kindle the Kite King's 3 crown-lamps — ${state.wishesGoal} wishes keep your flame fed`
        : `Gather ${state.wishesGoal} wishes · kindle ${state.lamps.length} lamps · fly the gate`;
    ctx.fillText(goal, FIELD.width / 2, 388);
    ctx.fillStyle = PALETTE.lanternBody;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText('Click or press Enter to begin the night', FIELD.width / 2, 448);
  }

  function drawUpgrade(state, run, choices) {
    dimPanel();
    centrePanel(90, 520, 1080);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.good;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText(`Night ${state.night} cleared!  +${state.nightClearBonus}`, FIELD.width / 2, 135);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Choose one blessing for the nights ahead', FIELD.width / 2, 185);
    choices.forEach((choice, i) => {
      const x = 190 + i * 300;
      const y = 220;
      ctx.fillStyle = 'rgba(255, 207, 125, 0.12)';
      ctx.beginPath();
      ctx.roundRect(x, y, 260, 220, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 207, 125, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, 260, 220, 14);
      ctx.stroke();
      ctx.fillStyle = PALETTE.text;
      ctx.font = '44px system-ui';
      ctx.fillText(choice.icon, x + 130, y + 62);
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(choice.name, x + 130, y + 122);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `17px ${FONT_UI}`;
      ctx.fillText(choice.desc, x + 130, y + 158);
      ctx.fillStyle = PALETTE.lanternBody;
      ctx.font = `700 18px ${FONT_UI}`;
      ctx.fillText(`press ${i + 1} or click`, x + 130, y + 196);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT_UI}`;
    const build = run.upgradesTaken.length > 0
      ? `Your blessings: ${run.upgradesTaken.join(' · ')}`
      : 'No blessings yet — the first is free of regret.';
    ctx.fillText(build, FIELD.width / 2, 480);
    ctx.fillText(`Score ${run.score}   ·   Lives ${run.lives}   ·   Lamps kindled ${run.lampsKindled}`, FIELD.width / 2, 514);
    ctx.fillText(`Next: Night ${state.night + 1} — ${NIGHTS[state.night].name}`, FIELD.width / 2, 548);
  }

  function drawWin(state, run, best) {
    dimPanel();
    centrePanel(130, 430);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.moonGlow;
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText('The Moon Welcomes You', FIELD.width / 2, 195);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 22px ${FONT}`;
    ctx.fillText('Seven nights, one little lantern — home at last, in moonlight.', FIELD.width / 2, 248);
    ctx.font = `700 30px ${FONT_UI}`;
    ctx.fillText(`Score ${run.score}`, FIELD.width / 2, 310);
    ctx.font = `20px ${FONT_UI}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Nights cleared 7/7   ·   Best combo x${run.bestCombo}   ·   Lamps kindled ${run.lampsKindled}`, FIELD.width / 2, 352);
    ctx.fillText(`Blessings: ${run.upgradesTaken.length > 0 ? run.upgradesTaken.join(', ') : 'none'}`, FIELD.width / 2, 384);
    ctx.fillText(`Best score: ${Math.max(best, run.score)}`, FIELD.width / 2, 416);
    ctx.fillStyle = PALETTE.lanternBody;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Press R or click to fly again', FIELD.width / 2, 478);
  }

  function drawOver(state, run, best) {
    dimPanel();
    centrePanel(130, 430);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `700 52px ${FONT}`;
    ctx.fillText(run.lives <= 0 ? 'Torn by the Night' : 'The Flame Has Gone Out', FIELD.width / 2, 195);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 22px ${FONT}`;
    ctx.fillText(
      run.lives <= 0
        ? 'The lantern falls, gently, back toward the warm market below.'
        : 'The little flame flickered down to embers — feed it next time.',
      FIELD.width / 2, 248,
    );
    ctx.font = `700 30px ${FONT_UI}`;
    ctx.fillText(`Score ${run.score}`, FIELD.width / 2, 310);
    ctx.font = `20px ${FONT_UI}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Reached Night ${state.night}/7 — ${state.nightDef.name}   ·   Best combo x${run.bestCombo}`, FIELD.width / 2, 352);
    ctx.fillText(`Lamps kindled ${run.lampsKindled}   ·   Wishes this night ${state.wishes}/${state.wishesGoal}`, FIELD.width / 2, 384);
    ctx.fillText(`Best score: ${Math.max(best, run.score)}`, FIELD.width / 2, 416);
    ctx.fillStyle = PALETTE.lanternBody;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('Press R or click to try again', FIELD.width / 2, 478);
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

  /** Draw one frame: the realm, the world, then the HUD, then the screen on top. */
  renderer.draw = function draw(state, screen, best, ui) {
    fitCanvas();
    const time = state.time;
    const run = ui && ui.run ? ui.run : { score: state.score || 0, lives: 3, bestCombo: 0, lampsKindled: 0, nightsCleared: 0, upgradesTaken: [], scoreMult: 1 };
    const cameraY = state.cameraY || 0;
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    ctx.save();
    if (state.shake > 0) {
      const mag = state.shake * 9;
      ctx.translate(Math.sin(time * 91) * mag, Math.cos(time * 113) * mag);
    }
    drawSky(state, time);
    const realm = realmOf(state);
    if (realm === 'market') drawMarket(time);
    else if (realm === 'river') drawRiver(state, time);
    else drawClouds(state, time);
    if (realm !== 'sky') drawMoon(state, time);
    else if (state.nightDef && state.nightDef.special === 'climb') drawMoon(state, time);
    else drawMoon(state, time);
    // World-space layer, scrolled by the climb camera.
    ctx.save();
    ctx.translate(0, -cameraY);
    if (realm === 'river') drawWindBands(state, time);
    drawGate(state, time);
    drawShards(state, time);
    drawFireworks(state, time);
    drawEmbers(state, time);
    drawBoats(state, time);
    drawWishes(state, time);
    drawKites(state);
    drawBoss(state, time);
    drawLamps(state, time);
    drawParticles(state);
    drawLantern(state, time);
    drawFloats(state);
    ctx.restore();
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) {
      drawHud(state, run);
      drawWindBanner(state);
      drawMoonCall(state, time);
      drawHint(state);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_INTRO) drawIntro(state);
    if (screen === SCREEN_UPGRADE) drawUpgrade(state, run, (ui && ui.choices) || []);
    if (screen === SCREEN_WIN) drawWin(state, run, best);
    if (screen === SCREEN_OVER) drawOver(state, run, best);
    if (screen === SCREEN_PAUSE) drawPause();
    ctx.restore();
  };

  fitCanvas();
  return renderer;
}
