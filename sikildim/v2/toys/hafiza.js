/* Hafıza — Simon tarzı dizi hafızası: kareler sırayla yanar, sen aynı sırayla dokunursun */
(() => {
'use strict';
/* Two levels. Step = one note of the playback (light + gap); it shrinks a little every round. */
const LEVELS = {
  normal: { name: 'Normal', n: 2, base: 720, min: 330, k: 0.955, pause: 620, note: '4 kare' },
  zor: { name: 'Zor', n: 3, base: 560, min: 250, k: 0.95, pause: 500, note: '9 kare · hızlı' },
};
const LVL_IDS = ['normal', 'zor'];
/* Pads in reading order (1 = top-left). Pitches: C major pentatonic, low to high, so any sequence sounds like a tune.
   Zor's 3×3 is a colour wheel around a lilac centre: yellow → orange → red → pink → blue → sky → green → lime. */
const PADS = {
  normal: [
    { c: 'green', name: 'Yeşil', f: 392.00 }, { c: 'red', name: 'Kırmızı', f: 523.25 },
    { c: 'yellow', name: 'Sarı', f: 659.25 }, { c: 'sky', name: 'Mavi', f: 880.00 },
  ],
  zor: [
    { c: 'yellow', name: 'Sarı', f: 392.00 }, { c: 'orange', name: 'Turuncu', f: 440.00 }, { c: 'red', name: 'Kırmızı', f: 523.25 },
    { c: 'lime', name: 'Açık yeşil', f: 587.33 }, { c: 'lilac', name: 'Lila', f: 659.25 }, { c: 'pink', name: 'Pembe', f: 783.99 },
    { c: 'green', name: 'Yeşil', f: 880.00 }, { c: 'sky', name: 'Açık mavi', f: 1046.50 }, { c: 'cobalt', name: 'Mavi', f: 1174.66 },
  ],
};
const RING = { 2: [0, 1, 3, 2], 3: [0, 1, 2, 5, 8, 7, 6, 3, 4] };   // clockwise sweep for the intro shimmer
const RUN = ['count', 'show', 'input', 'wait', 'fail', 'paused'];
const PRAISE = ['Doğru', 'Aynen', 'Tam isabet', 'Harika', 'Devam'];
const MIN_LIT = 140;                                                 // a quick tap still flashes visibly
const SEG_MAX = 24;                                                  // above this the progress pips become one bar

function readData() {
  const s = store.get('hafiza', null), o = s && typeof s === 'object' ? s : {};
  const b = o.best && typeof o.best === 'object' ? o.best : {};
  const num = v => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : 0);
  return { lvl: LVL_IDS.includes(o.lvl) ? o.lvl : 'normal', best: { normal: num(b.normal), zor: num(b.zor) }, plays: num(o.plays) };
}
const rating = (s, zor) => {
  const v = s + (zor ? 3 : 0);
  return s === 0 ? 'Bir daha dene' : v <= 3 ? 'Isınma turu' : v <= 6 ? 'Fena değil' : v <= 9 ? 'Sağlam hafıza' : v <= 13 ? 'Fil hafızası' : 'Efsane';
};
const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>';
const RESTART_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>';
const X_SVG = '<svg class="hf-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

registerToy('hafiza', {
  name: 'Hafıza', color: 'teal', cf: 'on-light', kind: 'Hafıza', open: 'Hafıza’yı aç',
  cats: ['kafa', 'oyun'],
  desc: 'Yanan kareleri aynı sırayla tekrarla. Dizi her turda bir adım uzar.',
  art: '<div class="art-hafiza"><i class="hf-tl"></i><i class="hf-tr on"></i><i class="hf-bl"></i><i class="hf-br"></i></div>',
  stat: () => {
    const d = readData(), other = d.lvl === 'zor' ? 'normal' : 'zor';
    const pick = d.best[d.lvl] ? d.lvl : d.best[other] ? other : null;
    if (!pick) return 'Henüz rekor yok';
    return `Rekor ${fmt(d.best[pick])}${pick === 'zor' ? ' · Zor' : ''}`;
  },
  css: `
.art-hafiza { display: grid; grid-template-columns: repeat(2, 50px); grid-auto-rows: 50px; gap: 8px; padding-bottom: 4px; }
.art-hafiza i {
  border-radius: 11px; background: rgba(22, 23, 26, .2); box-shadow: 0 4px 0 rgba(22, 23, 26, .2);
  animation: hf-art 3.6s infinite;
}
.art-hafiza .hf-tl { border-top-left-radius: 27px; animation-delay: 1.8s; }
.art-hafiza .hf-tr { border-top-right-radius: 27px; animation-delay: 0s; }
.art-hafiza .hf-bl { border-bottom-left-radius: 27px; animation-delay: .9s; }
.art-hafiza .hf-br { border-bottom-right-radius: 27px; animation-delay: 2.7s; }
.art-hafiza .on { background: var(--paper); transform: translateY(3px); box-shadow: 0 1px 0 rgba(22, 23, 26, .24), 0 0 0 4px rgba(255, 253, 248, .22); }
@keyframes hf-art {
  0%, 22% { background: var(--paper); transform: translateY(3px); box-shadow: 0 1px 0 rgba(22, 23, 26, .24), 0 0 0 4px rgba(255, 253, 248, .22); }
  24.5%, 100% { background: rgba(22, 23, 26, .2); transform: none; box-shadow: 0 4px 0 rgba(22, 23, 26, .2), 0 0 0 4px rgba(255, 253, 248, 0); }
}

.hafiza-root { --bs: 320px; gap: clamp(12px, 2.1vh, 20px); user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.hafiza-root .hf-w { width: var(--bs); min-width: min(100%, 288px); max-width: 100%; }

.hafiza-root .hf-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.hafiza-root .hf-nums { display: flex; align-items: flex-start; gap: 20px; min-width: 0; }
.hafiza-root .hf-num { display: grid; gap: 5px; min-width: 44px; }
.hafiza-root .hf-num .mono { color: var(--mute); line-height: 1; }
.hafiza-root .hf-num b { justify-self: start; font-size: 30px; font-weight: 760; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.hafiza-root .hf-best b { font-size: 22px; padding-bottom: 5px; background: linear-gradient(var(--c), var(--c)) 0 100% / 0 3.5px no-repeat; transition: background-size .5s var(--ease); }
.hafiza-root .hf-best.hot b { background-size: 100% 3.5px; }
.hafiza-root .hf-lvl { flex-wrap: nowrap; transition: opacity .25s; }
.hafiza-root .hf-lvl button { min-height: 40px; }
.hafiza-root .hf-lvl.locked { opacity: .45; }
.hafiza-root .hf-lvl button:disabled { cursor: default; }

.hafiza-root .hf-rail { display: grid; gap: 10px; }
.hafiza-root .hf-rail-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 24px; }
.hafiza-root .hf-msg { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 18px; font-weight: 650; line-height: 1.2; letter-spacing: -.02em; }
.hafiza-root .hf-msg span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hafiza-root .hf-dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--line-2); transition: background .2s; }
.hafiza-root[data-mode="count"] .hf-dot, .hafiza-root[data-mode="show"] .hf-dot { background: var(--fg); }
.hafiza-root[data-mode="input"] .hf-dot, .hafiza-root[data-mode="wait"] .hf-dot { background: var(--c); }
.hafiza-root[data-mode="input"] .hf-dot { animation: hf-ping 1.6s var(--ease) infinite; }
.hafiza-root[data-mode="fail"] .hf-dot { background: var(--bad); }
@keyframes hf-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 55%, transparent); } 70%, 100% { box-shadow: 0 0 0 9px color-mix(in srgb, var(--c) 0%, transparent); } }
.hafiza-root .hf-count { flex: none; color: var(--mute); white-space: nowrap; font-variant-numeric: tabular-nums; }
.hafiza-root .hf-segs { display: flex; gap: 4px; height: 6px; }
.hafiza-root .hf-segs i { flex: 1 1 0; max-width: 28px; border-radius: 3px; background: var(--panel-3); transition: background .18s; }
.hafiza-root .hf-segs i.seen { background: color-mix(in srgb, var(--fg) 34%, var(--panel-3)); }
.hafiza-root .hf-segs i.now { background: var(--fg); transition: none; }
.hafiza-root .hf-segs i.on { background: var(--c); transition: none; }
.hafiza-root .hf-segs.hf-bar { border-radius: 3px; background: var(--panel-3); }
.hafiza-root .hf-segs.hf-bar i { flex: none; width: 0; max-width: none; transition: width .15s var(--ease); }
.hafiza-root .hf-msg.nudge { animation: hf-nudge .36s var(--ease); }
@keyframes hf-nudge { 20% { transform: translateX(-5px); } 45% { transform: translateX(4px); } 70% { transform: translateX(-2px); } }

.hafiza-root .hf-board {
  --bp: 12px; --g: 12px; --d: 7px; --pr: 18px; --po: 50px; --n: 2;
  position: relative; flex: none; width: var(--bs); height: var(--bs); max-width: 100%;
  padding: var(--bp) var(--bp) calc(var(--bp) + var(--d)); border-radius: calc(var(--po) + var(--bp));
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line), 0 30px 60px -44px var(--shade);
  touch-action: none; transition: box-shadow .3s var(--ease);
}
.hafiza-root .hf-board:focus { outline: none; }
.hafiza-root .hf-board[data-mode="input"] { box-shadow: inset 0 0 0 2.5px var(--c), 0 30px 60px -44px var(--shade); }
.hafiza-root .hf-pads { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); grid-template-rows: repeat(var(--n), minmax(0, 1fr)); gap: var(--g); width: 100%; height: 100%; }
.hafiza-root .hf-pad {
  --rest: color-mix(in srgb, var(--pc) 44%, var(--panel-2));
  --side: color-mix(in srgb, var(--rest) 72%, #000);
  --dd: var(--d);
  position: relative; display: block; min-width: 0; border-radius: var(--pr); background-color: var(--rest);
  transform: translateY(calc(var(--d) - var(--dd))); box-shadow: 0 var(--dd) 0 var(--side);
  transition: transform .16s var(--ease), box-shadow .2s var(--ease), background-color .22s, opacity .3s, filter .3s, outline-color .2s;
  outline: 3px solid transparent; outline-offset: 5px;
}
.hafiza-root .hf-pad.hf-tl { border-top-left-radius: var(--po); }
.hafiza-root .hf-pad.hf-tr { border-top-right-radius: var(--po); }
.hafiza-root .hf-pad.hf-bl { border-bottom-left-radius: var(--po); }
.hafiza-root .hf-pad.hf-br { border-bottom-right-radius: var(--po); }
.hafiza-root .hf-pad::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .22s;
  background: radial-gradient(85% 70% at 50% 30%, rgba(255, 255, 255, .5), rgba(255, 255, 255, 0) 72%);
}
.hafiza-root .hf-pad.lit {
  --side: color-mix(in srgb, var(--pc) 64%, #000);
  background-color: var(--pc);
  box-shadow: 0 var(--dd) 0 var(--side), 0 0 0 calc(var(--g) * .45) color-mix(in srgb, var(--pc) 34%, transparent);
  transition-duration: .06s, .06s, 0s, .3s, .3s, .2s;
}
.hafiza-root .hf-pad.lit::before { opacity: 1; transition: none; }
.hafiza-root .hf-pad.down { --dd: 2px; }
.hafiza-root .hf-pad:focus-visible { outline-color: var(--fg); }
.hafiza-root .hf-pad kbd { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: var(--fg); transition: opacity .2s; }
.hafiza-root .hf-pad.lit kbd { color: var(--on-light); }
.hafiza-root .hf-x {
  position: absolute; left: 50%; top: 50%; width: 36%; max-width: 72px; aspect-ratio: 1; color: var(--fg);
  opacity: 0; transform: translate(-50%, -50%) scale(.5); transition: opacity .2s, transform .4s var(--spring);
}
.hafiza-root .hf-board .hf-pad.wrong { background-color: var(--rest); --side: color-mix(in srgb, var(--rest) 72%, #000); box-shadow: 0 var(--dd) 0 var(--side); }
.hafiza-root .hf-pad.wrong::before, .hafiza-root .hf-pad.wrong kbd { opacity: 0; }
.hafiza-root .hf-pad.wrong .hf-x { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.hafiza-root .hf-pad.right { outline-color: var(--fg); }
.hafiza-root .hf-board[data-mode="fail"] .hf-pad:not(.wrong):not(.right),
.hafiza-root .hf-board[data-mode="over"] .hf-pad:not(.wrong):not(.right) { opacity: .3; filter: saturate(.6); }

.hafiza-root .hf-over {
  position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; padding: 16px; border-radius: inherit; text-align: center;
  background: color-mix(in srgb, var(--panel) 74%, transparent); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  animation: fadein .35s var(--ease);
}
.hafiza-root .hf-over:not(.armed) .btn { pointer-events: none; }
.hafiza-root .hf-card { display: grid; justify-items: center; gap: 8px; animation: hf-card .5s var(--spring); }
@keyframes hf-card { from { transform: translateY(14px) scale(.96); opacity: 0; } }
.hafiza-root .hf-o-k { color: var(--mute); }
.hafiza-root .hf-rec { padding: 5px 10px; border-radius: 999px; background: var(--c); color: var(--cf); }
.hafiza-root .hf-o-big { font-size: clamp(64px, calc(var(--bs) * .29), 132px); font-weight: 800; line-height: .86; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
.hafiza-root .hf-o-sub { font-size: 17px; font-weight: 600; line-height: 1.25; letter-spacing: -.015em; }
.hafiza-root .hf-o-meta { color: var(--mute); }
.hafiza-root .hf-o-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 8px; }
.hafiza-root .hf-o-actions .btn { min-width: 116px; padding: 0 18px; }
.hafiza-root .hf-o-actions svg { width: 18px; height: 18px; flex: none; }

.hafiza-root .hf-foot { display: flex; align-items: center; justify-content: center; height: 52px; }
.hafiza-root .hf-go { flex: 1; height: 52px; font-size: 17px; }
.hafiza-root .hf-go:not(.hf-cta) {
  flex: none; height: 44px; padding: 0 18px 0 14px; gap: 8px; font-size: 15px; color: var(--mute);
  background: transparent; box-shadow: inset 0 0 0 1.5px var(--line-2); transition: color .2s, box-shadow .2s, transform .35s var(--spring);
}
.hafiza-root .hf-go:not(.hf-cta):hover { color: var(--fg); background: transparent; }
.hafiza-root .hf-go svg { width: 18px; height: 18px; flex: none; }
.hafiza-root .hf-go.hf-confirm { color: var(--bad); box-shadow: inset 0 0 0 1.5px var(--bad); }
.hafiza-root .hf-go.hf-cta { background: var(--c); color: var(--cf); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .14); }
.hafiza-root .hf-go.hf-cta:hover { background: var(--c); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .14), 0 12px 26px -16px var(--shade); }
.hafiza-root .hf-go.hf-cta kbd { color: var(--cf); }
.hafiza-root[data-mode="over"] .hf-go { visibility: hidden; }
@media (hover: none) { .hafiza-root kbd { display: none; } }
@media (min-width: 900px) and (min-height: 700px) { .hafiza-root .hf-num b { font-size: 36px; } .hafiza-root .hf-best b { font-size: 26px; } .hafiza-root .hf-msg { font-size: 19px; } }
@media (max-width: 359px) { .hafiza-root .hf-nums { gap: 14px; } .hafiza-root .hf-lvl button { padding: 0 12px; } .hafiza-root .hf-msg { font-size: 17px; } }
@media (orientation: landscape) and (max-height: 540px) {
  .hafiza-root.toy {
    display: grid; grid-template-columns: minmax(0, 300px) auto; grid-template-areas: "head board" "rail board" "foot board";
    justify-content: center; align-content: center; column-gap: 28px; row-gap: 16px;
  }
  .hafiza-root .hf-w { width: 300px; min-width: 0; }
  .hafiza-root .hf-head { grid-area: head; align-self: end; }
  .hafiza-root .hf-rail { grid-area: rail; }
  .hafiza-root .hf-board { grid-area: board; }
  .hafiza-root .hf-foot { grid-area: foot; align-self: start; }
}
`,
  hint: '1–4 kareler · Zor’da 1–9 · Boşluk başlat',
  mount(el) {
    const data = readData();
    const best = data.best;
    let plays = data.plays, lvl = data.lvl, L = LEVELS[lvl];
    el.innerHTML = `
      <div class="toy hafiza-root" data-mode="idle">
        <div class="hf-head hf-w" id="hf-head">
          <div class="hf-nums">
            <div class="hf-num"><span class="mono">Tur</span><b id="hf-round">—</b></div>
            <div class="hf-num hf-best" id="hf-bestbox"><span class="mono">Rekor</span><b id="hf-best">—</b></div>
          </div>
          <div class="seg hf-lvl" id="hf-lvl" role="group" aria-label="Seviye">${LVL_IDS.map(k => `<button type="button" data-lvl="${k}" aria-pressed="${k === lvl}">${LEVELS[k].name}</button>`).join('')}</div>
        </div>
        <div class="hf-rail hf-w" id="hf-rail">
          <div class="hf-rail-top"><p class="hf-msg" id="hf-msg"><i class="hf-dot" aria-hidden="true"></i><span id="hf-msg-t"></span></p><p class="mono hf-count" id="hf-count"></p></div>
          <div class="hf-segs" id="hf-segs" aria-hidden="true"></div>
        </div>
        <div class="hf-board" id="hf-board" tabindex="-1" data-mode="idle">
          <div class="hf-pads" id="hf-pads" role="group" aria-label="Kareler"></div>
          <div class="hf-over" id="hf-over" hidden></div>
        </div>
        <div class="hf-foot hf-w" id="hf-foot"><button type="button" class="btn hf-go hf-cta" id="hf-go">Başla <kbd>Boşluk</kbd></button></div>
      </div>`;
    const rootEl = $('.hafiza-root', el), headEl = $('#hf-head', el), railEl = $('#hf-rail', el), footEl = $('#hf-foot', el);
    const board = $('#hf-board', el), padsEl = $('#hf-pads', el), overEl = $('#hf-over', el), goBtn = $('#hf-go', el), lvlEl = $('#hf-lvl', el);
    const roundEl = $('#hf-round', el), bestEl = $('#hf-best', el), bestBox = $('#hf-bestbox', el);
    const msgEl = $('#hf-msg', el), msgT = $('#hf-msg-t', el), countEl = $('#hf-count', el), segsEl = $('#hf-segs', el);
    const sideMQ = matchMedia('(orientation: landscape) and (max-height: 540px)');

    let state = 'idle', seq = [], idx = 0, startBest = 0, recShown = false, resume = null, alive = true;
    let padEls = [], ps = [], segEls = [], segN = 0, goRun = null, confirmT = 0;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, Math.max(0, ms)); timers.add(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const save = () => store.set('hafiza', { v: 1, lvl, best: { normal: best.normal, zor: best.zor }, plays });

    /* ---------- pads ---------- */
    function buildPads() {
      releaseAll();
      const P = PADS[lvl], n = L.n;
      board.style.setProperty('--n', n);
      padsEl.innerHTML = P.map((p, i) => {
        const r = Math.floor(i / n), c = i % n;
        const corner = r === 0 && c === 0 ? 'hf-tl' : r === 0 && c === n - 1 ? 'hf-tr' : r === n - 1 && c === 0 ? 'hf-bl' : r === n - 1 && c === n - 1 ? 'hf-br' : '';
        return `<button type="button" class="hf-pad ${corner}" data-i="${i}" style="--pc: var(--${p.c})" aria-label="${p.name}, ${i + 1}"><kbd>${i + 1}</kbd>${X_SVG}</button>`;
      }).join('');
      padEls = $$('.hf-pad', padsEl);
      ps = padEls.map(() => ({ held: 0, until: 0, t: 0 }));
    }
    function paint(i) {
      const s = ps[i]; if (!s) return;
      const on = s.held > 0 || s.until > performance.now() + 1;
      padEls[i].classList.toggle('lit', on); padEls[i].classList.toggle('down', on);
    }
    function flash(i, ms) {
      const s = ps[i]; if (!s) return;
      s.until = Math.max(s.until, performance.now() + ms); paint(i);
      clearTimeout(s.t); s.t = setTimeout(() => paint(i), s.until - performance.now() + 4);
    }
    function releaseAll() {
      ptr.clear();
      ps.forEach(s => { s.held = 0; s.until = 0; clearTimeout(s.t); });
      padEls.forEach(p => p.classList.remove('lit', 'down'));
    }
    const clearMarks = () => padEls.forEach(p => p.classList.remove('wrong', 'right'));

    /* ---------- sound: a soft marimba note per pad ---------- */
    function voice(i, vol = 1) {
      const ctx = Sound.ensure(); if (!ctx) return;
      const f = PADS[lvl][i].f, t = ctx.currentTime + 0.004;
      Sound.pluck(f, t, 0.17 * vol);
      Sound.tone(f * 2, { type: 'sine', dur: 0.2, vol: 0.026 * vol, when: t });
    }
    function okSound() {
      const ctx = Sound.ctx; if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime + 0.02;
      Sound.tone(1567.98, { type: 'sine', dur: 0.12, vol: 0.04, when: t });
      Sound.tone(2093.0, { type: 'sine', dur: 0.22, vol: 0.036, when: t + 0.075 });
    }

    /* ---------- rail: message, counter, progress pips ---------- */
    function msg(text, count) { msgT.textContent = text; countEl.textContent = count || ''; }
    function nudge() {
      msgEl.classList.remove('nudge');
      if (!motionOK()) return;
      void msgEl.offsetWidth; msgEl.classList.add('nudge');
    }
    function segs(n) {
      segN = n;
      segsEl.classList.toggle('hf-bar', n > SEG_MAX);
      segsEl.innerHTML = n > SEG_MAX ? '<i></i>' : '<i></i>'.repeat(n);
      segEls = $$('i', segsEl);
    }
    function segShow(k) {
      if (segN > SEG_MAX) { segEls[0].className = 'now'; segEls[0].style.width = ((k + 1) / segN * 100) + '%'; return; }
      segEls.forEach((s, j) => { s.className = j < k ? 'seen' : j === k ? 'now' : ''; });
    }
    function segInput(k) {
      if (segN > SEG_MAX) { segEls[0].className = 'on'; segEls[0].style.width = (k / segN * 100) + '%'; return; }
      segEls.forEach((s, j) => { s.className = j < k ? 'on' : ''; });
    }

    /* ---------- modes ---------- */
    function setMode(m) {
      state = m; rootEl.dataset.mode = m; board.dataset.mode = m;
      const running = RUN.includes(m);
      lvlEl.classList.toggle('locked', running);
      $$('button', lvlEl).forEach(b => { b.disabled = running && b.dataset.lvl !== lvl; });
      if (running !== goRun) { goRun = running; unconfirm(); }
    }
    /* The in-run button sits right under the pads: once a run has some progress it asks for a second tap. */
    function unconfirm() {
      clearTimeout(confirmT); goBtn.classList.remove('hf-confirm');
      if (goRun) { goBtn.classList.remove('hf-cta'); goBtn.innerHTML = RESTART_SVG + 'Baştan başla'; }
      else { goBtn.classList.add('hf-cta'); goBtn.innerHTML = 'Başla <kbd>Boşluk</kbd>'; }
    }
    function onGo() {
      if (goRun && seq.length >= 3 && state !== 'fail' && !goBtn.classList.contains('hf-confirm')) {
        goBtn.classList.add('hf-confirm'); goBtn.innerHTML = RESTART_SVG + 'Emin misin? Bir daha dokun';
        clearTimeout(confirmT); confirmT = setTimeout(unconfirm, 2800);
        return;
      }
      start();
    }
    function syncBest() { bestEl.textContent = best[lvl] ? fmt(best[lvl]) : '—'; }
    function idle() {
      clearTimers(); releaseAll(); clearMarks();
      overEl.hidden = true; overEl.classList.remove('armed'); overEl.innerHTML = '';
      seq = []; idx = 0; setMode('idle');
      roundEl.textContent = '—'; syncBest(); bestBox.classList.remove('hot');
      msg('İzle, sonra tekrarla', L.note); segs(0);
    }
    function intro() {
      if (!motionOK()) return;
      RING[L.n].forEach((p, k) => later(() => { if (state === 'idle') flash(p, 170); }, 160 + k * 75));
    }

    /* ---------- game ---------- */
    const stepMs = n => Math.max(L.min, Math.round(L.base * Math.pow(L.k, n - 1)));
    function randPad() {
      const N = L.n * L.n; let p;
      do { p = Math.floor(Math.random() * N); } while (seq.length >= 2 && p === seq[seq.length - 1] && p === seq[seq.length - 2]);
      return p;
    }
    function start() {
      Sound.ensure();
      clearTimers(); releaseAll(); clearMarks();
      overEl.hidden = true; overEl.classList.remove('armed'); overEl.innerHTML = '';
      seq = []; idx = 0; startBest = best[lvl]; recShown = false;
      bestBox.classList.remove('hot'); syncBest();
      setMode('count'); unconfirm(); roundEl.textContent = '1'; msg('Hazır ol', L.note); segs(1);
      board.focus({ preventScroll: true });
      resume = nextRound;
      later(nextRound, 700);
    }
    function nextRound() {
      seq.push(randPad());
      roundEl.textContent = fmt(seq.length);
      segs(seq.length);
      say(`Tur ${seq.length}`);
      playback();
    }
    function playback() {
      setMode('show'); resume = playback;
      const n = seq.length, step = stepMs(n), on = Math.round(step * 0.58);
      msg('İzle', `${n} adım`); segShow(-1);
      const lead = 260;
      seq.forEach((p, k) => later(() => { flash(p, on); voice(p); segShow(k); }, lead + k * step));
      later(openInput, lead + (n - 1) * step + on + 80);
    }
    function openInput() {
      idx = 0; setMode('input'); resume = playback;
      msg('Sıra sende', `0 / ${seq.length}`); segInput(0);
      say('Sıra sende');
    }
    function judge(i) {
      if (i !== seq[idx]) { fail(i); return; }
      idx++;
      segInput(idx); countEl.textContent = `${idx} / ${seq.length}`;
      if (idx === seq.length) roundDone();
    }
    function roundDone() {
      const n = seq.length;
      setMode('wait'); resume = nextRound;
      let rec = false;
      if (n > best[lvl]) {
        best[lvl] = n; save(); syncBest();
        if (startBest > 0) { bestBox.classList.add('hot'); if (!recShown) { recShown = true; rec = true; } }
      }
      if (rec) { msg('Yeni rekor!', `${n} / ${n}`); later(() => Sound.chime(), 140); say('Yeni rekor!'); }
      else { msg(PRAISE[(n - 1) % PRAISE.length], `${n} / ${n}`); later(okSound, 120); }
      vibrate(10);
      if (motionOK()) padsEl.animate([{ transform: 'none' }, { transform: 'scale(1.014)' }, { transform: 'none' }], { duration: 340, delay: 90, easing: 'cubic-bezier(.2,.8,.2,1)' });
      later(nextRound, L.pause + 240);
    }
    function fail(i) {
      const want = seq[idx];
      setMode('fail'); resume = null;
      padEls[i].classList.add('wrong');
      Sound.buzz(); vibrate([40, 60, 40]);
      msg('Yanlış kare', `Doğrusu: ${PADS[lvl][want].name}`);
      say(`Yanlış. Doğrusu ${PADS[lvl][want].name}.`);
      if (motionOK()) padEls[i].animate([{ translate: '0 0' }, { translate: '-7px 0' }, { translate: '6px 0' }, { translate: '-4px 0' }, { translate: '2px 0' }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
      later(() => { padEls[want].classList.add('right'); flash(want, 300); voice(want, 0.85); }, 460);
      later(() => flash(want, 300), 900);
      later(() => flash(want, 300), 1340);
      later(showOver, 1900);
    }
    function showOver() {
      setMode('over'); msg('Bir tur daha?', L.note);
      const score = Math.max(0, seq.length - 1), zor = lvl === 'zor';
      const rec = score > 0 && score > startBest && score >= best[lvl], first = rec && startBest === 0;
      plays++; save();
      overEl.innerHTML = `
        <div class="hf-card">
          ${rec ? `<p class="mono hf-rec">${first ? 'İlk rekorun' : 'Yeni rekor'}</p>` : '<p class="mono hf-o-k">Oyun bitti</p>'}
          <p class="hf-o-big">${fmt(score)}</p>
          <p class="hf-o-sub">${score ? 'adımlık diziyi hatırladın' : 'İlk adımda kaçtı'}</p>
          <p class="mono hf-o-meta">${rating(score, zor)} · Rekor ${fmt(best[lvl])}${zor ? ' · Zor' : ''}</p>
          <div class="hf-o-actions">
            <button type="button" class="btn primary" data-act="again">Tekrar <kbd>Boşluk</kbd></button>
            ${score ? `<button type="button" class="btn" data-act="share">${SHARE_SVG}Paylaş</button>` : ''}
          </div>
        </div>`;
      overEl.classList.remove('armed'); overEl.hidden = false;
      if (rec && !first) Sound.chime();
      say(`Oyun bitti. ${score} adım. ${rec ? 'Yeni rekor.' : `Rekor ${best[lvl]}.`}`);
      later(() => {
        overEl.classList.add('armed');
        const b = $('[data-act="again"]', overEl); if (b) b.focus({ preventScroll: true });
      }, 520);
    }
    function share() {
      const score = Math.max(0, seq.length - 1);
      shareResult({
        title: 'Sıkıldım · Hafıza',
        text: `Hafıza’da ${score} adımlık diziyi hatasız tekrarladım${lvl === 'zor' ? ' (Zor, 9 kare)' : ''}. Sen kaç adım gidebilirsin?`,
        url: siteUrl() + '#hafiza',
      });
    }
    function setLevel(k) {
      if (!LEVELS[k] || k === lvl || RUN.includes(state)) return;
      lvl = k; L = LEVELS[k]; save();
      $$('button', lvlEl).forEach(b => b.setAttribute('aria-pressed', b.dataset.lvl === lvl));
      buildPads(); idle(); layout(); intro();
      Sound.blip(k === 'zor' ? 880 : 660, 0.05, 0.08, 'triangle');
      say(k === 'zor' ? 'Zor: dokuz kare, daha hızlı.' : 'Normal: dört kare.');
    }

    /* ---------- input ---------- */
    const accepting = () => state === 'idle' || state === 'input';
    function hit(i) {
      const wrong = state === 'input' && i !== seq[idx];
      if (!wrong) voice(i);                                 // a wrong pad only buzzes
      flash(i, MIN_LIT);
      if (state === 'input') judge(i);
    }
    function refuse() { if (state === 'show' || state === 'count' || state === 'wait') { nudge(); if (state === 'show') msg('Önce izle', `${seq.length} adım`); } }
    const ptr = new Map();
    function onDown(e) {
      if (e.button > 0) return;
      const p = e.target.closest('.hf-pad'); if (!p || !padsEl.contains(p)) return;
      e.preventDefault();
      if (!accepting()) { refuse(); return; }
      const i = +p.dataset.i;
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
      ptr.set(e.pointerId, i); ps[i].held++;
      hit(i);
    }
    function onUp(e) {
      if (!ptr.has(e.pointerId)) return;
      const i = ptr.get(e.pointerId); ptr.delete(e.pointerId);
      if (ps[i]) { ps[i].held = Math.max(0, ps[i].held - 1); paint(i); }
      Sound.ensure();   // touch pointerdown is not a user activation on every browser; pointerup is
    }
    function keyPress(i) {
      if (!padEls[i]) return;
      if (!accepting()) { refuse(); return; }
      hit(i); flash(i, 170);
    }
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onUp);
    board.addEventListener('lostpointercapture', onUp);
    padsEl.addEventListener('click', e => { if (e.detail !== 0) return; const p = e.target.closest('.hf-pad'); if (p) keyPress(+p.dataset.i); });
    padsEl.addEventListener('contextmenu', e => e.preventDefault());
    goBtn.addEventListener('click', onGo);
    lvlEl.addEventListener('click', e => {
      const b = e.target.closest('[data-lvl]'); if (!b) return;
      setLevel(b.dataset.lvl);
      if (e.detail) board.focus({ preventScroll: true });   // after a mouse click, Space should start, not re-press the switch
    });
    overEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || !overEl.classList.contains('armed')) return;
      if (b.dataset.act === 'again') start(); else share();
    });

    /* Leaving the app mid-round would make you miss the playback: pause, then show the round again on return. */
    const onVis = () => {
      if (document.hidden) {
        if (['count', 'show', 'input', 'wait'].includes(state)) {
          clearTimers(); releaseAll(); setMode('paused'); segInput(0); msg('Ara verildi', '');
        }
      } else if (state === 'paused') {
        const fn = resume || playback;
        setMode('count'); msg('Tur baştan gösterilecek', '');
        later(fn, 900);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    /* ---------- layout: the board is the biggest square that fits ---------- */
    function layout() {
      const cs = getComputedStyle(el);
      const cw = Math.min(1100, el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
      const ch = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const gap = parseFloat(getComputedStyle(rootEl).rowGap) || 14;
      let bs;
      if (sideMQ.matches) bs = Math.min(ch, cw - 300 - 28);
      else bs = Math.min(cw, ch - headEl.offsetHeight - railEl.offsetHeight - footEl.offsetHeight - gap * 3);
      bs = Math.floor(clamp(bs, 200, 560));
      const two = L.n === 2;
      rootEl.style.setProperty('--bs', bs + 'px');
      board.style.setProperty('--bp', Math.round(clamp(bs * 0.034, 9, 18)) + 'px');
      board.style.setProperty('--g', Math.round(clamp(bs * (two ? 0.036 : 0.03), 8, 18)) + 'px');
      board.style.setProperty('--d', (two ? (bs < 300 ? 6 : 7) : (bs < 300 ? 4 : 5)) + 'px');
      board.style.setProperty('--pr', Math.round(bs * (two ? 0.05 : 0.036)) + 'px');
      board.style.setProperty('--po', Math.round(bs * (two ? 0.15 : 0.1)) + 'px');
    }
    const relayout = () => { layout(); layout(); };
    let ro = null, rraf = 0, lastW = 0, lastH = 0;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        if (el.clientWidth === lastW && el.clientHeight === lastH) return;
        lastW = el.clientWidth; lastH = el.clientHeight;
        cancelAnimationFrame(rraf); rraf = requestAnimationFrame(() => { if (alive) relayout(); });
      });
      ro.observe(el);
    }

    buildPads(); idle(); relayout(); intro();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) relayout(); }).catch(() => {});

    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key, inRoot = e.target && e.target.closest && rootEl.contains(e.target);
        const onBtn = inRoot && e.target.closest('button');
        if (k >= '1' && k <= '9' && k.length === 1) {
          e.preventDefault();
          if (!e.repeat && +k <= L.n * L.n) keyPress(+k - 1);
          return;
        }
        if (k === ' ' || k === 'Enter') {
          if (onBtn) return;                                    // let the focused button do its own thing
          if (k === 'Enter' && e.target && e.target.closest && e.target.closest('button, a')) return;
          e.preventDefault();
          if (e.repeat) return;
          if (state === 'idle') start();
          else if (state === 'over' && overEl.classList.contains('armed')) start();
        }
      },
      destroy() {
        alive = false; clearTimers(); releaseAll(); clearTimeout(confirmT);
        board.removeEventListener('pointerdown', onDown);
        board.removeEventListener('pointerup', onUp);
        board.removeEventListener('pointercancel', onUp);
        board.removeEventListener('lostpointercapture', onUp);
        document.removeEventListener('visibilitychange', onVis);
        if (ro) ro.disconnect(); cancelAnimationFrame(rraf);
      },
    };
  },
});
})();
