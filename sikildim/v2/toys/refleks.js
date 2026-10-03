/* Refleks — tepki süresi testi */
(() => {
'use strict';

registerToy('refleks', {
  name: 'Refleks', color: 'green', cf: 'on-light', kind: 'Tepki', open: 'Refleks’i aç',
  cats: ["oyun"],
  desc: 'Ekran yeşile dönünce dokun. Kaç milisaniye sürdü?',
  art: '<div class="react"><span class="wait">BEKLE</span><span class="go">ŞİMDİ</span></div>',
  stat: () => { const rb = store.get('ref-best', null); return rb != null ? `Rekor ${rb} ms` : 'Henüz rekor yok'; },
  css: `
.react {
  position: relative; display: grid; place-items: center; width: 96px; height: 96px; border-radius: 50%;
  background: var(--paper); color: var(--on-light); font: 700 15px/1 var(--f-mono); letter-spacing: .04em;
  transition: background .2s, color .2s;
}
.react::before, .react::after { content: ""; position: absolute; border-radius: 50%; border: 2px solid var(--on-light); }
.react::before { inset: -13px; opacity: .25; }
.react::after { inset: -28px; opacity: .1; }
.react .go { display: none; }
.tile:hover .react { background: var(--on-light); color: var(--green); }
.tile:hover .react .go { display: block; }
.tile:hover .react .wait { display: none; }

.arena {
  display: grid; place-content: center; gap: 14px; width: min(100%, 920px); height: clamp(260px, 44vh, 440px); padding: 24px;
  border-radius: var(--r-xl); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); text-align: center;
  user-select: none; -webkit-user-select: none; transition: background .2s, color .2s;
}
.arena[data-state="wait"] { background: var(--ink-tile); color: var(--ink-tile-fg); }
.arena[data-state="go"] { background: var(--green); color: var(--on-light); transition: none; }
.arena[data-state="early"] { background: var(--pink); color: var(--on-light); }
.arena-big { font-size: clamp(36px, 6.4vw, 84px); font-weight: 750; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.arena-small { font-size: 16px; opacity: .72; }
.ref-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: min(100%, 920px); }
.stat { display: grid; gap: 6px; padding: 14px 16px; border-radius: var(--r-md); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); }
.stat .mono { color: var(--mute); }
.stat b { font-size: clamp(22px, 2.6vw, 32px); font-weight: 700; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.ref-chart-wrap { width: min(100%, 920px); display: grid; gap: 10px; }
.ref-chart-head { display: flex; justify-content: space-between; gap: 12px; color: var(--mute); }
.ref-chart { position: relative; height: 128px; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; align-items: end; border-bottom: 1.5px solid var(--line-2); }
.ref-band { position: absolute; left: 0; right: 0; bottom: calc(250 / 600 * 100%); height: calc(50 / 600 * 100%); background: color-mix(in srgb, var(--green) 16%, transparent); border-block: 1px dashed color-mix(in srgb, var(--green) 60%, transparent); pointer-events: none; }
.bar { position: relative; min-height: 4px; border-radius: 6px 6px 2px 2px; background: var(--panel-3); transition: height .5s var(--spring); }
.bar.empty { height: 10%; background: transparent; border: 1.5px dashed var(--line-2); border-bottom: 0; }
.bar.best { background: var(--green); }
.bar.last { background: var(--fg); }
.bar span { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); font: 500 10px/1 var(--f-mono); color: var(--mute); white-space: nowrap; }
@media (max-width: 480px) { .bar span { display: none; } .bar.last span, .bar.best span { display: block; } .stat { padding: 12px; } }
`,
  hint: 'Boşluk ya da dokun',
  mount(el) {
    let state = 'idle', timer = 0, t0 = 0, keyed = false;
    const hist = store.get('ref-hist', []).filter(n => typeof n === 'number').slice(-10);
    let best = store.get('ref-best', null);
    el.innerHTML = `
      <div class="toy refleks">
        <button type="button" class="arena" id="rf-arena" data-state="idle">
          <span class="arena-big" id="rf-big"></span>
          <span class="arena-small" id="rf-small"></span>
        </button>
        <div class="ref-stats">
          <div class="stat"><span class="mono">Son</span><b id="rf-last">—</b></div>
          <div class="stat"><span class="mono">Son 5 ortalama</span><b id="rf-avg">—</b></div>
          <div class="stat"><span class="mono">Rekor</span><b id="rf-best">—</b></div>
        </div>
        <div class="ref-chart-wrap">
          <div class="ref-chart-head mono"><span>Son 10 deneme · 0–600 ms</span><span>Yeşil bant: çoğu insan 250–300 ms</span></div>
          <div class="ref-chart" id="rf-chart"></div>
        </div>
      </div>`;
    const arena = $('#rf-arena', el), big = $('#rf-big', el), small = $('#rf-small', el), chart = $('#rf-chart', el);
    const COPY = {
      idle: ['Başlamak için dokun', 'Ekran yeşile döndüğü anda dokun ya da boşluğa bas.'],
      wait: ['Bekle…', 'Yeşili bekle.'],
      go: ['Şimdi!', ' '],
      early: ['Erken davrandın', 'Yeşili beklemen lazım. Tekrar denemek için dokun.'],
    };
    function set(s, b, sm) { state = s; arena.dataset.state = s; big.textContent = b || COPY[s][0]; small.textContent = sm || COPY[s][1]; }
    const rating = ms => ms < 180 ? 'Kedi refleksi.' : ms < 220 ? 'Çok hızlı.' : ms < 270 ? 'Gayet iyi.' : ms < 330 ? 'Ortalama bir insan.' : ms < 450 ? 'Biraz uykulu.' : 'Kahve vakti.';
    function renderStats() {
      $('#rf-last', el).textContent = hist.length ? hist[hist.length - 1] + ' ms' : '—';
      const last5 = hist.slice(-5);
      $('#rf-avg', el).textContent = last5.length ? Math.round(last5.reduce((a, b) => a + b, 0) / last5.length) + ' ms' : '—';
      $('#rf-best', el).textContent = best != null ? best + ' ms' : '—';
      const bi = hist.lastIndexOf(Math.min(...hist));
      let html = '<div class="ref-band" aria-hidden="true"></div>';
      for (let k = 0; k < 10; k++) {
        const v = hist[k];
        if (v == null) { html += '<div class="bar empty"></div>'; continue; }
        const cls = k === hist.length - 1 ? ' last' : (k === bi ? ' best' : '');
        html += `<div class="bar${cls}" style="height:${clamp(v / 600 * 100, 3, 100)}%"><span>${v > 600 ? '600+' : v}</span></div>`;
      }
      chart.innerHTML = html;
    }
    function start() {
      set('wait'); clearTimeout(timer);
      timer = setTimeout(() => requestAnimationFrame(() => { set('go'); t0 = performance.now(); }), rand(1400, 4200));
    }
    function act() {
      if (state === 'wait') { clearTimeout(timer); set('early'); Sound.buzz(); vibrate(40); return; }
      if (state === 'go') {
        const ms = Math.round(performance.now() - t0);
        hist.push(ms); while (hist.length > 10) hist.shift(); store.set('ref-hist', hist);
        const isBest = best == null || ms < best;
        if (isBest) { best = ms; store.set('ref-best', ms); }
        set('result', `${ms} ms`, `${rating(ms)}${isBest ? ' Yeni rekor!' : ''} Tekrar için dokun.`);
        if (isBest) Sound.chime(); else Sound.blip(990, 0.07, 0.14);
        renderStats(); say(`${ms} milisaniye. ${rating(ms)}`);
        return;
      }
      start();
    }
    arena.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); act(); });
    arena.addEventListener('click', e => { if (e.detail === 0 && !keyed) act(); keyed = false; });
    set('idle'); renderStats();
    return {
      onKey(e) { if ((e.key === ' ' || e.key === 'Enter') && !isField(e.target)) { e.preventDefault(); if (!e.repeat) { keyed = true; act(); } } },
      destroy() { clearTimeout(timer); },
    };
  },
});
})();
