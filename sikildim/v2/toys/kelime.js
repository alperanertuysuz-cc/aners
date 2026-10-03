/* Kelime — günün Türkçe beş harfli kelimesi. Altı denemede bul; her gün herkese aynı kelime, Serbest modda sınırsız.
   Puzzle #1 = 2026-10-03 (Europe/Istanbul calendar date). The daily word comes from a fixed Fisher–Yates permutation of
   KELIME_WORDS.answers driven by a seeded PRNG (mulberry32, SEED below), reshuffled with a new seed every full cycle.
   Math.random is used only for Serbest mode. Word lists live in toys/kelime-words.js (loaded before this file). */
(() => {
'use strict';
const WORDS = window.KELIME_WORDS || { answers: [], allowed: [] };
const ANSWERS = WORDS.answers || [];
let ALLOWED = null;
const allowedSet = () => ALLOWED || (ALLOWED = new Set(WORDS.allowed || []));

const LEN = 5, ROWS = 6;
const EPOCH = Date.UTC(2026, 9, 3); // #1
const SEED = 20263777; // chosen so that #1 (launch day) is “kahve” (re-picked after “kaşar” left the answers)
const ALPHA = new Set('abcçdefgğhıijklmnoöprsştuüvyz');
const KEY_ROWS = [
  ['e', 'r', 't', 'y', 'u', 'ı', 'o', 'p', 'ğ', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ş', 'i'],
  ['enter', 'z', 'c', 'v', 'b', 'n', 'm', 'ö', 'ç', 'del'],
];
const WIN_WORDS = ['İnanılmaz!', 'Muhteşem!', 'Harika!', 'Çok iyi!', 'Güzel!', 'Kıl payı!'];
const STATE_TXT = { c: 'doğru yerde', p: 'başka yerde', a: 'yok' };
const up = s => s.toLocaleUpperCase('tr');
const K_STATS = 'kelime-stats', K_FSTATS = 'kelime-free-stats', K_DAILY = 'kelime-daily', K_FREE = 'kelime-free', K_MODE = 'kelime-mode', K_HELP = 'kelime-help';

/* ---------- Daily word: seeded permutation + Istanbul calendar ---------- */
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const permCache = new Map();
function permutation(cycle) {
  if (!permCache.has(cycle)) {
    const rnd = mulberry32(SEED + cycle * 7919), p = ANSWERS.map((_, i) => i);
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    permCache.set(cycle, p);
  }
  return permCache.get(cycle);
}
function dailyAnswer(n) {
  const N = ANSWERS.length, k = n - 1, cycle = Math.floor(k / N);
  return ANSWERS[permutation(cycle)[((k % N) + N) % N]];
}
let partsFmt = null, dateFmt = null;
try { partsFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }); } catch (e) {}
try { dateFmt = new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'long' }); } catch (e) {}
function trNow(date = new Date()) {
  if (partsFmt) {
    try {
      const o = {}; partsFmt.formatToParts(date).forEach(p => { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); });
      if (o.year && o.month && o.day) return { y: o.year, m: o.month, d: o.day, h: (o.hour || 0) % 24, mi: o.minute || 0, s: o.second || 0 };
    } catch (e) {}
  }
  const t = new Date(date.getTime() + 3 * 3600e3); // Türkiye: sabit UTC+3
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
}
const dayNum = (p = trNow()) => Math.round((Date.UTC(p.y, p.m - 1, p.d) - EPOCH) / 864e5) + 1;
const secsToNext = (p = trNow()) => 86400 - (p.h * 3600 + p.mi * 60 + p.s);
const dateLabel = day => { try { return dateFmt ? dateFmt.format(new Date(EPOCH + (day - 1) * 864e5)) : ''; } catch (e) { return ''; } }; // the puzzle's own date, not today's
const fmtCount = () => { const t = Math.max(0, secsToNext()); return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map(v => String(v).padStart(2, '0')).join(':'); };

/* ---------- Scoring + storage ---------- */
function score(guess, answer) {
  const g = Array.from(guess), a = Array.from(answer), res = Array(LEN).fill('a'), left = {};
  for (let i = 0; i < LEN; i++) { if (g[i] === a[i]) res[i] = 'c'; else left[a[i]] = (left[a[i]] || 0) + 1; }
  for (let i = 0; i < LEN; i++) if (res[i] !== 'c' && left[g[i]] > 0) { res[i] = 'p'; left[g[i]]--; }
  return res;
}
const enc = w => Array.from(w, c => c.codePointAt(0).toString(36)).join('.');
const dec = s => { try { return String(s || '').split('.').map(x => String.fromCodePoint(parseInt(x, 36))).join(''); } catch (e) { return ''; } };
const isWord = w => typeof w === 'string' && Array.from(w).length === LEN && Array.from(w).every(ch => ALPHA.has(ch));
const blankStats = () => ({ played: 0, wins: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], lastWin: 0, lastDay: 0 });
function loadStats(key) {
  const s = Object.assign(blankStats(), store.get(key, null) || {});
  if (!Array.isArray(s.dist) || s.dist.length !== ROWS) s.dist = [0, 0, 0, 0, 0, 0];
  return s;
}
const liveStreak = (s, today) => (s.lastWin >= today - 1 ? s.streak : 0);
function cleanGuesses(arr, answer) {
  const out = [];
  for (const w of Array.isArray(arr) ? arr : []) { if (!isWord(w) || out.length >= ROWS) break; out.push(w); if (w === answer) break; }
  return out;
}

const ICO = {
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17.3h.01"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M5 20v-7"/><path d="M12 20V5"/><path d="M19 20v-10"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z"/><path d="m12.5 9.5 5 5m0-5-5 5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};
const miniRow = (word, states, cls = '') => `<div class="kl-mini ${cls}" aria-hidden="true">${Array.from(word).map((ch, i) => `<i data-s="${states[i]}">${up(ch)}</i>`).join('')}</div>`;

registerToy('kelime', {
  name: 'Kelime', color: 'sand', cf: 'on-light', kind: 'Bulmaca', open: 'Kelime’yi aç',
  cats: ['kafa', 'oyun'],
  desc: 'Her gün yeni bir beş harfli kelime. Altı denemede bul, serini koru.',
  art: '<div class="art-kelime"><p><i class="p">M</i><i class="p">E</i><i class="a">R</i><i class="p">A</i><i class="p">K</i></p><p><i class="c">K</i><i class="c">A</i><i class="c">L</i><i class="e" data-l="E"></i><i class="e" data-l="M"></i></p></div>',
  stat: () => {
    const today = dayNum(), k = liveStreak(loadStats(K_STATS), today), st = store.get(K_DAILY, null);
    if (k > 0) return `Seri ${k} gün`;
    return st && st.day === today && st.done ? 'Yarın yeni kelime' : 'Günün kelimesi hazır';
  },
  css: `
.art-kelime { display: grid; gap: 5px; }
.art-kelime p { display: flex; gap: 5px; }
.art-kelime i {
  position: relative; display: grid; place-items: center; width: 27px; height: 27px; border-radius: 8px;
  font: 800 15px/1 var(--f-display); font-style: normal; color: var(--on-light); letter-spacing: -.02em;
  box-shadow: inset 0 -2.5px 0 rgba(22, 23, 26, .14);
  transition: transform .45s var(--spring), background-color .2s;
}
.art-kelime i.c { background: var(--green); }
.art-kelime i.p { background: var(--yellow); }
.art-kelime i.a { background: rgba(22, 23, 26, .16); color: rgba(22, 23, 26, .62); box-shadow: none; }
.art-kelime i.e { background: rgba(255, 253, 248, .55); box-shadow: inset 0 0 0 2px rgba(22, 23, 26, .3); }
.art-kelime i.e::after { content: ""; }
.art-kelime i.e:nth-child(4)::before { content: ""; position: absolute; left: 50%; top: 22%; bottom: 22%; width: 2px; margin-left: -1px; border-radius: 2px; background: var(--on-light); animation: blink 1.05s steps(1) infinite; }
.tile:hover .art-kelime p:first-child i { transform: translateY(-3px); }
.tile:hover .art-kelime p:first-child i:nth-child(2n) { transform: translateY(-5px); }
.tile:hover .art-kelime i.e { background: var(--green); box-shadow: inset 0 -2.5px 0 rgba(22, 23, 26, .14); }
.tile:hover .art-kelime i.e::after { content: attr(data-l); }
.tile:hover .art-kelime i.e::before { display: none; }

.kl-root.toy { flex: 1 0 auto; max-width: 620px; margin: -8px auto -14px; gap: var(--kl-gap, 12px); justify-content: space-between; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation; }
.kl-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; max-width: 520px; }
.kl-seg button { position: relative; padding: 0 13px; }
.kl-seg button::after { content: ""; position: absolute; inset: -4px -1.5px; } /* 44px tall hit area inside the pill */
.kl-tools { display: flex; gap: 6px; flex: none; }
.kl-ic {
  display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: var(--fg);
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); transition: background .2s, transform .3s var(--spring);
}
.kl-ic:hover { background: var(--panel-2); }
.kl-ic:active { transform: scale(.92); }
.kl-ic svg { width: 21px; height: 21px; }

.kl-mid { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--kl-gap, 12px); width: 100%; }
.kl-meta { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 22px; color: var(--mute); transition: opacity .2s; }
.kl-mid.msg-on .kl-meta { opacity: 0; pointer-events: none; } /* the message bubble sits on top of this line */
.kl-meta b { color: var(--fg); font-weight: 600; }
.kl-giveup { position: relative; height: 26px; padding: 0 10px; border-radius: 999px; color: var(--fg); box-shadow: inset 0 0 0 1.5px var(--line-2); font: inherit; letter-spacing: inherit; text-transform: inherit; }
.kl-giveup::after { content: ""; position: absolute; inset: -10px -6px; }
.kl-giveup[data-armed] { background: var(--fg); color: var(--bg); box-shadow: none; }
.kl-board { display: grid; gap: var(--tg, 6px); outline: none; }
.kl-row { position: relative; isolation: isolate; display: grid; grid-template-columns: repeat(5, var(--t, 60px)); gap: var(--tg, 6px); }
.kl-row::before {
  content: ""; position: absolute; z-index: -1; inset: calc(var(--tg, 6px) * -.8) calc(var(--tg, 6px) * -1.1); border-radius: calc(var(--t, 60px) * .3);
  background: color-mix(in srgb, var(--c) var(--kl-band, 52%), transparent); opacity: 0; transform: scaleX(.92); transition: opacity .3s, transform .45s var(--spring);
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .kl-root { --kl-band: 28%; } }
:root[data-theme="dark"] .kl-root { --kl-band: 28%; }
.kl-row.on::before { opacity: 1; transform: none; }
.kl-tile {
  position: relative; display: grid; place-items: center; width: var(--t, 60px); height: var(--t, 60px); border-radius: calc(var(--t, 60px) * .22);
  background: var(--panel); color: var(--fg); box-shadow: inset 0 0 0 1.5px var(--line-2);
  font: 750 calc(var(--t, 60px) * .5)/1 var(--f-display); letter-spacing: -.02em;
  transition: background-color 0s linear var(--cd, 0s), color 0s linear var(--cd, 0s), box-shadow 0s linear var(--cd, 0s);
}
.kl-tile span { display: block; margin-top: -.04em; }
.kl-tile[data-s="f"] { box-shadow: inset 0 0 0 2px var(--fg); }
.kl-tile[data-s="c"] { background: var(--green); color: var(--on-light); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .15); }
.kl-tile[data-s="p"] { background: var(--yellow); color: var(--on-light); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .12); }
.kl-tile[data-s="a"] { background: var(--panel-3); color: var(--mute); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .06); }
.kl-tile[data-s="c"]::after, .kl-tile[data-s="p"]::after {
  content: ""; position: absolute; top: 11%; right: 11%; width: 12%; height: 12%; border-radius: 50%;
  animation: klmark 0s linear var(--cd, 0s) both;
}
.kl-tile[data-s="c"]::after { background: rgba(22, 23, 26, .5); }
.kl-tile[data-s="p"]::after { box-shadow: inset 0 0 0 1.5px rgba(22, 23, 26, .5); }
@keyframes klmark { from { opacity: 0; } to { opacity: 1; } }
.kl-tile.pop { animation: klpop .13s var(--ease); }
@keyframes klpop { 50% { transform: scale(1.09); } }
.kl-tile.flip { animation: klflip .5s ease-in-out var(--d, 0s) both; }
@keyframes klflip { 0% { transform: perspective(520px) rotateX(0); } 50% { transform: perspective(520px) rotateX(-90deg); } 100% { transform: perspective(520px) rotateX(0); } }
.kl-row.shake { animation: klshake .42s ease; }
@keyframes klshake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(5px); } 30%, 50%, 70% { transform: translateX(-8px); } 40%, 60% { transform: translateX(8px); } }
.kl-tile.win { animation: klwin .7s var(--ease) var(--d, 0s) both; }
@keyframes klwin { 0%, 100% { transform: none; } 32% { transform: translateY(-38%) rotate(-3deg); } 58% { transform: translateY(5%) scale(1.06, .92); } 78% { transform: translateY(-9%); } }

.kl-msg {
  position: absolute; left: 50%; top: 0; z-index: 6; max-width: calc(100% - 12px); padding: 10px 16px; border-radius: 14px;
  background: var(--fg); color: var(--bg); font-size: 15px; font-weight: 650; line-height: 1.25; text-align: center;
  box-shadow: 0 18px 36px -18px var(--shade); opacity: 0; pointer-events: none; transform: translate(-50%, -10px);
  transition: opacity .2s, transform .4s var(--spring);
}
.kl-msg.show { opacity: 1; transform: translate(-50%, 0); }
.kl-msg small { display: block; margin-top: 3px; font: 500 12px/1.3 var(--f-mono); letter-spacing: .02em; opacity: .72; }

.kl-foot { width: 100%; max-width: 540px; }
/* Phone in landscape: board on the left at full height; mode switch + keyboard stacked and centred on the right. */
.kl-root.side { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: 1fr auto auto 1fr; grid-template-areas: "mid ." "mid head" "mid foot" "mid ."; align-items: center; column-gap: clamp(16px, 4vw, 40px); max-width: 980px; }
.kl-root.side .kl-head { grid-area: head; justify-self: center; max-width: 560px; }
.kl-root.side .kl-mid { grid-area: mid; align-self: stretch; }
.kl-root.side .kl-foot { grid-area: foot; justify-self: center; width: 100%; max-width: 560px; margin-inline: 0; }
@media (max-width: 560px) { .kl-foot { width: calc(100% + 2 * var(--gutter) - 8px); max-width: none; margin-inline: calc(4px - var(--gutter)); } }
/* Each key button fills its whole grid cell (the visible key is ::before), so taps in the gaps still land on the nearest key. */
.kl-kb { display: grid; margin-block: calc(var(--kg, 8px) / -2); touch-action: none; }
.kl-kr { display: grid; grid-template-columns: repeat(22, minmax(0, 1fr)); }
.kl-key {
  position: relative; isolation: isolate; grid-column: span 2; display: grid; place-items: center; min-width: 0;
  height: calc(var(--kh, 52px) + var(--kg, 8px)); color: var(--fg);
  font: 650 clamp(15px, 4.6vw, 20px)/1 var(--f-display); letter-spacing: -.01em;
  transition: color .25s, opacity .25s, transform .14s var(--ease);
}
.kl-key::before {
  content: ""; position: absolute; z-index: -1; inset: calc(var(--kg, 8px) / 2) 2.5px; border-radius: 10px;
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line), inset 0 -2px 0 var(--line);
  transition: background-color .25s, box-shadow .25s;
}
.kl-key:focus-visible { outline: none; }
.kl-key:focus-visible::before { outline: 2.5px solid var(--fg); outline-offset: 2px; }
.kl-kr:first-child .kl-key:first-child { grid-column: 2 / span 2; }
.kl-kr:first-child .kl-key:first-child::after, .kl-kr:first-child .kl-key:last-child::after { content: ""; position: absolute; top: 0; bottom: 0; width: 50%; }
.kl-kr:first-child .kl-key:first-child::after { right: 100%; }
.kl-kr:first-child .kl-key:last-child::after { left: 100%; }
.kl-key.wide { grid-column: span 3; font-size: clamp(12px, 3.5vw, 15px); font-weight: 650; letter-spacing: 0; }
.kl-key.enter { color: var(--bg); }
.kl-key.enter::before { background: var(--fg); box-shadow: none; }
.kl-key svg { width: 24px; height: 24px; }
.kl-key[data-s="c"], .kl-key[data-s="p"] { color: var(--on-light); }
.kl-key[data-s="c"]::before { background: var(--green); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .14); }
.kl-key[data-s="p"]::before { background: var(--yellow); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .1); }
.kl-key[data-s="a"] { color: var(--mute); opacity: .6; }
.kl-key[data-s="a"]::before { background: transparent; box-shadow: inset 0 0 0 1px var(--line); }
.kl-key.hit { transform: translateY(1px) scale(.93); }
@media (hover: hover) { .kl-key:not([data-s]):not(.enter):hover::before { background: var(--panel-2); } }

.kl-end { display: grid; align-content: center; justify-items: center; gap: 10px; min-height: calc(var(--kh, 52px) * 3 + var(--kg, 8px) * 2); padding: 4px 8px; text-align: center; animation: klup .5s var(--ease) both; }
@keyframes klup { from { opacity: 0; transform: translateY(14px); } }
.kl-end-top { display: flex; align-items: center; justify-content: center; gap: 14px; }
.kl-end-txt { display: grid; gap: 3px; text-align: left; }
.kl-end-txt b { font-size: 22px; font-weight: 750; line-height: 1; letter-spacing: -.03em; }
.kl-end-txt .mono { color: var(--mute); }
.kl-count { color: var(--mute); }
.kl-count b { color: var(--fg); font-weight: 600; font-variant-numeric: tabular-nums; }
.kl-end-act { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.kl-end-act .btn svg { width: 18px; height: 18px; }
.kl-mini { display: flex; gap: 4px; }
.kl-mini i {
  position: relative; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; font: 750 16px/1 var(--f-display); font-style: normal;
  background: var(--panel-3); color: var(--mute);
}
.kl-mini i[data-s="c"] { background: var(--green); color: var(--on-light); }
.kl-mini i[data-s="p"] { background: var(--yellow); color: var(--on-light); }
.kl-mini i[data-s="x"] { background: var(--ink-tile); color: var(--ink-tile-fg); }
.kl-mini i[data-s="n"] { background: var(--panel); color: var(--fg); box-shadow: inset 0 0 0 1.5px var(--line-2); }
.kl-ex .kl-mini i[data-s="c"]::after, .kl-ex .kl-mini i[data-s="p"]::after, .kl-legend i.c::after, .kl-legend i.p::after {
  content: ""; position: absolute; top: 11%; right: 11%; width: 13%; height: 13%; min-width: 3px; min-height: 3px; border-radius: 50%;
}
.kl-ex .kl-mini i[data-s="c"]::after, .kl-legend i.c::after { background: rgba(22, 23, 26, .5); }
.kl-ex .kl-mini i[data-s="p"]::after, .kl-legend i.p::after { box-shadow: inset 0 0 0 1.5px rgba(22, 23, 26, .5); }
.kl-root.tight .kl-end { gap: 8px; }
.kl-root.tight .kl-end-txt b { font-size: 19px; }
.kl-root.tight .kl-end .kl-mini i { width: 26px; height: 26px; font-size: 14px; border-radius: 7px; }
.kl-root.tight .kl-end-act .btn { height: 44px; padding: 0 16px; font-size: 15px; }
.kl-root.narrow .kl-end-top { gap: 10px; }
.kl-root.narrow .kl-end .kl-mini { gap: 3px; }
.kl-root.narrow .kl-end .kl-mini i { width: 22px; height: 22px; font-size: 12.5px; border-radius: 6px; }
.kl-root.narrow .kl-end-txt b { font-size: 18px; }
.kl-root.narrow .kl-end-txt .mono { font-size: 10.5px; letter-spacing: .05em; }

.kl-sheet-wrap { position: fixed; inset: 0; z-index: 70; display: grid; align-items: end; justify-items: center; background: rgba(10, 11, 13, .42); animation: fadein .25s; }
.kl-sheet {
  position: relative; width: min(100%, 460px); max-height: min(92vh, 720px); max-height: min(92dvh, 720px); overflow: auto; overscroll-behavior: contain;
  display: grid; gap: 16px; padding: 22px var(--gutter) calc(env(safe-area-inset-bottom, 0px) + 22px);
  border-radius: 26px 26px 0 0; background: var(--panel); color: var(--fg); box-shadow: 0 -20px 50px -30px var(--shade);
  animation: klsheet .45s var(--spring); user-select: text; -webkit-user-select: text;
}
@media (min-width: 561px) { .kl-sheet-wrap { align-items: center; } .kl-sheet { border-radius: 26px; padding-bottom: 24px; } }
@keyframes klsheet { from { transform: translateY(40px); opacity: 0; } }
.kl-sh-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.kl-sh-top h2 { font-size: 26px; font-weight: 750; letter-spacing: -.03em; line-height: 1.05; }
.kl-sh-top .mono { display: block; margin-top: 4px; color: var(--mute); }
.kl-sheet:focus { outline: none; }
.kl-sheet .kl-ic { background: var(--panel-2); box-shadow: none; }
.kl-nums { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.kl-nums div { display: grid; gap: 6px; padding: 12px 10px; border-radius: var(--r-md); background: var(--bg); }
.kl-nums b { font-size: clamp(20px, 6.2vw, 28px); font-weight: 750; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.kl-nums .mono { color: var(--mute); font-size: 10.5px; letter-spacing: .06em; }
.kl-sheet h3 { color: var(--mute); }
.kl-dist { display: grid; gap: 7px; }
.kl-dr { display: grid; grid-template-columns: 18px minmax(0, 1fr); align-items: center; gap: 8px; }
.kl-dr .mono { color: var(--mute); text-align: center; }
.kl-dt { position: relative; height: 24px; margin-right: 40px; }
.kl-dt i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: var(--mute); opacity: .55; transform-origin: left; animation: klbar .7s var(--ease) both; }
.kl-dt b { position: absolute; top: 50%; transform: translateY(-50%); font: 600 13px/1 var(--f-mono); font-variant-numeric: tabular-nums; }
.kl-dr.now .kl-dt i { background: var(--green); opacity: 1; }
@keyframes klbar { from { transform: scaleX(0); } }
.kl-sh-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid var(--line); }
.kl-sh-foot .kl-count b { display: block; margin-top: 3px; font: 700 26px/1 var(--f-display); letter-spacing: -.03em; }
.kl-sh-foot .btn svg { width: 18px; height: 18px; }
.kl-sheet .note { text-align: left; }
.kl-help p { color: var(--mute); }
.kl-help p strong { color: var(--fg); font-weight: 650; }
.kl-ex { display: grid; gap: 10px; padding: 14px; border-radius: var(--r-lg); background: var(--bg); }
.kl-ex .kl-mini i { width: 40px; height: 40px; font-size: 21px; border-radius: 10px; }
.kl-legend { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.kl-legend li { display: flex; align-items: center; gap: 10px; font-size: 15px; }
.kl-legend i { position: relative; width: 22px; height: 22px; border-radius: 6px; flex: none; }
.kl-legend .c { background: var(--green); } .kl-legend .p { background: var(--yellow); } .kl-legend .a { background: var(--panel-3); box-shadow: inset 0 0 0 1px var(--line-2); }
.kl-tips { margin: 0; padding-left: 20px; display: grid; gap: 8px; color: var(--mute); font-size: 15px; }
.kl-tips b { color: var(--fg); font-weight: 650; }
`,
  hint: 'Harfleri yaz · Enter dene · Backspace sil',
  mount(el) {
    if (!ANSWERS.length) { el.innerHTML = '<div class="toy"><p class="note">Kelime listesi yüklenemedi. Sayfayı yenileyip tekrar dene.</p></div>'; return {}; }
    const keyHTML = k => k === 'enter' ? '<button type="button" class="kl-key wide enter" data-k="enter">Enter</button>'
      : k === 'del' ? `<button type="button" class="kl-key wide" data-k="del" aria-label="Sil">${ICO.del}</button>`
      : `<button type="button" class="kl-key" data-k="${k}" aria-label="${up(k)}">${up(k)}</button>`;
    el.innerHTML = `
      <div class="toy kl-root">
        <div class="kl-head">
          <div class="seg kl-seg" role="group" aria-label="Oyun türü">
            <button type="button" data-mode="daily" aria-pressed="true">Günlük</button>
            <button type="button" data-mode="free" aria-pressed="false">Serbest</button>
          </div>
          <div class="kl-tools">
            <button type="button" class="kl-ic" data-act="help" aria-label="Nasıl oynanır">${ICO.help}</button>
            <button type="button" class="kl-ic" data-act="stats" aria-label="İstatistik">${ICO.stats}</button>
          </div>
        </div>
        <div class="kl-mid">
          <p class="mono kl-meta"><span class="kl-meta-t"></span><button type="button" class="kl-giveup" data-act="giveup" hidden>Pes et</button></p>
          <div class="kl-board" tabindex="-1" role="group" aria-label="Tahminler">${Array.from({ length: ROWS }, (_, r) => `<div class="kl-row" role="img" aria-label="${r + 1}. tahmin: boş">${'<div class="kl-tile" aria-hidden="true"><span></span></div>'.repeat(LEN)}</div>`).join('')}</div>
          <div class="kl-msg" aria-hidden="true"></div>
        </div>
        <div class="kl-foot">
          <div class="kl-kb" role="group" aria-label="Klavye">${KEY_ROWS.map(row => `<div class="kl-kr">${row.map(keyHTML).join('')}</div>`).join('')}</div>
          <div class="kl-end" hidden></div>
        </div>
        <div class="kl-sheet-wrap" hidden><div class="kl-sheet" role="dialog" aria-modal="true" aria-labelledby="kl-sh-h" tabindex="-1"></div></div>
      </div>`;
    const wrap = $('.kl-root', el), board = $('.kl-board', wrap), rowsEls = $$('.kl-row', board), kb = $('.kl-kb', wrap), endEl = $('.kl-end', wrap);
    const msgEl = $('.kl-msg', wrap), metaT = $('.kl-meta-t', wrap), giveBtn = $('.kl-giveup', wrap), sheetWrap = $('.kl-sheet-wrap', wrap), sheet = $('.kl-sheet', wrap);
    const head = $('.kl-head', wrap), mid = $('.kl-mid', wrap), foot = $('.kl-foot', wrap);
    const keyEls = $$('.kl-key', kb), keyBy = {};
    keyEls.forEach(k => { keyBy[k.dataset.k] = k; });

    let dead = false, mode = 'daily', game = null, cur = '', busy = false, retry = null, sheetKind = null, countT = 0, msgT = 0, armT = 0;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
    const cancel = id => { if (id) { clearTimeout(id); timers.delete(id); } };

    /* ----- game state ----- */
    function save() {
      if (!game) return;
      if (game.mode === 'daily') store.set(K_DAILY, { day: game.day, a: enc(game.answer), g: game.guesses, done: game.done, won: game.won });
      else store.set(K_FREE, { a: enc(game.answer), g: game.guesses, done: game.done, won: game.won, n: game.n, recent: game.recent });
    }
    function settle(g) { g.won = g.guesses.includes(g.answer); g.done = g.won || g.guesses.length >= ROWS || !!g.gaveUp; return g; }
    function newFree(prev) {
      const recent = (prev && Array.isArray(prev.recent) ? prev.recent : []).filter(i => Number.isInteger(i)).slice(-80);
      const avoid = new Set(recent); avoid.add(ANSWERS.indexOf(dailyAnswer(dayNum())));
      let i = 0, tries = 0;
      do { i = Math.floor(Math.random() * ANSWERS.length); } while (avoid.has(i) && ++tries < 60);
      recent.push(i);
      return { mode: 'free', answer: ANSWERS[i], guesses: [], done: false, won: false, n: ((prev && prev.n) || 0) + 1, recent };
    }
    function loadGame(m) {
      cur = ''; retry = null;
      if (m === 'daily') {
        const day = dayNum(), st = store.get(K_DAILY, null);
        let answer = dailyAnswer(day), guesses = [], gaveUp = false;
        if (st && st.day === day) { const a = dec(st.a); if (isWord(a)) answer = a; guesses = cleanGuesses(st.g, answer); gaveUp = !!st.done && !guesses.includes(answer) && guesses.length < ROWS; }
        game = settle({ mode: 'daily', day, answer, guesses, gaveUp });
        if (!st || st.day !== day) save(); // pin today's word for this device even if the list changes later today
      } else {
        const st = store.get(K_FREE, null), a = st ? dec(st.a) : '';
        if (st && isWord(a) && !st.done) game = settle({ mode: 'free', answer: a, guesses: cleanGuesses(st.g, a), n: st.n || 1, recent: Array.isArray(st.recent) ? st.recent : [] });
        else { game = newFree(st); save(); }
        if (game.done) { game = newFree(game); save(); }
      }
    }
    function record() {
      const s = loadStats(game.mode === 'daily' ? K_STATS : K_FSTATS), n = game.guesses.length;
      if (game.mode === 'daily') { if (s.lastDay === game.day) return; s.lastDay = game.day; }
      s.played++;
      if (game.won) {
        s.wins++; s.dist[n - 1]++;
        s.streak = game.mode === 'daily' ? (s.lastWin === game.day - 1 ? s.streak : 0) + 1 : s.streak + 1;
        if (game.mode === 'daily') s.lastWin = game.day;
        s.best = Math.max(s.best, s.streak);
      } else s.streak = 0;
      store.set(game.mode === 'daily' ? K_STATS : K_FSTATS, s);
    }

    /* ----- painting ----- */
    function setTile(tile, ch, s) {
      tile.firstChild.textContent = ch ? up(ch) : '';
      if (s) tile.dataset.s = s; else delete tile.dataset.s;
    }
    function rowLabel(r, word, st) { return `${r + 1}. tahmin: ${Array.from(word).map((ch, i) => `${up(ch)} ${STATE_TXT[st[i]]}`).join(', ')}`; }
    function paintBoard() {
      const g = game.guesses;
      rowsEls.forEach((row, r) => {
        const st = r < g.length ? score(g[r], game.answer) : null, word = st ? g[r] : (r === g.length && !game.done ? cur : '');
        row.classList.toggle('on', r === g.length && !game.done); row.classList.remove('shake');
        row.setAttribute('aria-label', st ? rowLabel(r, g[r], st) : `${r + 1}. tahmin: ${word ? up(word) : 'boş'}`);
        Array.from(row.children).forEach((tile, c) => {
          tile.className = 'kl-tile'; tile.style.removeProperty('--d'); tile.style.removeProperty('--cd');
          const ch = word[c] || ''; setTile(tile, ch, st ? st[c] : (ch ? 'f' : ''));
        });
      });
    }
    function keyStates() {
      const m = {}, rank = { a: 1, p: 2, c: 3 };
      game.guesses.forEach(g => score(g, game.answer).forEach((s, i) => { const ch = g[i]; if (!m[ch] || rank[s] > rank[m[ch]]) m[ch] = s; }));
      return m;
    }
    function paintKeys() {
      const m = keyStates();
      keyEls.forEach(k => {
        const id = k.dataset.k; if (id === 'enter' || id === 'del') return;
        const s = m[id]; if (s) k.dataset.s = s; else delete k.dataset.s;
        k.setAttribute('aria-label', s ? `${up(id)}, ${STATE_TXT[s]}` : up(id));
      });
    }
    function paintMeta() {
      $$('[data-mode]', head).forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
      metaT.innerHTML = game.mode === 'daily' ? `<b>#${game.day}</b> · ${dateLabel(game.day)}` : `<b>Serbest</b> · ${game.n}. kelime`;
      giveBtn.hidden = !(game.mode === 'free' && !game.done && game.guesses.length > 0);
      disarm();
    }
    function streakNow() { return liveStreak(loadStats(K_STATS), dayNum()); }
    // A daily board finished after Istanbul midnight belongs to yesterday: no 24 h countdown, offer today's word instead.
    const stale = () => game.mode === 'daily' && dayNum() !== game.day;
    function paintFoot() {
      const showEnd = game.done && !busy;
      kb.hidden = showEnd; endEl.hidden = !showEnd;
      if (!showEnd) endEl.innerHTML = ''; // a hidden countdown must not keep the 1 s ticker alive
      else {
        const n = game.guesses.length, daily = game.mode === 'daily', old = stale(), k = daily ? streakNow() : 0;
        const title = game.won ? WIN_WORDS[n - 1] : (game.gaveUp ? 'Pes ettin' : 'Bu sefer olmadı');
        const sub = daily ? `#${game.day} · ${game.won ? n : 'X'}/6${k > 0 ? ` · Seri ${k} gün` : ''}` : `Serbest · ${game.won ? n : 'X'}/6`;
        endEl.innerHTML = `
          <div class="kl-end-top">${miniRow(game.answer, Array(LEN).fill(game.won ? 'c' : 'x'))}<div class="kl-end-txt"><b>${title}</b><span class="mono">${sub}</span></div></div>
          ${daily ? (old ? '<p class="mono kl-count">Yeni günün kelimesi hazır</p>' : `<p class="mono kl-count">Yeni kelimeye <b data-count>${fmtCount()}</b></p>`) : ''}
          <div class="kl-end-act">${daily
            ? `<button type="button" class="btn primary" data-act="share">${ICO.share}Paylaş</button>${old ? '<button type="button" class="btn" data-act="today">Bugünün kelimesi</button>' : '<button type="button" class="btn" data-mode="free">Serbest oyna</button>'}`
            : `<button type="button" class="btn primary" data-act="new">Yeni kelime <kbd>Enter</kbd></button><button type="button" class="btn" data-act="share">${ICO.share}Paylaş</button>`}</div>`;
      }
      syncCount();
    }
    function hideMsg() { cancel(msgT); msgT = 0; msgEl.classList.remove('show'); mid.classList.remove('msg-on'); }
    function paintAll() { hideMsg(); paintMeta(); paintBoard(); paintKeys(); paintFoot(); } // a new board never inherits the old bubble

    /* ----- feedback ----- */
    function msg(main, sub, ms = 1800) {
      msgEl.innerHTML = ''; msgEl.append(main);
      if (sub) { const s = document.createElement('small'); s.textContent = sub; msgEl.append(s); }
      msgEl.classList.add('show'); mid.classList.add('msg-on');
      cancel(msgT); msgT = later(hideMsg, ms);
    }
    function shake(r) {
      const row = rowsEls[r]; if (!row) return;
      row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
      later(() => row.classList.remove('shake'), 450);
      vibrate(25); Sound.blip(170, 0.08, 0.07, 'triangle');
    }
    function flash(k) { const b = keyBy[k]; if (!b) return; b.classList.add('hit'); later(() => b.classList.remove('hit'), 110); }

    /* ----- input ----- */
    function canType() { return game && !game.done && !busy && !sheetKind; }
    function typeLetter(ch) {
      if (!canType() || cur.length >= LEN) return;
      cur += ch; retry = null;
      const r = game.guesses.length, tile = rowsEls[r].children[cur.length - 1];
      setTile(tile, ch, 'f');
      tile.classList.remove('pop'); void tile.offsetWidth; tile.classList.add('pop');
      rowsEls[r].setAttribute('aria-label', `${r + 1}. tahmin: ${up(cur)}`);
      Sound.blip(1050, 0.018, 0.03, 'triangle');
    }
    function erase() {
      if (!canType() || !cur) return;
      cur = cur.slice(0, -1); retry = null;
      const r = game.guesses.length; setTile(rowsEls[r].children[cur.length], '', '');
      rowsEls[r].setAttribute('aria-label', `${r + 1}. tahmin: ${cur ? up(cur) : 'boş'}`);
      Sound.blip(620, 0.018, 0.025, 'triangle');
    }
    // A daily board left open past Istanbul midnight with no guess yet quietly moves to the new day's word.
    function freshDaily() {
      if (!game || game.mode !== 'daily' || game.guesses.length || game.done || busy || sheetKind || !stale()) return false;
      const keep = cur; loadGame('daily'); if (!game.done) cur = keep; paintAll();
      return true;
    }
    function submit() {
      if (!canType()) return;
      if (freshDaily() && !canType()) return;
      const r = game.guesses.length;
      if (cur.length < LEN) { shake(r); msg('Beş harf gerekli'); say('Beş harf gerekli.'); return; }
      const w = cur, now = Date.now();
      if (!allowedSet().has(w)) {
        const dt = retry && retry.word === w ? now - retry.t : Infinity;
        if (dt < 350) return; // a double tap on Enter is not a deliberate “try it anyway”
        if (dt > 4000) {
          retry = { word: w, t: now }; shake(r);
          msg('Listede yok', 'Yine de denemek için tekrar Enter', 4000);
          say('Listede yok. Yine de denemek için tekrar Enter.');
          return;
        }
      }
      retry = null; commit(w);
    }
    function commit(w) {
      const r = game.guesses.length, st = score(w, game.answer);
      game.guesses.push(w); cur = '';
      settle(game);
      if (game.done) record();
      save();
      busy = true; giveBtn.hidden = true;
      const anim = motionOK(), step = anim ? 250 : 0, flip = anim ? 500 : 0, row = rowsEls[r];
      row.classList.remove('on');
      Array.from(row.children).forEach((tile, c) => {
        tile.style.setProperty('--d', `${c * step}ms`); tile.style.setProperty('--cd', `${c * step + flip / 2}ms`);
        tile.classList.remove('pop', 'flip'); setTile(tile, w[c], st[c]);
        if (anim) { void tile.offsetWidth; tile.classList.add('flip'); }
      });
      const ctx = Sound.ensure();
      if (ctx) st.forEach((s, c) => Sound.pluck(s === 'c' ? 784 : s === 'p' ? 587.3 : 293.7, ctx.currentTime + (c * step + flip / 2) / 1000, s === 'a' ? 0.06 : 0.12));
      if (anim) vibrate([0, flip / 2, 8, step - 8, 8, step - 8, 8, step - 8, 8, step - 8, 8]); else vibrate(10);
      later(() => afterReveal(r, w, st), anim ? (LEN - 1) * step + flip + 60 : 0);
    }
    function afterReveal(r, w, st) {
      busy = false; paintKeys();
      rowsEls[r].setAttribute('aria-label', rowLabel(r, w, st));
      const next = rowsEls[r + 1];
      if (next && !game.done) next.classList.add('on');
      say(rowLabel(r, w, st));
      if (!game.done) { paintMeta(); return; }
      if (game.won) {
        const anim = motionOK();
        Array.from(rowsEls[r].children).forEach((tile, c) => { tile.classList.remove('flip'); tile.style.setProperty('--d', `${c * 90}ms`); if (anim) { void tile.offsetWidth; tile.classList.add('win'); } });
        const ctx = Sound.ensure();
        if (ctx) [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => Sound.pluck(f, ctx.currentTime + 0.05 + i * 0.09, 0.14));
        vibrate([18, 50, 18, 50, 40]);
        msg(WIN_WORDS[game.guesses.length - 1]);
        say(`Bildin! Kelime ${up(game.answer)}, ${game.guesses.length}. denemede.`);
      } else {
        const ctx = Sound.ensure();
        if (ctx) [392, 329.6, 261.6].forEach((f, i) => Sound.pluck(f, ctx.currentTime + i * 0.16, 0.1));
        vibrate(40);
        msg(`Kelime: ${up(game.answer)}`, null, 3200);
        say(`Bilemedin. Kelime ${up(game.answer)}.`);
      }
      paintMeta();
      later(() => {
        paintFoot();
        if (game.mode === 'daily') later(() => { if (!sheetKind && game.done) openSheet('stats'); }, 900);
      }, motionOK() ? 760 : 0);
    }
    function press(k) {
      if (k === 'enter') { if (game && game.done && !busy && game.mode === 'free' && !sheetKind) startNewFree(); else submit(); }
      else if (k === 'del') erase();
      else typeLetter(k);
    }
    function startNewFree() {
      if (busy) return;
      game = newFree(game); save(); cur = ''; retry = null; paintAll(); focusBoard();
    }
    function disarm() { cancel(armT); armT = 0; delete giveBtn.dataset.armed; giveBtn.textContent = 'Pes et'; }
    function giveUp() {
      if (!game || game.mode !== 'free' || game.done || busy) return;
      if (giveBtn.dataset.armed !== '1') { giveBtn.dataset.armed = '1'; giveBtn.textContent = 'Emin misin?'; cancel(armT); armT = later(disarm, 3000); return; }
      disarm(); cur = ''; game.gaveUp = true; settle(game); record(); save();
      paintAll(); focusBoard();
      msg(`Kelime: ${up(game.answer)}`, null, 3000); say(`Pes ettin. Kelime ${up(game.answer)}.`);
    }

    /* ----- share, countdown, sheets ----- */
    function shareText() {
      const rows = game.guesses.map(g => score(g, game.answer).map(s => (s === 'c' ? '🟩' : s === 'p' ? '🟨' : '⬜')).join('')).join('\n');
      const tag = game.mode === 'daily' ? `#${game.day}` : '· Serbest';
      return `Sıkıldım · Kelime ${tag} ${game.won ? game.guesses.length : 'X'}/6\n\n${rows}`;
    }
    function share() { if (game && game.done) shareResult({ title: 'Sıkıldım · Kelime', text: shareText(), url: siteUrl() + '#kelime' }); }
    function toToday(note) {
      closeSheet(); loadGame('daily'); paintAll(); focusBoard();
      if (note) { msg('Yeni kelime hazır'); say('Yeni kelime hazır.'); }
    }
    function tickCount() {
      const nodes = $$('[data-count]', wrap);
      if (!nodes.length) { clearInterval(countT); countT = 0; return; }
      // The countdown ran out while the result was on screen: bring in the new word.
      if (game.mode === 'daily' && game.done && !busy && stale()) { toToday(true); return; }
      const t = fmtCount(); nodes.forEach(n => { n.textContent = t; });
    }
    function syncCount() {
      const any = !!wrap.querySelector('[data-count]');
      if (any && !countT) countT = setInterval(() => { if (!dead) tickCount(); }, 1000);
      else if (!any && countT) { clearInterval(countT); countT = 0; }
    }
    function statsHTML() {
      const daily = game.mode === 'daily', s = loadStats(daily ? K_STATS : K_FSTATS);
      const streak = daily ? liveStreak(s, dayNum()) : s.streak, pct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
      const max = Math.max(0, ...s.dist), now = game.done && game.won ? game.guesses.length - 1 : -1;
      const bars = s.dist.map((v, i) => {
        const w = max ? (v / max) * 100 : 0;
        return `<div class="kl-dr${i === now ? ' now' : ''}"><span class="mono" aria-hidden="true">${i + 1}</span><div class="kl-dt" role="img" aria-label="${i + 1}. denemede ${v} kez">${v ? `<i style="width:${w.toFixed(2)}%;animation-delay:${i * 50}ms"></i>` : ''}<b style="left:calc(${w.toFixed(2)}% + 7px)">${v}</b></div></div>`;
      }).join('');
      let footHTML;
      if (daily && game.done && stale()) footHTML = `<p class="note">Yeni günün kelimesi hazır.</p><button type="button" class="btn primary" data-act="share">${ICO.share}Paylaş</button>`;
      else if (daily && game.done) footHTML = `<p class="mono kl-count">Yeni kelimeye<b data-count>${fmtCount()}</b></p><button type="button" class="btn primary" data-act="share">${ICO.share}Paylaş</button>`;
      else if (daily) footHTML = '<p class="note">Bugünkü kelimeyi bitirince sonucunu buradan paylaşabilirsin.</p>';
      else footHTML = `<p class="note">Serbest oyunlar günlük seriden ayrı sayılır.</p>${game.done ? `<button type="button" class="btn primary" data-act="share">${ICO.share}Paylaş</button>` : ''}`;
      return `
        <div class="kl-sh-top"><div><h2 id="kl-sh-h">İstatistik</h2><span class="mono">${daily ? 'Günün kelimesi' : 'Serbest mod'}</span></div><button type="button" class="kl-ic" data-act="close" aria-label="Kapat">${ICO.close}</button></div>
        <div class="kl-nums">
          <div><b>${fmt(s.played)}</b><span class="mono">Oyun</span></div>
          <div><b>%${pct}</b><span class="mono">Kazanma</span></div>
          <div><b>${fmt(streak)}</b><span class="mono">Seri</span></div>
          <div><b>${fmt(s.best)}</b><span class="mono">En iyi</span></div>
        </div>
        <h3 class="mono">Tahmin dağılımı</h3>
        <div class="kl-dist">${bars}</div>
        <div class="kl-sh-foot">${footHTML}</div>`;
    }
    function helpHTML(first) {
      return `
        <div class="kl-sh-top"><div><h2 id="kl-sh-h">Nasıl oynanır</h2><span class="mono">Altı deneme · beş harf</span></div><button type="button" class="kl-ic" data-act="close" aria-label="Kapat">${ICO.close}</button></div>
        <div class="kl-help"><p><strong>Beş harfli kelimeyi altı denemede bul.</strong> Her denemeden sonra harflerin rengi sana ipucu verir.</p></div>
        <div class="kl-ex">
          <span class="mono" style="color:var(--mute)">Kelime KALEM ise</span>
          ${miniRow('merak', score('merak', 'kalem'))}
          ${miniRow('kilim', score('kilim', 'kalem'))}
        </div>
        <ul class="kl-legend">
          <li><i class="c" aria-hidden="true"></i>Yeşil: harf doğru yerde.</li>
          <li><i class="p" aria-hidden="true"></i>Sarı: harf kelimede var ama başka yerde.</li>
          <li><i class="a" aria-hidden="true"></i>Gri: harf kelimede yok.</li>
        </ul>
        <ul class="kl-tips">
          <li><b>Günlük</b> kelime herkes için aynı, Türkiye saatiyle gece yarısı yenilenir.</li>
          <li><b>Serbest</b> modda istediğin kadar kelime çöz.</li>
          <li>Listede olmayan bir kelimeyi yine de denemek için <b>Enter’a iki kez</b> bas.</li>
          <li><b>I</b> ile <b>İ</b> ayrı harfler; klavyede ikisi de var.</li>
        </ul>
        <button type="button" class="btn primary" data-act="close">${first ? 'Başla' : 'Tamam'}</button>`;
    }
    function openSheet(kind) {
      if (dead) return;
      const first = kind === 'help' && !store.get(K_HELP, false);
      if (kind === 'help') store.set(K_HELP, true); // seen once is enough, however it gets closed
      sheetKind = kind;
      sheet.innerHTML = kind === 'stats' ? statsHTML() : helpHTML(first);
      sheetWrap.hidden = false; head.inert = mid.inert = foot.inert = true;
      sheet.scrollTop = 0; sheet.focus({ preventScroll: true });
      syncCount();
    }
    function closeSheet() {
      if (!sheetKind) return;
      sheetKind = null; sheetWrap.hidden = true; sheet.innerHTML = ''; head.inert = mid.inert = foot.inert = false;
      syncCount(); focusBoard(); // typing continues right away; Enter must not re-trigger the opener
    }
    const focusBoard = () => { if (!dead && !sheetKind) board.focus({ preventScroll: true }); };
    function setMode(m) {
      if (busy || (m !== 'daily' && m !== 'free')) return;
      if (sheetKind) closeSheet();
      if (m === mode && game && game.mode === m) { focusBoard(); return; }
      mode = m; store.set(K_MODE, m); loadGame(m); paintAll(); focusBoard();
    }

    /* ----- layout: fit board + keyboard into the stage without scrolling ----- */
    function layout() {
      if (dead) return;
      const cs = getComputedStyle(el), ws = getComputedStyle(wrap);
      const H = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(ws.marginTop) - parseFloat(ws.marginBottom);
      const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const side = H < 520 && W >= 500 && W > H * 1.3; // phone in landscape: board left at full height, controls right
      const tight = H < 600;
      const kh = Math.round(clamp(side ? (H - 60) / 4.2 : H * 0.068, 42, 58)), kg = tight ? 6 : 8, gap = tight ? 8 : 12;
      const kbH = kh * 3 + kg * 2, headH = 44, metaH = 22;
      const boardH = side ? H - metaH - gap - 4 : H - headH - kbH - metaH - gap * 3 - 6;
      const boardW = side ? W * 0.42 : Math.min(W - 20, 420);
      let t = Math.min((boardW - 24) / 5, (boardH - 25) / 6);
      const tg = Math.round(clamp(t * 0.1, 4, 7));
      t = Math.floor(clamp(Math.min((boardW - 4 * tg) / 5, (boardH - 5 * tg) / 6), side ? 24 : 30, 72));
      wrap.classList.toggle('tight', tight); wrap.classList.toggle('narrow', W < 340); wrap.classList.toggle('side', side);
      wrap.style.setProperty('--t', t + 'px'); wrap.style.setProperty('--tg', tg + 'px');
      wrap.style.setProperty('--kh', kh + 'px'); wrap.style.setProperty('--kg', kg + 'px'); wrap.style.setProperty('--kl-gap', gap + 'px');
    }
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => layout()); ro.observe(el); }
    layout();

    /* ----- events ----- */
    /* Keys fire per pointer, so fast two-thumb typing never loses a letter (browsers drop the click of a tap that
       overlaps another touch). A key fires on release, or as soon as the next finger lands, which keeps letters in the
       order they were pressed. The click that follows is swallowed; a click with no pointer press before it
       (Space on a focused key, assistive tech) still types. */
    const keyDown = new Map(), viaPtr = new Map();
    const canPress = () => !dead && !kb.hidden && !sheetKind;
    const fire = key => {
      if (!canPress()) return;
      const q = viaPtr.get(key) || []; q.push(performance.now()); viaPtr.set(key, q);
      press(key.dataset.k);
    };
    kb.addEventListener('pointerdown', e => {
      const k = e.target.closest('[data-k]'); if (!k || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      const now = performance.now();
      keyDown.forEach((d, id) => {
        if (now - d.t > 3000) { d.k.classList.remove('hit'); keyDown.delete(id); } // a release we never saw
        else if (!d.fired) { d.fired = true; fire(d.k); } // rolling input: commit the earlier key now
      });
      k.classList.add('hit'); keyDown.set(e.pointerId, { k, t: now, fired: false });
    });
    const release = (e, commit) => {
      const d = keyDown.get(e.pointerId); if (!d) return;
      d.k.classList.remove('hit'); keyDown.delete(e.pointerId);
      if (!commit || d.fired) return;
      const r = d.k.getBoundingClientRect(), slop = 10;
      let key = d.k;
      if (e.clientX < r.left - slop || e.clientX > r.right + slop || e.clientY < r.top - slop || e.clientY > r.bottom + slop) {
        const under = document.elementFromPoint(e.clientX, e.clientY), u = under && under.closest ? under.closest('[data-k]') : null;
        key = u && kb.contains(u) ? u : null; // slid onto another key: that one; slid off the keyboard: nothing
      }
      if (key) fire(key);
    };
    kb.addEventListener('pointerup', e => release(e, true));
    kb.addEventListener('pointercancel', e => release(e, false));
    kb.addEventListener('pointerleave', e => release(e, false));
    kb.addEventListener('contextmenu', e => e.preventDefault());
    head.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.target.closest('button')) e.preventDefault(); });
    wrap.addEventListener('click', e => {
      const k = e.target.closest('[data-k]');
      if (k && kb.contains(k)) {
        const q = viaPtr.get(k), now = performance.now();
        while (q && q.length && now - q[0] > 1500) q.shift();
        if (q && q.length) { q.shift(); return; } // already typed on pointerup
        press(k.dataset.k); return;
      }
      const m = e.target.closest('[data-mode]'); if (m) { setMode(m.dataset.mode); return; }
      const a = e.target.closest('[data-act]');
      if (!a) { if (e.target === sheetWrap) closeSheet(); return; }
      switch (a.dataset.act) {
        case 'help': openSheet('help'); break;
        case 'stats': openSheet('stats'); break;
        case 'close': closeSheet(); break;
        case 'share': share(); break;
        case 'new': startNewFree(); break;
        case 'today': toToday(false); break;
        case 'giveup': giveUp(); break;
        default: break;
      }
    });
    const onVis = () => { if (!dead && document.visibilityState === 'visible') freshDaily(); };
    document.addEventListener('visibilitychange', onVis);

    /* ----- boot ----- */
    const daily0 = store.get(K_DAILY, null), todayDone = daily0 && daily0.day === dayNum() && daily0.done;
    mode = todayDone && store.get(K_MODE, 'daily') === 'free' ? 'free' : 'daily';
    loadGame(mode); paintAll();
    setTimeout(focusBoard, 30);
    if (!store.get(K_HELP, false)) later(() => openSheet('help'), 380);

    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key;
        if (sheetKind) {
          if (k === 'Escape') { e.preventDefault(); closeSheet(); return; } // close the sheet, stay in the toy
          if (k === 'Tab') { // keep focus inside the dialog
            const f = $$('button, a[href]', sheet).filter(b => !b.disabled && b.getClientRects().length), a = document.activeElement;
            if (!f.length) { e.preventDefault(); return; }
            if (e.shiftKey && (a === f[0] || !f.includes(a))) { e.preventDefault(); f[f.length - 1].focus(); }
            else if (!e.shiftKey && (a === f[f.length - 1] || !f.includes(a))) { e.preventDefault(); f[0].focus(); }
            return;
          }
          const onBtn = e.target && e.target.closest && e.target.closest('button');
          if (k === 'Enter' && !onBtn) { e.preventDefault(); closeSheet(); }
          return;
        }
        if (k === 'Enter') {
          const onBtn = e.target && e.target.closest && e.target.closest('button, a');
          if (onBtn && !kb.contains(onBtn)) return;
          e.preventDefault();
          if (!e.repeat) { flash('enter'); press('enter'); }
          return;
        }
        if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); flash('del'); press('del'); return; }
        if (k && k.length === 1) {
          const ch = k.toLocaleLowerCase('tr').replace('â', 'a').replace('î', 'i').replace('û', 'u');
          if (ALPHA.has(ch) && keyBy[ch]) { e.preventDefault(); flash(ch); press(ch); }
        }
      },
      destroy() {
        dead = true;
        timers.forEach(clearTimeout); timers.clear();
        clearInterval(countT); countT = 0;
        if (ro) ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        keyDown.clear(); viaPtr.clear();
      },
    };
  },
});
})();
