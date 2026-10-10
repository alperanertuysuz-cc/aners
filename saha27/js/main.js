// SAHA 27 — app shell: screens, setup, career, HUD, game loop.
import { Renderer } from './render.js';
import { Match, makePitch } from './sim.js';
import { TEAMS, FORMATION_LIST, DIFFICULTY, generateSquad, teamRatings, pickFive, colorDist, rng } from './data.js';
import { Sound } from './audio.js';
import { Input } from './input.js';

window.__saha27Ready = true;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('saha27.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('saha27.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem('saha27.' + k); } catch { /* ignore */ } },
};
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ------------------------------------------------------------------ settings
const DEFAULTS = { quality: 'auto', cam: 'broadcast', master: 0.8, crowd: 0.7, sfx: 0.9, autoSwitch: true, offside: true, names: true, radar: true, tod: 'night', minutes: 5, difficulty: 'pro' };
const S = { ...DEFAULTS, ...store.get('settings', {}) };
const saveSettings = () => store.set('settings', S);
const resolveQuality = () => (S.quality === 'auto' ? (isTouch || Math.min(window.screen.width, window.screen.height) < 700 ? 'low' : 'high') : S.quality);

// ------------------------------------------------------------------ teams
function teams() {
  const ov = store.get('teams', {});
  return TEAMS.map((t) => {
    const o = ov[t.id];
    if (!o) return t;
    return { ...t, name: o.name || t.name, short: (o.short || t.short).slice(0, 3).toLocaleUpperCase('tr-TR'), home: { ...t.home, ...(o.home || {}) }, form: o.form || t.form, gk: o.gk || t.gk, players: o.players };
  });
}
const teamById = (id) => teams().find((t) => t.id === id) || teams()[0];
function squadFor(t) {
  const sq = generateSquad(t);
  if (t.players) t.players.forEach((p, i) => { if (!sq[i] || !p) return; if (p.name) sq[i].name = p.name; if (p.num) sq[i].num = clamp(+p.num || sq[i].num, 1, 99); });
  return sq;
}
const ratingCache = new Map();
function ratings(t) { const k = t.id + (t.players ? 'c' : ''); if (!ratingCache.has(k)) ratingCache.set(k, teamRatings(squadFor(t))); return ratingCache.get(k); }
function pickKits(h, a) {
  const hk = h.home;
  let ak = a.home;
  if (colorDist(hk.shirt, ak.shirt) < 150) ak = a.away;
  if (colorDist(hk.shirt, ak.shirt) < 130) {
    const lightHome = colorDist(hk.shirt, '#FFFFFF') < colorDist(hk.shirt, '#000000');
    ak = lightHome ? { shirt: '#16181D', shorts: '#16181D', socks: '#16181D', trim: '#E4FF4A', pattern: 'plain' } : { shirt: '#F4F4F2', shorts: '#16181D', socks: '#F4F4F2', trim: '#16181D', pattern: 'plain' };
  }
  return [hk, ak];
}
function shirtSVG(k, size = 70) {
  const id = 's' + Math.random().toString(36).slice(2, 8);
  const path = 'M21 6 L12 9 L3 20 L10 28 L15 24 L15 58 L49 58 L49 24 L54 28 L61 20 L52 9 L43 6 C41 11 37 13 32 13 C27 13 23 11 21 6 Z';
  let pat = '';
  const alt = k.alt || k.trim;
  if (k.pattern === 'stripes') pat = [18, 28, 38, 48].map((x) => `<rect x="${x}" y="0" width="5" height="64" fill="${alt}"/>`).join('');
  if (k.pattern === 'hoops') pat = [20, 32, 44].map((y) => `<rect x="0" y="${y}" width="64" height="6" fill="${alt}"/>`).join('');
  if (k.pattern === 'half') pat = `<rect x="32" y="0" width="32" height="64" fill="${alt}"/>`;
  if (k.pattern === 'sash') pat = `<path d="M8 6 L20 6 L58 58 L46 58 Z" fill="${alt}"/>`;
  return `<svg class="shirt" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs><path d="${path}" fill="${k.shirt}"/><g clip-path="url(#${id})">${pat}<path d="M21 6 C23 11 27 13 32 13 C37 13 41 11 43 6" stroke="${k.trim}" stroke-width="3" fill="none"/><rect x="0" y="14" width="64" height="3" fill="${k.trim}" opacity="0"/></g><path d="${path}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/></svg>`;
}

// ------------------------------------------------------------------ boot
const canvas = $('#gl');
let R;
try { R = new Renderer(canvas, { quality: resolveQuality(), camMode: S.cam }); }
catch (e) {
  document.body.insertAdjacentHTML('beforeend', '<div class="rotate-hint"><div>WebGL başlatılamadı<br><small>Tarayıcının donanım hızlandırmasını açıp sayfayı yenile.</small></div></div>');
  throw e;
}
const snd = new Sound();
Object.assign(snd.vol, { master: S.master, crowd: S.crowd, sfx: S.sfx });
const input = new Input();
R.buildWorld(makePitch('11'), { tod: S.tod, crowd: ['#11284A', '#C8202F', '#E9C46A'] });
addEventListener('resize', () => R.resize());
input.mountTouch($('#touch'));

let G = null; // active game
let scr = 'title', prevScreen = 'menu';
const screens = $$('.screen');
function show(name) {
  if (name !== scr && !['pause', 'stats', 'loading'].includes(scr)) prevScreen = scr;
  scr = name;
  for (const s of screens) s.classList.toggle('on', s.dataset.screen === name);
  const el = screens.find((s) => s.dataset.screen === name);
  if (el) requestAnimationFrame(() => { const f = el.querySelector('.cta, .m-item, button:not(.back)'); if (f && !isTouch) f.focus({ preventScroll: true }); });
  input.capture = !name;
}
function hideScreens() { scr = null; for (const s of screens) s.classList.remove('on'); input.capture = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
// run a callback later only if the same match is still on screen
function later(ms, fn) { const mm = G && G.match; setTimeout(() => { if (G && G.match === mm) fn(); }, ms); }

// ------------------------------------------------------------------ title + menu
function unlockAudio() { snd.unlock(); snd.setAmbient(0.22); }
$('#startBtn').addEventListener('click', () => { unlockAudio(); show('menu'); renderMenuSide(); });
addEventListener('keydown', (e) => {
  if (scr === 'title' && !e.repeat) { unlockAudio(); show('menu'); renderMenuSide(); e.preventDefault(); return; }
  if (scr && scr !== 'title' && (!G || G.paused || scr === 'stats')) {
    if (e.code === 'Escape' || e.code === 'Backspace') { const b = $(`.screen.on [data-back]`); if (b && document.activeElement?.tagName !== 'INPUT') { b.click(); e.preventDefault(); } }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { moveFocus(e.code === 'ArrowDown' ? 1 : -1); e.preventDefault(); }
  }
});
$('.screen.title').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; unlockAudio(); show('menu'); renderMenuSide(); });
function moveFocus(dir) {
  const el = $('.screen.on'); if (!el) return;
  const list = $$('button:not([disabled]), input, select', el).filter((b) => b.offsetParent);
  const i = list.indexOf(document.activeElement);
  const n = list[(i + dir + list.length) % list.length];
  n && n.focus();
}

$$('[data-go]').forEach((b) => b.addEventListener('click', () => { snd.ui(); go(b.dataset.go); }));
$$('[data-back]').forEach((b) => b.addEventListener('click', () => { snd.ui(); back(); }));
function back() {
  if (scr === 'settings' || scr === 'controls') { if (G && G.paused) return show('pause'); }
  if (scr === 'setup' && setupState.kind === 'career') return go('career');
  show('menu'); renderMenuSide();
}
function go(where) {
  if (where === 'quick') openSetup('quick');
  else if (where === 'street') openSetup('street');
  else if (where === 'pens') openSetup('pens');
  else if (where === 'practice') startPractice();
  else if (where === 'career') { renderCareer(); show('career'); }
  else if (where === 'editor') { renderEditor(); show('editor'); }
  else if (where === 'settings') { renderSettings(); show('settings'); }
  else if (where === 'controls') show('controls');
}

function renderMenuSide() {
  const c = store.get('career', null);
  const el = $('#menuSide');
  if (c && c.rounds) {
    const t = teamById(c.team);
    const tbl = leagueTable(c);
    const pos = tbl.findIndex((r) => r.id === c.team) + 1;
    const done = c.week >= c.rounds.length;
    el.innerHTML = `<div class="side-card"><h4>Kariyer · Sezon ${2025 + c.season}/${String(26 + c.season).slice(-2)}</h4><div class="big">${esc(t.name)}</div><p>${done ? 'Sezon bitti.' : `${c.week + 1}. hafta · ${pos}. sıradasın · ${tbl[pos - 1].pts} puan`}</p><div class="btnrow" style="margin-top:12px"><button class="ghost" id="sideCareer">Kariyere dön</button></div></div>`;
    $('#sideCareer').onclick = () => go('career');
  } else {
    el.innerHTML = `<div class="side-card"><h4>FC 27 Lite'ta olmayanlar</h4><p>Kariyer ligi, sokak 5v5, penaltı modu, aynı ekranda 2 oyuncu, takım editörü. Hesap gerekmez, internet bağlantısı olmadan da açılır.</p></div>`;
  }
}

// ------------------------------------------------------------------ setup screen
const setupState = { kind: 'quick', home: 0, away: 1, homeForm: null, awayForm: null, p1: 'home', p2: 'off', difficulty: S.difficulty, minutes: S.minutes, tod: S.tod, pens: false };
function openSetup(kind, preset) {
  const T = teams();
  Object.assign(setupState, { kind, difficulty: S.difficulty, minutes: kind === 'street' ? Math.min(S.minutes, 5) : S.minutes, tod: S.tod, pens: kind === 'pens' });
  if (preset) Object.assign(setupState, preset);
  if (setupState.home === setupState.away) setupState.away = (setupState.home + 1) % T.length;
  $('#setupTitle').textContent = { quick: 'Hızlı Maç', street: 'Sokak 5v5', pens: 'Penaltı Atışları' }[kind] || 'Maç';
  $('#kickoffBtn').textContent = kind === 'pens' ? 'Atışlara Başla' : 'Maça Başla';
  renderSetup();
  show('setup');
}
function teamCard(side) {
  const T = teams();
  const st = setupState;
  const idx = side === 0 ? st.home : st.away;
  const t = T[idx];
  const r = ratings(t);
  const kits = pickKits(T[st.home], T[st.away]);
  const k = kits[side];
  const form = (side === 0 ? st.homeForm : st.awayForm) || t.form;
  const ctrl = (() => {
    const p1 = st.p1 === (side === 0 ? 'home' : 'away');
    const p2 = st.p2 !== 'off' && ((st.p2 === 'opp' && st.p1 !== (side === 0 ? 'home' : 'away') && st.p1 !== 'watch') || (st.p2 === 'mate' && p1));
    const parts = [];
    if (p1) parts.push('<span class="who"><i style="background:var(--p1)"></i>1P</span>');
    if (p2) parts.push('<span class="who"><i style="background:var(--p2)"></i>2P</span>');
    return parts.length ? parts.join(' ') : `<span class="who"><i style="background:var(--dim)"></i>CPU · ${DIFFICULTY[st.difficulty].label}</span>`;
  })();
  const street = st.kind === 'street', pens = st.kind === 'pens';
  return `<div class="tc-top"><button class="tc-arrow" data-side="${side}" data-dir="-1" aria-label="Önceki takım">‹</button><div class="tc-name"><b>${esc(t.name)}</b><span>${esc(t.city)} · ${side === 0 ? 'Ev sahibi' : 'Deplasman'}</span></div><button class="tc-arrow" data-side="${side}" data-dir="1" aria-label="Sonraki takım">›</button></div>
    <div class="tc-mid">${shirtSVG(k)}<div class="tc-ovr">${r.ovr}<small>GENEL</small></div><div class="bars">${[['HÜC', r.att], ['ORT', r.mid], ['SAV', r.def]].map(([n, v]) => `<div class="bar"><span>${n}</span><i><s style="width:${clamp((v - 50) * 2.2, 6, 100)}%"></s></i><b>${v}</b></div>`).join('')}</div></div>
    ${street || pens ? '' : `<div class="chips" role="group" aria-label="Diziliş">${FORMATION_LIST.map((f) => `<button class="chip" data-form="${f}" data-side="${side}" aria-pressed="${f === form}">${f}</button>`).join('')}</div>`}
    <div class="tc-ctrl"><span>Kontrol</span>${ctrl}</div>`;
}
function seg(name, label, opts, val) {
  return `<div class="opt"><span>${label}</span><div class="seg" role="group" aria-label="${label}">${opts.map(([v, l]) => `<button data-opt="${name}" data-v="${v}" aria-pressed="${String(v) === String(val)}">${l}</button>`).join('')}</div></div>`;
}
function renderSetup() {
  const st = setupState, T = teams();
  for (const side of [0, 1]) {
    const el = $('#tc' + side);
    el.innerHTML = teamCard(side);
    const k = pickKits(T[st.home], T[st.away])[side];
    el.style.setProperty('--kit', k.shirt);
  }
  const kind = st.kind;
  let html = '';
  html += seg('p1', 'Sen', [['home', 'Ev sahibi'], ['away', 'Deplasman'], ['watch', 'İzle']], st.p1);
  if (st.p1 !== 'watch') html += seg('p2', '2. oyuncu', kind === 'pens' ? [['off', 'Yok'], ['opp', 'Rakip']] : [['off', 'Yok'], ['opp', 'Rakip'], ['mate', 'Takım arkadaşı']], st.p2);
  html += seg('difficulty', 'Zorluk', Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label]), st.difficulty);
  if (kind !== 'pens') html += seg('minutes', 'Maç süresi', [[3, '3 dk'], [5, '5 dk'], [8, '8 dk'], [12, '12 dk']], st.minutes);
  if (kind === 'quick') html += seg('tod', 'Saat', [['night', 'Gece'], ['day', 'Gündüz']], st.tod);
  if (kind !== 'pens') html += seg('pens', 'Beraberlikte', [['false', 'Maç biter'], ['true', 'Penaltılar']], String(st.pens));
  $('#setupOpts').innerHTML = html;
}
$('.screen.setup').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const st = setupState, N = teams().length;
  if (b.classList.contains('tc-arrow')) {
    const side = +b.dataset.side, dir = +b.dataset.dir;
    const key = side === 0 ? 'home' : 'away';
    let v = (st[key] + dir + N) % N;
    if (v === st[side === 0 ? 'away' : 'home']) v = (v + dir + N) % N;
    st[key] = v; st[side === 0 ? 'homeForm' : 'awayForm'] = null;
    snd.ui(); renderSetup();
    const again = $(`.tc-arrow[data-side="${side}"][data-dir="${dir}"]`); again && !isTouch && again.focus();
  } else if (b.dataset.form) {
    st[+b.dataset.side === 0 ? 'homeForm' : 'awayForm'] = b.dataset.form; snd.ui(); renderSetup();
  } else if (b.dataset.opt) {
    const k = b.dataset.opt; let v = b.dataset.v;
    if (k === 'minutes') v = +v; if (k === 'pens') v = v === 'true';
    st[k] = v;
    if (k === 'difficulty') { S.difficulty = v; saveSettings(); }
    if (k === 'minutes') { S.minutes = v; saveSettings(); }
    if (k === 'tod') { S.tod = v; saveSettings(); }
    if (k === 'p1' && v === 'watch') st.p2 = 'off';
    snd.ui(); renderSetup();
    const again = $(`[data-opt="${k}"][data-v="${b.dataset.v}"]`); again && !isTouch && again.focus();
  }
});
$('#kickoffBtn').addEventListener('click', () => {
  const st = setupState, T = teams();
  const humans = [];
  if (st.p1 !== 'watch') {
    const t1 = st.p1 === 'home' ? 0 : 1;
    humans.push({ team: t1 });
    if (st.p2 === 'opp') humans.push({ team: 1 - t1 });
    if (st.p2 === 'mate') humans.push({ team: t1 });
  }
  startMatch({
    kind: st.kind, home: T[st.home], away: T[st.away], homeForm: st.homeForm, awayForm: st.awayForm,
    size: st.kind === 'street' ? '5' : '11', difficulty: st.difficulty, minutes: st.minutes, humans,
    knockout: st.pens, mode: st.kind === 'pens' ? 'shootout' : 'match', tod: st.tod,
  });
});

function startPractice() {
  const c = store.get('career', null);
  const T = teams();
  const home = c ? teamById(c.team) : T[setupState.home];
  const away = T.find((t) => t.id !== home.id);
  startMatch({ kind: 'practice', home, away, size: '11', difficulty: 'pro', minutes: 5, humans: [{ team: 0 }], mode: 'practice', tod: S.tod });
}

// ------------------------------------------------------------------ match lifecycle
const STEP = 1 / 60;
function startMatch(o) {
  show('loading');
  unlockAudio();
  setTimeout(() => {
    const P = makePitch(o.size);
    const kits = pickKits(o.home, o.away);
    const sq = [squadFor(o.home), squadFor(o.away)].map((s) => (o.size === '5' ? pickFive(s) : s));
    const cfg = {
      teams: [
        { def: o.home, squad: sq[0], kit: kits[0], formation: o.homeForm || o.home.form },
        { def: o.away, squad: sq[1], kit: kits[1], formation: o.awayForm || o.away.form },
      ],
      size: o.size, halfSeconds: o.minutes * 30, difficulty: o.difficulty, humans: o.humans,
      offside: S.offside, replays: o.mode === 'match', interactive: true, mode: o.mode || 'match', autoSwitch: S.autoSwitch, knockout: !!o.knockout,
      seed: (Math.random() * 1e9) | 0,
    };
    const match = new Match(cfg);
    R.buildWorld(P, { tod: o.tod || S.tod, crowd: [kits[0].shirt, kits[1].shirt, kits[0].trim], accent: kits[0].shirt });
    R.attach(match);
    R.setCamMode(S.cam);
    R.snapCamera();
    input.reset();
    input.setLayout(o.humans.length > 1 ? 'duo' : 'solo');
    G = { match, o, kits, paused: false, running: true, acc: 0, replay: null, excite: 0, penCam: 0, lastPen: null, ended: false, banners: 0 };
    setupHUD();
    hideScreens();
    $('#hud').hidden = false;
    $('#touch').hidden = !isTouch || o.humans.length === 0;
    snd.setAmbient(o.size === '5' ? 0.35 : 0.6);
    checkRotate();
    if (o.mode === 'practice') say('Antrenman: şut çek, pas dene, kaleciyi geç. Çıkmak için Esc.', 5000);
    if (o.mode === 'shootout') say('Penaltı atışları başlıyor.', 2500);
  }, 30);
}

function endGame(toScreen = 'menu') {
  G = null;
  R.detachPlayers();
  R.buildWorld(makePitch('11'), { tod: S.tod, crowd: ['#11284A', '#C8202F', '#E9C46A'] });
  $('#hud').hidden = true;
  $('#fade').classList.remove('on');
  snd.setAmbient(0.22);
  if (toScreen === 'career') { renderCareer(); show('career'); }
  else { show('menu'); renderMenuSide(); }
}

function pause(on) {
  if (!G || G.ended) return;
  if (scr === 'stats') return;
  G.paused = on;
  if (on) {
    const m = G.match;
    $('#pauseScore').textContent = m.cfg.mode === 'match' ? `${m.teams[0].short} ${m.teams[0].score} – ${m.teams[1].score} ${m.teams[1].short} · ${m.minute()}` : '';
    $('#camName').textContent = camLabel(S.cam);
    show('pause');
    snd.setAmbient(0.15);
  } else { hideScreens(); snd.setAmbient(G.o.size === '5' ? 0.35 : 0.6); input.reset(); }
}
$('#pauseBtn').addEventListener('click', () => pause(!G?.paused));
const camLabel = (c) => ({ broadcast: 'Yayın', tele: 'Yakın yayın', end: 'Dinamik' }[c]);
$('.screen.pause').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  snd.ui();
  const a = b.dataset.act;
  if (a === 'resume') pause(false);
  else if (a === 'cam') { const order = ['broadcast', 'tele', 'end']; S.cam = order[(order.indexOf(S.cam) + 1) % 3]; saveSettings(); R.setCamMode(S.cam); $('#camName').textContent = camLabel(S.cam); }
  else if (a === 'controls') show('controls');
  else if (a === 'settings') { renderSettings(); show('settings'); }
  else if (a === 'quit') endGame(G && G.o.kind === 'career' ? 'career' : 'menu');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G && !G.paused && !G.ended && scr !== 'stats') pause(true); snd.suspend(); } else snd.resume(); });

// ------------------------------------------------------------------ HUD
const hud = {
  bug: $('#bug'), sH: $('#sH'), sA: $('#sA'), clock: $('#clock'), ticker: $('#ticker'), banner: $('#banner'), bk: $('#bannerK'), bs: $('#bannerS'),
  radar: $('#radar'), labels: $('#labels'), pc: [$('#pc0'), $('#pc1')], penUI: $('#penUI'), penAim: $('#penAim'), penHelp: $('#penHelp'), penTally: $('#penTally'), replayTag: $('#replayTag'),
};
function setupHUD() {
  const m = G.match;
  const [h, a] = m.teams;
  hud.bug.querySelector('#bugH b').textContent = h.short; hud.bug.querySelector('#bugH i').style.background = G.kits[0].shirt;
  hud.bug.querySelector('#bugA b').textContent = a.short; hud.bug.querySelector('#bugA i').style.background = G.kits[1].shirt;
  hud.sH.textContent = h.score; hud.sA.textContent = a.score;
  hud.bug.hidden = m.cfg.mode === 'practice';
  hud.labels.innerHTML = m.humans.map((h, i) => `<div class="plabel ${i ? 'p2' : ''}" data-h="${i}"></div><div class="power" data-pw="${i}" hidden><s></s></div>`).join('');
  hud.pc.forEach((el, i) => { el.hidden = !m.humans[i] || isTouch; });
  hud.radar.hidden = !S.radar;
  const dpr = Math.min(2, devicePixelRatio || 1);
  hud.radar.width = 232 * dpr; hud.radar.height = 152 * dpr;
  hud.radarCtx = hud.radar.getContext('2d'); hud.radarCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hud.penUI.hidden = true; hud.replayTag.hidden = true;
  hud.ticker.classList.remove('on');
}
let tickTimer = 0;
function say(text, ms = 2600) {
  hud.ticker.textContent = text; hud.ticker.classList.add('on');
  clearTimeout(tickTimer); tickTimer = setTimeout(() => hud.ticker.classList.remove('on'), ms);
}
function banner(k, s = '', acc = false) {
  hud.bk.textContent = k; hud.bs.textContent = s; hud.bk.classList.toggle('acc', acc);
  hud.banner.classList.remove('on'); void hud.banner.offsetWidth; hud.banner.classList.add('on');
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const last = (n) => n.split(' ').slice(-1)[0];

function drawRadar() {
  const m = G.match, P = m.P, c = hud.radarCtx;
  const W = 232, H = 152, pad = 10;
  const sx = (W - pad * 2) / P.L, sz = (H - pad * 2) / P.W;
  const X = (x) => pad + (x + P.H) * sx, Z = (z) => pad + (z + P.HW) * sz;
  c.clearRect(0, 0, W, H);
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
  c.strokeRect(X(-P.H), Z(-P.HW), P.L * sx, P.W * sz);
  c.beginPath(); c.moveTo(X(0), Z(-P.HW)); c.lineTo(X(0), Z(P.HW)); c.stroke();
  c.beginPath(); c.arc(X(0), Z(0), P.cR * sx, 0, Math.PI * 2); c.stroke();
  for (const s of [-1, 1]) c.strokeRect(Math.min(X(s * P.H), X(s * (P.H - P.boxL))), Z(-P.boxW / 2), P.boxL * sx, P.boxW * sz);
  for (const p of m.players) {
    if (p.off) continue;
    const k = G.kits[p.team];
    c.fillStyle = p.isGK ? (p.T.def.gk || '#3c6') : k.shirt;
    c.beginPath(); c.arc(X(p.x), Z(p.z), p.human >= 0 ? 4.2 : 3.2, 0, Math.PI * 2); c.fill();
    c.lineWidth = p.human >= 0 ? 2 : 1;
    c.strokeStyle = p.human >= 0 ? (p.human === 0 ? '#5EF2E4' : '#FFB547') : 'rgba(0,0,0,.55)';
    c.stroke();
  }
  c.fillStyle = '#fff'; c.beginPath(); c.arc(X(m.ball.x), Z(m.ball.z), 2.6, 0, Math.PI * 2); c.fill();
}

let radarTick = 0;
function updateHUD(dt) {
  const m = G.match;
  hud.clock.textContent = m.cfg.mode === 'match' ? (m.state === 'pen' || m.shootout ? 'PEN' : m.minute()) : m.cfg.mode === 'shootout' ? 'PEN' : '';
  if (S.radar && !G.replay && m.state !== 'pen' && (radarTick++ & 1) === 0) { hud.radar.hidden = false; drawRadar(); } else if (G.replay || m.state === 'pen') hud.radar.hidden = true;
  // labels + power bars
  m.humans.forEach((h, i) => {
    const lab = hud.labels.querySelector(`[data-h="${i}"]`), pw = hud.labels.querySelector(`[data-pw="${i}"]`);
    const p = h.p;
    const showIt = p && !p.off && !G.replay && m.state !== 'pen' && S.names;
    if (!showIt) { lab.hidden = true; } else {
      const s = R.project(p.x, 2.35 + p.y, p.z);
      lab.hidden = !s.on;
      lab.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
      lab.style.left = '0'; lab.style.top = '0';
      const txt = `${p.num} ${last(p.name)}`;
      if (lab.textContent !== txt) lab.textContent = txt;
    }
    if (h.charge && p && !G.replay && m.state !== 'pen') {
      const s = R.project(p.x, 0, p.z);
      pw.hidden = false;
      pw.style.left = '0'; pw.style.top = '0';
      pw.style.transform = `translate(${s.x}px, ${s.y + 14}px) translate(-50%, 0)`;
      pw.firstElementChild.style.width = Math.round(h.charge.v * 100) + '%';
    } else pw.hidden = true;
    const pc = hud.pc[i];
    if (pc && !pc.hidden && p) {
      pc.querySelector('.pc-n').textContent = p.num;
      const nm = pc.querySelector('.pc-name'); if (nm.textContent !== p.name) nm.textContent = p.name;
      pc.querySelector('.pc-st s').style.width = Math.round(p.stamina * 100) + '%';
    }
  });
  // touch labels
  if (isTouch && m.humans[0]) {
    const B = m.ball, p0 = m.humans[0].p;
    const def = !!p0 && ((B.owner && B.owner.team !== p0.team) || (B.held && B.held.team !== p0.team));
    input.setTouchLabels(def);
  }
  // penalties
  const pen = m.state === 'pen' ? m.pen : null;
  if (pen) {
    hud.penUI.hidden = false;
    const hk = m.humans.find((h) => h.p === pen.kicker), hg = m.humans.find((h) => h.p === pen.gk);
    if (hk && pen.phase === 'aim') {
      const s = R.project(pen.s * m.P.H, pen.aimY, pen.aimZ);
      hud.penAim.hidden = false; hud.penAim.style.transform = `translate(${s.x}px, ${s.y}px)`; hud.penAim.style.left = '0'; hud.penAim.style.top = '0';
      const pwr = hk.charge ? Math.round(hk.charge.v * 100) : 0;
      hud.penHelp.textContent = pwr ? `Güç %${pwr} — ideal %50–80, fazlası üstten gider` : (isTouch ? 'Joystick ile nişan al · ŞUT basılı tut, bırak' : 'Yön tuşlarıyla nişan al · Şut tuşunu basılı tut, bırak');
    } else { hud.penAim.hidden = true; }
    if (hg && !hk) hud.penHelp.textContent = pen.gkCommit ? 'Atladın!' : (isTouch ? 'Joystick ile yönü tut · vuruşta herhangi bir tuşa bas' : 'Yönü tut · vuruş anında aksiyon tuşuna bas');
    hud.penHelp.hidden = !hk && !hg;
    if (m.shootout) {
      const so = m.shootout;
      hud.penTally.innerHTML = [0, 1].map((t) => `<div><span>${esc(m.teams[t].short)}</span>${Array.from({ length: Math.max(5, so.kicks[t].length) }, (_, i) => `<i class="${so.kicks[t][i] === undefined ? '' : so.kicks[t][i] ? 'g' : 'm'}"></i>`).join('')}</div>`).join('');
    } else hud.penTally.innerHTML = '';
  } else hud.penUI.hidden = true;
}

// ------------------------------------------------------------------ events
function onEvents(evts) {
  const m = G.match;
  for (const e of evts) {
    switch (e.type) {
      case 'kick': snd.kick(e.power, clamp(m.ball.x / m.P.H, -1, 1) * 0.5); break;
      case 'header': snd.thud(8); break;
      case 'bounce': snd.thud(e.v); break;
      case 'wall': snd.thud(e.v * 0.8); break;
      case 'post': snd.post(); snd.ooh(0.9); R.shake = 0.25; say(pick(['Direkten döndü!', 'Top direğe çarptı!', 'Direk! Kıl payı.'])); break;
      case 'net': R.netHit(e); if (!e.outer) snd.net(); break;
      case 'shot': if (e.xg > 0.15) G.excite = 1; break;
      case 'save':
        if (e.shot) { snd.ooh(0.8); say(pick([`${last(e.p.name)} harika kurtardı!`, `Kaleci ${last(e.p.name)} izin vermiyor.`, `${last(e.p.name)} uzandı, top kontrolünde.`])); }
        break;
      case 'miss': if (e.close) { snd.ooh(1); say(pick(['Az farkla dışarı!', 'Auta gitti, çok yakındı.', 'Kale ağzından döndü!'])); } break;
      case 'goal': onGoal(e); break;
      case 'dead': {
        const sp = e.sp, tn = m.teams[sp.team].name;
        if (e.whistle) snd.whistle('short');
        if (sp.type === 'corner') say(`Korner — ${tn}`);
        else if (sp.type === 'throw') { if (Math.random() < 0.4) say(`Taç atışı — ${tn}`, 1600); }
        else if (sp.type === 'goalkick') { if (Math.random() < 0.4) say(`Kale vuruşu — ${tn}`, 1600); }
        else if (sp.type === 'pen') { banner('PENALTI', tn); }
        break;
      }
      case 'foul': {
        const msg = e.card === 'red' ? `${e.p.name} ikinci sarıdan kırmızı kart gördü!` : e.card === 'yellow' ? `${e.p.name} sarı kart gördü.` : pick([`Faul. ${last(e.p.name)} rakibini düşürdü.`, 'Hakem faul kararı verdi.', `${last(e.p.name)} geç kaldı, faul.`]);
        say(msg, 3000);
        if (e.card === 'red') banner('KIRMIZI', e.p.name);
        break;
      }
      case 'offside': snd.whistle('short'); say(`Ofsayt. ${last(e.p.name)} erken çıktı.`); break;
      case 'tackle': if (e.victim && Math.random() < 0.25) say(pick([`${last(e.p.name)} topu kaptı.`, `Temiz müdahale, ${last(e.p.name)}.`]), 1800); break;
      case 'whistle': snd.whistle(e.kind); break;
      case 'kickoff': if (m.half === 1 && m.clock < 1 && m.goals.length === 0) say('Hakem düdüğü çaldı, maç başladı!'); break;
      case 'halftime': later(1400, () => showStats('half')); break;
      case 'fulltime': later(1600, () => showStats('full')); break;
      case 'replay': startReplay(); break;
      case 'fade': $('#fade').classList.add('on'); break;
      case 'fadein': R.snapCamera(); setTimeout(() => $('#fade').classList.remove('on'), 60); break;
      case 'penaltySetup': R.snapCamera(); setTimeout(() => $('#fade').classList.remove('on'), 80); G.lastPen = m.pen; if (e.inMatch) say(`${e.kicker.name} topun başında.`, 2400); break;
      case 'penaltyKick': G.penCam = 1.4; break;
      case 'penResult': {
        if (m.shootout) {
          if (e.result === 'goal') { banner('GOL', e.kicker.name, true); snd.roar(0.7); }
          else { banner(e.result === 'save' ? 'KURTARDI' : 'KAÇTI', e.kicker.name); snd.ooh(1); }
        }
        break;
      }
      case 'shootoutEnd': later(1800, () => showStats('full')); break;
      case 'secondHalf': say('İkinci yarı başlıyor.'); break;
      case 'kickoffReady': if (m.humans.some((h) => h.team === e.team)) later(700, () => say(isTouch ? 'Başlama vuruşu: PAS butonuna dokun.' : 'Başlama vuruşu: pas tuşuna bas (J / Boşluk / A).', 3200)); break;
    }
  }
}

function onGoal(e) {
  const m = G.match;
  if (e.practice) { snd.net(); snd.roar(0.4); banner('GOL', '', true); return; }
  hud.sH.textContent = m.teams[0].score; hud.sA.textContent = m.teams[1].score;
  hud.bug.classList.remove('pop'); void hud.bug.offsetWidth; hud.bug.classList.add('pop');
  const kit = G.kits[e.team];
  snd.roar(1);
  R.goalFx(kit.shirt);
  const who = e.og ? `${e.scorer} (k.k.)` : e.scorer;
  banner('GOL', `${who} · ${e.minute}'`, true);
  setTimeout(() => say(e.og ? pick(['Kendi kalesine! Talihsiz an.', 'Kendi kalesine attı!']) : e.assist ? `${last(e.scorer)} bitirdi, asist ${last(e.assist)}.` : pick([`${last(e.scorer)} ağları sarstı!`, `Muhteşem bitiriş, ${last(e.scorer)}!`, `${last(e.scorer)} affetmedi!`]), 3200), 600);
  if (navigator.vibrate && isTouch) navigator.vibrate([60, 40, 120]);
}

// ------------------------------------------------------------------ replay
function startReplay() {
  const m = G.match;
  const frames = m.replayFrames(10.5);
  const cut = Math.min(frames.length - 1, Math.round(2.2 * 30));
  const fr = frames.slice(0, frames.length - cut);
  if (fr.length < 30) { m.afterGoal(); return; }
  const start = Math.max(0, fr.length - 6.2 * 30);
  const last = m.goals[m.goals.length - 1];
  G.replay = { frames: fr.slice(start), t: 0, cur: new Float32Array(fr[0].length), ang: Math.random() * Math.PI * 2, style: Math.random() < 0.45 ? 1 : 0, side: m.teams[last.team].side };
  hud.replayTag.hidden = false;
  $('#fade').classList.add('on');
  setTimeout(() => { R.snapCamera(); $('#fade').classList.remove('on'); }, 220);
}
function stepReplay(dt) {
  const r = G.replay;
  r.t += dt * 0.6;
  const idx = r.t * 30;
  const i = Math.floor(idx), f = idx - i;
  const A = r.frames[Math.min(i, r.frames.length - 1)], B = r.frames[Math.min(i + 1, r.frames.length - 1)];
  const c = r.cur;
  for (let k = 0; k < c.length; k++) c[k] = A[k] + (B[k] - A[k]) * f;
  const n = (c.length - 4) / 9;
  for (let p = 0; p < n; p++) {
    const o = 4 + p * 9;
    let d = B[o + 3] - A[o + 3]; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    c[o + 3] = A[o + 3] + d * f; c[o + 5] = A[o + 5]; c[o + 8] = A[o + 8];
    if (B[o + 6] < A[o + 6]) c[o + 6] = A[o + 6] + f / 30;
  }
  if (i >= r.frames.length - 1) endReplay();
}
function endReplay() {
  if (!G || !G.replay) return;
  G.replay = null; hud.replayTag.hidden = true;
  $('#fade').classList.add('on');
  later(230, () => G.match.afterGoal());
}

// ------------------------------------------------------------------ stats overlay
function showStats(kind) {
  if (!G) return;
  const m = G.match;
  G.ended = kind === 'full';
  const sum = m.summary();
  const so = m.shootout;
  $('#stEyebrow').textContent = kind === 'half' ? 'Devre arası' : so ? 'Maç sonucu · penaltılar' : m.cfg.mode === 'shootout' ? 'Penaltı atışları' : 'Maç sonu';
  const pensTxt = so && so.done ? `<div style="grid-column:1/-1;text-align:center;color:var(--mute);font-size:13px">Penaltılar ${so.kicks[0].filter(Boolean).length} – ${so.kicks[1].filter(Boolean).length}</div>` : '';
  $('#stScore').innerHTML = `<div class="t">${esc(sum[0].name)}</div><div class="n">${sum[0].score}–${sum[1].score}</div><div class="t r">${esc(sum[1].name)}</div>${pensTxt}`;
  const gl = (t) => m.goals.filter((g) => g.team === t).map((g) => `${esc(last(g.scorer))}${g.og ? ' (k.k.)' : ''} ${g.minute}'`).join('<br>') || '&nbsp;';
  $('#stGoals').innerHTML = m.cfg.mode === 'match' ? `<div>${gl(0)}</div><div class="r">${gl(1)}</div>` : '';
  const rows = [['Topla oynama', 'poss', '%'], ['Şut', 'shots'], ['İsabetli şut', 'onTarget'], ['Beklenen gol (xG)', 'xg'], ['Pas', 'passes'], ['Pas isabeti', 'passAcc', '%'], ['Top kapma', 'tackles'], ['Faul', 'fouls'], ['Korner', 'corners'], ['Ofsayt', 'offsides'], ['Kurtarış', 'saves']];
  const c0 = G.kits[0].shirt, c1 = G.kits[1].shirt;
  $('#stTable').innerHTML = m.cfg.mode === 'match' ? rows.map(([label, k, u = '']) => {
    const a = +sum[0][k], b = +sum[1][k], tot = a + b || 1;
    return `<div class="st-row"><b>${sum[0][k]}${u}</b><i class="l"><s style="width:${(a / tot) * 100}%;background:${c0}"></s></i><span>${label}</span><i><s style="width:${(b / tot) * 100}%;background:${c1}"></s></i><b>${sum[1][k]}${u}</b></div>`;
  }).join('') : '';
  const motm = kind === 'full' && m.cfg.mode === 'match' ? m.motm() : null;
  $('#stMotm').innerHTML = motm ? `Maçın oyuncusu: <b>${esc(motm.name)}</b> · ${esc(motm.T.name)}${motm.goals ? ` · ${motm.goals} gol` : ''}${motm.assists ? ` · ${motm.assists} asist` : ''}${motm.saves ? ` · ${motm.saves} kurtarış` : ''}` : '';
  const btns = $('#stBtns');
  btns.innerHTML = '';
  const add = (label, cls, fn) => { const b = document.createElement('button'); b.className = cls; b.textContent = label; b.onclick = () => { snd.ui(); fn(); }; btns.appendChild(b); };
  if (kind === 'half') add('İkinci yarı', 'cta', () => { hideScreens(); G.match.startSecondHalf(); R.snapCamera(); input.reset(); });
  else {
    const draw = sum[0].score === sum[1].score;
    if (G.o.knockout && draw && !so && m.cfg.mode === 'match') add('Penaltılar', 'cta', () => { hideScreens(); G.ended = false; G.match.startShootout(); input.reset(); });
    else if (G.o.kind === 'career') add('Devam', 'cta', () => { careerRecord(m); endGame('career'); });
    else {
      add('Menü', 'ghost', () => endGame('menu'));
      add('Rövanş', 'cta', () => { const o = G.o; endGame('menu'); startMatch(o); });
    }
  }
  show('stats');
}

// ------------------------------------------------------------------ career
function roundRobin(ids, seed) {
  const r = rng(seed);
  const arr = ids.slice().sort(() => r() - 0.5);
  const n = arr.length, rounds = [];
  for (let k = 0; k < n - 1; k++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      pairs.push((k + i) % 2 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}
function newCareer(teamId, difficulty, minutes) {
  const c = { v: 1, team: teamId, season: 1, week: 0, difficulty, minutes, scorers: {}, rounds: [] };
  c.rounds = roundRobin(TEAMS.map((t) => t.id), (Date.now() & 0xffff)).map((r) => r.map(([h, a]) => ({ h, a, r: null })));
  return c;
}
function leagueTable(c) {
  const rows = new Map(TEAMS.map((t) => [t.id, { id: t.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
  for (const rd of c.rounds) for (const f of rd) {
    if (!f.r) continue;
    const H = rows.get(f.h), A = rows.get(f.a), [hg, ag] = f.r.s;
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w++; A.l++; H.pts += 3; H.form.push('G'); A.form.push('M'); }
    else if (hg < ag) { A.w++; H.l++; A.pts += 3; A.form.push('G'); H.form.push('M'); }
    else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('B'); A.form.push('B'); }
  }
  return [...rows.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.id.localeCompare(b.id));
}
function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L && k < 10); return k - 1; }
function simFixture(c, f) {
  const H = teamById(f.h), A = teamById(f.a);
  const rh = ratings(H), ra = ratings(A);
  const hg = poisson(1.32 * Math.exp((rh.att - ra.def) / 20 + 0.1)), ag = poisson(1.08 * Math.exp((ra.att - rh.def) / 20));
  const sc = [];
  const add = (t, n) => {
    const sq = squadFor(t);
    const w = sq.map((p) => (p.role === 'FWD' ? 4 : p.role === 'WNG' ? 3 : p.role === 'MID' ? 1.5 : p.role === 'DEF' ? 0.45 : 0) * (p.a.sho / 80));
    const tot = w.reduce((s, v) => s + v, 0);
    for (let i = 0; i < n; i++) { let r = Math.random() * tot, j = 0; while (r > w[j]) { r -= w[j]; j++; } sc.push({ t: t.id, n: sq[Math.min(j, sq.length - 1)].name }); }
  };
  add(H, hg); add(A, ag);
  f.r = { s: [hg, ag], sc };
  for (const g of sc) { const k = g.t + '|' + g.n; c.scorers[k] = (c.scorers[k] || 0) + 1; }
}
function careerRecord(m) {
  const c = store.get('career', null); if (!c) return;
  const f = c.rounds[c.week].find((x) => x.h === c.team || x.a === c.team);
  const homeId = m.cfg.teams[0].def.id, awayId = m.cfg.teams[1].def.id;
  if (!f || f.h !== homeId || f.a !== awayId) return;
  const sc = m.goals.filter((g) => !g.og).map((g) => ({ t: g.team === 0 ? homeId : awayId, n: g.scorer }));
  f.r = { s: [m.teams[0].score, m.teams[1].score], sc, played: true };
  for (const g of sc) { const k = g.t + '|' + g.n; c.scorers[k] = (c.scorers[k] || 0) + 1; }
  for (const x of c.rounds[c.week]) if (!x.r) simFixture(c, x);
  c.week++;
  store.set('career', c);
}
function careerSimMine() {
  const c = store.get('career', null); if (!c) return;
  for (const x of c.rounds[c.week]) if (!x.r) simFixture(c, x);
  c.week++;
  store.set('career', c);
  renderCareer();
}
function careerPlay() {
  const c = store.get('career', null); if (!c) return;
  const f = c.rounds[c.week].find((x) => x.h === c.team || x.a === c.team);
  const H = teamById(f.h), A = teamById(f.a);
  startMatch({ kind: 'career', home: H, away: A, size: '11', difficulty: c.difficulty, minutes: c.minutes, humans: [{ team: f.h === c.team ? 0 : 1 }], mode: 'match', tod: c.week % 3 === 1 ? 'day' : 'night' });
}
const careerPick = { team: null, difficulty: 'pro', minutes: 5 };
function renderCareer() {
  const c = store.get('career', null);
  const body = $('#careerBody'), meta = $('#cMeta');
  if (!c || !c.rounds) {
    meta.textContent = '';
    const T = teams();
    careerPick.team = careerPick.team || T[0].id;
    body.innerHTML = `<div class="panel" style="grid-column:1/-1"><h3>Takımını seç</h3>
      <div class="chips" style="gap:8px">${T.map((t) => `<button class="chip" data-cteam="${t.id}" aria-pressed="${careerPick.team === t.id}" style="display:flex;align-items:center;gap:8px"><i style="width:12px;height:12px;border-radius:3px;background:${t.home.shirt};box-shadow:inset 0 0 0 2px ${t.home.trim}"></i>${esc(t.name)} <span style="opacity:.6">${ratings(t).ovr}</span></button>`).join('')}</div>
      <div class="opts" style="margin-top:14px">${seg('cdiff', 'Zorluk', Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label]), careerPick.difficulty)}${seg('cmin', 'Maç süresi', [[3, '3 dk'], [5, '5 dk'], [8, '8 dk']], careerPick.minutes)}</div>
      <p style="color:var(--mute);font-size:14px;margin:14px 0 0">16 takım, 15 hafta, tek devre. Diğer maçlar kadro gücüne göre simüle edilir. İlerleme bu tarayıcıda saklanır.</p>
      <div class="s-foot"><button class="cta" id="cStart">Kariyere Başla</button></div></div>`;
    body.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cteam) { careerPick.team = b.dataset.cteam; renderCareer(); }
      else if (b.dataset.opt === 'cdiff') { careerPick.difficulty = b.dataset.v; renderCareer(); }
      else if (b.dataset.opt === 'cmin') { careerPick.minutes = +b.dataset.v; renderCareer(); }
      else if (b.id === 'cStart') { store.set('career', newCareer(careerPick.team, careerPick.difficulty, careerPick.minutes)); renderCareer(); }
    };
    return;
  }
  const me = teamById(c.team);
  const tbl = leagueTable(c);
  const pos = tbl.findIndex((r) => r.id === c.team) + 1;
  const season = `${2025 + c.season}/${String(26 + c.season).slice(-2)}`;
  meta.innerHTML = `${esc(me.name)} · Sezon ${season}<br>${DIFFICULTY[c.difficulty].label} · ${c.minutes} dk`;
  const done = c.week >= c.rounds.length;
  let left = '';
  if (!done) {
    const f = c.rounds[c.week].find((x) => x.h === c.team || x.a === c.team);
    const H = teamById(f.h), A = teamById(f.a);
    left += `<div class="panel"><h3>${c.week + 1}. hafta · ${f.h === c.team ? 'İç saha' : 'Deplasman'}</h3>
      <div class="next-vs"><div class="t">${esc(H.name)}</div><div class="v">vs</div><div class="t r">${esc(A.name)}</div></div>
      <div class="btnrow"><button class="cta" id="cPlay">Oyna</button><button class="ghost" id="cSim">Simüle et</button></div></div>`;
  } else {
    const champ = teamById(tbl[0].id);
    left += `<div class="panel"><h3>Sezon bitti</h3><div class="next-vs" style="grid-template-columns:1fr"><div class="t">Şampiyon: ${esc(champ.name)}</div></div>
      <p style="color:var(--mute);margin:0 0 14px">${esc(me.name)} sezonu ${pos}. sırada bitirdi.${pos === 1 ? ' Kupa senin!' : ''}</p>
      <div class="btnrow"><button class="cta" id="cNext">Yeni sezon</button></div></div>`;
  }
  const mine = tbl.find((r) => r.id === c.team);
  const colorOf = { G: 'var(--acc)', B: '#C9CED6', M: 'var(--danger)' };
  left += `<div class="panel"><h3>Form</h3><div class="form-dots">${mine.form.slice(-6).map((x) => `<i style="background:${colorOf[x]}">${x}</i>`).join('') || '<span style="color:var(--mute);font-size:13px">Henüz maç yok</span>'}</div></div>`;
  const lastWeek = c.week > 0 ? c.rounds[c.week - 1] : null;
  if (lastWeek) left += `<div class="panel"><h3>${c.week}. hafta sonuçları</h3><div class="res">${lastWeek.map((f) => `<div style="${f.h === c.team || f.a === c.team ? 'color:var(--ink);font-weight:700' : 'color:var(--mute)'}"><span>${esc(teamById(f.h).short)}</span><b>${f.r.s[0]} – ${f.r.s[1]}</b><span>${esc(teamById(f.a).short)}</span></div>`).join('')}</div></div>`;
  const scorers = Object.entries(c.scorers).sort((a, b) => b[1] - a[1]).slice(0, 8);
  left += `<div class="panel"><h3>Gol krallığı</h3>${scorers.length ? `<table class="tbl"><tbody>${scorers.map(([k, v], i) => { const [tid, n] = k.split('|'); return `<tr class="${tid === c.team ? 'me' : ''}"><td class="pos n">${i + 1}</td><td class="n">${esc(n)} <span style="color:var(--dim)">${esc(teamById(tid).short)}</span></td><td>${v}</td></tr>`; }).join('')}</tbody></table>` : '<span style="color:var(--mute);font-size:13px">Henüz gol yok</span>'}</div>`;
  left += `<button class="ghost danger" id="cReset" style="justify-self:start">Kariyeri sıfırla</button>`;
  const right = `<div class="panel"><h3>Puan durumu</h3><table class="tbl"><thead><tr><th class="n">#</th><th class="n">Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AV</th><th>P</th></tr></thead><tbody>${tbl.map((r, i) => `<tr class="${r.id === c.team ? 'me' : ''}"><td class="pos n">${i + 1}</td><td class="n">${esc(teamById(r.id).name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div>`;
  body.innerHTML = `<div class="c-col">${left}</div><div class="c-col">${right}</div>`;
  body.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    snd.ui();
    if (b.id === 'cPlay') careerPlay();
    else if (b.id === 'cSim') careerSimMine();
    else if (b.id === 'cNext') { const n = newCareer(c.team, c.difficulty, c.minutes); n.season = c.season + 1; store.set('career', n); renderCareer(); }
    else if (b.id === 'cReset') {
      // in-page two-step confirmation (dialogs are not available everywhere)
      if (b.dataset.armed) { store.del('career'); renderCareer(); }
      else { b.dataset.armed = '1'; b.textContent = 'Emin misin? Tekrar bas, kariyer silinir'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Kariyeri sıfırla'; } }, 4000); }
    }
  };
}

// ------------------------------------------------------------------ team editor
let edSel = TEAMS[0].id;
function renderEditor() {
  const T = teams();
  $('#eList').innerHTML = T.map((t) => `<button data-eid="${t.id}" aria-pressed="${t.id === edSel}"><i style="background:${t.home.shirt};box-shadow:inset 0 0 0 2px ${t.home.trim}"></i>${esc(t.name)}</button>`).join('');
  const t = T.find((x) => x.id === edSel);
  const sq = squadFor(t);
  const k = t.home;
  $('#eForm').innerHTML = `
    <div class="tc-mid" style="gap:14px">${shirtSVG(k, 64)}<div><b style="font-size:22px;font-weight:850;font-stretch:75%">${esc(t.name)}</b><div style="color:var(--mute);font-size:13px">Değişiklikler sadece bu tarayıcıda saklanır.</div></div></div>
    <div class="fgrid">
      <label class="f">Takım adı<input id="edName" maxlength="24" value="${esc(t.name)}"></label>
      <label class="f">Kısaltma<input id="edShort" maxlength="3" value="${esc(t.short)}"></label>
      <label class="f">Diziliş<select id="edForm">${FORMATION_LIST.map((f) => `<option ${f === t.form ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="f">Desen<select id="edPat">${[['plain', 'Düz'], ['stripes', 'Dikey çizgi'], ['hoops', 'Yatay çizgi'], ['half', 'İkiye bölünmüş'], ['sash', 'Çapraz bant']].map(([v, l]) => `<option value="${v}" ${v === k.pattern ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    <div class="fgrid">
      <label class="f">Forma<input type="color" id="edShirt" value="${k.shirt}"></label>
      <label class="f">İkinci renk<input type="color" id="edAlt" value="${k.alt || k.trim}"></label>
      <label class="f">Şort<input type="color" id="edShorts" value="${k.shorts}"></label>
      <label class="f">Çorap<input type="color" id="edSocks" value="${k.socks}"></label>
      <label class="f">Yaka / detay<input type="color" id="edTrim" value="${k.trim}"></label>
      <label class="f">Kaleci forması<input type="color" id="edGk" value="${t.gk}"></label>
    </div>
    <div><div style="font-size:12px;color:var(--mute);margin-bottom:8px">Kadro (numara · isim · mevki)</div><div class="plist">${sq.map((p, i) => `<div class="prow"><input data-pn="${i}" inputmode="numeric" maxlength="2" value="${p.num}" aria-label="Forma numarası"><input data-pname="${i}" maxlength="22" value="${esc(p.name)}" aria-label="Oyuncu adı"><span>${p.pos}</span></div>`).join('')}</div></div>
    <div class="btnrow" style="justify-content:flex-end"><button class="ghost" id="edReset">Varsayılana dön</button><button class="cta" id="edSave">Kaydet</button></div>`;
  $('#eList').onclick = (e) => { const b = e.target.closest('[data-eid]'); if (b) { edSel = b.dataset.eid; renderEditor(); } };
  $('#edSave').onclick = () => {
    const ov = store.get('teams', {});
    ov[edSel] = {
      name: $('#edName').value.trim() || undefined, short: $('#edShort').value.trim() || undefined, form: $('#edForm').value, gk: $('#edGk').value,
      home: { shirt: $('#edShirt').value, alt: $('#edAlt').value, shorts: $('#edShorts').value, socks: $('#edSocks').value, trim: $('#edTrim').value, pattern: $('#edPat').value },
      players: sq.map((p, i) => ({ name: $(`[data-pname="${i}"]`).value.trim() || p.name, num: +$(`[data-pn="${i}"]`).value || p.num })),
    };
    store.set('teams', ov); ratingCache.clear(); snd.ui(true); renderEditor();
  };
  $('#edReset').onclick = () => { const ov = store.get('teams', {}); delete ov[edSel]; store.set('teams', ov); ratingCache.clear(); renderEditor(); };
}

// ------------------------------------------------------------------ settings
function renderSettings() {
  const row = (title, sub, ctrl) => `<div class="set-row"><div><b>${title}</b><span>${sub}</span></div>${ctrl}</div>`;
  const segS = (key, opts) => `<div class="seg" style="min-width:240px">${opts.map(([v, l]) => `<button data-set="${key}" data-v="${v}" aria-pressed="${String(S[key]) === String(v)}">${l}</button>`).join('')}</div>`;
  const range = (key) => `<input type="range" min="0" max="1" step="0.05" value="${S[key]}" data-range="${key}" aria-label="${key}">`;
  $('#setBody').innerHTML = [
    row('Grafik kalitesi', 'Düşük: gölgeler kapalı, mobilde daha serin ve akıcı. Değişiklik yeniden yüklemede uygulanır.', segS('quality', [['auto', 'Otomatik'], ['high', 'Yüksek'], ['low', 'Düşük']])),
    row('Kamera', 'Maç içinde Duraklat menüsünden de değişir.', segS('cam', [['broadcast', 'Yayın'], ['tele', 'Yakın'], ['end', 'Dinamik']])),
    row('Genel ses', '', range('master')),
    row('Tribün', '', range('crowd')),
    row('Efektler', 'Top, düdük, direk.', range('sfx')),
    row('Otomatik oyuncu değiştirme', 'Savunmada topa en yakın oyuncuya geçer.', segS('autoSwitch', [['true', 'Açık'], ['false', 'Kapalı']])),
    row('Ofsayt', '11v11 maçlarda.', segS('offside', [['true', 'Açık'], ['false', 'Kapalı']])),
    row('Oyuncu isimleri', 'Kontrol ettiğin oyuncunun üstünde.', segS('names', [['true', 'Göster'], ['false', 'Gizle']])),
    row('Radar', 'Ekranın altındaki mini saha.', segS('radar', [['true', 'Göster'], ['false', 'Gizle']])),
  ].join('');
}
$('#setBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-set]'); if (!b) return;
  const k = b.dataset.set; let v = b.dataset.v;
  if (v === 'true') v = true; else if (v === 'false') v = false;
  S[k] = v; saveSettings(); snd.ui();
  if (k === 'cam') R.setCamMode(v);
  if (k === 'radar' && G) hud.radar.hidden = !v;
  renderSettings();
});
$('#setBody').addEventListener('input', (e) => {
  const r = e.target.closest('[data-range]'); if (!r) return;
  S[r.dataset.range] = +r.value; saveSettings();
  Object.assign(snd.vol, { master: S.master, crowd: S.crowd, sfx: S.sfx }); snd.applyVolumes();
});

// ------------------------------------------------------------------ rotate hint
let rotateDismissed = false;
function checkRotate() {
  const portrait = innerHeight > innerWidth;
  $('#rotateHint').hidden = !(G && isTouch && portrait && !rotateDismissed);
}
$('#rotateOk').addEventListener('click', () => { rotateDismissed = true; checkRotate(); });
addEventListener('resize', checkRotate);

// ------------------------------------------------------------------ gamepad menu navigation
const padNav = { prev: {}, t: 0 };
function pollPadMenu(dt) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  if (!pads.length) return;
  const gp = pads[0];
  const b = (k) => !!(gp.buttons[k] && gp.buttons[k].pressed);
  const ay = gp.axes[1] || 0, ax = gp.axes[0] || 0;
  const st = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6, a: b(0), b: b(1), start: b(9) };
  const p = padNav.prev;
  padNav.t -= dt;
  const rep = (k) => st[k] && (!p[k] || padNav.t <= 0);
  if (scr === 'title' && (st.a || st.start) && !p.a && !p.start) { unlockAudio(); show('menu'); renderMenuSide(); }
  else if (scr) {
    if (rep('down') || rep('right')) { moveFocus(1); padNav.t = 0.22; }
    if (rep('up') || rep('left')) { moveFocus(-1); padNav.t = 0.22; }
    if (st.a && !p.a && document.activeElement && document.activeElement.click) document.activeElement.click();
    if (st.b && !p.b) { if (scr === 'pause') pause(false); else { const bb = $('.screen.on [data-back]'); bb && bb.click(); } }
  }
  padNav.prev = st;
}

// ------------------------------------------------------------------ loop
let lastT = performance.now();
function excitement(m) {
  const B = m.ball, P = m.P;
  const near = clamp(1 - (P.H - Math.abs(B.x)) / (30 * P.sc), 0, 1);
  return clamp(near * 0.8 + (B.y > 1.5 && near > 0.3 ? 0.2 : 0), 0, 1);
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  let view = { mode: 'menu' };
  if (G) {
    const m = G.match;
    const fixed = (S.cam === 'broadcast' || S.cam === 'tele') && m.state !== 'pen' && G.penCam <= 0;
    const basis = fixed ? { fx: 0, fz: -1, rx: 1, rz: 0 } : R.basis();
    const cmds = input.poll(dt, basis, m.humans.length);
    if (cmds[0].pause && !G.replay && scr !== 'stats') { pause(!G.paused); input.consume(); }
    if (G.replay) {
      stepReplay(dt);
      if (G && G.replay && (cmds.some((c) => c.pass.down || c.shoot.down || c.through.down || c.lob.down) || (G.replay.t > 0.4 && input.touch.latched.size))) endReplay();
      input.consume();
    } else if (!G.paused && scr !== 'stats') {
      G.acc += dt;
      let n = 0;
      while (G.acc >= STEP && n < 5) { m.step(STEP, cmds); if (n === 0) input.consume(); n++; G.acc -= STEP; }
      if (n >= 5) G.acc = 0;
      if (m.events.length) { onEvents(m.events); m.events.length = 0; }
    } else { input.consume(); pollPadMenu(dt); }
    if (!G) { requestAnimationFrame(frame); return; }
    G.excite = Math.max(excitement(m), G.excite * Math.exp(-dt * 0.8));
    const homeAtt = m.possSoft === 0 && m.ball.x * m.teams[0].side > 0;
    snd.update(dt, G.excite, homeAtt);
    G.penCam -= dt;
    const h0 = m.humans[0];
    const pen = m.state === 'pen' && m.pen ? m.pen : (G.penCam > 0 ? G.lastPen : null);
    if (G.replay) view = { mode: 'replay', match: m, frame: G.replay.cur, replayAng: G.replay.ang, replayStyle: G.replay.style, replaySide: G.replay.side };
    else if (pen) view = { mode: 'pen', match: m, pen };
    else if (m.state === 'goal' && m.celebrator && m.stateT > 0.9) view = { mode: 'celebrate', match: m, focus: m.celebrator };
    else view = { mode: 'live', match: m, attackDir: h0 ? m.teams[h0.team].side : m.teams[0].side };
    view.excite = G.excite;
    R.frame(dt, view);
    updateHUD(dt);
  } else {
    pollPadMenu(dt);
    R.frame(dt, view);
  }
  requestAnimationFrame(frame);
}
show('title');
requestAnimationFrame(frame);

// offline support
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.hostname.endsWith('claude.ai') && !location.hostname.endsWith('claudeusercontent.com')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// debug handle (used by automated tests; harmless in production)
window.__saha27 = { get game() { return G; }, renderer: R, input };
