/* Nefes — nefes rehberi */
(() => {
'use strict';
const BREATHS = {
  kutu: { name: 'Kutu', sub: '4·4·4·4', steps: [['Nefes al', 4, 'in'], ['Tut', 4, 'hold'], ['Ver', 4, 'out'], ['Bekle', 4, 'hold']] },
  dort: { name: '4-7-8', sub: '4·7·8', steps: [['Nefes al', 4, 'in'], ['Tut', 7, 'hold'], ['Ver', 8, 'out']] },
  sakin: { name: 'Sakin', sub: '5·5', steps: [['Nefes al', 5, 'in'], ['Ver', 5, 'out']] },
};

registerToy('nefes', {
  name: 'Nefes', color: 'mint', cf: 'on-light', kind: 'Sakinleş', open: 'Nefes’i aç',
  cats: ["sakin"],
  desc: 'Sıkıntı bazen sadece yorgunluktur. Bir dakika nefes al.',
  art: '<div class="br"><i></i></div>',
  stat: () => { const t = store.get('nf-total', 0); return t >= 60 ? `Toplam ${Math.round(t / 60)} dk nefes` : '3 nefes ritmi'; },
  css: `
.br { display: grid; place-items: center; width: 112px; aspect-ratio: 1; border-radius: 50%; background: rgba(255, 255, 255, .3); }
.br i { width: 64%; aspect-ratio: 1; border-radius: 50%; background: var(--paper); animation: breathe 8s cubic-bezier(.45, 0, .55, 1) infinite; }
@keyframes breathe { 0%, 100% { transform: scale(.6); } 50% { transform: scale(1); } }

.seg-sub { margin-left: 6px; font: 500 11px var(--f-mono); opacity: .6; }
.breath { position: relative; display: grid; place-items: center; width: min(380px, 78vw, max(230px, calc(100vh - 360px))); aspect-ratio: 1; }
.breath svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.ring-bg { fill: none; stroke: var(--line-2); stroke-width: 1.2; }
.ring { fill: none; stroke: var(--fg); stroke-width: 2.2; stroke-linecap: round; }
.orb {
  position: absolute; inset: 9%; border-radius: 50%; transform: scale(.55);
  background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--mint) 45%, white), var(--mint) 58%, color-mix(in srgb, var(--mint) 75%, var(--green)));
  box-shadow: 0 30px 70px -30px color-mix(in srgb, var(--mint) 70%, transparent);
}
.breath-label { position: relative; display: grid; justify-items: center; gap: 6px; color: var(--on-light); text-align: center; }
.phase { font-size: clamp(22px, 3vw, 32px); font-weight: 700; line-height: 1.05; letter-spacing: -.03em; }
.count { font-size: 14px; font-variant-numeric: tabular-nums; }
.nf-meta { color: var(--mute); }
`,
  hint: 'Boşluk başlat / durdur',
  mount(el) {
    let mode = store.get('nf-mode', 'kutu');
    if (!BREATHS[mode]) mode = 'kutu';
    let running = false, si = 0, timers = [], cycles = 0, t0 = 0, clock = 0, tone = null, wake = null;
    el.innerHTML = `
      <div class="toy nefes">
        <div class="seg" role="group" aria-label="Nefes ritmi">${Object.entries(BREATHS).map(([k, b]) => `<button type="button" data-mode="${k}" aria-pressed="${k === mode}">${b.name}<span class="seg-sub">${b.sub}</span></button>`).join('')}</div>
        <div class="breath">
          <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-bg" cx="50" cy="50" r="48"/><circle class="ring" id="nf-ring" cx="50" cy="50" r="48" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>
          <div class="orb" id="nf-orb"></div>
          <div class="breath-label" aria-live="polite"><span class="phase" id="nf-phase">Hazır mısın?</span><span class="count mono" id="nf-count"></span></div>
        </div>
        <button type="button" class="btn primary" id="nf-go">Başla <kbd>Boşluk</kbd></button>
        <p class="mono nf-meta" id="nf-meta">Tur 0 · 00:00</p>
      </div>`;
    const orb = $('#nf-orb', el), ring = $('#nf-ring', el), phaseEl = $('#nf-phase', el), countEl = $('#nf-count', el), go = $('#nf-go', el), metaEl = $('#nf-meta', el);
    const important = (node, prop, val) => node.style.setProperty(prop, val, motionOK() ? '' : 'important');
    const two = n => String(n).padStart(2, '0');
    function idleCopy() { phaseEl.textContent = 'Hazır mısın?'; countEl.textContent = BREATHS[mode].sub; }
    function renderMeta() { const s = running ? Math.floor((performance.now() - t0) / 1000) : 0; metaEl.textContent = `Tur ${cycles} · ${two(Math.floor(s / 60))}:${two(s % 60)}`; }
    function phase() {
      const steps = BREATHS[mode].steps, [label, sec, kind] = steps[si];
      phaseEl.textContent = label; countEl.textContent = sec;
      important(orb, 'transition', `transform ${sec}s cubic-bezier(.45,0,.55,1)`);
      if (kind === 'in') orb.style.transform = 'scale(1)'; else if (kind === 'out') orb.style.transform = 'scale(.55)';
      ring.style.setProperty('transition', 'none', 'important'); ring.style.strokeDashoffset = 100; ring.getBoundingClientRect();
      important(ring, 'transition', `stroke-dashoffset ${sec}s linear`); ring.style.strokeDashoffset = 0;
      if (tone) tone.stop();
      tone = kind === 'in' ? Sound.swell(196, 261.6, sec) : kind === 'out' ? Sound.swell(261.6, 196, sec) : null;
      for (let k = 1; k < sec; k++) timers.push(setTimeout(() => { countEl.textContent = sec - k; }, k * 1000));
      timers.push(setTimeout(() => { si = (si + 1) % steps.length; if (si === 0) { cycles++; renderMeta(); } phase(); }, sec * 1000));
    }
    function begin() {
      running = true; si = 0; cycles = 0; t0 = performance.now();
      go.innerHTML = 'Durdur <kbd>Boşluk</kbd>';
      clock = setInterval(renderMeta, 1000); renderMeta(); phase();
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { wake = l; }).catch(() => {}); } catch (e) {}
    }
    function end() {
      if (running) store.set('nf-total', store.get('nf-total', 0) + Math.round((performance.now() - t0) / 1000));
      running = false; timers.forEach(clearTimeout); timers = []; clearInterval(clock);
      if (tone) { tone.stop(); tone = null; }
      important(orb, 'transition', 'transform .9s cubic-bezier(.45,0,.55,1)'); orb.style.transform = 'scale(.55)';
      ring.style.setProperty('transition', 'stroke-dashoffset .6s ease', ''); ring.style.strokeDashoffset = 100;
      go.innerHTML = 'Başla <kbd>Boşluk</kbd>';
      idleCopy(); renderMeta();
      if (wake) { wake.release().catch(() => {}); wake = null; }
    }
    go.addEventListener('click', () => (running ? end() : begin()));
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-mode]'); if (!b) return;
      const was = running; if (running) end();
      mode = b.dataset.mode; store.set('nf-mode', mode);
      $$('[data-mode]', el).forEach(x => x.setAttribute('aria-pressed', x === b));
      idleCopy(); if (was) begin();
    });
    idleCopy();
    return {
      onKey(e) { if (e.key === ' ' && !isField(e.target)) { e.preventDefault(); if (!e.repeat) (running ? end() : begin()); } },
      destroy() { end(); },
    };
  },
});
})();
