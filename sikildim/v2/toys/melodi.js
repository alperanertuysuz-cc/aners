/* Melodi — yanlış notası olmayan pentatonik ton matrisi */
(() => {
'use strict';
const STEPS = 16, ROWS = 10;                       // 16 sekizlik adım × iki oktav majör pentatonik (Do Re Mi Sol La)
const SEMI = [0, 2, 4, 7, 9];
const NAMES = ['Do', 'Re', 'Mi', 'Sol', 'La'];
const FREQ = Array.from({ length: ROWS }, (_, r) => 261.63 * Math.pow(2, (SEMI[r % 5] + 12 * Math.floor(r / 5)) / 12));
const SOUNDS = { marimba: 'Marimba', pad: 'Pad', can: 'Çan' };
const SND = Object.keys(SOUNDS);
const BPM_MIN = 60, BPM_MAX = 180;
/* Presets: [adım, satır, satır…] — satır 0 en pes Do, 9 en tiz La */
const PRESETS = {
  ninni: { name: 'Ninni', bpm: 92, snd: 'marimba', n: [[0, 7, 0], [2, 6], [3, 5], [4, 4], [6, 3], [8, 4, 1], [10, 5], [11, 6], [12, 7, 2], [13, 6], [14, 5, 0]] },
  yagmur: { name: 'Yağmur', bpm: 112, snd: 'can', n: [[0, 9, 0], [1, 7], [2, 5], [4, 8], [5, 6], [6, 4], [8, 7, 3], [9, 5], [10, 4], [12, 6, 1], [13, 5], [14, 3], [15, 2]] },
};
const presetPat = k => { const p = new Array(STEPS).fill(0); PRESETS[k].n.forEach(([s, ...rs]) => rs.forEach(r => { p[s] |= 1 << r; })); return p; };
const label = r => (r >= 5 ? 'Tiz ' : '') + NAMES[r % 5];
const bits = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };

function load() {
  const s = store.get('melodi', null);
  const o = { p: null, bpm: PRESETS.ninni.bpm, snd: PRESETS.ninni.snd, echo: true, preset: 'ninni' };
  if (s && typeof s === 'object') {
    if (Array.isArray(s.p) && s.p.length === STEPS) o.p = s.p.map(n => (n | 0) & 1023);
    o.bpm = clamp(Math.round(+s.bpm) || o.bpm, BPM_MIN, BPM_MAX);
    if (SOUNDS[s.snd]) o.snd = s.snd;
    if (typeof s.echo === 'boolean') o.echo = s.echo;
    o.preset = PRESETS[s.preset] ? s.preset : null;
  }
  if (!o.p) { o.p = presetPat('ninni'); o.preset = 'ninni'; }
  return o;
}

/* Sparse, musical random melody: an 8-step motif from a gentle random walk, answered by a varied copy that comes home to Do. */
function randomPattern() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const p = new Array(STEPS).fill(0);
  let motif = [];
  for (let tries = 0; tries < 6 && motif.length < 3; tries++) {
    motif = []; let r = pick([5, 6, 7, 8]);
    for (let s = 0; s < 8; s++) {
      const prob = s === 0 ? 1 : s % 2 === 0 ? 0.68 : 0.3;
      if (Math.random() >= prob) continue;
      if (motif.length) { r += pick([-2, -1, -1, 1, 1, 2, 0, -3, 3]); if (r < 3) r = 4 + (3 - r); if (r > 9) r = 8 - (r - 9); }
      motif.push([s, clamp(r, 3, 9)]);
    }
  }
  const lift = Math.random() < 0.4 ? pick([-1, 1]) : 0;   // sometimes the answer is a sequence a step higher/lower
  const answer = motif.map(([s, r]) => [s + 8, clamp(r + lift, 3, 9)]);
  for (let i = Math.max(1, answer.length - 3); i < answer.length - 1; i++) answer[i][1] = clamp(answer[i][1] + pick([-2, -1, 1, 2]), 3, 9);
  answer[answer.length - 1][1] = pick([5, 5, 5, 7, 3]);
  motif.concat(answer).forEach(([s, r]) => { p[s] |= 1 << r; });
  const bass = (s, r) => { const top = 31 - Math.clz32(p[s] || 1); if (!p[s] || top - r >= 2) p[s] |= 1 << r; };
  bass(0, 0); bass(8, pick([0, 1, 2]));
  if (Math.random() < 0.45) { bass(4, pick([0, 2])); bass(12, pick([1, 2, 0])); }
  return p;
}

const DICE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.8" cy="8.8" r="1.55" fill="currentColor"/><circle cx="15.2" cy="8.8" r="1.55" fill="currentColor"/><circle cx="12" cy="12" r="1.55" fill="currentColor"/><circle cx="8.8" cy="15.2" r="1.55" fill="currentColor"/><circle cx="15.2" cy="15.2" r="1.55" fill="currentColor"/></svg>';

/* Tile art: 8 × 5 dot matrix, a melody line lit across it; lit dots flash in turn like a playhead passing. */
const ART_LINE = [4, 3, 1, 2, 0, 1, 3, 2];
const ART = `<div class="art-melodi"><svg viewBox="0 0 158 98" preserveAspectRatio="none" aria-hidden="true"><polyline points="${ART_LINE.map((r, c) => `${c * 20 + 9},${r * 20 + 9}`).join(' ')}"/></svg>${Array.from({ length: 5 }, (_, r) => ART_LINE.map((lr, c) => (lr === r ? `<i class="on" style="--d:${c}"></i>` : '<i></i>')).join('')).join('')}</div>`;

registerToy('melodi', {
  name: 'Melodi', color: 'lilac', cf: 'on-light', kind: 'Müzik', open: 'Melodi’yi aç',
  cats: ['yaratici', 'sakin'],
  desc: 'Karelere dokun, melodi kendini çalsın. Burada yanlış nota yok.',
  art: ART,
  stat: () => {
    const s = store.get('melodi', null);
    if (!s || !Array.isArray(s.p) || !s.p.some(Boolean)) return 'Pentatonik · 3 ses';
    const bpm = clamp(Math.round(+s.bpm) || 96, BPM_MIN, BPM_MAX);
    return `${PRESETS[s.preset] ? PRESETS[s.preset].name : 'Kendi melodin'} · ${bpm} BPM`;
  },
  css: `
.art-melodi { --u: 18px; position: relative; display: grid; grid-template-columns: repeat(8, var(--u)); grid-auto-rows: var(--u); gap: 2px; }
.art-melodi svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.art-melodi polyline { fill: none; stroke: var(--on-light); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; opacity: .32; vector-effect: non-scaling-stroke; }
.art-melodi i { position: relative; display: grid; place-items: center; }
.art-melodi i::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: rgba(22, 23, 26, .2); }
.art-melodi i.on::before {
  width: calc(var(--u) - 2px); height: calc(var(--u) - 2px); border-radius: 50%; background: var(--on-light); box-shadow: 0 0 0 3px var(--lilac);
  animation: ml-art 3.2s var(--ease) infinite; animation-delay: calc(var(--d) * .4s);
}
@keyframes ml-art { 0% { transform: scale(1); } 3% { transform: scale(1.32); background: var(--paper); } 13%, 100% { transform: scale(1); background: var(--on-light); } }
@media (min-width: 961px) { .art-melodi { --u: 21px; gap: 3px; } }

.melodi-root { --s: 40px; --g: 5px; --lw: 30px; --bp: 12px; gap: clamp(12px, 2.1vh, 22px); user-select: none; -webkit-user-select: none; }
.melodi-root .ml-w { width: max(var(--bw, 100%), min(100%, 300px)); max-width: 100%; }
.melodi-root .ml-top { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; }
.melodi-root .ml-play {
  position: relative; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; flex: none;
  background: var(--c); color: var(--cf); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .16); transition: transform .3s var(--spring);
}
.melodi-root .ml-play:active { transform: scale(.93); }
.melodi-root .ml-play svg { width: 22px; height: 22px; }
.melodi-root .ml-pw { position: relative; display: grid; flex: none; }
.melodi-root .ml-pulse { position: absolute; inset: -5px; border-radius: 50%; box-shadow: 0 0 0 2px var(--c); opacity: 0; pointer-events: none; }
.melodi-root .ml-knob { flex: 1 1 150px; display: grid; gap: 2px; min-width: 0; max-width: 300px; }
.melodi-root .ml-knob-top { display: flex; justify-content: space-between; gap: 10px; }
.melodi-root .ml-knob-top label { color: var(--mute); }
.melodi-root .ml-knob output { font-variant-numeric: tabular-nums; }
.melodi-root .ml-sound { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.melodi-root .ml-echo { height: 44px; padding: 0 16px; }
.melodi-root .ml-echo[aria-pressed="true"] { background: var(--c); color: var(--cf); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .14); }
.melodi-root .ml-echo svg { width: 18px; height: 18px; flex: none; }

.melodi-root .ml-pages { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 18px; background: var(--panel-2); }
.melodi-root .ml-pg {
  display: flex; align-items: center; justify-content: center; gap: 10px; height: 38px; border-radius: 14px;
  color: var(--mute); transition: background .2s, color .2s, box-shadow .2s;
}
.melodi-root .ml-pg[aria-pressed="true"] { background: var(--panel); color: var(--fg); box-shadow: 0 1px 3px var(--shade); }
.melodi-root .ml-pg .mono { min-width: 3.4em; text-align: right; }
.melodi-root .ml-mini { display: grid; grid-template-columns: repeat(8, 6px); gap: 3px; align-items: center; }
.melodi-root .ml-mini i { height: 6px; border-radius: 2px; background: var(--line-2); transition: background .12s, transform .12s; }
.melodi-root .ml-mini i.has { background: currentColor; }
.melodi-root .ml-mini i.now { background: var(--c); transform: scaleY(1.9); }

.melodi-root .ml-board {
  position: relative; flex: none; padding: var(--bp); border-radius: var(--r-xl); overflow: hidden;
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line), 0 30px 60px -44px var(--shade);
  touch-action: none; -webkit-touch-callout: none;
}
.melodi-root .ml-leds { display: grid; gap: var(--g); align-items: center; margin-bottom: 10px; }
.melodi-root .ml-leds i { height: 4px; border-radius: 2px; background: var(--panel-3); transition: background .1s; }
.melodi-root .ml-leds i:nth-of-type(4n+1) { height: 6px; border-radius: 3px; }
.melodi-root .ml-leds i.now { background: var(--c); }
.melodi-root .ml-grid { position: relative; display: grid; gap: var(--g); grid-template-rows: repeat(10, var(--s)); }
.melodi-root .ml-grid.paged[data-page="0"] .ml-cell[data-pg="1"], .melodi-root .ml-grid.paged[data-page="1"] .ml-cell[data-pg="0"] { display: none; }
.melodi-root .ml-grid.nolab .ml-lab, .melodi-root .ml-leds.nolab span { display: none; }
.melodi-root .ml-lab { display: flex; align-items: center; justify-content: flex-end; padding-right: 1px; font: 500 clamp(10px, calc(var(--s) * .23), 12.5px)/1 var(--f-mono); letter-spacing: .02em; color: var(--mute); }
.melodi-root .ml-lab.do { color: var(--fg); font-weight: 700; }
.melodi-root .ml-cell {
  position: relative; display: grid; place-items: center; border-radius: calc(var(--s) * .3);
  background: var(--panel-2); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .05);
  transition: background .14s, box-shadow .14s;
}
.melodi-root .ml-cell.alt { background: color-mix(in srgb, var(--panel-2) 55%, var(--panel-3)); }
.melodi-root .ml-cell.do { background: color-mix(in srgb, var(--panel-2) 84%, var(--c)); }
.melodi-root .ml-cell.do.alt { background: color-mix(in srgb, color-mix(in srgb, var(--panel-2) 55%, var(--panel-3)) 84%, var(--c)); }
.melodi-root .ml-cell::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--line-2); transition: opacity .14s; }
.melodi-root .ml-grid .ml-cell[aria-pressed="true"] { background: var(--c); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .18); }
.melodi-root .ml-grid .ml-cell[aria-pressed="true"]::before { opacity: 0; }
.melodi-root .ml-cell:focus-visible { outline-offset: 2px; z-index: 1; }
@media (hover: hover) { .melodi-root .ml-cell:not([aria-pressed="true"]):hover { box-shadow: inset 0 0 0 2px var(--line-2); } }
.melodi-root .ml-head {
  position: absolute; top: -4px; left: 0; width: calc(var(--s) + 8px); height: calc(100% + 8px); margin-left: -4px;
  border-radius: calc(var(--s) * .34 + 4px); pointer-events: none; opacity: 0; transition: opacity .2s;
  background: color-mix(in srgb, var(--fg) 6%, transparent); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fg) 18%, transparent);
}
.melodi-root .ml-head.on { opacity: 1; }
.melodi-root .ml-fx { position: absolute; inset: 0; pointer-events: none; }
.melodi-root .ml-fx i {
  position: absolute; left: 0; top: 0; width: calc(var(--s) * 2.8); height: calc(var(--s) * 2.8);
  margin: calc(var(--s) * -1.4) 0 0 calc(var(--s) * -1.4); border-radius: 50%; opacity: 0;
  border: 2.5px solid color-mix(in srgb, var(--c) 72%, var(--fg));
}
.melodi-root .ml-empty {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2; padding: 10px 16px; border-radius: 999px;
  background: var(--fg); color: var(--bg); white-space: nowrap; pointer-events: none; box-shadow: 0 14px 30px -16px var(--shade);
  animation: fadein .3s var(--ease);
}

.melodi-root .ml-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
.melodi-root .ml-btns { display: flex; gap: 8px; }
.melodi-root .ml-btns .btn svg { width: 20px; height: 20px; flex: none; }
.melodi-root .ml-clear { min-width: 118px; }
.melodi-root .ml-presets { display: flex; align-items: center; gap: 6px; }
.melodi-root .ml-presets > .mono { color: var(--mute); margin-right: 4px; }
.melodi-root.narrow .ml-sound { margin-left: 0; }
.melodi-root.narrow .ml-knob { max-width: none; }
.melodi-root.narrow .ml-sound .seg { flex: 1; flex-wrap: nowrap; }
.melodi-root.narrow .ml-sound .seg button { flex: 1; padding: 0 8px; }
.melodi-root.narrow .ml-echo { padding: 0 12px; }
.melodi-root.narrow .ml-board { border-radius: var(--r-lg); }
.melodi-root.narrow .ml-btns { flex: 1 1 100%; }
.melodi-root.narrow .ml-btns .btn { flex: 1; padding: 0 14px; }
.melodi-root.narrow .ml-presets { flex: 1 1 100%; justify-content: center; }
@media (max-width: 359px) { .melodi-root .ml-echo svg { display: none; } .melodi-root .ml-play { width: 52px; height: 52px; } }
`,
  hint: 'Boşluk çal / durdur · R rastgele · 1 2 3 ses',
  mount(el) {
    const saved = load();
    const pat = saved.p;
    let bpm = saved.bpm, snd = saved.snd, echo = saved.echo, preset = saved.preset;
    let view = 16, page = 0, S = 40, G = 5, LW = 30;
    el.innerHTML = `
      <div class="toy melodi-root">
        <div class="ml-top ml-w">
          <span class="ml-pw"><i class="ml-pulse" id="ml-pulse" aria-hidden="true"></i><button type="button" class="ml-play" id="ml-play" aria-pressed="false" aria-label="Çal">${ICON.play}</button></span>
          <div class="ml-knob"><div class="ml-knob-top"><label class="mono" for="ml-bpm">Tempo</label><output class="mono" id="ml-bpm-o" for="ml-bpm"></output></div><input type="range" id="ml-bpm" min="${BPM_MIN}" max="${BPM_MAX}" step="1"></div>
          <div class="ml-sound">
            <div class="seg" role="group" aria-label="Ses">${SND.map(k => `<button type="button" data-snd="${k}" aria-pressed="${k === snd}">${SOUNDS[k]}</button>`).join('')}</div>
            <button type="button" class="chip ml-echo" id="ml-echo" aria-pressed="${echo}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h.01"/><path d="M9 8.5a5 5 0 0 1 0 7"/><path d="M13 5.5a9.2 9.2 0 0 1 0 13" opacity=".7"/><path d="M17 3a13 13 0 0 1 0 18" opacity=".4"/></svg>Yankı</button>
          </div>
        </div>
        <div class="ml-pages ml-w" id="ml-pages" role="group" aria-label="Sayfa" hidden>
          ${[0, 1].map(p => `<button type="button" class="ml-pg" data-page="${p}" aria-pressed="${p === 0}" aria-label="Adım ${p * 8 + 1}–${p * 8 + 8}"><span class="mono">${p * 8 + 1}–${p * 8 + 8}</span><span class="ml-mini" aria-hidden="true">${'<i></i>'.repeat(8)}</span></button>`).join('')}
        </div>
        <div class="ml-board" id="ml-board">
          <div class="ml-leds" id="ml-leds" aria-hidden="true"><span></span>${'<i></i>'.repeat(STEPS)}</div>
          <div class="ml-grid" id="ml-grid" role="group" aria-label="Nota ızgarası" data-page="0">
            ${Array.from({ length: ROWS }, (_, k) => {
              const r = ROWS - 1 - k;
              return `<span class="ml-lab${r % 5 === 0 ? ' do' : ''}" aria-hidden="true">${NAMES[r % 5]}</span>` + Array.from({ length: STEPS }, (_, s) =>
                `<button type="button" class="ml-cell${(s >> 2) & 1 ? ' alt' : ''}${r % 5 === 0 ? ' do' : ''}" data-s="${s}" data-r="${r}" data-pg="${s >> 3}" tabindex="-1" aria-pressed="false" aria-label="${label(r)}, adım ${s + 1}"></button>`).join('');
            }).join('')}
            <div class="ml-head" id="ml-head" aria-hidden="true"></div>
            <div class="ml-fx" id="ml-fx" aria-hidden="true">${'<i></i>'.repeat(14)}</div>
          </div>
          <p class="ml-empty mono" id="ml-empty" hidden>Bir kareye dokun</p>
        </div>
        <div class="ml-actions ml-w">
          <div class="ml-btns">
            <button type="button" class="btn primary" id="ml-rand">${DICE}Rastgele <kbd>R</kbd></button>
            <button type="button" class="btn ml-clear" id="ml-clear">Temizle</button>
          </div>
          <div class="ml-presets" role="group" aria-label="Hazır melodiler"><span class="mono">Hazır</span>${Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="chip" data-preset="${k}" aria-pressed="false">${p.name}</button>`).join('')}</div>
        </div>
      </div>`;

    const rootEl = $('.melodi-root', el), topEl = $('.ml-top', el), soundEl = $('.ml-sound', el), actionsEl = $('.ml-actions', el), board = $('#ml-board', el), grid = $('#ml-grid', el), leds = $('#ml-leds', el), pagesEl = $('#ml-pages', el);
    const playBtn = $('#ml-play', el), bpmIn = $('#ml-bpm', el), bpmOut = $('#ml-bpm-o', el), echoBtn = $('#ml-echo', el);
    const pulse = $('#ml-pulse', el), head = $('#ml-head', el), emptyEl = $('#ml-empty', el), clearBtn = $('#ml-clear', el), randBtn = $('#ml-rand', el);
    const rings = $$('#ml-fx i', el), ledEls = $$('i', leds), miniEls = $$('.ml-mini i', pagesEl), pgBtns = $$('.ml-pg', pagesEl);
    const cells = Array.from({ length: STEPS }, () => new Array(ROWS));
    $$('.ml-cell', grid).forEach(c => { cells[+c.dataset.s][+c.dataset.r] = c; });
    const cs0 = getComputedStyle(root);
    const LILAC = cs0.getPropertyValue('--lilac').trim() || '#B9A3FF';
    const FLASH = '#E4DBFF';

    /* ---------- audio: own bus + feedback echo, all into Sound.out ---------- */
    let A = null;
    const stepDur = () => 60 / bpm / 2;                // a step is an eighth note
    const echoTime = () => Math.min(1.8, stepDur() * 1.5);  // dotted eighth
    function audio() {
      const ctx = Sound.ensure();
      if (!ctx || !Sound.out) return null;
      if (!A) {
        const bus = ctx.createGain(), send = ctx.createGain(), delay = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain();
        const lp = Sound.filt('lowpass', 2600, 0.5), hp = Sound.filt('highpass', 240, 0.5);
        send.gain.value = echo ? 1 : 0; delay.delayTime.value = echoTime(); fb.gain.value = 0.36; wet.gain.value = 0.32;
        bus.connect(Sound.out);
        bus.connect(send); send.connect(delay); delay.connect(lp); lp.connect(hp); hp.connect(fb); fb.connect(delay); hp.connect(wet); wet.connect(Sound.out);
        A = { bus, send, delay, fb, wet, lp, hp };
      }
      return ctx;
    }
    function voice(f, t, v) {
      const ctx = Sound.ctx, dest = A.bus;
      if (snd === 'marimba') { Sound.pluck(f, t, 0.17 * v, dest); return; }
      if (snd === 'pad') {
        const sd = stepDur(), a = Math.min(0.2, sd * 0.55), rel = t + a + sd * 0.7, end = rel + 2.4;
        const g = ctx.createGain(), lp = Sound.filt('lowpass', Math.min(5200, f * 3.2), 0.4);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.042 * v, t + a);
        g.gain.setValueAtTime(0.042 * v, rel); g.gain.setTargetAtTime(0, rel, 0.45);
        lp.connect(g); g.connect(dest);
        [[f * 0.9966, 'sine', 1], [f * 1.0034, 'sine', 1], [f, 'triangle', 0.55], [f * 2.004, 'sine', 0.16]].forEach(([fr, type, lv]) => {
          const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = fr; og.gain.value = lv;
          o.connect(og); og.connect(lp); o.start(t); o.stop(end);
        });
        return;
      }
      /* Çan: two-operator FM with an inharmonic 1:3.5 ratio and a decaying index, plus a faint 2.76× partial */
      const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = Sound.env(t, 0.125 * v, 0.003, 2.1);
      car.frequency.value = f; mod.frequency.value = f * 3.5;
      mg.gain.setValueAtTime(f * 1.7, t); mg.gain.exponentialRampToValueAtTime(f * 0.03, t + 1.2);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(dest);
      const p = ctx.createOscillator(), pg = Sound.env(t, 0.028 * v, 0.002, 0.6); p.frequency.value = f * 2.76; p.connect(pg); pg.connect(dest);
      [car, mod, p].forEach(o => { o.start(t); o.stop(t + 2.25); });
    }
    function audition(r) { const ctx = audio(); if (ctx) voice(FREQ[r], ctx.currentTime + 0.005, 0.95); }

    /* ---------- state helpers ---------- */
    function save() { store.set('melodi', { v: 1, p: pat.slice(), bpm, snd, echo, preset }); }
    const isOn = (s, r) => (pat[s] >> r) & 1;
    const visible = s => view === 16 || (s >> 3) === page;
    function syncMini() { miniEls.forEach((m, s) => m.classList.toggle('has', pat[s] !== 0)); }
    function syncEmpty() { emptyEl.hidden = pat.some(Boolean); }
    function syncPresets() { $$('[data-preset]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.preset === preset)); }
    function render() {
      for (let s = 0; s < STEPS; s++) for (let r = 0; r < ROWS; r++) cells[s][r].setAttribute('aria-pressed', isOn(s, r) ? 'true' : 'false');
      syncMini(); syncEmpty(); syncPresets();
    }
    const setP = inp => inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%');
    function syncTempo() {
      bpmIn.value = bpm; bpmOut.textContent = bpm + ' BPM'; setP(bpmIn);
      if (A) A.delay.delayTime.setTargetAtTime(echoTime(), Sound.ctx.currentTime, 0.04);
    }
    function syncSound() { $$('[data-snd]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.snd === snd)); }
    function dropPreset() { if (preset) { preset = null; syncPresets(); } }
    function cascade() {
      if (!motionOK()) return;
      for (let s = 0; s < STEPS; s++) {
        if (!visible(s) || !pat[s]) continue;
        for (let r = 0; r < ROWS; r++) if (isOn(s, r)) cells[s][r].animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, delay: (view === 16 ? s : s & 7) * 22 + (ROWS - r) * 6, easing: 'cubic-bezier(.3,1.45,.55,1)', fill: 'backwards' });
      }
    }
    function setCell(s, r, val, sound) {
      if (!!isOn(s, r) === val) return;
      pat[s] = val ? pat[s] | (1 << r) : pat[s] & ~(1 << r);
      const c = cells[s][r];
      c.setAttribute('aria-pressed', val ? 'true' : 'false');
      dropPreset(); miniEls[s].classList.toggle('has', pat[s] !== 0); syncEmpty(); resetUndo();
      if (val) {
        if (sound && !playing) audition(r);
        if (motionOK()) c.animate([{ transform: 'scale(.62)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.3,1.45,.55,1)' });
      }
    }
    function loadPattern(p, opts = {}) {
      for (let s = 0; s < STEPS; s++) pat[s] = p[s] | 0;
      if (opts.preset) {
        const pr = PRESETS[opts.preset]; preset = opts.preset; bpm = pr.bpm; snd = pr.snd; syncTempo(); syncSound();
      } else preset = null;
      render(); cascade(); save();
    }

    /* ---------- layout: 16 steps when they fit at a comfortable size, otherwise two pages of 8 ---------- */
    function setView(nv) {
      view = nv;
      grid.classList.toggle('paged', nv === 8);
      pagesEl.hidden = nv !== 8; leds.hidden = nv === 8;
      if (nv === 16) page = 0;
      setPage(page, false);
    }
    function measure() {
      const cs = getComputedStyle(el);
      const W = Math.min(1100, el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
      const H = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const narrow = W < 600;
      if (narrow !== rootEl.classList.contains('narrow')) {
        rootEl.classList.toggle('narrow', narrow);
        if (narrow) { soundEl.classList.add('ml-w'); actionsEl.before(soundEl); } else { soundEl.classList.remove('ml-w'); topEl.append(soundEl); }
      }
      G = W < 600 ? 4 : 6;
      LW = W < 330 ? 0 : W < 600 ? 24 : 30;
      const BP = W < 600 ? 8 : 14;
      const inner = W - BP * 2 - (LW ? LW + G : 0);
      const s16 = (inner - 15 * G) / 16;
      const nv = s16 >= 34 ? 16 : 8;
      if (nv !== view) setView(nv);
      const sW = nv === 16 ? s16 : (inner - 7 * G) / 8;
      rootEl.style.setProperty('--g', G + 'px'); rootEl.style.setProperty('--bp', BP + 'px');
      grid.classList.toggle('nolab', !LW); leds.classList.toggle('nolab', !LW);
      const ledH = nv === 16 ? leds.offsetHeight + 10 : 0;
      const tr = rootEl.getBoundingClientRect(), br = board.getBoundingClientRect();
      const other = rootEl.offsetHeight - board.offsetHeight;
      const chrome = BP * 2 + ledH + 9 * G;
      const sAll = (H - other - chrome) / 10, sTop = (H - (br.top - tr.top) - chrome) / 10;
      const minS = W < 340 ? 28 : 32;
      let s = Math.min(sW, 58, sAll >= minS ? sAll : Math.max(minS, sTop));
      S = Math.max(20, Math.floor(s));
      const cols = (LW ? LW + 'px ' : '') + `repeat(${nv}, ${S}px)`;
      grid.style.gridTemplateColumns = cols; leds.style.gridTemplateColumns = (LW ? LW + 'px ' : '') + `repeat(16, ${S}px)`;
      rootEl.style.setProperty('--s', S + 'px');
      rootEl.style.setProperty('--bw', (BP * 2 + (LW ? LW + G : 0) + nv * S + (nv - 1) * G) + 'px');
    }
    function layout() { measure(); measure(); if (lit >= 0) placeHead(lit); }
    const colX = s => (LW ? LW + G : 0) + (view === 16 ? s : s & 7) * (S + G);
    const rowY = r => (ROWS - 1 - r) * (S + G);

    /* ---------- pages + roving focus ---------- */
    let fs = 0, fr = ROWS - 1;
    cells[fs][fr].tabIndex = 0;
    function rove(s, r, focus) {
      cells[fs][fr].tabIndex = -1; fs = s; fr = r;
      const c = cells[s][r]; c.tabIndex = 0;
      if (focus) c.focus({ preventScroll: true });
    }
    function setPage(p, anim) {
      page = view === 16 ? 0 : p;
      grid.dataset.page = page;
      pgBtns.forEach((b, i) => b.setAttribute('aria-pressed', i === page ? 'true' : 'false'));
      if (view === 8 && (fs >> 3) !== page) rove(page * 8 + (fs & 7), fr, grid.contains(document.activeElement));
      if (lit >= 0) placeHead(lit);
      if (anim && motionOK()) grid.animate([{ opacity: 0.35, transform: `translateX(${page ? 14 : -14}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    pagesEl.addEventListener('click', e => { const b = e.target.closest('.ml-pg'); if (!b) return; follow = false; if (+b.dataset.page !== page) setPage(+b.dataset.page, true); });

    /* ---------- transport (lookahead scheduling on the audio clock) ---------- */
    let playing = false, follow = false, cur = 0, nextT = 0, timer = 0, raf = 0, queue = [], lit = -1, ringI = 0;
    function placeHead(s) {
      const on = s >= 0 && visible(s);
      head.classList.toggle('on', on);
      if (on) head.style.transform = `translateX(${colX(s)}px)`;
    }
    function light(s) {
      if (lit >= 0) { ledEls[lit].classList.remove('now'); miniEls[lit].classList.remove('now'); }
      if (s >= 0 && follow && view === 8 && (s >> 3) !== page) setPage(s >> 3, true);   // watching, not editing: pages follow the playhead
      lit = s; placeHead(s);
      if (s < 0) return;
      ledEls[s].classList.add('now'); miniEls[s].classList.add('now');
      if (!motionOK()) return;
      if (s % 2 === 0) pulse.animate([{ transform: 'scale(.94)', opacity: s % 8 === 0 ? 0.95 : 0.6 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' });
      if (!pat[s] || !visible(s)) return;
      for (let r = 0; r < ROWS; r++) {
        if (!isOn(s, r)) continue;
        cells[s][r].animate([{ transform: 'scale(1.16)', backgroundColor: FLASH }, { transform: 'scale(1)', backgroundColor: LILAC }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
        const ring = rings[ringI++ % rings.length], x = colX(s) + S / 2, y = rowY(r) + S / 2;
        ring.animate([{ transform: `translate(${x}px, ${y}px) scale(.3)`, opacity: 0.95 }, { transform: `translate(${x}px, ${y}px) scale(.75)`, opacity: 0.5, offset: 0.4 }, { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 0 }], { duration: 820, easing: 'cubic-bezier(.2,.65,.35,1)' });
      }
    }
    function scheduler() {
      const ctx = Sound.ctx, sd = stepDur();
      if (nextT < ctx.currentTime - 0.05) nextT = ctx.currentTime + 0.03;   // resync after a stall
      while (nextT < ctx.currentTime + 0.12) {
        const m = pat[cur];
        if (m) {
          const n = bits(m), v = (cur % 4 === 0 ? 1 : 0.86) * (n > 2 ? Math.sqrt(2 / n) : 1);
          for (let r = 0; r < ROWS; r++) if ((m >> r) & 1) voice(FREQ[r], nextT, v);
        }
        queue.push({ s: cur, t: nextT });
        cur = (cur + 1) % STEPS; nextT += sd;
      }
      timer = setTimeout(scheduler, 25);
    }
    function frame() {
      const now = Sound.ctx.currentTime; let s = -1;
      while (queue.length && queue[0].t <= now) s = queue.shift().s;
      if (s >= 0) light(s);
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (playing) return;
      const ctx = audio();
      if (!ctx) { say('Bu tarayıcı ses üretemiyor.'); return; }
      playing = true; follow = true; cur = 0; queue = []; nextT = ctx.currentTime + 0.06;
      scheduler(); raf = requestAnimationFrame(frame);
      playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Durdur'); playBtn.innerHTML = ICON.stop;
    }
    function stop() {
      playing = false; clearTimeout(timer); cancelAnimationFrame(raf); queue = []; light(-1);
      playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Çal'); playBtn.innerHTML = ICON.play;
    }
    const toggle = () => (playing ? stop() : play());

    /* ---------- controls ---------- */
    let undo = null, undoT = 0;
    function resetUndo() { if (undo) { undo = null; clearTimeout(undoT); clearBtn.textContent = 'Temizle'; } }
    function clearAll() {
      if (undo) { const u = undo; resetUndo(); loadPattern(u.p, {}); preset = u.preset; syncPresets(); save(); say('Melodi geri geldi.'); return; }
      if (!pat.some(Boolean)) return;
      const snap = { p: pat.slice(), preset };
      pat.fill(0); preset = null; render(); save();
      undo = snap; clearBtn.textContent = 'Geri al';
      clearTimeout(undoT); undoT = setTimeout(resetUndo, 4500);
      vibrate(10); say('Izgara temizlendi.');
    }
    function randomize() {
      resetUndo(); loadPattern(randomPattern(), {});
      vibrate(10); say('Yeni bir melodi hazır.');
      if (!playing) play(); else follow = true;
    }
    playBtn.addEventListener('click', toggle);
    bpmIn.addEventListener('input', () => { bpm = +bpmIn.value; syncTempo(); save(); });
    echoBtn.addEventListener('click', () => {
      echo = !echo; echoBtn.setAttribute('aria-pressed', echo); save();
      if (A) A.send.gain.setTargetAtTime(echo ? 1 : 0, Sound.ctx.currentTime, 0.03);
    });
    function setSound(k, preview) {
      if (!SOUNDS[k]) return;
      snd = k; syncSound(); save();
      if (preview && !playing) audition(7);
    }
    $('.ml-sound .seg', el).addEventListener('click', e => { const b = e.target.closest('[data-snd]'); if (b) setSound(b.dataset.snd, true); });
    clearBtn.addEventListener('click', clearAll);
    randBtn.addEventListener('click', randomize);
    $('.ml-presets', el).addEventListener('click', e => {
      const b = e.target.closest('[data-preset]'); if (!b) return;
      resetUndo(); loadPattern(presetPat(b.dataset.preset), { preset: b.dataset.preset });
      if (view === 8 && page) setPage(0, true);
      if (!playing) play(); else follow = true;
    });

    /* ---------- grid: tap toggles, drag paints ---------- */
    let paint = null;
    const cellAt = (x, y) => { const h = document.elementFromPoint(x, y); const c = h && h.closest ? h.closest('.ml-cell') : null; return c && grid.contains(c) ? c : null; };
    board.addEventListener('pointerdown', e => {
      const c = e.target.closest('.ml-cell'); if (!c || e.button > 0) return;
      e.preventDefault();
      const s = +c.dataset.s, r = +c.dataset.r;
      follow = false; vibrate(6);
      paint = { val: !isOn(s, r), id: e.pointerId, last: c };
      setCell(s, r, paint.val, true); rove(s, r, false);
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
    });
    board.addEventListener('pointermove', e => {
      if (!paint || e.pointerId !== paint.id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (evs.length ? evs : [e]).forEach(ev => {
        const c = cellAt(ev.clientX, ev.clientY);
        if (!c || c === paint.last) return;
        paint.last = c; setCell(+c.dataset.s, +c.dataset.r, paint.val, true);
      });
    });
    const endPaint = e => { if (paint && (!e || e.pointerId === paint.id)) { paint = null; save(); } };
    board.addEventListener('pointerup', endPaint);
    board.addEventListener('pointercancel', endPaint);
    board.addEventListener('lostpointercapture', endPaint);
    grid.addEventListener('click', e => {
      if (e.detail !== 0) return;                       // keyboard activation only; pointers are handled above
      const c = e.target.closest('.ml-cell'); if (!c) return;
      const s = +c.dataset.s, r = +c.dataset.r;
      setCell(s, r, !isOn(s, r), true); save();
    });
    grid.addEventListener('focusin', e => { const c = e.target.closest('.ml-cell'); if (c) rove(+c.dataset.s, +c.dataset.r, false); });

    const onVis = () => { if (document.hidden && playing) stop(); };
    document.addEventListener('visibilitychange', onVis);
    let ro = null, rraf = 0;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(layout); }); ro.observe(el); }

    let alive = true;
    syncTempo(); render(); layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) layout(); }).catch(() => {});
    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key;
        if (k === ' ') { e.preventDefault(); if (!e.repeat) toggle(); return; }
        if (e.repeat) { if (!k.startsWith('Arrow')) return; }
        const cell = e.target && e.target.closest ? e.target.closest('.ml-cell') : null;
        if (cell && k.startsWith('Arrow')) {
          e.preventDefault(); follow = false;
          let s = +cell.dataset.s, r = +cell.dataset.r;
          if (k === 'ArrowLeft') s = Math.max(0, s - 1);
          else if (k === 'ArrowRight') s = Math.min(STEPS - 1, s + 1);
          else if (k === 'ArrowUp') r = Math.min(ROWS - 1, r + 1);
          else if (k === 'ArrowDown') r = Math.max(0, r - 1);
          if (view === 8 && (s >> 3) !== page) setPage(s >> 3, true);
          rove(s, r, true);
          return;
        }
        if (view === 8 && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); setPage(k === 'ArrowLeft' ? 0 : 1, true); return; }
        const lk = k.toLocaleLowerCase('tr');
        if (lk === 'r') { e.preventDefault(); randomize(); }
        else if (lk === 'c') { e.preventDefault(); clearAll(); }
        else if (k >= '1' && k <= '3') { e.preventDefault(); setSound(SND[+k - 1], true); }
      },
      destroy() {
        alive = false; stop(); resetUndo();
        document.removeEventListener('visibilitychange', onVis);
        if (ro) ro.disconnect(); cancelAnimationFrame(rraf);
        if (A && Sound.ctx) {
          const n = A, t = Sound.ctx.currentTime; A = null;
          n.bus.gain.setTargetAtTime(0, t, 0.03); n.wet.gain.setTargetAtTime(0, t, 0.03);
          setTimeout(() => { Object.values(n).forEach(x => { try { x.disconnect(); } catch (err) {} }); }, 260);
        }
      },
    };
  },
});
})();
