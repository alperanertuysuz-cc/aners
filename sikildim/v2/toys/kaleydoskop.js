/* Kaleydoskop — simetrik çizim */
(() => {
'use strict';
const PALETTES = {
  gunbatimi: { name: 'Gün batımı', c: ['#FF7EB3', '#FF6B2C', '#FFC83A', '#FFE9C9'] },
  deniz: { name: 'Deniz', c: ['#5DB6FF', '#2E54EA', '#93D8C0', '#E6F5FF'] },
  orman: { name: 'Orman', c: ['#22B36C', '#93D8C0', '#FFC83A', '#F1FFE8'] },
  tebesir: { name: 'Tebeşir', c: ['#F4F4F5', '#9AA0AA', '#E9EAEE', '#C9CDD3'] },
};

registerToy('kaleydoskop', {
  name: 'Kaleydoskop', color: 'pink', cf: 'on-light', kind: 'Çizim', open: 'Kaleydoskop’u aç',
  cats: ["yaratici", "sakin"],
  desc: 'Tek bir çizgi çiz, on altı kez yansısın.',
  art: '<div class="kal-mini"><i></i><i></i><i></i></div>',
  stat: () => '6–16 kat simetri',
  css: `
.kal-mini { position: relative; width: 118px; aspect-ratio: 1; transition: transform 2.4s var(--ease); }
.kal-mini i { position: absolute; border-radius: 50%; }
.kal-mini i:nth-child(1) {
  inset: 0; background: repeating-conic-gradient(var(--on-light) 0 5deg, transparent 5deg 15deg);
  -webkit-mask: radial-gradient(circle, transparent 0 56%, #000 57% 100%); mask: radial-gradient(circle, transparent 0 56%, #000 57% 100%);
}
.kal-mini i:nth-child(2) {
  inset: 18%; background: repeating-conic-gradient(var(--paper) 0 15deg, transparent 15deg 30deg);
  -webkit-mask: radial-gradient(circle, transparent 0 30%, #000 31% 100%); mask: radial-gradient(circle, transparent 0 30%, #000 31% 100%);
}
.kal-mini i:nth-child(3) { inset: 40%; background: var(--on-light); }
.tile:hover .kal-mini { transform: rotate(60deg); }

.kal-tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; }
.chip.swatch i { width: 22px; height: 10px; border-radius: 3px; }
.kal-stage {
  position: relative; max-width: 100%; aspect-ratio: 1; border-radius: var(--r-xl); overflow: hidden;
  background: var(--canvas); box-shadow: 0 36px 70px -44px var(--shade); touch-action: none; cursor: crosshair;
}
.kal-stage canvas { display: block; width: 100%; height: 100%; transition: opacity .22s; }
.kal-hint {
  position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); padding: 8px 14px; border-radius: 999px;
  background: rgba(255, 255, 255, .08); color: var(--canvas-fg); pointer-events: none; white-space: nowrap; transition: opacity .4s;
}
`,
  hint: 'Sürükle ve çiz · C temizle · O kendiliğinden',
  mount(el) {
    let sym = store.get('kal-sym', 8), mirror = store.get('kal-mirror', true) !== false, palKey = store.get('kal-pal', 'gunbatimi');
    if (![6, 8, 12, 16].includes(sym)) sym = 8;
    if (!PALETTES[palKey]) palKey = 'gunbatimi';
    const BG = '#0E0F12';
    el.innerHTML = `
      <div class="toy kal">
        <div class="kal-tools">
          <div class="seg" role="group" aria-label="Simetri">${[6, 8, 12, 16].map(n => `<button type="button" data-sym="${n}" aria-pressed="${n === sym}">${n}×</button>`).join('')}</div>
          <button type="button" class="chip" id="kal-mirror" aria-pressed="${mirror}">Ayna</button>
          <div class="chips" role="group" aria-label="Renkler">${Object.entries(PALETTES).map(([k, p]) => `<button type="button" class="chip swatch" data-pal="${k}" aria-pressed="${k === palKey}"><i style="background:linear-gradient(90deg,${p.c.join(',')})"></i>${p.name}</button>`).join('')}</div>
          <button type="button" class="chip" id="kal-auto" aria-pressed="false">Kendiliğinden</button>
          <button type="button" class="btn" id="kal-clear">Temizle <kbd>C</kbd></button>
        </div>
        <div class="kal-stage" id="kal-stage"><canvas id="kal-cv" role="img" aria-label="Kaleydoskop çizim alanı"></canvas><p class="kal-hint mono" id="kal-hint">Sürükle ve çiz</p></div>
      </div>`;
    const stageEl = $('#kal-stage', el), cv = $('#kal-cv', el), g = cv.getContext('2d'), hint = $('#kal-hint', el), autoBtn = $('#kal-auto', el);
    const body = el.closest('.stage-body') || el;
    let size = 0, dpr = 1, hueT = Math.random(), rgb = [], pen = null, auto = false, raf = 0, demoT = 0, autoPen = null, seed = [], hinted = false;
    const parse = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    function setPal() { rgb = PALETTES[palKey].c.map(parse); }
    function colorAt(t) {
      const n = rgb.length, x = ((t % 1) + 1) % 1 * n, i = Math.floor(x), f = x - i, a = rgb[i], b = rgb[(i + 1) % n];
      return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
    }
    function paintBg() { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = BG; g.fillRect(0, 0, cv.width, cv.height); g.restore(); }
    function fit() {
      const tools = $('.kal-tools', el), toy = $('.toy', el);
      const s = Math.floor(clamp(Math.min(toy.clientWidth, body.clientHeight - tools.offsetHeight - 100), 260, 780));
      if (Math.abs(s - size) < 2) return;
      let snap = null;
      if (size) { snap = document.createElement('canvas'); snap.width = cv.width; snap.height = cv.height; snap.getContext('2d').drawImage(cv, 0, 0); }
      size = s; dpr = Math.min(2, window.devicePixelRatio || 1);
      stageEl.style.width = s + 'px';
      cv.width = Math.round(s * dpr); cv.height = Math.round(s * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); paintBg();
      if (snap) g.drawImage(snap, 0, 0, s, s);
    }
    function draw(x0, y0, x1, y1, w, col) {
      const c = size / 2;
      g.save(); g.translate(c, c); g.globalCompositeOperation = 'screen'; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col;
      g.beginPath();
      for (let k = 0; k < sym; k++) {
        const a = k * TAU / sym, ca = Math.cos(a), sa = Math.sin(a);
        g.moveTo(x0 * ca - y0 * sa, x0 * sa + y0 * ca); g.lineTo(x1 * ca - y1 * sa, x1 * sa + y1 * ca);
        if (mirror) { g.moveTo(x0 * ca + y0 * sa, x0 * sa - y0 * ca); g.lineTo(x1 * ca + y1 * sa, x1 * sa - y1 * ca); }
      }
      g.globalAlpha = 0.13; g.lineWidth = w * 2.8; g.stroke();
      g.globalAlpha = 0.95; g.lineWidth = w; g.stroke();
      g.restore();
    }
    function seg(st, x, y) {
      const dx = x - st.x, dy = y - st.y, d = Math.hypot(dx, dy);
      if (d < 0.6) return;
      const mx = st.max || 10, k = size / 600, target = clamp(mx - d * 0.32, 1.4, mx) * k;
      st.w += (target - st.w) * 0.35;
      hueT += d / (size * 1.6);
      const c = size / 2;
      draw(st.x - c, st.y - c, x - c, y - c, st.w, colorAt(hueT));
      st.x = x; st.y = y;
    }
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (size / r.width), y: (e.clientY - r.top) * (size / r.height) }; };
    function hideHint() { if (!hinted) { hinted = true; hint.style.opacity = 0; } }
    function fadeStep() { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = 'rgba(14,15,18,0.035)'; g.fillRect(0, 0, cv.width, cv.height); g.restore(); }
    function startAuto(fade) {
      stopAuto(); auto = true; autoBtn.setAttribute('aria-pressed', 'true');
      seed = Array.from({ length: 4 }, () => rand(0, TAU)); autoPen = null;
      const t0 = performance.now();
      const loop = now => {
        const t = (now - t0) / 1000, R = size * 0.46;
        const r = R * (0.3 + 0.64 * (0.5 + 0.5 * Math.sin(t * 1.25 + seed[0])) * (0.75 + 0.25 * Math.sin(t * 0.41 + seed[1])));
        const a = seed[3] + t * 1.05 + 0.8 * Math.sin(t * 0.6 + seed[2]);
        const x = size / 2 + r * Math.cos(a), y = size / 2 + r * Math.sin(a);
        if (!autoPen) autoPen = { x, y, w: 2.5 * size / 600, max: 5.5 }; else seg(autoPen, x, y);
        if (fade) fadeStep();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    function stopAuto() { clearTimeout(demoT); if (auto) { auto = false; cancelAnimationFrame(raf); autoBtn.setAttribute('aria-pressed', 'false'); } }
    function clear() { if (motionOK()) { cv.style.opacity = 0; setTimeout(() => { paintBg(); cv.style.opacity = 1; }, 220); } else paintBg(); }
    cv.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      stopAuto(); hideHint();
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      const p = pt(e); pen = { id: e.pointerId, x: p.x, y: p.y, w: 5 * size / 600 };
      seg({ x: p.x - 1, y: p.y, w: pen.w }, p.x, p.y);
    });
    cv.addEventListener('pointermove', e => {
      if (!pen || e.pointerId !== pen.id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(ev => { const p = pt(ev); seg(pen, p.x, p.y); });
    });
    const up = e => { if (pen && e.pointerId === pen.id) pen = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    el.addEventListener('click', e => {
      const sb = e.target.closest('[data-sym]'), pb = e.target.closest('[data-pal]');
      if (sb) { sym = +sb.dataset.sym; store.set('kal-sym', sym); $$('[data-sym]', el).forEach(b => b.setAttribute('aria-pressed', b === sb)); }
      if (pb) { palKey = pb.dataset.pal; store.set('kal-pal', palKey); setPal(); $$('[data-pal]', el).forEach(b => b.setAttribute('aria-pressed', b === pb)); }
    });
    $('#kal-mirror', el).addEventListener('click', e => { mirror = !mirror; store.set('kal-mirror', mirror); e.currentTarget.setAttribute('aria-pressed', mirror); });
    autoBtn.addEventListener('click', () => { if (auto) stopAuto(); else { hideHint(); startAuto(true); } });
    $('#kal-clear', el).addEventListener('click', clear);
    let ro = null, rraf = 0;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(fit); }); ro.observe(body); }
    setPal(); fit();
    if (motionOK()) { startAuto(false); demoT = setTimeout(stopAuto, 3200); }
    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key.toLocaleLowerCase('tr');
        if (k === 'c') { e.preventDefault(); clear(); }
        else if (k === 'o') { e.preventDefault(); if (auto) stopAuto(); else { hideHint(); startAuto(true); } }
      },
      destroy() { stopAuto(); if (ro) ro.disconnect(); cancelAnimationFrame(rraf); },
    };
  },
});
})();
