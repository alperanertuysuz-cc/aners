/* Hızlı yaz — Türkçe yazma hızı testi; son 10 sonucun grafiği, paylaşım ve telefon klavyesine uyan düzen */
(() => {
'use strict';
const WORDS = ('ve bir bu da de için ama çok gibi daha kadar sonra şey zaman gün yıl insan ev iş su yol el göz baş söz dünya hayat kendi büyük küçük yeni eski güzel iyi uzun kısa sıcak soğuk hızlı yavaş açık gelmek gitmek yapmak olmak bilmek görmek istemek almak vermek bakmak çıkmak kalmak başlamak düşünmek konuşmak anlamak sevmek yazmak okumak oturmak yemek içmek uyumak koşmak gülmek müzik kitap kalem masa kapı pencere şehir deniz dağ orman ağaç çiçek kuş kedi köpek balık güneş yıldız bulut yağmur kar sabah akşam gece hafta saat dakika ses renk ışık gölge kahve çay ekmek peynir elma portakal okul arkadaş aile anne baba kardeş çocuk oyun top takım maç gol şarkı davul gitar resim film fotoğraf telefon ekran haber soru cevap fikir plan rüya umut cesaret sabır merak mutlu sakin yorgun hazır sessiz kolay zor doğru yanlış önemli gerçek basit özel ilk son her hiç bazen şimdi yarın dün bugün burada orada nerede neden nasıl belki hemen birlikte yalnız yukarı aşağı içeri dışarı sokak köprü ada liman tren uçak bisiklet araba yolculuk harita pusula bahçe mutfak oda yatak yastık bardak tabak kaşık çatal limon bal zeytin domates biber üzüm kiraz karpuz ceviz fındık simit mektup kart zarf defter sayfa cümle kelime harf masal şiir roman yazar sahne perde sinema kamera müze sergi tablo heykel ritim melodi nota akor sahil kum dalga martı vapur fener kule çarşı pazar fırın').split(' ');

/* Storage: V1's keys keep V1's shape — 'yz-dur' (15 | 30 | 60) and 'yz-best-15/30/60' (number, kelime/dk).
   New in V2: 'yz-hist-15/30/60' = the last 10 results of that duration, oldest first: [{ w: kelime/dk, a: doğruluk %, t: ms epoch }]. */
const DURS = [15, 30, 60];
const readBest = d => { const v = store.get('yz-best-' + d, 0); return typeof v === 'number' && isFinite(v) && v > 0 ? Math.round(v) : 0; };
const readHist = d => {
  const h = store.get('yz-hist-' + d, []);
  return Array.isArray(h) ? h.filter(x => x && typeof x.w === 'number' && isFinite(x.w) && x.w >= 0).slice(-10) : [];
};
/* A "nice" axis for the chart: 2–4 even steps, always starting at 0 so bar heights stay honest. */
function axis(v) {
  v = Math.max(v, 10);
  for (const step of [5, 10, 20, 25, 50, 100, 200]) {
    const n = Math.ceil(v / step);
    if (n <= 4) return { top: n * step, ticks: Array.from({ length: n }, (_, k) => (k + 1) * step) };
  }
  const step = Math.ceil(v / 400) * 100;
  return { top: Math.ceil(v / step) * step, ticks: Array.from({ length: Math.ceil(v / step) }, (_, k) => (k + 1) * step) };
}
const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>';
const AGAIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/></svg>';

registerToy('yaz', {
  name: 'Hızlı yaz', color: 'ink-tile', cf: 'ink-tile-fg', kind: 'Klavye', open: 'Hızlı yaz’ı aç',
  cats: ['oyun'],
  desc: 'Türkçe kelimelerle yazma hızı testi. 15, 30 ya da 60 saniye.',
  art: '<p class="art-yaz"><span>kahve deniz yı</span><span class="caret"></span><span class="rest">ldız simit ritim</span></p>',
  stat: () => { const yb = Math.max(...DURS.map(readBest)); return yb ? `Rekor ${yb} kelime/dk` : 'Türkçe kelimeler'; },
  css: `
.art-yaz { width: 100%; max-width: 230px; font: 500 clamp(15px, 1.5vw, 19px)/1.5 var(--f-mono); }
.art-yaz .rest { opacity: .38; }
.art-yaz .caret { display: inline-block; width: 2px; height: 1.15em; margin: 0 1px; vertical-align: -.22em; background: var(--orange); animation: blink 1.05s steps(1) infinite; }

/* Stat card: same look as the shared .stat rule, scoped so this toy does not depend on another toy's file. */
.yaz-root .stat { display: grid; gap: 6px; align-content: start; padding: 14px 16px; border-radius: var(--r-md); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); }
.yaz-root .stat .mono { color: var(--mute); }
.yaz-root .stat b { font-size: clamp(22px, 2.6vw, 32px); font-weight: 700; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }

.yaz-root { --yz-w: min(100%, 940px); --yz-pad: clamp(18px, 3vw, 32px); }
.yaz-root .yz-top { display: flex; align-items: center; justify-content: space-between; gap: 12px 20px; width: var(--yz-w); }
.yaz-root .yz-live { display: flex; align-items: baseline; gap: 14px; min-width: 0; }
.yaz-root .yz-timer { min-width: 1.15em; font-size: clamp(42px, 5vw, 64px); font-weight: 800; line-height: 1; letter-spacing: -.05em; font-variant-numeric: tabular-nums; transition: color .3s; }
.yaz-root .yz-timer.low { color: var(--bad); }
.yaz-root .yz-wpm { color: var(--mute); white-space: nowrap; }
.yaz-root .yz-seg { flex: none; flex-wrap: nowrap; }
.yaz-root.done .yz-top { justify-content: center; }
.yaz-root.done .yz-live { display: none; }

.yaz-root .yz-box { position: relative; width: var(--yz-w); padding: var(--yz-pad); border-radius: var(--r-xl); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); transition: box-shadow .2s; }
.yaz-root .yz-box.focused { box-shadow: inset 0 0 0 1.5px var(--line-2), 0 24px 50px -36px var(--shade); }
.yaz-root .yz-view { position: relative; height: calc(1.7em * 3); overflow: hidden; font: 500 clamp(20px, 2.6vw, 30px)/1.7 var(--f-mono); letter-spacing: -.01em; }
.yaz-root .yz-inner { position: relative; display: flex; flex-wrap: wrap; column-gap: .62em; transition: transform .3s var(--ease), filter .25s, opacity .25s; }
.yaz-root .w { position: relative; color: var(--mute); white-space: nowrap; }
.yaz-root .l.ok { color: var(--fg); }
.yaz-root .l.no { color: var(--bad); }
.yaz-root .l.x { color: var(--bad); opacity: .65; }
.yaz-root .w.err { text-decoration: underline 2px var(--bad); text-underline-offset: .3em; }
.yaz-root .yz-caret { position: absolute; left: 0; top: 0; width: 3px; height: 1.15em; margin-top: .28em; margin-left: -1px; border-radius: 2px; background: var(--orange); transition: transform .09s ease-out; }
.yaz-root .yz-caret.idle { animation: blink 1.05s steps(1) infinite; }
.yaz-root .yz-input { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; border-radius: inherit; background: transparent; color: transparent; caret-color: transparent; font-size: 16px; opacity: 0; cursor: text; }
.yaz-root .yz-focus { position: absolute; inset: 0; z-index: 1; display: grid; place-items: center; padding: 0 20px; font-weight: 650; text-align: center; pointer-events: none; opacity: 0; transition: opacity .2s; }
.yaz-root .yz-box:not(.focused) .yz-focus { opacity: 1; }
.yaz-root .yz-box:not(.focused) .yz-inner { filter: blur(5px); opacity: .4; }
.yaz-root .yz-prog { position: absolute; left: var(--yz-pad); right: var(--yz-pad); bottom: calc(var(--yz-pad) / 2 - 1.5px); height: 3px; border-radius: 3px; background: var(--line); overflow: hidden; opacity: 0; transition: opacity .3s; }
.yaz-root .yz-prog i { position: absolute; inset: 0; border-radius: inherit; background: var(--fg); transform-origin: 0 50%; transition: transform .2s linear, background .3s; }
.yaz-root .yz-prog.on { opacity: 1; }
.yaz-root .yz-prog.low i { background: var(--bad); }

.yaz-root .yz-foot { display: flex; justify-content: center; min-height: 44px; align-items: center; }
.yaz-root .yz-restart { height: 44px; padding: 0 16px 0 13px; gap: 8px; font-size: 15px; }
.yaz-root .yz-restart svg { width: 18px; height: 18px; flex: none; }

/* Results */
.yaz-root .yz-res { display: grid; grid-template-columns: 1.5fr repeat(3, minmax(0, 1fr)); gap: 10px; width: var(--yz-w); }
.yaz-root .yz-res .stat.main { background: var(--c); color: var(--cf); box-shadow: none; }
.yaz-root .yz-res .stat:not(.main) { align-content: space-between; }
.yaz-root .yz-res .stat.main .mono { color: inherit; opacity: .7; }
.yaz-root .yz-res .stat.main b { font-size: clamp(54px, 7vw, 88px); letter-spacing: -.05em; }
.yaz-root .yz-sub { font-size: 14px; opacity: .75; }
.yaz-root .stat.main .yz-sub { opacity: .8; }
.yaz-root .yz-res-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding-top: 6px; }
.yaz-root .yz-res-actions .btn { gap: 8px; }
.yaz-root .yz-res-actions svg { width: 18px; height: 18px; flex: none; }

.yaz-root .yz-chart { grid-column: 1 / -1; display: grid; gap: 4px; padding: 13px 16px 12px; border-radius: var(--r-md); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); }
.yaz-root .yz-chart-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: var(--mute); white-space: nowrap; }
.yaz-root .yz-chart-head > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.yaz-root .yz-legend { display: inline-flex; align-items: center; gap: 12px; }
.yaz-root .yz-legend span { display: inline-flex; align-items: center; gap: 6px; }
.yaz-root .yz-legend i { flex: none; width: 10px; height: 10px; border-radius: 3px; background: var(--fg); }
.yaz-root .yz-legend i.rec { width: 14px; height: 0; border-radius: 0; background: none; border-top: 2px dashed var(--orange); }
.yaz-root .yz-plot { position: relative; height: clamp(72px, 12vh, 128px); margin: 16px 0 0 28px; border-bottom: 1.5px solid var(--line-2); }
.yaz-root .yz-grid { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed var(--line-2); opacity: .75; }
.yaz-root .yz-grid.zero { border: 0; }
.yaz-root .yz-grid span { position: absolute; right: calc(100% + 6px); top: 0; transform: translateY(-50%); font: 500 9.5px/1 var(--f-mono); color: var(--mute); }
.yaz-root .yz-rec { position: absolute; left: -4px; right: -4px; z-index: 1; height: 0; border-top: 2px dashed var(--orange); pointer-events: none; }
.yaz-root .yz-bars { position: absolute; inset: 0; z-index: 2; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); grid-template-rows: 100%; gap: 6px; align-items: end; }
.yaz-root .yz-bar { position: relative; min-height: 3px; border-radius: 5px 5px 1.5px 1.5px; background: var(--panel-3); }
.yaz-root .yz-bar.empty { height: 12%; background: transparent; border: 1.5px dashed var(--line-2); border-bottom: 0; }
.yaz-root .yz-bar.last { background: var(--fg); }
.yaz-root .yz-bar.best { background: var(--orange); }
.yaz-root .yz-bar span { position: absolute; left: 50%; bottom: calc(100% + 2px); transform: translateX(-50%); padding: 1px 3px; border-radius: 4px; background: var(--panel); font: 500 10px/1 var(--f-mono); color: var(--mute); white-space: nowrap; }
.yaz-root .yz-bar.last span { color: var(--fg); font-weight: 700; }
.yaz-root .yz-chart-empty { padding: 10px 0 2px; color: var(--mute); font-size: 14px; }

@media (max-width: 640px) {
  .yaz-root .yz-res { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .yaz-root .yz-res .stat.main { grid-column: 1 / -1; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto; align-items: center; column-gap: 12px; }
  .yaz-root .yz-res .stat.main .mono { grid-column: 1; grid-row: 1; align-self: end; }
  .yaz-root .yz-res .stat.main .yz-sub { grid-column: 1; grid-row: 2; align-self: start; }
  .yaz-root .yz-res .stat.main b { grid-column: 2; grid-row: 1 / 3; font-size: clamp(50px, 16vw, 68px); }
  .yaz-root .yz-res .stat { padding: 12px; }
  .yaz-root .yz-res .stat:not(.main) b { font-size: 22px; }
  .yaz-root .yz-res .stat:not(.main) .mono { font-size: 10.5px; letter-spacing: .05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .yaz-root .yz-bar span { display: none; }
  .yaz-root .yz-bar.last span, .yaz-root .yz-bar.best span { display: block; }
  .yaz-root .yz-bars { gap: 5px; }
}
@media (max-width: 560px) {
  .yaz-root .yz-live { flex-direction: column; align-items: flex-start; gap: 5px; }
  .yaz-root .yz-wpm { font-size: 10.5px; }
}
@media (max-width: 380px) {
  .yaz-root .yz-seg button { padding: 0 11px; }
  .yaz-root .yz-timer { font-size: 38px; }
  .yaz-root .yz-chart { padding: 11px 12px 10px; }
  .yaz-root .yz-chart-head { font-size: 10px; letter-spacing: .05em; }
  .yaz-root .yz-legend { gap: 8px; }
  .yaz-root .yz-long { display: none; }
}
@media (max-height: 640px) {
  .yaz-root .yz-plot { height: 62px; }
  .yaz-root.done .yz-foot { display: none; }
}

/* Phone keyboard open: everything moves to the top so the words and the timer stay above the keyboard.
   The top row sticks under the stage bar; --yz-kb adds room to scroll the box clear of the keyboard on short screens. */
.yaz-root.kb { margin: 0 auto auto; gap: 10px; padding-bottom: var(--yz-kb, 0px); }
.yaz-root.kb .yz-top { position: sticky; top: var(--yz-stick, 0px); z-index: 3; padding: 6px 0; background: var(--bg); }
.yaz-root.kb .yz-live { flex-direction: row; align-items: baseline; gap: 10px; }
.yaz-root.kb .yz-timer { font-size: 34px; }
.yaz-root.kb .yz-seg button { min-height: 34px; }
.yaz-root.kb .yz-box { --yz-pad: 16px; }
.yaz-root.kb .yz-note { display: none; }
@media (max-width: 380px) { .yaz-root.kb .yz-wpm { display: none; } }
`,
  hint: 'Tab baştan · Enter tekrar · Esc kutuya dön',
  mount(el) {
    let dur = store.get('yz-dur', 30);
    if (!DURS.includes(dur)) dur = 30;
    const coarse = matchMedia('(pointer: coarse)');
    el.innerHTML = `
      <div class="toy yaz-root">
        <div class="yz-top" id="yz-top">
          <div class="yz-live"><span class="yz-timer" id="yz-timer" role="timer" aria-label="Kalan süre">${dur}</span><span class="mono yz-wpm" id="yz-wpm">— kelime/dk</span></div>
          <div class="seg yz-seg" role="group" aria-label="Süre">${DURS.map(s => `<button type="button" data-dur="${s}" aria-pressed="${s === dur}">${s} sn</button>`).join('')}</div>
        </div>
        <div class="yz-box" id="yz-box">
          <div class="yz-view" id="yz-view"><div class="yz-inner" id="yz-inner"></div></div>
          <input class="yz-input" id="yz-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" aria-label="Yazı alanı: gördüğün kelimeleri yaz">
          <div class="yz-focus" id="yz-focus" aria-hidden="true"></div>
          <div class="yz-prog" id="yz-prog" aria-hidden="true"><i></i></div>
        </div>
        <div class="yz-res" id="yz-res" hidden></div>
        <div class="yz-foot">
          <p class="mono note yz-note" id="yz-note"></p>
          <button type="button" class="btn yz-restart" id="yz-restart" hidden>${AGAIN_SVG}Baştan <kbd>Tab</kbd></button>
        </div>
      </div>`;
    const rootEl = $('.yaz-root', el), topEl = $('#yz-top', el), box = $('#yz-box', el), viewEl = $('#yz-view', el), inner = $('#yz-inner', el), input = $('#yz-input', el);
    const timerEl = $('#yz-timer', el), wpmEl = $('#yz-wpm', el), res = $('#yz-res', el), noteEl = $('#yz-note', el), restartBtn = $('#yz-restart', el);
    const progEl = $('#yz-prog', el), progBar = progEl.firstChild, focusEl = $('#yz-focus', el);
    let words = [], wordEls = [], idx = 0, prev = '', stats, running = false, finished = false, t0 = 0, tick = 0, endT = 0, shift = 0, lineH = 0, caret = null, idleT = 0;
    let last = null, alive = true, kbOn = false, kbSeen = false;
    const norm = s => s.toLocaleLowerCase('tr-TR');
    const NOTE = 'Süre ilk harfle başlar. Boşluk sonraki kelimeye geçer.';

    /* ---------- words ---------- */
    function gen(n, after) { const out = []; let lw = after; while (out.length < n) { const w = WORDS[Math.floor(Math.random() * WORDS.length)]; if (w !== lw) { out.push(w); lw = w; } } return out; }
    const wordHTML = w => `<span class="w">${[...w].map(ch => `<span class="l">${ch}</span>`).join('')}</span>`;
    function append(n) {
      const more = gen(n, words[words.length - 1]); words.push(...more);
      caret.insertAdjacentHTML('beforebegin', more.map(wordHTML).join(''));
      wordEls = $$('.w', inner);
    }
    function moveCaret() {
      const we = wordEls[idx]; if (!we || !caret) return;
      const n = Math.min(prev.length, we.children.length);
      const x = n === 0 ? we.offsetLeft : we.offsetLeft + we.children[n - 1].offsetLeft + we.children[n - 1].offsetWidth;
      caret.style.transform = `translate(${x}px, ${we.offsetTop}px)`;
      caret.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => caret && caret.classList.add('idle'), 700);
    }
    function scrollIfNeeded() {
      const top = wordEls[idx].offsetTop;
      if (top - shift >= lineH * 2 - 2) { shift = top - lineH; inner.style.transform = `translateY(${-shift}px)`; }
    }
    /* Re-wrap after any size change (rotation, keyboard layout, font load): keep the current line as the middle row. */
    function relayout() {
      if (!alive || !caret || !wordEls.length || !viewEl.offsetWidth) return;
      lineH = wordEls[0].offsetHeight || lineH;
      const top = wordEls[idx] ? wordEls[idx].offsetTop : 0;
      shift = top >= lineH - 2 ? top - lineH : 0;
      inner.style.transform = shift ? `translateY(${-shift}px)` : '';
      moveCaret();
    }
    function renderWord() {
      const we = wordEls[idx], target = words[idx];
      $$('.l.x', we).forEach(n => n.remove());
      for (let k = 0; k < target.length; k++) we.children[k].className = 'l' + (k < prev.length ? (prev[k] === target[k] ? ' ok' : ' no') : '');
      for (let k = target.length; k < Math.min(prev.length, target.length + 8); k++) { const x = document.createElement('span'); x.className = 'l x'; x.textContent = prev[k]; we.append(x); }
      moveCaret();
    }
    function countKeys(before, after, target) { for (let k = before.length; k < after.length; k++) { stats.keys++; if (after[k] !== target[k]) stats.bad++; } }
    function commit(typed) {
      const target = words[idx], we = wordEls[idx];
      if (typed === target) { stats.chars += target.length + 1; stats.ok++; } else { stats.err++; we.classList.add('err'); }
      idx++;
      if (idx > words.length - 30) append(60);
      prev = ''; scrollIfNeeded(); renderWord();
      if (kbOn) fit();
    }

    /* ---------- clock ---------- */
    function liveWpm() { const s = (performance.now() - t0) / 1000; if (s < 2) return null; return Math.round(stats.chars / 5 / (s / 60)); }
    function update() {
      const leftMs = Math.max(0, dur * 1000 - (performance.now() - t0)), left = Math.ceil(leftMs / 1000);
      timerEl.textContent = left;
      const low = running && left <= 5;
      timerEl.classList.toggle('low', low); progEl.classList.toggle('low', low);
      progBar.style.transform = `scaleX(${leftMs / (dur * 1000)})`;
      const w = liveWpm(); if (w != null) wpmEl.textContent = `${w} kelime/dk`;
    }
    function start() {
      running = true; t0 = performance.now();
      tick = setInterval(update, 200); endT = setTimeout(finish, dur * 1000);
      progEl.classList.add('on'); noteEl.hidden = true; restartBtn.hidden = false;
      update();
    }

    /* ---------- results + chart (drawn to scale from 0) ---------- */
    function chartHTML(hist, best) {
      const n = hist.length;
      if (!n) return '';
      const ax = axis(Math.max(best, ...hist.map(h => h.w)));
      const pct = v => (v / ax.top) * 100;
      const bi = best ? hist.map(h => h.w).lastIndexOf(best) : -1;
      const avg = Math.round(hist.reduce((s, h) => s + h.w, 0) / n);
      let plot = `<i class="yz-grid zero" style="bottom:0"><span>0</span></i>` + ax.ticks.map(t => `<i class="yz-grid" style="bottom:${pct(t)}%"><span>${t}</span></i>`).join('');
      if (best) plot += `<i class="yz-rec" style="bottom:${pct(best)}%"></i>`;
      plot += '<div class="yz-bars">';
      for (let k = 0; k < 10; k++) {
        const h = hist[k];
        if (!h) { plot += '<div class="yz-bar empty"></div>'; continue; }
        const cls = (k === n - 1 ? ' last' : '') + (k === bi ? ' best' : '');
        plot += `<div class="yz-bar${cls}" style="height:${pct(h.w)}%" title="${h.w} kelime/dk · %${h.a}"><span>${h.w}</span></div>`;
      }
      plot += '</div>';
      const label = `Son ${n} sonuç: ${hist.map(h => h.w).join(', ')} kelime/dk.${best ? ` Rekor ${best}.` : ''}`;
      return `<div class="yz-chart">
          <div class="yz-chart-head mono"><span>${n < 10 ? n : 'Son 10'} test · ort. ${avg}</span><span class="yz-legend" aria-hidden="true"><span><i></i>Son</span>${best ? `<span><i class="rec"></i>Rekor ${best}</span>` : ''}</span></div>
          <div class="yz-plot" role="img" aria-label="${label}">${plot}</div>
        </div>`;
    }
    function finish() {
      running = false; finished = true; clearInterval(tick); clearTimeout(endT);
      if (prev && prev === words[idx]) { stats.chars += prev.length; stats.ok++; }
      input.blur(); input.disabled = true;
      const wpm = Math.round(stats.chars / 5 / (dur / 60));
      const acc = stats.keys ? Math.round((stats.keys - stats.bad) / stats.keys * 100) : 0;
      const prevBest = readBest(dur), isBest = wpm > prevBest;
      if (isBest) store.set('yz-best-' + dur, wpm);
      const hist = readHist(dur);
      hist.push({ w: wpm, a: acc, t: Date.now() }); while (hist.length > 10) hist.shift();
      store.set('yz-hist-' + dur, hist);
      const best = Math.max(prevBest, wpm);
      last = { wpm, acc, dur, isBest };
      const sub = isBest ? (prevBest ? `Yeni rekor! Önceki ${prevBest}` : 'İlk rekorun') : (prevBest ? `Rekorun ${prevBest}` : 'Doğru kelime yok');
      res.innerHTML = `
        <div class="stat main"><span class="mono">Kelime / dakika · ${dur} sn</span><b>${wpm}</b><span class="yz-sub">${sub}</span></div>
        <div class="stat"><span class="mono">Doğruluk</span><b>%${acc}</b></div>
        <div class="stat"><span class="mono">Doğru<span class="yz-long"> kelime</span></span><b>${stats.ok}</b></div>
        <div class="stat"><span class="mono">Hatalı</span><b>${stats.err}</b></div>
        ${chartHTML(hist, best)}
        <div class="yz-res-actions">
          <button type="button" class="btn primary" id="yz-again">Tekrar <kbd>Enter</kbd></button>
          <button type="button" class="btn" id="yz-share">${SHARE_SVG}Paylaş</button>
        </div>`;
      box.hidden = true; res.hidden = false; rootEl.classList.add('done');
      timerEl.textContent = 0; timerEl.classList.remove('low'); wpmEl.textContent = `${wpm} kelime/dk`;
      progEl.classList.remove('on', 'low'); restartBtn.hidden = true;
      noteEl.hidden = false; noteEl.textContent = coarse.matches ? 'Süreyi değiştirip yeniden deneyebilirsin.' : 'Tab ya da Enter ile yeni test.';
      $('#yz-again', el).addEventListener('click', () => newTest(true));
      $('#yz-share', el).addEventListener('click', share);
      if (!coarse.matches) $('#yz-again', el).focus({ preventScroll: true });
      el.scrollTop = 0;
      if (motionOK()) {
        const b = $('.yz-bar.last', res);
        if (b) b.animate([{ height: '0%' }, { height: b.style.height }], { duration: 560, easing: 'cubic-bezier(.3,1.25,.55,1)' });
      }
      if (isBest) { Sound.chime(); vibrate(12); } else Sound.blip(880, 0.08, 0.12);
      say(`Süre doldu. Dakikada ${wpm} kelime, doğruluk yüzde ${acc}.${isBest ? ' Yeni rekor.' : ''}`);
    }
    function share() {
      if (!last) return;
      const text = `Hızlı yaz’da dakikada ${last.wpm} kelime yazdım (${last.dur} sn, %${last.acc} doğruluk).${last.isBest ? ' Yeni rekorum.' : ''} Sen kaç yaparsın?`;
      shareResult({ title: 'Sıkıldım · Hızlı yaz', text, url: siteUrl() + '#yaz' });
    }

    /* ---------- new test ---------- */
    function newTest(focus) {
      clearInterval(tick); clearTimeout(endT); running = false; finished = false;
      words = gen(140); idx = 0; prev = ''; shift = 0;
      stats = { chars: 0, keys: 0, bad: 0, ok: 0, err: 0 };
      inner.innerHTML = words.map(wordHTML).join('') + '<span class="yz-caret idle" aria-hidden="true"></span>';
      caret = $('.yz-caret', inner); wordEls = $$('.w', inner);
      inner.style.transform = '';
      input.disabled = false; input.value = '';
      res.hidden = true; res.innerHTML = ''; box.hidden = false; rootEl.classList.remove('done');
      timerEl.textContent = dur; timerEl.classList.remove('low'); wpmEl.textContent = '— kelime/dk';
      progEl.classList.remove('on', 'low'); progBar.style.transform = '';
      noteEl.hidden = false; noteEl.textContent = NOTE; restartBtn.hidden = true;
      focusEl.textContent = coarse.matches ? 'Yazmaya başlamak için dokun' : 'Yazmaya başlamak için tıkla';
      requestAnimationFrame(() => { if (!alive || !caret) return; lineH = wordEls[0].offsetHeight; moveCaret(); caret.classList.add('idle'); });
      /* On phones the keyboard only opens from a tap, so we focus only when asked (a tap on Tekrar / süre) — never on open. */
      if (focus || !coarse.matches) input.focus({ preventScroll: true });
    }

    /* ---------- typing ---------- */
    input.addEventListener('input', () => {
      if (finished) return;
      let v = norm(input.value);
      if (!running && v.trim().length) start();
      if (v.includes(' ')) {
        const sp = v.indexOf(' '), head = v.slice(0, sp), rest = v.slice(sp + 1).replace(/^ +/, '');
        if (!head) { input.value = rest; v = rest; }
        else {
          countKeys(prev, head, words[idx]); commit(head);
          input.value = rest.split(' ')[0]; v = input.value;
        }
      }
      countKeys(prev, v, words[idx]); prev = v; renderWord();
    });
    /* Phone keyboards: Enter ("ileri") acts like space. */
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.isComposing || finished) return;
      e.preventDefault();
      if (running && prev) { input.value = prev + ' '; input.dispatchEvent(new Event('input')); }
    });

    /* ---------- phone keyboard: compact layout while it is open ---------- */
    const vv = window.visualViewport;
    let baseW = vv ? vv.width : innerWidth, baseH = vv ? vv.height : innerHeight;
    function setKb(on) {
      if (on === kbOn) return;
      kbOn = on; rootEl.classList.toggle('kb', on);
      /* Sticky offsets count from the scroller's padding edge; pull the row up so it sticks right under the stage bar. */
      if (on) rootEl.style.setProperty('--yz-stick', -parseFloat(getComputedStyle(el).paddingTop || 0) + 'px');
      else { rootEl.style.removeProperty('--yz-kb'); el.scrollTop = 0; }
    }
    function fit() {
      if (!kbOn || !alive) return;
      const visTop = vv ? vv.offsetTop : 0, visH = vv ? vv.height : innerHeight;
      rootEl.style.setProperty('--yz-kb', Math.max(0, Math.round(innerHeight - (visTop + visH))) + 'px');
      const br = box.getBoundingClientRect();
      /* iOS may pan the whole page when the keyboard opens; undo the pan when the box already fits in the top part. */
      if (visTop > 0 && br.bottom <= visH - 8) { window.scrollTo(0, 0); return; }
      const bottom = visTop + visH - 10, ceiling = Math.max(visTop, el.getBoundingClientRect().top) + topEl.offsetHeight + 4;
      /* Keep the whole box in view; when the visible strip is shorter than the box (landscape), keep the current line in view. */
      let target = br;
      if (br.height > bottom - ceiling && wordEls[idx]) {
        const lt = viewEl.getBoundingClientRect().top + wordEls[idx].offsetTop - shift;      // final position, ignoring the scroll transition
        target = { top: lt - 6, bottom: lt + (lineH || wordEls[idx].offsetHeight) + 6 };
      }
      let d = 0;
      if (target.bottom > bottom) d = target.bottom - bottom;
      if (target.top - d < ceiling) d = target.top - ceiling;
      if (Math.abs(d) >= 1) el.scrollTop += d;
    }
    function onViewport() {
      if (!vv) return;
      if (Math.abs(vv.width - baseW) > 30) { baseW = vv.width; baseH = vv.height; }     // rotated
      if (document.activeElement !== input || !coarse.matches) { baseH = Math.max(baseH, vv.height); return; }
      /* innerHeight is the layout viewport, which the keyboard does not shrink in current iOS / Android browsers. */
      const open = vv.height < Math.max(baseH, innerHeight) * 0.82;
      if (open) kbSeen = true;
      setKb(open || !kbSeen);      // keyboard closed with the field still focused (Android back key): restore the normal layout
      fit();
    }
    input.addEventListener('focus', () => {
      box.classList.add('focused');
      if (coarse.matches) { kbSeen = false; setKb(true); requestAnimationFrame(fit); }
    });
    input.addEventListener('blur', () => { box.classList.remove('focused'); setKb(false); });
    if (vv) { vv.addEventListener('resize', onViewport); vv.addEventListener('scroll', onViewport); }

    /* Buttons that should not steal focus from the field (keeps the phone keyboard up). */
    const keepFocus = e => { if (document.activeElement === input) e.preventDefault(); };
    restartBtn.addEventListener('mousedown', keepFocus);
    $('.yz-seg', el).addEventListener('mousedown', keepFocus);
    restartBtn.addEventListener('click', () => newTest(true));
    $('.yz-seg', el).addEventListener('click', e => {
      const b = e.target.closest('[data-dur]'); if (!b) return;
      const typing = document.activeElement === input;
      dur = +b.dataset.dur; store.set('yz-dur', dur);
      $$('[data-dur]', el).forEach(x => x.setAttribute('aria-pressed', x === b));
      newTest(typing);
    });

    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => relayout()) : null;
    if (ro) ro.observe(viewEl);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => relayout());

    newTest(false);
    return {
      onKey(e) {
        if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); newTest(true); }
        else if (e.key === 'Enter' && finished) {
          if (e.target && e.target.closest && e.target.closest('#yz-share, .yz-seg')) return;
          e.preventDefault(); newTest(true);
        }
      },
      destroy() {
        alive = false; clearInterval(tick); clearTimeout(endT); clearTimeout(idleT); caret = null;
        if (ro) ro.disconnect();
        if (vv) { vv.removeEventListener('resize', onViewport); vv.removeEventListener('scroll', onViewport); }
      },
    };
  },
});
})();
