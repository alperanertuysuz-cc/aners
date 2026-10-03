/* Hızlı yaz — Türkçe yazma hızı testi */
(() => {
'use strict';
const WORDS = ('ve bir bu da de için ama çok gibi daha kadar sonra şey zaman gün yıl insan ev iş su yol el göz baş söz dünya hayat kendi büyük küçük yeni eski güzel iyi uzun kısa sıcak soğuk hızlı yavaş açık gelmek gitmek yapmak olmak bilmek görmek istemek almak vermek bakmak çıkmak kalmak başlamak düşünmek konuşmak anlamak sevmek yazmak okumak oturmak yemek içmek uyumak koşmak gülmek müzik kitap kalem masa kapı pencere şehir deniz dağ orman ağaç çiçek kuş kedi köpek balık güneş yıldız bulut yağmur kar sabah akşam gece hafta saat dakika ses renk ışık gölge kahve çay ekmek peynir elma portakal okul arkadaş aile anne baba kardeş çocuk oyun top takım maç gol şarkı davul gitar resim film fotoğraf telefon ekran haber soru cevap fikir plan rüya umut cesaret sabır merak mutlu sakin yorgun hazır sessiz kolay zor doğru yanlış önemli gerçek basit özel ilk son her hiç bazen şimdi yarın dün bugün burada orada nerede neden nasıl belki hemen birlikte yalnız yukarı aşağı içeri dışarı sokak köprü ada liman tren uçak bisiklet araba yolculuk harita pusula bahçe mutfak oda yatak yastık bardak tabak kaşık çatal limon bal zeytin domates biber üzüm kiraz karpuz ceviz fındık simit mektup kart zarf defter sayfa cümle kelime harf masal şiir roman yazar sahne perde sinema kamera müze sergi tablo heykel ritim melodi nota akor sahil kum dalga martı vapur fener kule çarşı pazar fırın').split(' ');

registerToy('yaz', {
  name: 'Hızlı yaz', color: 'ink-tile', cf: 'ink-tile-fg', kind: 'Klavye', open: 'Hızlı yaz’ı aç',
  cats: ["oyun"],
  desc: 'Türkçe kelimelerle yazma hızı testi. 15, 30 ya da 60 saniye.',
  art: '<p class="typ"><span>kahve deniz yı</span><span class="caret"></span><span class="rest">ldız simit ritim</span></p>',
  stat: () => { const yb = Math.max(...[15, 30, 60].map(d => store.get('yz-best-' + d, 0))); return yb ? `Rekor ${yb} kelime/dk` : 'Türkçe kelimeler'; },
  css: `
.typ { width: 100%; max-width: 230px; font: 500 clamp(15px, 1.5vw, 19px)/1.5 var(--f-mono); }
.typ .rest { opacity: .38; }
.typ .caret, .caret-blink { display: inline-block; width: 2px; height: 1.15em; margin: 0 1px; vertical-align: -.22em; background: var(--orange); animation: blink 1.05s steps(1) infinite; }

.yz-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; width: min(100%, 940px); }
.yz-live { display: flex; align-items: baseline; gap: 14px; }
.yz-timer { font-size: clamp(42px, 5vw, 64px); font-weight: 800; line-height: 1; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
.yz-live .mono { color: var(--mute); }
.yz-box { position: relative; width: min(100%, 940px); padding: clamp(18px, 3vw, 32px); border-radius: var(--r-xl); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); }
.yz-box.focused { box-shadow: inset 0 0 0 1.5px var(--line-2), 0 24px 50px -36px var(--shade); }
.yz-view { position: relative; height: calc(1.7em * 3); overflow: hidden; font: 500 clamp(20px, 2.6vw, 30px)/1.7 var(--f-mono); letter-spacing: -.01em; }
.yz-inner { position: relative; display: flex; flex-wrap: wrap; column-gap: .62em; transition: transform .3s var(--ease), filter .25s, opacity .25s; }
.w { position: relative; color: var(--mute); white-space: nowrap; }
.l.ok { color: var(--fg); }
.l.no { color: var(--bad); }
.l.x { color: var(--bad); opacity: .65; }
.w.err { text-decoration: underline 2px var(--bad); text-underline-offset: .3em; }
.yz-caret { position: absolute; left: 0; top: 0; width: 3px; height: 1.15em; margin-top: .28em; margin-left: -1px; border-radius: 2px; background: var(--orange); transition: transform .09s ease-out; }
.yz-caret.idle { animation: blink 1.05s steps(1) infinite; }
.yz-input { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; border-radius: inherit; background: transparent; color: transparent; caret-color: transparent; font-size: 16px; opacity: 0; cursor: text; }
.yz-focus { position: absolute; inset: 0; z-index: 1; display: grid; place-items: center; font-weight: 650; pointer-events: none; opacity: 0; transition: opacity .2s; }
.yz-box:not(.focused) .yz-focus { opacity: 1; }
.yz-box:not(.focused) .yz-inner { filter: blur(5px); opacity: .4; }
.yz-res { display: grid; grid-template-columns: 1.5fr repeat(3, minmax(0, 1fr)); gap: 10px; width: min(100%, 940px); }
.yz-res .stat.main { background: var(--c); color: var(--cf); box-shadow: none; }
.yz-res .stat.main .mono { color: inherit; opacity: .7; }
.yz-res .stat.main b { font-size: clamp(54px, 7vw, 88px); letter-spacing: -.05em; }
.yz-res .stat span:last-child:not(.mono) { font-size: 14px; opacity: .75; }
.yz-res-actions { grid-column: 1 / -1; display: flex; justify-content: center; padding-top: 8px; }
@media (max-width: 640px) { .yz-res { grid-template-columns: repeat(3, minmax(0, 1fr)); } .yz-res .stat.main { grid-column: 1 / -1; } }
`,
  hint: 'Tab yeniden başlat · Esc kutuya dön',
  mount(el) {
    let dur = store.get('yz-dur', 30);
    if (![15, 30, 60].includes(dur)) dur = 30;
    el.innerHTML = `
      <div class="toy yaz">
        <div class="yz-top">
          <div class="seg" role="group" aria-label="Süre">${[15, 30, 60].map(s => `<button type="button" data-dur="${s}" aria-pressed="${s === dur}">${s} sn</button>`).join('')}</div>
          <div class="yz-live"><span class="yz-timer" id="yz-timer" aria-label="Kalan süre">${dur}</span><span class="mono" id="yz-wpm">— kelime/dk</span></div>
        </div>
        <div class="yz-box" id="yz-box">
          <div class="yz-view"><div class="yz-inner" id="yz-inner"></div></div>
          <input class="yz-input" id="yz-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Yazı alanı: gördüğün kelimeleri yaz">
          <div class="yz-focus" aria-hidden="true">Yazmaya başlamak için tıkla</div>
        </div>
        <div class="yz-res" id="yz-res" hidden></div>
        <p class="mono note" id="yz-note">Süre ilk harfle başlar. Boşluk sonraki kelimeye geçer.</p>
      </div>`;
    const box = $('#yz-box', el), inner = $('#yz-inner', el), input = $('#yz-input', el), timerEl = $('#yz-timer', el), wpmEl = $('#yz-wpm', el), res = $('#yz-res', el);
    let words = [], wordEls = [], idx = 0, prev = '', stats, running = false, finished = false, t0 = 0, tick = 0, endT = 0, shift = 0, lineH = 0, caret = null, idleT = 0;
    const norm = s => s.toLocaleLowerCase('tr-TR');
    function gen(n, after) { const out = []; let last = after; while (out.length < n) { const w = WORDS[Math.floor(Math.random() * WORDS.length)]; if (w !== last) { out.push(w); last = w; } } return out; }
    const wordHTML = w => `<span class="w">${[...w].map(ch => `<span class="l">${ch}</span>`).join('')}</span>`;
    function append(n) {
      const more = gen(n, words[words.length - 1]); words.push(...more);
      caret.insertAdjacentHTML('beforebegin', more.map(wordHTML).join(''));
      wordEls = $$('.w', inner);
    }
    function moveCaret() {
      const we = wordEls[idx]; if (!we) return;
      const n = Math.min(prev.length, we.children.length);
      const x = n === 0 ? we.offsetLeft : we.offsetLeft + we.children[n - 1].offsetLeft + we.children[n - 1].offsetWidth;
      caret.style.transform = `translate(${x}px, ${we.offsetTop}px)`;
      caret.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => caret && caret.classList.add('idle'), 700);
    }
    function scrollIfNeeded() {
      const top = wordEls[idx].offsetTop;
      if (top - shift >= lineH * 2 - 2) { shift = top - lineH; inner.style.transform = `translateY(${-shift}px)`; }
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
    }
    function liveWpm() { const el2 = (performance.now() - t0) / 1000; if (el2 < 2) return null; return Math.round(stats.chars / 5 / (el2 / 60)); }
    function update() {
      const left = Math.max(0, Math.ceil(dur - (performance.now() - t0) / 1000));
      timerEl.textContent = left;
      const w = liveWpm(); if (w != null) wpmEl.textContent = `${w} kelime/dk`;
    }
    function start() { running = true; t0 = performance.now(); tick = setInterval(update, 200); endT = setTimeout(finish, dur * 1000); }
    function finish() {
      running = false; finished = true; clearInterval(tick); clearTimeout(endT);
      if (prev && prev === words[idx]) { stats.chars += prev.length; stats.ok++; }
      input.blur(); input.disabled = true;
      const wpm = Math.round(stats.chars / 5 / (dur / 60));
      const acc = stats.keys ? Math.round((stats.keys - stats.bad) / stats.keys * 100) : 0;
      const bestKey = 'yz-best-' + dur, prevBest = store.get(bestKey, 0), isBest = wpm > prevBest;
      if (isBest) store.set(bestKey, wpm);
      res.innerHTML = `
        <div class="stat main"><span class="mono">Kelime / dakika · ${dur} sn</span><b>${wpm}</b><span>${isBest ? 'Yeni rekor!' : `Rekorun ${prevBest}`}</span></div>
        <div class="stat"><span class="mono">Doğruluk</span><b>%${acc}</b></div>
        <div class="stat"><span class="mono">Doğru kelime</span><b>${stats.ok}</b></div>
        <div class="stat"><span class="mono">Hatalı</span><b>${stats.err}</b></div>
        <div class="yz-res-actions"><button type="button" class="btn primary" id="yz-again">Tekrar <kbd>Enter</kbd></button></div>`;
      box.hidden = true; res.hidden = false; timerEl.textContent = 0; wpmEl.textContent = `${wpm} kelime/dk`;
      $('#yz-note', el).textContent = 'Tab ya da Enter ile yeni test.';
      $('#yz-again', el).addEventListener('click', newTest);
      $('#yz-again', el).focus({ preventScroll: true });
      if (isBest) Sound.chime(); else Sound.blip(880, 0.08, 0.12);
      say(`Süre doldu. Dakikada ${wpm} kelime, doğruluk yüzde ${acc}.`);
    }
    function newTest() {
      clearInterval(tick); clearTimeout(endT); running = false; finished = false;
      words = gen(140); idx = 0; prev = ''; shift = 0;
      stats = { chars: 0, keys: 0, bad: 0, ok: 0, err: 0 };
      inner.innerHTML = words.map(wordHTML).join('') + '<span class="yz-caret idle" aria-hidden="true"></span>';
      caret = $('.yz-caret', inner); wordEls = $$('.w', inner);
      inner.style.transform = '';
      input.disabled = false; input.value = '';
      res.hidden = true; box.hidden = false;
      timerEl.textContent = dur; wpmEl.textContent = '— kelime/dk';
      $('#yz-note', el).textContent = 'Süre ilk harfle başlar. Boşluk sonraki kelimeye geçer.';
      requestAnimationFrame(() => { lineH = wordEls[0].offsetHeight; moveCaret(); caret.classList.add('idle'); });
      input.focus({ preventScroll: true });
    }
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
    input.addEventListener('focus', () => box.classList.add('focused'));
    input.addEventListener('blur', () => box.classList.remove('focused'));
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-dur]'); if (!b) return;
      dur = +b.dataset.dur; store.set('yz-dur', dur);
      $$('[data-dur]', el).forEach(x => x.setAttribute('aria-pressed', x === b));
      newTest();
    });
    newTest();
    return {
      onKey(e) {
        if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); newTest(); }
        else if (e.key === 'Enter' && finished) { e.preventDefault(); newTest(); }
      },
      destroy() { clearInterval(tick); clearTimeout(endT); clearTimeout(idleT); caret = null; },
    };
  },
});
})();
