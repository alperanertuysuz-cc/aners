/* Sıkıldım v2 — shared core.
   Classic scripts loaded with `defer` share this global scope: toys/*.js call registerToy() and use the helpers below. */
'use strict';
const root = document.documentElement;
root.lang = 'tr';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nf = new Intl.NumberFormat('tr-TR');
const fmt = n => nf.format(n);
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
const motionOK = () => !reducedMQ.matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem('sikildim:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sikildim:' + k, JSON.stringify(v)); } catch (e) {} },
  reset(keep) { try { Object.keys(localStorage).filter(k => k.startsWith('sikildim:') && !keep.includes(k.slice(9))).forEach(k => localStorage.removeItem(k)); } catch (e) {} },
};
const live = $('#live');
const say = msg => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 40); };
const vibrate = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
const isField = el => !!(el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 4.9v14.2a1 1 0 0 0 1.52.85l11.6-7.1a1 1 0 0 0 0-1.7L9.02 4.05A1 1 0 0 0 7.5 4.9Z" fill="currentColor"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>',
};

/* ================= Sound (Web Audio, everything synthesized) ================= */
const Sound = (() => {
  let ctx = null, out = null, noiseBuf = null, choke = null;
  let on = store.get('sound', true) !== false;
  const subs = new Set();
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
      out = ctx.createGain(); out.gain.value = on ? 0.85 : 0;
      out.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const env = (t, peak, a, d) => { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); return g; };
  const noise = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.start(t, Math.random() * 0.4, dur + 0.02); return s; };
  const filt = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
  const osc = (type, f, t, dest, dur, f2, glide) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (glide || dur * 0.7));
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  };
  function metal(t, peak, dur, dest) {
    const bp = filt('bandpass', 10000, 0.8), hp = filt('highpass', 7000), g = env(t, peak, 0.001, dur);
    bp.connect(hp).connect(g).connect(dest || out);
    [2, 3, 4.16, 5.43, 6.79, 8.21].forEach(r => osc('square', 40 * r, t, bp, dur + 0.02));
  }
  function chokeOpen(t) { if (choke) { choke.gain.setValueAtTime(1, t); choke.gain.setTargetAtTime(0.0001, t, 0.01); choke = null; } }
  const drum = {
    kick(t, v = 1) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1); o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      const g = env(t, 1 * v, 0.003, 0.42); o.connect(g).connect(out); o.start(t); o.stop(t + 0.5);
      noise(t, 0.03).connect(filt('highpass', 3000)).connect(env(t, 0.22 * v, 0.001, 0.018)).connect(out);
    },
    snare(t, v = 1) {
      noise(t, 0.26).connect(filt('highpass', 1200)).connect(env(t, 0.6 * v, 0.001, 0.19)).connect(out);
      const og = env(t, 0.5 * v, 0.001, 0.1); og.connect(out); osc('triangle', 230, t, og, 0.14, 160, 0.07);
    },
    clap(t, v = 1) {
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
      [0, 0.012, 0.024].forEach(d => { g.gain.setValueAtTime(0.75 * v, t + d); g.gain.linearRampToValueAtTime(0.06 * v, t + d + 0.01); });
      g.gain.setValueAtTime(0.6 * v, t + 0.036); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      noise(t, 0.3).connect(filt('bandpass', 1300, 0.8)).connect(g).connect(out);
    },
    hat(t, v = 1) { chokeOpen(t); metal(t, 0.26 * v, 0.05); },
    open(t, v = 1) { chokeOpen(t); const c = ctx.createGain(); c.connect(out); metal(t, 0.2 * v, 0.36, c); choke = c; },
    tom(t, v = 1) {
      const g = env(t, 0.75 * v, 0.002, 0.34); g.connect(out); osc('sine', 190, t, g, 0.4, 105, 0.22);
      noise(t, 0.05).connect(filt('lowpass', 2400)).connect(env(t, 0.08 * v, 0.001, 0.04)).connect(out);
    },
  };
  function blip(f = 880, dur = 0.06, vol = 0.16, type = 'sine') {
    if (!ensure()) return; const t = ctx.currentTime; const g = env(t, vol, 0.004, dur); g.connect(out); osc(type, f, t, g, dur + 0.02);
  }
  function chime() { if (!ensure()) return; const t = ctx.currentTime; [[880, 0], [1318.5, 0.09]].forEach(([f, d]) => { const g = env(t + d, 0.12, 0.005, 0.28); g.connect(out); osc('sine', f, t + d, g, 0.32); }); }
  function buzz() { if (!ensure()) return; const t = ctx.currentTime; const lp = filt('lowpass', 900); const g = env(t, 0.14, 0.004, 0.2); lp.connect(g).connect(out); osc('sawtooth', 110, t, lp, 0.22, 82); }
  function pop() {
    if (!ensure()) return; const t = ctx.currentTime;
    noise(t, 0.07).connect(filt('bandpass', rand(700, 2200), 1.4)).connect(env(t, 0.9, 0.0008, rand(0.03, 0.06))).connect(out);
    const og = env(t, 0.25, 0.001, 0.045); og.connect(out); osc('sine', rand(280, 460), t, og, 0.06, 90, 0.05);
  }
  function swell(f0, f1, dur) {
    if (!ensure()) return null; const t = ctx.currentTime;
    const g = ctx.createGain(), g2 = ctx.createGain(); g2.gain.value = 0.3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + Math.min(1.4, dur * 0.4));
    g.gain.setValueAtTime(0.07, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(out); g2.connect(g);
    const a = ctx.createOscillator(), b = ctx.createOscillator(); a.type = b.type = 'sine';
    a.frequency.setValueAtTime(f0, t); a.frequency.linearRampToValueAtTime(f1, t + dur);
    b.frequency.setValueAtTime(f0 * 1.5, t); b.frequency.linearRampToValueAtTime(f1 * 1.5, t + dur);
    a.connect(g); b.connect(g2); a.start(t); b.start(t); a.stop(t + dur + 0.05); b.stop(t + dur + 0.05);
    return { stop() { try { const n = ctx.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.08); a.stop(n + 0.4); b.stop(n + 0.4); } catch (e) {} } };
  }
  function tone(freq, opt = {}) {
    if (!ensure()) return null;
    const t = opt.when != null ? opt.when : ctx.currentTime, dur = opt.dur || 0.3, vol = opt.vol == null ? 0.14 : opt.vol;
    const g = env(t, vol, opt.attack || 0.006, dur); g.connect(opt.dest || out);
    return osc(opt.type || 'sine', freq, t, g, dur + 0.02, opt.to, opt.glide);
  }
  function pluck(freq, when, vol = 0.16, dest) {
    if (!ensure()) return;
    const t = when != null ? when : ctx.currentTime;
    const lp = filt('lowpass', Math.min(9000, freq * 6), 0.7); lp.connect(dest || out);
    const g1 = env(t, vol, 0.004, 0.9); g1.connect(lp); osc('triangle', freq, t, g1, 0.95);
    const g2 = env(t, vol * 0.35, 0.002, 0.25); g2.connect(lp); osc('sine', freq * 2, t, g2, 0.3);
    const g3 = env(t, vol * 0.12, 0.001, 0.05); g3.connect(lp); osc('sine', freq * 4.01, t, g3, 0.08);
  }
  function setOn(v) { on = v; store.set('sound', v); if (out) out.gain.setTargetAtTime(v ? 0.85 : 0, ctx.currentTime, 0.02); subs.forEach(fn => fn(v)); }
  return { ensure, drum, blip, chime, buzz, pop, swell, tone, pluck, env, noise, filt, osc, setOn, onChange: fn => subs.add(fn), get on() { return on; }, get ctx() { return ctx; }, get out() { return out; } };
})();

/* ================= Toy registry ================= */
const TOYS = {};
function registerToy(id, def) {
  if (!def || typeof def.mount !== 'function') { console.error('Geçersiz oyuncak:', id); return; }
  TOYS[id] = def;
  if (def.css) { const st = document.createElement('style'); st.dataset.toy = id; st.textContent = def.css; document.head.append(st); }
}

/* ================= Small shared helpers ================= */
function toast(msg, ms = 1900) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}
const siteUrl = () => location.origin + location.pathname;
async function shareResult({ title = 'Sıkıldım', text = '', url = siteUrl(), files } = {}) {
  try {
    if (files && navigator.canShare && navigator.canShare({ files })) { await navigator.share({ title, text, files }); return 'shared'; }
    if (!files && navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  if (files && files[0]) { downloadBlob(files[0], files[0].name); toast('Görsel indirildi'); return 'downloaded'; }
  try { await navigator.clipboard.writeText(text + (url ? '\n' + url : '')); toast('Panoya kopyalandı'); return 'copied'; }
  catch (e) { toast('Paylaşılamadı'); return 'failed'; }
}
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
