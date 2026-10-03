/* Patlat — balonlu naylon: her sayfa başka bir renk, üç balon boyu */
(() => {
'use strict';
/* Calm sheet colours, one per new sheet. `sh` tints the bubble shading so every sheet keeps real depth (rgb triplet). */
const SHEETS = [
  { c: 'sky', sh: '0, 40, 100' },
  { c: 'mint', sh: '0, 78, 58' },
  { c: 'pink', sh: '130, 12, 64' },
  { c: 'yellow', sh: '128, 72, 0' },
  { c: 'lilac', sh: '52, 28, 140' },
];
/* Bubble size: target diameter and gap for [phone, desktop]; `z` shifts the pop pitch (small = higher, big = deeper). */
const SIZES = {
  kucuk: { name: 'Küçük', s: [36, 44], g: [6, 8], z: 1.4 },
  orta: { name: 'Orta', s: [46, 58], g: [7, 10], z: 1 },
  buyuk: { name: 'Büyük', s: [62, 78], g: [9, 12], z: 0.72 },
};
const SIZE_IDS = Object.keys(SIZES);
const K_SIZE = 'patlat-size';

registerToy('patlat', {
  name: 'Patlat', color: 'sky', cf: 'on-light', kind: 'Dokunma', open: 'Patlat’ı aç',
  cats: ["sakin"],
  desc: 'Bitmeyen balonlu naylon. Basılı tut ve sürükle.',
  art: '<div class="art-patlat"><i></i><i></i><i class="p"></i><i></i><i></i><i></i><i class="p"></i><i class="p"></i><i></i><i></i><i></i><i></i><i></i><i class="p"></i><i></i></div>',
  stat: () => { const pt = store.get('pt-total', 0); return pt ? `${fmt(pt)} balon patladı` : 'Sonsuz sayfa'; },
  css: `
.art-patlat { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; width: min(100%, 200px); }
.art-patlat i {
  aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, rgba(255, 255, 255, .95) 0 9%, rgba(255, 255, 255, .3) 22%, transparent 46%), rgba(255, 255, 255, .34);
  box-shadow: inset 0 -3px 6px rgba(0, 40, 100, .18), 0 2px 4px rgba(0, 40, 100, .16);
  transition: transform .2s var(--spring);
}
.art-patlat i:nth-child(n+6):nth-child(-n+10) { transform: translateX(50%); }
.art-patlat i.p { background: rgba(0, 40, 100, .12); box-shadow: inset 0 2px 4px rgba(0, 40, 100, .22); transform: scale(.84); }
.art-patlat i.p:nth-child(n+6):nth-child(-n+10) { transform: translateX(50%) scale(.84); }
.tile:hover .art-patlat i:nth-child(4) { transform: scale(.84); background: rgba(0, 40, 100, .12); box-shadow: inset 0 2px 4px rgba(0, 40, 100, .22); }

.patlat-root { gap: clamp(14px, 2.2vw, 24px); }
.patlat-root .pt-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px 16px; width: min(100%, 980px); }
.patlat-root .pt-count { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.patlat-root .pt-count b { font-size: clamp(36px, 4.4vw, 56px); font-weight: 800; line-height: .9; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
.patlat-root .pt-count .mono, .patlat-root .pt-sub { color: var(--mute); font-variant-numeric: tabular-nums; }
.patlat-root .pt-sub { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; min-width: 0; white-space: nowrap; }
.patlat-root .pt-sw { flex: none; width: 10px; height: 10px; border-radius: 3px; background: var(--pc); box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .08); transition: background .4s; }
.patlat-root .pt-new { flex: none; }
.patlat-root .pt-new svg { width: 18px; height: 18px; flex: none; }
.patlat-root .pt-frame { display: grid; place-items: start center; width: min(100%, 980px); overflow: hidden; border-radius: var(--r-xl); }
.patlat-root .pt-frame > * { grid-area: 1 / 1; }
.patlat-root .pt-sheet {
  display: grid; padding: var(--pad); border-radius: var(--r-xl); touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  background: linear-gradient(155deg, color-mix(in srgb, var(--pc) 78%, white), var(--pc) 55%, color-mix(in srgb, var(--pc) 88%, black));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .5), inset 0 -2px 0 rgba(var(--sh), .1), 0 30px 60px -40px var(--shade);
  transform-origin: 50% 0;
}
.patlat-root .pt-row { display: flex; gap: var(--gap); }
.patlat-root .pt-row + .pt-row { margin-top: calc((var(--s) + var(--gap)) * -.134 + var(--gap)); }
.patlat-root .pt-row:nth-child(even) { padding-left: calc((var(--s) + var(--gap)) / 2); }
.patlat-root .b {
  position: relative; flex: none; width: var(--s); height: var(--s); border-radius: 50%; cursor: pointer;
  background:
    radial-gradient(circle at 33% 28%, rgba(255, 255, 255, .95) 0 8%, rgba(255, 255, 255, .38) 19%, transparent 42%),
    radial-gradient(circle at 50% 60%, rgba(255, 255, 255, .26), rgba(255, 255, 255, .08) 62%, rgba(var(--sh), .13) 100%);
  box-shadow: inset 0 -5px 9px rgba(var(--sh), .22), inset 0 2px 2px rgba(255, 255, 255, .5), 0 4px 7px rgba(var(--sh), .22);
  transition: transform .14s var(--ease), box-shadow .14s;
}
@media (hover: hover) { .patlat-root .b:not(.popped):hover { transform: scale(1.05); } }
.patlat-root .b.popped {
  cursor: default; transform: scale(.86);
  background:
    linear-gradient(35deg, transparent 46%, rgba(255, 255, 255, .3) 47% 50%, transparent 51%),
    linear-gradient(-50deg, transparent 52%, rgba(var(--sh), .16) 53% 55%, transparent 56%),
    rgba(var(--sh), .11);
  box-shadow: inset 0 2px 5px rgba(var(--sh), .28);
}
.patlat-root .b.popped::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, .9); animation: pt-burst .38s var(--ease) forwards; pointer-events: none; }
@keyframes pt-burst { from { transform: scale(.7); opacity: 1; } to { transform: scale(1.45); opacity: 0; } }
.patlat-root .pt-size button { min-height: 40px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; }
.patlat-root .pt-size i { flex: none; width: var(--d); height: var(--d); border-radius: 50%; background: currentColor; opacity: .35; }
.patlat-root .pt-size button[aria-pressed="true"] i { opacity: .8; }
@media (max-width: 359px) { .patlat-root .pt-new { padding: 0 14px; } .patlat-root .pt-size button { padding: 0 12px; } }
`,
  hint: 'Basılı tut ve sürükle · Boşluk rastgele · N yeni sayfa',
  mount(el) {
    let total = store.get('pt-total', 0), sheetNo = store.get('pt-sheets', 0) + 1;
    if (!Number.isFinite(total) || total < 0) total = 0;
    if (!Number.isFinite(sheetNo) || sheetNo < 1) sheetNo = 1;
    let size = store.get(K_SIZE, 'orta'); if (!SIZES[size]) size = 'orta';
    let hue = (sheetNo - 1) % SHEETS.length;   // advances with every new sheet, so consecutive sheets never share a colour
    let popped = 0, count = 0, lastSound = 0, sheet = null, dirty = 0, down = null, w0 = 0, sheetW = 0, nextT = 0;
    const NEW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
    el.innerHTML = `
      <div class="toy patlat-root">
        <div class="pt-head">
          <div class="pt-count"><b id="pt-n">0</b><span class="mono" id="pt-of"></span></div>
          <button type="button" class="btn pt-new" id="pt-new">Yeni sayfa ${NEW_SVG}</button>
          <p class="mono pt-sub"><i class="pt-sw" id="pt-sw" aria-hidden="true"></i><span id="pt-total"></span></p>
        </div>
        <div class="pt-frame" id="pt-frame"></div>
        <div class="seg pt-size" role="group" aria-label="Balon boyu">${SIZE_IDS.map((k, i) => `<button type="button" data-size="${k}" aria-pressed="${k === size}"><i style="--d:${6 + i * 3}px" aria-hidden="true"></i>${SIZES[k].name}</button>`).join('')}</div>
      </div>`;
    const toyEl = $('.patlat-root', el), frame = $('#pt-frame', el), nEl = $('#pt-n', el), ofEl = $('#pt-of', el), totEl = $('#pt-total', el), sw = $('#pt-sw', el);
    const head = $('.pt-head', el), sizeEl = $('.pt-size', el);
    const body = el.closest('.stage-body') || el;
    function renderCount() {
      nEl.textContent = popped; ofEl.textContent = `/ ${count}`;
      totEl.textContent = `Sayfa ${sheetNo} · toplam ${fmt(total)} balon`;
    }
    function paint(node) {
      const t = SHEETS[hue];
      node.style.setProperty('--pc', `var(--${t.c})`); node.style.setProperty('--sh', t.sh);
      sw.style.setProperty('--pc', `var(--${t.c})`);
    }
    function build() {
      const W = frame.clientWidth; w0 = W;
      const sz = SIZES[size], d = W < 560 ? 0 : 1;
      const s0 = sz.s[d], g0 = sz.g[d], pad = d ? 26 : 16;
      const cols = Math.max(4, Math.floor((W - pad * 2 - (s0 + g0) / 2 + g0) / (s0 + g0)));
      /* Scale bubble + gap a touch so the sheet fills the frame edge to edge. */
      const f = clamp((W - pad * 2) / ((cols + 0.5) * s0 + (cols - 0.5) * g0), 1, 1.3);
      const s = +(s0 * f).toFixed(2), gap = +(g0 * f).toFixed(2);
      const cs = getComputedStyle(body), ts = getComputedStyle(toyEl);
      const rowGap = parseFloat(ts.rowGap) || 16;
      const availH = body.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - head.offsetHeight - sizeEl.offsetHeight - rowGap * 2 - 2;
      const pitch = (s + gap) * 0.866;
      const rows = clamp(Math.floor((availH - pad * 2 - s) / pitch) + 1, 4, 18);
      const sh = document.createElement('div'); sh.className = 'pt-sheet';
      sh.setAttribute('role', 'group'); sh.setAttribute('aria-label', `Balonlu naylon, ${rows * cols} balon`);
      sh.style.cssText = `--s:${s}px;--gap:${gap}px;--pad:${pad}px`;
      paint(sh);
      let html = '';
      for (let r = 0; r < rows; r++) html += '<div class="pt-row">' + '<span class="b"></span>'.repeat(cols) + '</div>';
      sh.innerHTML = html; count = rows * cols; popped = 0;
      sheetW = pad * 2 + (cols + 0.5) * s + (cols - 0.5) * gap;
      return sh;
    }
    /* how: 'slide' (a fresh sheet slides in), 'fade' (same sheet re-laid out), 'none' */
    function newSheet(how) {
      const old = sheet; sheet = build(); frame.append(sheet); renderCount();
      const anim = motionOK() && how !== 'none';
      if (old) {
        if (anim && how === 'slide') {
          old.style.pointerEvents = 'none';
          old.animate([{ transform: 'none' }, { transform: 'translateX(-112%) rotate(-3deg)' }], { duration: 560, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }).onfinish = () => old.remove();
          sheet.animate([{ transform: 'translateX(112%) rotate(3deg)' }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)' });
        } else old.remove();
      }
      if (anim && how === 'fade') sheet.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    function freshSheet() { clearTimeout(nextT); hue = (hue + 1) % SHEETS.length; newSheet('slide'); }
    function popSound() {
      const ctx = Sound.ensure(); if (!ctx) return;
      const t = ctx.currentTime, z = SIZES[size].z, k = 1 / Math.sqrt(z);
      Sound.noise(t, 0.08).connect(Sound.filt('bandpass', rand(700, 2200) * z, 1.4)).connect(Sound.env(t, 0.9, 0.0008, rand(0.03, 0.06) * k)).connect(Sound.out);
      const og = Sound.env(t, 0.25, 0.001, 0.045 * k); og.connect(Sound.out);
      Sound.osc('sine', rand(280, 460) * z, t, og, 0.06 * k, 90 * z, 0.05 * k);
    }
    function pop(b) {
      b.classList.add('popped'); popped++; total++; dirty++;
      const now = performance.now(); if (now - lastSound > 16) { popSound(); lastSound = now; }
      vibrate(6);
      if (dirty >= 15) { store.set('pt-total', total); dirty = 0; }
      renderCount();
      if (popped === count) {
        store.set('pt-total', total); store.set('pt-sheets', sheetNo); sheetNo++; dirty = 0;
        say('Sayfa bitti. Yenisi geliyor.');
        nextT = setTimeout(() => { Sound.chime(); freshSheet(); }, 420);
      }
    }
    function popAt(x, y) { const t = document.elementFromPoint(x, y); if (t && t.classList.contains('b') && !t.classList.contains('popped') && sheet && sheet.contains(t)) pop(t); }
    function setSize(k) {
      if (!SIZES[k] || k === size) return;
      size = k; store.set(K_SIZE, size);
      $$('[data-size]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.size === k));
      clearTimeout(nextT);
      if (dirty) { store.set('pt-total', total); dirty = 0; }
      newSheet('fade');
    }
    frame.addEventListener('pointerdown', e => {
      if (e.button > 0 || !sheet || !sheet.contains(e.target)) return;
      down = e.pointerId; try { frame.setPointerCapture(e.pointerId); } catch (err) {}
      popAt(e.clientX, e.clientY);
    });
    frame.addEventListener('pointermove', e => {
      if (down !== e.pointerId) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(ev => popAt(ev.clientX, ev.clientY));
    });
    const up = e => { if (down === e.pointerId) down = null; };
    frame.addEventListener('pointerup', up); frame.addEventListener('pointercancel', up);
    $('#pt-new', el).addEventListener('click', () => { store.set('pt-total', total); dirty = 0; freshSheet(); });
    sizeEl.addEventListener('click', e => { const b = e.target.closest('[data-size]'); if (b) setSize(b.dataset.size); });
    /* Width changes: an untouched sheet is rebuilt to fit; a sheet in progress is scaled down rather than losing its pops. */
    let ro = null, raf = 0;
    const fit = () => {
      if (!sheet) return;
      const W = frame.clientWidth;
      if (popped === 0 && Math.abs(W - w0) > 2) { newSheet('none'); return; }
      sheet.style.transform = sheetW > W + 0.5 ? `scale(${W / sheetW})` : '';
    };
    if ('ResizeObserver' in window) ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    newSheet('none');
    if (ro) ro.observe(frame);
    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key.toLocaleLowerCase('tr');
        if (e.key === ' ') {
          e.preventDefault();
          const left = $$('.b:not(.popped)', sheet);
          if (left.length && popped < count) pop(left[Math.floor(Math.random() * left.length)]);
        } else if (k === 'n' && !e.repeat) { e.preventDefault(); store.set('pt-total', total); dirty = 0; freshSheet(); }
        else if (/^[1-3]$/.test(e.key) && !e.repeat) { e.preventDefault(); setSize(SIZE_IDS[+e.key - 1]); }
      },
      destroy() { store.set('pt-total', total); clearTimeout(nextT); if (ro) ro.disconnect(); cancelAnimationFrame(raf); },
    };
  },
});
})();
