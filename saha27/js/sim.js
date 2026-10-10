// SAHA 27 — match simulation. Pure JS: no DOM, no three.js, runs headless in Node.
// World: x along the pitch length, z across, y up. Metres and seconds.
import { FORMATIONS, DIFFICULTY, MATE_LEVEL, rng } from './data.js';

export const G = 9.81, BALL_R = 0.11;
const ROLL_A = 1.0, ROLL_B = 0.12, DRAG = 0.0075, SPIN_K = 0.045;
const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hyp = Math.hypot;
const sign = (v) => (v < 0 ? -1 : 1);
function angDiff(a, b) { let d = b - a; while (d > PI) d -= TAU; while (d < -PI) d += TAU; return d; }

export const ST = { move: 0, kick: 1, tackle: 2, slide: 3, dive: 4, header: 5, down: 6, celebrate: 7, hold: 8, throw: 9, sad: 10, getup: 11 };
export const ST_NAMES = Object.keys(ST);

// Keeper dive geometry shared with the renderer: body pivots on the feet and rolls sideways.
export const DIVE_LEN = 2.05;
export function diveRoll(h, lift) { return clamp(Math.acos(clamp((h - lift - 0.15) / DIVE_LEN, -1, 1)), 0.3, 1.38); }

export function makePitch(size) {
  if (size === '5') return { size, L: 44, W: 28, H: 22, HW: 14, goalW: 4.2, goalH: 2.1, goalD: 1.3, boxL: 8, boxW: 17, sixL: 3, sixW: 8, pen: 7.5, cR: 4.5, sc: 44 / 105 };
  return { size, L: 105, W: 68, H: 52.5, HW: 34, goalW: 7.32, goalH: 2.44, goalD: 2.2, boxL: 16.5, boxW: 40.32, sixL: 5.5, sixW: 18.32, pen: 11, cR: 9.15, sc: 1 };
}

export function groundSpeedFor(d, ve) {
  const f = (v0) => (v0 - ve) / ROLL_B - (ROLL_A / (ROLL_B * ROLL_B)) * Math.log((ROLL_A + ROLL_B * v0) / (ROLL_A + ROLL_B * ve));
  let lo = ve, hi = 48;
  for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2; if (f(m) < d) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export function rollTime(v0, ve) { return Math.log((ROLL_A + ROLL_B * v0) / (ROLL_A + ROLL_B * Math.max(0, ve))) / ROLL_B; }

// ---------------------------------------------------------------- ball physics
function goalFrame(b, px, py, pz, P, ev) {
  const rr = BALL_R + 0.06;
  for (let s = -1; s <= 1; s += 2) {
    const gx = s * P.H;
    if (Math.abs(b.x - gx) > 3 + P.goalD) continue;
    for (let q = -1; q <= 1; q += 2) {
      const zp = q * P.goalW / 2;
      const dx = b.x - gx, dz = b.z - zp, d = hyp(dx, dz);
      if (d < rr && d > 1e-6 && b.y < P.goalH + 0.05) {
        const nx = dx / d, nz = dz / d;
        b.x = gx + nx * rr; b.z = zp + nz * rr;
        const vn = b.vx * nx + b.vz * nz;
        if (vn < 0) { b.vx -= 1.62 * vn * nx; b.vz -= 1.62 * vn * nz; if (ev) ev.post = Math.max(ev.post || 0, -vn); }
      }
    }
    if (Math.abs(b.z) < P.goalW / 2 + 0.05) {
      const dx = b.x - gx, dy = b.y - P.goalH, d = hyp(dx, dy);
      if (d < rr && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        b.x = gx + nx * rr; b.y = P.goalH + ny * rr;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; if (ev) ev.post = Math.max(ev.post || 0, -vn); }
      }
    }
    const inside = (x, y, z) => s * x > P.H && s * x < P.H + P.goalD + 0.6 && Math.abs(z) < P.goalW / 2 && y < P.goalH;
    const now = inside(b.x, b.y, b.z), was = inside(px, py, pz);
    if (now && !was && s * px > P.H) {
      // came in through the side or roof netting from outside: bounce back out
      if (Math.abs(pz) >= P.goalW / 2) { b.z = pz; b.vz *= -0.25; b.vx *= 0.6; }
      else if (py >= P.goalH) { b.y = py; b.vy *= -0.2; b.vx *= 0.6; b.vz *= 0.6; }
      else { b.x = px; b.vx *= -0.3; }
      if (ev) ev.net = { x: b.x, y: b.y, z: b.z, s, outer: true };
    } else if (now || (was && s * b.x > P.H)) {
      // contained by the net
      const back = P.H + P.goalD - BALL_R;
      if (s * b.x > back) { b.x = s * back; if (s * b.vx > 0) { if (ev && Math.abs(b.vx) > 2) ev.net = { x: b.x, y: b.y, z: b.z, s, v: Math.abs(b.vx) }; b.vx *= -0.1; b.vz *= 0.45; b.vy *= 0.45; } }
      const sw = P.goalW / 2 - BALL_R;
      if (Math.abs(b.z) > sw) { b.z = sign(b.z) * sw; if (b.vz * sign(b.z) > 0) { b.vz *= -0.2; b.vx *= 0.7; if (ev && !ev.net) ev.net = { x: b.x, y: b.y, z: b.z, s, v: 1 }; } }
      if (b.y > P.goalH - BALL_R) { b.y = P.goalH - BALL_R; if (b.vy > 0) b.vy *= -0.2; }
    }
  }
}

function walls(b, P, ev) {
  const zl = P.HW - BALL_R;
  if (Math.abs(b.z) > zl) {
    const sz = sign(b.z); b.z = sz * zl;
    if (b.vz * sz > 0) { if (ev) ev.wall = Math.max(ev.wall || 0, Math.abs(b.vz)); b.vz *= -0.7; b.vx *= 0.9; }
  }
  const xl = P.H - BALL_R;
  if (Math.abs(b.x) > xl) {
    const mouth = Math.abs(b.z) < P.goalW / 2 + 0.02 && b.y < P.goalH + 0.05;
    if (!mouth && Math.abs(b.x) < P.H + 0.4) {
      const sx = sign(b.x); b.x = sx * xl;
      if (b.vx * sx > 0) { if (ev) ev.wall = Math.max(ev.wall || 0, Math.abs(b.vx)); b.vx *= -0.7; b.vz *= 0.9; }
    }
  }
}

export function integrateBall(b, dt, P, wallsOn, ev) {
  const px = b.x, py = b.y, pz = b.z;
  const air = b.y > BALL_R + 0.02 || b.vy > 0.4;
  if (air) {
    b.vy -= G * dt;
    const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
    const k = Math.max(0, 1 - DRAG * sp * dt);
    b.vx *= k; b.vy *= k; b.vz *= k;
  } else {
    b.y = BALL_R; b.vy = 0;
    const h = hyp(b.vx, b.vz);
    if (h > 0) { const nh = Math.max(0, h - (ROLL_A + ROLL_B * h) * dt); b.vx *= nh / h; b.vz *= nh / h; }
  }
  if (b.spin) {
    const h = hyp(b.vx, b.vz);
    if (h > 2) {
      const a = SPIN_K * b.spin * h * (air ? 1 : 0.3) * dt;
      const vx = b.vx; b.vx += (-b.vz / h) * a; b.vz += (vx / h) * a;
    }
    b.spin *= Math.exp(-0.9 * dt);
    if (Math.abs(b.spin) < 0.02) b.spin = 0;
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.y < BALL_R) {
    b.y = BALL_R;
    if (b.vy < -1.4) { b.vy = -b.vy * 0.52; b.vx *= 0.9; b.vz *= 0.9; if (ev) ev.bounce = Math.max(ev.bounce || 0, b.vy); }
    else b.vy = 0;
  }
  goalFrame(b, px, py, pz, P, ev);
  if (wallsOn) walls(b, P, ev);
}

// Solve a lofted kick that lands near (tx,tz) after ~T seconds (drag-compensated).
export function solveLob(x0, y0, z0, tx, tz, T) {
  const dx = tx - x0, dz = tz - z0, d = Math.max(0.5, hyp(dx, dz));
  const ux = dx / d, uz = dz / d;
  let vh = d / T, vy = (BALL_R - y0) / T + 0.5 * G * T;
  const s = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  for (let it = 0; it < 4; it++) {
    s.x = x0; s.y = y0; s.z = z0; s.vx = ux * vh; s.vy = vy; s.vz = uz * vh;
    let t = 0;
    for (let i = 0; i < 600; i++) {
      s.vy -= G / 60;
      const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy + s.vz * s.vz);
      const k = 1 - DRAG * sp / 60;
      s.vx *= k; s.vy *= k; s.vz *= k;
      s.x += s.vx / 60; s.y += s.vy / 60; s.z += s.vz / 60; t += 1 / 60;
      if (s.y <= BALL_R && s.vy < 0) break;
    }
    const dd = hyp(s.x - x0, s.z - z0);
    if (dd < 0.1) break;
    vh *= d / dd;
    vy *= clamp(Math.pow(T / Math.max(0.2, t), 0.6), 0.85, 1.2);
  }
  return { vx: ux * vh, vy, vz: uz * vh };
}

// ---------------------------------------------------------------- match
const PASS_KINDS = { pass: 1, through: 1, lob: 1, cross: 1, throw: 1, gkthrow: 1, punt: 1 };

export class Match {
  constructor(cfg) {
    this.cfg = Object.assign({ size: '11', halfSeconds: 150, difficulty: 'pro', humans: [], offside: true, replays: false, mode: 'match', autoSwitch: true, seed: (Date.now() & 0xffffff) }, cfg);
    this.P = makePitch(this.cfg.size);
    this.walls = this.cfg.size === '5';
    this.rand = rng(this.cfg.seed);
    this.t = 0; this.clock = 0; this.half = 1; this.stateT = 0;
    this.events = [];
    this.ball = { x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, owner: null, held: null, last: null, lastTeam: -1, kickT: -9, kickKind: '', intended: null, shotBy: null, shotT: -9, shotXg: 0, passFrom: null, throwIn: false, onTarget: false };
    this.teams = [0, 1].map((i) => this.makeTeam(i));
    if (this.cfg.mode === 'practice') this.teams[1].players.forEach((p) => { if (!p.isGK) { p.off = true; p.x = 0; p.z = this.P.HW + 8; } });
    this.players = [...this.teams[0].players, ...this.teams[1].players];
    this.humans = this.cfg.humans.map((h, i) => ({ id: i, team: h.team, p: null, lastSwitch: -9, queued: null, charge: null, idleT: 0 }));
    this.pred = Array.from({ length: 31 }, (_, i) => ({ x: 0, y: 0, z: 0, t: i * 0.1 }));
    this._ps = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 };
    this.possSoft = 0; this.offsideSet = null; this.offsideTeam = -1; this.lastPass = null;
    this.goals = []; this.cards = [];
    this.firstKick = this.rand() < 0.5 ? 0 : 1;
    this.rec = { frames: [], max: 330, n: 0 };
    this.recStride = 0;
    this.sp = null; this.pen = null; this.shootout = null;
    for (const h of this.humans) this.pickHumanPlayer(h);
    if (this.cfg.mode === 'shootout') this.startShootout();
    else if (this.cfg.mode === 'practice') this.setupPractice();
    else this.setupKickoff(this.firstKick);
  }

  // -------------------------------------------------------------- setup
  makeTeam(i) {
    const tc = this.cfg.teams[i];
    const human = this.cfg.humans.some((h) => h.team === i);
    const lvl = human ? MATE_LEVEL : DIFFICULTY[this.cfg.difficulty] || DIFFICULTY.pro;
    const formName = this.cfg.size === '5' ? '1-2-1' : (FORMATIONS[tc.formation] ? tc.formation : '4-3-3');
    const slots = FORMATIONS[formName];
    const T = { idx: i, side: i === 0 ? 1 : -1, def: tc.def, kit: tc.kit, name: tc.def.name, short: tc.def.short, slots, formName, lvl, human, score: 0, players: [], callPress: -9,
      style: tc.def.style || { press: 0.6, tempo: 0.6, width: 0.6 },
      stats: { shots: 0, onTarget: 0, passes: 0, passOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, possT: 0, xg: 0, yellow: 0, red: 0 } };
    tc.squad.slice(0, slots.length).forEach((sp, k) => T.players.push(this.makePlayer(T, sp, slots[k], k)));
    T.gk = T.players[0];
    return T;
  }

  makePlayer(T, sp, slot, k) {
    const a = sp.a;
    const spr = (6.35 + a.pac * 0.035) * (T.human ? 1 : T.lvl.speed);
    return { id: T.idx * 11 + k, team: T.idx, T, k, slot, role: slot.r, isGK: slot.r === 'GK', name: sp.name, num: sp.num, a, sp,
      x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0, face: 0, speed: 0, phase: this.rand() * 6,
      spr, jog: spr * 0.72, stamina: 1, sprinting: false,
      st: 'move', stT: 0, stDur: 0, lock: 0, touchCD: 0, tackleCD: 0,
      human: -1, wvx: 0, wvz: 0, wFace: null, sprint: false, aiT: this.rand() * 0.3, aiDir: null, aiSprint: false, plan: null, queued: null,
      yellow: 0, off: false, goals: 0, assists: 0, shots: 0, tackles: 0, passes: 0, passOk: 0, saves: 0,
      diveDir: 0, diveVz: 0, diveH: 1, holdT: 0, reactT: -1, icpt: null, slideHit: false, sdx: 0, sdz: 0, celebT: 0 };
  }

  rel(T, x) { return x * T.side; }
  opp(T) { return this.teams[1 - T.idx]; }
  active(T) { return T.players.filter((p) => !p.off); }
  emit(e) { this.events.push(e); }
  gauss() { let u = 0, v = 0; while (!u) u = this.rand(); while (!v) v = this.rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  pickHumanPlayer(h) {
    const T = this.teams[h.team];
    const taken = new Set(this.humans.filter((o) => o !== h && o.p).map((o) => o.p));
    const B = this.ball;
    let best = null, bd = 1e9;
    for (const p of T.players) {
      if (p.off || p.isGK || taken.has(p)) continue;
      const d = hyp(p.x - B.x, p.z - B.z) + (p.slot.r === 'FWD' ? -2 : 0);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) this.switchTo(h, best, true);
  }

  switchTo(h, p, silent) {
    if (h.p === p) return;
    if (h.p) h.p.human = -1;
    for (const o of this.humans) if (o !== h && o.p === p) o.p = null;
    h.p = p; p.human = h.id; h.lastSwitch = this.t; h.queued = null;
    p.plan = null;
    if (!silent) this.emit({ type: 'switch', h: h.id, p });
  }

  // first human of the restarting team takes it; the first human of the other team gets `defP` (keeper on penalties)
  assignRestart(teamIdx, taker, defP) {
    let gotT = false, gotD = false;
    for (const h of this.humans) {
      if (h.team === teamIdx && !gotT) { gotT = true; this.switchTo(h, taker, true); }
      else if (h.team !== teamIdx && defP && !gotD) { gotD = true; this.switchTo(h, defP, true); }
    }
    for (const h of this.humans) {
      const p = h.p;
      if (p && (p === taker || p === defP)) continue;
      if (!p || p.off || p.isGK) { if (p) p.human = -1; h.p = null; this.pickHumanPlayer(h); }
    }
  }

  kickoffLayout(T, kicking) {
    const P = this.P, s = T.side;
    for (const p of T.players) {
      if (p.off) continue;
      let rx, rz;
      if (p.isGK) { rx = -P.H + 1.2; rz = 0; }
      else {
        rx = -P.H * 0.07 - (1 - p.slot.d) * P.H * 0.6;
        rz = p.slot.w * P.HW * 0.78;
        if (!kicking) {
          const d = hyp(rx, rz);
          if (d < P.cR + 0.6) { const k = (P.cR + 0.6) / Math.max(0.1, d); rx *= k; rz *= k; if (rx > -0.5) rx = -0.5; }
        }
      }
      this.place(p, rx * s, rz * s);
    }
    if (kicking) {
      const fw = T.players.filter((p) => !p.off && !p.isGK).sort((a, b) => b.slot.d - a.slot.d);
      this.place(fw[0], -0.35 * s, 0.15 * s);
      fw[0].face = s > 0 ? 0 : PI;
      return fw[0];
    }
    return null;
  }

  place(p, x, z) {
    p.x = x; p.z = z; p.vx = p.vz = 0; p.wvx = p.wvz = 0; p.speed = 0; p.y = 0; p.vy = 0;
    p.st = 'move'; p.stT = 0; p.lock = 0; p.plan = null; p.queued = null; p.aiDir = null;
    p.face = Math.atan2(this.ball.z - z, this.ball.x - x);
  }

  resetBall(x, z) {
    const B = this.ball;
    Object.assign(B, { x, y: BALL_R, z, vx: 0, vy: 0, vz: 0, spin: 0, owner: null, held: null, intended: null, throwIn: false, shotBy: null, onTarget: false, passFrom: null });
  }

  setupKickoff(teamIdx) {
    this.state = 'prekick'; this.stateT = 0;
    this.resetBall(0, 0);
    this.offsideSet = null; this.sp = null; this.pen = null;
    this.koTeam = teamIdx;
    this.kickoffLayout(this.teams[1 - teamIdx], false);
    this.koTaker = this.kickoffLayout(this.teams[teamIdx], true);
    this.assignRestart(teamIdx, this.koTaker, null);
    this.koAIT = 1.1 + this.rand() * 0.5;
    this.emit({ type: 'kickoffReady', team: teamIdx });
  }

  setupPractice() {
    const T = this.teams[0];
    this.kickoffLayout(T, true);
    this.teams[1].gk && this.place(this.teams[1].gk, -this.teams[1].side * (this.P.H - 1.2), 0);
    const p = this.humans[0] ? this.humans[0].p : T.players[9] || T.players[1];
    this.resetBall(p.x + T.side * 0.6, p.z);
    this.setOwner(p);
    this.state = 'play'; this.stateT = 0;
  }

  // -------------------------------------------------------------- main step
  step(dt, cmds = []) {
    this.t += dt; this.stateT += dt;
    this.ev = {};
    for (const p of this.players) {
      p.stT += dt; p.lock -= dt; p.touchCD -= dt; p.tackleCD -= dt;
      if ((p.st === 'kick' || p.st === 'tackle' || p.st === 'header' || p.st === 'throw') && p.stT > (p.stDur || 0.3)) p.st = 'move';
      if (p.st === 'getup' && p.stT > 0.55) p.st = 'move';
    }
    switch (this.state) {
      case 'prekick': this.updatePrekick(dt, cmds); break;
      case 'play': this.updatePlay(dt, cmds); break;
      case 'dead': this.updateDead(dt); break;
      case 'setwait': this.updateSetWait(dt, cmds); break;
      case 'goal': this.updateGoal(dt); break;
      case 'pen': this.updatePen(dt, cmds); break;
      default: this.updateIdle(dt); break;
    }
    this.record();
  }

  record() {
    if (++this.recStride < 2) return;
    this.recStride = 0;
    const B = this.ball, n = this.players.length;
    const f = new Float32Array(4 + n * 9);
    f[0] = B.x; f[1] = B.y; f[2] = B.z; f[3] = this.t;
    for (let i = 0; i < n; i++) {
      const p = this.players[i], o = 4 + i * 9;
      f[o] = p.x; f[o + 1] = p.z; f[o + 2] = p.y; f[o + 3] = p.face; f[o + 4] = p.speed;
      f[o + 5] = p.off ? -1 : ST[p.st] ?? 0; f[o + 6] = p.stT; f[o + 7] = p.phase; f[o + 8] = p.diveDir * p.diveH;
    }
    const R = this.rec;
    if (R.frames.length < R.max) R.frames.push(f); else R.frames[R.n % R.max] = f;
    R.n++;
  }
  replayFrames(seconds) {
    const R = this.rec, cnt = Math.min(R.frames.length, Math.round(seconds * 30));
    const out = [];
    for (let i = R.n - cnt; i < R.n; i++) out.push(R.frames[((i % R.max) + R.max) % R.max]);
    return out;
  }

  clockTick(dt) { if (this.cfg.mode === 'match') this.clock += dt; }

  minute() {
    if (this.cfg.mode !== 'match') return '';
    const hs = this.cfg.halfSeconds, base = this.half === 1 ? 0 : 45;
    const m = Math.floor(Math.min(this.clock, hs) / hs * 45);
    const sec = Math.floor((Math.min(this.clock, hs) / hs * 45 * 60) % 60);
    if (this.clock > hs) return `${45 + base}+${Math.ceil((this.clock - hs) / hs * 45)}`;
    return `${String(base + m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  minuteNum() { return Math.min(45, Math.floor(this.clock / this.cfg.halfSeconds * 45)) + (this.half === 1 ? 1 : 46); }

  updatePlay(dt, cmds) {
    this.clockTick(dt);
    this.predictBall();
    this.computeIntercepts();
    const T = this.teams[this.possSoft]; if (T) T.stats.possT += dt;
    this.handleHumans(dt, cmds);
    for (const T of this.teams) this.teamAI(T, dt);
    this.movePlayers(dt);
    this.updateBall(dt);
    this.separate();
    if (this.state === 'play') this.checkHalfEnd();
  }

  updateIdle(dt) {
    for (const p of this.players) { p.wvx *= 0.9; p.wvz *= 0.9; }
    this.movePlayers(dt);
    const B = this.ball;
    if (!B.owner && !B.held) integrateBall(B, dt, this.P, this.walls, null);
  }

  // -------------------------------------------------------------- prediction
  predictBall() {
    const B = this.ball, s = this._ps, P = this.P;
    if (B.owner || B.held) {
      const o = B.owner || B.held;
      for (let i = 0; i <= 30; i++) { const q = this.pred[i]; const t = Math.min(i * 0.1, 0.6); q.x = B.x + o.vx * t; q.y = B.y; q.z = B.z + o.vz * t; }
      return;
    }
    s.x = B.x; s.y = B.y; s.z = B.z; s.vx = B.vx; s.vy = B.vy; s.vz = B.vz; s.spin = B.spin;
    for (let i = 0; i <= 30; i++) {
      const q = this.pred[i]; q.x = s.x; q.y = s.y; q.z = s.z;
      if (i < 30) for (let k = 0; k < 6; k++) integrateBall(s, 1 / 60, P, this.walls, null);
    }
  }

  intercept(p) {
    const react = p.human >= 0 ? 0.05 : p.T.lvl.react * 0.5;
    const reachH = p.isGK ? 2.5 : 2.25;
    const sp = p.spr * (0.86 + 0.14 * p.stamina) * 0.96;
    let hi = null;
    for (let i = 0; i <= 30; i++) {
      const q = this.pred[i];
      if (q.y > reachH) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = hyp(dx, dz);
      let tt = react + Math.max(0, d - 0.55) / sp;
      if (d > 0.5) { const vd = (p.vx * dx + p.vz * dz) / d; tt += clamp((p.speed - vd) / 14, 0, 0.35); }
      if (tt > q.t) continue;
      const r = { t: q.t, x: q.x, z: q.z, y: q.y, i };
      if (q.y <= 1.45 || p.isGK) {
        if (!hi) return r;
        // prefer a controllable height unless the header is clearly earlier or in a box
        if (r.t - hi.t < 0.6 && !this.inBox(p.T, hi.x, hi.z) && !this.inOppBox(p.T, hi.x, hi.z)) return r;
        return hi;
      }
      if (!hi) hi = r;
    }
    if (hi) return hi;
    const q = this.pred[30];
    const d = hyp(q.x - p.x, q.z - p.z);
    return { t: Math.max(3, react + d / sp), x: q.x, z: q.z, y: q.y, i: 30 };
  }

  computeIntercepts() {
    const B = this.ball;
    const loose = !B.owner && !B.held;
    for (const p of this.players) p.icpt = (loose && !p.off) ? this.intercept(p) : null;
  }

  // -------------------------------------------------------------- geometry helpers
  inBox(T, x, z) { const r = this.rel(T, x); return r < -this.P.H + this.P.boxL && Math.abs(z) < this.P.boxW / 2 && r > -this.P.H - 0.5; }
  inOppBox(T, x, z) { const r = this.rel(T, x); return r > this.P.H - this.P.boxL && Math.abs(z) < this.P.boxW / 2; }

  offsideLine(T) {
    const O = this.opp(T);
    const xs = O.players.filter((p) => !p.off).map((p) => p.x * T.side).sort((a, b) => b - a);
    const second = xs.length > 1 ? xs[1] : (xs[0] ?? 0);
    return Math.max(second, this.ball.x * T.side, 0);
  }

  threat(rx, rz) {
    const P = this.P;
    const d = hyp(P.H - rx, rz * 0.85);
    return 0.55 * Math.exp(-d / (9 * P.sc)) + 0.004 * (rx + P.H) / P.L;
  }

  pressureOn(p) {
    let m = 99;
    for (const o of this.opp(p.T).players) { if (o.off) continue; const d = hyp(o.x - p.x, o.z - p.z); if (d < m) m = d; }
    return clamp(1 - (m - 1.0) / 5, 0, 1);
  }

  xg(p) {
    const P = this.P, B = this.ball, T = p.T, s = T.side;
    const gx = s * P.H, dx = Math.abs(gx - B.x);
    const d = hyp(gx - B.x, B.z);
    if (d > 34 * P.sc || s * B.x > P.H) return 0;
    const a1 = Math.atan2(P.goalW / 2 - B.z, Math.max(0.3, dx)), a2 = Math.atan2(-P.goalW / 2 - B.z, Math.max(0.3, dx));
    const ang = Math.abs(a1 - a2);
    let xg = 0.75 * (1 - Math.exp(-ang * 1.1)) * Math.exp(-d / (22 * P.sc));
    let blocked = 0;
    for (const o of this.opp(T).players) {
      if (o.off) continue;
      const ox = o.x - B.x, oz = o.z - B.z;
      const tx = gx - B.x, tz = -B.z, tl = hyp(tx, tz);
      const prog = (ox * tx + oz * tz) / (tl * tl);
      if (prog < 0.02 || prog > 1) continue;
      const lat = Math.abs(ox * tz - oz * tx) / tl;
      if (o.isGK) {
        if (lat < 0.8) xg *= 0.85; else if (lat > 2.5) xg *= 1.25;
        continue;
      }
      if (lat < P.goalW / 2 * prog + 0.5) blocked++;
    }
    xg *= Math.pow(0.55, blocked);
    xg *= 1 - this.pressureOn(p) * 0.25;
    return clamp(xg, 0, 0.85);
  }

  // -------------------------------------------------------------- humans
  handleHumans(dt, cmds) {
    const B = this.ball;
    for (const h of this.humans) {
      const c = cmds[h.id];
      if (!h.p || h.p.off) this.pickHumanPlayer(h);
      if (!c) continue;
      if (c.sw) this.manualSwitch(h, c);
      this.autoSwitch(h, c);
      const p = h.p;
      if (!p) continue;
      const T = p.T;
      const has = B.owner === p, held = B.held === p;
      const oppHas = (B.owner && B.owner.team !== p.team) || (B.held && B.held.team !== p.team);
      const sp = c.sprint ? p.spr * (0.86 + 0.14 * p.stamina) : p.jog;
      p.wvx = c.mx * sp; p.wvz = c.mz * sp; p.sprint = !!c.sprint && c.mag > 0.2; p.wFace = null;
      // receiving assist: a pass meant for us and no stick input -> run onto it
      if (c.mag < 0.2 && !has && !held && !B.owner && !B.held && B.intended === p && p.icpt) {
        const dx = p.icpt.x - p.x, dz = p.icpt.z - p.z, d = hyp(dx, dz);
        if (d > 0.4) { const v = Math.min(d > 5 ? p.spr : p.jog, d * 2.5); p.wvx = dx / d * v; p.wvz = dz / d * v; p.sprint = d > 5; }
      }
      h.idleT = c.mag > 0.15 ? 0 : h.idleT + dt;
      h.charge = null;
      if (oppHas) {
        if (c.pass.held && B.owner) {
          const o = B.owner, gx = -T.side * this.P.H;
          const ux = gx - o.x, uz = -o.z, ul = hyp(ux, uz) || 1;
          const tx = o.x + (ux / ul) * 1.3, tz = o.z + (uz / ul) * 1.3;
          const dx = tx - p.x, dz = tz - p.z, d = hyp(dx, dz);
          const v = Math.min(c.sprint ? p.spr : p.jog * 1.05, d * 3);
          if (d > 0.05) { p.wvx = dx / d * v; p.wvz = dz / d * v; }
          p.wFace = Math.atan2(o.z - p.z, o.x - p.x);
          p.sprint = c.sprint;
        }
        if (c.through.held) T.callPress = this.t + 0.25;
        if (c.shoot.down) this.tryTackle(p);
        if (c.lob.down) this.trySlide(p, c.mag > 0.3 ? Math.atan2(c.mz, c.mx) : p.face);
        h.queued = null;
        continue;
      }
      for (const btn of ['shoot', 'through', 'lob', 'pass']) if (c[btn].held && c[btn].dur > 0.06) h.charge = { btn, v: this.powerOf(btn, c[btn].dur) };
      for (const btn of ['shoot', 'through', 'lob', 'pass']) {
        if (!c[btn].up) continue;
        const pw = this.powerOf(btn, c[btn].dur);
        if (has || held) this.humanKick(p, btn, pw, c.mx, c.mz, c.mag);
        else h.queued = { btn, pw, mx: c.mx, mz: c.mz, mag: c.mag, t: this.t };
        break;
      }
      if (h.queued && this.t - h.queued.t > 0.75) h.queued = null;
    }
  }

  powerOf(btn, dur) {
    if (btn === 'shoot') return clamp(dur / 0.95, 0.06, 1);
    return clamp(dur / 0.8, 0, 1);
  }

  manualSwitch(h, c) {
    const cur = h.p, B = this.ball, T = this.teams[h.team];
    if (B.owner && B.owner === cur) return;
    const taken = new Set(this.humans.filter((o) => o !== h && o.p).map((o) => o.p));
    let best = null, bs = -1e9;
    for (const p of T.players) {
      if (p.off || p === cur || p.isGK || taken.has(p)) continue;
      let s;
      if (c.mag > 0.5 && cur) {
        const dx = p.x - cur.x, dz = p.z - cur.z, d = hyp(dx, dz) || 1;
        s = ((dx * c.mx + dz * c.mz) / (d * c.mag)) * 30 - d * 0.4;
      } else {
        const tgt = p.icpt ? p.icpt.t * 7 : hyp(p.x - B.x, p.z - B.z);
        s = -tgt;
      }
      if (s > bs) { bs = s; best = p; }
    }
    if (best) this.switchTo(h, best);
  }

  autoSwitch(h, c) {
    const B = this.ball, cur = h.p;
    const isOtherHuman = (p) => this.humans.some((o) => o !== h && o.p === p);
    if (B.owner && B.owner.team === h.team && B.owner !== cur && !isOtherHuman(B.owner)) return this.switchTo(h, B.owner, true);
    if (B.held && B.held.team === h.team && B.held !== cur && !isOtherHuman(B.held)) return this.switchTo(h, B.held, true);
    if (cur && cur.isGK && B.held !== cur && B.owner !== cur) { if (h.p) h.p.human = -1; h.p = null; this.pickHumanPlayer(h); return; }
    if (!B.owner && !B.held && B.intended && B.intended.team === h.team && B.intended !== cur && !isOtherHuman(B.intended) && h.switchedFor !== B.kickT && !B.intended.isGK) {
      h.switchedFor = B.kickT;
      return this.switchTo(h, B.intended, true);
    }
    if (!this.cfg.autoSwitch || !cur) return;
    if (this.t - h.lastSwitch < 0.9) return;
    if (!B.owner && !B.held && cur.icpt) {
      if (B.intended && B.intended.team === h.team) return;
      let best = null;
      for (const p of this.teams[h.team].players) if (!p.off && !p.isGK && p.icpt && !isOtherHuman(p) && (!best || p.icpt.t < best.icpt.t)) best = p;
      if (best && best !== cur && cur.icpt.t - best.icpt.t > 0.55 && h.idleT > 0.15) this.switchTo(h, best);
    } else if (B.owner && B.owner.team !== h.team) {
      const o = B.owner, dc = hyp(cur.x - o.x, cur.z - o.z);
      if (dc < 14) return;
      let best = null, bd = 1e9;
      for (const p of this.teams[h.team].players) { if (p.off || p.isGK || isOtherHuman(p)) continue; const d = hyp(p.x - o.x, p.z - o.z); if (d < bd) { bd = d; best = p; } }
      if (best && best !== cur && dc - bd > 9) this.switchTo(h, best);
    }
  }

  humanKick(p, btn, pw, mx, mz, mag) {
    const B = this.ball;
    const dir = mag > 0.25 ? { x: mx / mag, z: mz / mag } : null;
    if (B.held === p) {
      if (btn === 'pass') return this.doPass(p, 'gkthrow', dir, pw, true);
      return this.doPass(p, 'punt', dir, pw, true);
    }
    if (B.throwIn) return this.doPass(p, 'throw', dir, pw, true);
    if (btn === 'shoot') return this.doShoot(p, pw, dir, true);
    if (btn === 'pass') return this.doPass(p, 'pass', dir, pw, true);
    if (btn === 'through') return this.doPass(p, 'through', dir, pw, true);
    if (btn === 'lob') return this.doPass(p, 'lob', dir, pw, true);
  }

  // -------------------------------------------------------------- kicking
  kick(p, vx, vy, vz, spin, kind) {
    const B = this.ball;
    if (B.held === p) { B.x = p.x + Math.cos(p.face) * 0.5; B.z = p.z + Math.sin(p.face) * 0.5; B.y = kind === 'gkthrow' ? 1.4 : kind === 'punt' ? 0.9 : B.y; }
    if (B.throwIn) { B.y = 2.0; B.throwIn = false; }
    B.owner = null; B.held = null;
    B.vx = vx; B.vy = vy; B.vz = vz; B.spin = spin || 0;
    B.last = p; B.lastTeam = p.team; B.kickT = this.t; B.kickKind = kind;
    B.onTarget = false;
    p.touchCD = 0.28; p.st = kind === 'throw' ? 'throw' : 'kick'; p.stT = 0; p.stDur = 0.32;
    if (p.isGK) p.lock = 0.2;
    this.possSoft = p.team;
    const sp = hyp(vx, vy, vz);
    this.emit({ type: 'kick', p, kind, power: sp });
    // offside snapshot
    if (this.cfg.offside && !this.walls && this.cfg.mode !== 'practice' && kind !== 'throw' && kind !== 'goalkick' && !this.noOffsideKick) {
      const T = p.T, line = this.offsideLine(T);
      const set = new Set();
      for (const m of T.players) if (!m.off && m !== p && m.x * T.side > line + 0.25 && m.x * T.side > 0) set.add(m);
      this.offsideSet = set.size ? set : null; this.offsideTeam = p.team;
    } else { this.offsideSet = null; }
    this.noOffsideKick = false;
    if (PASS_KINDS[kind]) { this.lastPass = { from: p, t: this.t, team: p.team }; B.passFrom = p; }
    else B.passFrom = null;
  }

  chooseReceiver(p, kind, dir, isHuman) {
    const T = p.T;
    let fx = dir ? dir.x : Math.cos(p.face), fz = dir ? dir.z : Math.sin(p.face);
    let best = null, bs = -1e9;
    const pref = kind === 'lob' || kind === 'punt' ? 30 * this.P.sc : kind === 'throw' || kind === 'gkthrow' ? 14 * this.P.sc : 15 * this.P.sc;
    for (const m of T.players) {
      if (m === p || m.off) continue;
      const vx = m.x - p.x, vz = m.z - p.z, d = hyp(vx, vz);
      if (d < 2.5) continue;
      const cos = (vx * fx + vz * fz) / d;
      if (isHuman && cos < (dir ? 0.5 : 0.25)) continue;
      let s = cos * (isHuman ? 4 : 1) - Math.abs(d - pref) * 0.05;
      let od = 99;
      for (const o of this.opp(T).players) { if (o.off) continue; od = Math.min(od, hyp(o.x - m.x, o.z - m.z)); }
      s += Math.min(6, od) * 0.12;
      if (kind !== 'lob' && kind !== 'punt') {
        for (const o of this.opp(T).players) {
          if (o.off) continue;
          const ox = o.x - p.x, oz = o.z - p.z, pr = clamp((ox * vx + oz * vz) / (d * d), 0, 1);
          const dl = hyp(ox - vx * pr, oz - vz * pr);
          if (dl < 1.6 && pr > 0.05) s -= (1.6 - dl) * 0.9;
        }
      }
      if (m.isGK) s -= 2.2;
      if (kind === 'through' && m.x * T.side < p.x * T.side - 2) s -= 1.5;
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  }

  passTarget(p, m, kind, power) {
    const P = this.P, T = p.T, B = this.ball, s = T.side;
    let tx = m.x, tz = m.z, v0 = 10, ve = 6, tt = 1;
    if (kind === 'through') {
      let rx = m.vx, rz = m.vz; const rl = hyp(rx, rz);
      let dx = s, dz = 0;
      if (rl > 2) { dx = dx * 0.5 + rx / rl * 0.5; dz = rz / rl * 0.5; }
      const dl = hyp(dx, dz) || 1; dx /= dl; dz /= dl;
      const lead = (5 + power * 11) * P.sc;
      tx = m.x + dx * lead; tz = m.z + dz * lead;
    }
    for (let it = 0; it < 3; it++) {
      const d = hyp(tx - B.x, tz - B.z);
      if (kind === 'lob' || kind === 'punt' || kind === 'throw') { tt = (kind === 'throw' ? 0.55 : 0.85) + d / 26; }
      else {
        ve = kind === 'through' ? 3.5 + power * 2 : clamp(6 + d * 0.22 + power * 4, 6, 16);
        v0 = groundSpeedFor(d, ve); tt = rollTime(v0, ve);
      }
      if (kind !== 'through') { tx = m.x + m.vx * tt * 0.75; tz = m.z + m.vz * tt * 0.75; }
    }
    tx = clamp(tx, -P.H + 0.8, P.H - 0.8); tz = clamp(tz, -P.HW + 0.8, P.HW - 0.8);
    return { x: tx, z: tz, v0, ve, tt };
  }

  doPass(p, kind, dir, power, isHuman, forced) {
    const B = this.ball, T = p.T, P = this.P;
    const errM = isHuman ? 0.85 : T.lvl.err;
    let m = forced || this.chooseReceiver(p, kind === 'gkthrow' ? 'throw' : kind, dir, isHuman);
    let tgt;
    const recvKind = kind === 'gkthrow' ? 'pass' : kind;
    if (m) tgt = this.passTarget(p, m, recvKind, power);
    else {
      const fx = dir ? dir.x : Math.cos(p.face), fz = dir ? dir.z : Math.sin(p.face);
      const dist = (kind === 'lob' || kind === 'punt' ? 22 + power * 25 : kind === 'throw' ? 10 + power * 8 : 8 + power * 20) * P.sc;
      tgt = { x: B.x + fx * dist, z: B.z + fz * dist };
    }
    let dx = tgt.x - B.x, dz = tgt.z - B.z, d = Math.max(0.5, hyp(dx, dz));
    const pres = this.pressureOn(p);
    const skill = p.a.pas / 99;
    const sig = (0.012 + (1 - skill) * 0.07) * errM * (1 + pres * 0.8) * (kind === 'lob' || kind === 'punt' ? 1.3 : 1) * (p.st === 'slide' ? 2 : 1);
    const ang = Math.atan2(dz, dx) + this.gauss() * sig;
    const perr = 1 + this.gauss() * (0.03 + (1 - skill) * 0.07) * errM;
    if (kind === 'lob' || kind === 'punt' || kind === 'throw') {
      const crossing = kind === 'lob' && Math.abs(B.z) > P.HW * 0.4 && this.inFinalThird(T, B.x);
      let T0 = kind === 'throw' ? 0.55 + d / 24 : crossing ? 0.72 + d / 30 : 0.95 + d / 24;
      if (kind === 'punt') T0 = 1.3 + d / 30;
      if (kind === 'throw') d = Math.min(d, 24 * P.sc + 4);
      const y0 = kind === 'throw' ? 2.0 : B.held === p ? 0.9 : B.y;
      const v = solveLob(B.x, y0, B.z, B.x + Math.cos(ang) * d * perr, B.z + Math.sin(ang) * d * perr, T0);
      let spin = 0;
      if (kind === 'lob' && this.inFinalThird(T, B.x) && Math.abs(B.z) > P.HW * 0.45) spin = -sign(B.z) * sign(Math.cos(ang) * T.side) * 1.2 * T.side * 0;
      this.kick(p, v.vx, v.vy, v.vz, spin, kind === 'lob' && Math.abs(B.z) > P.HW * 0.4 && this.inFinalThird(T, B.x) ? 'cross' : kind);
    } else {
      let v0 = (tgt.v0 || groundSpeedFor(d, 8)) * perr;
      if (kind === 'gkthrow') v0 = Math.min(v0, 20);
      v0 = clamp(v0, 5, 30);
      this.kick(p, Math.cos(ang) * v0, kind === 'gkthrow' ? 1.5 : 0.15, Math.sin(ang) * v0, 0, kind === 'gkthrow' ? 'gkthrow' : kind);
    }
    B.intended = m || null;
    if (m) {
      if (kind === 'through' || kind === 'lob' || kind === 'punt') m.plan = { type: 'run', x: tgt.x, z: tgt.z, until: this.t + (tgt.tt || 1.5) + 0.8 };
      T.stats.passes++; p.passes++;
    }
    this.passPending = m ? { team: T.idx, from: p } : null;
  }

  inFinalThird(T, x) { return x * T.side > this.P.H * 0.33; }

  doShoot(p, power, dir, isHuman) {
    const B = this.ball, T = p.T, P = this.P, s = T.side;
    const gx = s * P.H;
    const O = this.opp(T), gk = O.gk && !O.gk.off ? O.gk : null;
    let az;
    const hw = P.goalW / 2;
    if (isHuman && dir && Math.abs(dir.z) > 0.35) az = sign(dir.z) * (hw - 0.4 * P.sc - 0.05);
    else {
      const gz = gk ? gk.z : 0;
      const gapL = gz + hw, gapR = hw - gz;
      az = (gapR > gapL ? 1 : -1) * (hw - 0.38 - this.rand() * 0.4);
      if (!isHuman && Math.abs(B.z) > hw * 2) az = -sign(B.z) * Math.abs(az);
    }
    const sho = p.a.sho / 99;
    const ay = clamp(0.35 + power * 0.85 + (isHuman ? 0 : this.rand() * 0.5), 0.3, P.goalH - 0.3);
    let spd = (17.5 + power * 17) * (0.78 + 0.22 * sho);
    if (p.isGK) spd *= 0.8;
    const dx = gx - B.x, dz = az - B.z, d = hyp(dx, dz);
    const t = d / (spd * 0.9);
    let vy = (ay - B.y) / t + 0.5 * G * t;
    const pres = this.pressureOn(p);
    const errM = isHuman ? 0.9 : T.lvl.err;
    let sig = (0.026 + (1 - sho) * 0.11 + pres * 0.035 + Math.max(0, power - 0.82) * 0.14) * errM;
    if (p.st === 'slide') sig *= 1.8;
    const ang = Math.atan2(dz, dx) + this.gauss() * sig;
    vy += this.gauss() * (0.6 + power * 1.2) * (1.2 - sho) * errM;
    if (power > 0.86) vy += (power - 0.86) * 16 * (1.2 - sho);
    vy = clamp(vy, -2, 14);
    const hs = Math.sqrt(Math.max(1, spd * spd - vy * vy * 0.3));
    let spin = 0;
    if (Math.abs(B.z) > 4 && d < 25) spin = (this.rand() - 0.5) * 0.6;
    const xg = this.xg(p);
    this.kick(p, Math.cos(ang) * hs, vy, Math.sin(ang) * hs, spin, 'shot');
    B.shotBy = p; B.shotT = this.t; B.shotXg = xg;
    T.stats.shots++; T.stats.xg += xg; p.shots++;
    B.intended = null;
    this.emit({ type: 'shot', p, xg, power });
  }

  doHeader(p) {
    const B = this.ball, T = p.T, P = this.P, s = T.side;
    const h = this.humans[p.human];
    const q = h && h.queued && this.t - h.queued.t < 0.8 ? h.queued : null;
    if (h) h.queued = null;
    const attackBox = this.inOppBox(T, p.x, p.z) || (p.x * s > P.H - P.boxL - 4 * P.sc && Math.abs(p.z) < P.boxW / 2 + 3);
    const ownBox = this.inBox(T, p.x, p.z) || p.x * s < -P.H + P.boxL + 6 * P.sc;
    p.st = 'header'; p.stT = 0; p.stDur = 0.45;
    if (p.y <= 0.01 && B.y > 1.75) p.vy = 3.2;
    let mode = 'clear';
    if (q) mode = q.btn === 'shoot' ? 'shot' : 'pass';
    else if (p.human < 0 || !h) mode = attackBox ? 'shot' : ownBox ? 'clear' : 'pass';
    else mode = attackBox ? 'shot' : ownBox ? 'clear' : 'pass';
    if (mode === 'shot') {
      const gk = this.opp(T).gk;
      const hw = P.goalW / 2;
      const az = (gk && gk.z > 0 ? -1 : 1) * (hw - 0.5 - this.rand() * 0.9);
      const ay = 0.2 + this.rand() * 1.4;
      const dx = s * P.H - B.x, dz = az - B.z, d = hyp(dx, dz);
      const spd = 10 + p.a.phy * 0.05 + p.a.sho * 0.03;
      const t = d / (spd * 0.95);
      let vy = (ay - B.y) / t + 0.5 * G * t;
      const sig = (0.05 + (1 - p.a.sho / 99) * 0.12) * (p.human >= 0 ? 0.9 : T.lvl.err);
      const ang = Math.atan2(dz, dx) + this.gauss() * sig;
      vy += this.gauss() * 0.9;
      this.kick(p, Math.cos(ang) * spd, vy, Math.sin(ang) * spd, 0, 'header');
      B.shotBy = p; B.shotT = this.t; B.shotXg = this.xg(p) * 0.6;
      T.stats.shots++; T.stats.xg += B.shotXg; p.shots++;
      this.emit({ type: 'shot', p, xg: B.shotXg, header: true });
    } else if (mode === 'pass') {
      const m = this.chooseReceiver(p, 'pass', q && q.mag > 0.25 ? { x: q.mx / q.mag, z: q.mz / q.mag } : { x: s, z: 0 }, false);
      const tx = m ? m.x : B.x + s * 10, tz = m ? m.z : B.z;
      const dx = tx - B.x, dz = tz - B.z, d = Math.max(1, hyp(dx, dz));
      const spd = clamp(d * 0.9, 7, 13);
      this.kick(p, dx / d * spd, 1.6, dz / d * spd, 0, 'header');
      B.intended = m;
    } else {
      const ang = (s > 0 ? 0 : PI) + (this.rand() - 0.5) * 1.6;
      const spd = 13 + this.rand() * 4;
      this.kick(p, Math.cos(ang) * spd, 5 + this.rand() * 3, Math.sin(ang) * spd, 0, 'header');
    }
    this.emit({ type: 'header', p });
  }

  // -------------------------------------------------------------- possession
  setOwner(p) {
    const B = this.ball;
    if (this.passPending) {
      const pp = this.passPending;
      if (pp.team === p.team && pp.from !== p) { this.teams[pp.team].stats.passOk++; pp.from.passOk++; }
      this.passPending = null;
    }
    B.owner = p; B.held = null; B.last = p; B.lastTeam = p.team; B.intended = null; B.spin = 0;
    B.shotBy = null;
    this.possSoft = p.team; p.aiT = Math.min(p.aiT, 0.12 + this.rand() * 0.1); p.plan = null;
    p.ownT = this.t;
    this.emit({ type: 'control', p });
  }

  gkHold(g) {
    const B = this.ball;
    if (this.passPending) { this.passPending = null; }
    B.owner = null; B.held = g; B.last = g; B.lastTeam = g.team; B.intended = null; B.spin = 0;
    B.vx = B.vy = B.vz = 0;
    g.holdT = 0; g.holdWait = 0;
    if (g.st !== 'dive') { g.st = 'hold'; g.stT = 0; }
    this.possSoft = g.team;
    this.offsideSet = null;
  }

  touchCheckOffside(p) {
    if (!this.offsideSet) return false;
    if (p.team !== this.offsideTeam) { this.offsideSet = null; return false; }
    if (this.offsideSet.has(p)) {
      this.offsideSet = null;
      this.teams[p.team].stats.offsides++;
      this.emit({ type: 'offside', p });
      this.deadBall({ type: 'fk', team: 1 - p.team, x: p.x, z: p.z, reason: 'offside' });
      return true;
    }
    if (p !== this.ball.last) this.offsideSet = null;
    return false;
  }

  // -------------------------------------------------------------- ball update
  updateBall(dt) {
    const B = this.ball, P = this.P;
    if (B.held) {
      const g = B.held;
      B.x = g.x + Math.cos(g.face) * 0.3; B.z = g.z + Math.sin(g.face) * 0.3; B.y = 1.05 + g.y;
      B.vx = g.vx; B.vz = g.vz; B.vy = 0;
      return;
    }
    if (B.owner) {
      this.dribble(B.owner, dt);
      this.checkGoalOrOut();
      return;
    }
    const ev = this.ev;
    integrateBall(B, dt, P, this.walls, ev);
    if (ev.post) this.emit({ type: 'post', v: ev.post });
    if (ev.net) this.emit({ type: 'net', ...ev.net });
    if (ev.bounce && ev.bounce > 2) this.emit({ type: 'bounce', v: ev.bounce });
    if (ev.wall) this.emit({ type: 'wall', v: ev.wall });
    if (this.state === 'play') this.ballContacts();
    if (this.state === 'play') this.checkGoalOrOut();
  }

  dribble(p, dt) {
    const B = this.ball;
    const sp = hyp(p.vx, p.vz);
    p.dribPh = (p.dribPh || 0) + sp * dt * 1.5;
    const knock = p.sprinting ? 0.22 * (0.5 + 0.5 * Math.sin(p.dribPh)) : 0.04 * Math.sin(p.dribPh);
    const d = 0.5 + sp * 0.04 + knock;
    const tx = p.x + Math.cos(p.face) * d, tz = p.z + Math.sin(p.face) * d;
    const k = Math.min(1, dt * 15);
    const nx = B.x + (tx - B.x) * k, nz = B.z + (tz - B.z) * k;
    B.vx = (nx - B.x) / dt; B.vz = (nz - B.z) / dt; B.vy = 0;
    B.x = nx; B.z = nz; B.y = BALL_R;
  }

  ballContacts() {
    const B = this.ball;
    // goalkeepers first (hands)
    for (const T of this.teams) { const g = T.gk; if (g && !g.off && this.gkContact(g)) return; }
    let best = null, bd = 1e9;
    for (const p of this.players) {
      if (p.off || p.touchCD > 0 || p.st === 'down' || p.st === 'getup') continue;
      if (p.isGK && this.inBox(p.T, p.x, p.z)) continue; // handled by gkContact
      const dh = hyp(B.x - p.x, B.z - p.z);
      if (dh > 1.1) continue;
      if (B.y > 2.0 + p.y + 0.5) continue;
      if (dh < bd) { bd = dh; best = p; }
    }
    if (!best) return;
    const p = best;
    const top = 1.82 + p.y;
    const relSpeed = hyp(B.vx - p.vx, B.vz - p.vz) + Math.abs(B.vy) * 0.4;
    if (B.y < 0.75) {
      const reach = 0.55 + (p.st === 'slide' ? 0.35 : 0) + p.a.dri * 0.0018;
      if (bd > reach) return;
      if (p.st === 'slide') return this.slideWin(p);
      this.receive(p, relSpeed, 'foot');
    } else if (B.y < 1.55) {
      if (bd > 0.5) return;
      this.receive(p, relSpeed, 'chest');
    } else {
      if (bd > 0.6 || B.y > top + 0.42) return;
      if (this.touchCheckOffside(p)) return;
      this.doHeader(p);
    }
  }

  receive(p, relSpeed, part) {
    const B = this.ball;
    if (this.touchCheckOffside(p)) return;
    const h = p.human >= 0 ? this.humans[p.human] : null;
    let q = h && h.queued && this.t - h.queued.t < 0.75 ? h.queued : null;
    if (!q && p.queued && this.t - p.queued.t < 1.5) q = p.queued;
    if (q && part === 'foot' && p.st !== 'slide') {
      if (h) h.queued = null; p.queued = null;
      if (h) this.humanKick(p, q.btn, q.pw * 0.9, q.mx, q.mz, q.mag);
      else if (q.btn === 'shoot') this.doShoot(p, 0.75, null, false);
      else this.aiCarrier(p, 0, true);
      return;
    }
    if (q && part === 'chest' && q.btn === 'shoot') {
      if (h) h.queued = null; p.queued = null;
      this.doShoot(p, 0.7, h ? (q.mag > 0.25 ? { x: q.mx / q.mag, z: q.mz / q.mag } : null) : null, !!h);
      return;
    }
    const ctrlMax = (16 + p.a.dri * 0.09) * (part === 'chest' ? 0.9 : 1);
    if (relSpeed > ctrlMax) {
      // block / deflection
      const keep = 0.15 + this.rand() * 0.35;
      const sp0 = hyp(B.vx, B.vz);
      const ang = Math.atan2(B.vz, B.vx) + (this.rand() - 0.5) * 2.2;
      B.vx = Math.cos(ang) * sp0 * keep; B.vz = Math.sin(ang) * sp0 * keep;
      B.vy = Math.abs(B.vy) * 0.3 + 0.6 + this.rand() * 2.5;
      B.last = p; B.lastTeam = p.team; p.touchCD = 0.35;
      if (B.shotBy && B.shotBy.team !== p.team) this.emit({ type: 'block', p });
      B.intended = null; this.passPending = null;
      this.emit({ type: 'touch', p, hard: true });
      return;
    }
    const pb = clamp((relSpeed - 9) / 22, 0, 0.45) * (1.25 - p.a.dri / 99);
    if (this.rand() < pb) {
      const ang = p.face + (this.rand() - 0.5) * 1.6;
      const v = 2.5 + relSpeed * 0.22;
      B.vx = Math.cos(ang) * v; B.vz = Math.sin(ang) * v; B.vy = part === 'chest' ? 0.5 : 0;
      B.last = p; B.lastTeam = p.team; p.touchCD = 0.22; B.intended = null; this.passPending = null;
      this.emit({ type: 'touch', p, hard: false });
      return;
    }
    this.setOwner(p);
  }

  gkContact(g) {
    const B = this.ball, P = this.P, T = g.T;
    if (g.touchCD > 0 || g.st === 'down') return false;
    if (!this.inBox(T, g.x, g.z) && !this.inBox(T, B.x, B.z)) return false;
    let hit = false;
    let px, py, pz, qx, qy, qz, r;
    if (g.st === 'dive') {
      const e = clamp(g.stT / 0.5, 0, 1);
      const roll = diveRoll(g.diveH, g.y) * e;
      px = g.x; py = 0.25 + g.y; pz = g.z;
      qx = g.x; qy = g.y + DIVE_LEN * Math.cos(roll); qz = g.z + g.diveDir * DIVE_LEN * Math.sin(roll);
      r = 0.26;
    } else {
      px = g.x; py = 0.1 + g.y; pz = g.z; qx = g.x; qy = 2.15 + g.y; qz = g.z; r = 0.44;
    }
    const sx = qx - px, sy = qy - py, sz = qz - pz, sl = sx * sx + sy * sy + sz * sz;
    const tt = clamp(((B.x - px) * sx + (B.y - py) * sy + (B.z - pz) * sz) / sl, 0, 1);
    const cx = px + sx * tt, cy = py + sy * tt, cz = pz + sz * tt;
    hit = hyp(B.x - cx, B.y - cy, B.z - cz) < r + BALL_R;
    if (!hit) return false;
    // backpass rule: deliberate pass from a teammate -> feet only
    if (B.last && B.last.team === g.team && B.last !== g && PASS_KINDS[B.kickKind] && this.t - B.kickT < 4) {
      if (B.y < 0.8) { this.receive(g, hyp(B.vx - g.vx, B.vz - g.vz), 'foot'); return true; }
      return false;
    }
    if (B.last === g && this.t - B.kickT < 0.6) return false;
    const sp = hyp(B.vx, B.vy, B.vz);
    const isShot = B.shotBy && B.shotBy.team !== g.team && this.t - B.shotT < 3;
    let catchP = clamp(0.98 - (sp - 9) * 0.045 + (g.a.gk - 75) * 0.01, 0.12, 0.98) * (g.st === 'dive' ? 0.72 : 1);
    if (B.y > 2.3) catchP *= 0.6;
    if (isShot) { T.stats.saves++; g.saves++; this.opp(T).stats.onTarget++; }
    if (this.rand() < catchP) {
      this.gkHold(g);
      this.emit({ type: 'save', p: g, kind: 'catch', shot: isShot });
    } else {
      const out = T.side;
      const ps = 2 + sp * 0.22;
      if (this.rand() < 0.42 && sp > 13) {
        // tipped around the post or over the bar
        const zs = Math.abs(B.z) > 0.3 ? sign(B.z) : (g.diveDir || 1);
        B.vx = -out * (3 + this.rand() * 4);
        B.vz = zs * (4 + this.rand() * 5);
        B.vy = B.y > 1.4 ? 4 + this.rand() * 3 : 1 + this.rand() * 2;
      } else {
        B.vx = out * ps * (0.6 + this.rand() * 0.5);
        B.vz = B.vz * 0.35 + (this.rand() - 0.5) * 7 + g.diveDir * 2.5;
        B.vy = 1.2 + this.rand() * 3.5;
      }
      B.last = g; B.lastTeam = g.team; B.intended = null; B.shotBy = null;
      g.touchCD = 0.7;
      this.offsideSet = null; this.passPending = null;
      this.emit({ type: 'save', p: g, kind: 'parry', shot: isShot });
    }
    return true;
  }

  slideWin(p) {
    const B = this.ball;
    const ang = p.face + (this.rand() - 0.5) * 0.6;
    const v = 6 + this.rand() * 4;
    if (B.owner) { B.owner.lock = 0.5; B.owner.touchCD = 0.5; }
    B.owner = null; B.held = null;
    B.vx = Math.cos(ang) * v; B.vz = Math.sin(ang) * v; B.vy = 0.5;
    B.last = p; B.lastTeam = p.team; B.intended = null; this.passPending = null;
    p.slideHit = true; p.touchCD = 0.3;
    p.T.stats.tackles++; p.tackles++;
    this.offsideSet = null;
    this.emit({ type: 'tackle', p, slide: true });
  }

  checkGoalOrOut() {
    const B = this.ball, P = this.P;
    if (this.state !== 'play') return;
    for (let s = -1; s <= 1; s += 2) {
      if (s * B.x > P.H + BALL_R && Math.abs(B.z) < P.goalW / 2 && B.y < P.goalH) {
        const scorer = this.teams.find((T) => T.side === s);
        if (this.cfg.mode === 'practice') { this.practiceGoal(scorer); return; }
        this.goalScored(scorer.idx);
        return;
      }
    }
    if (this.walls) return;
    const lastTeam = B.owner ? B.owner.team : B.lastTeam;
    const throwGrace = B.kickKind === 'throw' && this.t - B.kickT < 0.9 && B.vz * B.z < 0;
    if (Math.abs(B.z) > P.HW + BALL_R && !throwGrace) {
      if (this.cfg.mode === 'practice') return this.practiceReset();
      const x = clamp(B.x, -P.H + 1, P.H - 1), z = sign(B.z) * P.HW;
      this.deadBall({ type: 'throw', team: lastTeam < 0 ? 0 : 1 - lastTeam, x, z });
      return;
    }
    if (Math.abs(B.x) > P.H + BALL_R) {
      if (this.cfg.mode === 'practice') return this.practiceReset();
      const s = sign(B.x);
      const defT = this.teams.find((T) => T.side === -s);
      const shotMiss = B.shotBy && this.t - B.shotT < 3;
      if (shotMiss) this.emit({ type: 'miss', p: B.shotBy, close: Math.abs(B.z) < P.goalW / 2 + 2.5 && B.y < P.goalH + 1.5 });
      if (lastTeam === defT.idx) {
        this.deadBall({ type: 'corner', team: 1 - defT.idx, x: s * P.H, z: sign(B.z) * P.HW });
      } else {
        this.deadBall({ type: 'goalkick', team: defT.idx, x: s * (P.H - P.sixL), z: sign(B.z || 1) * (P.sixW / 2 - 1) });
      }
    }
  }

  // -------------------------------------------------------------- tackles & fouls
  tryTackle(p) {
    if (p.tackleCD > 0 || p.lock > 0 || p.st === 'slide' || p.st === 'down') return;
    p.tackleCD = 0.75; p.st = 'tackle'; p.stT = 0; p.stDur = 0.35;
    const B = this.ball, o = B.owner;
    if (!o || o.team === p.team) {
      if (!B.held && hyp(B.x - p.x, B.z - p.z) < 1.6 && B.y < 0.8) {
        const ang = p.face; B.vx = Math.cos(ang) * 6; B.vz = Math.sin(ang) * 6; B.vy = 0.3;
        B.last = p; B.lastTeam = p.team; this.passPending = null; B.intended = null;
      }
      return;
    }
    const d = hyp(o.x - p.x, o.z - p.z);
    this.emit({ type: 'tackleTry', p });
    if (d > 1.9) { p.lock = 0.3; return; }
    const fx = Math.cos(o.face), fz = Math.sin(o.face);
    const rel = ((p.x - o.x) * fx + (p.z - o.z) * fz) / Math.max(0.1, d);
    const bd = hyp(B.x - p.x, B.z - p.z);
    let ch = 0.42 + (p.a.def - o.a.dri) * 0.012 + (o.sprinting ? 0.08 : 0) + (rel > 0 ? 0.08 : -0.16) + (bd < 1.0 ? 0.1 : 0);
    ch += p.human >= 0 ? 0.06 : (p.T.lvl.tackle - 0.6) * 0.35;
    ch = clamp(ch, 0.08, 0.86);
    if (this.rand() < ch) {
      o.lock = 0.45; o.touchCD = 0.5;
      p.T.stats.tackles++; p.tackles++;
      if (this.rand() < 0.55 && bd < 1.5) { B.x = p.x + Math.cos(p.face) * 0.5; B.z = p.z + Math.sin(p.face) * 0.5; this.setOwner(p); }
      else {
        const ang = p.face + (this.rand() - 0.5) * 1.4, v = 4 + this.rand() * 4;
        B.owner = null; B.vx = Math.cos(ang) * v; B.vz = Math.sin(ang) * v; B.vy = 0.3;
        B.last = p; B.lastTeam = p.team; p.touchCD = 0.15; this.possSoft = p.team; this.passPending = null;
      }
      this.offsideSet = null;
      this.emit({ type: 'tackle', p, victim: o });
    } else {
      p.lock = 0.5;
      if (rel < -0.35 && this.rand() < 0.45) this.foul(p, o, false);
    }
  }

  trySlide(p, ang) {
    if (p.tackleCD > 0 || p.lock > 0 || p.st === 'slide' || p.st === 'down' || p.isGK) return;
    p.st = 'slide'; p.stT = 0; p.stDur = 0.72; p.slideHit = false;
    p.face = ang;
    const v = Math.max(p.speed, 6.5) + 1.2;
    p.sdx = Math.cos(ang) * v; p.sdz = Math.sin(ang) * v;
    p.lock = 1.25; p.tackleCD = 1.5;
    this.emit({ type: 'slide', p });
  }

  foul(p, victim, slide) {
    const T = p.T;
    T.stats.fouls++;
    victim.st = 'down'; victim.stT = 0; victim.stDur = 1.3; victim.lock = 1.6;
    const behind = (() => { const fx = Math.cos(victim.face), fz = Math.sin(victim.face), d = hyp(p.x - victim.x, p.z - victim.z) || 1; return ((p.x - victim.x) * fx + (p.z - victim.z) * fz) / d < -0.3; })();
    let card = null;
    const r = this.rand();
    if (slide && behind ? r < 0.55 : slide ? r < 0.22 : r < 0.1) card = 'yellow';
    if (card) {
      p.yellow++; T.stats.yellow++;
      if (p.yellow >= 2) { card = 'red'; T.stats.red++; }
      this.cards.push({ team: T.idx, name: p.name, card, minute: this.minuteNum() });
    }
    this.emit({ type: 'foul', p, victim, card });
    const inBox = this.inBox(T, victim.x, victim.z) && !this.walls;
    if (card === 'red') this.sendOff(p);
    if (this.walls) {
      // street mode: free kick from where it happened, no walls
      this.deadBall({ type: 'fk', team: victim.team, x: victim.x, z: victim.z, reason: 'foul', card });
    } else if (inBox) this.deadBall({ type: 'pen', team: victim.team, x: 0, z: 0, reason: 'foul', card });
    else this.deadBall({ type: 'fk', team: victim.team, x: victim.x, z: victim.z, reason: 'foul', card });
  }

  sendOff(p) {
    p.off = true;
    const B = this.ball;
    if (B.owner === p) B.owner = null;
    if (p.human >= 0) { const h = this.humans[p.human]; p.human = -1; h.p = null; }
    p.x = 0; p.z = this.P.HW + 7; p.vx = p.vz = 0;
  }

  // -------------------------------------------------------------- dead balls / set pieces
  deadBall(sp) {
    if (this.state !== 'play' && this.state !== 'setwait') return;
    if (this.cfg.mode === 'practice') { this.practiceReset(); return; }
    this.state = 'dead'; this.stateT = 0; this.pendingSP = sp; this.fadeSent = false;
    const B = this.ball;
    if (B.owner) { B.vx = B.owner.vx * 0.6; B.vz = B.owner.vz * 0.6; }
    B.owner = null; B.held = null;
    this.offsideSet = null; this.passPending = null;
    if (sp.type === 'corner') this.teams[sp.team].stats.corners++;
    const whistle = sp.reason === 'foul' || sp.reason === 'offside' || sp.type === 'pen';
    this.emit({ type: 'dead', sp, whistle });
    for (const h of this.humans) h.queued = null;
  }

  updateDead(dt) {
    this.clockTick(dt);
    const B = this.ball;
    integrateBall(B, dt, this.P, this.walls, null);
    for (const p of this.players) { if (p.st !== 'down') { p.wvx *= 0.92; p.wvz *= 0.92; } p.wFace = Math.atan2(B.z - p.z, B.x - p.x); }
    this.movePlayers(dt);
    this.separate();
    const sp = this.pendingSP;
    const wait = sp.reason === 'foul' ? 1.6 : 0.9;
    if (this.stateT > wait && !this.fadeSent) { this.fadeSent = true; this.emit({ type: 'fade', dur: 0.28 }); }
    if (this.stateT > wait + 0.3) {
      if (this.cfg.mode === 'match' && this.clock >= this.cfg.halfSeconds && sp.type !== 'pen') return this.endHalf();
      if (sp.type === 'practice') this.practiceRestart();
      else if (sp.type === 'pen') this.startPenalty(sp.team, true);
      else this.setupSetPiece(sp);
    }
  }

  chooseTaker(T, sp) {
    const act = T.players.filter((p) => !p.off);
    if (sp.type === 'goalkick') return T.gk;
    const field = act.filter((p) => !p.isGK);
    if (sp.type === 'corner') return field.slice().sort((a, b) => (b.a.pas + (b.slot.r === 'MID' ? 4 : 0) - Math.abs(b.slot.d - .7) * 10) - (a.a.pas + (a.slot.r === 'MID' ? 4 : 0) - Math.abs(a.slot.d - .7) * 10))[0];
    if (sp.type === 'fk') {
      const dGoal = hyp(T.side * this.P.H - sp.x, sp.z);
      if (dGoal < 30 * this.P.sc) return field.slice().sort((a, b) => (b.a.sho + b.a.pas) - (a.a.sho + a.a.pas))[0];
      if (this.rel(T, sp.x) < -this.P.H * 0.55) return T.gk && !T.gk.off && this.inBox(T, sp.x, sp.z) ? T.gk : field.sort((a, b) => hyp(a.x - sp.x, a.z - sp.z) - hyp(b.x - sp.x, b.z - sp.z))[0];
    }
    return field.sort((a, b) => hyp(a.x - sp.x, a.z - sp.z) - hyp(b.x - sp.x, b.z - sp.z))[0];
  }

  formationTarget(p, att, bxw, bzw) {
    const T = p.T, P = this.P, s = T.side, sc = P.sc, slot = p.slot;
    const bx = bxw * s, bz = bzw * s;
    let defLine, span, width, shiftZ;
    if (att) {
      defLine = clamp(bx * 0.62 - 8 * sc, -P.H + 14 * sc, 14 * sc);
      span = 36 * sc; width = 0.84 + T.style.width * 0.12; shiftZ = 0.18;
    } else {
      defLine = clamp(bx * 0.6 - 13 * sc, -P.H + 5.5 * sc, 2 * sc);
      defLine = Math.max(Math.min(defLine, bx - 7 * sc), -P.H + 5 * sc);
      span = (25 - (1 - T.style.press) * 4) * sc; width = 0.6; shiftZ = 0.38;
    }
    let rx = defLine + slot.d * span;
    let rz = slot.w * P.HW * width + bz * shiftZ;
    if (att && slot.d > 0.6) rx = Math.min(rx, this.offsideLine(T) - 0.7);
    if (!att && slot.r === 'FWD') rx = Math.max(rx, -10 * sc);
    rz = clamp(rz, -P.HW + 1.5, P.HW - 1.5);
    rx = clamp(rx, -P.H + 1.5, P.H - 2);
    return { x: rx * s, z: rz * s };
  }

  setupSetPiece(sp) {
    const P = this.P, B = this.ball;
    this.sp = sp; this.state = 'setwait'; this.stateT = 0;
    let bx = clamp(sp.x, -P.H, P.H), bz = clamp(sp.z, -P.HW, P.HW);
    if (sp.type === 'corner') { bx = sign(sp.x) * (P.H - 0.3); bz = sign(sp.z) * (P.HW - 0.3); }
    if (sp.type === 'throw') { bz = sign(sp.z) * (P.HW + 0.25); }
    if (sp.type === 'fk') { bx = clamp(bx, -P.H + 1, P.H - 1); bz = clamp(bz, -P.HW + 1, P.HW - 1); }
    this.resetBall(bx, bz);
    const att = this.teams[sp.team], def = this.opp(att), s = att.side;
    const taker = this.chooseTaker(att, { ...sp, x: bx, z: bz });
    this.spTaker = taker;
    // base layout from formation
    for (const T of this.teams) {
      for (const p of T.players) {
        if (p.off) continue;
        let tgt;
        if (p.isGK) { const ds = -T.side; tgt = { x: ds * (P.H - 1.0), z: clamp(bz * 0.1, -1, 1) }; }
        else tgt = this.formationTarget(p, T === att, bx, bz);
        this.place(p, tgt.x, tgt.z);
      }
    }
    const gxA = s * P.H; // goal attacked by att
    if (sp.type === 'corner') {
      const zs = sign(bz);
      const spots = [
        [P.H - 4.5 * P.sc, zs * 2.5 * P.sc], [P.H - 11 * P.sc, -zs * 1], [P.H - 7 * P.sc, -zs * 3.5 * P.sc], [P.H - 6.5 * P.sc, 0.5], [P.H - 18 * P.sc, -zs * 6 * P.sc], [P.H - 13 * P.sc, zs * 5 * P.sc],
      ];
      const atk = att.players.filter((p) => !p.off && !p.isGK && p !== taker).sort((a, b) => (b.a.phy + b.slot.d * 20 + (b.role === 'DEF' ? 6 : 0)) - (a.a.phy + a.slot.d * 20 + (a.role === 'DEF' ? 6 : 0)));
      atk.slice(0, Math.min(spots.length, P.size === '5' ? 2 : 6)).forEach((p, i) => this.place(p, spots[i][0] * s + (this.rand() - 0.5), spots[i][1] + (this.rand() - 0.5)));
      const marks = atk.slice(0, 6);
      const dfs = def.players.filter((p) => !p.off && !p.isGK).sort((a, b) => a.slot.d - b.slot.d);
      dfs.forEach((p, i) => {
        if (i < marks.length) { const m = marks[i]; this.place(p, m.x + (gxA - m.x) * 0.12 + s * 0.6, m.z * 0.92); }
        else if (i === dfs.length - 1) this.place(p, -s * 2, bz * 0.2);
        else this.place(p, s * (P.H - 9 * P.sc), (i - 7) * 3);
      });
    } else if (sp.type === 'goalkick') {
      for (const p of att.players) if (!p.off && !p.isGK) {
        const t = this.formationTarget(p, true, -s * P.H * 0.6, 0);
        this.place(p, t.x, t.z);
      }
      for (const p of def.players) if (!p.off && !p.isGK) {
        const t = this.formationTarget(p, false, -s * P.H * 0.4, 0);
        let x = t.x;
        if (-s * x > P.H - P.boxL - 1) x = -s * (P.H - P.boxL - 1.5);
        this.place(p, x, t.z);
      }
    } else if (sp.type === 'fk') {
      const dGoal = hyp(gxA - bx, bz);
      if (dGoal < 32 * P.sc && !this.walls) {
        const n = dGoal < 20 ? 4 : dGoal < 26 ? 3 : 2;
        const ux = (gxA - bx) / dGoal, uz = -bz / dGoal;
        const wall = def.players.filter((p) => !p.off && !p.isGK).sort((a, b) => hyp(a.x - bx, a.z - bz) - hyp(b.x - bx, b.z - bz)).slice(0, n);
        const wx = bx + ux * 9.15, wz = bz + uz * 9.15;
        wall.forEach((p, i) => { const off = (i - (n - 1) / 2) * 0.62 + 0.3 * sign(bz || 1); this.place(p, wx - uz * off, wz + ux * off); p.wall = true; });
      }
    }
    // keep opponents away from the ball
    const minD = sp.type === 'throw' ? 2.5 : 9.15 * (this.walls ? 0.45 : 1);
    for (const p of def.players) {
      if (p.off || p.isGK) continue;
      const dx = p.x - bx, dz = p.z - bz, d = hyp(dx, dz);
      if (d < minD) { const k = minD / Math.max(0.1, d); p.x = bx + dx * k; p.z = bz + dz * k; }
    }
    for (const p of this.players) { if (p.off) continue; p.x = clamp(p.x, -P.H + 0.4, P.H - 0.4); p.z = clamp(p.z, -P.HW + 0.4, P.HW - 0.4); if (p.isGK && p !== taker) p.x = clamp(p.x, -P.H + 0.4, P.H - 0.4); }
    // taker behind the ball
    let ax = gxA - bx, az = -bz * 0.3;
    if (sp.type === 'throw') { ax = s * 4; az = -sign(bz) * 6; }
    if (sp.type === 'goalkick') { ax = s; az = 0; }
    if (sp.type === 'corner') { ax = -sign(bx) * 6; az = -bz; }
    const al = hyp(ax, az) || 1;
    if (sp.type === 'throw') this.place(taker, bx, sign(bz) * (P.HW + 0.35));
    else this.place(taker, bx - ax / al * 0.55, bz - az / al * 0.55);
    taker.face = Math.atan2(az, ax);
    if (sp.type === 'throw') { B.throwIn = true; taker.st = 'throw'; taker.stT = 0; taker.stDur = 999; }
    B.owner = taker; B.last = taker; B.lastTeam = taker.team;
    if (sp.type === 'throw') { B.x = taker.x; B.z = taker.z; B.y = 2.1; }
    this.assignRestart(att.idx, taker, null);
    this.possSoft = att.idx;
    this.spAIT = 0.9 + this.rand() * 0.9;
    this.emit({ type: 'fadein' });
    this.emit({ type: 'setpiece', sp, taker });
  }

  updateSetWait(dt, cmds) {
    this.clockTick(dt);
    const B = this.ball, taker = this.spTaker, sp = this.sp;
    for (const p of this.players) { if (p.off) continue; p.wvx = 0; p.wvz = 0; p.wFace = Math.atan2(B.z - p.z, B.x - p.x); }
    // human taker aims; others idle
    const h = this.humans.find((q) => q.p === taker);
    if (taker.isGK && sp.type === 'goalkick') { B.held = null; }
    if (h) {
      const c = cmds[h.id];
      h.charge = null;
      if (c) {
        if (c.mag > 0.25) taker.wFace = Math.atan2(c.mz, c.mx);
        for (const btn of ['shoot', 'through', 'lob', 'pass']) if (c[btn].held && c[btn].dur > 0.06) h.charge = { btn, v: this.powerOf(btn, c[btn].dur) };
        for (const btn of ['shoot', 'through', 'lob', 'pass']) {
          if (!c[btn].up) continue;
          const pw = this.powerOf(btn, c[btn].dur);
          this.state = 'play'; this.stateT = 0;
          this.noOffsideKick = sp.type === 'corner' || sp.type === 'goalkick';
          if (sp.type === 'throw') this.doPass(taker, 'throw', c.mag > 0.25 ? { x: c.mx / c.mag, z: c.mz / c.mag } : null, pw, true);
          else if (sp.type === 'corner' && btn === 'lob') this.doPass(taker, 'lob', c.mag > 0.25 ? { x: c.mx / c.mag, z: c.mz / c.mag } : null, pw, true);
          else this.humanKick(taker, btn, pw, c.mx, c.mz, c.mag);
          if (this.ball.owner === taker) this.state = 'setwait';
          else this.afterSetPieceKick();
          break;
        }
      }
    } else if (this.stateT > this.spAIT) {
      this.state = 'play'; this.stateT = 0;
      this.noOffsideKick = sp.type === 'corner' || sp.type === 'goalkick';
      this.aiSetPiece(taker, sp);
      this.afterSetPieceKick();
    }
    this.movePlayers(dt);
    if (this.state === 'setwait') {
      if (sp.type === 'throw') { B.x = taker.x; B.z = taker.z; B.y = 2.1; }
      else if (B.owner === taker) {
        const tf = taker.wFace ?? taker.face;
        taker.face = tf;
        if (sp.type !== 'corner') { /* ball stays on spot */ }
      }
    }
  }

  afterSetPieceKick() {
    const shot = this.ball.kickKind === 'shot';
    for (const p of this.players) { if (p.wall && shot) p.vy = 3.1 + this.rand() * 0.4; p.wall = false; }
    this.sp = null;
  }

  aiSetPiece(p, sp) {
    const T = p.T, P = this.P, s = T.side, B = this.ball;
    const mates = T.players.filter((m) => !m.off && m !== p);
    if (sp.type === 'throw') {
      const m = mates.filter((m) => !m.isGK).sort((a, b) => this.openScore(b, p) - this.openScore(a, p))[0];
      return this.doPass(p, 'throw', null, 0.4, false, m);
    }
    if (sp.type === 'corner') {
      if (this.rand() < 0.82 || P.size === '5') {
        const box = mates.filter((m) => this.inOppBox(T, m.x, m.z));
        const m = box.length ? box[Math.floor(this.rand() * box.length)] : null;
        if (m) return this.doPass(p, 'lob', null, 0.6, false, m);
      }
      const near = mates.sort((a, b) => hyp(a.x - p.x, a.z - p.z) - hyp(b.x - p.x, b.z - p.z))[0];
      return this.doPass(p, 'pass', null, 0.3, false, near);
    }
    if (sp.type === 'goalkick') {
      if (this.rand() < 0.35 + T.style.tempo * 0.4) {
        const fw = mates.filter((m) => m.slot.d > 0.4).sort((a, b) => this.openScore(b, p) - this.openScore(a, p))[0];
        return this.doPass(p, 'punt', null, 0.8, false, fw);
      }
      const cb = mates.filter((m) => m.role === 'DEF').sort((a, b) => this.openScore(b, p) - this.openScore(a, p))[0];
      return this.doPass(p, 'pass', null, 0.4, false, cb);
    }
    if (sp.type === 'fk') {
      const xg = this.xg(p);
      const dGoal = hyp(s * P.H - B.x, B.z);
      if (dGoal < 28 * P.sc && xg > 0.03 && this.rand() < 0.75) {
        this.doShoot(p, 0.72, null, false);
        if (this.ball.vy < 4 && dGoal > 12) this.ball.vy += 1.6;
        this.ball.spin = (this.rand() - 0.5) * 2.2;
        return;
      }
      this.aiCarrier(p, 0, true);
    }
  }

  openScore(m, from) {
    let od = 99;
    for (const o of this.opp(m.T).players) { if (o.off) continue; od = Math.min(od, hyp(o.x - m.x, o.z - m.z)); }
    const d = hyp(m.x - from.x, m.z - from.z);
    return Math.min(od, 10) - Math.abs(d - 15 * this.P.sc) * 0.15 + this.rand() * 2;
  }

  updatePrekick(dt, cmds) {
    const B = this.ball, k = this.koTaker;
    for (const p of this.players) { if (p.off) continue; p.wvx = 0; p.wvz = 0; p.wFace = Math.atan2(B.z - p.z, B.x - p.x); }
    B.owner = null;
    const h = this.humans.find((q) => q.p === k);
    let go = false;
    if (h) {
      const c = cmds[h.id];
      if (c) {
        for (const btn of ['pass', 'through', 'lob', 'shoot']) {
          if (!c[btn].up) continue;
          B.owner = k;
          this.state = 'play'; this.stateT = 0; go = true;
          const dir = c.mag > 0.25 ? { x: c.mx / c.mag, z: c.mz / c.mag } : { x: -k.T.side, z: 0.3 };
          this.doPass(k, btn === 'lob' ? 'lob' : 'pass', dir, this.powerOf(btn, c[btn].dur), true);
          break;
        }
      }
    } else if (this.stateT > this.koAIT) {
      B.owner = k;
      this.state = 'play'; this.stateT = 0; go = true;
      const T = k.T;
      const m = T.players.filter((p) => !p.off && p.role === 'MID').sort((a, b) => hyp(a.x, a.z) - hyp(b.x, b.z))[0] || T.players[1];
      this.doPass(k, 'pass', null, 0.3, false, m);
    }
    if (go) this.emit({ type: 'whistle', kind: 'short' }), this.emit({ type: 'kickoff', team: k.team });
    this.movePlayers(dt);
  }

  // -------------------------------------------------------------- goals & halves
  goalScored(idx) {
    const T = this.teams[idx], B = this.ball;
    T.score++;
    let scorer = B.last, og = false;
    if (!scorer) scorer = T.players[T.players.length - 1];
    if (scorer.team !== idx) og = true;
    let assist = null;
    if (!og && this.lastPass && this.lastPass.team === idx && this.lastPass.from !== scorer && this.t - this.lastPass.t < 9) assist = this.lastPass.from;
    if (!og) { scorer.goals++; if (assist) assist.assists++; }
    if (B.shotBy && !og) T.stats.onTarget++;
    const g = { team: idx, scorer: scorer.name, scorerP: scorer, assist: assist ? assist.name : null, minute: this.minuteNum(), og };
    this.goals.push(g);
    this.state = 'goal'; this.stateT = 0; this.fadeSent = false;
    this.offsideSet = null; this.passPending = null;
    this.celebrator = og ? null : scorer;
    for (const p of this.players) { p.queued = null; p.plan = null; }
    for (const h of this.humans) h.queued = null;
    const corner = { x: T.side * (this.P.H - 2), z: sign(scorer.z || 1) * (this.P.HW - 2) };
    this.celebSpot = corner;
    this.emit({ type: 'goal', ...g, T });
  }

  updateGoal(dt) {
    const B = this.ball;
    if (!B.owner && !B.held) integrateBall(B, dt, this.P, this.walls, null);
    const c = this.celebrator, sc = this.teams[this.goals[this.goals.length - 1].team];
    for (const p of this.players) {
      if (p.off) continue;
      if (p.st === 'down') continue;
      if (p.team === sc.idx) {
        let tx, tz;
        if (p === c) { tx = this.celebSpot.x; tz = this.celebSpot.z; if (this.stateT > 0.3) { p.st = 'celebrate'; } }
        else if (c && !p.isGK) { tx = c.x - Math.cos(p.k) * 2; tz = c.z - Math.sin(p.k) * 2; }
        else { tx = p.x; tz = p.z; }
        const dx = tx - p.x, dz = tz - p.z, d = hyp(dx, dz);
        const v = Math.min(p.spr * 0.85, d * 2);
        p.wvx = d > 0.3 ? dx / d * v : 0; p.wvz = d > 0.3 ? dz / d * v : 0;
        if (p !== c && d < 3 && this.stateT > 1.2 && !p.isGK) p.st = 'celebrate';
      } else {
        p.wvx *= 0.95; p.wvz *= 0.95;
        if (this.stateT > 0.6 && p.st === 'move' && p.speed < 1) { p.st = 'sad'; p.stT = 0; }
      }
    }
    this.movePlayers(dt);
    this.separate();
    if (this.stateT > 3.1 && !this.cfg.replays && !this.fadeSent) { this.fadeSent = true; this.emit({ type: 'fade', dur: 0.28 }); }
    if (this.stateT > 3.4) {
      if (this.cfg.replays) { this.state = 'replay'; this.stateT = 0; this.emit({ type: 'replay' }); }
      else this.afterGoal();
    }
  }

  afterGoal() {
    for (const p of this.players) if (p.st === 'celebrate' || p.st === 'sad') p.st = 'move';
    const last = this.goals[this.goals.length - 1];
    if (this.cfg.mode === 'match' && this.clock >= this.cfg.halfSeconds) return this.endHalf();
    this.emit({ type: 'fadein' });
    this.setupKickoff(1 - last.team);
  }

  checkHalfEnd() {
    if (this.cfg.mode !== 'match') return;
    const hs = this.cfg.halfSeconds;
    if (this.clock < hs) return;
    if (this.t < (this.penLiveUntil || 0)) return;
    const B = this.ball, P = this.P;
    const danger = Math.abs(B.x) > P.H - 25 * P.sc;
    if (!danger || this.clock > hs + 7) this.endHalf();
  }

  endHalf() {
    for (const p of this.players) if (p.st !== 'down') { p.st = 'move'; }
    const B = this.ball; B.owner = null;
    if (this.half === 1) {
      this.state = 'half'; this.stateT = 0;
      this.emit({ type: 'whistle', kind: 'half' });
      this.emit({ type: 'halftime' });
      if (!this.cfg.interactive) this.startSecondHalf();
    } else {
      this.state = 'full'; this.stateT = 0;
      this.emit({ type: 'whistle', kind: 'end' });
      this.emit({ type: 'fulltime', draw: this.teams[0].score === this.teams[1].score });
      if (!this.cfg.interactive && this.cfg.knockout && this.teams[0].score === this.teams[1].score) this.startShootout();
    }
  }

  startSecondHalf() {
    this.half = 2; this.clock = 0;
    for (const T of this.teams) { T.side *= -1; for (const p of T.players) p.stamina = Math.min(1, p.stamina + 0.35); }
    this.emit({ type: 'secondHalf' });
    this.setupKickoff(1 - this.firstKick);
    this.emit({ type: 'fadein' });
  }

  // -------------------------------------------------------------- penalties
  startShootout() {
    this.shootout = { kicks: [[], []], turn: this.rand() < 0.5 ? 0 : 1, order: [0, 0], done: false, winner: -1 };
    this.state = 'pen';
    this.emit({ type: 'shootoutStart' });
    this.startPenalty(this.shootout.turn, false);
  }

  startPenalty(teamIdx, inMatch) {
    const P = this.P, B = this.ball;
    const att = this.teams[teamIdx], def = this.opp(att);
    if (!inMatch) { att.side = 1; def.side = -1; }
    const s = inMatch ? att.side : 1;
    this.state = 'pen'; this.stateT = 0;
    let kicker;
    if (inMatch) kicker = att.players.filter((p) => !p.off && !p.isGK).sort((a, b) => b.a.sho - a.a.sho)[0];
    else {
      const list = att.players.filter((p) => !p.off).sort((a, b) => (b.isGK ? -50 : b.a.sho) - (a.isGK ? -50 : a.a.sho));
      kicker = list[this.shootout.order[teamIdx] % list.length];
      this.shootout.order[teamIdx]++;
    }
    const gk = def.gk && !def.gk.off ? def.gk : def.players.find((p) => !p.off);
    const spot = { x: s * (P.H - P.pen), z: 0 };
    this.resetBall(spot.x, spot.z);
    this.pen = { team: teamIdx, inMatch, s, phase: 'aim', t: 0, aimZ: 0, aimY: 0.9, power: 0, kicker, gk, spot, result: null, gkCommit: null, aiAim: null };
    // layout
    let i = 0, j = 0;
    for (const p of this.players) {
      if (p.off) continue;
      if (p === kicker) { this.place(p, spot.x - s * 2.3, 0.6); p.face = Math.atan2(-0.6, s * 2.3); continue; }
      if (p === gk) { this.place(p, s * (P.H - 0.15), 0); p.face = s > 0 ? PI : 0; continue; }
      if (inMatch) {
        const side = (i++ % 2 ? 1 : -1);
        this.place(p, s * (P.H - P.boxL - 2 - (i % 3) * 1.5), side * (3 + (i % 5) * 2.4) * P.sc);
      } else {
        const T = p.T, n = T.idx === 0 ? i++ : j++;
        this.place(p, s * (P.H - P.boxL - 14 * P.sc) - (T.idx ? 1.2 : 0), (n - 5) * 0.95 + (T.idx ? 0.45 : 0));
      }
      p.face = Math.atan2(spot.z - p.z, spot.x - p.x);
    }
    this.assignRestart(teamIdx, kicker, gk);
    this.emit({ type: 'penaltySetup', kicker, gk, inMatch, team: teamIdx });
  }

  updatePen(dt, cmds) {
    const pen = this.pen, B = this.ball, P = this.P, s = pen.s;
    if (!pen) return;
    pen.t += dt;
    const k = pen.kicker, g = pen.gk;
    const hk = this.humans.find((h) => h.p === k), hg = this.humans.find((h) => h.p === g);
    for (const p of this.players) if (p.off || (p !== k && p !== g)) { p.wvx = 0; p.wvz = 0; }
    const hw = P.goalW / 2;
    if (pen.phase === 'aim') {
      k.wvx = k.wvz = 0;
      if (hk) {
        const c = cmds[hk.id];
        if (c) {
          // stick right on screen behind kicker = +z (camera looks along +x for s=1)
          pen.aimZ = clamp(pen.aimZ + c.mz * dt * 3.2, -hw + 0.15, hw - 0.15);
          pen.aimY = clamp(pen.aimY + (c.mx * s) * dt * 2.2, 0.15, P.goalH - 0.15);
          hk.charge = c.shoot.held ? { btn: 'shoot', v: this.powerOf('shoot', c.shoot.dur) } : null;
          const fire = ['shoot', 'pass', 'lob', 'through'].find((b) => c[b].up);
          if (fire) { pen.power = this.powerOf('shoot', c[fire].dur); pen.phase = 'runup'; pen.t = 0; hk.charge = null; }
        }
      } else if (pen.t > 1.3) {
        const r = this.rand();
        const side = this.rand() < 0.5 ? -1 : 1;
        pen.aimZ = r < 0.12 ? (this.rand() - 0.5) * 0.8 : side * (hw - 0.3 - this.rand() * 0.95);
        pen.aimY = this.rand() < 0.65 ? 0.3 + this.rand() * 0.5 : 1.2 + this.rand() * 0.9;
        pen.power = 0.5 + this.rand() * 0.32 + (this.rand() < 0.08 ? 0.15 : 0);
        pen.phase = 'runup'; pen.t = 0;
      }
      if (hg) { const c = cmds[hg.id]; if (c) this.penKeeperInput(pen, c); }
    } else if (pen.phase === 'runup') {
      if (hg) { const c = cmds[hg.id]; if (c) this.penKeeperInput(pen, c); }
      const tx = B.x - s * 0.45, tz = B.z + 0.15;
      const dx = tx - k.x, dz = tz - k.z, d = hyp(dx, dz);
      const v = 5.5;
      k.wvx = d > 0.05 ? dx / d * v : 0; k.wvz = d > 0.05 ? dz / d * v : 0;
      k.wFace = Math.atan2(-B.z + pen.aimZ * 0, s);
      if (d < 0.25 || pen.t > 1.2) this.penKick();
    } else if (pen.phase === 'flight') {
      if (hg && !pen.gkCommit) { const c = cmds[hg.id]; if (c) this.penKeeperInput(pen, c, true); }
      if (pen.gkCommit && g.st !== 'dive' && this.t >= pen.gkCommit.at) this.penDive(pen);
      integrateBall(B, dt, P, false, this.ev);
      if (this.ev.post) this.emit({ type: 'post', v: this.ev.post });
      if (this.ev.net) this.emit({ type: 'net', ...this.ev.net });
      if (!pen.result) {
        if (B.held !== g && (g.st === 'dive' || this.t > pen.kickT + 0.05) && this.penGkContact(g)) pen.touched = true;
        if (s * B.x > P.H + BALL_R && Math.abs(B.z) < hw && B.y < P.goalH) pen.result = 'goal';
        else if (B.held === g) pen.result = 'save';
        else if (s * B.x > P.H + 1 || pen.t > 1.9 || (hyp(B.vx, B.vz) < 0.8 && pen.t > 0.8) || (pen.touched && s * B.vx < -0.5 && pen.t > 0.45)) pen.result = pen.touched ? 'save' : 'miss';
        if (pen.result) this.penResult(pen);
      }
      if (pen.t > 1.75 && !pen.fadeSent && this.shootout && !this.shootout.done) { pen.fadeSent = true; this.emit({ type: 'fade', dur: 0.22 }); }
      if (pen.t > 2.0) {
        if (!pen.result) { pen.result = pen.touched ? 'save' : 'miss'; this.penResult(pen); }
        this.nextShootoutKick();
      }
    }
    this.movePlayers(dt);
    if (B.held) { B.x = g.x + Math.cos(g.face) * 0.3; B.z = g.z + Math.sin(g.face) * 0.3; B.y = 1.05; }
  }

  penKeeperInput(pen, c, late) {
    if (pen.gkCommit) return;
    const anyDown = c.pass.down || c.shoot.down || c.lob.down || c.through.down;
    pen.gkStick = { x: c.mx, z: c.mz, mag: c.mag };
    if (anyDown) pen.gkCommit = { z: c.mag > 0.3 ? c.mz : 0, up: c.mag > 0.3 ? Math.max(0, c.mx * pen.s) : 0, at: this.t };
  }

  penKick() {
    const pen = this.pen, B = this.ball, P = this.P, k = pen.kicker, s = pen.s;
    const human = this.humans.some((h) => h.p === k);
    let pw = pen.power;
    const sho = k.a.sho / 99;
    let az = pen.aimZ, ay = pen.aimY;
    // power sweet spot .45-.82: outside gets wild
    const wild = pw > 0.85 ? (pw - 0.85) * 4 : pw < 0.25 ? (0.25 - pw) * 1.5 : 0;
    az += this.gauss() * (0.24 + (1 - sho) * 0.45 + wild * 1.2) * (human ? 0.8 : this.teams[k.team].lvl.err * 0.8);
    ay += this.gauss() * (0.12 + wild * 1.4) + (pw > 0.85 ? (pw - 0.85) * 6 : 0);
    const spd = 14 + clamp(pw, 0.2, 1) * 14 * (0.8 + 0.2 * sho);
    const gx = s * P.H, dx = gx - B.x, dz = az - B.z, d = hyp(dx, dz);
    const t = d / (spd * 0.94);
    const vy = (ay - B.y) / t + 0.5 * G * t;
    this.kick(k, dx / d * spd, vy, dz / d * spd, 0, 'shot');
    B.shotBy = k; B.shotT = this.t;
    pen.phase = 'flight'; pen.t = 0; pen.kickT = this.t;
    pen.target = { z: az, y: ay, t };
    const hg = this.humans.find((h) => h.p === pen.gk);
    if (!hg) {
      const g = pen.gk, lvl = g.T.lvl;
      const read = clamp(0.3 + (g.a.gk / 99 - 0.7) * 0.6 + (lvl.smart - 0.7) * 0.3, 0.18, 0.6);
      let dz2;
      const r = this.rand();
      if (r < read) dz2 = az; else if (r < read + 0.15) dz2 = 0; else dz2 = (az > 0 ? -1 : 1) * (1.5 + this.rand() * 1.5);
      pen.gkCommit = { z: dz2, y: clamp(ay + (this.rand() - 0.5) * 0.6, 0.3, 2.2), at: this.t + lvl.gkReact * 0.25, abs: true };
    } else if (!pen.gkCommit) {
      const st = pen.gkStick || { x: 0, z: 0, mag: 0 };
      pen.gkCommit = { z: st.mag > 0.3 ? st.z : 0, up: st.mag > 0.3 ? Math.max(0, st.x * s) : 0, at: this.t + 0.12 };
    }
    if (pen.inMatch) {
      // live ball after the kick
      this.state = 'play'; this.stateT = 0;
      this.penLiveUntil = this.t + 2.8;
      this.penDive(pen, true);
      this.pen = null;
      this.emit({ type: 'penaltyKick' });
    }
  }

  penDive(pen, now) {
    const g = pen.gk, c = pen.gkCommit;
    if (!c) return;
    const P = this.P, hw = P.goalW / 2;
    let tz, ty;
    if (c.abs) { tz = clamp(c.z, -hw - 0.5, hw + 0.5); ty = c.y; }
    else { tz = c.z * hw * 0.9; ty = 0.6 + c.up * 1.5; }
    if (Math.abs(tz - g.z) < 0.5 && ty < 1.6) { g.wvx = 0; return; }
    const tleft = pen.target ? Math.max(0.2, pen.target.t - (this.t - (pen.kickT || this.t))) : 0.5;
    this.startDive(g, tz, ty, tleft);
    g.stT = 0.12; // keepers start moving as the kicker strikes

  }

  penGkContact(g) {
    const B = this.ball;
    const save = this.gkContact(g);
    return save;
  }

  penResult(pen) {
    const so = this.shootout;
    this.emit({ type: 'penResult', result: pen.result, team: pen.team, kicker: pen.kicker });
    if (pen.result === 'goal' && !so) this.goalScored(pen.team);
    if (!so) return;
    so.kicks[pen.team].push(pen.result === 'goal');
    const a = so.kicks[0], b = so.kicks[1];
    const sa = a.filter(Boolean).length, sb = b.filter(Boolean).length;
    const na = a.length, nb = b.length;
    if (na <= 5 && nb <= 5) {
      const remA = 5 - na, remB = 5 - nb;
      if (sa + remA < sb || sb + remB < sa) { so.done = true; so.winner = sa > sb ? 0 : 1; }
    }
    if (!so.done && na >= 5 && nb >= 5 && na === nb && sa !== sb) { so.done = true; so.winner = sa > sb ? 0 : 1; }
  }

  nextShootoutKick() {
    const so = this.shootout;
    if (!so || this.pen.next) return;
    this.pen.next = true;
    for (const p of this.players) if (p.st === 'dive' || p.st === 'hold') p.st = 'move';
    if (so.done) { this.state = 'full'; this.emit({ type: 'shootoutEnd', winner: so.winner }); return; }
    so.turn = 1 - so.turn;
    this.startPenalty(so.turn, false);
    this.emit({ type: 'fadein' });
  }

  // -------------------------------------------------------------- practice
  practiceGoal(T) {
    this.emit({ type: 'goal', team: T.idx, scorer: this.ball.last ? this.ball.last.name : '', practice: true, T });
    T.score++;
    this.state = 'dead'; this.stateT = 0; this.pendingSP = { type: 'practice' }; this.fadeSent = false;
    this.practiceResetPending = true;
  }
  practiceRestart() {
    const T = this.teams[0], P = this.P, s = T.side;
    const g = this.teams[1].gk;
    if (g) this.place(g, s * (P.H - 1.2), 0);
    const h = this.humans[0];
    const p = (h && h.p) || T.players[T.players.length - 2];
    const x = s * (P.H - (18 + this.rand() * 14) * P.sc), z = (this.rand() - 0.5) * P.HW;
    this.place(p, x, z);
    p.face = s > 0 ? 0 : PI;
    this.resetBall(x + s * 0.6, z);
    this.setOwner(p);
    this.state = 'play'; this.stateT = 0;
    this.emit({ type: 'fadein' });
  }
  practiceReset() {
    this.state = 'dead'; this.stateT = 0; this.pendingSP = { type: 'practice' }; this.fadeSent = false;
  }

  // -------------------------------------------------------------- AI
  teamAI(T, dt) {
    const B = this.ball, P = this.P;
    const att = this.possSoft === T.idx;
    const O = this.opp(T);
    const lvl = T.lvl;
    // loose ball chaser
    let chaser = null;
    if (!B.owner && !B.held) {
      const cand = T.players.filter((p) => !p.off && !p.isGK && p.icpt && p.human < 0 && p.st !== 'down' && p.st !== 'slide');
      const humanBest = T.players.filter((p) => p.human >= 0 && p.icpt).reduce((m, p) => Math.min(m, p.icpt.t), 99);
      let best = null;
      for (const p of cand) if (!best || p.icpt.t < best.icpt.t) best = p;
      if (B.intended && B.intended.team === T.idx && !B.intended.off && B.intended.human < 0 && B.intended.icpt && !B.intended.isGK) {
        chaser = B.intended;
        if (best && best !== chaser && best.icpt.t < chaser.icpt.t - 0.7) chaser = best;
      } else if (best) {
        const oppBest = O.players.filter((p) => !p.off && p.icpt).reduce((m, p) => Math.min(m, p.icpt.t), 99);
        const theirPass = B.intended && B.intended.team !== T.idx;
        if (!theirPass || best.icpt.t < oppBest + 0.25) chaser = best;
      }
      if (chaser && humanBest < chaser.icpt.t - 0.05 && chaser !== B.intended) chaser = null;
      // second chaser when ball is loose in a dangerous place
      T.chaser = chaser;
    } else T.chaser = null;
    // pressers
    const pressers = [];
    const o = B.owner && B.owner.team !== T.idx ? B.owner : null;
    if (o) {
      const og = { x: -T.side * P.H, z: 0 };
      const cand = T.players.filter((p) => !p.off && !p.isGK && p.human < 0 && p.st !== 'down').map((p) => {
        const d = hyp(p.x - o.x, p.z - o.z);
        const goalSide = hyp(p.x - og.x, p.z - og.z) < hyp(o.x - og.x, o.z - og.z);
        return { p, s: d - (goalSide ? 2 : 0) };
      }).sort((a, b) => a.s - b.s);
      const humanNear = T.players.some((p) => p.human >= 0 && hyp(p.x - o.x, p.z - o.z) < 4.5);
      const called = T.callPress > this.t;
      if (cand[0] && (!humanNear || called || lvl.press > 0.85)) pressers.push(cand[0].p);
      const deep = o.x * T.side < -P.H * 0.35;
      if (cand[1] && (called || (lvl.press > 0.8 && deep && cand[1].s < 9 * P.sc))) pressers.push(cand[1].p);
    }
    // markers in defence
    const marks = new Map();
    if (!att) {
      const used = new Set();
      const defenders = T.players.filter((p) => !p.off && !p.isGK && p.human < 0 && !pressers.includes(p) && p !== chaser && (p.role === 'DEF' || p.role === 'MID'));
      const targets = defenders.map((p) => ({ p, t: this.formationTarget(p, false, B.x, B.z) }));
      targets.sort((a, b) => a.p.slot.d - b.p.slot.d);
      for (const { p, t } of targets) {
        let best = null, bd = 13 * P.sc;
        for (const a of O.players) {
          if (a.off || a.isGK || used.has(a) || a === B.owner) continue;
          const d = hyp(a.x - t.x, a.z - t.z);
          const danger = a.x * T.side < t.x * T.side + 9 * P.sc;
          if (d < bd && danger) { bd = d; best = a; }
        }
        if (best) {
          used.add(best);
          const gx = -T.side * P.H;
          const ux = gx - best.x, uz = -best.z, ul = hyp(ux, uz) || 1;
          const k = p.role === 'DEF' ? 0.75 : 0.5;
          marks.set(p, { x: t.x * (1 - k) + (best.x + ux / ul * 1.7) * k, z: t.z * (1 - k) + (best.z + uz / ul * 1.7) * k });
        } else marks.set(p, t);
      }
    }
    // support runner
    let support = null;
    const carrier = att && B.owner && B.owner.team === T.idx ? B.owner : null;
    if (carrier) {
      const mids = T.players.filter((p) => !p.off && !p.isGK && p.human < 0 && p !== carrier && p.role !== 'DEF');
      support = mids.sort((a, b) => hyp(a.x - carrier.x, a.z - carrier.z) - hyp(b.x - carrier.x, b.z - carrier.z))[0] || null;
    }
    for (const p of T.players) {
      if (p.off) continue;
      if (p.isGK && B.held === p) { this.gkDistribute(p, dt); continue; }
      if (p.human >= 0) continue;
      if (p.isGK) { this.gkAI(p, dt); continue; }
      if (p.st === 'slide' || p.st === 'down' || p.st === 'getup') continue;
      if (B.owner === p) { this.aiCarrier(p, dt, false); continue; }
      if (p === chaser) { this.aiChase(p); continue; }
      if (pressers.includes(p)) { this.aiPress(p, o, dt); continue; }
      let tgt = marks.get(p) || this.formationTarget(p, att, B.x, B.z);
      if (att && p.plan && p.plan.type === 'run' && this.t < p.plan.until) { tgt = { x: p.plan.x, z: p.plan.z }; this.steer(p, tgt.x, tgt.z, true); continue; }
      if (att && p === support) tgt = this.supportSpot(p, carrier, tgt);
      if (carrier && (p.slot.d > 0.85 || p.role === 'FWD')) tgt = this.attackRun(p, tgt, dt);
      const urgent = !att && (p.x * T.side > B.x * T.side) || hyp(tgt.x - p.x, tgt.z - p.z) > 12;
      this.steer(p, tgt.x, tgt.z, urgent);
    }
  }

  steer(p, tx, tz, urgent, faceBall = true) {
    const dx = tx - p.x, dz = tz - p.z, d = hyp(dx, dz);
    const max = urgent ? p.spr * (0.86 + 0.14 * p.stamina) : p.jog;
    const v = Math.min(max, d * 1.9);
    if (d < 0.35) { p.wvx = 0; p.wvz = 0; }
    else { p.wvx = dx / d * v; p.wvz = dz / d * v; }
    p.sprint = urgent && d > 4;
    p.wFace = faceBall ? Math.atan2(this.ball.z - p.z, this.ball.x - p.x) : null;
  }

  aiChase(p) {
    const B = this.ball, ic = p.icpt;
    if (!ic) return;
    let tx = ic.x, tz = ic.z;
    const d = hyp(tx - p.x, tz - p.z);
    const dB = hyp(B.x - p.x, B.z - p.z);
    // approach from behind the ball relative to where we want to go
    if (dB < 3 && B.y < 0.6 && hyp(B.vx, B.vz) < 4) { tx = B.x - p.T.side * 0.25; tz = B.z; }
    const v = Math.min(p.spr * (0.86 + 0.14 * p.stamina), Math.max(d * 3, 2.5));
    p.wvx = d > 0.1 ? (tx - p.x) / d * v : 0; p.wvz = d > 0.1 ? (tz - p.z) / d * v : 0;
    p.sprint = d > 2;
    p.wFace = null;
    // jump for headers
    if (ic.y > 1.75 && p.y <= 0.01 && dB < 2.2 && B.y > 1.6) p.vy = 3.4;
    // first-time finish on crosses into the box
    if (!p.queued && this.inOppBox(p.T, ic.x, ic.z) && (B.kickKind === 'cross' || B.kickKind === 'lob' || (B.kickKind === 'pass' && hyp(B.vx, B.vz) > 9)) && B.lastTeam === p.team) {
      const T = p.T;
      if (this.rand() < 0.65 * T.lvl.smart + 0.2) p.queued = { btn: 'shoot', t: this.t };
    }
  }

  aiPress(p, o, dt) {
    const T = p.T, P = this.P, lvl = T.lvl;
    const gx = -T.side * P.H;
    const ux = gx - o.x, uz = -o.z, ul = hyp(ux, uz) || 1;
    const cx = o.x + ux / ul * 1.3 + o.vx * 0.25, cz = o.z + uz / ul * 1.3 + o.vz * 0.25;
    const d = hyp(o.x - p.x, o.z - p.z);
    this.steer(p, cx, cz, d > 2.5 || lvl.press > 0.8, false);
    p.wFace = Math.atan2(o.z - p.z, o.x - p.x);
    if (d < 1.7 && p.tackleCD <= 0 && p.lock <= 0) {
      const rate = 0.8 + lvl.tackle * 3.2;
      if (this.rand() < rate * dt) this.tryTackle(p);
    } else if (d < 3 && d > 1.4 && lvl.tackle > 0.55 && p.tackleCD <= 0 && o.speed > 5) {
      const fx = Math.cos(o.face), fz = Math.sin(o.face);
      const side = Math.abs(((p.x - o.x) * fz - (p.z - o.z) * fx) / d);
      if (side > 0.6 && this.rand() < 0.25 * dt * lvl.tackle) this.trySlide(p, Math.atan2(this.ball.z + o.vz * 0.3 - p.z, this.ball.x + o.vx * 0.3 - p.x));
    }
  }

  supportSpot(p, carrier, base) {
    const P = this.P, T = p.T;
    let best = base, bs = -1e9;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const r = 11 * P.sc;
      const x = carrier.x + Math.cos(a) * r, z = carrier.z + Math.sin(a) * r;
      if (Math.abs(z) > P.HW - 2 || Math.abs(x) > P.H - 3) continue;
      let od = 99;
      for (const o of this.opp(T).players) { if (o.off) continue; od = Math.min(od, hyp(o.x - x, o.z - z)); }
      const fwd = (x - carrier.x) * T.side;
      const s = Math.min(od, 8) + fwd * 0.12 - hyp(x - base.x, z - base.z) * 0.15;
      if (s > bs) { bs = s; best = { x, z }; }
    }
    return best;
  }

  attackRun(p, tgt, dt) {
    const T = p.T, P = this.P;
    p.runCD = (p.runCD ?? this.rand() * 3) - dt;
    if (p.runCD < 0 && !p.runActive) { p.runCD = 2.5 + this.rand() * 3; if (this.rand() < 0.4 + T.style.tempo * 0.4) p.runActive = this.t + 1.4; }
    if (p.runActive && this.t < p.runActive) {
      const line = this.offsideLine(T);
      return { x: (line - 0.5) * T.side, z: tgt.z * 0.8 };
    }
    p.runActive = 0;
    return tgt;
  }

  gkAI(g, dt) {
    const B = this.ball, P = this.P, T = g.T, own = -T.side;
    const gx = own * P.H;
    if (B.held === g) { this.gkDistribute(g, dt); return; }
    if (B.owner === g) { this.aiCarrier(g, dt, false); return; }
    if (g.st === 'dive') return;
    g.wFace = Math.atan2(B.z - g.z, B.x - g.x);
    // shot / incoming ball toward goal
    if (!B.owner && B.vx * own > 3) {
      let cross = null;
      for (let i = 1; i <= 30; i++) {
        const q = this.pred[i];
        if (q.x * own >= P.H - 0.25) { cross = { z: q.z, y: q.y, t: q.t, i }; break; }
      }
      if (cross && Math.abs(cross.z) < P.goalW / 2 + 0.8 && cross.y < P.goalH + 0.5 && cross.t < 1.7) {
        if (g.reactT < 0 || this.t - B.kickT < 0.05) g.reactT = Math.max(B.kickT, this.t - dt) + T.lvl.gkReact * (1.5 - g.a.gk / 200);
        if (this.t >= g.reactT) {
          let gp = null;
          for (let i = 0; i <= 30; i++) { const q = this.pred[i]; if (q.x * own >= g.x * own - 0.1) { gp = q; break; } }
          if (!gp) gp = cross;
          const need = Math.abs(gp.z - g.z);
          if (need < 0.8 && gp.y < 2.0) { this.steer(g, g.x, gp.z, true); }
          else if (gp.t > 0.55) {
            // plenty of time: shuffle across and keep the dive for the last moment
            this.steer(g, g.x, clamp(gp.z, -P.goalW / 2 - 0.3, P.goalW / 2 + 0.3), true);
          } else if (gp.t > 0.05) this.startDive(g, gp.z, gp.y, gp.t);
        } else { g.wvx *= 0.5; g.wvz *= 0.5; }
        return;
      }
    }
    g.reactT = -1;
    // claim loose balls in the box
    if (!B.owner && !B.held && g.icpt) {
      const ic = g.icpt;
      const inMyBox = this.inBox(T, ic.x, ic.z);
      let othersBest = 99;
      for (const p of this.players) if (p !== g && !p.off && p.icpt) othersBest = Math.min(othersBest, p.icpt.t + (p.team === g.team ? 0.4 : 0));
      if (inMyBox && ic.t < othersBest + 0.15 && ic.t < 2.2) {
        const d = hyp(ic.x - g.x, ic.z - g.z);
        const v = Math.min(g.spr, d * 3);
        g.wvx = d > 0.1 ? (ic.x - g.x) / d * v : 0; g.wvz = d > 0.1 ? (ic.z - g.z) / d * v : 0;
        if (ic.y > 1.8 && B.y > 1.6 && hyp(B.x - g.x, B.z - g.z) < 2) g.vy = Math.max(g.vy, 3);
        return;
      }
    }
    // rush a 1v1
    if (B.owner && B.owner.team !== T.idx && this.inBox(T, B.x, B.z)) {
      const dGoal = hyp(B.x - gx, B.z);
      if (dGoal < 13 * P.sc) {
        const k = Math.max(1, dGoal - 2.6);
        const ux = (B.x - gx) / dGoal, uz = B.z / dGoal;
        this.steer(g, gx + ux * Math.min(k, 7 * P.sc), uz * Math.min(k, 7 * P.sc), true);
        if (hyp(B.x - g.x, B.z - g.z) < 1.7 && g.tackleCD <= 0 && this.rand() < (1.5 + T.lvl.tackle * 2) * dt) {
          g.tackleCD = 1; const o = B.owner;
          if (this.rand() < 0.35 + (g.a.gk - o.a.dri) * 0.01) { o.lock = 0.4; o.touchCD = 0.6; this.gkHold(g); this.emit({ type: 'save', p: g, kind: 'smother' }); }
          else { g.lock = 0.6; }
        }
        return;
      }
    }
    // positioning on the arc
    const dBall = hyp(B.x - gx, B.z);
    const k = clamp(0.6 + dBall * 0.075, 0.6, 5.5 * (P.sc > 0.5 ? 1 : 0.5) + (P.sc > 0.5 ? 0 : 0.6));
    const ux = (B.x - gx) / Math.max(1, dBall), uz = B.z / Math.max(1, dBall);
    let tx = gx + ux * k, tz = uz * k;
    tz = clamp(tz, -P.goalW / 2 - 0.4, P.goalW / 2 + 0.4);
    if (tx * own > P.H - 0.3) tx = own * (P.H - 0.3);
    this.steer(g, tx, tz, hyp(tx - g.x, tz - g.z) > 3);
  }

  startDive(g, tz, ty, tReach) {
    const P = this.P;
    g.st = 'dive'; g.stT = 0; g.stDur = 1.2;
    const dz = tz - g.z;
    g.diveDir = dz < 0 ? -1 : 1;
    g.diveH = clamp(ty, 0.25, 2.35);
    const lift = Math.max(0, g.diveH - 0.9) * 0.55;
    const hand = DIVE_LEN * Math.sin(diveRoll(g.diveH, lift)) * 0.88;
    const reach = (2.75 + g.a.gk * 0.009) * (g.T.lvl.gkReach || 1);
    const bodyMove = clamp(Math.abs(dz) - hand, 0, Math.max(0, reach - hand));
    // body slides while e < 0.5s with speed factor (1 - 1.2e): displacement = v * (t - 0.6t^2)
    const tm = clamp(tReach, 0.18, 0.5);
    g.diveVz = g.diveDir * Math.min(3.6, bodyMove / (tm - 0.6 * tm * tm));
    g.lock = 1.5; g.vx *= 0.3;
    this.emit({ type: 'dive', p: g });
  }

  gkDistribute(g, dt) {
    const T = g.T, P = this.P, B = this.ball;
    g.holdT += dt;
    g.wvx = 0; g.wvz = 0;
    g.face = T.side > 0 ? 0 : PI;
    if (g.st === 'dive' && g.stT > 0.9) g.st = 'hold';
    if (g.human >= 0) {
      if (g.holdT > 4.5) this.gkDistributeAI(g);
      return;
    }
    if (g.holdT > (g.holdWait || (g.holdWait = 1.1 + this.rand() * 1.4))) { this.gkDistributeAI(g); g.holdWait = 0; }
  }

  gkDistributeAI(g) {
    const T = g.T;
    const mates = T.players.filter((m) => !m.off && m !== g);
    const short = mates.filter((m) => m.role === 'DEF' || m.role === 'MID').map((m) => ({ m, s: this.openScore(m, g) })).sort((a, b) => b.s - a.s)[0];
    if (short && short.s > 5 && this.rand() < 0.75 - T.style.tempo * 0.3) this.doPass(g, 'gkthrow', null, 0.5, false, short.m);
    else {
      const fw = mates.filter((m) => m.slot.d > 0.4).map((m) => ({ m, s: this.openScore(m, g) })).sort((a, b) => b.s - a.s)[0];
      this.doPass(g, 'punt', null, 0.8, false, fw ? fw.m : null);
    }
  }

  // -------------------------------------------------------------- AI carrier
  aiCarrier(p, dt, now) {
    const T = p.T;
    p.aiT -= dt;
    if (!now && p.aiT > 0) { this.applyDribble(p); return; }
    p.aiT = T.lvl.react * (0.65 + this.rand() * 0.7);
    const best = this.evalOptions(p);
    if (best.type === 'shot') return this.doShoot(p, best.power, null, false);
    if (best.type === 'pass') return this.doPass(p, best.kind, null, best.power, false, best.m);
    if (now) {
      // forced instant decision (first time / free kick) with no better option: short pass
      const m = this.chooseReceiver(p, 'pass', { x: T.side, z: 0 }, false);
      if (m) return this.doPass(p, 'pass', null, 0.4, false, m);
    }
    p.aiDir = best.dir; p.aiSprint = best.sprint;
    this.applyDribble(p);
  }

  applyDribble(p) {
    const d = p.aiDir || { x: p.T.side, z: 0 };
    const sp = p.aiSprint ? p.spr * (0.86 + 0.14 * p.stamina) : p.jog * 1.05;
    p.wvx = d.x * sp; p.wvz = d.z * sp; p.sprint = p.aiSprint; p.wFace = null;
    // stay inside the pitch
    const P = this.P;
    if (Math.abs(p.z) > P.HW - 2.5 && p.wvz * p.z > 0) p.wvz *= -0.3;
    if (Math.abs(p.x) > P.H - 2 && p.wvx * p.x > 0) p.wvx *= -0.3;
  }

  evalOptions(p) {
    const T = p.T, P = this.P, s = T.side, lvl = T.lvl, B = this.ball;
    const rx = p.x * s, rz = p.z * s;
    const pres = this.pressureOn(p);
    const noise = () => 1 + (this.rand() - 0.5) * (1 - lvl.smart) * 0.9;
    const cur = this.threat(rx, rz);
    let best = { type: 'dribble', v: -1, dir: { x: s, z: 0 }, sprint: false };
    // shot
    const xg = this.xg(p);
    if (xg > 0.03) {
      const v = xg * 1.35 * lvl.shoot * (0.75 + p.a.sho / 300) * noise();
      if (v > best.v) best = { type: 'shot', v, power: clamp(0.55 + this.rand() * 0.35 - (xg > 0.25 ? 0.15 : 0), 0.3, 0.92) };
    }
    // passes
    for (const m of T.players) {
      if (m === p || m.off) continue;
      const kinds = ['pass'];
      const ahead = (m.x - p.x) * s;
      if (ahead > 3 && m.role !== 'DEF' && !m.isGK) kinds.push('through');
      const d = hyp(m.x - p.x, m.z - p.z);
      if ((d > 22 * P.sc || (this.inFinalThird(T, p.x) && Math.abs(p.z) > P.HW * 0.45 && this.inOppBox(T, m.x, m.z))) && !m.isGK) kinds.push('lob');
      for (const kind of kinds) {
        const power = kind === 'through' ? 0.45 : 0.5;
        const tgt = this.passTarget(p, m, kind, power);
        const succ = this.passSuccess(p, m, tgt, kind);
        const tv = this.threat(tgt.x * s, tgt.z * s);
        let v = succ * (tv + 0.006) - (1 - succ) * (this.threat(-tgt.x * s, -tgt.z * s) * 0.6 + 0.004);
        if (m.isGK) v *= 0.35;
        if (ahead < -3 && pres < 0.4) v *= 0.85;
        if (kind === 'lob' && this.inOppBox(T, m.x, m.z) && (m.slot.r === 'FWD' || m.a.phy > 75)) v *= 1.25;
        if (kind === 'lob' && this.inOppBox(T, m.x, m.z) && Math.abs(p.z) > P.HW * 0.5 && p.x * s > P.H * 0.45) v *= 1.6 + T.style.width * 0.6;
        v *= noise();
        if (v > best.v) best = { type: 'pass', v, m, kind, power };
      }
    }
    // dribble (holding the ball too long gets less attractive)
    const held = this.t - (p.ownT ?? this.t);
    const holdK = (0.97 - T.style.tempo * 0.12) * Math.exp(-held / (2.4 + (1 - T.style.tempo) * 1.6));
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      const dx = Math.cos(a), dz = Math.sin(a);
      const L = 5 * P.sc;
      const qx = p.x + dx * L, qz = p.z + dz * L;
      if (Math.abs(qz) > P.HW - 1.5 || Math.abs(qx) > P.H - 1.2) continue;
      const keep = this.dribbleSafety(p, dx, dz, L);
      let v = keep * (this.threat(qx * s, qz * s) + 0.006) * holdK - (1 - keep) * (this.threat(-qx * s, -qz * s) * 0.6 + 0.004);
      if (p.aiDir) v *= 1 + 0.12 * (p.aiDir.x * dx + p.aiDir.z * dz);
      v *= noise();
      if (v > best.v) best = { type: 'dribble', v, dir: { x: dx, z: dz }, sprint: keep > 0.65 && dx * s > 0.3 };
    }
    // clearance when deep and pressed hard
    if (rx < -P.H + 22 * P.sc && pres > 0.7 && best.v < 0.004) {
      return { type: 'pass', kind: 'lob', m: this.chooseReceiver(p, 'lob', { x: s, z: 0 }, false), power: 0.9 };
    }
    return best;
  }

  passSuccess(p, m, tgt, kind) {
    const O = this.opp(p.T), B = this.ball;
    const d = hyp(tgt.x - B.x, tgt.z - B.z);
    let succ = 1;
    if (kind === 'lob') {
      const tB = tgt.tt || 0.85 + d / 26;
      for (const o of O.players) {
        if (o.off) continue;
        const tO = Math.max(0, hyp(o.x - tgt.x, o.z - tgt.z) - 1.4) / o.spr + 0.25;
        if (tO < tB + 0.2) succ *= 0.55 + clamp((tO - tB) * 0.8, -0.4, 0.4);
      }
    } else {
      const v0 = tgt.v0 || 12, ve = tgt.ve || 6;
      const avg = (v0 + ve) / 2;
      for (const o of O.players) {
        if (o.off) continue;
        const ox = o.x - B.x, oz = o.z - B.z, dx = tgt.x - B.x, dz = tgt.z - B.z;
        const pr = clamp((ox * dx + oz * dz) / (d * d), 0, 1);
        const cx = dx * pr, cz = dz * pr;
        const dc = hyp(ox - cx, oz - cz);
        const tBall = (pr * d) / avg;
        const tO = Math.max(0, dc - 0.9) / o.spr + 0.12;
        const margin = tO - tBall;
        const risk = 1 / (1 + Math.exp(margin * 6));
        succ *= 1 - risk * 0.92;
      }
    }
    const tR = Math.max(0, hyp(m.x - tgt.x, m.z - tgt.z) - 0.8) / m.spr;
    if (tR > (tgt.tt || 1) + 0.5) succ *= 0.55;
    succ *= 0.9 + p.a.pas * 0.001;
    succ *= 1 - this.pressureOn(p) * 0.12;
    return clamp(succ, 0, 1);
  }

  dribbleSafety(p, dx, dz, L) {
    let keep = 1;
    for (const o of this.opp(p.T).players) {
      if (o.off) continue;
      const ox = o.x - p.x, oz = o.z - p.z;
      const pr = ox * dx + oz * dz;
      if (pr < -1.5) continue;
      const c = clamp(pr, 0, L);
      const dist = hyp(ox - dx * c, oz - dz * c);
      keep *= clamp((dist - 0.7) / 3.4, 0.06, 1);
    }
    return Math.pow(keep, 0.7) * (0.72 + p.a.dri / 360);
  }

  // -------------------------------------------------------------- movement
  movePlayers(dt) {
    const P = this.P, B = this.ball;
    for (const p of this.players) {
      if (p.off) continue;
      if (p.st === 'slide') {
        const k = Math.max(0, 1 - dt * 2.2);
        p.sdx *= k; p.sdz *= k;
        p.vx = p.sdx; p.vz = p.sdz;
        p.x += p.vx * dt; p.z += p.vz * dt;
        p.speed = hyp(p.vx, p.vz);
        if (!p.slideHit && p.stT < 0.55) this.slideContact(p);
        if (p.stT > p.stDur) { p.st = 'getup'; p.stT = 0; p.vx = p.vz = 0; }
      } else if (p.st === 'dive') {
        const e = p.stT;
        if (e < 0.5) { p.z += p.diveVz * dt * (1 - e * 1.2); p.x += p.vx * dt; }
        p.vx *= 0.9; p.vz = e < 0.5 ? p.diveVz * (1 - e * 1.2) : 0;
        const lift = Math.max(0, p.diveH - 0.9) * 0.55;
        p.y = Math.max(0, Math.sin(clamp(e / 0.75, 0, 1) * PI) * lift);
        p.speed = 0;
        if (p.stT > p.stDur) { p.st = this.ball.held === p ? 'hold' : 'getup'; p.stT = 0; p.y = 0; p.diveVz = 0; }
      } else if (p.st === 'down') {
        p.vx *= 0.85; p.vz *= 0.85; p.x += p.vx * dt; p.z += p.vz * dt; p.speed = hyp(p.vx, p.vz);
        if (p.stT > p.stDur) { p.st = 'getup'; p.stT = 0; }
      } else {
        let wx = p.wvx, wz = p.wvz;
        if (p.lock > 0) { wx *= 0.25; wz *= 0.25; }
        if (p.st === 'getup' || p.st === 'throw') { wx = 0; wz = 0; }
        if (B.owner === p) {
          const f = 0.9 + p.a.dri * 0.0008;
          wx *= f; wz *= f;
        }
        const wl = hyp(wx, wz);
        const max = p.sprint ? p.spr * (0.86 + 0.14 * p.stamina) : Math.max(p.jog, wl);
        if (wl > max) { wx *= max / wl; wz *= max / wl; }
        let a = 12 + p.a.phy * 0.035 + p.a.pac * 0.02;
        if (B.owner === p) a *= 0.85;
        const dvx = wx - p.vx, dvz = wz - p.vz, dl = hyp(dvx, dvz);
        if (wl < p.speed) a *= 1.35;
        if (p.speed > 4 && (wx * p.vx + wz * p.vz) < 0) a *= 0.75;
        const step = a * dt;
        if (dl > step) { p.vx += dvx / dl * step; p.vz += dvz / dl * step; } else { p.vx = wx; p.vz = wz; }
        p.x += p.vx * dt; p.z += p.vz * dt;
        p.speed = hyp(p.vx, p.vz);
        p.sprinting = p.sprint && p.speed > p.jog * 0.95;
        if (p.sprinting) p.stamina = Math.max(0, p.stamina - dt * 0.03 * (1.35 - p.a.phy / 100));
        else p.stamina = Math.min(1, p.stamina + dt * (p.speed < 2 ? 0.03 : 0.015));
        // facing
        let tf;
        if ((B.owner === p || p.speed > 1.8) && p.speed > 0.3) tf = Math.atan2(p.vz, p.vx);
        else if (p.wFace != null) tf = p.wFace;
        else tf = p.face;
        if (p.wFace != null && B.owner !== p && p.speed < 4.5) tf = p.wFace;
        const rate = (B.owner === p ? 7 + p.a.dri * 0.03 : 10) * dt;
        const da = angDiff(p.face, tf);
        p.face += clamp(da, -rate, rate);
      }
      // jumping
      if (p.st !== 'dive' && (p.y > 0 || p.vy > 0)) { p.vy -= G * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; } }
      p.phase += p.speed * dt * 1.32;
      // bounds
      const mx = this.walls ? P.H - 0.35 : P.H + 4, mz = this.walls ? P.HW - 0.35 : P.HW + 3;
      if (this.walls && Math.abs(p.z) < P.goalW / 2 && p.isGK) { /* keeper may stand on the line */ }
      p.x = clamp(p.x, -mx - (this.walls && Math.abs(p.z) < P.goalW / 2 ? 0.6 : 0), mx + (this.walls && Math.abs(p.z) < P.goalW / 2 ? 0.6 : 0));
      p.z = clamp(p.z, -mz, mz);
    }
  }

  slideContact(p) {
    const B = this.ball;
    const fx = p.x + Math.cos(p.face) * 0.75, fz = p.z + Math.sin(p.face) * 0.75;
    if (!B.held && B.y < 0.55 && hyp(B.x - fx, B.z - fz) < 0.75 && (!B.owner || B.owner.team !== p.team)) { this.slideWin(p); return; }
    for (const o of this.opp(p.T).players) {
      if (o.off || o.st === 'down' || o.isGK && B.held === o) continue;
      if (hyp(o.x - fx, o.z - fz) < 0.6 || hyp(o.x - p.x, o.z - p.z) < 0.55) {
        p.slideHit = true;
        if (B.owner === o || hyp(B.x - o.x, B.z - o.z) < 2) this.foul(p, o, true);
        else { o.st = 'down'; o.stT = 0; o.stDur = 0.9; }
        return;
      }
    }
  }

  separate() {
    const ps = this.players, B = this.ball;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i]; if (a.off) continue;
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j]; if (b.off) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 > 0.64 || d2 < 1e-6) continue;
        if ((a.st === 'dive' || b.st === 'dive' || a.st === 'down' || b.st === 'down')) continue;
        const d = Math.sqrt(d2), push = (0.8 - d) / 2;
        let wa = 0.5, wb = 0.5;
        if (B.owner === a) { wa = 0.3; wb = 0.7; } else if (B.owner === b) { wa = 0.7; wb = 0.3; }
        a.x -= dx / d * push * wa * 2; a.z -= dz / d * push * wa * 2;
        b.x += dx / d * push * wb * 2; b.z += dz / d * push * wb * 2;
      }
    }
  }

  // -------------------------------------------------------------- summary
  summary() {
    const tot = this.teams[0].stats.possT + this.teams[1].stats.possT || 1;
    return this.teams.map((T) => ({
      name: T.name, short: T.short, score: T.score,
      poss: Math.round(T.stats.possT / tot * 100),
      shots: T.stats.shots, onTarget: T.stats.onTarget, xg: T.stats.xg.toFixed(2),
      passes: T.stats.passes, passAcc: T.stats.passes ? Math.round(T.stats.passOk / T.stats.passes * 100) : 0,
      tackles: T.stats.tackles, fouls: T.stats.fouls, corners: T.stats.corners, offsides: T.stats.offsides, saves: T.stats.saves,
      yellow: T.stats.yellow, red: T.stats.red,
    }));
  }

  motm() {
    let best = null, bs = -1;
    for (const p of this.players) {
      const s = p.goals * 3 + p.assists * 2 + p.tackles * 0.4 + p.saves * 0.8 + p.passOk * 0.05 + p.shots * 0.2 + (p.T.score > this.opp(p.T).score ? 0.5 : 0);
      if (s > bs) { bs = s; best = p; }
    }
    return best;
  }
}
