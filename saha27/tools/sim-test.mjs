// Headless soak test for the match engine: node tools/sim-test.mjs [matches] [size] [difficulty]
import { Match } from '../js/sim.js';
import { TEAMS, generateSquad, pickFive } from '../js/data.js';

const N = +(process.argv[2] || 20), size = process.argv[3] || '11', diff = process.argv[4] || 'pro';
const agg = { goals: 0, shots: 0, onT: 0, passes: 0, passOk: 0, corners: 0, throws: 0, gks: 0, fks: 0, pens: 0, fouls: 0, offs: 0, yellow: 0, red: 0, saves: 0, stuck: 0, posts: 0, tackles: 0, xg: 0 };
const scores = [];
const t0 = Date.now();
for (let m = 0; m < N; m++) {
  const a = TEAMS[m % TEAMS.length], b = TEAMS[(m * 7 + 3) % TEAMS.length === m % TEAMS.length ? (m + 1) % TEAMS.length : (m * 7 + 3) % TEAMS.length];
  const sq = (t) => (size === '5' ? pickFive(generateSquad(t)) : generateSquad(t));
  const match = new Match({ teams: [{ def: a, squad: sq(a), kit: a.home, formation: a.form }, { def: b, squad: sq(b), kit: b.away, formation: b.form }], size, halfSeconds: 150, difficulty: diff, seed: 1000 + m, knockout: false });
  let still = 0, lastState = '', stateFor = 0, maxStateFor = {};
  for (let i = 0; i < 60 * 60 * 12 && match.state !== 'full'; i++) {
    match.step(1 / 60, []);
    const B = match.ball;
    if (match.state === 'play' && !B.owner && !B.held && Math.hypot(B.vx, B.vz) < 0.05) still += 1 / 60; else still = 0;
    if (still > 6) { agg.stuck++; still = -1e9; console.log('STUCK ball at', B.x.toFixed(1), B.z.toFixed(1), 'match', m, match.minute()); }
    if (match.state === lastState) stateFor += 1 / 60; else { stateFor = 0; lastState = match.state; }
    maxStateFor[match.state] = Math.max(maxStateFor[match.state] || 0, stateFor);
    for (const e of match.events) {
      if (e.type === 'dead') { const t = e.sp.type; if (t === 'corner') agg.corners++; else if (t === 'throw') agg.throws++; else if (t === 'goalkick') agg.gks++; else if (t === 'fk') agg.fks++; else if (t === 'pen') agg.pens++; }
      if (e.type === 'foul') { agg.fouls++; if (e.card === 'yellow') agg.yellow++; if (e.card === 'red') agg.red++; }
      if (e.type === 'offside') agg.offs++;
      if (e.type === 'post') agg.posts++;
    }
    match.events.length = 0;
  }
  if (match.state !== 'full') console.log('DID NOT FINISH', m, match.state, match.minute());
  const s = match.summary();
  scores.push(`${s[0].short} ${s[0].score}-${s[1].score} ${s[1].short}`);
  for (const t of s) { agg.goals += t.score; agg.shots += t.shots; agg.onT += t.onTarget; agg.passes += t.passes; agg.saves += t.saves; agg.tackles += t.tackles; agg.xg += +t.xg; }
  for (const T of match.teams) agg.passOk += T.stats.passOk;
  if (m === 0) console.log('longest state durations', Object.fromEntries(Object.entries(maxStateFor).map(([k, v]) => [k, v.toFixed(1)])));
}
const per = (k) => (agg[k] / N).toFixed(2);
console.log(scores.join(' | '));
console.log(`per match: goals ${per('goals')} shots ${per('shots')} onT ${per('onT')} xg ${per('xg')} saves ${per('saves')} passes ${per('passes')} acc ${(agg.passOk / agg.passes * 100).toFixed(0)}% tackles ${per('tackles')}`);
console.log(`corners ${per('corners')} throws ${per('throws')} goalkicks ${per('gks')} fks ${per('fks')} pens ${per('pens')} fouls ${per('fouls')} offsides ${per('offs')} yellow ${per('yellow')} red ${per('red')} posts ${per('posts')} stuck ${agg.stuck}`);
console.log(`sim time ${((Date.now() - t0) / 1000).toFixed(1)}s for ${N} matches`);
