// Drives the human-input code paths with a scripted player: node tools/human-test.mjs [matches] [size]
import { Match } from '../js/sim.js';
import { TEAMS, generateSquad, pickFive } from '../js/data.js';
const N = +(process.argv[2] || 4), size = process.argv[3] || '11';
const mkBtn = () => ({ held: false, down: false, up: false, dur: 0 });
const mkCmd = () => ({ mx: 0, mz: 0, mag: 0, sprint: false, sw: false, pass: mkBtn(), shoot: mkBtn(), through: mkBtn(), lob: mkBtn() });
function press(c, b, want, dt) { const s = c[b]; s.down = s.up = false; if (want) { if (!s.held) { s.held = true; s.down = true; s.dur = 0; } else s.dur += dt; } else if (s.held) { s.held = false; s.up = true; } }
let errors = 0, totals = { goals: [0, 0], shots: 0, pens: 0, shootouts: 0, stuck: 0, humanGoals: 0, setpieces: 0, firstTime: 0 };
for (let mi = 0; mi < N; mi++) {
  const a = TEAMS[mi % 16], b = TEAMS[(mi + 3) % 16];
  const sq = (t) => (size === '5' ? pickFive(generateSquad(t)) : generateSquad(t));
  const two = mi % 2 === 1;
  const m = new Match({ teams: [{ def: a, squad: sq(a), kit: a.home, formation: a.form }, { def: b, squad: sq(b), kit: b.away, formation: b.form }], size, halfSeconds: 120, difficulty: ['amator', 'pro', 'dunya', 'efsane'][mi % 4], humans: two ? [{ team: 0 }, { team: 1 }] : [{ team: 0 }], knockout: true, seed: 50 + mi });
  const cmds = m.humans.map(() => mkCmd());
  const want = m.humans.map(() => ({}));
  let tt = 0, still = 0;
  try {
    for (let i = 0; i < 60 * 60 * 14 && !(m.state === 'full' && (!m.shootout || m.shootout.done)); i++) {
      const dt = 1 / 60; tt += dt;
      m.humans.forEach((h, k) => {
        const c = cmds[k], p = h.p, B = m.ball, w = want[k];
        for (const btn of ['pass', 'shoot', 'through', 'lob']) w[btn] = w[btn] && w[btn] > 0 ? w[btn] - dt : 0;
        c.sw = false; c.mx = c.mz = c.mag = 0; c.sprint = false;
        if (!p) return;
        const T = m.teams[h.team], s = T.side;
        if (m.state === 'pen' && m.pen) {
          if (m.pen.kicker === p && m.pen.phase === 'aim' && !w.shoot && !w.done) { w.shoot = 0.55; w.done = true; c.mz = 0.6; c.mag = 0.6; }
          if (m.pen.gk === p && m.pen.phase === 'runup' && !w.gk) { w.gk = 1; c.mz = (Math.random() - 0.5) * 2; c.mag = 1; w.pass = 0.05; }
          if (m.pen.phase !== 'aim') w.done = false;
          if (m.pen.phase === 'aim') w.gk = 0;
        } else if (m.state === 'setwait' || m.state === 'prekick') {
          if ((m.spTaker === p || m.koTaker === p) && !w.pass && Math.random() < dt * 1.2) w.pass = 0.2;
        } else if (m.state === 'play') {
          const has = B.owner === p || B.held === p;
          const oppHas = (B.owner && B.owner.team !== p.team) || (B.held && B.held.team !== p.team);
          if (has) {
            const gx = s * m.P.H, dx = gx - p.x, dz = -p.z, d = Math.hypot(dx, dz);
            c.mx = dx / d; c.mz = dz / d; c.mag = 1; c.sprint = d > 30;
            if (d < 24 && !w.shoot) w.shoot = 0.45 + Math.random() * 0.3;
            else if (Math.random() < dt * 0.5 && !w.pass) w.pass = 0.1;
            else if (Math.random() < dt * 0.15 && !w.through) w.through = 0.3;
            else if (Math.random() < dt * 0.1 && !w.lob) w.lob = 0.4;
          } else {
            const dx = B.x - p.x, dz = B.z - p.z, d = Math.hypot(dx, dz) || 1;
            c.mx = dx / d; c.mz = dz / d; c.mag = 1; c.sprint = d > 6;
            if (oppHas) { if (d < 1.6 && Math.random() < dt * 2) w.shoot = 0.05; if (d < 3 && Math.random() < dt * 0.3) w.lob = 0.05; if (Math.random() < dt * 0.3) c.sw = true; }
            else if (d < 5 && B.y > 0.5 && !w.shoot && Math.random() < dt * 2) { w.shoot = 0.3; totals.firstTime++; }
          }
        }
        for (const btn of ['pass', 'shoot', 'through', 'lob']) press(c, btn, w[btn] > 0, dt);
      });
      m.step(1 / 60, cmds);
      const B = m.ball;
      if (m.state === 'play' && !B.owner && !B.held && Math.hypot(B.vx, B.vz) < 0.05) still += 1 / 60; else still = 0;
      if (still > 8) { totals.stuck++; still = -999; console.log('stuck', m.minute(), B.x.toFixed(1), B.z.toFixed(1)); }
      for (const e of m.events) {
        if (e.type === 'goal' && !e.practice && e.scorerP && e.scorerP.human >= 0) totals.humanGoals++;
        if (e.type === 'setpiece') totals.setpieces++;
        if (e.type === 'penaltySetup' && e.inMatch) totals.pens++;
        if (e.type === 'shootoutStart') totals.shootouts++;
      }
      m.events.length = 0;
      if (m.state === 'replay') m.afterGoal();
    }
    const s = m.summary();
    totals.goals[0] += s[0].score; totals.goals[1] += s[1].score; totals.shots += s[0].shots + s[1].shots;
    console.log(`#${mi} ${two ? '2P' : '1P'} ${m.cfg.difficulty} ${s[0].short} ${s[0].score}-${s[1].score} ${s[1].short} state=${m.state} so=${m.shootout ? m.shootout.kicks.map((k) => k.filter(Boolean).length + '/' + k.length).join(' ') : '-'} shots ${s[0].shots}-${s[1].shots} poss ${s[0].poss}%`);
  } catch (e) { errors++; console.log('ERROR', e.stack); }
}
console.log(JSON.stringify(totals), 'errors', errors);
