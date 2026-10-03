/* Refleks — tepki süresi testi: Klasik (gör), Ses (duy) ve Hedef (vur) modları */
(() => {
'use strict';

/* Each mode keeps its own record + last-10 history. Klasik keeps V1's keys ('ref-best' number, 'ref-hist' number[]) in V1's shape.
   Charts are drawn to scale: Klasik and Ses on 0–600 ms, Hedef (move + tap, slower by nature) on 0–1000 ms; taller bars get a break mark. */
const MODES = {
  klasik: { name: 'Klasik', best: 'ref-best', hist: 'ref-hist', max: 600, ticks: [200, 400, 600], band: [250, 300], legend: 'Çoğu insan 250–300 ms' },
  ses: { name: 'Ses', best: 'ref-ses-best', hist: 'ref-ses-hist', max: 600, ticks: [200, 400, 600], band: [200, 250], legend: 'Çoğu insan 200–250 ms' },
  hedef: { name: 'Hedef', best: 'ref-hedef-best', hist: 'ref-hedef-hist', max: 1000, ticks: [250, 500, 750, 1000], band: null, legend: 'Hedef başına ortalama' },
};
const MODE_IDS = ['klasik', 'ses', 'hedef'];
const TARGETS = 10, PENALTY = 100, SLOP = 8, DEAF_MS = 3000;
const ANTICIPATE = 100;                                            // faster than this is a guess, not a reaction
const HOLD = { result: 600, early: 350 };                           // ignore stray taps right after a round ends (also covers "deaf")
const HIT_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];              // pentatonic climb, one note per target

const num = v => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.round(v) : null);
const readBest = k => num(store.get(k, null));
const readHist = k => { const h = store.get(k, []); return Array.isArray(h) ? h.filter(n => typeof n === 'number' && isFinite(n)).slice(-10) : []; };
const readMode = () => { const m = store.get('ref-mode', 'klasik'); return MODE_IDS.includes(m) ? m : 'klasik'; };

const RATE = {
  klasik: ms => ms < 180 ? 'Kedi refleksi.' : ms < 220 ? 'Çok hızlı.' : ms < 270 ? 'Gayet iyi.' : ms < 330 ? 'Ortalama bir insan.' : ms < 450 ? 'Biraz uykulu.' : 'Kahve vakti.',
  ses: ms => ms < 160 ? 'Yarasa kulağı.' : ms < 200 ? 'Çok hızlı.' : ms < 250 ? 'Gayet iyi.' : ms < 310 ? 'Ortalama bir insan.' : ms < 420 ? 'Biraz uykulu.' : 'Kahve vakti.',
  hedef: ms => ms < 380 ? 'Keskin nişancı.' : ms < 460 ? 'Çok hızlı.' : ms < 560 ? 'Gayet iyi.' : ms < 680 ? 'Fena değil.' : ms < 850 ? 'Biraz uykulu.' : 'Kahve vakti.',
};

const GLYPH = {
  klasik: '<svg viewBox="0 0 56 56" fill="none" aria-hidden="true"><circle cx="28" cy="28" r="25.5" stroke="currentColor" stroke-width="2" opacity=".2"/><circle cx="28" cy="28" r="17.5" stroke="currentColor" stroke-width="2" opacity=".45"/><circle cx="28" cy="28" r="9.5" fill="currentColor"/></svg>',
  ses: '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M25 14.5 15.5 22H10v12h5.5l9.5 7.5v-27Z" fill="currentColor"/><path d="M33 22.5a8 8 0 0 1 0 11"/><path d="M38.5 17a15.5 15.5 0 0 1 0 22"/><path d="M44 11.5a23 23 0 0 1 0 33" opacity=".45"/></svg>',
  mute: '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M25 14.5 15.5 22H10v12h5.5l9.5 7.5v-27Z" fill="currentColor"/><path d="m34 22.5 11 11m0-11-11 11"/></svg>',
  hedef: '<svg viewBox="0 0 56 56" fill="none" aria-hidden="true"><circle cx="28" cy="28" r="25.5" stroke="currentColor" stroke-width="2" opacity=".25"/><circle cx="28" cy="28" r="17" fill="currentColor"/><circle class="rf-hole" cx="28" cy="28" r="10"/><circle cx="28" cy="28" r="4.5" fill="currentColor"/></svg>',
};
const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>';

registerToy('refleks', {
  name: 'Refleks', color: 'green', cf: 'on-light', kind: 'Tepki', open: 'Refleks’i aç',
  cats: ['oyun'],
  desc: 'Yeşili gör, bip’i duy ya da hedefleri vur. Tepkin kaç milisaniye?',
  art: '<div class="art-refleks"><span class="wait">BEKLE</span><span class="go">ŞİMDİ</span></div>',
  stat: () => {
    const c = readBest('ref-best'), s = readBest('ref-ses-best'), h = readBest('ref-hedef-best');
    if (c == null && s == null && h == null) return 'Henüz rekor yok';
    const others = [['Ses', s], ['Hedef', h]].filter(([, v]) => v != null);
    if (c == null && others.length === 1) return `${others[0][0]} rekoru ${others[0][1]} ms`;
    /* ≤ 21 chars keeps it on one line in the 2-up phone shelf; the unit only shows when there is room. */
    const parts = c != null ? [`Rekor ${c}`] : [];
    others.forEach(([n, v]) => { if ([...parts, `${n} ${v}`].join(' · ').length <= 21) parts.push(`${n} ${v}`); });
    if (parts.length === 1) parts[0] += ' ms';
    return parts.join(' · ');
  },
  css: `
.art-refleks {
  position: relative; display: grid; place-items: center; width: 96px; height: 96px; border-radius: 50%;
  background: var(--paper); color: var(--on-light); font: 700 15px/1 var(--f-mono); letter-spacing: .04em;
  transition: background .2s, color .2s;
}
.art-refleks::before, .art-refleks::after { content: ""; position: absolute; border-radius: 50%; border: 2px solid var(--on-light); }
.art-refleks::before { inset: -13px; opacity: .25; }
.art-refleks::after { inset: -28px; opacity: .1; }
.art-refleks .go { display: none; }
.tile:hover .art-refleks { background: var(--on-light); color: var(--green); }
.tile:hover .art-refleks .go { display: block; }
.tile:hover .art-refleks .wait { display: none; }

/* Shared stat card. Other toys (Yaz) render .stat and rely on this rule, so it stays global until it moves into app.css. */

.refleks-root { flex: 1 0 auto; justify-content: center; gap: clamp(10px, 1.7vh, 18px); user-select: none; -webkit-user-select: none; }
.refleks-root .rf-w { width: min(100%, 920px); }
.refleks-root .rf-modes { flex-wrap: nowrap; }
.refleks-root .rf-modes button { min-height: 44px; padding: 0 18px; }

.refleks-root .rf-box { position: relative; flex: 1 1 0; min-height: 210px; max-height: 470px; }
.refleks-root .rf-arena {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  padding: 24px 22px; overflow: hidden; border-radius: var(--r-xl); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line);
  color: var(--fg); text-align: center; touch-action: manipulation; -webkit-touch-callout: none; transition: background .2s, color .2s;
}
.refleks-root[data-mode="hedef"] .rf-arena { touch-action: none; }
.refleks-root .rf-arena:focus-visible { outline-offset: 4px; }
.refleks-root .rf-arena[data-state="wait"] { background: var(--ink-tile); color: var(--ink-tile-fg); }
.refleks-root .rf-arena[data-state="go"] { background: var(--green); color: var(--on-light); transition: none; }
.refleks-root .rf-arena[data-state="early"] { background: var(--pink); color: var(--on-light); }
.refleks-root .rf-arena[data-state="result"] { padding: 54px 22px 80px; }

.refleks-root .rf-glyph { display: none; position: relative; width: 56px; height: 56px; color: var(--green); }
.refleks-root .rf-glyph svg { display: block; width: 100%; height: 100%; }
.refleks-root .rf-glyph .rf-hole { fill: var(--panel); }
.refleks-root .rf-arena:is([data-state="idle"], [data-state="mute"], [data-state="listen"]) .rf-glyph { display: block; }
.refleks-root .rf-arena[data-state="mute"] .rf-glyph { color: var(--mute); }
.refleks-root .rf-glyph::after { content: ""; position: absolute; inset: -12px; border-radius: 50%; border: 2px solid currentColor; opacity: 0; }
.refleks-root .rf-arena[data-state="listen"] .rf-glyph::after { animation: rf-breathe 2.8s ease-in-out infinite; }
@keyframes rf-breathe { 0%, 100% { transform: scale(.82); opacity: 0; } 50% { transform: scale(1.12); opacity: .3; } }

.refleks-root .rf-big { font-size: clamp(36px, 6.4vw, 84px); font-weight: 750; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; text-wrap: balance; }
.refleks-root .rf-arena[data-state="result"] .rf-big { font-size: clamp(60px, 15vw, 128px); font-weight: 800; letter-spacing: -.055em; }
.refleks-root .rf-unit { margin-left: .14em; font-size: .36em; font-weight: 650; letter-spacing: -.02em; opacity: .55; }
.refleks-root .rf-small { max-width: 38ch; font-size: clamp(16px, 1.25vw, 19px); line-height: 1.4; opacity: .72; text-wrap: balance; }
.refleks-root .rf-small:empty, .refleks-root .rf-big:empty { display: none; }
.refleks-root .rf-arena[data-state="result"] .rf-small { opacity: .8; }
.refleks-root .rf-cap { margin-top: -4px; color: var(--mute); }
.refleks-root .rf-cap:empty { display: none; }
.refleks-root .rf-arena:is([data-state="ready"], [data-state="run"]) .rf-small { display: none; }
.refleks-root .rf-arena[data-state="run"] .rf-big { display: none; }

.refleks-root .rf-badge { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); padding: 6px 11px; border-radius: 999px; background: var(--green); color: var(--on-light); white-space: nowrap; }

.refleks-root .rf-hud { position: absolute; top: 16px; left: 18px; right: 18px; display: none; align-items: center; justify-content: space-between; gap: 12px; pointer-events: none; }
.refleks-root .rf-arena:is([data-state="ready"], [data-state="run"]) .rf-hud { display: flex; }
.refleks-root .rf-pips { display: flex; gap: 5px; }
.refleks-root .rf-pips i { width: 8px; height: 8px; border-radius: 50%; background: var(--panel-3); transition: background .15s, transform .3s var(--spring); }
.refleks-root .rf-pips i.done { background: var(--fg); }
.refleks-root .rf-pips i.now { background: var(--green); transform: scale(1.35); }
.refleks-root .rf-miss { color: var(--bad); font-weight: 700; font-variant-numeric: tabular-nums; }

.refleks-root .rf-target, .refleks-root .rf-ghost {
  position: absolute; left: 0; top: 0; width: var(--d, 60px); height: var(--d, 60px); border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, var(--on-light) 0 15%, var(--green) 16% 39%, var(--paper) 40% 57%, var(--green) 58%);
  box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--on-light) 20%, transparent), 0 10px 22px -12px var(--shade);
}
.refleks-root .rf-ring { position: absolute; inset: -2px; border-radius: 50%; border: 2.5px solid var(--green); opacity: 0; }
.refleks-root .rf-pen { position: absolute; left: 0; top: 0; padding: 4px 7px; border-radius: 8px; background: var(--bad); color: #fff; font: 700 12px/1 var(--f-mono); pointer-events: none; white-space: nowrap; }

.refleks-root .rf-share { position: absolute; left: 50%; bottom: 18px; z-index: 2; transform: translateX(-50%); height: 44px; padding: 0 18px 0 15px; gap: 8px; font-size: 15px; background: var(--bg); }
.refleks-root .rf-share:hover { background: var(--panel-2); }
.refleks-root .rf-share:active { transform: translateX(-50%) scale(.96); }
.refleks-root .rf-share svg { width: 18px; height: 18px; flex: none; }

.refleks-root .rf-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.refleks-root .rf-stats .stat { gap: 5px; }
.refleks-root .rf-stats .stat .mono { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.refleks-root .rf-stats .stat b { font-size: clamp(21px, 2.5vw, 30px); white-space: nowrap; }
.refleks-root .rf-stats .stat b small { margin-left: .18em; font-size: .56em; font-weight: 600; letter-spacing: 0; opacity: .55; }

.refleks-root .rf-chart { display: grid; gap: 6px; }
.refleks-root .rf-chart-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: var(--mute); white-space: nowrap; }
.refleks-root .rf-legend { display: inline-flex; align-items: center; gap: 7px; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.refleks-root .rf-legend i { flex: none; width: 14px; height: 9px; border-radius: 2px; background: color-mix(in srgb, var(--green) 22%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--green) 65%, transparent); }
.refleks-root .rf-plot { position: relative; height: clamp(66px, 12.6vh, 128px); margin: 14px 0 0 30px; border-bottom: 1.5px solid var(--line-2); }
.refleks-root .rf-grid { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed var(--line-2); opacity: .7; }
.refleks-root .rf-grid.zero { border: 0; }
.refleks-root .rf-grid span { position: absolute; right: calc(100% + 6px); top: 0; transform: translateY(-50%); font: 500 9.5px/1 var(--f-mono); color: var(--mute); }
.refleks-root .rf-band { position: absolute; left: 0; right: 0; background: color-mix(in srgb, var(--green) 16%, transparent); border-block: 1px dashed color-mix(in srgb, var(--green) 60%, transparent); }
.refleks-root .rf-bars { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); grid-template-rows: 100%; gap: 6px; align-items: end; }
.refleks-root .rf-bar { position: relative; min-height: 3px; border-radius: 5px 5px 1.5px 1.5px; background: var(--panel-3); }
.refleks-root .rf-bar.empty { height: 10%; background: transparent; border: 1.5px dashed var(--line-2); border-bottom: 0; }
.refleks-root .rf-bar.best { background: var(--green); }
.refleks-root .rf-bar.last { background: var(--fg); }
.refleks-root .rf-bar.over::after { content: ""; position: absolute; left: -3px; right: -3px; top: 9px; height: 4px; background: var(--bg); transform: skewY(-10deg); }
.refleks-root .rf-bar span { position: absolute; left: 50%; bottom: calc(100% + 3px); transform: translateX(-50%); font: 500 10px/1 var(--f-mono); color: var(--mute); white-space: nowrap; }
.refleks-root .rf-bar.last span { color: var(--fg); font-weight: 700; }

@media (max-width: 480px) {
  .refleks-root .rf-bar span { display: none; }
  .refleks-root .rf-bar.last span, .refleks-root .rf-bar.best span, .refleks-root .rf-bar.over span { display: block; }
  .refleks-root .rf-stats { gap: 8px; }
  .refleks-root .rf-stats .stat { padding: 10px 12px; }
  .refleks-root .rf-bars { gap: 5px; }
}
@media (max-width: 359px) {
  .refleks-root .rf-modes button { padding: 0 14px; }
  .refleks-root .rf-stats .stat { padding: 9px 10px; }
  .refleks-root .rf-stats .stat .mono { font-size: 10px; letter-spacing: .05em; }
  .refleks-root .rf-stats .stat b { font-size: 18px; }
  .refleks-root .rf-chart-head { font-size: 10px; letter-spacing: .05em; }
}
@media (max-height: 700px) {
  .refleks-root .rf-arena { gap: 8px; padding: 18px; }
  .refleks-root .rf-arena[data-state="result"] { padding: 62px 16px 18px; }
  .refleks-root .rf-badge { left: 16px; top: 21px; transform: none; padding: 5px 9px; }
  .refleks-root .rf-share { left: auto; right: 12px; top: 12px; bottom: auto; width: 44px; padding: 0; transform: none; }
  .refleks-root .rf-share:active { transform: scale(.94); }
  .refleks-root .rf-share .lbl { display: none; }
  .refleks-root .rf-glyph { width: 42px; height: 42px; }
  .refleks-root .rf-big { font-size: clamp(28px, min(8.6vw, 10vh), 60px); }
  .refleks-root .rf-arena[data-state="result"] .rf-big { font-size: clamp(48px, 13vw, 96px); }
  .refleks-root .rf-small { font-size: 14.5px; line-height: 1.35; }
}
@media (max-height: 600px) { .refleks-root .rf-arena[data-state="idle"] .rf-glyph { display: none; } }
@media (orientation: landscape) and (max-height: 540px) {
  .refleks-root.toy {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 330px); grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: "box modes" "box stats" "box chart"; align-items: start; gap: 12px 20px; max-width: 1000px;
  }
  .refleks-root .rf-w { width: 100%; }
  .refleks-root .rf-box { grid-area: box; align-self: stretch; min-height: 220px; max-height: none; }
  .refleks-root .rf-modes { grid-area: modes; justify-self: stretch; }
  .refleks-root .rf-modes button { flex: 1; }
  .refleks-root .rf-stats { grid-area: stats; }
  .refleks-root .rf-chart { grid-area: chart; }
  .refleks-root .rf-plot { height: 76px; }
  .refleks-root .rf-stats .stat { padding: 10px 11px; }
  .refleks-root .rf-stats .stat .mono { font-size: 10.5px; letter-spacing: .04em; }
}
`,
  hint: 'Boşluk: başla ve tepki ver · 1–3 mod',
  mount(el) {
    let mode = readMode(), M = MODES[mode];
    let hist = readHist(M.hist), best = readBest(M.best);
    let state = 'idle', timer = 0, deafT = 0, raf = 0, t0 = 0, downAt = -1e9, keyAt = -1e9, holdUntil = 0, alive = true;
    let beep = null, run = null, tg = null, last = null, grow = false;

    el.innerHTML = `
      <div class="toy refleks-root" data-mode="${mode}">
        <div class="seg rf-modes" id="rf-modes" role="group" aria-label="Mod">${MODE_IDS.map(k => `<button type="button" data-mode="${k}" aria-pressed="${k === mode}">${MODES[k].name}</button>`).join('')}</div>
        <div class="rf-box rf-w">
          <button type="button" class="rf-arena" id="rf-arena" data-state="idle">
            <span class="rf-hud" aria-hidden="true"><span class="rf-pips" id="rf-pips"></span><span class="mono rf-miss" id="rf-miss"></span></span>
            <span class="mono rf-badge" id="rf-badge" hidden></span>
            <span class="rf-glyph" id="rf-glyph" aria-hidden="true"></span>
            <span class="rf-big" id="rf-big"></span>
            <span class="mono rf-cap" id="rf-cap"></span>
            <span class="rf-small" id="rf-small"></span>
            <span class="rf-target" id="rf-target" aria-hidden="true" hidden><i class="rf-ring"></i></span>
          </button>
          <button type="button" class="btn rf-share" id="rf-share" aria-label="Sonucu paylaş" hidden>${SHARE_SVG}<span class="lbl">Paylaş</span></button>
        </div>
        <div class="rf-stats rf-w">
          <div class="stat" id="rf-s-last"><span class="mono">Son</span><b id="rf-last">—</b></div>
          <div class="stat"><span class="mono">Son 5 ort.</span><b id="rf-avg">—</b></div>
          <div class="stat" id="rf-s-best"><span class="mono">Rekor</span><b id="rf-best">—</b></div>
        </div>
        <div class="rf-chart rf-w">
          <div class="rf-chart-head mono"><span>Son 10 deneme</span><span class="rf-legend" id="rf-legend"></span></div>
          <div class="rf-plot" id="rf-plot" aria-hidden="true"></div>
        </div>
      </div>`;
    const rootEl = $('.refleks-root', el), modesEl = $('#rf-modes', el), arena = $('#rf-arena', el), shareBtn = $('#rf-share', el);
    const bigEl = $('#rf-big', el), smallEl = $('#rf-small', el), capEl = $('#rf-cap', el), glyphEl = $('#rf-glyph', el), badgeEl = $('#rf-badge', el);
    const pipsEl = $('#rf-pips', el), missEl = $('#rf-miss', el), targetEl = $('#rf-target', el), ringEl = $('.rf-ring', targetEl);
    const plotEl = $('#rf-plot', el), legendEl = $('#rf-legend', el);

    const COPY = {
      klasik: {
        idle: ['Başlamak için dokun', 'Ekran yeşile döndüğü anda dokun ya da boşluğa bas.'],
        wait: ['Bekle…', 'Yeşili bekle.'],
        go: ['Şimdi!', ' '],
        early: ['Erken davrandın', 'Yeşili beklemen lazım. Tekrar denemek için dokun.'],
        guess: ['Çok erken', `${ANTICIPATE} ms’nin altı tahmin sayılır. Tekrar denemek için dokun.`],
      },
      ses: {
        idle: ['Başlamak için dokun', 'Ekran hiç değişmeyecek. Bip sesini duyduğun anda dokun.'],
        mute: ['Ses kapalı', 'Bu mod sesle çalışır. Sesi açmak için dokun.'],
        listen: ['Dinle…', 'Bip’i duyunca dokun.'],
        early: ['Erken davrandın', 'Bip’i beklemen lazım. Tekrar denemek için dokun.'],
        deaf: ['Bip’i duymadın mı?', 'Telefon sessizde olabilir. Sesi açıp tekrar dokun.'],
        nosound: ['Ses çalınamadı', 'Tarayıcı sesi başlatamadı. Bir kez daha dokun.'],
      },
      hedef: {
        idle: ['Başlamak için dokun', `${TARGETS} hedef tek tek çıkacak. Hepsini olabildiğince hızlı vur. Her ıska +${PENALTY} ms.`],
        ready: ['Hazır ol…', ''],
      },
    };

    /* ---------- view ---------- */
    function view(vs, key, big, small) {
      const c = (COPY[mode] && COPY[mode][key]) || COPY.klasik[key] || ['', ''];
      arena.dataset.state = vs;
      holdUntil = HOLD[vs] ? performance.now() + HOLD[vs] : 0;
      bigEl.textContent = big != null ? big : c[0];
      smallEl.textContent = small != null ? small : c[1];
      capEl.textContent = '';
      badgeEl.hidden = true; shareBtn.hidden = true;
    }
    function setGlyph() { glyphEl.innerHTML = mode === 'ses' && !Sound.on ? GLYPH.mute : GLYPH[mode]; }
    function idle(small) {
      state = 'idle'; setGlyph();
      if (mode === 'ses' && !Sound.on) view('mute', 'mute');
      else view('idle', 'idle', null, small);
    }
    const msHTML = ms => `${ms}<span class="rf-unit">ms</span>`;
    const statHTML = ms => (ms == null ? '—' : `${ms}<small>ms</small>`);

    /* ---------- stats + chart (to scale) ---------- */
    function renderStats() {
      $('#rf-last', el).innerHTML = statHTML(hist.length ? hist[hist.length - 1] : null);
      const last5 = hist.slice(-5);
      $('#rf-avg', el).innerHTML = statHTML(last5.length ? Math.round(last5.reduce((a, b) => a + b, 0) / last5.length) : null);
      $('#rf-best', el).innerHTML = statHTML(best);
      legendEl.innerHTML = (M.band ? '<i aria-hidden="true"></i>' : '') + M.legend;
      const pct = v => (v / M.max) * 100;
      let html = `<i class="rf-grid zero" style="bottom:0"><span>0</span></i>`;
      html += M.ticks.map(t => `<i class="rf-grid" style="bottom:${pct(t)}%"><span>${t}</span></i>`).join('');
      if (M.band) html += `<i class="rf-band" style="bottom:${pct(M.band[0])}%;height:${pct(M.band[1] - M.band[0])}%"></i>`;
      html += '<div class="rf-bars">';
      const bi = hist.length ? hist.lastIndexOf(Math.min(...hist)) : -1;
      for (let k = 0; k < 10; k++) {
        const v = hist[k];
        if (v == null) { html += '<div class="rf-bar empty"></div>'; continue; }
        const over = v > M.max;
        const cls = (k === hist.length - 1 ? ' last' : (k === bi ? ' best' : '')) + (over ? ' over' : '');
        html += `<div class="rf-bar${cls}" style="height:${over ? 100 : pct(v)}%" title="${v} ms"><span>${v}</span></div>`;
      }
      plotEl.innerHTML = html + '</div>';
      if (grow && motionOK()) {
        const b = $('.rf-bar.last', plotEl);
        if (b) b.animate([{ height: '0%' }, { height: b.style.height }], { duration: 520, easing: 'cubic-bezier(.3,1.25,.55,1)' });
      }
      grow = false;
    }
    function record(ms) {
      hist.push(ms); while (hist.length > 10) hist.shift(); store.set(M.hist, hist);
      const prev = best, isBest = best == null || ms < best;
      if (isBest) { best = ms; store.set(M.best, ms); }
      grow = true; renderStats();
      return { isBest, first: prev == null };
    }
    function showResult(ms, small, rec, extra, cap) {
      state = 'result';
      view('result', 'result', '', small);
      bigEl.innerHTML = msHTML(ms);
      capEl.textContent = cap || '';
      if (rec.isBest) { badgeEl.textContent = rec.first ? 'İlk rekorun' : 'Yeni rekor'; badgeEl.hidden = false; }
      last = Object.assign({ mode, ms }, extra || {});
      shareBtn.hidden = false;
      if (rec.isBest) Sound.chime(); else Sound.blip(990, 0.07, 0.14);
    }

    /* ---------- timers ---------- */
    function cancel() {
      clearTimeout(timer); clearTimeout(deafT); cancelAnimationFrame(raf);
      if (beep) { try { beep.stop(); } catch (e) {} beep = null; }
      run = null; tg = null; targetEl.hidden = true;
    }
    function early(key) {
      cancel(); state = 'early'; view('early', key || 'early');
      Sound.buzz(); vibrate(40);
    }

    /* ---------- Klasik (V1 rules: random 1.4–4.2 s wait, green, tap; under ANTICIPATE ms is a guess) ---------- */
    function startKlasik() {
      state = 'wait'; view('wait', 'wait');
      timer = setTimeout(() => { raf = requestAnimationFrame(() => { if (!alive || state !== 'wait') return; state = 'go'; view('go', 'go'); t0 = performance.now(); }); }, rand(1400, 4200));
    }
    function finishVisual(ms) {
      const rec = record(ms), r = RATE[mode](ms);
      showResult(ms, `${r} Tekrar için dokun.`, rec);
      say(`${ms} milisaniye. ${r}${rec.isBest ? ' Yeni rekor.' : ''}`);
    }

    /* ---------- Ses: same neutral screen from start to beep; the beep is timed on the audio clock ---------- */
    function audioT0(when) {
      const ctx = Sound.ctx, now = performance.now();
      let t = now + (when - ctx.currentTime) * 1000 + (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
      try {
        const ts = ctx.getOutputTimestamp && ctx.getOutputTimestamp();
        if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
          const t2 = ts.performanceTime + (when - ts.contextTime) * 1000;
          if (t2 > now - 20 && t2 < now + 600) t = t2;
        }
      } catch (e) {}
      return t;
    }
    function startSes() {
      Sound.ensure();
      state = 'wait'; view('listen', 'listen');
      timer = setTimeout(() => {
        if (!alive || state !== 'wait') return;
        const ctx = Sound.ctx;
        if (!ctx || ctx.state !== 'running' || !Sound.on) { state = 'deaf'; view('early', Sound.on ? 'nosound' : 'mute'); return; }
        const when = ctx.currentTime + 0.05;
        beep = Sound.tone(1175, { type: 'triangle', dur: 0.13, vol: 0.34, attack: 0.002, when });
        t0 = audioT0(when); state = 'go';
        deafT = setTimeout(() => { if (state !== 'go') return; cancel(); state = 'deaf'; view('early', 'deaf'); say('Bip’i duymadın mı? Tekrar denemek için dokun.'); }, DEAF_MS);
      }, rand(1600, 4400));
    }

    /* ---------- Hedef: 10 targets, one at a time; misses add a penalty ---------- */
    function renderHud() {
      const done = run ? run.times.length : 0;
      pipsEl.innerHTML = Array.from({ length: TARGETS }, (_, i) => `<i class="${i < done ? 'done' : i === done && state === 'run' ? 'now' : ''}"></i>`).join('');
      const m = run ? run.misses : 0;
      missEl.textContent = m ? `+${m * PENALTY} ms` : '';
    }
    function startHedef(e) {
      const rect = arena.getBoundingClientRect();
      /* where the finger already is counts as the previous target, so the first one can't pop up right under it */
      const from = e && e.clientX != null ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
      run = { times: [], misses: 0, w: arena.clientWidth, from }; tg = null;
      state = 'ready'; view('ready', 'ready'); renderHud();
      timer = setTimeout(nextTarget, rand(650, 1050));
    }
    function nextTarget() {
      if (!alive || !run) return;
      const W = arena.clientWidth, H = arena.clientHeight;
      const D = Math.round(clamp(Math.min(W, H) * 0.17, 54, 84)), r = D / 2, pad = 12, top = 46;
      /* every hop lands in the same distance band, so a round's score depends on the player, not on lucky short jumps */
      const minGap = Math.min(W, H) * 0.34, maxGap = Math.min(W, H) * 0.7, prev = tg || run.from;
      const spot = ok => {
        for (let i = 0; i < 60; i++) {
          const x = rand(pad + r, W - pad - r), y = rand(top + r, H - pad - r);
          if (!prev || ok(Math.hypot(x - prev.x, y - prev.y))) return { x, y };
        }
        return null;
      };
      const { x, y } = spot(d => d >= minGap && d <= maxGap) || spot(d => d >= minGap) || { x: W / 2, y: (top + H) / 2 };
      tg = { x, y, r, t0: 0, live: false };
      raf = requestAnimationFrame(() => {
        if (!alive || !run || !tg) return;
        state = 'run'; arena.dataset.state = 'run';
        targetEl.style.setProperty('--d', D + 'px');
        targetEl.style.transform = `translate(${(x - r).toFixed(1)}px, ${(y - r).toFixed(1)}px)`;
        targetEl.hidden = false;
        tg.t0 = performance.now(); tg.live = true;
        renderHud();
        if (motionOK()) ringEl.animate([{ transform: 'scale(1)', opacity: 0.55 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 520, easing: 'ease-out' });
      });
    }
    function burst(cls, x, y, text) {
      const n = document.createElement('span');
      n.className = cls; n.setAttribute('aria-hidden', 'true');
      if (text) n.textContent = text;
      arena.append(n);
      if (cls === 'rf-ghost') {
        n.style.setProperty('--d', tg.r * 2 + 'px');
        n.style.transform = `translate(${x - tg.r}px, ${y - tg.r}px)`;
        if (!motionOK()) { n.remove(); return; }
        n.animate([{ transform: `translate(${x - tg.r}px, ${y - tg.r}px) scale(1)`, opacity: 1 }, { transform: `translate(${x - tg.r}px, ${y - tg.r}px) scale(1.45)`, opacity: 0 }], { duration: 260, easing: 'ease-out' }).onfinish = () => n.remove();
      } else {
        const w = n.offsetWidth, h = n.offsetHeight;
        const px = clamp(x - w / 2, 6, arena.clientWidth - w - 6), py = clamp(y - h - 14, 6, arena.clientHeight - h - 6);
        const at = `translate(${px}px, ${py}px)`;
        n.style.transform = at;
        if (motionOK()) n.animate([{ transform: at + ' scale(.7)', opacity: 0 }, { transform: at, opacity: 1, offset: 0.2 }, { transform: `translate(${px}px, ${py - 18}px)`, opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => n.remove();
        else setTimeout(() => n.remove(), 600);
      }
    }
    function hedefDown(e, at) {
      if (state === 'ready') return;                       // the first target isn't up yet: no penalty
      if (state !== 'run') { startHedef(e); return; }
      if (!tg || !tg.live || !e || at < tg.t0) return;     // between targets, a keyboard press, or a touch that predates this target
      const rect = arena.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (Math.hypot(x - tg.x, y - tg.y) <= tg.r + SLOP) {
        tg.live = false; targetEl.hidden = true;
        run.times.push(at - tg.t0);
        const k = run.times.length;
        Sound.blip(523.25 * Math.pow(2, HIT_STEPS[k - 1] / 12), 0.06, 0.13, 'triangle');
        burst('rf-ghost', tg.x, tg.y);
        if (k >= TARGETS) finishHedef(); else { renderHud(); nextTarget(); }
      } else {
        run.misses++;
        burst('rf-pen', x, y, `+${PENALTY}`);
        Sound.blip(150, 0.08, 0.16, 'square'); vibrate(15);
        renderHud();
      }
    }
    function finishHedef() {
      const misses = run.misses, sum = run.times.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum + misses * PENALTY) / TARGETS);
      cancel();
      const rec = record(avg), r = RATE.hedef(avg);
      const cap = misses ? `Hedef başına · ${misses} ıska dahil` : 'Hedef başına · ıskasız';
      showResult(avg, `${r} Tekrar için dokun.`, rec, { misses }, cap);
      vibrate(10);
      say(`Hedef başına ${avg} milisaniye. ${misses ? misses + ' ıska.' : 'Iskasız.'} ${r}${rec.isBest ? ' Yeni rekor.' : ''}`);
    }

    /* ---------- input ---------- */
    /* when the finger or key actually went down, on the performance clock (not when this handler got to run) */
    const evT = e => { const now = performance.now(); return e && e.timeStamp > 0 && e.timeStamp <= now && now - e.timeStamp < 1000 ? e.timeStamp : now; };
    function act(e, at) {
      if (holdUntil && performance.now() < holdUntil) return;   // a stray double tap must not wipe the result
      if (mode === 'hedef') { hedefDown(e, at); return; }
      if (state === 'wait') { early(); return; }
      if (state === 'go') {
        const ms = Math.round(at - t0);
        if (ms < ANTICIPATE) { early(ms < 0 ? 'early' : 'guess'); return; }   // before the beep / green, or too fast to be a reaction
        if (mode === 'ses') { clearTimeout(deafT); beep = null; }
        finishVisual(ms);
        return;
      }
      if (mode === 'ses' && !Sound.on) {
        Sound.setOn(true); Sound.blip(880, 0.06, 0.12);
        idle(); say('Ses açıldı. Başlamak için dokun.');
        return;
      }
      if (mode === 'ses') startSes(); else startKlasik();
    }
    function share() {
      if (!last) return;
      const b = best != null && best < last.ms ? ` Rekorum ${best} ms.` : '';
      const text = last.mode === 'ses'
        ? `Refleks’in ses modunda bip’e ${last.ms} ms’de tepki verdim.${b} Sen kaç ms yaparsın?`
        : last.mode === 'hedef'
          ? `Refleks’in hedef modunda ${TARGETS} hedefi ortalama ${last.ms} ms’de vurdum${last.misses ? ` (${last.misses} ıska)` : ', hiç ıskalamadan'}.${b} Sen kaç ms yaparsın?`
          : `Refleks’te ekran yeşile dönünce ${last.ms} ms’de dokundum.${b} Sen kaç ms yaparsın?`;
      shareResult({ title: 'Sıkıldım · Refleks', text, url: siteUrl() + '#refleks' });
    }
    function setMode(k) {
      if (!MODES[k] || k === mode) return;
      cancel();
      mode = k; M = MODES[k]; store.set('ref-mode', k);
      hist = readHist(M.hist); best = readBest(M.best); last = null;
      rootEl.dataset.mode = k;
      $$('button', modesEl).forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === k));
      idle(); renderStats();
      Sound.blip(k === 'klasik' ? 660 : k === 'ses' ? 784 : 880, 0.05, 0.08, 'triangle');
      say(k === 'ses' ? 'Ses modu: bip sesini duyunca dokun.' : k === 'hedef' ? `Hedef modu: ${TARGETS} hedefi olabildiğince hızlı vur.` : 'Klasik mod: ekran yeşile dönünce dokun.');
    }

    arena.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); downAt = performance.now();
      if (mode === 'ses') Sound.ensure();
      act(e, evT(e));
    });
    arena.addEventListener('pointerup', () => { if (mode === 'ses') Sound.ensure(); });   // some mobile browsers only unlock audio on pointerup
    /* Keyboard / assistive activation only: some browsers report detail 0 for the click that follows a tap, so skip clicks right after a press. */
    arena.addEventListener('click', e => { const n = performance.now(); if (e.detail === 0 && n - downAt > 900 && n - keyAt > 500) act(null, n); });
    arena.addEventListener('contextmenu', e => e.preventDefault());
    shareBtn.addEventListener('click', share);
    modesEl.addEventListener('click', e => {
      const b = e.target.closest('[data-mode]'); if (!b) return;
      setMode(b.dataset.mode);
      if (e.detail) arena.focus({ preventScroll: true });   // after a tap, Space should start a round, not press the switch again
    });

    const onVis = () => { if (document.hidden && ['wait', 'go', 'ready', 'run'].includes(state)) { cancel(); idle('Ara verildi. Yeniden başlamak için dokun.'); } };
    /* Mobile toolbars fire resize too: only a width change (rotation) or a target pushed out of view stops a Hedef round. */
    const onResize = () => {
      if (!run) return;
      const off = tg && (tg.x + tg.r > arena.clientWidth || tg.y + tg.r > arena.clientHeight);
      if (Math.abs(arena.clientWidth - run.w) > 2 || off) { cancel(); idle('Ekran boyutu değişti. Yeniden başlamak için dokun.'); }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    const offSound = Sound.onChange(on => {
      if (mode !== 'ses') return;
      if (!on && (state === 'wait' || state === 'go')) cancel();
      if (!['result', 'early'].includes(state) || !on) idle();
      else setGlyph();
    });

    idle(); renderStats();
    return {
      onKey(e) {
        if (isField(e.target)) return;
        if (e.key === ' ' || e.key === 'Enter') {
          /* let a focused control handle it: share, the mode switch, or the stage bar's back / sound buttons */
          const t = e.target;
          if (t && t.closest && (t.closest('.rf-share, .rf-modes') || (!el.contains(t) && t.closest('button, a')))) return;
          e.preventDefault();
          if (!e.repeat) { keyAt = performance.now(); act(null, evT(e)); }
        } else if (/^[1-3]$/.test(e.key) && !e.repeat) {
          e.preventDefault(); setMode(MODE_IDS[+e.key - 1]);
        }
      },
      destroy() {
        alive = false; cancel(); if (typeof offSound === 'function') offSound();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', onResize);
      },
    };
  },
});
})();
