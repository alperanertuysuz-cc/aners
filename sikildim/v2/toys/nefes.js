/* Nefes — nefes rehberi: serbest ya da 1 / 3 / 5 dakikalık seans */
(() => {
'use strict';
const BREATHS = {
  kutu: { name: 'Kutu', sub: '4·4·4·4', steps: [['Nefes al', 4, 'in'], ['Tut', 4, 'hold'], ['Ver', 4, 'out'], ['Bekle', 4, 'hold']] },
  dort: { name: '4-7-8', sub: '4·7·8', steps: [['Nefes al', 4, 'in'], ['Tut', 7, 'hold'], ['Ver', 8, 'out']] },
  sakin: { name: 'Sakin', sub: '5·5', steps: [['Nefes al', 5, 'in'], ['Ver', 5, 'out']] },
};
/* Session length in minutes (0 = Serbest). Stored under a new key; 'nf-mode' and 'nf-total' keep their V1 shapes. */
const LENS = [[0, 'Serbest'], [1, '1 dk'], [3, '3 dk'], [5, '5 dk']];
const K_LEN = 'nefes-len';
const cycleLen = m => BREATHS[m].steps.reduce((a, s) => a + s[1], 0);
const outIdx = m => BREATHS[m].steps.findIndex(s => s[2] === 'out');
const outEnd = m => BREATHS[m].steps.slice(0, outIdx(m) + 1).reduce((a, s) => a + s[1], 0);
/* A timed session always ends right after an exhale: the one whose end lands nearest the chosen length. Returns that cycle index. */
const planK = (m, min) => (min ? Math.max(0, Math.round((min * 60 - outEnd(m)) / cycleLen(m))) : -1);
const plannedSec = (m, k) => k * cycleLen(m) + outEnd(m);
const two = n => String(n).padStart(2, '0');
const clockTxt = s => `${two(Math.floor(s / 60))}:${two(s % 60)}`;

registerToy('nefes', {
  name: 'Nefes', color: 'mint', cf: 'on-light', kind: 'Sakinleş', open: 'Nefes’i aç',
  cats: ["sakin"],
  desc: 'Sıkıntı bazen sadece yorgunluktur. Bir dakika nefes al.',
  art: '<div class="art-nefes"><i></i></div>',
  stat: () => { const t = store.get('nf-total', 0); return t >= 60 ? `Toplam ${Math.round(t / 60)} dk nefes` : '3 nefes ritmi'; },
  css: `
.art-nefes { display: grid; place-items: center; width: 112px; aspect-ratio: 1; border-radius: 50%; background: rgba(255, 255, 255, .3); }
.art-nefes i { width: 64%; aspect-ratio: 1; border-radius: 50%; background: var(--paper); animation: nf-art 8s cubic-bezier(.45, 0, .55, 1) infinite; }
@keyframes nf-art { 0%, 100% { transform: scale(.6); } 50% { transform: scale(1); } }

.nefes-root .nf-controls { display: grid; justify-items: center; gap: 10px; }
.nefes-root .nf-modes button { white-space: nowrap; }
.nefes-root .seg-sub { margin-left: 6px; font: 500 11px var(--f-mono); opacity: .6; }
.nefes-root .nf-lens { display: flex; align-items: center; justify-content: center; gap: 6px; }
.nefes-root .nf-lens .chip { height: 40px; padding: 0 15px; }
.nefes-root .nf-breath { position: relative; display: grid; place-items: center; width: min(380px, 78vw, max(208px, calc(100vh - 410px))); aspect-ratio: 1; container-type: inline-size; }
.nefes-root .nf-breath svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.nefes-root .nf-ring-bg { fill: none; stroke: var(--line-2); stroke-width: 1.2; }
.nefes-root .nf-ring { fill: none; stroke: var(--fg); stroke-width: 2.2; stroke-linecap: round; }
.nefes-root .nf-sess-bg { fill: none; stroke: var(--line); stroke-width: 1; opacity: 0; transition: opacity .6s; }
.nefes-root .nf-sess { fill: none; stroke: color-mix(in srgb, var(--mint) 55%, var(--green)); stroke-width: 1.6; stroke-linecap: round; opacity: 0; transition: opacity .6s; }
.nefes-root.timed .nf-sess-bg, .nefes-root.live .nf-sess { opacity: 1; }
.nefes-root .nf-orb {
  position: absolute; inset: 9%; border-radius: 50%; transform: scale(.55);
  background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--mint) 45%, white), var(--mint) 58%, color-mix(in srgb, var(--mint) 75%, var(--green)));
  box-shadow: 0 30px 70px -30px color-mix(in srgb, var(--mint) 70%, transparent);
}
/* The ink is dark in both themes, so the label must stay inside the resting orb (45% of the circle): size it to the circle. */
.nefes-root .nf-label { position: relative; display: grid; justify-items: center; gap: 6px; max-width: 43cqi; color: var(--on-light); text-align: center; }
.nefes-root .nf-phase { font-size: clamp(22px, 3vw, 32px); font-size: clamp(15px, 6.4cqi, 30px); font-weight: 700; line-height: 1.05; letter-spacing: -.03em; text-wrap: balance; }
.nefes-root .nf-count { font-size: 14px; font-variant-numeric: tabular-nums; }
.nefes-root.done .nf-count { font: 600 15px/1.2 var(--f-display); letter-spacing: -.01em; text-transform: none; text-wrap: balance; }
.nefes-root .nf-meta { color: var(--mute); font-variant-numeric: tabular-nums; }
@media (max-width: 359px) {
  .nefes-root .nf-modes button { padding: 0 14px; }
  .nefes-root .seg-sub { display: none; }
  .nefes-root .nf-lens .chip { padding: 0 12px; }
}
`,
  hint: 'Boşluk başlat / durdur · 1–4 süre',
  mount(el) {
    let mode = store.get('nf-mode', 'kutu');
    if (!BREATHS[mode]) mode = 'kutu';
    let len = store.get(K_LEN, 0);
    if (!LENS.some(([v]) => v === len)) len = 0;
    let running = false, si = 0, timers = [], cycles = 0, t0 = 0, clock = 0, tone = null, wake = null, kEnd = -1;
    el.innerHTML = `
      <div class="toy nefes-root">
        <div class="nf-controls">
          <div class="seg nf-modes" role="group" aria-label="Nefes ritmi">${Object.entries(BREATHS).map(([k, b]) => `<button type="button" data-mode="${k}" aria-pressed="${k === mode}">${b.name}<span class="seg-sub">${b.sub}</span></button>`).join('')}</div>
          <div class="nf-lens" role="group" aria-label="Seans süresi">${LENS.map(([v, label]) => `<button type="button" class="chip" data-len="${v}" aria-pressed="${v === len}">${label}</button>`).join('')}</div>
        </div>
        <div class="nf-breath">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle class="nf-sess-bg" cx="50" cy="50" r="44.5"/>
            <circle class="nf-sess" id="nf-sess" cx="50" cy="50" r="44.5" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
            <circle class="nf-ring-bg" cx="50" cy="50" r="48"/>
            <circle class="nf-ring" id="nf-ring" cx="50" cy="50" r="48" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
          </svg>
          <div class="nf-orb" id="nf-orb"></div>
          <div class="nf-label" aria-live="polite"><span class="nf-phase" id="nf-phase">Hazır mısın?</span><span class="nf-count mono" id="nf-count"></span></div>
        </div>
        <button type="button" class="btn primary" id="nf-go">Başla <kbd>Boşluk</kbd></button>
        <p class="mono nf-meta" id="nf-meta"></p>
      </div>`;
    const rootEl = $('.nefes-root', el), orb = $('#nf-orb', el), ring = $('#nf-ring', el), sess = $('#nf-sess', el);
    const phaseEl = $('#nf-phase', el), countEl = $('#nf-count', el), go = $('#nf-go', el), metaEl = $('#nf-meta', el);
    /* The breathing guide is the content, so it keeps moving under reduced motion: inline !important beats the global neutraliser. */
    const important = (node, prop, val) => node.style.setProperty(prop, val, motionOK() ? '' : 'important');
    const force = (node, prop, val) => node.style.setProperty(prop, val, 'important');
    const elapsed = () => (running ? (performance.now() - t0) / 1000 : 0);
    const timed = () => kEnd >= 0;

    function setGo(label) { go.innerHTML = `${label} <kbd>Boşluk</kbd>`; }
    function idleCopy() { phaseEl.textContent = 'Hazır mısın?'; countEl.textContent = BREATHS[mode].sub; }
    function renderMeta() {
      if (rootEl.classList.contains('done')) return;
      if (running && timed()) {
        const left = Math.max(0, Math.ceil(plannedSec(mode, kEnd) - elapsed()));
        metaEl.textContent = `Tur ${cycles} / ${kEnd + 1} · ${clockTxt(left)} kaldı`;
      } else if (running) metaEl.textContent = `Tur ${cycles} · ${clockTxt(Math.floor(elapsed()))}`;
      else if (len) { const k = planK(mode, len); metaEl.textContent = `${k + 1} tur · ${clockTxt(plannedSec(mode, k))}`; }
      else metaEl.textContent = 'Tur 0 · 00:00';
    }
    /* Session arc: from where we are now to the planned end, linearly. */
    function syncSession() {
      rootEl.classList.toggle('timed', running ? timed() : len > 0);
      rootEl.classList.toggle('live', running && timed());
      force(sess, 'transition', 'none');
      if (!running || !timed()) { sess.style.strokeDashoffset = 100; return; }
      const total = plannedSec(mode, kEnd), now = elapsed();
      sess.style.strokeDashoffset = 100 * (1 - clamp(now / total, 0, 1));
      sess.getBoundingClientRect();
      force(sess, 'transition', `stroke-dashoffset ${Math.max(0.1, total - now)}s linear, opacity .6s`);
      sess.style.strokeDashoffset = 0;
    }
    /* (Re)plan the end when the length changes mid-session; never end before the exhale we are in or about to take. */
    function plan() {
      kEnd = planK(mode, len);
      if (!running || kEnd < 0) return;
      if (kEnd < cycles) kEnd = cycles;
      if (kEnd === cycles && si > outIdx(mode)) kEnd = cycles + 1;
    }
    function phase() {
      const steps = BREATHS[mode].steps, [label, sec, kind] = steps[si];
      phaseEl.textContent = label; countEl.textContent = sec;
      important(orb, 'transition', `transform ${sec}s cubic-bezier(.45,0,.55,1)`);
      if (kind === 'in') orb.style.transform = 'scale(1)'; else if (kind === 'out') orb.style.transform = 'scale(.55)';
      force(ring, 'transition', 'none'); ring.style.strokeDashoffset = 100; ring.getBoundingClientRect();
      important(ring, 'transition', `stroke-dashoffset ${sec}s linear`); ring.style.strokeDashoffset = 0;
      if (tone) tone.stop();
      tone = kind === 'in' ? Sound.swell(196, 261.6, sec) : kind === 'out' ? Sound.swell(261.6, 196, sec) : null;
      for (let k = 1; k < sec; k++) timers.push(setTimeout(() => { countEl.textContent = sec - k; }, k * 1000));
      timers.push(setTimeout(() => {
        if (kind === 'out' && timed() && cycles >= kEnd) { finish(); return; }
        si = (si + 1) % steps.length; if (si === 0) { cycles++; renderMeta(); } phase();
      }, sec * 1000));
    }
    /* The browser drops the lock whenever the page is hidden; onVis asks again when we come back mid-session. */
    function lock() {
      if (!navigator.wakeLock || (wake && !wake.released) || document.visibilityState !== 'visible') return;
      try { navigator.wakeLock.request('screen').then(l => { if (running) wake = l; else l.release().catch(() => {}); }).catch(() => {}); } catch (e) {}
    }
    function unlock() { if (wake) { wake.release().catch(() => {}); wake = null; } }
    function clearDone() {
      if (!rootEl.classList.contains('done')) return;
      rootEl.classList.remove('done', 'live');
      orb.getAnimations().forEach(a => a.cancel());
    }
    function begin() {
      clearDone();
      running = true; si = 0; cycles = 0; t0 = performance.now();
      plan(); setGo('Durdur');
      clock = setInterval(renderMeta, 1000); renderMeta(); syncSession(); phase();
      lock();
    }
    function halt() {
      if (running) store.set('nf-total', store.get('nf-total', 0) + Math.round(elapsed()));
      running = false; timers.forEach(clearTimeout); timers = []; clearInterval(clock);
      if (tone) { tone.stop(); tone = null; }
      unlock();
    }
    /* Back to idle: orb empties, rings rewind, copy and meta show the next session. */
    function reset() {
      clearDone();
      if (!running) kEnd = planK(mode, len);
      important(orb, 'transition', 'transform .9s cubic-bezier(.45,0,.55,1)'); orb.style.transform = 'scale(.55)';
      important(ring, 'transition', 'stroke-dashoffset .6s ease'); ring.style.strokeDashoffset = 100;
      setGo('Başla'); idleCopy(); syncSession(); renderMeta();
    }
    function end() { halt(); reset(); }
    /* A soft, bowl-like two-note chime (G4 then D5, each with a faint inharmonic overtone). */
    function bowl() {
      const ctx = Sound.ensure(); if (!ctx) return;
      const t = ctx.currentTime + 0.04;
      [[392, 0, 0.075, 3.2], [392 * 2.71, 0, 0.016, 1.5], [587.33, 0.6, 0.055, 3.4], [587.33 * 2.71, 0.6, 0.012, 1.3]]
        .forEach(([f, d, vol, dur]) => Sound.tone(f, { when: t + d, vol, dur, attack: 0.015 }));
    }
    function finish() {
      const secs = Math.round(elapsed()), turs = cycles + 1, mins = len;
      halt();
      rootEl.classList.add('done', 'live');
      force(sess, 'transition', 'stroke-dashoffset .8s ease, opacity .6s'); sess.style.strokeDashoffset = 0;
      important(ring, 'transition', 'stroke-dashoffset .8s ease'); ring.style.strokeDashoffset = 0;
      /* The orb settles: one last, slower half-breath, then rests a little fuller than empty. */
      force(orb, 'transition', 'none'); orb.style.transform = 'scale(.64)';
      if (motionOK()) orb.animate([{ transform: 'scale(.55)' }, { transform: 'scale(.74)', offset: 0.45 }, { transform: 'scale(.64)' }], { duration: 2600, easing: 'cubic-bezier(.45,0,.55,1)' });
      phaseEl.textContent = 'Bitti';
      countEl.textContent = `${mins} dakika, ${turs} tur`;
      metaEl.textContent = `${turs} tur · ${clockTxt(secs)}`;
      setGo('Bir daha');
      bowl(); vibrate(10);
    }
    go.addEventListener('click', () => (running ? end() : begin()));
    function pickMode(b) {
      const was = running; halt();
      mode = b.dataset.mode; store.set('nf-mode', mode);
      $$('[data-mode]', el).forEach(x => x.setAttribute('aria-pressed', x === b));
      reset(); if (was) begin();
    }
    function pickLen(b) {
      len = +b.dataset.len; store.set(K_LEN, len);
      $$('[data-len]', el).forEach(x => x.setAttribute('aria-pressed', x === b));
      if (!running) { reset(); return; }
      plan(); syncSession(); renderMeta();
    }
    el.addEventListener('click', e => {
      const m = e.target.closest('[data-mode]'), l = e.target.closest('[data-len]');
      if (m) pickMode(m); else if (l) pickLen(l);
    });
    const onVis = () => { if (document.visibilityState === 'visible' && running) lock(); };
    document.addEventListener('visibilitychange', onVis);
    reset();
    return {
      onKey(e) {
        if (isField(e.target)) return;
        if (e.key === ' ') { e.preventDefault(); if (!e.repeat) (running ? end() : begin()); }
        else if (/^[1-4]$/.test(e.key) && !e.repeat) { const b = $(`[data-len="${LENS[+e.key - 1][0]}"]`, el); if (b) pickLen(b); }
      },
      destroy() { halt(); document.removeEventListener('visibilitychange', onVis); },
    };
  },
});
})();
