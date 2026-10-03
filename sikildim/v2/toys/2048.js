/* 2048 */
(() => {
'use strict';

registerToy('2048', {
  name: '2048', color: 'cobalt', cf: 'on-dark', kind: 'Bulmaca', open: '2048’i aç',
  cats: ["oyun", "kafa"],
  desc: 'Aynı sayıları birleştir. Oyunun kalırsa sonra devam edersin.',
  art: '<div class="mini"><i>2</i><i>2</i><i>8</i><i>16</i></div>',
  stat: () => { const gb = store.get('g-best', 0); return gb ? `Rekor ${fmt(gb)}` : 'Henüz rekor yok'; },
  css: `
.mini { display: grid; grid-template-columns: repeat(2, 52px); gap: 6px; }
.mini i {
  display: grid; place-items: center; height: 52px; border-radius: 11px; font: 800 22px/1 var(--f-display); font-style: normal;
  letter-spacing: -.04em; transition: transform .35s var(--spring), opacity .3s;
}
.mini i:nth-child(1) { background: rgba(255, 255, 255, .16); color: var(--on-dark); }
.mini i:nth-child(2) { background: rgba(255, 255, 255, .26); color: var(--on-dark); }
.mini i:nth-child(3) { background: var(--yellow); color: var(--on-light); }
.mini i:nth-child(4) { background: var(--paper); color: var(--cobalt); }
.tile:hover .mini i:nth-child(1) { transform: translateX(58px); opacity: 0; }
.tile:hover .mini i:nth-child(2) { transform: scale(1.08); }

.g2048 { --bsize: min(480px, calc(100vw - 32px), max(270px, calc(100vh - 270px))); }
.g-head { display: flex; align-items: stretch; gap: 10px; width: var(--bsize); max-width: 100%; }
.score { position: relative; display: grid; gap: 4px; flex: 1; padding: 10px 14px; border-radius: var(--r-md); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); }
.score .mono { color: var(--mute); }
.score b { font-size: 26px; font-weight: 750; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.g-gain { position: absolute; right: 14px; bottom: 10px; font: 700 15px/1 var(--f-mono); color: var(--cobalt); opacity: 0; }
.g-head .btn { height: auto; min-height: 48px; border-radius: var(--r-md); }
.board {
  --gap: clamp(8px, 2.2vw, 12px);
  position: relative; width: var(--bsize); max-width: 100%; aspect-ratio: 1; border-radius: 22px;
  background: var(--panel-2); touch-action: none; user-select: none; -webkit-user-select: none;
}
.board:focus-visible { outline-offset: 4px; }
.cells, .tiles { position: absolute; inset: var(--gap); }
.cells { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap); }
.cells i { border-radius: 12px; background: var(--panel-3); opacity: .55; }
.t {
  position: absolute; left: 0; top: 0; width: calc((100% - 3 * var(--gap)) / 4); aspect-ratio: 1; z-index: 1;
  transform: translate(calc(var(--x) * (100% + var(--gap))), calc(var(--y) * (100% + var(--gap))));
  transition: transform .11s ease-in-out;
}
.t.dying { z-index: 0; }
.t i {
  position: absolute; inset: 0; display: grid; place-items: center; border-radius: 12px; font-style: normal;
  background: var(--tb); color: var(--tf); font-weight: 800; font-size: calc(var(--bsize) * .1); letter-spacing: -.045em; font-variant-numeric: tabular-nums;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .08);
}
.t[data-len="3"] i { font-size: calc(var(--bsize) * .082); }
.t[data-len="4"] i, .t[data-len="5"] i { font-size: calc(var(--bsize) * .064); }
.t.new i { animation: tnew .2s var(--ease) .1s backwards; }
.t.merged i { animation: tpop .24s var(--spring); }
@keyframes tnew { from { transform: scale(0); opacity: 0; } }
@keyframes tpop { 45% { transform: scale(1.14); } }
.t[data-v="2"] { --tb: var(--g2); --tf: var(--fg); }
.t[data-v="4"] { --tb: var(--g4); --tf: var(--fg); }
.t[data-v="8"] { --tb: var(--g8); --tf: var(--on-light); }
.t[data-v="16"] { --tb: var(--g16); --tf: var(--on-light); }
.t[data-v="32"] { --tb: var(--g32); --tf: var(--on-dark); }
.t[data-v="64"] { --tb: var(--g64); --tf: var(--on-dark); }
.t[data-v="128"] { --tb: var(--g128); --tf: var(--on-light); }
.t[data-v="256"] { --tb: var(--g256); --tf: var(--on-light); }
.t[data-v="512"] { --tb: var(--g512); --tf: var(--on-light); }
.t[data-v="1024"] { --tb: var(--g1024); --tf: var(--on-light); }
.t[data-v="2048"] { --tb: var(--ink-tile); --tf: var(--ink-tile-fg); }
.t[data-v="sup"] { --tb: var(--gsup); --tf: var(--on-light); }
.g-over {
  position: absolute; inset: 0; z-index: 3; display: grid; place-content: center; justify-items: center; gap: 14px; padding: 20px;
  border-radius: inherit; text-align: center; background: color-mix(in srgb, var(--bg) 80%, transparent);
  -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); animation: fadein .35s var(--ease);
}
.g-over-title { font-size: clamp(34px, 6vw, 56px); font-weight: 800; line-height: 1; letter-spacing: -.045em; }
.g-over-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.g-status { color: var(--mute); text-align: center; }
@keyframes fadein { from { opacity: 0; } }
`,
  hint: 'Oklar · WASD · kaydır · N yeni oyun',
  mount(el) {
    el.innerHTML = `
      <div class="toy g2048">
        <div class="g-head">
          <div class="score"><span class="mono">Skor</span><b id="g-score">0</b><span class="g-gain" id="g-gain" aria-hidden="true"></span></div>
          <div class="score"><span class="mono">Rekor</span><b id="g-best">0</b></div>
          <button type="button" class="btn" id="g-new">Yeni oyun <kbd>N</kbd></button>
        </div>
        <div class="board" id="g-board" tabindex="0" aria-label="2048 tahtası. Ok tuşlarıyla ya da kaydırarak oyna." aria-describedby="g-status">
          <div class="cells">${'<i></i>'.repeat(16)}</div>
          <div class="tiles" id="g-tiles"></div>
          <div class="g-over" id="g-over" hidden></div>
        </div>
        <p class="mono g-status" id="g-status">Aynı sayılar çarpışınca birleşir. Hedef 2048.</p>
      </div>`;
    const board = $('#g-board', el), tilesEl = $('#g-tiles', el), overEl = $('#g-over', el), scoreEl = $('#g-score', el), bestEl = $('#g-best', el), gainEl = $('#g-gain', el);
    let grid = [], score = 0, best = store.get('g-best', 0), won = false, nextId = 1, pending = null;
    const tiles = new Map();
    function place(t) { t.el.style.setProperty('--x', t.c); t.el.style.setProperty('--y', t.r); }
    function paint(t) { t.el.dataset.v = t.v > 2048 ? 'sup' : t.v; t.el.dataset.len = String(t.v).length; t.el.firstChild.textContent = t.v; }
    function addTile(r, c, v, isNew) {
      const t = { id: nextId++, v, r, c, el: document.createElement('div') };
      t.el.className = 't' + (isNew ? ' new' : ''); t.el.innerHTML = '<i></i>';
      paint(t); place(t); tilesEl.append(t.el); grid[r][c] = t; tiles.set(t.id, t);
    }
    function spawn() {
      const empty = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      addTile(r, c, Math.random() < 0.9 ? 2 : 4, true);
    }
    function clearBoard() { tiles.forEach(t => t.el.remove()); tiles.clear(); tilesEl.innerHTML = ''; grid = Array.from({ length: 4 }, () => Array(4).fill(null)); }
    function renderScore() { scoreEl.textContent = fmt(score); bestEl.textContent = fmt(best); }
    function save() { store.set('g-state', { g: grid.map(row => row.map(t => (t ? t.v : 0))), score, won }); }
    function canMove() {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const t = grid[r][c]; if (!t) return true;
        if (c < 3 && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
        if (r < 3 && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
      }
      return false;
    }
    function showOver(kind) {
      overEl.hidden = false;
      overEl.innerHTML = kind === 'win'
        ? `<p class="g-over-title">2048!</p><p class="mono">Başardın. İstersen devam et.</p><div class="g-over-actions"><button type="button" class="btn primary" data-act="keep">Devam et</button><button type="button" class="btn" data-act="new">Yeni oyun</button></div>`
        : `<p class="g-over-title">Hamle kalmadı</p><p class="mono">Skor ${fmt(score)}${score >= best && score > 0 ? ' · yeni rekor' : ''}</p><div class="g-over-actions"><button type="button" class="btn primary" data-act="new">Yeni oyun</button></div>`;
      const b = overEl.querySelector('.btn.primary'); if (b) b.focus({ preventScroll: true });
      say(kind === 'win' ? '2048 yaptın!' : `Hamle kalmadı. Skor ${score}.`);
    }
    function check() {
      if (!won) for (const t of tiles.values()) if (t.v >= 2048) { won = true; save(); Sound.chime(); showOver('win'); return; }
      if (!canMove()) showOver('lose');
    }
    function reset() { flush(); clearBoard(); score = 0; won = false; overEl.hidden = true; spawn(); spawn(); renderScore(); save(); board.focus({ preventScroll: true }); }
    function flush() { if (pending) { clearTimeout(pending.timer); const p = pending; pending = null; p.run(); } }
    function nudge(dir) {
      if (!motionOK()) return;
      const d = { L: [-6, 0], R: [6, 0], U: [0, -6], D: [0, 6] }[dir];
      board.animate([{ transform: 'none' }, { transform: `translate(${d[0]}px, ${d[1]}px)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
    }
    function move(dir) {
      if (!overEl.hidden) return;
      flush();
      const [dr, dc] = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] }[dir];
      const rows = [0, 1, 2, 3], cols = [0, 1, 2, 3];
      if (dr === 1) rows.reverse(); if (dc === 1) cols.reverse();
      let moved = false, gain = 0; const merged = new Set(), dying = [], grown = [];
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
            dying.push(t); grown.push(o); gain += o.v; moved = true; absorbed = true;
          }
          break;
        }
        if (!absorbed && (nr !== r || nc !== c)) { grid[r][c] = null; grid[nr][nc] = t; t.r = nr; t.c = nc; place(t); moved = true; }
      }
      if (!moved) { nudge(dir); return; }
      dying.forEach(t => { tiles.delete(t.id); t.el.classList.add('dying'); });
      score += gain; if (score > best) { best = score; store.set('g-best', best); }
      renderScore();
      if (gain) {
        gainEl.textContent = '+' + gain;
        if (motionOK()) gainEl.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-26px)', opacity: 0 }], { duration: 650, easing: 'ease-out' });
        Sound.blip(clamp(220 + Math.log2(gain) * 70, 260, 1200), 0.05, 0.08, 'triangle');
      }
      const run = () => {
        dying.forEach(t => t.el.remove());
        grown.forEach(o => { paint(o); o.el.classList.remove('merged', 'new'); void o.el.offsetWidth; o.el.classList.add('merged'); });
        spawn(); save(); check();
      };
      pending = { run, timer: setTimeout(() => { const p = pending; pending = null; if (p) p.run(); }, motionOK() ? 115 : 0) };
    }
    const saved = store.get('g-state', null);
    clearBoard();
    if (saved && Array.isArray(saved.g) && saved.g.length === 4 && saved.g.some(r => r.some(v => v))) {
      saved.g.forEach((row, r) => row.forEach((v, c) => { if (v) addTile(r, c, v, false); }));
      score = saved.score || 0; won = !!saved.won;
      renderScore();
      if (!canMove()) showOver('lose');
    } else reset();
    renderScore();
    $('#g-new', el).addEventListener('click', reset);
    overEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'new') reset(); else { overEl.hidden = true; board.focus({ preventScroll: true }); }
    });
    let sw = null;
    board.addEventListener('pointerdown', e => { if (!overEl.hidden) return; sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    board.addEventListener('pointerup', e => {
      if (!sw || sw.id !== e.pointerId) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
    });
    board.addEventListener('pointercancel', () => { sw = null; });
    setTimeout(() => board.focus({ preventScroll: true }), 50);
    const KEYS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D' };
    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key.length === 1 ? e.key.toLocaleLowerCase('tr') : e.key;
        if (KEYS[k]) { e.preventDefault(); move(KEYS[k]); }
        else if (k === 'n' && !e.repeat) { e.preventDefault(); reset(); }
      },
      destroy() { flush(); },
    };
  },
});
})();
