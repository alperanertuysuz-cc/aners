/* Yılan — klasik yılan; telefonda her yerden kaydırarak, masaüstünde oklarla */
(() => {
'use strict';
const LONG_TALL = 27, LONG_WIDE = 21;            // grid: short side 15 (phones) or 17 cells; portrait boards grow taller to fill the screen
const BASE_RATE = 7, RATE_STEP = 0.1, MAX_RATE = 12.5; // moves per second
const BONUS_MS = 6500, BONUS_PTS = 5, DEATH_MS = 620;
const PENTA = [0, 2, 4, 7, 9];
const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
const MODES = ['duvar', 'duvarsiz'];
const MODE_NAME = { duvar: 'Duvarlı', duvarsiz: 'Duvarsız' };
const CAUSE = { wall: 'Duvara çarptın', self: 'Kuyruğunu ısırdın', full: 'Tahta doldu. Efsane!' };
const TAPER = [0.68, 0.8, 0.91];                 // tail-end segment sizes (tail first)

function readBest() {
  const b = store.get('yilan-best', null) || {};
  return { duvar: Math.max(0, Math.floor(+b.duvar) || 0), duvarsiz: Math.max(0, Math.floor(+b.duvarsiz) || 0) };
}
const SHARE_SVG = '<svg class="share-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>';
const PAUSE_SVG = '<svg class="ic-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.6" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.6" fill="currentColor"/></svg>';
const SWIPE_SVG = '<svg class="yl-swipe" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 9 5-5 5 5"/><path d="m19 39 5 5 5-5"/><path d="m9 19-5 5 5 5"/><path d="m39 19 5 5-5 5"/><rect x="17" y="17" width="14" height="14" rx="4.5" fill="currentColor" stroke="none"/></svg>';

/* Tile art: cells are 20px with a 4px gap (24px pitch); a spine path joins the segment centres like in the game. */
const ART_CELLS = [[0, 3, 't0'], [1, 3, 't1'], [2, 3, 't2'], [2, 2, ''], [2, 1, ''], [3, 1, ''], [4, 1, 'h'], [6, 1, 'f']];
const ART = `<div class="art-yilan"><svg viewBox="0 0 164 92" aria-hidden="true"><path d="M10 82H58V34H106"/></svg>${ART_CELLS.map(([x, y, c]) => `<i class="${c}" style="--x:${x};--y:${y}"></i>`).join('')}</div>`;

registerToy('yilan', {
  name: 'Yılan', color: 'lime', cf: 'on-light', kind: 'Arcade', open: 'Yılan’ı aç',
  cats: ['oyun'],
  desc: 'Kaydırarak yön ver, yemi kap, uza ve kendi kuyruğuna dikkat et.',
  art: ART,
  stat: () => { const b = readBest(), m = Math.max(b.duvar, b.duvarsiz); return m ? `Rekor ${fmt(m)}` : 'Henüz rekor yok'; },
  css: `
.art-yilan { position: relative; width: 164px; height: 92px; }
.art-yilan svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.art-yilan path { fill: none; stroke: var(--on-light); stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; }
.art-yilan i {
  position: absolute; left: calc(var(--x) * 24px); top: calc(var(--y) * 24px); width: 20px; height: 20px;
  border-radius: 6.5px; background: var(--on-light); transition: transform .5s var(--spring);
}
.art-yilan i:not(.h):not(.f)::after { content: ""; position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 1.4px; background: var(--lime); }
.art-yilan i.t0 { transform: scale(.68); }
.art-yilan i.t1 { transform: scale(.8); }
.art-yilan i.t2 { transform: scale(.91); }
.art-yilan i.h { transform: scale(1.12); border-radius: 7.5px; }
.art-yilan i.h::before, .art-yilan i.h::after {
  content: ""; position: absolute; left: 10px; width: 6px; height: 6px; border-radius: 50%;
  background: var(--paper); box-shadow: inset -2.4px 0 0 0 var(--on-light);
}
.art-yilan i.h::before { top: 3px; }
.art-yilan i.h::after { bottom: 3px; }
.art-yilan i.f { left: calc(var(--x) * 24px + 3px); top: calc(var(--y) * 24px + 3px); width: 14px; height: 14px; border-radius: 50%; background: var(--orange); box-shadow: inset -2px -3px 0 rgba(0, 0, 0, .12); }
.tile:hover .art-yilan i.h { transform: translateX(5px) scale(1.12); }
.tile:hover .art-yilan i.f { transform: scale(1.3); }

.yilan-root { gap: clamp(10px, 1.6vh, 18px); user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; }
.yilan-root .yl-head, .yilan-root .yl-foot { width: max(var(--bw, 100%), min(100%, 296px)); max-width: 100%; }
.yilan-root .yl-head { display: flex; align-items: center; gap: 8px; }
.yilan-root .yl-nums { display: flex; align-items: flex-start; gap: 18px; min-width: 0; }
.yilan-root .yl-num { display: grid; gap: 5px; min-width: 44px; }
.yilan-root .yl-num .mono { color: var(--mute); line-height: 1; }
.yilan-root .yl-num b {
  justify-self: start; font-size: 30px; font-weight: 760; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums;
}
.yilan-root .yl-best b { font-size: 22px; padding-bottom: 5px; background: linear-gradient(var(--c), var(--c)) 0 100% / 0 3.5px no-repeat; transition: background-size .5s var(--ease); }
.yilan-root .yl-best.hot b { background-size: 100% 3.5px; }
.yilan-root .yl-tools { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.yilan-root .yl-mode { height: 44px; padding: 0 14px 0 12px; gap: 7px; }
.yilan-root .yl-mode svg { width: 16px; height: 16px; flex: none; }
.yilan-root .yl-mode[disabled] { opacity: .4; cursor: default; transform: none; }
.yilan-root .yl-mode[disabled]:not([aria-pressed="true"]) { color: var(--mute); box-shadow: inset 0 0 0 1.5px var(--line-2); }
.yilan-root .yl-mode .wall { stroke-dasharray: none; }
.yilan-root .yl-mode[aria-pressed="true"] .wall { stroke-dasharray: 3.2 2.6; }
.yilan-root .yl-pause {
  display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; flex: none;
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); transition: background .2s, transform .3s var(--spring), opacity .2s;
}
.yilan-root .yl-pause:hover { background: var(--panel-2); }
.yilan-root .yl-pause:active { transform: scale(.92); }
.yilan-root .yl-pause[disabled] { opacity: .4; cursor: default; }
.yilan-root .yl-pause svg { width: 20px; height: 20px; }
.yilan-root .yl-pause .ic-play { display: none; }
.yilan-root .yl-pause[data-paused="true"] .ic-play { display: block; }
.yilan-root .yl-pause[data-paused="true"] .ic-pause { display: none; }
@media (max-width: 359px) { .yilan-root .yl-mode svg { display: none; } .yilan-root .yl-mode { padding: 0 12px; } .yilan-root .yl-nums { gap: 12px; } }

.yilan-root .yl-board {
  position: relative; flex: none; border-radius: var(--r-lg); overflow: hidden;
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line), 0 26px 50px -38px var(--shade);
}
.yilan-root .yl-board:focus { outline: none; }
.yilan-root .yl-board canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.yilan-root .yl-over {
  position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; padding: 16px; text-align: center;
  animation: fadein .3s var(--ease);
}
.yilan-root .yl-over[data-kind="ready"] { align-items: end; padding-bottom: max(16px, 9%); }
.yilan-root .yl-over[data-kind="paused"] { background: color-mix(in srgb, var(--panel) 52%, transparent); }
.yilan-root .yl-over[data-kind="paused"][data-side="bottom"] { align-items: end; padding-bottom: max(16px, 9%); }
.yilan-root .yl-over[data-kind="paused"][data-side="top"] { align-items: start; padding-top: max(16px, 9%); }
.yilan-root .yl-over[data-kind="over"] {
  background: color-mix(in srgb, var(--panel) 74%, transparent); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
}
.yilan-root .yl-card {
  display: grid; justify-items: center; gap: 8px; max-width: 100%; padding: 16px 22px 18px; border-radius: var(--r-lg);
  background: color-mix(in srgb, var(--panel) 90%, transparent); box-shadow: inset 0 0 0 1px var(--line), 0 18px 40px -26px var(--shade);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.yilan-root .yl-over[data-kind="over"] .yl-card { background: none; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; gap: 10px; }
.yilan-root .yl-over[data-kind="ready"] .yl-card { grid-template-columns: auto auto; justify-items: start; align-items: center; column-gap: 14px; row-gap: 5px; padding: 14px 20px 14px 16px; text-align: left; }
.yilan-root .yl-over[data-kind="ready"] .yl-title { font-size: 21px; }
.yilan-root .yl-swipe { grid-row: span 2; width: 36px; height: 36px; color: var(--fg); animation: yl-nudge 2.4s var(--ease) infinite; }
@keyframes yl-nudge { 0%, 100% { transform: none; } 20% { transform: translateX(5px); } 40% { transform: none; } 60% { transform: translateY(-5px); } 80% { transform: none; } }
.yilan-root .yl-title { font-size: 25px; font-weight: 760; line-height: 1.05; letter-spacing: -.035em; }
.yilan-root .yl-sub { color: var(--mute); }
.yilan-root .yl-keys { display: none; }
@media (hover: hover) and (pointer: fine) { .yilan-root .yl-keys { display: inline; } .yilan-root .yl-touch { display: none; } }
.yilan-root .yl-cause { color: var(--mute); }
.yilan-root .yl-big { font-size: clamp(64px, 18vw, 104px); font-weight: 800; line-height: .9; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
.yilan-root .yl-rec { display: inline-block; padding: 4px 9px; border-radius: 999px; background: var(--c); color: var(--cf); }
.yilan-root .yl-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 6px; }
.yilan-root .yl-actions .btn { min-width: 124px; }
.yilan-root .yl-foot { display: flex; justify-content: space-between; gap: 12px; color: var(--mute); }
@media (orientation: landscape) and (max-height: 540px) {
  .yilan-root.toy { display: grid; grid-template-columns: auto auto; grid-template-areas: "head board" "foot board"; justify-content: center; align-content: center; gap: 12px 22px; }
  .yilan-root .yl-head { grid-area: head; align-self: end; width: auto; flex-direction: column; align-items: flex-start; gap: 14px; }
  .yilan-root .yl-tools { margin-left: 0; }
  .yilan-root .yl-board { grid-area: board; }
  .yilan-root .yl-foot { grid-area: foot; align-self: start; width: auto; flex-direction: column; gap: 4px; }
}
.yilan-root .yl-foot b { color: var(--fg); font-weight: 600; }
@media (min-width: 900px) { .yilan-root .yl-num b { font-size: 36px; } .yilan-root .yl-best b { font-size: 26px; } }
`,
  hint: 'Oklar · WASD · Boşluk duraklat',
  mount(el) {
    const best = readBest();
    let mode = store.get('yilan-mode', 'duvar');
    if (!MODES.includes(mode)) mode = 'duvar';
    el.innerHTML = `
      <div class="toy yilan-root">
        <div class="yl-head" id="yl-head">
          <div class="yl-nums">
            <div class="yl-num"><span class="mono">Skor</span><b id="yl-score">0</b></div>
            <div class="yl-num yl-best" id="yl-bestbox"><span class="mono">Rekor</span><b id="yl-best">0</b></div>
          </div>
          <div class="yl-tools">
            <button type="button" class="chip yl-mode" id="yl-mode" aria-pressed="${mode === 'duvarsiz'}" title="Kenarlardan geçip öbür taraftan çık">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect class="wall" x="1.6" y="1.6" width="12.8" height="12.8" rx="3.4"/><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/></svg>Duvarsız
            </button>
            <button type="button" class="yl-pause" id="yl-pause" aria-label="Duraklat" data-paused="false">${PAUSE_SVG}${ICON.play.replace('<svg', '<svg class="ic-play"')}</button>
          </div>
        </div>
        <div class="yl-board" id="yl-board" tabindex="-1">
          <canvas id="yl-cv" role="img" aria-label="Yılan oyun alanı"></canvas>
          <div class="yl-over" id="yl-over" hidden></div>
        </div>
        <div class="yl-foot mono" id="yl-foot"><span>Uzunluk <b id="yl-len">3</b></span><span>Hız <b id="yl-spd">7,0</b> kare/sn</span></div>
      </div>`;
    const rootEl = $('.yilan-root', el), headEl = $('#yl-head', el), footEl = $('#yl-foot', el), board = $('#yl-board', el), cv = $('#yl-cv', el);
    const overEl = $('#yl-over', el), scoreEl = $('#yl-score', el), bestEl = $('#yl-best', el), bestBox = $('#yl-bestbox', el);
    const modeBtn = $('#yl-mode', el), pauseBtn = $('#yl-pause', el), lenEl = $('#yl-len', el), spdEl = $('#yl-spd', el);
    const ctx = cv.getContext('2d');
    const bg = document.createElement('canvas'), bgx = bg.getContext('2d');
    const darkMQ = matchMedia('(prefers-color-scheme: dark)'), sideMQ = matchMedia('(orientation: landscape) and (max-height: 540px)');
    const prevTouch = el.style.touchAction;
    el.style.touchAction = 'none';

    let cols = 17, rows = 17, S = 20, PAD = 8, BW = 0, BH = 0, dpr = 1;
    let snake = [], lastTail = null, dir = DIRS.R, queue = [], food = null, bonus = null, gulp = null, fx = [];
    let state = 'ready', score = 0, eaten = 0, sinceBonus = 0, startBest = 0, acc = 0, alpha = 1, last = 0, raf = 0;
    let cause = '', deadAt = 0, alive = true, C = {}, relayRaf = 0;

    /* ---------- colours (tokens, re-read on theme change) ---------- */
    function lum(c) {
      let r = 255, g = 255, b = 255; c = (c || '').trim();
      if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.replace(/./g, m => m + m); const n = parseInt(h.slice(0, 6), 16); r = n >> 16 & 255; g = n >> 8 & 255; b = n & 255; }
      else { const m = c.match(/[\d.]+/g); if (m && m.length >= 3) [r, g, b] = m.map(Number); }
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    function readColors() {
      const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim();
      C = { panel: v('--panel'), panel2: v('--panel-2'), line: v('--line'), line2: v('--line-2'), fg: v('--fg'), lime: v('--lime'), ink: v('--on-light'), orange: v('--orange'), yellow: v('--yellow'), paper: v('--paper') };
      C.dark = lum(C.panel) < 0.5;
      C.body = C.dark ? C.lime : C.ink;      // ink snake on light boards, lime snake on dark ones
      C.mark = C.dark ? 'rgba(22, 23, 26, .2)' : 'rgba(198, 238, 75, .85)';
    }

    /* ---------- geometry ---------- */
    const rate = () => Math.min(MAX_RATE, BASE_RATE + eaten * RATE_STEP);
    const interval = () => 1000 / rate();
    const px = x => PAD + (x + 0.5) * S;
    const lerpP = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    function wrapD(dx, dy) {
      if (dx > 1) dx -= cols; else if (dx < -1) dx += cols;
      if (dy > 1) dy -= rows; else if (dy < -1) dy += rows;
      return { x: dx, y: dy };
    }
    function rr(c, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      c.beginPath(); c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    function layout(resetDims) {
      const cs = getComputedStyle(el);
      const cw = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const ch = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const rs = getComputedStyle(rootEl), gap = parseFloat(rs.rowGap) || 12;
      const side = sideMQ.matches;   // short landscape: score + tools sit beside the board
      const availW = Math.max(160, Math.min(side ? cw - Math.max(headEl.offsetWidth, footEl.offsetWidth) - (parseFloat(rs.columnGap) || 20) : cw, 1000));
      const availH = Math.max(side ? 120 : 160, side ? ch : ch - headEl.offsetHeight - footEl.offsetHeight - gap * 2);
      PAD = availW < 480 ? 7 : 10;
      const iw = availW - PAD * 2, ih = availH - PAD * 2;
      if (resetDims) {
        const short = availW < 520 ? 15 : 17;
        if (ih >= iw) { cols = short; rows = clamp(Math.floor(ih / (iw / short)), short, LONG_TALL); }
        else { rows = short; cols = clamp(Math.floor(iw / (ih / short)), short, LONG_WIDE); }
      }
      S = Math.max(8, Math.min(iw / cols, ih / rows, 38));
      BW = cols * S + PAD * 2; BH = rows * S + PAD * 2;
      rootEl.style.setProperty('--bw', BW + 'px');
      board.style.width = BW + 'px'; board.style.height = BH + 'px';
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = bg.width = Math.round(BW * dpr); cv.height = bg.height = Math.round(BH * dpr);
      paintBg();
    }
    function paintBg() {
      const c = bgx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, BW, BH);
      const fw = cols * S, fh = rows * S, fr = Math.min(S * 0.55, 14);
      if (mode === 'duvar') { c.fillStyle = C.panel2; c.fillRect(0, 0, BW, BH); c.fillStyle = C.panel; rr(c, PAD, PAD, fw, fh, fr); c.fill(); }
      c.save(); rr(c, PAD, PAD, fw, fh, fr); c.clip();
      c.fillStyle = C.line; c.globalAlpha = C.dark ? 0.5 : 0.36;
      for (let y = 0; y < rows; y++) for (let x = (y & 1); x < cols; x += 2) c.fillRect(PAD + x * S, PAD + y * S, S, S);
      c.restore();
      c.globalAlpha = 1; c.lineWidth = 1.5; c.strokeStyle = C.line2;
      if (mode === 'duvarsiz') c.setLineDash([Math.max(4, S * 0.32), Math.max(4, S * 0.26)]);
      rr(c, PAD + 0.75, PAD + 0.75, fw - 1.5, fh - 1.5, fr); c.stroke(); c.setLineDash([]);
    }

    /* ---------- drawing ---------- */
    function draw(now = performance.now()) {
      if (!BW || !snake.length) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, BW, BH);
      ctx.drawImage(bg, 0, 0, BW, BH);
      ctx.save();
      rr(ctx, PAD, PAD, cols * S, rows * S, Math.min(S * 0.55, 14)); ctx.clip();
      drawFood(now);
      drawSnake(now);
      drawFx(now);
      ctx.restore();
    }
    function drawFood(now) {
      const live = state === 'run' && motionOK();
      if (gulp) {
        const k = 1 - alpha;
        if (k > 0.02) { ctx.fillStyle = gulp.c; ctx.beginPath(); ctx.arc(px(gulp.x), px(gulp.y), S * 0.3 * k, 0, TAU); ctx.fill(); }
      }
      if (food) {
        const r = S * 0.3 * (live ? 1 + 0.06 * Math.sin(now / 160) : 1), x = px(food.x), y = px(food.y);
        ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x - r * 0.36, y - r * 0.38, r * 0.26, 0, TAU); ctx.fill();
      }
      if (bonus) {
        const x = px(bonus.x), y = px(bonus.y), p = clamp(bonus.left / BONUS_MS, 0, 1);
        const blink = bonus.left < 1600 ? 0.4 + 0.6 * Math.abs(Math.cos(now / 110)) : 1;
        const s = S * 0.44 * (live ? 1 + 0.05 * Math.sin(now / 120) : 1), rr_ = S * 0.42;
        ctx.save(); ctx.globalAlpha = blink;
        ctx.lineWidth = Math.max(1.6, S * 0.08); ctx.lineCap = 'round';
        ctx.strokeStyle = C.line2; ctx.beginPath(); ctx.arc(x, y, rr_, 0, TAU); ctx.stroke();
        ctx.strokeStyle = C.fg; ctx.beginPath(); ctx.arc(x, y, rr_, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
        ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = C.yellow; rr(ctx, -s / 2, -s / 2, s, s, s * 0.28); ctx.fill();
        ctx.restore();
      }
    }
    function drawSnake(now) {
      const n = snake.length;
      const U = [{ x: snake[0].x, y: snake[0].y }];
      for (let i = 1; i < n; i++) { const d = wrapD(snake[i].x - snake[i - 1].x, snake[i].y - snake[i - 1].y); U.push({ x: U[i - 1].x + d.x, y: U[i - 1].y + d.y }); }
      const td = wrapD(lastTail.x - snake[n - 1].x, lastTail.y - snake[n - 1].y);
      const T = { x: U[n - 1].x + td.x, y: U[n - 1].y + td.y };
      const a = alpha;
      const P = new Array(n);
      P[0] = n > 1 ? lerpP(U[1], U[0], a) : U[0];
      for (let i = 1; i < n; i++) P[i] = lerpP(i < n - 1 ? U[i + 1] : T, U[i], a);
      let bump = 0;
      if (state === 'dying' && motionOK()) bump = Math.sin(Math.PI * clamp((now - deadAt) / 240, 0, 1)) * 0.26;
      const H = { x: P[0].x + dir.x * bump, y: P[0].y + dir.y * bump };
      let x0 = H.x, x1 = H.x, y0 = H.y, y1 = H.y;
      for (let i = 1; i < n; i++) { const q = U[i]; if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
      if (T.x < x0) x0 = T.x; if (T.x > x1) x1 = T.x; if (T.y < y0) y0 = T.y; if (T.y > y1) y1 = T.y;
      const kx0 = Math.floor((x0 + 1) / cols), kx1 = Math.floor((x1 + 1) / cols), ky0 = Math.floor((y0 + 1) / rows), ky1 = Math.floor((y1 + 1) / rows);
      const seg = S * 0.8, spine = S * 0.46;
      for (let kx = kx0; kx <= kx1; kx++) for (let ky = ky0; ky <= ky1; ky++) {
        ctx.save(); ctx.translate(-kx * cols * S, -ky * rows * S);
        ctx.strokeStyle = C.body; ctx.lineWidth = spine; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(px(H.x), px(H.y));
        for (let i = 1; i < n; i++) ctx.lineTo(px(U[i].x), px(U[i].y));
        ctx.lineTo(px(P[n - 1].x), px(P[n - 1].y)); ctx.stroke();
        ctx.fillStyle = C.body;
        for (let i = n - 1; i >= 1; i--) {
          const k = n - 1 - i, s = seg * (k < 3 ? TAPER[k] : 1);
          rr(ctx, px(P[i].x) - s / 2, px(P[i].y) - s / 2, s, s, s * 0.3); ctx.fill();
        }
        ctx.fillStyle = C.mark;
        for (let i = n - 1; i >= 1; i--) {
          const k = n - 1 - i, s = S * 0.2 * (k < 3 ? TAPER[k] : 1);
          rr(ctx, px(P[i].x) - s / 2, px(P[i].y) - s / 2, s, s, s * 0.35); ctx.fill();
        }
        drawHead(px(H.x), px(H.y));
        ctx.restore();
      }
    }
    function drawHead(x, y) {
      const hs = S * 0.92;
      ctx.fillStyle = C.body; rr(ctx, x - hs / 2, y - hs / 2, hs, hs, hs * 0.36); ctx.fill();
      const fx_ = dir.x, fy = dir.y, qx = -fy, qy = fx_;
      const er = Math.max(1.6, S * 0.135), pr = Math.max(0.9, S * 0.07);
      const dead = state === 'dying' || state === 'over';
      for (const sgn of [-1, 1]) {
        const ex = x + fx_ * S * 0.13 + qx * S * 0.2 * sgn, ey = y + fy * S * 0.13 + qy * S * 0.2 * sgn;
        if (dead) {
          ctx.strokeStyle = C.dark ? C.ink : C.lime; ctx.lineWidth = Math.max(1.3, S * 0.07); ctx.lineCap = 'round';
          const d = er * 0.75;
          ctx.beginPath(); ctx.moveTo(ex - d, ey - d); ctx.lineTo(ex + d, ey + d); ctx.moveTo(ex + d, ey - d); ctx.lineTo(ex - d, ey + d); ctx.stroke();
        } else {
          ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
          ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex + fx_ * er * 0.42, ey + fy * er * 0.42, pr, 0, TAU); ctx.fill();
        }
      }
    }
    function drawFx(now) {
      for (const f of fx) {
        const t = now - f.t0 - f.delay; if (t < 0) continue;
        const p = clamp(t / f.life, 0, 1), x = px(f.x), y = px(f.y);
        ctx.save(); ctx.globalAlpha = 1 - p;
        if (f.kind === 'ring') {
          ctx.strokeStyle = f.c; ctx.lineWidth = Math.max(1, S * 0.12 * (1 - p));
          ctx.beginPath(); ctx.arc(x, y, S * (0.35 + 0.65 * (1 - Math.pow(1 - p, 3))), 0, TAU); ctx.stroke();
        } else {
          ctx.fillStyle = C.fg; ctx.font = `700 ${Math.round(S * 0.8)}px "Bricolage Grotesque", system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.text, x, y - S * (0.6 + 0.9 * p));
        }
        ctx.restore();
      }
    }

    /* ---------- game ---------- */
    function freeCells(minDist) {
      const out = [], h = snake[0], taken = new Set(snake.map(p => p.y * cols + p.x));
      if (food) taken.add(food.y * cols + food.x);
      if (bonus) taken.add(bonus.y * cols + bonus.x);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (taken.has(y * cols + x)) continue;
        if (minDist && Math.abs(x - h.x) + Math.abs(y - h.y) < minDist) continue;
        out.push({ x, y });
      }
      return out;
    }
    const pick = arr => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
    function updateHud() {
      scoreEl.textContent = fmt(score);
      bestEl.textContent = fmt(best[mode]);
      bestBox.classList.toggle('hot', state !== 'ready' && score > 0 && score > startBest);
      lenEl.textContent = fmt(snake.length);
      spdEl.textContent = rate().toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      pauseBtn.dataset.paused = state === 'paused';
      pauseBtn.setAttribute('aria-label', state === 'paused' ? 'Devam et' : 'Duraklat');
      pauseBtn.disabled = state !== 'run' && state !== 'paused';
      modeBtn.disabled = inGame();   // switching mode restarts, so it waits until the round is over
    }
    const inGame = () => state === 'run' || state === 'paused' || state === 'dying';
    function bumpScore() { if (motionOK()) scoreEl.animate([{ transform: 'scale(1.22)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.3,1.45,.55,1)' }); }
    function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function loop() { if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function newGame() {
      stopLoop();
      layout(true);
      const y = Math.floor(rows * 0.4), x0 = Math.max(1, Math.floor(cols * 0.22));
      snake = [{ x: x0 + 2, y }, { x: x0 + 1, y }, { x: x0, y }];
      lastTail = { x: x0, y }; dir = DIRS.R; queue = []; bonus = null; gulp = null; fx = [];
      score = 0; eaten = 0; sinceBonus = 0; acc = 0; alpha = 1; cause = '';
      food = { x: Math.min(cols - 2, Math.floor(cols * 0.72)), y };
      startBest = best[mode];
      state = 'ready';
      showOverlay('ready'); updateHud(); draw();
    }
    function start(d) {
      if (state !== 'ready') return;
      Sound.ensure();
      if (d && d.x === -dir.x && d.y === -dir.y) { snake.reverse(); lastTail = { ...snake[snake.length - 1] }; }
      if (d) dir = d;
      state = 'run'; hideOverlay();
      acc = interval();                     // first move happens on the very next frame
      updateHud(); loop();
    }
    function turn(d) {
      if (state === 'ready') { start(d); return; }
      if (state === 'paused') resume();
      if (state !== 'run') return;
      const ld = queue.length ? queue[queue.length - 1] : dir;
      if (d === ld || (d.x === -ld.x && d.y === -ld.y) || queue.length >= 2) return;
      queue.push(d);
    }
    function pause() {
      if (state !== 'run') return;
      state = 'paused'; stopLoop(); queue = [];
      fx = []; gulp = null;                 // effects run on wall-clock time; don't freeze them mid-flight
      showOverlay('paused'); updateHud(); draw();
      say('Duraklatıldı');
    }
    function resume() {
      if (state !== 'paused') return;
      Sound.ensure();
      state = 'run'; hideOverlay(); updateHud(); loop();
    }
    function frame(now) {
      raf = 0;
      if (!alive) return;
      const dt = clamp(now - last, 0, 100); last = now;
      if (state === 'run') {
        acc += dt;
        if (bonus) {
          bonus.left -= dt;
          if (bonus.left <= 0) { fx.push({ kind: 'ring', x: bonus.x, y: bonus.y, c: C.line2, t0: now, delay: 0, life: 320 }); bonus = null; }
        }
        let iv = interval(), guard = 0;
        while (acc >= iv && state === 'run' && guard++ < 3) { acc -= iv; step(now); iv = interval(); }
        if (state === 'run') { if (acc > iv) acc = iv; alpha = acc / iv; }
      } else if (state === 'dying' && now - deadAt >= DEATH_MS) finishOver();
      if (fx.length) fx = fx.filter(f => now - f.t0 < f.delay + f.life);
      draw(now);
      if (state === 'run' || state === 'dying' || fx.length) raf = requestAnimationFrame(frame);
    }
    function step(now) {
      if (queue.length) dir = queue.shift();
      const h = snake[0];
      let nx = h.x + dir.x, ny = h.y + dir.y;
      if (mode === 'duvarsiz') { nx = (nx + cols) % cols; ny = (ny + rows) % rows; }
      else if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { die('wall', now); return; }
      const grow = !!food && food.x === nx && food.y === ny;
      const len = grow ? snake.length : snake.length - 1;   // the tail cell frees up unless we grow
      for (let i = 0; i < len; i++) if (snake[i].x === nx && snake[i].y === ny) { die('self', now); return; }
      snake.unshift({ x: nx, y: ny });
      lastTail = grow ? { ...snake[snake.length - 1] } : snake.pop();
      gulp = null;
      if (grow) eat(nx, ny, now);
      if (bonus && bonus.x === nx && bonus.y === ny) eatBonus(nx, ny, now);
    }
    function setBest() {
      if (score > best[mode]) { best[mode] = score; store.set('yilan-best', best); }
    }
    function eat(x, y, now) {
      score += 1; eaten += 1; sinceBonus += 1;
      gulp = { x, y, c: C.orange };
      if (motionOK()) fx.push({ kind: 'ring', x, y, c: C.orange, t0: now, delay: interval() * 0.8, life: 420 });
      food = pick(freeCells(0));
      if (!food) { setBest(); die('full', now); return; }
      if (!bonus && eaten >= 4 && (sinceBonus >= 9 || Math.random() < 0.16)) {
        const c = pick(freeCells(5)) || pick(freeCells(0));
        if (c) { bonus = { x: c.x, y: c.y, left: BONUS_MS }; sinceBonus = 0; Sound.blip(1568, 0.05, 0.05, 'sine'); }
      }
      const semi = PENTA[(eaten - 1) % 5] + 12 * (Math.floor((eaten - 1) / 5) % 2);
      Sound.pluck(392 * Math.pow(2, semi / 12), null, 0.13);
      vibrate(8);
      setBest(); updateHud(); bumpScore();
    }
    function eatBonus(x, y, now) {
      score += BONUS_PTS; bonus = null;
      if (motionOK()) {
        fx.push({ kind: 'ring', x, y, c: C.yellow, t0: now, delay: interval() * 0.6, life: 480 });
        fx.push({ kind: 'text', text: '+' + BONUS_PTS, x, y, t0: now, delay: 0, life: 700 });
      }
      if (Sound.ensure()) { const t = Sound.ctx.currentTime; Sound.pluck(784, t, 0.12); Sound.pluck(1175, t + 0.08, 0.12); Sound.pluck(1568, t + 0.16, 0.1); }
      vibrate([10, 40, 10]);
      setBest(); updateHud(); bumpScore();
      say(`Bonus! ${BONUS_PTS} puan.`);
    }
    function die(c, now) {
      state = 'dying'; cause = c; deadAt = now; alpha = 1; queue = []; gulp = null;
      setBest(); updateHud();
      if (c === 'full') Sound.chime();
      else Sound.tone(300, { type: 'triangle', to: 120, glide: 0.28, dur: 0.34, vol: 0.13 });
      vibrate(c === 'full' ? [12, 50, 12] : 30);
      if (motionOK() && c !== 'full') board.animate([{ transform: 'none' }, { transform: `translate(${dir.x * 5}px, ${dir.y * 5}px)` }, { transform: `translate(${-dir.x * 3}px, ${-dir.y * 3}px)` }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
    }
    function finishOver() {
      state = 'over'; updateHud();
      showOverlay('over');
      const b = overEl.querySelector('[data-act="again"]');
      if (b) b.focus({ preventScroll: true });
      say(`${(CAUSE[cause] || 'Oyun bitti').replace(/[.!]$/, '')}. Skor ${score}.${score > startBest && score > 0 ? ' Yeni rekor!' : ''}`);
    }
    function showOverlay(kind) {
      overEl.hidden = false; overEl.dataset.kind = kind;
      if (kind === 'ready') {
        overEl.innerHTML = `<div class="yl-card">${SWIPE_SVG}<p class="yl-title">Kaydır ve başla</p><p class="mono yl-sub"><span class="yl-touch">Her yerden kaydırabilirsin</span><span class="yl-keys">Ok tuşları ya da WASD</span></p></div>`;
      } else if (kind === 'paused') {
        overEl.dataset.side = snake.length && (snake[0].y + 0.5) / rows > 0.5 ? 'top' : 'bottom';   // keep the head in view
        overEl.innerHTML = `<div class="yl-card"><p class="yl-title">Durdu</p><p class="mono yl-sub"><span class="yl-touch">Devam etmek için dokun</span><span class="yl-keys">Devam için boşluk ya da tıkla</span></p></div>`;
      } else {
        const rec = score > startBest && score > 0;
        overEl.innerHTML = `<div class="yl-card">
          <p class="mono yl-cause">${CAUSE[cause] || 'Oyun bitti'}</p>
          <p class="yl-big">${fmt(score)}</p>
          <p class="mono yl-sub">${rec ? '<span class="yl-rec">Yeni rekor</span>' : `Rekor ${fmt(best[mode])}`} · ${MODE_NAME[mode]}</p>
          <div class="yl-actions">
            <button type="button" class="btn primary" data-act="again">Tekrar <kbd>Enter</kbd></button>
            <button type="button" class="btn" data-act="share">${SHARE_SVG}Paylaş</button>
          </div>
        </div>`;
      }
    }
    function hideOverlay() { overEl.hidden = true; overEl.innerHTML = ''; }

    /* ---------- input ---------- */
    let sw = null;
    function tap() { if (state === 'ready') start(null); else if (state === 'paused') resume(); }
    const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.R : DIRS.L) : (dy > 0 ? DIRS.D : DIRS.U));
    const onDown = e => {
      if (e.button > 0 || sw || !alive) return;
      const ctl = e.target.closest('button, a, input');
      if (ctl && !ctl.disabled) return;       // a locked control still lets a swipe start on it, but never counts as a tap
      if (e.pointerType === 'mouse') e.preventDefault();
      Sound.ensure();
      sw = { id: e.pointerId, x: e.clientX, y: e.clientY, n: 0, ctl: !!ctl };
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    };
    const onMove = e => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y, ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < (sw.n ? 24 : 14)) return;
      if (sw.n && Math.max(ax, ay) < Math.min(ax, ay) * 1.5) return; // ambiguous diagonal after a turn: wait for intent
      sw.x = e.clientX; sw.y = e.clientY; sw.n++;
      turn(dirOf(dx, dy));
    };
    const onUp = e => {
      if (!sw || e.pointerId !== sw.id) return;
      const s = sw; sw = null;
      Sound.ensure();
      if (s.n) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 14) turn(dirOf(dx, dy));   // a flick whose only movement arrived with the release
      else if (!s.ctl) tap();
    };
    const onCancel = e => { if (sw && e.pointerId === sw.id) sw = null; };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);

    /* After a mouse click, hand focus back to the board so Space/Enter act on the game instead of re-pressing the button. */
    const refocus = e => { if (e.detail) board.focus({ preventScroll: true }); };
    modeBtn.addEventListener('click', e => {
      refocus(e);
      if (inGame()) return;
      mode = mode === 'duvar' ? 'duvarsiz' : 'duvar';
      store.set('yilan-mode', mode);
      modeBtn.setAttribute('aria-pressed', mode === 'duvarsiz');
      Sound.blip(mode === 'duvarsiz' ? 880 : 660, 0.05, 0.08, 'triangle');
      newGame();
      say(mode === 'duvarsiz' ? 'Duvarsız mod: kenardan çıkan öbür taraftan girer.' : 'Duvarlı mod: kenara çarpınca oyun biter.');
    });
    pauseBtn.addEventListener('click', e => { refocus(e); if (state === 'run') pause(); else if (state === 'paused') resume(); });
    overEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'again') { newGame(); return; }
      const extra = mode === 'duvarsiz' ? ' (duvarsız)' : '';
      shareResult({ title: 'Sıkıldım · Yılan', text: `Yılan’da ${fmt(score)} puan yaptım${extra}. Sen kaç yaparsın?`, url: siteUrl() + '#yilan' });
    });

    const onVis = () => { if (document.hidden) pause(); };
    const onBlur = () => pause();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);

    const onTheme = () => { readColors(); paintBg(); draw(); };
    const mo = new MutationObserver(onTheme);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if (darkMQ.addEventListener) darkMQ.addEventListener('change', onTheme);

    let ro = null, lastW = el.clientWidth, lastH = el.clientHeight;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        if (w === lastW && h === lastH) return;
        const big = w !== lastW || Math.abs(h - lastH) > lastH * 0.15;   // rotation or a real resize, not a toolbar wobble
        lastW = w; lastH = h;
        cancelAnimationFrame(relayRaf);
        relayRaf = requestAnimationFrame(() => {
          if (!alive) return;
          if (state === 'ready') newGame();
          else { if (big && state === 'run') pause(); layout(false); draw(); }   // the board just changed size under the player: stop first
        });
      });
      ro.observe(el);
    }

    readColors();
    newGame();

    const KEYS = { ArrowUp: DIRS.U, ArrowDown: DIRS.D, ArrowLeft: DIRS.L, ArrowRight: DIRS.R, w: DIRS.U, s: DIRS.D, a: DIRS.L, d: DIRS.R };
    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key.length === 1 ? e.key.toLocaleLowerCase('tr') : e.key;
        if (KEYS[k]) { e.preventDefault(); Sound.ensure(); turn(KEYS[k]); return; }
        const btn = e.target && e.target.closest ? e.target.closest('button, a') : null;
        if ((k === ' ' || k === 'Enter') && btn && rootEl.contains(btn)) return;   // a focused toy button (e.g. Paylaş) does its own thing
        if (k === ' ' || k === 'p') {
          e.preventDefault(); if (e.repeat) return;
          Sound.ensure();
          if (state === 'run') pause(); else if (state === 'paused') resume(); else if (state === 'ready') start(null); else if (state === 'over' && k === ' ') newGame();
          return;
        }
        if (k === 'Enter' && state === 'over' && !btn) { e.preventDefault(); newGame(); }
      },
      destroy() {
        alive = false; state = 'gone';
        stopLoop(); cancelAnimationFrame(relayRaf);
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('blur', onBlur);
        mo.disconnect();
        if (darkMQ.removeEventListener) darkMQ.removeEventListener('change', onTheme);
        if (ro) ro.disconnect();
        el.style.touchAction = prevTouch;
      },
    };
  },
});
})();
