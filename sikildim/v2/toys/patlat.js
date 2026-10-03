/* Patlat — balonlu naylon */
(() => {
'use strict';

registerToy('patlat', {
  name: 'Patlat', color: 'sky', cf: 'on-light', kind: 'Dokunma', open: 'Patlat’ı aç',
  cats: ["sakin"],
  desc: 'Bitmeyen balonlu naylon. Basılı tut ve sürükle.',
  art: '<div class="bub"><i></i><i></i><i class="p"></i><i></i><i></i><i></i><i class="p"></i><i class="p"></i><i></i><i></i><i></i><i></i><i></i><i class="p"></i><i></i></div>',
  stat: () => { const pt = store.get('pt-total', 0); return pt ? `${fmt(pt)} balon patladı` : 'Sonsuz sayfa'; },
  css: `
.bub { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; width: min(100%, 200px); }
.bub i {
  aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, rgba(255, 255, 255, .95) 0 9%, rgba(255, 255, 255, .3) 22%, transparent 46%), rgba(255, 255, 255, .34);
  box-shadow: inset 0 -3px 6px rgba(0, 40, 100, .18), 0 2px 4px rgba(0, 40, 100, .16);
  transition: transform .2s var(--spring);
}
.bub i:nth-child(n+6):nth-child(-n+10) { transform: translateX(50%); }
.bub i.p { background: rgba(0, 40, 100, .12); box-shadow: inset 0 2px 4px rgba(0, 40, 100, .22); transform: scale(.84); }
.bub i.p:nth-child(n+6):nth-child(-n+10) { transform: translateX(50%) scale(.84); }
.tile:hover .bub i:nth-child(4) { transform: scale(.84); background: rgba(0, 40, 100, .12); box-shadow: inset 0 2px 4px rgba(0, 40, 100, .22); }

.pt-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; width: min(100%, 980px); }
.pt-count { display: flex; align-items: baseline; gap: 12px; }
.pt-count b { font-size: clamp(36px, 4.4vw, 56px); font-weight: 800; line-height: 1; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
.pt-count .mono, .pt-total { color: var(--mute); }
.sheet-frame { display: grid; place-items: center; width: min(100%, 980px); overflow: hidden; border-radius: var(--r-xl); }
.sheet-frame > * { grid-area: 1 / 1; }
.sheet {
  display: grid; padding: var(--pad); border-radius: var(--r-xl); touch-action: none; user-select: none; -webkit-user-select: none;
  background: linear-gradient(155deg, color-mix(in srgb, var(--sky) 80%, white), var(--sky) 55%, color-mix(in srgb, var(--sky) 88%, black));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .5), 0 30px 60px -40px var(--shade);
}
.row { display: flex; gap: var(--gap); }
.row + .row { margin-top: calc((var(--s) + var(--gap)) * -.134 + var(--gap)); }
.row:nth-child(even) { padding-left: calc((var(--s) + var(--gap)) / 2); }
.b {
  position: relative; flex: none; width: var(--s); height: var(--s); border-radius: 50%; cursor: pointer;
  background:
    radial-gradient(circle at 33% 28%, rgba(255, 255, 255, .95) 0 8%, rgba(255, 255, 255, .35) 19%, transparent 42%),
    radial-gradient(circle at 50% 60%, rgba(255, 255, 255, .25), rgba(255, 255, 255, .08) 62%, rgba(0, 30, 80, .12) 100%);
  box-shadow: inset 0 -5px 9px rgba(0, 40, 100, .2), inset 0 2px 2px rgba(255, 255, 255, .45), 0 4px 7px rgba(0, 40, 100, .2);
  transition: transform .14s var(--ease), box-shadow .14s;
}
.b:hover { transform: scale(1.05); }
.b.popped {
  cursor: default; transform: scale(.86);
  background:
    linear-gradient(35deg, transparent 46%, rgba(255, 255, 255, .28) 47% 50%, transparent 51%),
    linear-gradient(-50deg, transparent 52%, rgba(0, 30, 80, .14) 53% 55%, transparent 56%),
    rgba(0, 30, 80, .1);
  box-shadow: inset 0 2px 5px rgba(0, 40, 100, .26);
}
.b.popped::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, .9); animation: burst .38s var(--ease) forwards; pointer-events: none; }
@keyframes burst { from { transform: scale(.7); opacity: 1; } to { transform: scale(1.45); opacity: 0; } }
`,
  hint: 'Basılı tut ve sürükle · Boşluk rastgele',
  mount(el) {
    let total = store.get('pt-total', 0), sheetNo = store.get('pt-sheets', 0) + 1, popped = 0, count = 0, lastSound = 0, sheet = null, dirty = 0, down = null, w0 = 0;
    el.innerHTML = `
      <div class="toy patlat">
        <div class="pt-head">
          <div class="pt-count"><b id="pt-n">0</b><span class="mono" id="pt-of"></span></div>
          <p class="mono pt-total" id="pt-total"></p>
          <button type="button" class="btn" id="pt-new">Yeni sayfa</button>
        </div>
        <div class="sheet-frame" id="pt-frame"></div>
      </div>`;
    const frame = $('#pt-frame', el), nEl = $('#pt-n', el), ofEl = $('#pt-of', el), totEl = $('#pt-total', el);
    const body = el.closest('.stage-body') || el;
    function renderCount() { nEl.textContent = popped; ofEl.textContent = `/ ${count} · sayfa ${sheetNo}`; totEl.textContent = `Toplam ${fmt(total)} balon`; }
    function build() {
      const W = frame.clientWidth; w0 = W;
      const small = W < 560;
      const s = small ? 46 : 58, gap = small ? 7 : 10, pad = small ? 16 : 26;
      const cols = Math.max(4, Math.floor((W - pad * 2 - (s + gap) / 2 + gap) / (s + gap)));
      const availH = Math.max(300, body.clientHeight - $('.pt-head', el).offsetHeight - 110);
      const pitch = (s + gap) * 0.866;
      const rows = clamp(Math.floor((availH - pad * 2 - s) / pitch) + 1, 4, 9);
      const sh = document.createElement('div'); sh.className = 'sheet';
      sh.setAttribute('role', 'group'); sh.setAttribute('aria-label', 'Balonlu naylon');
      sh.style.cssText = `--s:${s}px;--gap:${gap}px;--pad:${pad}px`;
      let html = '';
      for (let r = 0; r < rows; r++) html += '<div class="row">' + '<span class="b"></span>'.repeat(cols) + '</div>';
      sh.innerHTML = html; count = rows * cols; popped = 0;
      return sh;
    }
    function newSheet(animate) {
      const old = sheet; sheet = build(); frame.append(sheet); renderCount();
      if (old) {
        if (animate && motionOK()) {
          old.animate([{ transform: 'none' }, { transform: 'translateX(-112%) rotate(-3deg)' }], { duration: 560, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }).onfinish = () => old.remove();
          sheet.animate([{ transform: 'translateX(112%) rotate(3deg)' }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)' });
        } else old.remove();
      }
    }
    function pop(b) {
      b.classList.add('popped'); popped++; total++; dirty++;
      const now = performance.now(); if (now - lastSound > 16) { Sound.pop(); lastSound = now; }
      vibrate(6);
      if (dirty >= 15) { store.set('pt-total', total); dirty = 0; }
      renderCount();
      if (popped === count) {
        store.set('pt-total', total); store.set('pt-sheets', sheetNo); sheetNo++; dirty = 0;
        say('Sayfa bitti. Yenisi geliyor.');
        setTimeout(() => { Sound.chime(); newSheet(true); }, 420);
      }
    }
    function popAt(x, y) { const t = document.elementFromPoint(x, y); if (t && t.classList.contains('b') && !t.classList.contains('popped') && sheet.contains(t)) pop(t); }
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
    $('#pt-new', el).addEventListener('click', () => { store.set('pt-total', total); newSheet(true); });
    let ro = null, raf = 0;
    if ('ResizeObserver' in window) ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (popped === 0 && Math.abs(frame.clientWidth - w0) > 40) newSheet(false); }); });
    newSheet(false);
    if (ro) ro.observe(frame);
    return {
      onKey(e) {
        if (e.key !== ' ' || isField(e.target)) return;
        e.preventDefault();
        const left = $$('.b:not(.popped)', sheet);
        if (left.length) pop(left[Math.floor(Math.random() * left.length)]);
      },
      destroy() { store.set('pt-total', total); if (ro) ro.disconnect(); cancelAnimationFrame(raf); },
    };
  },
});
})();
