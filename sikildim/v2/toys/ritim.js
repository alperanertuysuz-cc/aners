/* Ritim — 16 adımlık davul makinesi */
(() => {
'use strict';
const TRACKS = [
  { id: 'kick', name: 'Bas davul', key: 'a' },
  { id: 'snare', name: 'Trampet', key: 's' },
  { id: 'clap', name: 'Alkış', key: 'd' },
  { id: 'hat', name: 'Hi-hat', key: 'f' },
  { id: 'open', name: 'Açık hat', key: 'g' },
  { id: 'tom', name: 'Tom', key: 'h' },
];
const PRESETS = {
  boombap: { name: 'Boom bap', bpm: 90, swing: 30, p: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '..............x.' } },
  trap: { name: 'Trap', bpm: 140, swing: 0, p: { kick: 'x.....x...x..x..', clap: '........x.......', hat: 'x.xxx.x.x.xxx.xx', tom: '...........x....' } },
  house: { name: 'House', bpm: 124, swing: 10, p: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x...x...x...x...', open: '..x...x...x...x.' } },
  rock: { name: 'Rock', bpm: 112, swing: 0, p: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', tom: '.............xxx' } },
  kirik: { name: 'Kırık', bpm: 136, swing: 12, p: { kick: 'x.x.......xx....', snare: '....x..x.x..x..x', hat: 'x.x.x.x.x.x.x.x.' } },
};

registerToy('ritim', {
  name: 'Ritim', color: 'orange', cf: 'on-light', kind: 'Müzik', open: 'Ritim’i aç',
  cats: ["yaratici"],
  desc: '16 adımlık davul makinesi. Kendi beat’ini kur, tempoyu sen seç.',
  art: '<div class="seq"><i class="on"></i><i></i><i></i><i></i><i class="on"></i><i></i><i class="on"></i><i></i><i></i><i></i><i class="on"></i><i></i><i></i><i></i><i class="on"></i><i></i><i class="on"></i><i></i><i class="on"></i><i></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i></div>',
  stat: () => { const rt = store.get('ritim', null); return rt ? `Kayıtlı ritim · ${rt.bpm} BPM` : '6 ses · 16 adım'; },
  css: `
.seq { position: relative; display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; width: min(100%, 200px); }
.seq i { aspect-ratio: 1; border-radius: 4px; background: rgba(0, 0, 0, .14); }
.seq i.on { background: var(--on-light); }
.seq::after {
  content: ""; position: absolute; top: -5px; bottom: -5px; left: -3px; width: calc((100% - 35px) / 8 + 6px);
  border-radius: 6px; box-shadow: 0 0 0 2px var(--paper); animation: playhead 2.6s steps(8) infinite;
}
@keyframes playhead { to { transform: translateX(calc(800% - 48px + 40px)); } }

.rack {
  --label-w: 150px;
  display: grid; gap: 18px; width: min(100%, 1080px); padding: clamp(14px, 2vw, 22px); border-radius: var(--r-xl);
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line), 0 30px 60px -44px var(--shade);
}
.transport { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 22px; }
.play {
  display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; flex: none;
  background: var(--c); color: var(--cf); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .16); transition: transform .3s var(--spring);
}
.play:active { transform: scale(.93); }
.play svg { width: 24px; height: 24px; }
.knob { display: grid; gap: 4px; flex: 1 1 150px; max-width: 230px; }
.knob-top { display: flex; justify-content: space-between; gap: 10px; }
.knob-top label { color: var(--mute); }
.presets { display: flex; flex-wrap: wrap; gap: 6px; }
.grid-wrap { display: grid; gap: 7px; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.track { display: grid; grid-template-columns: var(--label-w) minmax(0, 1fr); gap: 10px; align-items: stretch; }
.pad {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; padding: 0 10px 0 12px;
  border-radius: 12px; background: var(--panel-2); font-size: 14px; font-weight: 600; text-align: left; transition: background .18s, color .18s;
}
.pad.hit { background: var(--c); color: var(--cf); transition: none; }
.steps { display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 5px; }
.step {
  height: 44px; border-radius: 9px; background: var(--panel-2); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .07);
  transition: background .12s, transform .12s, box-shadow .12s;
}
.step:nth-child(8n+5), .step:nth-child(8n+6), .step:nth-child(8n+7), .step:nth-child(8n+8) { background: var(--panel-3); }
.step:hover { box-shadow: inset 0 0 0 2px var(--line-2); }
.step[aria-pressed="true"] { background: var(--c); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .2); }
.step.now { box-shadow: inset 0 0 0 2px var(--fg); }
.step.now[aria-pressed="true"] { transform: scale(.9); box-shadow: inset 0 0 0 2px var(--fg), 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent); }
.leds .steps { align-items: center; }
.led { height: 6px; border-radius: 3px; background: var(--panel-3); transition: background .1s; }
.led.now { background: var(--c); }
@media (max-width: 760px) {
  .track { grid-template-columns: 1fr; gap: 6px; }
  .steps { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  .step { height: 36px; }
  .pad { min-height: 34px; }
  .leds { display: none; }
  .grid-wrap { gap: 14px; }
  .knob { max-width: none; }
}
`,
  hint: 'Boşluk çal / durdur · A S D F G H pedler',
  mount(el) {
    const saved = store.get('ritim', null);
    let bpm = clamp(+(saved && saved.bpm) || PRESETS.boombap.bpm, 60, 180);
    let swing = clamp(saved && saved.swing != null ? +saved.swing : PRESETS.boombap.swing, 0, 100);
    let preset = saved ? saved.preset : 'boombap';
    const pat = {};
    const fromPreset = k => { TRACKS.forEach(t => { const s = PRESETS[k].p[t.id] || ''; pat[t.id] = Array.from({ length: 16 }, (_, i) => s[i] === 'x'); }); };
    if (saved && saved.p) TRACKS.forEach(t => { const s = saved.p[t.id] || []; pat[t.id] = Array.from({ length: 16 }, (_, i) => !!s[i]); });
    else fromPreset('boombap');
    el.innerHTML = `
      <div class="toy ritim">
        <div class="rack">
          <div class="transport">
            <button type="button" class="play" id="rt-play" aria-pressed="false" aria-label="Çal">${ICON.play}</button>
            <div class="knob"><div class="knob-top"><label class="mono" for="rt-bpm">Tempo</label><output class="mono" id="rt-bpm-o" for="rt-bpm"></output></div><input type="range" id="rt-bpm" min="60" max="180" step="1"></div>
            <div class="knob"><div class="knob-top"><label class="mono" for="rt-swing">Swing</label><output class="mono" id="rt-swing-o" for="rt-swing"></output></div><input type="range" id="rt-swing" min="0" max="100" step="1"></div>
            <div class="presets" role="group" aria-label="Hazır ritimler">${Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="chip" data-preset="${k}" aria-pressed="false">${p.name}</button>`).join('')}<button type="button" class="chip" data-preset="clear">Temizle</button></div>
          </div>
          <div class="grid-wrap" id="rt-grid">
            <div class="track leds" aria-hidden="true"><span></span><div class="steps">${'<i class="led"></i>'.repeat(16)}</div></div>
            ${TRACKS.map(t => `<div class="track" data-track="${t.id}"><button type="button" class="pad" data-pad="${t.id}"><span>${t.name}</span><kbd>${t.key.toUpperCase()}</kbd></button><div class="steps" role="group" aria-label="${t.name} adımları">${Array.from({ length: 16 }, (_, i) => `<button type="button" class="step" data-i="${i}" aria-label="${t.name}, adım ${i + 1}" aria-pressed="false"></button>`).join('')}</div></div>`).join('')}
          </div>
        </div>
        <p class="mono note">Adımlara tıkla ya da üzerlerinden sürükle. Ritmin bu tarayıcıda saklanır.</p>
      </div>`;
    const playBtn = $('#rt-play', el), bpmIn = $('#rt-bpm', el), swIn = $('#rt-swing', el), grid = $('#rt-grid', el);
    const stepEl = {}, padEl = {};
    TRACKS.forEach(t => { stepEl[t.id] = $$(`[data-track="${t.id}"] .step`, el); padEl[t.id] = $(`[data-pad="${t.id}"]`, el); });
    const leds = $$('.led', el);
    const cols = Array.from({ length: 16 }, (_, i) => TRACKS.map(t => stepEl[t.id][i]).concat(leds[i]));
    function save() { store.set('ritim', { bpm, swing, preset, p: Object.fromEntries(TRACKS.map(t => [t.id, pat[t.id].map(Number)])) }); }
    function render() { TRACKS.forEach(t => stepEl[t.id].forEach((b, i) => b.setAttribute('aria-pressed', pat[t.id][i]))); $$('[data-preset]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.preset === preset)); }
    const setP = inp => inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%');
    function syncKnobs() { bpmIn.value = bpm; swIn.value = swing; $('#rt-bpm-o', el).textContent = bpm + ' BPM'; $('#rt-swing-o', el).textContent = '%' + swing; setP(bpmIn); setP(swIn); }
    const pulse = new Map();
    function flashPad(id) { const p = padEl[id]; p.classList.add('hit'); clearTimeout(pulse.get(id)); pulse.set(id, setTimeout(() => p.classList.remove('hit'), 90)); }
    function hit(id) { const ctx = Sound.ensure(); if (ctx) Sound.drum[id](ctx.currentTime + 0.005, 1); flashPad(id); }
    function setStep(tr, i, val, audition) {
      pat[tr][i] = val; stepEl[tr][i].setAttribute('aria-pressed', val);
      if (preset) { preset = null; render(); }
      if (val && audition && !playing) hit(tr);
    }
    let playing = false, cur = 0, nextT = 0, timer = 0, raf = 0, queue = [], lit = -1;
    function light(s) {
      if (lit >= 0) cols[lit].forEach(n => n.classList.remove('now'));
      lit = s;
      if (s >= 0) { cols[s].forEach(n => n.classList.add('now')); TRACKS.forEach(t => { if (pat[t.id][s]) flashPad(t.id); }); }
    }
    function scheduler() {
      const ctx = Sound.ctx, sd = 60 / bpm / 4;
      while (nextT < ctx.currentTime + 0.12) {
        const t = nextT + (cur % 2 ? sd * (swing / 100) * 0.33 : 0);
        for (const tr of TRACKS) if (pat[tr.id][cur]) Sound.drum[tr.id](t, cur % 4 === 0 ? 1 : 0.8);
        queue.push({ s: cur, t });
        cur = (cur + 1) % 16; nextT += sd;
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
      const ctx = Sound.ensure();
      if (!ctx) { say('Bu tarayıcı ses üretemiyor.'); return; }
      playing = true; cur = 0; queue = []; nextT = ctx.currentTime + 0.06;
      scheduler(); raf = requestAnimationFrame(frame);
      playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Durdur'); playBtn.innerHTML = ICON.stop;
    }
    function stop() {
      playing = false; clearTimeout(timer); cancelAnimationFrame(raf); queue = []; light(-1);
      playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Çal'); playBtn.innerHTML = ICON.play;
    }
    playBtn.addEventListener('click', () => (playing ? stop() : play()));
    bpmIn.addEventListener('input', () => { bpm = +bpmIn.value; if (preset) { preset = null; render(); } syncKnobs(); save(); });
    swIn.addEventListener('input', () => { swing = +swIn.value; if (preset) { preset = null; render(); } syncKnobs(); save(); });
    $('.presets', el).addEventListener('click', e => {
      const b = e.target.closest('[data-preset]'); if (!b) return;
      const k = b.dataset.preset;
      if (k === 'clear') { TRACKS.forEach(t => pat[t.id].fill(false)); preset = null; }
      else { fromPreset(k); bpm = PRESETS[k].bpm; swing = PRESETS[k].swing; preset = k; syncKnobs(); }
      render(); save();
    });
    let paint = null;
    grid.addEventListener('pointerdown', e => {
      const pad = e.target.closest('.pad');
      if (pad) { e.preventDefault(); hit(pad.dataset.pad); return; }
      const s = e.target.closest('.step'); if (!s || e.button > 0) return;
      const tr = s.closest('.track').dataset.track, i = +s.dataset.i;
      paint = { val: !pat[tr][i], id: e.pointerId, last: s };
      setStep(tr, i, paint.val, true);
      try { grid.setPointerCapture(e.pointerId); } catch (err) {}
    });
    grid.addEventListener('pointermove', e => {
      if (!paint || e.pointerId !== paint.id) return;
      const hitEl = document.elementFromPoint(e.clientX, e.clientY);
      const s = hitEl && hitEl.closest ? hitEl.closest('.step') : null;
      if (!s || s === paint.last || !grid.contains(s)) return;
      paint.last = s; setStep(s.closest('.track').dataset.track, +s.dataset.i, paint.val, false);
    });
    const endPaint = () => { if (paint) { paint = null; save(); } };
    grid.addEventListener('pointerup', endPaint);
    grid.addEventListener('pointercancel', endPaint);
    grid.addEventListener('click', e => {
      if (e.detail !== 0) return;
      const pad = e.target.closest('.pad'); if (pad) { hit(pad.dataset.pad); return; }
      const s = e.target.closest('.step'); if (!s) return;
      const tr = s.closest('.track').dataset.track, i = +s.dataset.i;
      setStep(tr, i, !pat[tr][i], true); save();
    });
    const onVis = () => { if (document.hidden && playing) stop(); };
    document.addEventListener('visibilitychange', onVis);
    syncKnobs(); render();
    return {
      onKey(e) {
        if (e.key === ' ') { if (!e.repeat) (playing ? stop() : play()); e.preventDefault(); return; }
        const t = TRACKS.find(x => x.key === e.key.toLocaleLowerCase('tr'));
        if (t && !e.repeat) { e.preventDefault(); hit(t.id); }
      },
      destroy() { stop(); document.removeEventListener('visibilitychange', onVis); },
    };
  },
});
})();
