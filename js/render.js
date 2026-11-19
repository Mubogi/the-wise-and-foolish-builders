/**
 * render.js — the cutaway cross-section renderer.
 * Logical space is 1200x740 and is scaled to fit the canvas element.
 */

import { PILINGS } from './data.js';

const BASE_W = 1200;
const BASE_H = 740;

// Logical viewport. Widened on resize so the cutaway fills any aspect ratio.
let W = BASE_W;
let H = BASE_H;

const GROUND_Y = 332;
const SLAB_TOP = 344;
const PILING_TOP = 350;
const PILING_BOTTOM_MAX = 704;
const BEDROCK_TOP = 566;
const HOUSE_CX_DEFAULT = 600;
let HOUSE_CX = HOUSE_CX_DEFAULT;
const HOUSE_HALF = 176;
const PILING_SPAN = 150;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/* Strata decorations, rebuilt whenever the logical viewport widens. */
let SOIL_DOTS = [];
let ROCK_DOTS = [];
let BEDROCK_EDGE = [];
let decoW = -1;

function buildDecorations() {
  if (Math.abs(decoW - W) < 1) return;
  decoW = W;

  const rand = mulberry32(1337);
  SOIL_DOTS = [];
  for (let i = 0; i < Math.round(260 * (W / BASE_W)); i++) {
    SOIL_DOTS.push({
      x: rand() * W,
      y: GROUND_Y + 8 + rand() * (BEDROCK_TOP - GROUND_Y - 4),
      r: 0.8 + rand() * 2.4,
      a: 0.05 + rand() * 0.16,
    });
  }

  const rand2 = mulberry32(4242);
  ROCK_DOTS = [];
  for (let i = 0; i < Math.round(200 * (W / BASE_W)); i++) {
    ROCK_DOTS.push({
      x: rand2() * W,
      y: BEDROCK_TOP + rand2() * (H - BEDROCK_TOP),
      r: 1 + rand2() * 4,
      a: 0.05 + rand2() * 0.13,
      rot: rand2() * Math.PI,
    });
  }

  const rand3 = mulberry32(99);
  BEDROCK_EDGE = [];
  for (let x = -20; x <= W + 20; x += 24) {
    BEDROCK_EDGE.push({ x, y: BEDROCK_TOP + (rand3() - 0.5) * 26 });
  }
}

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.scale = 1;
    this.ox = 0;
    this.oy = 0;

    this.t = 0;
    this.speed = 1;

    this.rain = [];
    this.gusts = [];
    this.debris = [];
    this.sparks = [];

    this.storm = {
      active: false,
      phase: 'calm',
      phaseT: 0,
      water: 0,
      waterTarget: 0,
      darkness: 0,
      darknessTarget: 0,
      rainAmount: 0,
      rainTarget: 0,
      windAmount: 0,
      windTarget: 0,
      flash: 0,
      shake: 0,
      outcome: null,
      reported: false,
      label: '',
    };

    // Displayed values lerp toward the model so growth feels physical.
    this.disp = {
      influence: 0,
      sand: 0,
      stress: 0,
      depth: {},
    };
    for (const p of PILINGS) this.disp.depth[p.id] = 0;

    this.forecastDark = 0;
    this.shelterT = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    // Fit by height, then widen the logical viewport to fill any extra width.
    // This keeps the house at a constant size and removes letterbox bars.
    const s = h / BASE_H;
    this.scale = s;
    this.oy = 0;
    this.ox = 0;
    W = Math.max(BASE_W * 0.85, w / s);
    HOUSE_CX = W / 2;
    H = BASE_H;
    this.dpr = dpr;
    buildDecorations();
  }

  setState(state) {
    this.state = state;
  }

  /** Called when a storm begins. */
  startStorm(report) {
    const s = this.storm;
    s.active = true;
    s.phase = 'gather';
    s.phaseT = 0;
    s.outcome = report ? report.outcome : 'held';
    s.label = report ? report.storm.name : '';
    s.reported = false;
    s.darknessTarget = 0.85;
    s.rainTarget = 1;
    s.windTarget = 1;
    s.waterTarget = 0;
    if (report && (report.outcome === 'sheltered' || report.outcome === 'held')) {
      this.shelterT = 1;
    }
  }

  /** Called when the UI has shown the report and the player resumes. */
  endStorm() {
    const s = this.storm;
    s.phase = 'subside';
    s.phaseT = 0;
    s.darknessTarget = 0;
    s.rainTarget = 0;
    s.windTarget = 0;
    s.waterTarget = 0;
  }

  burst(x, y, n = 14, color = '#c9b48a') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 220;
      this.debris.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.9 + Math.random() * 0.9,
        age: 0,
        r: 1.5 + Math.random() * 4,
        color,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 10,
      });
    }
  }

  /* -------------------------------------------------------------- */

  update(dt) {
    const d = dt * this.speed;
    this.t += d;
    const st = this.state;
    if (!st) return;

    // Smooth display values.
    const k = 1 - Math.pow(0.0015, d);
    this.disp.influence = lerp(this.disp.influence, st.influence, k);
    this.disp.sand = lerp(this.disp.sand, st.sand, k);
    this.disp.stress = lerp(this.disp.stress, st.stress, k);
    for (const p of PILINGS) {
      this.disp.depth[p.id] = lerp(this.disp.depth[p.id], st.pilings[p.id].depth, k);
    }

    // Forecast gloom: skies darken as a storm approaches.
    const days = this._daysToStorm();
    const gloom = days <= 3 ? (4 - days) / 4 : 0;
    this.forecastDark = lerp(this.forecastDark, gloom * 0.5, 1 - Math.pow(0.02, d));

    this._updateStorm(d);
    this._updateParticles(d);
  }

  _daysToStorm() {
    const st = this.state;
    if (!st) return 9;
    const stormDays = [3, 7, 11, 15, 19];
    const next = stormDays.find((x) => x >= st.day);
    return next === undefined ? 9 : next - st.day + 1;
  }

  _updateStorm(d) {
    const s = this.storm;
    const ease = 1 - Math.pow(0.08, d);
    s.darkness = lerp(s.darkness, s.darknessTarget, ease);
    s.rainAmount = lerp(s.rainAmount, s.rainTarget, ease);
    s.windAmount = lerp(s.windAmount, s.windTarget, ease);
    s.water = lerp(s.water, s.waterTarget, 1 - Math.pow(0.35, d));
    s.flash = Math.max(0, s.flash - d * 3.2);
    s.shake = Math.max(0, s.shake - d * 1.6);
    if (this.shelterT > 0 && !s.active) this.shelterT = Math.max(0, this.shelterT - d * 0.25);

    if (!s.active) return;

    s.phaseT += d;

    if (s.phase === 'gather') {
      if (s.phaseT > 2.2) {
        s.phase = 'rain';
        s.phaseT = 0;
      }
    } else if (s.phase === 'rain') {
      if (s.phaseT > 3.6) {
        s.phase = 'flood';
        s.phaseT = 0;
        s.waterTarget = 1;
      }
    } else if (s.phase === 'flood') {
      if (s.phaseT > 3.4) {
        s.phase = 'impact';
        s.phaseT = 0;
        s.flash = 1;
        s.shake = s.outcome === 'collapsed' ? 1 : s.outcome === 'cracked' ? 0.6 : 0.25;
        // Debris bursts from failing pilings.
        const cracked = this.state.history[this.state.history.length - 1];
        const ids = cracked ? cracked.cracked : [];
        ids.forEach((id, i) => {
          const idx = PILINGS.findIndex((p) => p.id === id);
          const x = HOUSE_CX - PILING_SPAN + (idx / (PILINGS.length - 1)) * PILING_SPAN * 2;
          this.burst(x, GROUND_Y + 40 + i * 10, 16, '#d8bd84');
        });
        if (s.outcome === 'collapsed' || s.outcome === 'cracked') {
          for (let i = 0; i < 4; i++) {
            this.burst(
              HOUSE_CX - HOUSE_HALF + Math.random() * HOUSE_HALF * 2,
              GROUND_Y - 40 - Math.random() * 120,
              10,
              '#b9a98b'
            );
          }
        }
      }
    } else if (s.phase === 'impact') {
      if (s.phaseT > 1.4) {
        s.phase = 'subside';
        s.phaseT = 0;
        s.darknessTarget = 0.12;
        s.rainTarget = 0.25;
        s.windTarget = 0.1;
        s.waterTarget = 0;
      }
    } else if (s.phase === 'subside') {
      if (s.phaseT > 3.2) {
        s.active = false;
        s.phase = 'calm';
        s.darknessTarget = 0;
        s.rainTarget = 0;
        s.windTarget = 0;
        s.outcome = null;
      }
    }
  }

  _updateParticles(d) {
    const s = this.storm;
    // Rain
    const target = Math.round(240 * s.rainAmount);
    while (this.rain.length < target) {
      this.rain.push({
        x: Math.random() * (W + 260) - 130,
        y: Math.random() * GROUND_Y - GROUND_Y,
        v: 620 + Math.random() * 480,
        len: 12 + Math.random() * 22,
        a: 0.16 + Math.random() * 0.34,
      });
    }
    if (this.rain.length > target) this.rain.length = target;

    const windX = -170 * s.windAmount;
    for (const r of this.rain) {
      r.y += r.v * d;
      r.x += windX * d;
      if (r.y > GROUND_Y + 6) {
        r.y = -30 - Math.random() * 160;
        r.x = Math.random() * (W + 260) - 130;
      }
      if (r.x < -140) r.x += W + 260;
    }

    // Wind gusts
    const gustTarget = Math.round(16 * s.windAmount);
    while (this.gusts.length < gustTarget) {
      this.gusts.push({
        x: W + Math.random() * 300,
        y: 40 + Math.random() * (GROUND_Y - 60),
        len: 60 + Math.random() * 150,
        v: 340 + Math.random() * 420,
        a: 0.08 + Math.random() * 0.2,
        w: 1 + Math.random() * 2,
      });
    }
    if (this.gusts.length > gustTarget) this.gusts.length = gustTarget;
    for (const g of this.gusts) {
      g.x -= g.v * d;
      if (g.x + g.len < -40) {
        g.x = W + Math.random() * 260;
        g.y = 40 + Math.random() * (GROUND_Y - 60);
      }
    }

    // Debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const p = this.debris[i];
      p.age += d;
      p.vy += 900 * d;
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.rot += p.vr * d;
      if (p.age > p.life || p.y > H + 60) this.debris.splice(i, 1);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.age += d;
      if (p.age > p.life) this.sparks.splice(i, 1);
    }

    // Random lightning during heavy rain
    if (s.active && (s.phase === 'rain' || s.phase === 'flood') && Math.random() < d * 0.55) {
      s.flash = 0.75 + Math.random() * 0.25;
    }
  }

  /* -------------------------------------------------------------- */
  /* Drawing                                                         */
  /* -------------------------------------------------------------- */

  draw() {
    const ctx = this.ctx;
    const st = this.state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);

    const shakeAmt = this.storm.shake * 7;
    if (shakeAmt > 0.1) {
      ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
    }

    if (!st) {
      ctx.restore();
      return;
    }

    this._sky(ctx);
    this._celestial(ctx);
    this._hills(ctx);
    this._ground(ctx);
    this._underground(ctx, st);
    this._pilings(ctx, st);
    this._house(ctx, st);
    this._labels(ctx);
    this._water(ctx);
    this._weather(ctx);
    this._debris(ctx);

    ctx.restore();

    if (this.storm.flash > 0.02) {
      ctx.fillStyle = `rgba(226,238,255,${this.storm.flash * 0.5})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  _sky(ctx) {
    const s = this.storm;
    const dark = clamp(s.darkness + this.forecastDark * (1 - s.darkness), 0, 1);
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    const calmTop = [86, 132, 190];
    const calmBot = [186, 208, 226];
    const darkTop = [26, 32, 46];
    const darkBot = [58, 70, 92];
    const mix = (a, b) => Math.round(lerp(a, b, dark));
    g.addColorStop(0, `rgb(${mix(calmTop[0], darkTop[0])},${mix(calmTop[1], darkTop[1])},${mix(calmTop[2], darkTop[2])})`);
    g.addColorStop(1, `rgb(${mix(calmBot[0], darkBot[0])},${mix(calmBot[1], darkBot[1])},${mix(calmBot[2], darkBot[2])})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y + 2);

    // Clouds
    const cloudAlpha = 0.18 + dark * 0.5;
    const cloudCol = dark > 0.45 ? '58,64,82' : '255,252,244';
    for (let i = 0; i < 6; i++) {
      const drift = (this.t * (8 + i * 3.5)) % (W + 400);
      const x = ((i * 247 + drift) % (W + 400)) - 200;
      const y = 44 + (i % 3) * 52;
      const sc = 0.7 + (i % 4) * 0.22;
      this._cloud(ctx, x, y, sc, cloudCol, cloudAlpha);
    }
  }

  _cloud(ctx, x, y, sc, rgb, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.arc(46, 8, 32, 0, Math.PI * 2);
    ctx.arc(-44, 10, 28, 0, Math.PI * 2);
    ctx.arc(16, -18, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _celestial(ctx) {
    const dark = clamp(this.storm.darkness + this.forecastDark * 0.6, 0, 1);
    const sunX = 190;
    const sunY = 118;
    const a = (1 - dark) * 0.9;
    if (a <= 0.02) return;
    const g = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
    g.addColorStop(0, `rgba(255,246,214,${a})`);
    g.addColorStop(0.35, `rgba(255,226,160,${a * 0.42})`);
    g.addColorStop(1, 'rgba(255,226,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,250,228,${a})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  _hills(ctx) {
    const dark = clamp(this.storm.darkness + this.forecastDark * 0.5, 0, 1);
    ctx.save();
    ctx.fillStyle = `rgb(${Math.round(lerp(104, 40, dark))},${Math.round(lerp(140, 58, dark))},${Math.round(lerp(150, 74, dark))})`;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 268);
    ctx.quadraticCurveTo(120, 214, 260, 262);
    ctx.quadraticCurveTo(400, 300, 520, 254);
    ctx.quadraticCurveTo(660, 208, 800, 258);
    ctx.quadraticCurveTo(960, 306, 1100, 250);
    ctx.lineTo(W, 268);
    ctx.lineTo(W, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgb(${Math.round(lerp(84, 34, dark))},${Math.round(lerp(120, 50, dark))},${Math.round(lerp(122, 62, dark))})`;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 300);
    ctx.quadraticCurveTo(180, 268, 340, 306);
    ctx.quadraticCurveTo(520, 344, 700, 300);
    ctx.quadraticCurveTo(880, 258, 1060, 302);
    ctx.lineTo(W, 292);
    ctx.lineTo(W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _ground(ctx) {
    // Grass band
    const g = ctx.createLinearGradient(0, GROUND_Y - 6, 0, GROUND_Y + 16);
    g.addColorStop(0, '#6f8f4e');
    g.addColorStop(1, '#4a6536');
    ctx.fillStyle = g;
    ctx.fillRect(0, GROUND_Y - 4, W, 18);

    // Grass blades
    const rand = mulberry32(777);
    ctx.strokeStyle = 'rgba(126,158,86,0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 160; i++) {
      const x = rand() * W;
      const h = 4 + rand() * 8;
      ctx.moveTo(x, GROUND_Y + 1);
      ctx.lineTo(x + (rand() - 0.5) * 3, GROUND_Y + 1 - h);
    }
    ctx.stroke();
  }

  _underground(ctx, st) {
    const sandT = clamp(this.disp.sand / 100, 0, 1);

    // Base soil column
    const soil = ctx.createLinearGradient(0, GROUND_Y, 0, BEDROCK_TOP);
    soil.addColorStop(0, '#6b5334');
    soil.addColorStop(0.5, '#5c4629');
    soil.addColorStop(1, '#4a3820');
    ctx.fillStyle = soil;
    ctx.fillRect(0, GROUND_Y + 12, W, BEDROCK_TOP - GROUND_Y);

    // Loose sand layer grows with the sand metric — drawn from the top down.
    const sandDepth = 14 + sandT * (BEDROCK_TOP - GROUND_Y - 18);
    if (sandDepth > 2) {
      const sg = ctx.createLinearGradient(0, GROUND_Y + 12, 0, GROUND_Y + 12 + sandDepth);
      sg.addColorStop(0, '#e0c896');
      sg.addColorStop(1, '#b99a5f');
      ctx.fillStyle = sg;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 12);
      ctx.lineTo(W, GROUND_Y + 12);
      ctx.lineTo(W, GROUND_Y + 12 + sandDepth);
      const rand = mulberry32(31);
      for (let x = W; x >= 0; x -= 30) {
        ctx.lineTo(x, GROUND_Y + 12 + sandDepth + (rand() - 0.5) * 10);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Sand grain texture
      const rand2 = mulberry32(555);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < 420; i++) {
        const x = rand2() * W;
        const y = GROUND_Y + 14 + rand2() * sandDepth;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      ctx.fillStyle = 'rgba(90,68,34,0.16)';
      for (let i = 0; i < 300; i++) {
        const x = rand2() * W;
        const y = GROUND_Y + 14 + rand2() * sandDepth;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Soil dots / pebbles
    for (const d of SOIL_DOTS) {
      ctx.fillStyle = `rgba(255,236,200,${d.a})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bedrock
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-20, H);
    ctx.lineTo(-20, BEDROCK_EDGE[0].y);
    for (const p of BEDROCK_EDGE) ctx.lineTo(p.x, p.y);
    ctx.lineTo(W + 20, H);
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, BEDROCK_TOP, 0, H);
    rg.addColorStop(0, '#7b8798');
    rg.addColorStop(0.4, '#5d6a7c');
    rg.addColorStop(1, '#3d4756');
    ctx.fillStyle = rg;
    ctx.fill();

    // Rock facets
    ctx.clip();
    for (const d of ROCK_DOTS) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = `rgba(232,240,250,${d.a})`;
      ctx.fillRect(-d.r, -d.r * 0.6, d.r * 2, d.r * 1.2);
      ctx.restore();
    }
    // Strata lines
    ctx.strokeStyle = 'rgba(20,26,34,0.22)';
    ctx.lineWidth = 2;
    const rand = mulberry32(88);
    for (let i = 0; i < 5; i++) {
      const y = BEDROCK_TOP + 24 + i * 34;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 60) ctx.lineTo(x, y + (rand() - 0.5) * 16);
      ctx.stroke();
    }
    ctx.restore();

    // Bedrock top highlight
    ctx.strokeStyle = 'rgba(196,214,236,0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-20, BEDROCK_EDGE[0].y);
    for (const p of BEDROCK_EDGE) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  _pilings(ctx, st) {
    const n = PILINGS.length;
    for (let i = 0; i < n; i++) {
      const p = PILINGS[i];
      const ps = st.pilings[p.id];
      const depth = this.disp.depth[p.id];
      const x = HOUSE_CX - PILING_SPAN + (i / (n - 1)) * PILING_SPAN * 2;
      const w = 17;
      const len = (depth / 100) * (PILING_BOTTOM_MAX - PILING_TOP);
      const bottom = PILING_TOP + len;
      const anchored = depth >= 62;
      const inRock = Math.max(0, bottom - BEDROCK_TOP);

      // Hole shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      rr(ctx, x - w / 2 - 2, PILING_TOP, w + 4, Math.max(2, len + 4), 4);
      ctx.fill();

      // Shaft
      const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      if (ps.cracked > 0) {
        g.addColorStop(0, '#b9756e');
        g.addColorStop(0.45, '#e8a49c');
        g.addColorStop(1, '#a95f58');
      } else if (anchored) {
        g.addColorStop(0, '#7fb99b');
        g.addColorStop(0.45, '#bfe6cf');
        g.addColorStop(1, '#5d9a7c');
      } else {
        g.addColorStop(0, '#a8863f');
        g.addColorStop(0.45, '#e8cb84');
        g.addColorStop(1, '#8f6f2e');
      }
      ctx.fillStyle = g;
      rr(ctx, x - w / 2, PILING_TOP, w, Math.max(2, len), 3);
      ctx.fill();

      // Rebar lines
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - w / 6, PILING_TOP + 4);
      ctx.lineTo(x - w / 6, bottom - 3);
      ctx.moveTo(x + w / 6, PILING_TOP + 4);
      ctx.lineTo(x + w / 6, bottom - 3);
      ctx.stroke();

      // Anchor spark where it bites the rock
      if (inRock > 2) {
        const pulse = 0.55 + 0.45 * Math.sin(this.t * 2.4 + i);
        ctx.save();
        ctx.shadowColor = 'rgba(150,235,190,0.95)';
        ctx.shadowBlur = 18 * pulse;
        ctx.fillStyle = `rgba(198,246,222,${0.55 + 0.35 * pulse})`;
        ctx.beginPath();
        ctx.arc(x, bottom - 3, 5 + pulse * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Chiselled rock contact
        ctx.strokeStyle = 'rgba(160,230,196,0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - 5, bottom - 9);
        ctx.lineTo(x - w / 2 - 1, bottom - 1);
        ctx.moveTo(x + w / 2 + 5, bottom - 9);
        ctx.lineTo(x + w / 2 + 1, bottom - 1);
        ctx.stroke();
      }

      // Cracks
      if (ps.cracked > 0) {
        ctx.strokeStyle = 'rgba(58,20,18,0.85)';
        ctx.lineWidth = ps.cracked >= 2 ? 2.6 : 1.8;
        ctx.beginPath();
        const cTop = PILING_TOP + len * 0.18;
        let cy = cTop;
        let cx = x;
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 6; s++) {
          cy += len * 0.13;
          cx += (s % 2 ? 1 : -1) * (w * 0.32);
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        if (ps.cracked >= 2) {
          ctx.beginPath();
          ctx.moveTo(x, cTop + len * 0.2);
          for (let s = 0; s < 4; s++) {
            ctx.lineTo(x + (s % 2 ? 1 : -1) * (w * 0.4), cTop + len * 0.2 + s * len * 0.15);
          }
          ctx.stroke();
        }
      }

      // Icon cap at the top
      ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(12,18,26,0.55)';
      ctx.beginPath();
      ctx.arc(x, PILING_TOP - 11, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ps.cracked > 0 ? '#f0b0a8' : anchored ? '#c6f6de' : '#e8cb84';
      ctx.fillText(p.icon, x, PILING_TOP - 10.5);
    }

    // Foundation slab
    const slabW = HOUSE_HALF * 2 + 34;
    const sg = ctx.createLinearGradient(0, SLAB_TOP - 14, 0, SLAB_TOP + 12);
    sg.addColorStop(0, '#9aa5b4');
    sg.addColorStop(0.5, '#7c8798');
    sg.addColorStop(1, '#5f6a7a');
    ctx.fillStyle = sg;
    rr(ctx, HOUSE_CX - slabW / 2, SLAB_TOP - 14, slabW, 22, 4);
    ctx.fill();

    // Stone joints
    ctx.strokeStyle = 'rgba(24,30,40,0.35)';
    ctx.lineWidth = 1.2;
    const rand = mulberry32(19);
    for (let x = HOUSE_CX - slabW / 2 + 22; x < HOUSE_CX + slabW / 2 - 6; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, SLAB_TOP - 14);
      ctx.lineTo(x + (rand() - 0.5) * 5, SLAB_TOP + 8);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(24,30,40,0.4)';
    ctx.beginPath();
    ctx.moveTo(HOUSE_CX - slabW / 2, SLAB_TOP - 1);
    ctx.lineTo(HOUSE_CX + slabW / 2, SLAB_TOP - 1);
    ctx.stroke();
  }

  _house(ctx, st) {
    const inf = clamp(this.disp.influence, 0, 130);
    const h = 56 + inf * 1.75;
    const top = GROUND_Y - h;
    const half = HOUSE_HALF;
    const left = HOUSE_CX - half;
    const right = HOUSE_CX + half;
    const base = SLAB_TOP - 14;

    const wallTop = top + 46;

    // Body
    const wg = ctx.createLinearGradient(left, 0, right, 0);
    wg.addColorStop(0, '#e9dcc0');
    wg.addColorStop(0.28, '#f6ecd7');
    wg.addColorStop(0.72, '#efe2c6');
    wg.addColorStop(1, '#d9c9a6');
    ctx.fillStyle = wg;
    ctx.fillRect(left, wallTop, half * 2, base - wallTop);

    // Cutaway interior (front wall removed)
    const inX = left + 14;
    const inW = half * 2 - 28;
    const ig = ctx.createLinearGradient(0, wallTop, 0, base);
    ig.addColorStop(0, '#3a2f22');
    ig.addColorStop(1, '#54402c');
    ctx.fillStyle = ig;
    ctx.fillRect(inX, wallTop + 10, inW, base - wallTop - 22);

    // Floors
    const floors = clamp(Math.round((base - wallTop) / 74), 1, 3);
    const floorH = (base - wallTop - 22) / floors;
    ctx.strokeStyle = 'rgba(214,186,138,0.5)';
    ctx.lineWidth = 3;
    for (let f = 1; f < floors; f++) {
      const fy = wallTop + 10 + f * floorH;
      ctx.beginPath();
      ctx.moveTo(inX, fy);
      ctx.lineTo(inX + inW, fy);
      ctx.stroke();
    }

    // Interior life: family on the ground floor
    this._interior(ctx, inX, wallTop + 10, inW, floorH, floors, st);

    // Windows glowing
    const winRows = floors;
    const winCols = 3;
    for (let f = 0; f < winRows; f++) {
      for (let c = 0; c < winCols; c++) {
        const wx = inX + 22 + c * ((inW - 44) / (winCols - 1 || 1));
        const wy = wallTop + 10 + f * floorH + floorH * 0.22;
        const ww = 24;
        const wh = 20;
        const lit = 0.55 + 0.45 * Math.sin(this.t * 1.6 + f + c * 1.7);
        ctx.fillStyle = `rgba(255,205,120,${0.35 + lit * 0.4})`;
        ctx.fillRect(wx - ww / 2, wy, ww, wh);
        ctx.strokeStyle = 'rgba(60,44,26,0.6)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(wx - ww / 2, wy, ww, wh);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx, wy + wh);
        ctx.moveTo(wx - ww / 2, wy + wh / 2);
        ctx.lineTo(wx + ww / 2, wy + wh / 2);
        ctx.stroke();
      }
    }

    // Corner posts
    ctx.fillStyle = 'rgba(120,96,60,0.55)';
    ctx.fillRect(left, wallTop, 8, base - wallTop);
    ctx.fillRect(right - 8, wallTop, 8, base - wallTop);

    // Eaves
    ctx.fillStyle = '#c2ab80';
    ctx.fillRect(left - 16, wallTop - 12, half * 2 + 32, 14);

    // Roof
    const roofH = 46 + Math.min(30, inf * 0.22);
    ctx.beginPath();
    ctx.moveTo(left - 26, wallTop - 10);
    ctx.lineTo(HOUSE_CX, wallTop - 10 - roofH);
    ctx.lineTo(right + 26, wallTop - 10);
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, wallTop - roofH, 0, wallTop);
    rg.addColorStop(0, '#a8553f');
    rg.addColorStop(1, '#7d3a2b');
    ctx.fillStyle = rg;
    ctx.fill();

    // Roof shingle lines
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const y = wallTop - 10 - roofH * (1 - t);
      const xl = lerp(left - 26, HOUSE_CX, t);
      const xr = lerp(right + 26, HOUSE_CX, t);
      ctx.beginPath();
      ctx.moveTo(xl, y);
      ctx.lineTo(xr, y);
      ctx.stroke();
    }

    // Chimney
    ctx.fillStyle = '#8d7b62';
    ctx.fillRect(HOUSE_CX + 74, wallTop - roofH * 0.72, 20, roofH * 0.5);
    ctx.fillStyle = '#a2907a';
    ctx.fillRect(HOUSE_CX + 71, wallTop - roofH * 0.74, 26, 6);

    // Smoke
    if (inf > 12) {
      ctx.fillStyle = 'rgba(230,236,244,0.16)';
      for (let i = 0; i < 4; i++) {
        const ph = (this.t * 0.32 + i * 0.25) % 1;
        const sx = HOUSE_CX + 84 + Math.sin(ph * 6 + i) * 9;
        const sy = wallTop - roofH * 0.76 - ph * 54;
        ctx.beginPath();
        ctx.arc(sx, sy, 5 + ph * 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cross / testimony marker when the house has real height
    if (inf >= 62) {
      const cx = HOUSE_CX;
      const cy = wallTop - roofH - 16;
      ctx.strokeStyle = 'rgba(232,192,120,0.92)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx, cy + 8);
      ctx.moveTo(cx - 10, cy - 9);
      ctx.lineTo(cx + 10, cy - 9);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // Cracks on the structure from accumulated stress
    const stress = this.disp.stress;
    if (stress > 26) {
      const rand = mulberry32(2024);
      const count = Math.floor((stress - 26) / 12) + 1;
      ctx.strokeStyle = 'rgba(48,26,18,0.62)';
      ctx.lineWidth = 1.7;
      for (let i = 0; i < count; i++) {
        const sx = left + 30 + rand() * (half * 2 - 60);
        const sy = wallTop + 16 + rand() * (base - wallTop - 50);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        let cx2 = sx;
        let cy2 = sy;
        for (let k = 0; k < 5; k++) {
          cx2 += (rand() - 0.5) * 16;
          cy2 += 8 + rand() * 12;
          ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
      }
    }

    // Shelter: neighbors under the eaves after a strong stand
    if (this.shelterT > 0.02) {
      const a = clamp(this.shelterT, 0, 1);
      this._figures(ctx, left - 34, base - 4, 3, `rgba(36,46,60,${a})`);
      this._figures(ctx, right + 34, base - 4, 2, `rgba(36,46,60,${a})`);
    }
  }

  _interior(ctx, x, y, w, floorH, floors, st) {
    const cx = x + w / 2;

    // Ground floor: a family table and figures
    const fy = y + floorH;
    ctx.fillStyle = 'rgba(210,180,128,0.5)';
    ctx.fillRect(cx - 34, fy - 22, 68, 5);
    ctx.fillRect(cx - 30, fy - 22, 4, 18);
    ctx.fillRect(cx + 26, fy - 22, 4, 18);
    this._figures(ctx, cx - 24, fy - 4, 2, 'rgba(240,220,180,0.5)');
    this._figures(ctx, cx + 18, fy - 4, 2, 'rgba(240,220,180,0.5)');

    if (floors >= 2) {
      const my = y + floorH * 2;
      // Work floor: a desk
      ctx.fillStyle = 'rgba(190,165,120,0.45)';
      ctx.fillRect(cx - 26, my - 20, 52, 4);
      ctx.fillRect(cx - 22, my - 20, 3, 16);
      ctx.fillRect(cx + 19, my - 20, 3, 16);
      this._figures(ctx, cx - 6, my - 4, 1, 'rgba(240,220,180,0.42)');
    }

    if (floors >= 3) {
      const ty = y + floorH * 3;
      // Ministry floor: a small pulpit
      ctx.fillStyle = 'rgba(200,175,128,0.45)';
      ctx.fillRect(cx - 12, ty - 18, 24, 14);
      ctx.fillStyle = 'rgba(232,192,120,0.5)';
      ctx.fillRect(cx - 1.5, ty - 34, 3, 14);
      ctx.fillRect(cx - 6, ty - 30, 12, 3);
    }

    // Warm interior light
    const lg = ctx.createRadialGradient(cx, y + (fy - y) * 0.5, 10, cx, y + (fy - y) * 0.5, w * 0.8);
    lg.addColorStop(0, 'rgba(255,196,110,0.14)');
    lg.addColorStop(1, 'rgba(255,196,110,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x, y, w, fy - y);
  }

  _figures(ctx, x, baseY, n, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const fx = x + i * 11;
      ctx.beginPath();
      ctx.arc(fx, baseY - 15, 3.4, 0, Math.PI * 2);
      ctx.fill();
      rr(ctx, fx - 3.4, baseY - 12, 6.8, 12, 3);
      ctx.fill();
    }
  }

  _labels(ctx) {
    ctx.save();
    ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    // Depth ruler on the left
    const rx = 54;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, GROUND_Y + 14);
    ctx.lineTo(rx, PILING_BOTTOM_MAX);
    ctx.stroke();

    for (let d = 0; d <= 100; d += 20) {
      const y = PILING_TOP + (d / 100) * (PILING_BOTTOM_MAX - PILING_TOP);
      ctx.beginPath();
      ctx.moveTo(rx - 5, y);
      ctx.lineTo(rx + 5, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.textAlign = 'right';
      ctx.fillText(String(d), rx - 10, y);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(196,214,236,0.55)';
    ctx.fillText('BEDROCK', 74, BEDROCK_TOP + 30);

    // Sand callout, only when there is fill to talk about
    if (this.disp.sand > 4) {
      const sy = GROUND_Y + 30;
      ctx.fillStyle = 'rgba(226,200,150,0.75)';
      ctx.fillText('SAND / FILL', W - 96, sy);
    }

    // Surface line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('GROUND LEVEL', W - 16, GROUND_Y - 12);
    ctx.restore();
  }

  _water(ctx) {
    const w = this.storm.water;
    if (w < 0.01) return;
    const surfaceY = lerp(GROUND_Y + 300, GROUND_Y - 74, w);
    const g = ctx.createLinearGradient(0, surfaceY, 0, GROUND_Y + 320);
    g.addColorStop(0, 'rgba(96,150,190,0.42)');
    g.addColorStop(0.35, 'rgba(58,110,150,0.5)');
    g.addColorStop(1, 'rgba(28,62,92,0.62)');
    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, surfaceY);
    // Wavy surface
    for (let x = 0; x <= W; x += 20) {
      const y = surfaceY + Math.sin(x * 0.018 + this.t * 2.6) * 5 + Math.sin(x * 0.007 - this.t * 1.4) * 3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Foam line
    ctx.strokeStyle = 'rgba(220,240,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 20) {
      const y = surfaceY + Math.sin(x * 0.018 + this.t * 2.6) * 5 + Math.sin(x * 0.007 - this.t * 1.4) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _weather(ctx) {
    const s = this.storm;

    // Wind gust streaks
    for (const g of this.gusts) {
      ctx.strokeStyle = `rgba(226,238,250,${g.a})`;
      ctx.lineWidth = g.w;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.quadraticCurveTo(g.x + g.len * 0.5, g.y - 10, g.x + g.len, g.y + 4);
      ctx.stroke();
    }

    // Rain
    ctx.strokeStyle = 'rgba(200,224,246,0.5)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const r of this.rain) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 4, r.y + r.len);
    }
    ctx.stroke();
  }

  _debris(ctx) {
    for (const p of this.debris) {
      const a = clamp(1 - p.age / p.life, 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
