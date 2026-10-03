/* 2048 — aynı sayıları birleştir; 3 geri alma hakkı, hamle sayacı ve paylaşım */
(() => {
'use strict';

/* Storage: V1's keys in V1's shape. 'g-best' is a number; 'g-state' is { g, score, won } and V2 adds { moves, undos, past }
   alongside (V1 ignores extra fields and drops them when it saves, which simply resets the undo history). */
const UNDOS = 3;
const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>';
const UNDO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14.5 4 9.5l5-5"/><path d="M4 9.5h10a5.5 5.5 0 0 1 0 11h-3"/></svg>';

const isTileVal = v => v === 0 || (Number.isInteger(v) && v >= 2 && v <= 2 ** 30 && (v & (v - 1)) === 0);
const okGrid = g => Array.isArray(g) && g.length === 4 && g.every(r => Array.isArray(r) && r.length === 4 && r.every(isTileVal));
const okNum = v => typeof v === 'number' && isFinite(v) && v >= 0;
const okSnap = s => s && okGrid(s.g) && okNum(s.score) && (s.moves == null || okNum(s.moves));

registerToy('2048', {
  name: '2048', color: 'cobalt', cf: 'on-dark', kind: 'Bulmaca', open: '2048’i aç',
  cats: ['oyun', 'kafa'],
  desc: 'Aynı sayıları birleştir. Üç geri alma hakkın var; oyunun kalırsa sonra devam edersin.',
  art: '<div class="art-2048"><i>2</i><i>2</i><i>8</i><i>16</i></div>',
  stat: () => { const gb = store.get('g-best', 0); return gb ? `Rekor ${fmt(gb)}` : 'Henüz rekor yok'; },
  css: `
.art-2048 { display: grid; grid-template-columns: repeat(2, 52px); gap: 6px; }
.art-2048 i {
  display: grid; place-items: center; height: 52px; border-radius: 11px; font: 800 22px/1 var(--f-display); font-style: normal;
  letter-spacing: -.04em; transition: transform .35s var(--spring), opacity .3s;
}
.art-2048 i:nth-child(1) { background: rgba(255, 255, 255, .16); color: var(--on-dark); }
.art-2048 i:nth-child(2) { background: rgba(255, 255, 255, .26); color: var(--on-dark); }
.art-2048 i:nth-child(3) { background: var(--yellow); color: var(--on-light); }
.art-2048 i:nth-child(4) { background: var(--paper); color: var(--cobalt); }
.tile:hover .art-2048 i:nth-child(1) { transform: translateX(58px); opacity: 0; }
.tile:hover .art-2048 i:nth-child(2) { transform: scale(1.08); }

.g2048 { --bsize: min(480px, calc(100vw - 32px)); --g-acc: var(--cobalt); --g-cell: var(--panel-3); gap: clamp(12px, 1.8vw, 20px); touch-action: manipulation; }
/* Dark: the shared ramp's 2 and 4 are darker than the empty cells. Sink the cells and lift the first two tiles. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .g2048 {
    --g-acc: var(--sky); --g-cell: var(--bg);
    --g2: color-mix(in srgb, var(--fg) 15%, var(--panel-2)); --g4: color-mix(in srgb, var(--g8) 26%, var(--panel-2));
  }
}
:root[data-theme="dark"] .g2048 {
  --g-acc: var(--sky); --g-cell: var(--bg);
  --g2: color-mix(in srgb, var(--fg) 15%, var(--panel-2)); --g4: color-mix(in srgb, var(--g8) 26%, var(--panel-2));
}
.g2048 .g-head, .g2048 .g-bar { width: var(--bsize); max-width: 100%; }

.g2048 .g-head { display: flex; align-items: stretch; gap: 8px; }
.g2048 .g-card {
  position: relative; flex: 1 1 0; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 5px; padding: 10px 14px; border-radius: var(--r-md);
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); transition: background .3s, color .3s, box-shadow .3s;
}
.g2048 .g-card.main { flex-grow: 1.35; }
.g2048 .g-card .mono { color: var(--mute); white-space: nowrap; transition: color .3s; }
.g2048 .g-card b { min-width: 0; overflow: hidden; font-size: clamp(21px, 6.6vw, 28px); font-weight: 750; line-height: 1.04; letter-spacing: -.035em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.g2048 .g-card.hot { background: var(--cobalt); color: var(--on-dark); box-shadow: none; }
.g2048 .g-card.hot .mono { color: inherit; opacity: .78; }
.g2048 .g-gain { position: absolute; right: 12px; top: 10px; font: 700 13px/1 var(--f-mono); color: var(--g-acc); opacity: 0; pointer-events: none; }
.g2048 .g-share {
  flex: none; display: grid; place-items: center; width: 54px; border-radius: var(--r-md);
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); transition: background .2s, transform .3s var(--spring), opacity .2s;
}
.g2048 .g-share:hover { background: var(--panel-2); }
.g2048 .g-share:active { transform: scale(.94); }
.g2048 .g-share:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.g2048 .g-share svg { width: 22px; height: 22px; }

.g2048 .g-bar { display: flex; align-items: center; gap: 8px; }
.g2048 .g-bar .btn { flex: none; gap: 8px; padding: 0 16px; }
.g2048 .g-undo svg { width: 19px; height: 19px; flex: none; margin-left: -2px; }
.g2048 .g-undo .n { margin-left: -3px; font-variant-numeric: tabular-nums; opacity: .6; }
.g2048 .g-undo[disabled] { opacity: .4; }
.g2048 .g-moves { flex: 1; min-width: 0; display: grid; justify-items: center; gap: 3px; text-align: center; }
.g2048 .g-moves b { font-size: 19px; font-weight: 700; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.g2048 .g-moves .mono { font-size: 10px; color: var(--mute); }

.g2048 .g-board {
  --gap: clamp(7px, calc(var(--bsize) * .026), 12px); --rad: clamp(9px, calc(var(--bsize) * .03), 13px);
  position: relative; width: var(--bsize); max-width: 100%; aspect-ratio: 1; flex: none; border-radius: calc(var(--rad) + var(--gap));
  background: var(--panel-2); touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.g2048 .g-board:focus { outline: none; }
.g2048 .g-board:focus-visible { outline: 2.5px solid var(--fg); outline-offset: 4px; }
.g2048 .g-cells, .g2048 .g-tiles { position: absolute; inset: var(--gap); }
.g2048 .g-cells { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap); }
.g2048 .g-cells i { border-radius: var(--rad); background: var(--g-cell); opacity: .55; }
.g2048 .t {
  position: absolute; left: 0; top: 0; width: calc((100% - 3 * var(--gap)) / 4); aspect-ratio: 1; z-index: 1;
  transform: translate(calc(var(--x) * (100% + var(--gap))), calc(var(--y) * (100% + var(--gap))));
  transition: transform .11s ease-in-out;
}
.g2048 .t.dying { z-index: 0; }
.g2048 .t i {
  position: absolute; inset: 0; display: grid; place-items: center; border-radius: var(--rad); font-style: normal;
  background: var(--tb); color: var(--tf); font-weight: 800; font-size: calc(var(--bsize) * .1); letter-spacing: -.045em; font-variant-numeric: tabular-nums;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .08);
}
.g2048 .t[data-len="3"] i { font-size: calc(var(--bsize) * .082); }
.g2048 .t[data-len="4"] i, .g2048 .t[data-len="5"] i { font-size: calc(var(--bsize) * .064); }
.g2048 .t[data-len="6"] i, .g2048 .t[data-len="7"] i { font-size: calc(var(--bsize) * .05); }
.g2048 .t.new i { animation: g-new .2s var(--ease) .1s backwards; }
.g2048 .t.merged i { animation: g-pop .24s var(--spring); }
.g2048 .t.back i { animation: g-back .26s var(--ease); }
@keyframes g-new { from { transform: scale(0); opacity: 0; } }
@keyframes g-pop { 45% { transform: scale(1.14); } }
@keyframes g-back { from { transform: scale(.82); opacity: .2; } }
.g2048 .t[data-v="2"] { --tb: var(--g2); --tf: var(--fg); }
.g2048 .t[data-v="4"] { --tb: var(--g4); --tf: var(--fg); }
.g2048 .t[data-v="8"] { --tb: var(--g8); --tf: var(--on-light); }
.g2048 .t[data-v="16"] { --tb: var(--g16); --tf: var(--on-light); }
.g2048 .t[data-v="32"] { --tb: var(--g32); --tf: var(--on-dark); }
.g2048 .t[data-v="64"] { --tb: var(--g64); --tf: var(--on-dark); }
.g2048 .t[data-v="128"] { --tb: var(--g128); --tf: var(--on-light); }
.g2048 .t[data-v="256"] { --tb: var(--g256); --tf: var(--on-light); }
.g2048 .t[data-v="512"] { --tb: var(--g512); --tf: var(--on-light); }
.g2048 .t[data-v="1024"] { --tb: var(--g1024); --tf: var(--on-light); }
.g2048 .t[data-v="2048"] { --tb: var(--ink-tile); --tf: var(--ink-tile-fg); }
.g2048 .t[data-v="sup"] { --tb: var(--gsup); --tf: var(--on-light); }

.g2048 .g-board { container-type: inline-size; }
.g2048 .g-over {
  position: absolute; inset: 0; z-index: 3; display: grid; place-content: center; justify-items: center; gap: clamp(6px, calc(var(--bsize) * .024), 10px); padding: 12px;
  border-radius: inherit; text-align: center; background: color-mix(in srgb, var(--bg) 82%, transparent);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: fadein .35s var(--ease);
}
.g2048 .g-over-title { font-size: clamp(24px, calc(var(--bsize) * .095), 52px); font-weight: 800; line-height: 1; letter-spacing: -.045em; white-space: nowrap; }
.g2048 .g-over-score { font-size: clamp(15px, calc(var(--bsize) * .05), 22px); font-weight: 650; letter-spacing: -.02em; }
.g2048 .g-over-score em { font-style: normal; color: var(--g-acc); }
.g2048 .g-over .mono { color: var(--mute); }
.g2048 .g-over-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 4px; }
.g2048 .g-over-actions .btn { height: 46px; gap: 8px; padding: 0 18px; }
.g2048 .g-over-actions svg { width: 18px; height: 18px; flex: none; }
/* Small boards (320 px phones, landscape): compact buttons, icon-only share, so the panel stays inside the board. */
@container (max-width: 340px) {
  .g2048 .g-over-actions .btn { height: 44px; padding: 0 14px; font-size: 15px; }
  .g2048 .g-over-actions [data-act="undo"] svg { display: none; }
  .g2048 .g-over-actions [data-act="share"] { width: 44px; padding: 0; }
  .g2048 .g-over-actions [data-act="share"] span { display: none; }
}
.g2048 .g-status { color: var(--mute); text-align: center; text-wrap: balance; }

@media (max-width: 380px) {
  .g2048 .g-bar .btn { padding: 0 13px; font-size: 15px; }
  .g2048 .g-undo svg { display: none; }
  .g2048 .g-card { padding: 9px 11px; }
}

/* Landscape phones: the board takes the height, score and controls move to a side column. */
.g2048.wide {
  display: grid; grid-template-columns: var(--bsize) minmax(230px, 300px); grid-template-rows: auto auto minmax(0, 1fr);
  grid-template-areas: "board head" "board bar" "board status"; align-items: start; column-gap: clamp(18px, 3vw, 32px); row-gap: 12px;
  width: auto; max-width: 100%;
}
.g2048.wide .g-board { grid-area: board; }
.g2048.wide .g-head { grid-area: head; width: 100%; }
.g2048.wide .g-card b { font-size: 24px; }
.g2048.wide .g-bar { grid-area: bar; width: 100%; flex-wrap: wrap; }
.g2048.wide .g-moves { order: -1; flex: 1 0 100%; justify-items: start; text-align: left; grid-auto-flow: column; justify-content: start; align-items: baseline; gap: 8px; }
.g2048.wide .g-bar .btn { flex: 1; }
.g2048.wide .g-status { grid-area: status; text-align: left; }
`,
  hint: 'Oklar · WASD · kaydır · U geri al · N yeni oyun',
  mount(el) {
    el.innerHTML = `
      <div class="toy g2048">
        <div class="g-head">
          <div class="g-card main"><span class="mono">Skor</span><b id="g-score">0</b><span class="g-gain" id="g-gain" aria-hidden="true"></span></div>
          <div class="g-card" id="g-best-card"><span class="mono">Rekor</span><b id="g-best">0</b></div>
          <button type="button" class="g-share" id="g-share" aria-label="Skoru paylaş" title="Skoru paylaş">${SHARE_SVG}</button>
        </div>
        <div class="g-board" id="g-board" tabindex="0" aria-label="2048 tahtası. Ok tuşlarıyla ya da kaydırarak oyna." aria-describedby="g-status">
          <div class="g-cells">${'<i></i>'.repeat(16)}</div>
          <div class="g-tiles" id="g-tiles"></div>
          <div class="g-over" id="g-over" hidden></div>
        </div>
        <div class="g-bar">
          <button type="button" class="btn g-undo" id="g-undo">${UNDO_SVG}<span>Geri al</span><span class="n" id="g-undo-n">(${UNDOS})</span><kbd>U</kbd></button>
          <p class="g-moves"><b id="g-moves">0</b><span class="mono">hamle</span></p>
          <button type="button" class="btn" id="g-new">Yeni oyun <kbd>N</kbd></button>
        </div>
        <p class="mono g-status" id="g-status">Aynı sayılar çarpışınca birleşir. Hedef 2048.</p>
      </div>`;
    const rootEl = $('.g2048', el), board = $('#g-board', el), tilesEl = $('#g-tiles', el), overEl = $('#g-over', el);
    const scoreEl = $('#g-score', el), bestEl = $('#g-best', el), bestCard = $('#g-best-card', el), gainEl = $('#g-gain', el);
    const undoBtn = $('#g-undo', el), undoN = $('#g-undo-n', el), movesEl = $('#g-moves', el), shareBtn = $('#g-share', el);
    const headEl = $('.g-head', el), barEl = $('.g-bar', el), statusEl = $('#g-status', el);
    const fine = matchMedia('(pointer: fine)').matches;

    let grid = [], score = 0, best = store.get('g-best', 0), won = false, nextId = 1, pending = null, alive = true;
    let moves = 0, undos = UNDOS, past = [], bestAtStart = 0, wasHot = false, overKind = null, viaKeys = false;
    if (!okNum(best)) best = 0;
    const tiles = new Map();

    /* ---------- tiles ---------- */
    function place(t) { t.el.style.setProperty('--x', t.c); t.el.style.setProperty('--y', t.r); }
    function paint(t) { t.el.dataset.v = t.v > 2048 ? 'sup' : t.v; t.el.dataset.len = String(t.v).length; t.el.firstChild.textContent = t.v; }
    function addTile(r, c, v, cls) {
      const t = { id: nextId++, v, r, c, el: document.createElement('div') };
      t.el.className = 't' + (cls ? ' ' + cls : ''); t.el.innerHTML = '<i></i>';
      paint(t); place(t); tilesEl.append(t.el); grid[r][c] = t; tiles.set(t.id, t);
    }
    function spawn() {
      const empty = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      addTile(r, c, Math.random() < 0.9 ? 2 : 4, 'new');
    }
    function clearBoard() { tiles.forEach(t => t.el.remove()); tiles.clear(); tilesEl.innerHTML = ''; grid = Array.from({ length: 4 }, () => Array(4).fill(null)); }
    const values = () => grid.map(row => row.map(t => (t ? t.v : 0)));
    function loadValues(g, prevVals) {
      clearBoard();
      g.forEach((row, r) => row.forEach((v, c) => { if (v) addTile(r, c, v, prevVals && prevVals[r][c] !== v ? 'back' : ''); }));
    }
    const maxTile = () => { let m = 0; tiles.forEach(t => { if (t.v > m) m = t.v; }); return m; };

    /* ---------- HUD ---------- */
    /* Long scores (or a wide fallback font) shrink to fit their card instead of spilling out. */
    function fitNum(b) {
      b.style.fontSize = '';
      const over = b.scrollWidth - b.clientWidth;
      if (over > 0) b.style.fontSize = Math.max(13, Math.floor(parseFloat(getComputedStyle(b).fontSize) * b.clientWidth / b.scrollWidth)) + 'px';
    }
    function renderScore() {
      scoreEl.textContent = fmt(score); bestEl.textContent = fmt(best);
      fitNum(scoreEl); fitNum(bestEl);
      const hot = bestAtStart > 0 && score > bestAtStart;
      bestCard.classList.toggle('hot', hot);
      bestCard.firstChild.textContent = hot ? 'Yeni rekor' : 'Rekor';
      if (hot && !wasHot) { say('Yeni rekor.'); if (motionOK()) bestCard.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' }); }
      wasHot = hot;
      shareBtn.disabled = !score && !best;
    }
    function renderBar() {
      movesEl.textContent = moves == null ? '—' : fmt(moves);
      undoN.textContent = `(${undos})`;
      const can = undos > 0 && past.length > 0;
      undoBtn.disabled = !can;
      undoBtn.setAttribute('aria-label', `Geri al, ${undos} hak kaldı`);
      undoBtn.title = undos ? (past.length ? `Son hamleyi geri al (${undos} hak)` : 'Geri alınacak hamle yok') : 'Geri alma hakkın bitti';
    }
    function save() {
      store.set('g-state', { g: values(), score, won, moves, undos, past });
    }
    function canMove() {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const t = grid[r][c]; if (!t) return true;
        if (c < 3 && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
        if (r < 3 && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
      }
      return false;
    }

    /* ---------- end panels ---------- */
    function showOver(kind) {
      overKind = kind;
      overEl.hidden = false;
      const top = maxTile(), mv = moves == null ? '' : `${fmt(moves)} hamle · `;
      const canUndo = undos > 0 && past.length > 0;
      const shareB = `<button type="button" class="btn" data-act="share" aria-label="Paylaş">${SHARE_SVG}<span>Paylaş</span></button>`;
      overEl.innerHTML = kind === 'win'
        ? `<p class="g-over-title">2048!</p>
           <p class="mono">${mv}Başardın. İstersen devam et.</p>
           <div class="g-over-actions"><button type="button" class="btn primary" data-act="keep">Devam et</button>${shareB}<button type="button" class="btn" data-act="new">Yeni oyun</button></div>`
        : `<p class="g-over-title">Hamle kalmadı</p>
           <p class="g-over-score">${fmt(score)} puan${score > 0 && score >= best && score > bestAtStart ? ' · <em>yeni rekor</em>' : ''}</p>
           <p class="mono">${mv}en büyük taş ${fmt(top)}</p>
           <div class="g-over-actions"><button type="button" class="btn primary" data-act="new">Yeni oyun</button>${canUndo ? `<button type="button" class="btn" data-act="undo">${UNDO_SVG}Geri al (${undos})</button>` : ''}${shareB}</div>`;
      const b = overEl.querySelector('.btn.primary'); if (b && viaKeys) b.focus({ preventScroll: true });   // touch players get no stray focus ring
      say(kind === 'win' ? '2048 yaptın!' : `Hamle kalmadı. Skor ${score}.${canUndo ? ` ${undos} geri alma hakkın var.` : ''}`);
    }
    function hideOver() { overEl.hidden = true; overEl.innerHTML = ''; overKind = null; }
    function check() {
      if (!won) for (const t of tiles.values()) if (t.v >= 2048) { won = true; save(); Sound.chime(); vibrate([12, 60, 12]); showOver('win'); return; }
      if (!canMove()) { Sound.buzz(); showOver('lose'); }
    }

    /* ---------- game flow ---------- */
    function reset(focus = true) {
      flush(); clearBoard(); hideOver();
      score = 0; won = false; moves = 0; undos = UNDOS; past = []; bestAtStart = best; wasHot = false;
      spawn(); spawn(); renderScore(); renderBar(); save();
      if (focus && fine) board.focus({ preventScroll: true });     // keeps Space/Enter from pressing "Yeni oyun" again
    }
    function flush() { if (pending) { clearTimeout(pending.timer); const p = pending; pending = null; p.run(); } }
    function nudge(dir) {
      if (!motionOK()) return;
      const d = { L: [-6, 0], R: [6, 0], U: [0, -6], D: [0, 6] }[dir];
      board.animate([{ transform: 'none' }, { transform: `translate(${d[0]}px, ${d[1]}px)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
    }
    function move(dir) {
      if (!overEl.hidden) return;
      flush();
      const snap = { g: values(), score, won, moves };
      const [dr, dc] = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] }[dir];
      const rows = [0, 1, 2, 3], cols = [0, 1, 2, 3];
      if (dr === 1) rows.reverse(); if (dc === 1) cols.reverse();
      let moved = false, gain = 0, top = 0; const merged = new Set(), dying = [], grown = [];
      for (const r of rows) for (const c of cols) {
        const t = grid[r][c]; if (!t) continue;
        let nr = r, nc = c, absorbed = false;
        for (;;) {
          const tr = nr + dr, tc = nc + dc;
          if (tr < 0 || tr > 3 || tc < 0 || tc > 3) break;
          const o = grid[tr][tc];
          if (!o) { nr = tr; nc = tc; continue; }
          if (o.v === t.v && !merged.has(o.id)) {
            grid[r][c] = null; o.v *= 2; merged.add(o.id); t.r = tr; t.c = tc; place(t);
            dying.push(t); grown.push(o); gain += o.v; top = Math.max(top, o.v); moved = true; absorbed = true;
          }
          break;
        }
        if (!absorbed && (nr !== r || nc !== c)) { grid[r][c] = null; grid[nr][nc] = t; t.r = nr; t.c = nc; place(t); moved = true; }
      }
      if (!moved) { nudge(dir); return; }
      if (undos > 0) { past.push(snap); while (past.length > undos) past.shift(); }
      if (moves != null) moves++;
      dying.forEach(t => { tiles.delete(t.id); t.el.classList.add('dying'); });
      score += gain; if (score > best) { best = score; store.set('g-best', best); }
      renderScore(); renderBar();
      if (gain) {
        gainEl.textContent = '+' + fmt(gain);
        if (motionOK()) gainEl.animate([{ transform: 'translateY(4px)', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 0 }], { duration: 650, easing: 'ease-out' });
        Sound.blip(clamp(220 + Math.log2(gain) * 70, 260, 1200), 0.05, 0.08, 'triangle');
        if (top >= 64) vibrate(8);
      }
      const run = () => {
        dying.forEach(t => t.el.remove());
        grown.forEach(o => { paint(o); o.el.classList.remove('merged', 'new', 'back'); void o.el.offsetWidth; o.el.classList.add('merged'); });
        spawn(); save(); if (alive) check();
      };
      pending = { run, timer: setTimeout(() => { const p = pending; pending = null; if (p) p.run(); }, motionOK() ? 115 : 0) };
    }
    function undo() {
      flush();
      if (!undos || !past.length) {
        if (!undos) toast('Geri alma hakkın bitti');
        return;
      }
      const s = past.pop(); undos--;
      if (past.length > undos) past.splice(0, past.length - undos);
      const before = values();
      hideOver();
      loadValues(s.g, before);
      score = s.score; won = !!s.won; moves = s.moves == null ? null : s.moves;
      renderScore(); renderBar(); save();
      Sound.tone(660, { to: 392, glide: 0.12, dur: 0.14, vol: 0.09, type: 'triangle' });
      say(`Geri alındı. ${undos ? `${undos} hak kaldı.` : 'Geri alma hakkın bitti.'}`);
      if (fine) board.focus({ preventScroll: true });
    }
    function shareText() {
      const top = maxTile(), mv = moves ? `, ${fmt(moves)} hamle` : '';
      if (!score) return `2048’de rekorum ${fmt(best)} puan. Sen kaç yaparsın?`;
      if (overKind === 'win') return `2048’de 2048 taşını yaptım: ${fmt(score)} puan${mv}. Sen de dene.`;
      if (overKind === 'lose') return `2048’de ${fmt(score)} puanla bitirdim (en büyük taş ${fmt(top)}${mv}). Sen kaç yaparsın?`;
      return `2048’de şu an ${fmt(score)} puandayım, en büyük taşım ${fmt(top)}. Sen kaç yaparsın?`;
    }
    function share() {
      if (!score && !best) return;
      shareResult({ title: 'Sıkıldım · 2048', text: shareText(), url: siteUrl() + '#2048' });
    }

    /* ---------- layout: size the board from the real stage body ---------- */
    function layout() {
      if (!alive) return;
      const cs = getComputedStyle(el);
      const aw = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const ah = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const wide = aw > ah * 1.35 && ah < 560;
      rootEl.classList.toggle('wide', wide);
      let size;
      if (wide) {
        statusEl.hidden = false;
        size = Math.min(ah, aw - 250, 520);
      } else {
        statusEl.hidden = false;
        const gap = parseFloat(getComputedStyle(rootEl).rowGap) || 14;
        const fixed = headEl.offsetHeight + barEl.offsetHeight + gap * 2;
        const st = statusEl.offsetHeight + gap, ideal = Math.min(aw, 500);
        const showStatus = ah - fixed - st >= ideal;
        statusEl.hidden = !showStatus;
        size = Math.min(ideal, ah - fixed - (showStatus ? st : 0));
      }
      rootEl.style.setProperty('--bsize', Math.floor(clamp(size, 200, 520)) + 'px');
      fitNum(scoreEl); fitNum(bestEl);
    }

    /* ---------- restore ---------- */
    const saved = store.get('g-state', null);
    clearBoard();
    if (saved && okGrid(saved.g) && saved.g.some(r => r.some(v => v))) {
      loadValues(saved.g);
      score = okNum(saved.score) ? saved.score : 0; won = !!saved.won;
      if (score > best) { best = score; store.set('g-best', best); }
      moves = okNum(saved.moves) ? Math.floor(saved.moves) : null;            // unknown for a game started in V1
      undos = Number.isInteger(saved.undos) ? clamp(saved.undos, 0, UNDOS) : UNDOS;
      past = Array.isArray(saved.past) ? saved.past.filter(okSnap).slice(-undos) : [];
      if (!undos) past = [];
      bestAtStart = score >= best ? 0 : best;                            // already the record holder: no "new record" flash on resume
      renderScore(); renderBar();
      if (!canMove()) showOver('lose');
    } else reset(false);
    renderScore(); renderBar();
    layout();

    /* ---------- input ---------- */
    $('#g-new', el).addEventListener('click', () => reset());
    undoBtn.addEventListener('click', undo);
    shareBtn.addEventListener('click', share);
    overEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'new') reset();
      else if (act === 'undo') undo();
      else if (act === 'share') share();
      else { hideOver(); if (fine) board.focus({ preventScroll: true }); }
    });
    let sw = null;
    board.addEventListener('pointerdown', e => { viaKeys = false; if (!overEl.hidden || (e.pointerType === 'mouse' && e.button !== 0)) return; sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    board.addEventListener('pointerup', e => {
      if (!sw || sw.id !== e.pointerId) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
    });
    board.addEventListener('pointercancel', () => { sw = null; });
    board.addEventListener('contextmenu', e => e.preventDefault());
    const onResize = () => layout();
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());

    const KEYS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D' };
    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key.length === 1 ? e.key.toLocaleLowerCase('tr') : e.key;
        if (KEYS[k]) { e.preventDefault(); viaKeys = true; move(KEYS[k]); }
        else if (k === 'n' && !e.repeat) { e.preventDefault(); reset(); }
        else if (k === 'u' && !e.repeat) { e.preventDefault(); undo(); }
      },
      destroy() {
        alive = false; flush();
        window.removeEventListener('resize', onResize);
      },
    };
  },
});
})();
