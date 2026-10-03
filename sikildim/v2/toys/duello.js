/* Düello — iki kişi tek telefon: refleks düellosu, parmak yarışı ve XOX */
(() => {
'use strict';
const NAMES = ['Mavi', 'Kırmızı'];
const LOC = ['Mavi’de', 'Kırmızı’da'];           // "Sıra Mavi’de"
const KEYS = ['A', 'L'];
const KEY_TO = ['A’ya', 'L’ye'];                   // "Hazırsan A’ya bas"
const SYM = ['x', 'o'];                            // XOX: Mavi X, Kırmızı O
const MODE_IDS = ['refleks', 'yaris', 'xox'];
const MODES = {
  refleks: { name: 'Refleks', meta: '5 puan', desc: 'Yeşil yanınca ilk basan kazanır. Erken basan puanı rakibe kaptırır.' },
  yaris: { name: 'Parmak yarışı', meta: '5 saniye', desc: 'Beş saniye durmadan dokun. Daha çok dokunan kazanır.' },
  xox: { name: 'XOX', meta: '3 el', desc: 'Sırayla X ve O koyun. Üçünü yan yana dizen eli alır.' },
};
const RF_TARGET = 5, XOX_TARGET = 3, RACE_MS = 5000;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const CC = [50, 150, 250];                         // cell centres in the 300×300 win-line viewBox

const SVG = {
  tap: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="du-g-ring" cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="11" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="currentColor" opacity=".16"/><path d="M20 33.5l8 8L45 24" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 18l28 28M46 18 18 46" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
  o: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="16.5" fill="none" stroke="currentColor" stroke-width="8"/></svg>',
  crown: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 43 10 20l12.5 10L32 14l9.5 16L54 20l-3 23Z" fill="currentColor" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M15 51h34" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.4 2.8 5.6 13.4h5.6l-1.1 7.8 7.8-10.6h-5.6Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2" fill="currentColor"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" fill="currentColor"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2" fill="currentColor"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="3.25" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mx: '<svg viewBox="0 0 100 100" aria-hidden="true"><path class="mk mk-x" pathLength="1" d="M27 27 73 73"/><path class="mk mk-x b" pathLength="1" d="M73 27 27 73"/></svg>',
  mo: '<svg viewBox="0 0 100 100" aria-hidden="true"><path class="mk mk-o" pathLength="1" d="M50 24a26 26 0 1 1 0 52a26 26 0 1 1 0-52"/></svg>',
};
const MODE_ICON = {
  refleks: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle class="i-go" cx="20" cy="20" r="13.5"/><path class="i-ink" d="M21.4 11.2 14 21.4h5.5l-1.3 7.4 7.4-10.2h-5.4Z"/></svg>',
  yaris: '<svg viewBox="0 0 40 40" aria-hidden="true"><path class="i-dim" d="M11 11.5v3M20 9.5v5M29 11.5v3M11 25.5v3M20 25.5v5M29 25.5v3"/><rect class="i-p1" x="5" y="16.5" width="30" height="7" rx="3.5"/><path class="i-p0" d="M8.5 16.5H23v7H8.5a3.5 3.5 0 0 1 0-7Z"/><circle class="i-knob" cx="23" cy="20" r="5"/></svg>',
  xox: '<svg viewBox="0 0 40 40" aria-hidden="true"><path class="i-dim" d="M16 7v26M24 7v26M7 16h26M7 24h26"/><path class="i-p0s" d="M9 9l4 4M13 9l-4 4M27 27l4 4M31 27l-4 4"/><circle class="i-p1s" cx="20" cy="20" r="2.4"/></svg>',
};

function readStats() {
  const s = store.get('duello', null);
  const o = s && typeof s === 'object' ? s : {};
  const num = v => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : 0);
  const w = Array.isArray(o.wins) ? o.wins : [];
  const last = o.last && [0, 1, -1].includes(o.last.w) ? { w: o.last.w, mode: MODE_IDS.includes(o.last.mode) ? o.last.mode : null } : null;
  return {
    mode: MODE_IDS.includes(o.mode) ? o.mode : 'refleks',
    wins: [num(w[0]), num(w[1])], n: num(o.n), last,
    bestMs: num(o.bestMs) || null, bestTaps: num(o.bestTaps),
  };
}
const fmt1 = n => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

registerToy('duello', {
  name: 'Düello', color: 'red', cf: 'on-light', kind: 'İki kişilik', open: 'Düello’yu aç',
  cats: ['ikili', 'oyun'],
  desc: 'Telefonu aranıza koyun: refleks düellosu, parmak yarışı ya da XOX.',
  art: '<div class="art-duello"><div class="ad-phone"><div class="ad-half ad-top"><i class="ad-btn"></i><b>3</b></div><div class="ad-half ad-bot"><i class="ad-btn"></i><b>2</b></div><i class="ad-sig"></i></div></div>',
  stat: () => {
    const s = readStats();
    if (!s.last) return '3 mod · aynı telefon';
    return s.last.w < 0 ? 'Son maç: berabere' : `Son maç: ${NAMES[s.last.w]}`;
  },
  css: `
.art-duello { position: relative; width: 112px; height: 112px; rotate: -9deg; transition: rotate .6s var(--spring); }
.art-duello .ad-phone {
  position: absolute; inset: 0; display: grid; grid-template-rows: 1fr 1fr; gap: 5px; padding: 6px; border-radius: 27px;
  background: var(--on-light); box-shadow: 0 16px 24px -16px rgba(0, 0, 0, .6);
}
.art-duello .ad-half { position: relative; display: grid; place-items: center; border-radius: 21px 21px 9px 9px; background: var(--cobalt); }
.art-duello .ad-bot { border-radius: 9px 9px 21px 21px; background: var(--red); }
.art-duello .ad-btn {
  width: 24px; height: 24px; border-radius: 50%; background: var(--paper);
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .14), 0 0 0 5px rgba(255, 255, 255, .2); transition: transform .35s var(--spring);
}
.art-duello b { position: absolute; left: 10px; bottom: 7px; font: 700 11px/1 var(--f-mono); color: var(--on-light); }
.art-duello .ad-top b { left: auto; bottom: auto; right: 10px; top: 7px; rotate: 180deg; color: var(--on-dark); }
.art-duello .ad-sig {
  position: absolute; left: 50%; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%;
  background: var(--green); box-shadow: 0 0 0 4px var(--on-light); transition: transform .35s var(--spring);
}
.tile:hover .art-duello { rotate: 0deg; }
.tile:hover .art-duello .ad-sig { transform: scale(1.22); }
.tile:hover .art-duello .ad-bot .ad-btn { transform: scale(.78); }

.duello-root {
  --p0: var(--cobalt); --p0i: var(--on-dark);
  --p1: var(--red); --p1i: var(--on-light);
  --go: var(--green);
}
.duello-root.toy { flex: 1 1 auto; align-self: stretch; margin: 0 auto; min-height: 0; gap: 0; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.duello-root[data-screen="play"] { touch-action: none; }

/* ---------- Mode picker ---------- */
.duello-root .du-pick { width: min(100%, 540px); margin-block: auto; display: grid; gap: clamp(18px, 3.2vh, 28px); padding-block: 2px 6px; }
.duello-root .du-tally-wrap { display: grid; gap: 10px; justify-items: center; }
.duello-root .du-tally { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: min(100%, 420px); }
.duello-root .du-tally-p {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 62px; padding: 0 26px 0 20px;
  border-radius: var(--r-lg) 8px 8px var(--r-lg); background: var(--p0); color: var(--p0i);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25), inset 0 -3px 0 rgba(0, 0, 0, .1);
}
.duello-root .du-tally-p[data-p="1"] { padding: 0 20px 0 26px; border-radius: 8px var(--r-lg) var(--r-lg) 8px; background: var(--p1); color: var(--p1i); }
.duello-root .du-tally-p span { font-size: 16px; font-weight: 650; letter-spacing: -.01em; }
.duello-root .du-tally-p b { font-size: 32px; font-weight: 800; line-height: 1; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.duello-root .du-tally-vs {
  position: absolute; left: 50%; top: 50%; width: 38px; height: 38px; margin: -19px 0 0 -19px; display: grid; place-items: center;
  border-radius: 50%; background: var(--bg); color: var(--fg); font-size: 11px; letter-spacing: .04em;
}
.duello-root .du-tally-cap { color: var(--mute); }
.duello-root .du-intro { display: grid; gap: 10px; text-align: center; justify-items: center; }
.duello-root .du-title { font-size: clamp(27px, 7.4vw, 42px); font-weight: 760; font-stretch: 94%; line-height: 1.02; letter-spacing: -.035em; }
.duello-root .du-lede { max-width: 36ch; color: var(--mute); font-size: 16.5px; line-height: 1.42; }
.duello-root .du-land { display: none; }
@media (orientation: landscape) { .duello-root .du-land { display: inline; } .duello-root .du-port { display: none; } }
.duello-root .du-modes { display: grid; gap: 10px; }
.duello-root .du-mode {
  position: relative; display: grid; grid-template-columns: 56px minmax(0, 1fr) 20px; align-items: center; gap: 14px;
  min-height: 86px; padding: 14px 14px 14px 14px; border-radius: var(--r-lg); text-align: left;
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line);
  transition: transform .4s var(--spring), box-shadow .3s var(--ease), background .2s;
}
.duello-root .du-mode:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px var(--line-2), 0 18px 34px -24px var(--shade); }
.duello-root .du-mode:active { transform: scale(.98); transition-duration: .1s; }
.duello-root .du-mode-ico { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 17px; background: var(--ink-tile); }
.duello-root .du-mode-ico svg { width: 38px; height: 38px; overflow: visible; }
.duello-root .du-mode-ico .i-go { fill: var(--go); }
.duello-root .du-mode-ico .i-ink { fill: var(--on-light); }
.duello-root .du-mode-ico .i-p0 { fill: var(--p0); }
.duello-root .du-mode-ico .i-p1 { fill: var(--p1); }
.duello-root .du-mode-ico .i-knob { fill: var(--paper); stroke: var(--on-light); stroke-width: 2; }
.duello-root .du-mode-ico .i-dim { fill: none; stroke: var(--ink-tile-fg); stroke-width: 2; stroke-linecap: round; opacity: .38; }
.duello-root .du-mode-ico .i-p0s { fill: none; stroke: var(--p0); stroke-width: 3; stroke-linecap: round; }
.duello-root .du-mode-ico .i-p1s { fill: none; stroke: var(--p1); stroke-width: 3; }
.duello-root .du-mode-t { display: grid; gap: 4px; min-width: 0; }
.duello-root .du-mode-h { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.duello-root .du-mode-h b { font-size: 20px; font-weight: 720; line-height: 1.1; letter-spacing: -.025em; }
.duello-root .du-mode-tags { display: inline-flex; align-items: center; gap: 8px; color: var(--mute); }
.duello-root .du-mode-last { padding: 3px 7px 2px; border-radius: 999px; background: var(--fg); color: var(--bg); font-size: 10px; }
.duello-root .du-mode-d { font-size: 14.5px; line-height: 1.35; color: var(--mute); text-wrap: pretty; }
.duello-root .du-mode-end { display: grid; place-items: center; }
.duello-root .du-mode-chev { width: 20px; height: 20px; color: var(--mute); transition: transform .35s var(--spring); }
.duello-root .du-mode-chev svg { display: block; width: 100%; height: 100%; }
.duello-root .du-mode:hover .du-mode-chev { transform: translateX(3px); color: var(--fg); }
.duello-root .du-note { display: grid; gap: 6px; justify-items: center; text-align: center; color: var(--mute); }
.duello-root .du-note kbd { opacity: .8; }
.duello-root .du-fine { display: none; }
@media (hover: hover) and (pointer: fine) { .duello-root span.du-fine { display: inline; } .duello-root kbd.du-fine { display: inline-grid; } .duello-root .du-touch { display: none !important; } }
@media (orientation: portrait) and (max-height: 700px) {
  .duello-root .du-lede, .duello-root .du-tally-cap { display: none; }
  .duello-root .du-pick { gap: 14px; }
  .duello-root .du-title { font-size: clamp(24px, 7vw, 34px); }
  .duello-root .du-mode { min-height: 70px; padding-block: 10px; }
  .duello-root .du-tally-p { height: 52px; }
}
@media (max-width: 359px) { .duello-root .du-mode { grid-template-columns: 48px minmax(0, 1fr); gap: 12px; padding-right: 12px; } .duello-root .du-mode-ico { width: 48px; height: 48px; border-radius: 15px; } .duello-root .du-mode-end { display: none; } .duello-root .du-mode-d { font-size: 13.5px; } }
@media (orientation: landscape) and (max-height: 540px) {
  .duello-root .du-pick { width: min(100%, 920px); gap: 14px; }
  .duello-root .du-lede, .duello-root .du-tally-cap { display: none; }
  .duello-root .du-title { font-size: 26px; }
  .duello-root .du-tally-p { height: 46px; }
  .duello-root .du-tally-p b { font-size: 26px; }
  .duello-root .du-modes { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .duello-root .du-mode { grid-template-columns: 44px minmax(0, 1fr); align-items: start; gap: 12px; min-height: 0; padding: 12px; }
  .duello-root .du-mode-ico { width: 44px; height: 44px; border-radius: 14px; }
  .duello-root .du-mode-ico svg { width: 30px; height: 30px; }
  .duello-root .du-mode-end { display: none; }
  .duello-root .du-mode-h b { font-size: 18px; }
  .duello-root .du-mode-d { font-size: 13.5px; }
}
@media (min-width: 860px) and (min-height: 541px) and (orientation: landscape) {
  .duello-root .du-pick { width: min(100%, 980px); gap: 30px; }
  .duello-root .du-modes { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .duello-root .du-mode {
    grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto 1fr; grid-template-areas: "ico end" "t t";
    align-items: start; gap: 26px 12px; min-height: 214px; padding: 20px 20px 22px; border-radius: var(--r-xl);
  }
  .duello-root .du-mode-ico { grid-area: ico; width: 64px; height: 64px; border-radius: 19px; }
  .duello-root .du-mode-ico svg { width: 44px; height: 44px; }
  .duello-root .du-mode-end { grid-area: end; }
  .duello-root .du-mode-t { grid-area: t; align-self: end; gap: 8px; }
  .duello-root .du-mode-h { flex-direction: column; align-items: flex-start; gap: 8px; }
  .duello-root .du-mode-tags { order: -1; }
  .duello-root .du-mode-h b { font-size: 27px; }
  .duello-root .du-mode-d { font-size: 15.5px; }
}

/* ---------- Arena ---------- */
.duello-root .du-arena { flex: 1 1 0; min-height: 0; width: 100%; display: flex; flex-direction: column; gap: 10px; }
.duello-root .du-pad {
  --pc: var(--p0); --pi: var(--p0i);
  position: relative; isolation: isolate; flex: 1 1 0; min-width: 0; min-height: 0; overflow: hidden; cursor: pointer;
  container: dupad / size; border-radius: var(--r-xl); touch-action: none;
  background: color-mix(in srgb, var(--pc) 18%, var(--panel)); color: var(--fg);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--pc) 42%, transparent);
  transition: background .35s var(--ease), color .35s var(--ease), box-shadow .35s var(--ease);
}
.duello-root .du-pad[data-p="1"] { --pc: var(--p1); --pi: var(--p1i); }
.duello-root .du-pad[data-lit] { background: var(--pc); color: var(--pi); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .26), inset 0 -4px 0 rgba(0, 0, 0, .1); }
.duello-root .du-arena[data-phase="go"] .du-pad, .duello-root .du-arena[data-phase="race"] .du-pad { transition: none; }
.duello-root .du-arena[data-mode="xox"] .du-pad, .duello-root .du-arena[data-phase="end"] .du-pad { cursor: default; }
.duello-root .du-rip { position: absolute; inset: 0; z-index: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
.duello-root .du-rip i { position: absolute; left: 0; top: 0; width: 240px; height: 240px; margin: -120px 0 0 -120px; border-radius: 50%; background: currentColor; opacity: 0; }
.duello-root .du-pad-in {
  position: absolute; inset: 0; z-index: 1; display: grid; grid-template-rows: auto minmax(0, 1fr) auto;
  padding: clamp(12px, 4.4cqmin, 22px) clamp(14px, 4.8cqmin, 24px);
}
.duello-root .du-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 22px; }
.duello-root .du-name { display: inline-flex; align-items: center; gap: 8px; }
.duello-root .du-name::before { content: ""; width: 10px; height: 10px; border-radius: 3.5px; background: var(--pc); transition: background .3s; }
.duello-root .du-pad[data-lit] .du-name::before { background: currentColor; }
.duello-root .du-meta { display: flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums; }
.duello-root .du-meta i { width: 11px; height: 11px; border-radius: 50%; box-shadow: inset 0 0 0 1.75px currentColor; opacity: .45; transition: background .3s, opacity .3s; }
.duello-root .du-meta i.on { background: currentColor; opacity: 1; }
.duello-root .du-body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(6px, 3cqmin, 16px); min-height: 0; text-align: center; }
.duello-root .du-txt { display: flex; flex-direction: column; align-items: center; gap: clamp(4px, 1.8cqmin, 10px); min-width: 0; }
.duello-root .du-glyph { flex: none; width: clamp(30px, 17cqmin, 88px); height: clamp(30px, 17cqmin, 88px); }
.duello-root .du-glyph:empty { display: none; }
.duello-root .du-glyph svg { display: block; width: 100%; height: 100%; overflow: visible; }
.duello-root .du-g-ring { transform-box: fill-box; transform-origin: center; animation: du-ring 1.8s var(--ease) infinite; }
.duello-root .du-big {
  display: block; font-size: clamp(26px, min(17cqh, 13cqw), 104px); font-weight: 800; font-stretch: 88%;
  line-height: .95; letter-spacing: -.045em; font-variant-numeric: tabular-nums; white-space: nowrap;
}
.duello-root .du-pad[data-kind="count"] .du-big { font-size: clamp(48px, min(46cqh, 36cqw), 200px); line-height: .84; letter-spacing: -.06em; }
.duello-root .du-sub { max-width: 30ch; font-size: clamp(14px, 4.6cqmin, 18px); font-weight: 500; line-height: 1.3; opacity: .8; white-space: pre-line; text-wrap: balance; }
.duello-root .du-sub:empty { display: none; }
.duello-root .du-foot { display: flex; justify-content: center; align-items: flex-end; min-height: 0; }
.duello-root .du-key {
  display: none; place-items: center; min-width: 42px; height: 42px; padding: 0 12px; border-radius: 12px;
  font: 700 17px/1 var(--f-mono); box-shadow: inset 0 0 0 2px currentColor, inset 0 -5px 0 color-mix(in srgb, currentColor 22%, transparent); opacity: .55;
}
@media (hover: hover) and (pointer: fine) { .duello-root .du-key { display: inline-grid; } }
.duello-root .du-arena:is([data-mode="xox"], [data-phase="end"]) .du-key { display: none; }
.duello-root .du-actions { display: none; flex-wrap: wrap; justify-content: center; gap: 8px; }
.duello-root .du-arena[data-phase="end"] .du-actions { display: flex; visibility: hidden; opacity: 0; transform: translateY(8px); }
.duello-root .du-arena[data-phase="end"][data-armed] .du-actions { visibility: visible; opacity: 1; transform: none; transition: opacity .35s var(--ease), transform .5s var(--spring); }
.duello-root .du-actions .btn { height: clamp(42px, 14cqmin, 52px); padding: 0 clamp(16px, 5.4cqmin, 24px); color: var(--fg); }
.duello-root .du-actions .btn.primary { color: var(--bg); }
@container dupad (max-height: 175px) {
  .duello-root .du-body { flex-direction: row; gap: 12px; }
  .duello-root .du-txt { align-items: flex-start; text-align: left; }
  .duello-root .du-glyph { width: 34px; height: 34px; }
  .duello-root .du-pad[data-kind="count"] .du-txt { align-items: center; text-align: center; }
}
@container dupad (max-height: 230px) {
  .duello-root .du-arena[data-phase="end"] .du-glyph { display: none; }
}

.duello-root .du-mid { flex: none; display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; gap: 8px; }
.duello-root .du-menu {
  display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: var(--fg);
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); transition: transform .3s var(--spring), opacity .25s, background .2s;
}
.duello-root .du-menu:hover { background: var(--panel-2); }
.duello-root .du-menu:active { transform: scale(.92); }
.duello-root .du-menu[disabled] { opacity: .28; cursor: default; }
.duello-root .du-menu svg { width: 19px; height: 19px; }
.duello-root .du-center { position: relative; display: grid; place-items: center; min-width: 0; min-height: 56px; }
.duello-root .du-center::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; border-radius: 2px; background: var(--line-2); display: none; }
.duello-root .du-arena[data-mode="refleks"] .du-center::before { display: block; }
.duello-root .du-arena[data-phase="go"] .du-center::before { background: var(--go); }
.duello-root .du-signal, .duello-root .du-tug, .duello-root .du-board { display: none; }
.duello-root .du-signal {
  position: relative; z-index: 1; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  background: var(--ink-tile); color: var(--ink-tile-fg); box-shadow: 0 0 0 6px var(--bg);
  transition: transform .35s var(--spring), background .25s, color .25s;
}
.duello-root .du-arena[data-mode="refleks"] .du-signal { display: grid; }
.duello-root .du-signal svg { width: 26px; height: 26px; opacity: .5; transition: opacity .2s; }
.duello-root .du-signal::after { content: ""; position: absolute; inset: -3px; border-radius: 50%; border: 2px solid var(--ink-tile); opacity: 0; pointer-events: none; }
.duello-root .du-signal[data-s="wait"]::after { animation: du-breathe 1.6s ease-in-out infinite; }
.duello-root .du-signal[data-s="go"] { background: var(--go); color: var(--on-light); transform: scale(1.22); transition: none; }
.duello-root .du-signal[data-s="go"]::after { border-color: var(--go); animation: du-burst .7s var(--ease) both; }
.duello-root .du-signal[data-s="p0"] { background: var(--p0); color: var(--p0i); }
.duello-root .du-signal[data-s="p1"] { background: var(--p1); color: var(--p1i); }
.duello-root .du-signal:not([data-s="idle"]):not([data-s="wait"]) svg { opacity: 1; }

.duello-root .du-tug { --share: .5; --left: 1; position: relative; width: 100%; height: 16px; border-radius: 999px; background: var(--p1); }
.duello-root .du-arena[data-mode="yaris"] .du-tug { display: block; }
.duello-root .du-tug-fill { position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--share) * 100%); border-radius: 999px 0 0 999px; background: var(--p0); transition: width .14s var(--ease); }
.duello-root .du-tug-knob {
  position: absolute; top: 50%; left: calc(var(--share) * 100%); width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%;
  background: var(--paper); box-shadow: 0 0 0 4px var(--bg), 0 6px 12px -4px var(--shade); transition: left .14s var(--ease);
}
.duello-root .du-tug-time { position: absolute; left: 0; right: 0; height: 3px; border-radius: 2px; background: var(--fg); opacity: .45; transform: scaleX(var(--left)); }
.duello-root .du-tug-time.a { bottom: calc(100% + 9px); }
.duello-root .du-tug-time.b { top: calc(100% + 9px); }

.duello-root .du-board {
  --wc: var(--fg);
  position: relative; width: var(--bs, 240px); aspect-ratio: 1; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 6px; padding: 6px; border-radius: var(--r-lg); background: var(--panel-2); box-shadow: inset 0 0 0 1px var(--line);
}
.duello-root .du-arena[data-mode="xox"] .du-board { display: grid; }
.duello-root .du-board[data-wp="0"] { --wc: var(--p0); }
.duello-root .du-board[data-wp="1"] { --wc: var(--p1); }
.duello-root .du-cell {
  position: relative; display: grid; place-items: center; min-width: 0; min-height: 0; border-radius: 13px;
  background: var(--panel); touch-action: manipulation; transition: background .25s, transform .3s var(--spring);
}
.duello-root .du-cell:not([disabled]):active { transform: scale(.94); }
.duello-root .du-cell[disabled] { cursor: default; }
@media (hover: hover) {
  .duello-root .du-board[data-turn="0"] .du-cell:not([disabled]):hover { background: color-mix(in srgb, var(--p0) 14%, var(--panel)); }
  .duello-root .du-board[data-turn="1"] .du-cell:not([disabled]):hover { background: color-mix(in srgb, var(--p1) 14%, var(--panel)); }
}
.duello-root .du-cell.win { background: color-mix(in srgb, var(--wc) 22%, var(--panel)); }
.duello-root .du-cell svg { width: 74%; height: 74%; overflow: visible; }
.duello-root .du-cell .mk { fill: none; stroke-width: 11; stroke-linecap: round; stroke-dasharray: 1 1; stroke-dashoffset: 1; animation: du-draw .3s var(--ease) both; }
.duello-root .du-cell .mk-x { stroke: var(--p0); }
.duello-root .du-cell .mk-x.b { animation-delay: .1s; }
.duello-root .du-cell .mk-o { stroke: var(--p1); animation-duration: .42s; }
.duello-root .du-line { position: absolute; inset: 6px; width: calc(100% - 12px); height: calc(100% - 12px); overflow: visible; pointer-events: none; }
.duello-root .du-line path { fill: none; stroke-linecap: round; stroke-dasharray: 1 1; stroke-dashoffset: 1; }
.duello-root .du-line .halo { stroke: var(--panel); stroke-width: 18; }
.duello-root .du-line .ln { stroke: var(--wc); stroke-width: 10; }
.duello-root .du-board[data-wp] .du-line path { animation: du-draw .45s var(--ease) .12s both; }

@keyframes du-ring { 0% { transform: scale(.72); opacity: .9; } 70%, 100% { transform: scale(1.28); opacity: 0; } }
@keyframes du-breathe { 0%, 100% { transform: scale(1); opacity: 0; } 50% { transform: scale(1.32); opacity: .5; } }
@keyframes du-burst { from { transform: scale(1); opacity: .9; } to { transform: scale(2.4); opacity: 0; } }
@keyframes du-draw { to { stroke-dashoffset: 0; } }

@media (orientation: portrait) {
  .duello-root .du-pad[data-p="0"] .du-pad-in, .duello-root .du-menu[data-p="0"] { rotate: 180deg; }
}
@media (orientation: landscape) {
  .duello-root .du-arena { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; grid-template-areas: "p0 p1" "mid mid"; gap: 12px; }
  .duello-root .du-pad[data-p="0"] { grid-area: p0; }
  .duello-root .du-pad[data-p="1"] { grid-area: p1; }
  .duello-root .du-mid { grid-area: mid; }
  .duello-root .du-menu[data-p="0"] { visibility: hidden; }
  .duello-root .du-arena:is([data-mode="xox"], [data-mode="refleks"]) { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); grid-template-areas: "p0 mid p1"; }
  .duello-root .du-arena[data-mode="refleks"] .du-mid { grid-template-columns: 64px; grid-template-rows: 44px minmax(0, 1fr) 44px; justify-items: center; align-self: stretch; }
  .duello-root .du-arena[data-mode="refleks"] .du-menu[data-p="1"] { grid-row: 3; }
  .duello-root .du-arena[data-mode="refleks"] .du-menu[data-p="0"] { grid-row: 1; }
  .duello-root .du-arena[data-mode="refleks"] .du-center { grid-row: 2; width: 100%; height: 100%; }
  .duello-root .du-arena[data-mode="refleks"] .du-center::before { left: 50%; right: auto; top: 0; bottom: 0; width: 2px; height: auto; margin: 0 0 0 -1px; }
  .duello-root .du-arena[data-mode="xox"] .du-mid { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .duello-root .du-arena[data-mode="xox"] .du-menu[data-p="0"] { display: none; }
  .duello-root .du-arena[data-mode="xox"] .du-menu[data-p="1"] { order: 2; }
}
`,
  hint: 'Mavi A · Kırmızı L · XOX’ta 1–9 · M modlar',
  mount(el) {
    const stats = readStats();
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const landMQ = matchMedia('(orientation: landscape)');
    const padHTML = p => `
      <div class="du-pad" data-p="${p}" role="group" aria-label="${NAMES[p]} alanı">
        <div class="du-rip" aria-hidden="true"></div>
        <div class="du-pad-in">
          <div class="du-head"><span class="mono du-name">${NAMES[p]}</span><span class="mono du-meta"></span></div>
          <div class="du-body"><span class="du-glyph" aria-hidden="true"></span><span class="du-txt"><b class="du-big"></b><span class="du-sub"></span></span></div>
          <div class="du-foot"><kbd class="du-key" aria-hidden="true">${KEYS[p]}</kbd><div class="du-actions"><button type="button" class="btn primary" data-act="again">Rövanş</button><button type="button" class="btn" data-act="modes">Modlar</button></div></div>
        </div>
      </div>`;
    const modeHTML = (id, i) => `
      <button type="button" class="du-mode" data-mode="${id}">
        <span class="du-mode-ico">${MODE_ICON[id]}</span>
        <span class="du-mode-t">
          <span class="du-mode-h"><b>${MODES[id].name}</b><span class="du-mode-tags"><span class="mono">${MODES[id].meta}</span><span class="mono du-mode-last" hidden>son</span></span></span>
          <span class="du-mode-d">${MODES[id].desc}</span>
        </span>
        <span class="du-mode-end"><kbd class="du-fine">${i + 1}</kbd><span class="du-mode-chev du-touch">${SVG.chev}</span></span>
      </button>`;
    el.innerHTML = `
      <div class="toy duello-root" data-screen="pick">
        <section class="du-pick" aria-labelledby="du-title">
          <div class="du-tally-wrap">
            <div class="du-tally" id="du-tally">
              <div class="du-tally-p" data-p="0"><span>Mavi</span><b id="du-w0">0</b></div>
              <div class="du-tally-p" data-p="1"><b id="du-w1">0</b><span>Kırmızı</span></div>
              <span class="du-tally-vs mono" aria-hidden="true">vs</span>
            </div>
            <p class="mono du-tally-cap" id="du-cap"></p>
          </div>
          <div class="du-intro">
            <h3 class="du-title" id="du-title">Telefonu ikinizin arasına koyun.</h3>
            <p class="du-lede"><span class="du-port">Ekran ikiye bölünür: üst yarı karşındakine döner, alt yarı senin.</span><span class="du-land">Sol yarı Mavi’nin, sağ yarı Kırmızı’nın.</span> Bir mod seçin, düello başlasın.</p>
          </div>
          <div class="du-modes" role="group" aria-label="Oyun modu">${MODE_IDS.map(modeHTML).join('')}</div>
          <div class="mono du-note">
            <span class="du-touch">İkiniz aynı anda dokunabilirsiniz</span>
            <span class="du-fine">Mavi <kbd>A</kbd> · Kırmızı <kbd>L</kbd> · Mod seç <kbd>1</kbd>–<kbd>3</kbd></span>
            <span id="du-recs"></span>
          </div>
        </section>
        <section class="du-arena" id="du-arena" data-mode="refleks" data-phase="idle" hidden>
          ${padHTML(0)}
          <div class="du-mid">
            <button type="button" class="du-menu" data-p="1" data-act="modes" aria-label="Mod seçimine dön">${SVG.menu}</button>
            <div class="du-center">
              <div class="du-signal" id="du-sig" data-s="idle" aria-hidden="true">${SVG.bolt}</div>
              <div class="du-tug" id="du-tug" aria-hidden="true"><i class="du-tug-time a"></i><i class="du-tug-fill"></i><i class="du-tug-knob"></i><i class="du-tug-time b"></i></div>
              <div class="du-board" id="du-board" role="group" aria-label="XOX tahtası">
                ${Array.from({ length: 9 }, (_, i) => `<button type="button" class="du-cell" data-i="${i}"></button>`).join('')}
                <svg class="du-line" viewBox="0 0 300 300" aria-hidden="true"><path class="halo" pathLength="1"/><path class="ln" pathLength="1"/></svg>
              </div>
            </div>
            <button type="button" class="du-menu" data-p="0" data-act="modes" aria-label="Mod seçimine dön">${SVG.menu}</button>
          </div>
          ${padHTML(1)}
        </section>
      </div>`;

    const rootEl = $('.duello-root', el), pick = $('.du-pick', el), arena = $('#du-arena', el);
    const sigEl = $('#du-sig', el), tugEl = $('#du-tug', el), board = $('#du-board', el);
    const cellEls = $$('.du-cell', board), linePaths = $$('.du-line path', board), menus = $$('.du-menu', arena);
    const P = [0, 1].map(p => {
      const pad = $(`.du-pad[data-p="${p}"]`, arena);
      return { el: pad, rip: $('.du-rip', pad), glyph: $('.du-glyph', pad), big: $('.du-big', pad), sub: $('.du-sub', pad), meta: $('.du-meta', pad), body: $('.du-body', pad), g: null };
    });

    let screen = 'pick', mode = stats.mode, phase = 'idle';
    let score = [0, 0], ready = [false, false], fastest = [null, null], taps = [0, 0];
    let t0 = 0, armAt = 0, tEnd = 0, raf = 0, goRaf = 0, lastTxt = '';
    let cells = Array(9).fill(-1), turn = 0, starter = 0;

    /* ---------- timers ---------- */
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    function stop() {
      timers.forEach(clearTimeout); timers.clear();
      if (raf) cancelAnimationFrame(raf); if (goRaf) cancelAnimationFrame(goRaf); raf = goRaf = 0;
    }
    const busy = () => phase === 'count' || phase === 'race' || phase === 'go';
    function setPhase(ph) {
      phase = ph; arena.dataset.phase = ph;
      if (ph !== 'end') arena.removeAttribute('data-armed');
      const b = busy(); menus.forEach(m => { m.disabled = b; });
    }

    /* ---------- sound ---------- */
    const sfx = {
      ready(p) { Sound.blip(p ? 784 : 659.25, 0.07, 0.12, 'sine'); },
      tick() { Sound.blip(660, 0.06, 0.12, 'triangle'); },
      go() {
        const c = Sound.ensure(); if (!c) return; const t = c.currentTime;
        Sound.tone(1174.7, { type: 'triangle', dur: 0.18, vol: 0.22, when: t });
        Sound.tone(2349.3, { type: 'sine', dur: 0.1, vol: 0.06, when: t });
      },
      point(p) {
        const c = Sound.ensure(); if (!c) return; const t = c.currentTime, f = p ? 587.33 : 523.25;
        Sound.pluck(f, t, 0.17); Sound.pluck(f * 1.5, t + 0.07, 0.15);
      },
      tap(p, n) { Sound.blip((p ? 523.25 : 392) * Math.pow(2, Math.min(n, 36) / 36), 0.03, 0.05, 'triangle'); },
      place(p) { const c = Sound.ensure(); if (!c) return; Sound.pluck(p ? 659.25 : 493.88, c.currentTime, 0.16); },
      draw() { Sound.blip(330, 0.14, 0.1, 'sine'); },
      whistle() {
        const c = Sound.ensure(); if (!c) return; const t = c.currentTime;
        Sound.tone(1568, { type: 'sine', dur: 0.16, vol: 0.12, when: t });
        Sound.tone(1568, { type: 'sine', dur: 0.32, vol: 0.12, when: t + 0.2, to: 1175, glide: 0.3 });
      },
      fanfare(tie) {
        const c = Sound.ensure(); if (!c) return; const t = c.currentTime;
        (tie ? [392, 523.25, 392] : [523.25, 659.25, 783.99, 1046.5]).forEach((f, i) => Sound.pluck(f, t + i * 0.1, 0.17));
      },
    };

    /* ---------- pads, signal, effects ---------- */
    function setPad(p, o) {
      const d = P[p];
      if (o.lit !== undefined) d.el.toggleAttribute('data-lit', !!o.lit);
      if (o.big !== undefined) d.big.textContent = o.big;
      if (o.sub !== undefined) d.sub.textContent = o.sub;
      if (o.glyph !== undefined && o.glyph !== d.g) { d.g = o.glyph; d.glyph.innerHTML = o.glyph ? SVG[o.glyph] : ''; }
      if (o.kind !== undefined) d.el.dataset.kind = o.kind;
    }
    const both = fn => { fn(0); fn(1); };
    const sig = s => { sigEl.dataset.s = s; };
    function renderMeta() {
      const target = mode === 'refleks' ? RF_TARGET : mode === 'xox' ? XOX_TARGET : 0;
      P.forEach((d, p) => {
        if (!target) { d.meta.textContent = fmt1(Math.max(0, tEnd && phase === 'race' ? (tEnd - performance.now()) / 1000 : RACE_MS / 1000)) + ' sn'; d.meta.removeAttribute('aria-label'); return; }
        d.meta.innerHTML = Array.from({ length: target }, (_, k) => `<i class="${k < score[p] ? 'on' : ''}"></i>`).join('');
        d.meta.setAttribute('aria-label', `${score[p]} / ${target} puan`);
      });
    }
    function ripple(p, e) {
      if (!motionOK()) return;
      const d = P[p], r = d.el.getBoundingClientRect();
      const fromPointer = e && e.pointerType && e.clientX != null;
      const x = fromPointer ? e.clientX - r.left : r.width / 2, y = fromPointer ? e.clientY - r.top : r.height / 2;
      while (d.rip.childElementCount > 10) d.rip.firstChild.remove();
      const s = document.createElement('i');
      s.style.left = x + 'px'; s.style.top = y + 'px';
      d.rip.append(s);
      const a = s.animate([{ transform: 'scale(.12)', opacity: 0.26 }, { transform: 'scale(1)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' });
      a.onfinish = () => s.remove();
    }
    function pop(p) { if (motionOK()) P[p].big.animate([{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.6 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }); }
    function bump(p) { if (motionOK()) P[p].big.animate([{ transform: 'scale(1.1)' }, { transform: 'none' }], { duration: 150, easing: 'ease-out' }); }
    function shake(p) { if (motionOK()) P[p].body.animate([{ transform: 'none' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }); }
    const stamp = e => { const n = performance.now(); return e && e.timeStamp && Math.abs(n - e.timeStamp) < 1000 ? e.timeStamp : n; };

    /* ---------- screens ---------- */
    function renderPick() {
      $('#du-w0', el).textContent = fmt(stats.wins[0]);
      $('#du-w1', el).textContent = fmt(stats.wins[1]);
      $('#du-tally', el).setAttribute('aria-label', `Toplam galibiyet: Mavi ${stats.wins[0]}, Kırmızı ${stats.wins[1]}`);
      $('#du-cap', el).textContent = stats.n ? `Toplam galibiyet · ${fmt(stats.n)} maç` : 'Henüz maç yok · ilk düello sizden';
      const recs = [];
      if (stats.bestMs) recs.push(`En hızlı tepki ${stats.bestMs} ms`);
      if (stats.bestTaps) recs.push(`En çok dokunuş ${stats.bestTaps}`);
      $('#du-recs', el).textContent = recs.join(' · ');
      $$('.du-mode', pick).forEach(b => { $('.du-mode-last', b).hidden = !(stats.n && b.dataset.mode === stats.mode); });
    }
    function showPicker() {
      stop(); screen = 'pick'; rootEl.dataset.screen = 'pick'; setPhase('idle');
      arena.hidden = true; pick.hidden = false; renderPick();
      const b = $(`.du-mode[data-mode="${stats.mode}"]`, pick);
      if (b && fine) b.focus({ preventScroll: true });
    }
    function startMatch(m) {
      Sound.ensure();
      stop();
      mode = m; stats.mode = m; store.set('duello', stats);
      screen = 'play'; rootEl.dataset.screen = 'play';
      if (document.activeElement && pick.contains(document.activeElement)) document.activeElement.blur();
      pick.hidden = true; arena.hidden = false; arena.dataset.mode = m;
      score = [0, 0]; fastest = [null, null]; taps = [0, 0]; tEnd = 0;
      P.forEach(d => { d.rip.textContent = ''; });
      fit();
      if (m === 'xox') xoxGame(); else readyUp(false);
      say(`${MODES[m].name}. ${m === 'xox' ? 'Sıra ' + LOC[turn] + '.' : 'Hazır olunca alanınıza dokunun.'}`);
    }

    /* ---------- ready step (refleks + yarış) ---------- */
    function readyUp(resumed) {
      stop(); setPhase('ready'); ready = [false, false]; sig('idle');
      if (mode === 'yaris') { taps = [0, 0]; tEnd = 0; tugSet(); tugEl.style.setProperty('--left', 1); }
      renderMeta();
      both(p => setPad(p, {
        lit: false, glyph: 'tap', kind: '', big: resumed ? 'Ara verdik' : 'Dokun',
        sub: fine ? `Hazırsan ${KEY_TO[p]} bas` : 'Hazırsan kendi alanına dokun',
      }));
    }
    function readyTap(p, e) {
      if (ready[p]) return;
      ready[p] = true; ripple(p, e); sfx.ready(p); vibrate(10);
      setPad(p, { glyph: 'check', big: 'Hazır', sub: 'Rakip bekleniyor' });
      if (ready[0] && ready[1]) {
        setPhase('starting');
        both(q => setPad(q, { sub: mode === 'yaris' ? 'Parmaklar ısınsın' : 'Gözler ortadaki ışıkta' }));
        later(mode === 'yaris' ? raceCount : rfRound, 750);
      }
    }
    function hit(p, e) {
      if (screen !== 'play') return;
      if (phase === 'ready') readyTap(p, e);
      else if (mode === 'refleks') rfHit(p, e);
      else if (mode === 'yaris') raceHit(p, e);
    }

    /* ---------- Refleks ---------- */
    function rfRound() {
      setPhase('wait'); armAt = performance.now() + 250; sig('wait');
      both(p => setPad(p, { lit: false, glyph: '', kind: '', big: 'Bekle', sub: 'Işık yeşile dönünce bas' }));
      later(() => {
        goRaf = requestAnimationFrame(() => {
          goRaf = 0; setPhase('go'); sig('go');
          both(p => setPad(p, { lit: true, big: 'BAS!', sub: '' }));
          t0 = performance.now(); sfx.go();
          later(rfSleep, 3500);
        });
      }, rand(1500, 4300));
    }
    function rfHit(p, e) {
      if (phase === 'wait') { if (performance.now() >= armAt) rfEarly(p); return; }
      if (phase !== 'go') return;
      const ms = clamp(Math.round(stamp(e) - t0), 0, 9999), o = 1 - p;
      stop(); setPhase('point'); score[p]++;
      if (fastest[p] == null || ms < fastest[p]) fastest[p] = ms;
      const rec = !stats.bestMs || ms < stats.bestMs;
      if (rec) { stats.bestMs = ms; store.set('duello', stats); }
      ripple(p, e);
      setPad(p, { lit: true, big: '+1', sub: `${ms} ms${rec ? ' · rekor' : ''}` }); pop(p);
      setPad(o, { lit: false, big: 'Geç kaldın', sub: `${NAMES[p]} ${ms} ms’de bastı` });
      sig('p' + p); renderMeta(); sfx.point(p); vibrate(14);
      say(`${NAMES[p]} puanı aldı, ${ms} milisaniye. ${score[0]}–${score[1]}.`);
      rfNext(p);
    }
    function rfEarly(p) {
      const o = 1 - p;
      stop(); setPhase('point'); score[o]++;
      setPad(p, { lit: false, big: 'Erken!', sub: 'Puan rakibe gitti' }); shake(p);
      setPad(o, { lit: true, big: '+1', sub: `${NAMES[p]} erken bastı` }); pop(o);
      sig('p' + o); renderMeta(); Sound.buzz(); vibrate([30, 40, 30]);
      say(`${NAMES[p]} erken bastı. Puan ${NAMES[o]} için. ${score[0]}–${score[1]}.`);
      rfNext(o);
    }
    function rfNext(w) {
      if (score[w] >= RF_TARGET) later(() => endMatch(w), 1150);
      else later(rfRound, 1750);
    }
    function rfSleep() {
      setPhase('point'); sig('idle');
      both(p => setPad(p, { lit: false, big: 'Uyanın!', sub: 'Kimse basmadı, tur yeniden' }));
      Sound.blip(220, 0.18, 0.1, 'sine');
      later(rfRound, 1600);
    }

    /* ---------- Parmak yarışı ---------- */
    function tugSet() { tugEl.style.setProperty('--share', ((taps[0] + 1) / (taps[0] + taps[1] + 2)).toFixed(4)); }
    function raceCount() {
      setPhase('count');
      let n = 3;
      const step = () => {
        if (n === 0) { raceGo(); return; }
        both(p => setPad(p, { lit: false, glyph: '', kind: 'count', big: String(n), sub: 'Parmaklar hazır' }));
        sfx.tick(); n--; later(step, 680);
      };
      step();
    }
    function raceGo() {
      setPhase('race'); taps = [0, 0]; tugSet(); lastTxt = '';
      both(p => setPad(p, { lit: true, kind: 'count', big: '0', sub: 'Bas bas bas!' }));
      sfx.go(); vibrate(20);
      tEnd = performance.now() + RACE_MS;
      raf = requestAnimationFrame(raceFrame);
    }
    function raceFrame(now) {
      const left = Math.max(0, tEnd - now);
      tugEl.style.setProperty('--left', (left / RACE_MS).toFixed(4));
      const txt = fmt1(Math.ceil(left / 100) / 10) + ' sn';
      if (txt !== lastTxt) { lastTxt = txt; P.forEach(d => { d.meta.textContent = txt; }); }
      if (left <= 0) { raf = 0; raceEnd(); return; }
      raf = requestAnimationFrame(raceFrame);
    }
    function raceHit(p, e) {
      if (phase !== 'race') return;
      if (performance.now() > tEnd) return;
      taps[p]++;
      setPad(p, { big: String(taps[p]), sub: 'dokunuş' });
      bump(p); ripple(p, e); sfx.tap(p, taps[p]); tugSet();
    }
    function raceEnd() {
      setPhase('point'); tugEl.style.setProperty('--left', 0);
      P.forEach(d => { d.meta.textContent = '0,0 sn'; });
      const w = taps[0] === taps[1] ? -1 : taps[0] > taps[1] ? 0 : 1;
      both(p => setPad(p, { lit: w === p, sub: 'Süre doldu' }));
      sfx.whistle(); vibrate([30, 50, 30]);
      later(() => endMatch(w), 1000);
    }

    /* ---------- XOX ---------- */
    function xoxGame() {
      stop(); setPhase('turn');
      cells = Array(9).fill(-1); turn = starter; starter = 1 - starter;
      board.removeAttribute('data-wp');
      linePaths.forEach(pth => pth.removeAttribute('d'));
      cellEls.forEach((c, i) => { c.innerHTML = ''; c.disabled = false; c.classList.remove('win'); c.setAttribute('aria-label', `${i + 1}. kare, boş`); });
      renderMeta(); xoxPads();
    }
    function xoxPads() {
      board.dataset.turn = turn;
      both(p => setPad(p, p === turn
        ? { lit: true, glyph: SYM[p], kind: '', big: 'Sıra sende', sub: fine ? 'Bir kare seç · 1–9' : 'Ortadan bir kare seç' }
        : { lit: false, glyph: SYM[p], kind: '', big: 'Bekle', sub: `Sıra ${LOC[turn]}` }));
    }
    function place(i) {
      if (screen !== 'play' || mode !== 'xox' || phase !== 'turn' || cells[i] !== -1) return;
      const p = turn, o = 1 - p;
      cells[i] = p;
      const c = cellEls[i];
      c.innerHTML = p === 0 ? SVG.mx : SVG.mo; c.disabled = true;
      c.setAttribute('aria-label', `${i + 1}. kare, ${p === 0 ? 'X' : 'O'} (${NAMES[p]})`);
      sfx.place(p); vibrate(8);
      const ln = LINES.find(l => l.every(k => cells[k] === p));
      if (ln) {
        setPhase('point'); score[p]++;
        cellEls.forEach(x => { x.disabled = true; });
        ln.forEach(k => cellEls[k].classList.add('win'));
        const [a, b] = [ln[0], ln[2]], ax = CC[a % 3], ay = CC[(a / 3) | 0], bx = CC[b % 3], by = CC[(b / 3) | 0];
        const dx = Math.sign(bx - ax) * 34, dy = Math.sign(by - ay) * 34;
        linePaths.forEach(pth => pth.setAttribute('d', `M${ax - dx} ${ay - dy}L${bx + dx} ${by + dy}`));
        board.dataset.wp = p;
        setPad(p, { lit: true, big: 'Bu el senin', sub: `${score[p]} – ${score[o]}` }); pop(p);
        setPad(o, { lit: false, big: 'Bu el gitti', sub: `${score[o]} – ${score[p]}` });
        renderMeta(); later(() => sfx.point(p), 120); vibrate(16);
        say(`${NAMES[p]} eli aldı. ${score[0]}–${score[1]}.`);
        if (score[p] >= XOX_TARGET) later(() => endMatch(p), 1500); else later(xoxGame, 1900);
      } else if (cells.every(v => v !== -1)) {
        setPhase('point');
        both(q => setPad(q, { lit: false, big: 'Berabere', sub: 'Bu eli kimse alamadı' }));
        later(() => sfx.draw(), 120);
        say('Berabere. Yeni el.');
        later(xoxGame, 1600);
      } else {
        turn = o; xoxPads();
      }
    }

    /* ---------- match end ---------- */
    function endMatch(w) {
      stop(); setPhase('end');
      stats.n++; if (w >= 0) stats.wins[w]++;
      stats.last = { w, mode };
      const prevTaps = stats.bestTaps;
      if (mode === 'yaris') stats.bestTaps = Math.max(stats.bestTaps, taps[0], taps[1]);
      store.set('duello', stats);
      both(p => {
        const o = 1 - p;
        const line = mode === 'yaris' ? `${taps[p]} – ${taps[o]} dokunuş` : `${score[p]} – ${score[o]}`;
        let extra = '';
        if (mode === 'refleks' && fastest[p] != null) extra = `En hızlı tepkin ${fastest[p]} ms`;
        if (mode === 'yaris') extra = taps[p] > prevTaps && taps[p] === stats.bestTaps ? 'Yeni rekor!' : `Saniyede ${fmt1(taps[p] / (RACE_MS / 1000))} dokunuş`;
        setPad(p, {
          lit: w === p, kind: '', glyph: w === p ? 'crown' : '',
          big: w < 0 ? 'Berabere' : w === p ? 'Kazandın!' : 'Kaybettin',
          sub: line + (extra ? '\n' + extra : ''),
        });
        if (w === p) pop(p);
      });
      sig(w < 0 ? 'idle' : 'p' + w);
      sfx.fanfare(w < 0); vibrate(w < 0 ? 30 : [20, 60, 20, 60, 40]);
      say(w < 0 ? `Berabere bitti. ${taps[0]}–${taps[1]}.` : `${NAMES[w]} kazandı! Rövanş için Rövanş düğmesine dokunun.`);
      later(() => arena.setAttribute('data-armed', ''), 700);
    }

    /* ---------- layout ---------- */
    function fit() {
      if (arena.hidden) return;
      const W = arena.clientWidth, H = arena.clientHeight;
      if (!W || !H) return;
      const bs = landMQ.matches ? Math.min(H - 56, W - 2 * 180 - 24, 560) : Math.min(W - 104, H - 2 * 108 - 20, 440);
      arena.style.setProperty('--bs', Math.max(132, Math.floor(bs)) + 'px');
    }
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(arena);

    /* ---------- input ---------- */
    P.forEach((d, p) => {
      d.el.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('button')) return;
        e.preventDefault();
        hit(p, e);
      });
      d.el.addEventListener('touchstart', e => { if (!e.target.closest('button')) e.preventDefault(); }, { passive: false });
    });
    rootEl.addEventListener('contextmenu', e => { if (screen === 'play') e.preventDefault(); });
    pick.addEventListener('click', e => { const b = e.target.closest('.du-mode'); if (b) startMatch(b.dataset.mode); });
    arena.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b) {
        if (b.disabled) return;
        if (b.dataset.act === 'again') startMatch(mode); else showPicker();
        return;
      }
      const c = e.target.closest('.du-cell');
      if (c) place(+c.dataset.i);
    });
    function onVis() {
      if (!document.hidden || screen !== 'play') return;
      if ((mode === 'refleks' || mode === 'yaris') && ['starting', 'wait', 'go', 'count', 'race'].includes(phase)) readyUp(true);
    }
    document.addEventListener('visibilitychange', onVis);

    renderPick();
    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key.length === 1 ? e.key.toLocaleLowerCase('tr') : e.key;
        if (screen === 'pick') {
          const n = '123'.indexOf(k);
          if (n >= 0 && !e.repeat) { e.preventDefault(); startMatch(MODE_IDS[n]); }
          return;
        }
        const p = k === 'a' || e.code === 'KeyA' ? 0 : k === 'l' || e.code === 'KeyL' ? 1 : -1;
        if (p >= 0 && mode !== 'xox') { e.preventDefault(); if (!e.repeat) hit(p, e); return; }
        if (mode === 'xox' && /^[1-9]$/.test(k)) { e.preventDefault(); if (!e.repeat) place(+k - 1); return; }
        if (phase === 'end' && !e.repeat && arena.hasAttribute('data-armed')) {
          const onBtn = e.target && e.target.closest && e.target.closest('button');
          if (k === 'r' || ((k === 'Enter' || k === ' ') && !onBtn)) { e.preventDefault(); startMatch(mode); return; }
        }
        if (k === 'm' && !e.repeat && !busy()) { e.preventDefault(); showPicker(); }
      },
      destroy() {
        stop();
        if (ro) ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
      },
    };
  },
});
})();
