/* Ritim — 16 adımlık davul makinesi: üç ses kiti, dört desen slotu, kanal susturma ve zar at */
(() => {
'use strict';
const N = 16;
const TRACKS = [
  { id: 'kick', name: 'Bas davul', key: 'a' },
  { id: 'snare', name: 'Trampet', key: 's' },
  { id: 'clap', name: 'Alkış', key: 'd' },
  { id: 'hat', name: 'Hi-hat', key: 'f' },
  { id: 'open', name: 'Açık hat', key: 'g' },
  { id: 'tom', name: 'Tom', key: 'h' },
];
const IDS = TRACKS.map(t => t.id);
const KITS = { klasik: 'Klasik', akustik: 'Akustik', lofi: 'Lo-fi' };
const KIT_IDS = Object.keys(KITS);
const LETTERS = ['A', 'B', 'C', 'D'];
const BPM_MIN = 60, BPM_MAX = 180;
const V1_PRESETS = ['boombap', 'trap', 'house', 'rock', 'kirik'];   // V1 knows only these keys
const PRESETS = {
  boombap: { name: 'Boom bap', bpm: 90, swing: 30, p: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '..............x.' } },
  trap: { name: 'Trap', bpm: 140, swing: 0, p: { kick: 'x.....x...x..x..', clap: '........x.......', hat: 'x.xxx.x.x.xxx.xx', tom: '...........x....' } },
  house: { name: 'House', bpm: 124, swing: 10, p: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x...x...x...x...', open: '..x...x...x...x.' } },
  rock: { name: 'Rock', bpm: 112, swing: 0, p: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', tom: '.............xxx' } },
  kirik: { name: 'Kırık', bpm: 136, swing: 12, p: { kick: 'x.x.......xx....', snare: '....x..x.x..x..x', hat: 'x.x.x.x.x.x.x.x.' } },
  gece: { name: 'Gece', bpm: 78, swing: 42, p: { kick: 'x.....x...x.....', snare: '....x.......x..x', hat: 'x.x.x.xxx.x.x.x.', open: '..........x.....' } },
};

/* ---------- storage: 'ritim2' holds four slots; slot A mirrors V1's 'ritim' shape ---------- */
const blankP = () => Object.fromEntries(IDS.map(id => [id, new Array(N).fill(false)]));
const decRow = s => Array.from({ length: N }, (_, i) => (typeof s === 'string' ? s[i] === 'x' : Array.isArray(s) ? !!s[i] : false));
const encRow = r => r.map(b => (b ? 'x' : '.')).join('');
const isEmpty = s => IDS.every(id => !s.p[id].some(Boolean));
function mkSlot(o) {
  o = o && typeof o === 'object' ? o : {};
  return {
    bpm: clamp(Math.round(+o.bpm) || 100, BPM_MIN, BPM_MAX),
    swing: clamp(o.swing != null && isFinite(+o.swing) ? Math.round(+o.swing) : 0, 0, 100),
    kit: KITS[o.kit] ? o.kit : 'klasik',
    preset: PRESETS[o.preset] ? o.preset : null,
    name: typeof o.name === 'string' && o.name ? o.name.slice(0, 24) : null,
    p: Object.fromEntries(IDS.map(id => [id, decRow(o.p && o.p[id])])),
  };
}
const presetSlot = (k, kit) => mkSlot({ bpm: PRESETS[k].bpm, swing: PRESETS[k].swing, kit, preset: k, p: PRESETS[k].p });
const cloneSlot = s => ({ ...s, p: Object.fromEntries(IDS.map(id => [id, s.p[id].slice()])) });
const v1Shape = s => ({ bpm: s.bpm, swing: s.swing, preset: V1_PRESETS.includes(s.preset) ? s.preset : null, p: Object.fromEntries(IDS.map(id => [id, s.p[id].map(Number)])) });
function load() {
  const r2 = store.get('ritim2', null);
  if (r2 && typeof r2 === 'object' && Array.isArray(r2.slots) && r2.slots.length === 4) {
    return {
      fresh: false, cur: clamp(r2.cur | 0, 0, 3), slots: r2.slots.map(mkSlot),
      mute: new Set((Array.isArray(r2.mute) ? r2.mute : []).filter(id => IDS.includes(id))),
    };
  }
  const v1 = store.get('ritim', null);
  const a = v1 && typeof v1 === 'object' && v1.p
    ? mkSlot({ bpm: v1.bpm || 90, swing: v1.swing != null ? v1.swing : 30, kit: 'klasik', preset: v1.preset, p: v1.p })
    : presetSlot('boombap', 'klasik');
  return { fresh: true, cur: 0, mute: new Set(), slots: [a, presetSlot('rock', 'akustik'), presetSlot('gece', 'lofi'), mkSlot({ bpm: 120, swing: 0, kit: 'klasik' })] };
}

/* ---------- "Zar at": a style per kit, then kick → backbeat → ghosts → hats → maybe a fill ---------- */
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const STYLES = { klasik: ['house', 'kirik', 'trap', 'elektro'], akustik: ['rock', 'funk', 'yarim'], lofi: ['boombap', 'tembel', 'yarim'] };
const STYLE_NAME = { house: 'House', kirik: 'Kırık', trap: 'Trap', elektro: 'Elektro', rock: 'Rock', funk: 'Funk', yarim: 'Yarım tempo', boombap: 'Boom bap', tembel: 'Tembel' };
function rollBeat(kit) {
  const style = pick(STYLES[kit] || STYLES.klasik);
  const p = blankP(), on = (tr, i, v = true) => { p[tr][i] = v; }, count = tr => p[tr].filter(Boolean).length;
  const half = style === 'yarim' || style === 'trap';
  const four = style === 'house' || (style === 'elektro' && chance(0.5));
  // kick: always on the one, likely on strong positions, never crowded
  if (four) {
    for (let i = 0; i < N; i += 4) on('kick', i);
    if (chance(0.35)) on('kick', pick([3, 7, 11, 14, 15]));
  } else {
    const w = half
      ? { 0: 1, 3: 0.25, 6: 0.35, 7: 0.2, 10: 0.5, 11: 0.35, 13: 0.2, 14: 0.3 }
      : { 0: 1, 2: 0.25, 3: 0.12, 6: 0.2, 7: 0.4, 8: 0.65, 9: 0.2, 10: 0.55, 11: 0.15, 13: 0.12, 14: 0.3, 15: 0.1 };
    if (style === 'funk') Object.assign(w, { 3: 0.35, 6: 0.35, 10: 0.45, 13: 0.3, 15: 0.2 });
    if (style === 'rock') Object.assign(w, { 2: 0.3, 7: 0.2, 8: 0.85, 10: 0.5 });
    if (style === 'boombap' || style === 'tembel') Object.assign(w, { 7: 0.45, 9: 0.25, 10: 0.5 });
    if (style === 'trap') Object.assign(w, { 6: 0.5, 11: 0.4, 14: 0.35, 15: 0.15 });
    Object.keys(w).forEach(i => { if (chance(w[i])) on('kick', +i); });
    if (count('kick') < 2 || !p.kick.slice(8).some(Boolean)) on('kick', half ? pick([10, 11]) : pick([8, 10]));
    while (count('kick') > 6) on('kick', pick(p.kick.map((b, i) => (b && i ? i : -1)).filter(i => i > 0)), false);
  }
  // backbeat: 2 and 4 (or 3 in half time)
  const main = kit === 'akustik' ? 'snare'
    : kit === 'lofi' ? (chance(0.75) ? 'snare' : 'clap')
    : style === 'kirik' ? 'snare' : style === 'elektro' ? pick(['snare', 'clap']) : 'clap';
  const backs = half ? [8] : [4, 12];
  backs.forEach(i => { on(main, i); if (!four) on('kick', i, false); });
  if (main === 'snare' && chance(kit === 'klasik' ? 0.4 : 0.2)) on('clap', backs[backs.length - 1]);
  // ghost notes
  const ghost = { funk: 0.6, boombap: 0.4, tembel: 0.3, kirik: 0.55, rock: 0.15, yarim: 0.3, trap: 0.35, house: 0.1, elektro: 0.25 }[style];
  if (chance(ghost)) {
    const gi = style === 'house' || style === 'elektro' ? main : 'snare';
    shuffle(half ? [3, 6, 11, 14, 15] : [2, 7, 9, 10, 14, 15]).slice(0, chance(0.45) ? 2 : 1).forEach(i => on(gi, i));
  }
  // hats: a steady bed with a variation or two
  const hat = p.hat, open = p.open;
  const eighths = () => { for (let i = 0; i < N; i += 2) hat[i] = true; };
  const sixteenths = keep => { for (let i = 0; i < N; i++) hat[i] = i % 2 === 0 || chance(keep); };
  switch (style) {
    case 'house': sixteenths(chance(0.5) ? 0.55 : 0); if (chance(0.75)) [2, 6, 10, 14].forEach(i => { open[i] = true; }); else if (chance(0.5)) open[14] = true; break;
    case 'elektro': sixteenths(0.8); if (chance(0.4)) open[pick([6, 14])] = true; break;
    case 'kirik': eighths(); [7, 11, 15].forEach(i => { if (chance(0.3)) hat[i] = true; }); if (chance(0.45)) open[pick([10, 14])] = true; break;
    case 'trap': eighths(); for (let r = chance(0.5) ? 2 : 1; r > 0; r--) { const s = pick([3, 5, 9, 11, 13]); for (let i = s; i < Math.min(N, s + 3); i++) hat[i] = true; } if (chance(0.15)) open[14] = true; break;
    case 'rock': if (chance(0.8)) eighths(); else sixteenths(0.6); if (chance(0.3)) open[pick([6, 14])] = true; break;
    case 'funk': sixteenths(0.72); if (chance(0.55)) open[pick([6, 10, 14])] = true; break;
    case 'yarim': if (chance(0.5)) eighths(); else sixteenths(0.6); if (chance(0.3)) open[14] = true; break;
    case 'boombap': eighths(); if (chance(0.35)) hat[pick([7, 13, 15])] = true; if (chance(0.4)) open[pick([6, 14])] = true; break;
    default: eighths(); for (let k = chance(0.5) ? 2 : 1; k > 0; k--) hat[pick([2, 6, 10, 14])] = false; if (chance(0.35)) hat[pick([7, 15])] = true; if (chance(0.25)) open[pick([10, 14])] = true;
  }
  if (kit === 'lofi' && chance(0.5)) open.fill(false);
  // a fill at the end of the bar now and then
  if (chance((kit === 'akustik' ? 0.42 : 0.3) + (style === 'rock' ? 0.12 : 0))) {
    const f = pick(kit === 'akustik' ? [[13, 14, 15], [14, 15], [12, 13, 14, 15], [11, 13, 14, 15]] : [[13, 14, 15], [14, 15], [11, 14], [10, 13, 15]]);
    f.forEach(i => { p.tom[i] = true; p.kick[i] = false; if (i !== 12) { p.snare[i] = false; p.clap[i] = false; } });
    for (let i = f[0]; i < N; i++) { open[i] = false; if (kit === 'akustik') hat[i] = false; }
  } else if (style === 'trap' && chance(0.4)) p.tom[pick([11, 14])] = true;
  if (count('kick') < 2) on('kick', pick([6, 7, 8, 10].filter(i => !p.tom[i] && !p[main][i])));
  for (let i = 0; i < N; i++) if (open[i]) hat[i] = false;
  return { p, name: STYLE_NAME[style] };
}

/* ---------- audio helpers ---------- */
const curve = (fn, n = 2048) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = fn(i / (n - 1) * 2 - 1); return c; };
function roomBuffer(ctx, secs) {
  const rate = ctx.sampleRate, len = Math.floor(rate * secs), b = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.4; d[i] = lp * Math.pow(1 - i / len, 3.2) * Math.min(1, i / (rate * 0.004)); }
  }
  return b;
}
function crackleBuffer(ctx) {
  const rate = ctx.sampleRate, len = rate * 3, b = ctx.createBuffer(1, len, rate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.014;
  for (let k = 0; k < 46; k++) {
    const at = Math.floor(Math.random() * (len - 400)), amp = (0.15 + Math.random() * 0.6) * (Math.random() < 0.5 ? -1 : 1), dl = 12 + Math.floor(Math.random() * (k % 7 ? 50 : 260));
    for (let j = 0; j < dl; j++) d[at + j] += amp * Math.exp(-j / (dl / 4)) * (0.4 + Math.random() * 0.6);
  }
  return b;
}

const DICE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.8" cy="8.8" r="1.55" fill="currentColor"/><circle cx="15.2" cy="8.8" r="1.55" fill="currentColor"/><circle cx="12" cy="12" r="1.55" fill="currentColor"/><circle cx="8.8" cy="15.2" r="1.55" fill="currentColor"/><circle cx="15.2" cy="15.2" r="1.55" fill="currentColor"/></svg>';
const COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="9" y="9" width="11.5" height="11.5" rx="3"/><path d="M15 9V6.5a3 3 0 0 0-3-3H6.5a3 3 0 0 0-3 3V12a3 3 0 0 0 3 3H9"/></svg>';
const ART_ON = [0, 4, 6, 10, 14, 16, 18, 20, 22, 23];
const ART = `<div class="art-ritim">${Array.from({ length: 24 }, (_, i) => (ART_ON.includes(i) ? '<i class="on"></i>' : '<i></i>')).join('')}</div>`;
const miniPreview = pr => {
  const rows = [['kick'], ['snare', 'clap'], ['hat', 'open']];
  return `<span class="rt-pmini" aria-hidden="true">${rows.map(r => Array.from({ length: N }, (_, i) => (r.some(id => (pr.p[id] || '')[i] === 'x') ? '<i class="on"></i>' : '<i></i>')).join('')).join('')}</span>`;
};

registerToy('ritim', {
  name: 'Ritim', color: 'orange', cf: 'on-light', kind: 'Müzik', open: 'Ritim’i aç',
  cats: ['yaratici'],
  desc: 'Üç ses kiti, dört desen slotu. Kendi beat’ini kur ya da zar at.',
  art: ART,
  stat: () => {
    const r2 = store.get('ritim2', null);
    const s = r2 && Array.isArray(r2.slots) ? r2.slots[clamp(r2.cur | 0, 0, 3)] : null;
    if (s && typeof s === 'object') return `${String(KITS[s.kit] || 'Klasik').replace(/^Lo-fi$/i, 'LO-FI')} · ${clamp(Math.round(+s.bpm) || 100, BPM_MIN, BPM_MAX)} BPM`;
    const rt = store.get('ritim', null);
    return rt && rt.bpm ? `Klasik · ${clamp(Math.round(+rt.bpm) || 90, BPM_MIN, BPM_MAX)} BPM` : '3 kit · 4 slot · 16 adım';
  },
  css: `
.art-ritim { position: relative; display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; width: min(100%, 200px); }
.art-ritim i { aspect-ratio: 1; border-radius: 4px; background: rgba(0, 0, 0, .14); }
.art-ritim i.on { background: var(--on-light); }
.art-ritim::after {
  content: ""; position: absolute; top: -5px; bottom: -5px; left: -3px; width: calc((100% - 35px) / 8 + 6px);
  border-radius: 6px; box-shadow: 0 0 0 2px var(--paper); animation: rt-art-head 2.6s steps(8) infinite;
}
@keyframes rt-art-head { to { transform: translateX(calc(800% - 48px + 40px)); } }

.ritim-root { --sh: 44px; --lw: 196px; gap: clamp(12px, 2vh, 20px); user-select: none; -webkit-user-select: none; }
.ritim-root .rt-rack {
  display: grid; gap: 16px; width: min(100%, 1080px); padding: clamp(14px, 2vw, 22px); border-radius: var(--r-xl);
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line), 0 30px 60px -44px var(--shade);
}
.ritim-root .rt-transport { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 20px; }
.ritim-root .rt-pw { position: relative; display: grid; flex: none; }
.ritim-root .rt-play {
  display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%;
  background: var(--c); color: var(--cf); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .16); transition: transform .3s var(--spring);
}
.ritim-root .rt-play:active { transform: scale(.93); }
.ritim-root .rt-play svg { width: 24px; height: 24px; }
.ritim-root .rt-pulse { position: absolute; inset: -5px; border-radius: 50%; box-shadow: 0 0 0 2px var(--c); opacity: 0; pointer-events: none; }
.ritim-root .rt-bank { display: flex; align-items: center; gap: 6px; }
.ritim-root .rt-slot {
  position: relative; display: grid; place-items: center; width: 46px; height: 44px; border-radius: 13px;
  background: var(--panel-2); font-size: 18px; font-weight: 750; line-height: 1; letter-spacing: -.02em;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .07); transition: background .18s, color .18s, box-shadow .18s, transform .3s var(--spring);
}
.ritim-root .rt-slot:active { transform: scale(.94); }
.ritim-root .rt-slot.empty { background: transparent; color: var(--mute); box-shadow: inset 0 0 0 1.5px var(--line-2); }
.ritim-root .rt-slot[aria-pressed="true"] { background: var(--c); color: var(--cf); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .18); }
.ritim-root .rt-slot.pending::after { content: ""; position: absolute; inset: -5px; border-radius: 17px; border: 2px solid var(--c); animation: rt-wait .9s ease-in-out infinite; }
@keyframes rt-wait { 50% { opacity: .15; } }
.ritim-root.rt-copying .rt-slot:not([aria-pressed="true"]) { background: transparent; color: var(--fg); box-shadow: none; outline: 2px dashed var(--fg); outline-offset: -2px; }
.ritim-root .rt-copy {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 14px 0 12px; margin-left: 4px; border-radius: 13px;
  font-size: 14px; font-weight: 600; color: var(--mute); box-shadow: inset 0 0 0 1.5px var(--line-2); transition: background .18s, color .18s, transform .3s var(--spring);
}
.ritim-root .rt-copy:active { transform: scale(.94); }
.ritim-root .rt-copy svg { width: 18px; height: 18px; flex: none; }
.ritim-root .rt-copy[aria-pressed="true"] { background: var(--fg); color: var(--bg); box-shadow: none; }
@media (hover: hover) { .ritim-root .rt-copy:hover { color: var(--fg); } .ritim-root .rt-slot:not([aria-pressed="true"]):hover { box-shadow: inset 0 0 0 2px var(--line-2); } }
.ritim-root .rt-kit { flex-wrap: nowrap; }
.ritim-root .rt-knobs { display: flex; flex: 1 1 280px; gap: 12px 20px; min-width: 0; }
.ritim-root .rt-knob { flex: 1 1 0; display: grid; gap: 2px; min-width: 0; }
.ritim-root .rt-knob-top { display: flex; justify-content: space-between; gap: 8px; }
.ritim-root .rt-knob-top label { color: var(--mute); }
.ritim-root .rt-knob output { font-variant-numeric: tabular-nums; white-space: nowrap; }

.ritim-root .rt-grid { display: grid; gap: 7px; touch-action: pan-y; -webkit-touch-callout: none; }
.ritim-root .rt-grid.rt-lock { touch-action: none; }
.ritim-root .rt-track { display: grid; grid-template-columns: var(--lw) minmax(0, 1fr); gap: 10px; align-items: stretch; }
.ritim-root .rt-head { display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 6px; }
.ritim-root .rt-pad {
  display: flex; align-items: center; gap: 9px; min-width: 0; min-height: var(--sh); padding: 0 10px 0 12px; border-radius: 12px;
  background: var(--panel-2); font-size: 14px; font-weight: 600; text-align: left; transition: background .18s, color .18s, opacity .2s;
}
.ritim-root .rt-pad span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ritim-root .rt-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--line-2); transition: background .18s, transform .18s; }
.ritim-root .rt-pad.hit { background: var(--c); color: var(--cf); transition: none; }
.ritim-root .rt-pad.hit .rt-dot { background: var(--cf); transition: none; }
@media (hover: none) { .ritim-root .rt-pad kbd { display: none; } }
.ritim-root .rt-mute {
  position: relative; display: grid; place-items: center; border-radius: 12px; font: 700 13px/1 var(--f-mono); color: var(--mute);
  box-shadow: inset 0 0 0 1.5px var(--line-2); transition: background .18s, color .18s;
}
@media (hover: hover) { .ritim-root .rt-mute:hover { color: var(--fg); box-shadow: inset 0 0 0 1.5px var(--fg); } }
.ritim-root .rt-mute[aria-pressed="true"] { background: var(--fg); color: var(--bg); box-shadow: none; }
.ritim-root .rt-track.muted .rt-steps, .ritim-root .rt-track.muted .rt-pad { opacity: .32; }
.ritim-root .rt-steps { display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 5px; transition: opacity .2s; }
.ritim-root .rt-step {
  height: var(--sh); border-radius: 9px; background: var(--panel-2); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .07);
  transition: background .12s, transform .12s, box-shadow .12s;
}
.ritim-root .rt-step:nth-child(8n+5), .ritim-root .rt-step:nth-child(8n+6), .ritim-root .rt-step:nth-child(8n+7), .ritim-root .rt-step:nth-child(8n+8) { background: var(--panel-3); }
@media (hover: hover) { .ritim-root .rt-step:hover { box-shadow: inset 0 0 0 2px var(--line-2); } }
.ritim-root .rt-step[aria-pressed="true"] { background: var(--c); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .2); }
.ritim-root .rt-step.now { box-shadow: inset 0 0 0 2px var(--fg); }
.ritim-root .rt-step.now[aria-pressed="true"] { transform: scale(.9); box-shadow: inset 0 0 0 2px var(--fg), 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent); }
.ritim-root .rt-step:focus-visible { outline-offset: 2px; position: relative; z-index: 1; }
.ritim-root .rt-ledrow .rt-steps { align-items: center; }
.ritim-root .rt-cap { align-self: center; min-width: 0; color: var(--mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ritim-root .rt-cap b { color: var(--fg); font-weight: 700; }
.ritim-root .rt-led { height: 6px; border-radius: 3px; background: var(--panel-3); transition: background .1s; }
.ritim-root .rt-led:nth-child(4n+1) { background: color-mix(in srgb, var(--panel-3) 70%, var(--fg)); }
.ritim-root .rt-led.now { background: var(--c); }
.ritim-root .rt-pagebar { display: none; }

.ritim-root .rt-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 16px; }
.ritim-root .rt-actions { display: flex; gap: 8px; }
.ritim-root .rt-actions .btn { height: 46px; }
.ritim-root .rt-actions .btn svg { width: 20px; height: 20px; flex: none; }
.ritim-root .rt-clear { min-width: 112px; }
.ritim-root .rt-pbtn { display: none; }
.ritim-root .rt-presets { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.ritim-root .rt-presets > .mono { color: var(--mute); margin-right: 4px; }

/* narrow (tablet + phone): a header line per track; phone (rt-paged) also pages 8 steps at a time */
.ritim-root.rt-narrow { gap: 12px; }
.ritim-root.rt-narrow .rt-rack { gap: 12px; padding: 14px; border-radius: 24px; }
.ritim-root.rt-narrow .rt-ledrow { display: none; }
.ritim-root.rt-narrow .rt-pagebar { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 24px; }
.ritim-root.rt-narrow .rt-pagebar .rt-cap { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; padding-left: 2px; }
.ritim-root .rt-pages { display: none; flex: none; flex-wrap: nowrap; }
.ritim-root .rt-pages .rt-pg { display: flex; align-items: center; gap: 7px; padding: 0 11px; }
.ritim-root .rt-pg .mono { font-size: 11px; letter-spacing: .02em; }
.ritim-root .rt-mini { display: grid; grid-template-columns: repeat(8, 4px); gap: 2px; align-items: center; }
.ritim-root .rt-mini i { height: 6px; border-radius: 1.5px; background: var(--line-2); transition: background .12s, transform .12s; }
.ritim-root .rt-mini i.has { background: currentColor; }
.ritim-root .rt-mini i.now { background: var(--c); transform: scaleY(1.7); }
.ritim-root.rt-narrow .rt-grid { gap: 8px; }
.ritim-root.rt-narrow .rt-track { grid-template-columns: minmax(0, 1fr); gap: 4px; }
.ritim-root.rt-narrow .rt-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 22px; }
.ritim-root.rt-narrow .rt-pad { flex: 1 1 auto; min-height: 22px; height: 22px; padding: 0 8px 0 3px; border-radius: 6px; background: none; font-size: 13.5px; gap: 8px; }
.ritim-root.rt-narrow .rt-pad.hit { background: none; color: var(--fg); }
.ritim-root.rt-narrow .rt-pad.hit .rt-dot { background: var(--c); transform: scale(1.5); }
.ritim-root.rt-narrow .rt-pad kbd { display: none; }
.ritim-root.rt-narrow .rt-mute { flex: none; width: 42px; height: 22px; border-radius: 7px; font-size: 11px; }
.ritim-root.rt-narrow .rt-mute::before { content: ""; position: absolute; inset: -9px -4px -2px -16px; }
.ritim-root.rt-narrow .rt-step { border-radius: 10px; }

.ritim-root.rt-paged .rt-rack { padding: 12px; }
.ritim-root.rt-paged .rt-transport { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "play bank" "play kit" "knobs knobs"; gap: 8px 12px; }
.ritim-root.rt-paged .rt-pw { grid-area: play; align-self: center; }
.ritim-root.rt-paged .rt-play { width: 80px; height: 80px; }
.ritim-root.rt-paged .rt-play svg { width: 28px; height: 28px; }
.ritim-root.rt-paged .rt-bank { grid-area: bank; gap: 5px; }
.ritim-root.rt-paged .rt-slot { flex: 1 1 0; width: auto; min-width: 0; }
.ritim-root.rt-paged .rt-copy { flex: none; width: 44px; padding: 0; margin-left: 2px; }
.ritim-root.rt-paged .rt-copy span { display: none; }
.ritim-root.rt-paged .rt-kit { grid-area: kit; display: flex; }
.ritim-root.rt-paged .rt-kit button { flex: 1 1 0; min-width: 0; padding: 0 6px; }
.ritim-root.rt-paged .rt-knobs { grid-area: knobs; gap: 16px; padding: 0 2px; }
.ritim-root.rt-paged .rt-pagebar { min-height: 44px; }
.ritim-root.rt-paged .rt-pages { display: flex; }
.ritim-root.rt-paged .rt-steps { grid-template-columns: repeat(8, minmax(0, 1fr)); }
.ritim-root.rt-paged .rt-grid[data-page="0"] .rt-step:nth-child(n+9), .ritim-root.rt-paged .rt-grid[data-page="1"] .rt-step:nth-child(-n+8) { display: none; }
.ritim-root.rt-paged .rt-foot { display: block; }
.ritim-root.rt-paged .rt-actions .btn { flex: 1 1 auto; min-width: 0; padding: 0 12px; gap: 8px; }
.ritim-root.rt-paged .rt-actions .rt-dice { flex-grow: 1.4; }
.ritim-root.rt-paged .rt-clear { min-width: 92px; }
.ritim-root.rt-paged .rt-pbtn { display: inline-flex; }
.ritim-root.rt-paged .rt-presets, .ritim-root.rt-paged .rt-note { display: none; }
@media (max-width: 359px) {
  .ritim-root.rt-paged .rt-play { width: 68px; height: 68px; }
  .ritim-root.rt-paged .rt-transport { gap: 8px 10px; }
  .ritim-root.rt-paged .rt-actions .btn { padding: 0 9px; font-size: 15px; }
  .ritim-root.rt-paged .rt-actions .rt-dice svg { display: none; }
  .ritim-root .rt-pages .rt-pg { padding: 0 10px; }
  .ritim-root .rt-pages .rt-mini { display: none; }
}

/* preset sheet (phone) */
.ritim-root .rt-sheet-wrap { position: fixed; inset: 0; z-index: 70; display: grid; align-items: end; justify-items: center; background: rgba(10, 11, 13, .42); animation: fadein .25s; }
.ritim-root .rt-sheet {
  width: min(100%, 480px); max-height: min(92vh, 720px); overflow: auto; overscroll-behavior: contain;
  display: grid; gap: 14px; padding: 22px var(--gutter) calc(env(safe-area-inset-bottom, 0px) + 20px);
  border-radius: 26px 26px 0 0; background: var(--panel); color: var(--fg); box-shadow: 0 -20px 50px -30px var(--shade);
  animation: rt-sheet .45s var(--spring);
}
@media (min-width: 561px) { .ritim-root .rt-sheet-wrap { align-items: center; } .ritim-root .rt-sheet { border-radius: 26px; } }
@keyframes rt-sheet { from { transform: translateY(40px); opacity: 0; } }
.ritim-root .rt-sheet-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.ritim-root .rt-sheet h2 { font-size: 26px; font-weight: 750; letter-spacing: -.03em; line-height: 1.05; }
.ritim-root .rt-sheet-top .mono { color: var(--mute); }
.ritim-root .rt-plist { display: grid; gap: 6px; }
.ritim-root .rt-pitem {
  display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 8px 14px 8px 16px; border-radius: 16px;
  background: var(--panel-2); text-align: left; transition: background .18s, transform .3s var(--spring);
}
.ritim-root .rt-pitem:active { transform: scale(.98); }
.ritim-root .rt-pitem[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--c); }
.ritim-root .rt-ptxt { flex: 1; display: grid; gap: 3px; min-width: 0; }
.ritim-root .rt-ptxt b { font-size: 17px; font-weight: 650; line-height: 1.1; }
.ritim-root .rt-ptxt .mono { color: var(--mute); font-size: 10.5px; }
.ritim-root .rt-pmini { display: grid; grid-template-columns: repeat(16, 4px); grid-auto-rows: 4px; gap: 2px; flex: none; }
.ritim-root .rt-pmini i { border-radius: 1px; background: var(--line-2); }
.ritim-root .rt-pmini i.on { background: var(--c); }
.ritim-root .rt-sheet .btn { justify-self: stretch; }
`,
  hint: 'Boşluk çal · 1–4 slot · Z zar · K kit · ASDFGH ped',
  mount(el) {
    const st = load();
    const slots = st.slots, mute = st.mute;
    let cur = st.cur;
    const hadV1 = store.get('ritim', null) != null;
    const a0 = JSON.stringify(v1Shape(slots[0]));
    function save() {
      store.set('ritim2', {
        v: 1, cur, mute: IDS.filter(id => mute.has(id)),
        slots: slots.map(s => ({ bpm: s.bpm, swing: s.swing, kit: s.kit, preset: s.preset, name: s.name, p: Object.fromEntries(IDS.map(id => [id, encRow(s.p[id])])) })),
      });
      const v = v1Shape(slots[0]);            // keep V1 in step with slot A, but never create its key for nothing
      if (hadV1 || JSON.stringify(v) !== a0) store.set('ritim', v);
    }

    el.innerHTML = `
      <div class="toy ritim-root">
        <div class="rt-rack">
          <div class="rt-transport">
            <span class="rt-pw"><i class="rt-pulse" aria-hidden="true"></i><button type="button" class="rt-play" aria-pressed="false" aria-label="Çal">${ICON.play}</button></span>
            <div class="rt-bank" role="group" aria-label="Desen slotları">
              ${LETTERS.map((L, i) => `<button type="button" class="rt-slot" data-slot="${i}" aria-pressed="false">${L}</button>`).join('')}
              <button type="button" class="rt-copy" aria-pressed="false" aria-label="Kopyala" title="Bu slotu başka bir slota kopyala">${COPY}<span>Kopyala</span></button>
            </div>
            <div class="seg rt-kit" role="group" aria-label="Ses kiti">${KIT_IDS.map(k => `<button type="button" data-kit="${k}" aria-pressed="false">${KITS[k]}</button>`).join('')}</div>
            <div class="rt-knobs">
              <div class="rt-knob"><div class="rt-knob-top"><label class="mono" for="rt-bpm">Tempo</label><output class="mono" id="rt-bpm-o" for="rt-bpm"></output></div><input type="range" id="rt-bpm" min="${BPM_MIN}" max="${BPM_MAX}" step="1"></div>
              <div class="rt-knob"><div class="rt-knob-top"><label class="mono" for="rt-swing">Swing</label><output class="mono" id="rt-swing-o" for="rt-swing"></output></div><input type="range" id="rt-swing" min="0" max="100" step="1"></div>
            </div>
          </div>
          <div class="rt-pagebar">
            <p class="rt-cap mono"></p>
            <div class="seg rt-pages" role="group" aria-label="Adım sayfası">${[0, 1].map(p => `<button type="button" class="rt-pg" data-page="${p}" aria-pressed="${p === 0}" aria-label="Adım ${p * 8 + 1}–${p * 8 + 8}"><span class="mono">${p * 8 + 1}–${p * 8 + 8}</span><span class="rt-mini" aria-hidden="true">${'<i></i>'.repeat(8)}</span></button>`).join('')}</div>
          </div>
          <div class="rt-grid" data-page="0">
            <div class="rt-track rt-ledrow"><p class="rt-cap mono"></p><div class="rt-steps" aria-hidden="true">${'<i class="rt-led"></i>'.repeat(N)}</div></div>
            ${TRACKS.map(t => `<div class="rt-track" data-track="${t.id}">
              <div class="rt-head">
                <button type="button" class="rt-pad" data-pad="${t.id}"><i class="rt-dot" aria-hidden="true"></i><span>${t.name}</span><kbd>${t.key.toUpperCase()}</kbd></button>
                <button type="button" class="rt-mute" data-mute="${t.id}" aria-pressed="false" aria-label="Sustur: ${t.name}" title="Sustur">M</button>
              </div>
              <div class="rt-steps" role="group" aria-label="${t.name} adımları">${Array.from({ length: N }, (_, i) => `<button type="button" class="rt-step" data-i="${i}" tabindex="-1" aria-label="${t.name}, adım ${i + 1}" aria-pressed="false"></button>`).join('')}</div>
            </div>`).join('')}
          </div>
          <div class="rt-foot">
            <div class="rt-actions">
              <button type="button" class="btn primary rt-dice">${DICE}Zar at <kbd>Z</kbd></button>
              <button type="button" class="btn rt-pbtn" aria-haspopup="dialog">Hazır</button>
              <button type="button" class="btn rt-clear">Temizle</button>
            </div>
            <div class="rt-presets" role="group" aria-label="Hazır ritimler"><span class="mono">Hazır</span>${Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="chip" data-preset="${k}" aria-pressed="false">${p.name}</button>`).join('')}</div>
          </div>
        </div>
        <p class="mono note rt-note">Adımlara tıkla ya da üzerlerinden sürükle · Shift + ped harfi o sesi susturur</p>
      </div>`;

    const rootEl = $('.ritim-root', el), grid = $('.rt-grid', el), playBtn = $('.rt-play', el), pulseEl = $('.rt-pulse', el);
    const bpmIn = $('#rt-bpm', el), swIn = $('#rt-swing', el), bpmOut = $('#rt-bpm-o', el), swOut = $('#rt-swing-o', el);
    const slotBtns = $$('.rt-slot', el), copyBtn = $('.rt-copy', el), kitBtns = $$('[data-kit]', el), bank = $('.rt-bank', el);
    const caps = $$('.rt-cap', el), pgBtns = $$('.rt-pg', el), minis = $$('.rt-mini i', el), leds = $$('.rt-led', el);
    const clearBtn = $('.rt-clear', el), diceBtn = $('.rt-dice', el), pBtn = $('.rt-pbtn', el);
    const stepEl = {}, padEl = {}, muteEl = {}, trackEl = {};
    TRACKS.forEach(t => {
      trackEl[t.id] = $(`.rt-track[data-track="${t.id}"]`, el);
      stepEl[t.id] = $$('.rt-step', trackEl[t.id]); padEl[t.id] = $('.rt-pad', trackEl[t.id]); muteEl[t.id] = $('.rt-mute', trackEl[t.id]);
    });
    const cols = Array.from({ length: N }, (_, i) => IDS.map(id => stepEl[id][i]).concat(leds[i], minis[i]));
    const S = () => slots[cur];

    /* ---------- audio: Klasik = shared core voices; Akustik = own bus + small room; Lo-fi = saturated, filtered bus, crushed hats, vinyl ---------- */
    let A = null, choke = null;
    function audio() {
      const ctx = Sound.ensure();
      if (!ctx || !Sound.out) return null;
      if (!A) {
        const ac = ctx.createGain(), room = ctx.createConvolver(), wet = ctx.createGain();
        room.buffer = roomBuffer(ctx, 0.9); wet.gain.value = 0.2;
        ac.connect(Sound.out); ac.connect(room); room.connect(wet); wet.connect(Sound.out);
        const lf = ctx.createGain(), sat = ctx.createWaveShaper(), lp = Sound.filt('lowpass', 6400, 0.5), hp = Sound.filt('highpass', 45, 0.5), lfo = ctx.createGain(), crush = ctx.createWaveShaper();
        sat.curve = curve(x => Math.tanh(1.8 * x) / Math.tanh(1.8)); sat.oversample = '2x';
        crush.curve = curve(x => Math.round(x * 12) / 12, 4096);
        lf.gain.value = 0.62; lfo.gain.value = 0.95;
        lf.connect(sat); sat.connect(lp); lp.connect(hp); hp.connect(lfo); lfo.connect(Sound.out); crush.connect(lf);
        A = { ac, room, wet, lf, sat, lp, hp, lfo, crush, crackle: null, crackBuf: null };
      }
      return ctx;
    }
    function chokeOpen(t) { if (choke) { const c = choke; choke = null; c.gain.setValueAtTime(1, t); c.gain.setTargetAtTime(0.0001, t, 0.012); } }
    function metal(t, peak, dur, dest, base) {
      const bp = Sound.filt('bandpass', 9500, 0.9), hp = Sound.filt('highpass', 6500), g = Sound.env(t, peak, 0.001, dur);
      bp.connect(hp); hp.connect(g); g.connect(dest);
      [2, 3, 4.16, 5.43, 6.79, 8.21].forEach(r => Sound.osc('square', base * r, t, bp, dur + 0.02));
    }
    function claps(t, v, out, gaps, peak, tail, bpF, lpF) {
      const g = Sound.ctx.createGain(); g.gain.setValueAtTime(0, t);
      gaps.forEach(d => { g.gain.setValueAtTime(peak * v, t + d); g.gain.linearRampToValueAtTime(0.06 * v, t + d + 0.009); });
      const last = gaps[gaps.length - 1] + 0.012;
      g.gain.setValueAtTime(peak * 0.8 * v, t + last); g.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      let n = Sound.noise(t, tail + 0.04).connect(Sound.filt('bandpass', bpF, 0.9));
      if (lpF) n = n.connect(Sound.filt('lowpass', lpF, 0.5));
      n.connect(g); g.connect(out);
    }
    const AK = {
      kick(t, v, out) {
        const lp = Sound.filt('lowpass', 1100, 0.4); lp.connect(out);
        const g = Sound.env(t, 1.05 * v, 0.003, 0.5); g.connect(lp); Sound.osc('sine', 96, t, g, 0.56, 50, 0.1);
        const g2 = Sound.env(t, 0.3 * v, 0.002, 0.09); g2.connect(lp); Sound.osc('triangle', 180, t, g2, 0.12, 84, 0.05);
        Sound.noise(t, 0.03).connect(Sound.filt('bandpass', 2400, 0.8)).connect(Sound.env(t, 0.2 * v, 0.001, 0.014)).connect(out);
      },
      snare(t, v, out) {
        const g = Sound.env(t, 0.5 * v, 0.001, 0.12); g.connect(out); Sound.osc('triangle', 200, t, g, 0.15, 172, 0.05);
        const g2 = Sound.env(t, 0.2 * v, 0.001, 0.07); g2.connect(out); Sound.osc('sine', 340, t, g2, 0.1, 300, 0.05);
        Sound.noise(t, 0.3).connect(Sound.filt('bandpass', 5000, 0.5)).connect(Sound.env(t, 0.55 * v, 0.001, 0.24)).connect(out);
        Sound.noise(t, 0.08).connect(Sound.filt('lowpass', 3000, 0.5)).connect(Sound.env(t, 0.34 * v, 0.001, 0.05)).connect(out);
      },
      clap(t, v, out) { claps(t, v, out, [0, 0.008, 0.019, 0.03], 0.7, 0.3, 1150); },
      hat(t, v, out) {
        chokeOpen(t);
        Sound.noise(t, 0.08).connect(Sound.filt('highpass', 7500, 0.7)).connect(Sound.env(t, 0.32 * v, 0.001, 0.045)).connect(out);
        metal(t, 0.06 * v, 0.04, out, 47);
      },
      open(t, v, out) {
        chokeOpen(t); const c = Sound.ctx.createGain(); c.connect(out); choke = c;
        Sound.noise(t, 0.6).connect(Sound.filt('highpass', 7000, 0.7)).connect(Sound.env(t, 0.16 * v, 0.003, 0.42)).connect(c);
        metal(t, 0.05 * v, 0.45, c, 47);
      },
      tom(t, v, out) {
        const g = Sound.env(t, 0.74 * v, 0.002, 0.46); g.connect(out); Sound.osc('sine', 150, t, g, 0.5, 102, 0.3);
        const g2 = Sound.env(t, 0.15 * v, 0.002, 0.16); g2.connect(out); Sound.osc('triangle', 236, t, g2, 0.2, 160, 0.18);
        Sound.noise(t, 0.04).connect(Sound.filt('lowpass', 3200)).connect(Sound.env(t, 0.12 * v, 0.001, 0.025)).connect(out);
      },
    };
    const LF = {
      kick(t, v, out) {
        const lp = Sound.filt('lowpass', 380, 0.6); lp.connect(out);
        const g = Sound.env(t, 1.15 * v, 0.007, 0.34); g.connect(lp); Sound.osc('sine', 82, t, g, 0.4, 46, 0.12);
        const g2 = Sound.env(t, 0.25 * v, 0.004, 0.05); g2.connect(lp); Sound.osc('triangle', 150, t, g2, 0.08, 70, 0.05);
      },
      snare(t, v, out) {
        Sound.noise(t, 0.26).connect(Sound.filt('bandpass', 1700, 0.6)).connect(Sound.filt('lowpass', 4000, 0.5)).connect(Sound.env(t, 0.84 * v, 0.002, 0.19)).connect(out);
        Sound.noise(t, 0.12).connect(Sound.filt('highpass', 2600)).connect(Sound.env(t, 0.2 * v, 0.001, 0.09)).connect(A.crush);
        const g = Sound.env(t, 0.4 * v, 0.002, 0.09); g.connect(out); Sound.osc('triangle', 188, t, g, 0.12, 150, 0.06);
      },
      clap(t, v, out) { claps(t, v, out, [0, 0.013, 0.027], 0.74, 0.36, 1000, 2600); },
      hat(t, v) { chokeOpen(t); Sound.noise(t, 0.06).connect(Sound.filt('bandpass', 6200, 0.9)).connect(Sound.env(t, 0.34 * v, 0.001, 0.035)).connect(A.crush); },
      open(t, v) {
        chokeOpen(t); const c = Sound.ctx.createGain(); c.connect(A.crush); choke = c;
        Sound.noise(t, 0.4).connect(Sound.filt('bandpass', 5600, 0.8)).connect(Sound.env(t, 0.28 * v, 0.002, 0.26)).connect(c);
      },
      tom(t, v, out) {
        const lp = Sound.filt('lowpass', 900, 0.5); lp.connect(out);
        const g = Sound.env(t, 0.82 * v, 0.004, 0.3); g.connect(lp); Sound.osc('sine', 124, t, g, 0.34, 84, 0.2);
        Sound.noise(t, 0.03).connect(Sound.filt('bandpass', 1400, 1)).connect(Sound.env(t, 0.07 * v, 0.001, 0.02)).connect(out);
      },
    };
    function trigger(kit, id, t, v) {
      if (kit === 'akustik') AK[id](t, v, A.ac);
      else if (kit === 'lofi') LF[id](t, v, A.lf);
      else Sound.drum[id](t, v);
    }
    function syncCrackle() {
      if (!A || !Sound.ctx) return;
      const want = playing && slots[aSlot].kit === 'lofi', ctx = Sound.ctx, t = ctx.currentTime;
      if (want && !A.crackle) {
        const src = ctx.createBufferSource(), hp = Sound.filt('highpass', 450, 0.5), lp = Sound.filt('lowpass', 6500, 0.5), g = ctx.createGain();
        src.buffer = A.crackBuf || (A.crackBuf = crackleBuffer(ctx)); src.loop = true;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.15, t + 0.3);
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(Sound.out); src.start(t, Math.random() * 2.5);
        A.crackle = { src, g };
      } else if (!want && A.crackle) {
        const c = A.crackle; A.crackle = null;
        c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(0, t, 0.05);
        try { c.src.stop(t + 0.35); } catch (e) {}
        c.src.onended = () => { try { c.g.disconnect(); } catch (e) {} };
      }
    }

    /* ---------- render ---------- */
    const setP = inp => inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%');
    function syncKnobs() { const s = S(); bpmIn.value = s.bpm; swIn.value = s.swing; bpmOut.textContent = s.bpm + ' BPM'; swOut.textContent = '%' + s.swing; setP(bpmIn); setP(swIn); }
    function renderMini() { const s = S(); for (let i = 0; i < N; i++) minis[i].classList.toggle('has', IDS.some(id => s.p[id][i])); }
    function renderSteps() { const s = S(); IDS.forEach(id => stepEl[id].forEach((b, i) => b.setAttribute('aria-pressed', s.p[id][i] ? 'true' : 'false'))); renderMini(); }
    function renderCap() {
      const s = S(), L = LETTERS[cur];
      let html;
      if (copying) html = `<b>${L}</b> → hangi slota?`;
      else {
        const what = s.preset ? PRESETS[s.preset].name : s.name ? 'Zar · ' + s.name : isEmpty(s) ? 'Boş slot' : 'Kendi ritmin';
        html = `<b>${L}</b> · ${what}${pending != null ? ` → <b>${LETTERS[pending]}</b>` : ''}`;
      }
      caps.forEach(c => { c.innerHTML = html; });
    }
    function renderSlots() {
      slotBtns.forEach((b, i) => {
        const empty = isEmpty(slots[i]);
        b.setAttribute('aria-pressed', i === cur ? 'true' : 'false');
        b.classList.toggle('empty', empty);
        b.classList.toggle('pending', i === pending);
        b.setAttribute('aria-label', `Slot ${LETTERS[i]} · ${KITS[slots[i].kit]}${empty ? ' · boş' : ''}${i === pending ? ' · sırada' : ''}`);
      });
      rootEl.classList.toggle('rt-copying', copying);
      copyBtn.setAttribute('aria-pressed', copying ? 'true' : 'false');
      renderCap();
    }
    function renderKit() { kitBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.kit === S().kit ? 'true' : 'false')); }
    function renderPresets() { $$('[data-preset]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.preset === S().preset ? 'true' : 'false')); }
    function renderMute() { IDS.forEach(id => { const m = mute.has(id); muteEl[id].setAttribute('aria-pressed', m ? 'true' : 'false'); trackEl[id].classList.toggle('muted', m); }); }
    function renderAll() { renderSteps(); renderSlots(); renderKit(); renderPresets(); renderMute(); syncKnobs(); }
    function cascade() {
      if (!motionOK()) return;
      const s = S();
      IDS.forEach((id, r) => s.p[id].forEach((v, i) => {
        if (!v || (paged && (i >> 3) !== page)) return;
        stepEl[id][i].animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, delay: (paged ? i & 7 : i) * 16 + r * 12, easing: 'cubic-bezier(.3,1.45,.55,1)', fill: 'backwards' });
      }));
    }
    const pulseT = new Map();
    function flashPad(id) { const p = padEl[id]; p.classList.add('hit'); clearTimeout(pulseT.get(id)); pulseT.set(id, setTimeout(() => p.classList.remove('hit'), 90)); }
    function hit(id) { const ctx = audio(); if (ctx) trigger(S().kit, id, ctx.currentTime + 0.005, 1); flashPad(id); }

    /* ---------- undo for destructive actions (clear, dice, preset) ---------- */
    let undo = null, undoT = 0;
    function resetUndo() { if (undo) { undo = null; clearTimeout(undoT); clearBtn.textContent = 'Temizle'; } }
    function snapshot() {
      if (isEmpty(S())) { resetUndo(); return; }
      undo = { i: cur, data: cloneSlot(S()) }; clearBtn.textContent = 'Geri al';
      clearTimeout(undoT); undoT = setTimeout(resetUndo, 5000);
    }

    /* ---------- editing ---------- */
    function edited() { const s = S(); if (s.preset || s.name) { s.preset = null; s.name = null; renderPresets(); } }
    function setStep(id, i, val, audition) {
      const s = S(); if (s.p[id][i] === val) return;
      s.p[id][i] = val;
      const b = stepEl[id][i]; b.setAttribute('aria-pressed', val ? 'true' : 'false');
      minis[i].classList.toggle('has', IDS.some(k => s.p[k][i]));
      edited(); resetUndo();
      slotBtns[cur].classList.toggle('empty', isEmpty(s)); renderCap();
      if (val) {
        if (audition && !playing) hit(id);
        if (motionOK()) b.animate([{ transform: 'scale(.7)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.3,1.45,.55,1)' });
      }
    }
    function setCur(i) {
      cur = i; if (!playing) aSlot = i;
      resetUndo(); renderAll(); save(); cascade();
      say(`Slot ${LETTERS[i]} · ${KITS[S().kit]} · ${S().bpm} BPM`);
    }
    function selectSlot(i) {
      if (!playing) { if (i !== cur) { setCur(i); vibrate(8); } return; }
      if (i === aSlot) { if (pending != null) { pending = null; renderSlots(); say('Slot değişimi iptal.'); } return; }
      if (i === pending) return;
      pending = i; renderSlots(); vibrate(8);
      say(`Slot ${LETTERS[i]} bir sonraki ölçüde başlayacak.`);
    }
    function setKit(k, preview) {
      if (!KITS[k]) return;
      S().kit = k; renderKit(); renderSlots(); save();
      if (playing && cur === aSlot) syncCrackle();
      if (preview && !playing) {
        const ctx = audio();
        if (ctx) { const t = ctx.currentTime + 0.01; trigger(k, 'kick', t, 1); trigger(k, 'hat', t + 0.14, 0.8); trigger(k, 'snare', t + 0.28, 0.95); }
      }
      say(`Kit: ${KITS[k]}`);
    }
    function toggleMute(id) {
      if (mute.has(id)) mute.delete(id); else mute.add(id);
      renderMute(); save(); vibrate(8);
      say(`${TRACKS.find(t => t.id === id).name} ${mute.has(id) ? 'susturuldu' : 'açıldı'}.`);
    }
    function dice() {
      const s = S(); snapshot();
      const r = rollBeat(s.kit);
      IDS.forEach(id => { s.p[id] = r.p[id]; });
      s.preset = null; s.name = r.name;
      renderSteps(); renderSlots(); renderPresets(); save(); cascade();
      vibrate(10); say(`Zar: ${r.name}`);
      const ic = $('svg', diceBtn);
      if (ic && motionOK()) ic.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(200deg) scale(.8)' }, { transform: 'rotate(360deg) scale(1)' }], { duration: 480, easing: 'cubic-bezier(.3,1.2,.5,1)' });
      if (!playing) play(); else follow = true;
    }
    function loadPreset(k) {
      const pr = PRESETS[k]; if (!pr) return;
      const s = S(); snapshot();
      IDS.forEach(id => { s.p[id] = decRow(pr.p[id]); });
      s.bpm = pr.bpm; s.swing = pr.swing; s.preset = k; s.name = null;
      renderSteps(); renderSlots(); renderPresets(); syncKnobs(); save(); cascade();
      if (paged && page) setPage(0, true);
      if (!playing) play(); else follow = true;
    }
    function clearOrUndo() {
      if (undo) {
        const u = undo; resetUndo(); slots[u.i] = u.data;
        if (u.i === cur) { renderAll(); cascade(); } else renderSlots();
        save(); say('Geri alındı.'); return;
      }
      const s = S(); if (isEmpty(s)) return;
      snapshot(); IDS.forEach(id => s.p[id].fill(false)); s.preset = null; s.name = null;
      renderSteps(); renderSlots(); renderPresets(); save(); vibrate(10); say('Slot temizlendi.');
    }
    let copying = false;
    function enterCopy() { copying = true; renderSlots(); say(`${LETTERS[cur]} slotunu nereye kopyalayalım? Bir slota dokun.`); }
    function exitCopy() { if (copying) { copying = false; renderSlots(); } }
    function copyTo(i) {
      const from = cur;
      slots[i] = cloneSlot(S()); copying = false;
      renderSlots(); save(); vibrate(10);
      toast(`${LETTERS[from]} → ${LETTERS[i]} kopyalandı`);
      if (motionOK()) slotBtns[i].animate([{ transform: 'scale(.82)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.45,.55,1)' });
    }

    /* ---------- presets sheet (phone) ---------- */
    let sheet = null;
    function openSheet() {
      if (sheet) return;
      sheet = document.createElement('div'); sheet.className = 'rt-sheet-wrap';
      sheet.innerHTML = `<div class="rt-sheet" role="dialog" aria-modal="true" aria-labelledby="rt-sheet-h">
        <div class="rt-sheet-top"><h2 id="rt-sheet-h">Hazır ritimler</h2><span class="mono">${LETTERS[cur]} slotuna</span></div>
        <div class="rt-plist">${Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="rt-pitem" data-preset="${k}" aria-pressed="${S().preset === k}"><span class="rt-ptxt"><b>${p.name}</b><span class="mono">${p.bpm} BPM · Swing %${p.swing}</span></span>${miniPreview(p)}</button>`).join('')}</div>
        <button type="button" class="btn" data-close>Vazgeç</button>
      </div>`;
      sheet.addEventListener('click', e => {
        if (e.target === sheet || e.target.closest('[data-close]')) { closeSheet(true); return; }
        const b = e.target.closest('[data-preset]'); if (b) { closeSheet(true); loadPreset(b.dataset.preset); }
      });
      rootEl.append(sheet);
      ($('.rt-pitem[aria-pressed="true"]', sheet) || $('.rt-pitem', sheet)).focus({ preventScroll: true });
    }
    function closeSheet(refocus) { if (!sheet) return; sheet.remove(); sheet = null; if (refocus && pBtn.offsetParent) pBtn.focus({ preventScroll: true }); }

    /* ---------- pages (phone: 8 steps at a time) + roving focus ---------- */
    let narrow = false, paged = false, page = 0, follow = false, fT = 0, fS = 0;
    stepEl[IDS[0]][0].tabIndex = 0;
    function rove(ti, s, focus) {
      stepEl[IDS[fT]][fS].tabIndex = -1; fT = ti; fS = s;
      const b = stepEl[IDS[ti]][s]; b.tabIndex = 0;
      if (focus) b.focus({ preventScroll: true });
    }
    function setPage(p, anim) {
      if (p === page && grid.dataset.page === String(p)) return;
      page = p; grid.dataset.page = p;
      pgBtns.forEach((b, i) => b.setAttribute('aria-pressed', i === p ? 'true' : 'false'));
      if (paged && (fS >> 3) !== p) rove(fT, p * 8 + (fS & 7), grid.contains(document.activeElement));
      if (anim && paged && motionOK()) IDS.forEach(id => stepEl[id][0].parentNode.animate([{ opacity: 0.3, transform: `translateX(${p ? 16 : -16}px)` }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' }));
    }

    /* ---------- transport: lookahead scheduler on the audio clock; slot switches land on the next bar ---------- */
    let playing = false, step = 0, nextT = 0, timer = 0, raf = 0, queue = [], lit = -1, aSlot = cur, pending = null;
    function light(s, si) {
      if (lit >= 0) cols[lit].forEach(n => n.classList.remove('now'));
      lit = s;
      if (s < 0) return;
      if (paged && follow && (s >> 3) !== page) setPage(s >> 3, true);
      cols[s].forEach(n => n.classList.add('now'));
      const sl = slots[si];
      IDS.forEach(id => { if (sl.p[id][s] && !mute.has(id)) flashPad(id); });
      if (s % 4 === 0 && motionOK()) pulseEl.animate([{ transform: 'scale(.94)', opacity: s === 0 ? 0.95 : 0.5 }, { transform: 'scale(1.22)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    function scheduler() {
      const ctx = Sound.ctx;
      if (nextT < ctx.currentTime - 0.05) nextT = ctx.currentTime + 0.03;     // resync after a stall
      while (nextT < ctx.currentTime + 0.12) {
        let sw = -1;
        if (step === 0 && pending != null) { aSlot = pending; pending = null; sw = aSlot; }
        const s = slots[aSlot], sd = 60 / s.bpm / 4;
        let t = nextT + (step % 2 ? sd * (s.swing / 100) * 0.33 : 0);
        if (s.kit === 'lofi') t += Math.random() * 0.006;                       // a little lazy
        for (const id of IDS) {
          if (!s.p[id][step] || mute.has(id)) continue;
          trigger(s.kit, id, t, (step % 4 === 0 ? 1 : 0.8) * (s.kit === 'klasik' ? 1 : 0.9 + Math.random() * 0.12));
        }
        queue.push({ s: step, t, sw, slot: aSlot });
        step = (step + 1) % N; nextT += sd;
      }
      timer = setTimeout(scheduler, 25);
    }
    function frame() {
      const now = Sound.ctx.currentTime; let q = null;
      while (queue.length && queue[0].t <= now) {
        q = queue.shift();
        if (q.sw >= 0) { if (q.sw !== cur) setCur(q.sw); else renderSlots(); syncCrackle(); }
      }
      if (q) light(q.s, q.slot);
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (playing) return;
      const ctx = audio();
      if (!ctx) { say('Bu tarayıcı ses üretemiyor.'); return; }
      playing = true; follow = true; step = 0; aSlot = cur; pending = null; queue = []; nextT = ctx.currentTime + 0.06;
      scheduler(); raf = requestAnimationFrame(frame); syncCrackle();
      playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Durdur'); playBtn.innerHTML = ICON.stop;
      renderSlots();
    }
    function stop() {
      if (!playing) return;
      playing = false; clearTimeout(timer); cancelAnimationFrame(raf); queue = []; light(-1); choke = null;
      syncCrackle();
      playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Çal'); playBtn.innerHTML = ICON.play;
      const target = pending != null ? pending : aSlot;
      pending = null;
      if (target !== cur) setCur(target); else renderSlots();
      aSlot = cur;
    }
    const toggle = () => (playing ? stop() : play());

    /* ---------- controls ---------- */
    playBtn.addEventListener('click', toggle);
    bank.addEventListener('click', e => {
      if (e.target.closest('.rt-copy')) { if (copying) exitCopy(); else enterCopy(); return; }
      const b = e.target.closest('[data-slot]'); if (!b) return;
      const i = +b.dataset.slot;
      if (copying) { if (i !== cur) copyTo(i); else exitCopy(); return; }
      selectSlot(i);
    });
    rootEl.addEventListener('pointerdown', e => { if (copying && !e.target.closest('.rt-bank')) exitCopy(); });
    $('.rt-kit', el).addEventListener('click', e => { const b = e.target.closest('[data-kit]'); if (b) setKit(b.dataset.kit, true); });
    bpmIn.addEventListener('input', () => { S().bpm = +bpmIn.value; syncKnobs(); save(); });
    swIn.addEventListener('input', () => { S().swing = +swIn.value; syncKnobs(); save(); });
    diceBtn.addEventListener('click', dice);
    clearBtn.addEventListener('click', clearOrUndo);
    pBtn.addEventListener('click', openSheet);
    $('.rt-presets', el).addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (b) loadPreset(b.dataset.preset); });
    $('.rt-pages', el).addEventListener('click', e => { const b = e.target.closest('.rt-pg'); if (!b) return; follow = false; setPage(+b.dataset.page, true); });

    /* grid: tap toggles, drag paints, pads play, M mutes */
    let paint = null;
    const stepAt = (x, y) => { const h = document.elementFromPoint(x, y); const b = h && h.closest ? h.closest('.rt-step') : null; return b && grid.contains(b) ? b : null; };
    grid.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      const pad = e.target.closest('.rt-pad');
      if (pad) { e.preventDefault(); hit(pad.dataset.pad); return; }
      const b = e.target.closest('.rt-step'); if (!b) return;
      e.preventDefault();
      const id = b.closest('.rt-track').dataset.track, i = +b.dataset.i;
      follow = false;
      paint = { val: !S().p[id][i], id: e.pointerId, last: b };
      setStep(id, i, paint.val, true); rove(IDS.indexOf(id), i, false);
      if (paint.val) vibrate(6);
      try { grid.setPointerCapture(e.pointerId); } catch (err) {}
    });
    grid.addEventListener('pointermove', e => {
      if (!paint || e.pointerId !== paint.id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (evs.length ? evs : [e]).forEach(ev => {
        const b = stepAt(ev.clientX, ev.clientY);
        if (!b || b === paint.last) return;
        paint.last = b; setStep(b.closest('.rt-track').dataset.track, +b.dataset.i, paint.val, false);
      });
    });
    const endPaint = e => { if (paint && (!e || e.pointerId === paint.id)) { paint = null; save(); } };
    grid.addEventListener('pointerup', endPaint);
    grid.addEventListener('pointercancel', endPaint);
    grid.addEventListener('lostpointercapture', endPaint);
    grid.addEventListener('click', e => {
      const m = e.target.closest('.rt-mute'); if (m) { toggleMute(m.dataset.mute); return; }
      if (e.detail !== 0) return;                       // keyboard activation only; pointers are handled above
      const pad = e.target.closest('.rt-pad'); if (pad) { hit(pad.dataset.pad); return; }
      const b = e.target.closest('.rt-step'); if (!b) return;
      const id = b.closest('.rt-track').dataset.track, i = +b.dataset.i;
      setStep(id, i, !S().p[id][i], true); save();
    });
    grid.addEventListener('focusin', e => { const b = e.target.closest('.rt-step'); if (b) rove(IDS.indexOf(b.closest('.rt-track').dataset.track), +b.dataset.i, false); });

    /* ---------- layout: phone gets header lines + 8-step pages; step height fills the screen ---------- */
    function layout() {
      const cs = getComputedStyle(el);
      const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const H = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const nar = W < 760, pg = W < 640;
      if (nar !== narrow) { narrow = nar; rootEl.classList.toggle('rt-narrow', nar); }
      if (pg !== paged) {
        paged = pg; rootEl.classList.toggle('rt-paged', pg);
        page = -1; setPage(pg ? (lit >= 0 ? lit >> 3 : fS >> 3) : 0, false);
      }
      rootEl.style.setProperty('--lw', W < 900 ? '170px' : '196px');
      const min = narrow ? 34 : 36, max = narrow ? 54 : 48;
      let sh = parseFloat(rootEl.style.getPropertyValue('--sh')) || 44;
      for (let k = 0; k < 3; k++) {
        rootEl.style.setProperty('--sh', sh + 'px');
        const next = clamp(Math.floor(sh + (H - rootEl.offsetHeight) / 6), min, max);
        if (next === sh) break;
        sh = next;
      }
      rootEl.style.setProperty('--sh', sh + 'px');
      grid.classList.toggle('rt-lock', rootEl.offsetHeight <= H + 1);   // nothing to scroll: let fingers paint in any direction
    }

    const onVis = () => { if (document.hidden && playing) stop(); };
    document.addEventListener('visibilitychange', onVis);
    let ro = null, rraf = 0, alive = true;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { cancelAnimationFrame(rraf); rraf = requestAnimationFrame(layout); }); ro.observe(el); }
    renderAll(); layout();
    if (st.fresh) save();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) layout(); }).catch(() => {});

    return {
      onKey(e) {
        if (isField(e.target)) return;
        const k = e.key;
        if (k === ' ') { e.preventDefault(); if (!e.repeat) toggle(); return; }
        const sb = e.target && e.target.closest ? e.target.closest('.rt-step') : null;
        if (sb && k.startsWith('Arrow')) {
          e.preventDefault(); follow = false;
          let ti = IDS.indexOf(sb.closest('.rt-track').dataset.track), s = +sb.dataset.i;
          if (k === 'ArrowLeft') s = Math.max(0, s - 1);
          else if (k === 'ArrowRight') s = Math.min(N - 1, s + 1);
          else if (k === 'ArrowUp') ti = Math.max(0, ti - 1);
          else if (k === 'ArrowDown') ti = Math.min(IDS.length - 1, ti + 1);
          if (paged && (s >> 3) !== page) setPage(s >> 3, true);
          rove(ti, s, true);
          return;
        }
        if (e.repeat) return;
        if (k >= '1' && k <= '4') {
          e.preventDefault(); const i = +k - 1;
          if (copying) { if (i !== cur) copyTo(i); else exitCopy(); } else selectSlot(i);
          return;
        }
        const lk = k.toLocaleLowerCase('tr');
        const tr = TRACKS.find(x => x.key === lk);
        if (tr) { e.preventDefault(); if (e.shiftKey) toggleMute(tr.id); else hit(tr.id); return; }
        if (lk === 'z') { e.preventDefault(); dice(); }
        else if (lk === 'k') { e.preventDefault(); setKit(KIT_IDS[(KIT_IDS.indexOf(S().kit) + 1) % KIT_IDS.length], true); }
        else if (lk === 'c') { e.preventDefault(); if (copying) exitCopy(); else enterCopy(); }
      },
      destroy() {
        alive = false;
        pending = null; stop(); closeSheet(false); resetUndo();
        pulseT.forEach(h => clearTimeout(h)); pulseT.clear();
        document.removeEventListener('visibilitychange', onVis);
        if (ro) ro.disconnect(); cancelAnimationFrame(rraf);
        if (A && Sound.ctx) {
          const n = A, t = Sound.ctx.currentTime; A = null;
          if (n.crackle) { try { n.crackle.g.gain.setTargetAtTime(0, t, 0.03); n.crackle.src.stop(t + 0.2); } catch (err) {} }
          n.ac.gain.setTargetAtTime(0, t, 0.04); n.wet.gain.setTargetAtTime(0, t, 0.04); n.lfo.gain.setTargetAtTime(0, t, 0.04);
          setTimeout(() => { [n.ac, n.room, n.wet, n.lf, n.sat, n.lp, n.hp, n.lfo, n.crush].forEach(x => { try { x.disconnect(); } catch (err) {} }); }, 400);
        }
      },
    };
  },
});
})();
