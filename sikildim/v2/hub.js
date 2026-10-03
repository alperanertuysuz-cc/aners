/* Sıkıldım v2 — hub, stage, routing and PWA glue. Loaded last (defer), after core.js and every toys/*.js. */
'use strict';

/* ================= Registry → shelf ================= */
const ORDER = ['kelime', 'yilan', 'ritim', 'patlat', 'refleks', 'melodi', '2048', 'duello', 'hafiza', 'kaleydoskop', 'yaz', 'yapsam', 'nefes'].filter(id => TOYS[id]);
Object.keys(TOYS).forEach(id => { if (!ORDER.includes(id)) ORDER.push(id); });
const FEATURED = 'kelime';   // the daily puzzle gets the big tile: 2×2 on desktop, full width on phones, so 13 toys fill the grid exactly
const FILTERS = [['hepsi', 'Hepsi'], ['oyun', 'Oyun'], ['kafa', 'Kafa'], ['yaratici', 'Yaratıcı'], ['sakin', 'Sakin'], ['ikili', 'İki kişilik']];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toyColor = id => `var(--${TOYS[id].color || 'yellow'})`;
const toyInk = id => `var(--${TOYS[id].cf || 'on-light'})`;

const hub = $('#hub'), shelf = $('#shelf'), stage = $('#stage'), stageBody = $('#stage-body'), veil = $('#stage-veil');
const metaEl = $('#meta'), filtersEl = $('#filters'), resumeEl = $('#resume');
const rollBtns = $$('[data-roll]');
let current = null, coverT = 0, closing = null, rolling = false;
let filter = store.get('filter', 'hepsi');

shelf.innerHTML = ORDER.map((id, i) => {
  const t = TOYS[id];
  return `<a class="tile${id === FEATURED ? ' tile--feature' : ''}" href="#${esc(id)}" data-toy="${esc(id)}" style="--c: ${toyColor(id)}; --cf: ${toyInk(id)};">
    <div class="tile-top"><span class="mono">${esc(t.kind)}</span>${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</div>
    <div class="art" aria-hidden="true">${t.art || ''}</div>
    <div><h2 class="tile-name">${esc(t.name)}</h2><p class="tile-desc">${esc(t.desc)}</p><p class="tile-stat mono" data-stat="${esc(id)}"></p></div>
  </a>`;
}).join('') + '<p class="shelf-empty" id="shelf-empty" hidden>Bu filtrede oyuncak yok.</p>';
$('#eyebrow').textContent = `Can sıkıntısına karşı ${ORDER.length} küçük oyuncak`;
const tileOf = id => shelf.querySelector(`.tile[data-toy="${CSS.escape(id)}"]`);

function renderFilters() {
  const used = FILTERS.filter(([k]) => k === 'hepsi' || ORDER.some(id => (TOYS[id].cats || []).includes(k)));
  if (!used.some(([k]) => k === filter)) filter = 'hepsi';
  filtersEl.innerHTML = used.map(([k, label]) => `<button type="button" class="chip" data-filter="${k}" aria-pressed="${k === filter}">${label}</button>`).join('');
  applyFilter();
}
function applyFilter() {
  let shown = 0;
  $$('.tile', shelf).forEach(t => { const ok = filter === 'hepsi' || (TOYS[t.dataset.toy].cats || []).includes(filter); t.hidden = !ok; if (ok) shown++; });
  $('#shelf-empty').hidden = shown > 0;
}
filtersEl.addEventListener('click', e => {
  const b = e.target.closest('[data-filter]'); if (!b) return;
  filter = b.dataset.filter; store.set('filter', filter);
  $$('[data-filter]', filtersEl).forEach(x => x.setAttribute('aria-pressed', x === b));
  applyFilter();
});

function fmtTime(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return ms > 0 ? '1 dk’dan az' : '0 dk';
  if (m < 60) return `${m} dk`;
  return `${Math.floor(m / 60)} sa ${m % 60} dk`;
}
function refreshStats() {
  ORDER.forEach(id => {
    const n = shelf.querySelector(`[data-stat="${CSS.escape(id)}"]`); if (!n) return;
    let txt = '';
    try { txt = TOYS[id].stat ? TOYS[id].stat() : ''; } catch (e) { console.error(e); }
    n.textContent = txt || ' ';
  });
  metaEl.innerHTML = `Sıkılmadan geçen süre · <b>${fmtTime(store.get('time', 0))}</b>`;
  const last = store.get('last', null);
  if (last && TOYS[last]) {
    resumeEl.hidden = false; resumeEl.href = '#' + last; resumeEl.dataset.toy = last;
    resumeEl.style.setProperty('--c', toyColor(last));
    $('#resume-name').textContent = TOYS[last].name;
  } else resumeEl.hidden = true;
}

/* ================= Stage ================= */
function setStageMeta(id) {
  const t = TOYS[id];
  stage.style.setProperty('--c', toyColor(id));
  stage.style.setProperty('--cf', toyInk(id));
  $('#stage-title').textContent = t.name;
  $('#stage-kind').textContent = `${String(ORDER.indexOf(id) + 1).padStart(2, '0')} · ${t.kind || ''}`;
  $('#stage-hint').textContent = t.hint || '';
}
function mountToy(id) {
  stageBody.innerHTML = ''; stageBody.scrollTop = 0;
  let inst = {};
  try { inst = TOYS[id].mount(stageBody) || {}; }
  catch (err) { console.error(err); stageBody.innerHTML = '<div class="toy"><p class="note">Bu oyuncak yüklenemedi. Kutuya dönüp tekrar dene.</p></div>'; }
  current = { id, inst, t0: performance.now() };
  store.set('last', id);
}
function stopToy() {
  if (!current) return;
  try { if (current.inst.destroy) current.inst.destroy(); } catch (err) { console.error(err); }
  store.set('time', store.get('time', 0) + (performance.now() - current.t0));
  current = null;
  clearTimeout(idleAudio);
  idleAudio = setTimeout(() => { if (!current && Sound.ctx && Sound.ctx.state === 'running') Sound.ctx.suspend().catch(() => {}); }, 5000);
}
let idleAudio = 0;
const veilOff = () => { veil.getAnimations().forEach(a => a.cancel()); veil.style.opacity = 0; veil.hidden = true; };
const visibleRect = el => { if (!el || el.hidden || !el.offsetParent) return null; const r = el.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight ? r : null; };
const insetFrom = (r, rad = 28) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${rad}px)`;
const FULL = 'inset(0px 0px 0px 0px round 0px)';
let openedFrom = null;

function openToy(id, opts = {}) {
  if (closing) closing();
  if (current) { if (current.id !== id) swapToy(id); return; }
  setStageMeta(id);
  root.style.setProperty('--sbw', Math.max(0, innerWidth - root.clientWidth) + 'px');
  stage.hidden = false; root.classList.add('stage-open');
  mountToy(id);
  const fromEl = opts.fromEl && visibleRect(opts.fromEl) ? opts.fromEl : tileOf(id);
  const r = !opts.instant && motionOK() ? visibleRect(fromEl) : null;
  openedFrom = r ? fromEl : null;
  if (r) {
    const rad = fromEl.classList.contains('roll') ? 30 : 28;
    veil.style.opacity = 0; veil.hidden = false;
    stage.animate([{ clipPath: insetFrom(r, rad) }, { clipPath: FULL }], { duration: 660, easing: 'cubic-bezier(.75,0,.2,1)' });
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 430, easing: 'ease-out', fill: 'backwards' }).onfinish = veilOff;
  } else veilOff();
  clearTimeout(coverT);
  coverT = setTimeout(() => { hub.inert = true; hub.classList.add('covered'); }, r ? 680 : 0);
  if (!stageBody.querySelector(':focus')) stage.focus({ preventScroll: true });
}
function swapToy(id) {
  const run = () => { stopToy(); setStageMeta(id); mountToy(id); };
  if (!motionOK()) { run(); return; }
  veil.hidden = false;
  veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
    run();
    veil.getAnimations().forEach(a => a.cancel());
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out' }).onfinish = veilOff;
  };
}
function closeToy() {
  if (!current) return;
  const id = current.id, tile = tileOf(id);
  stopToy();
  clearTimeout(coverT); hub.inert = false; hub.classList.remove('covered'); root.classList.remove('stage-open');
  refreshStats();
  const finish = () => {
    closing = null;
    stage.getAnimations().forEach(a => a.cancel()); veilOff();
    stage.hidden = true; stageBody.innerHTML = '';
  };
  let target = visibleRect(tile) ? tile : (visibleRect(openedFrom) ? openedFrom : null);
  if (!target && tile && !tile.hidden) { tile.scrollIntoView({ block: 'center' }); if (visibleRect(tile)) target = tile; }
  if (motionOK() && target) {
    const r = target.getBoundingClientRect();
    closing = finish; veil.hidden = false;
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    stage.animate([{ clipPath: FULL }, { clipPath: insetFrom(r, target.classList.contains('roll') ? 30 : 28) }], { duration: 540, delay: 140, easing: 'cubic-bezier(.7,0,.25,1)', fill: 'forwards' }).onfinish = () => { if (closing === finish) finish(); };
  } else finish();
  (target || tile || rollBtns[0]).focus({ preventScroll: true });
}
function navigate(id, fromEl) {
  if (!TOYS[id] || (current && current.id === id)) return;
  try { const d = (history.state && history.state.depth) || 0; history.pushState({ depth: d + 1 }, '', '#' + id); } catch (e) {}
  openToy(id, { fromEl });
}
function goHub() {
  const d = (history.state && history.state.depth) || 0;
  if (d > 0 && location.hash) { try { history.go(-d); return; } catch (e) {} }
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  closeToy();
}
function route() { const id = decodeURIComponent(location.hash.slice(1)); if (TOYS[id]) openToy(id); else closeToy(); }
window.addEventListener('popstate', route);

shelf.addEventListener('click', e => {
  const a = e.target.closest('a.tile');
  if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault(); if (!rolling) navigate(a.dataset.toy, a);
});
resumeEl.addEventListener('click', e => { e.preventDefault(); if (!rolling) navigate(resumeEl.dataset.toy, tileOf(resumeEl.dataset.toy)); });
stageBody.addEventListener('click', e => { const a = e.target.closest('a[data-go]'); if (!a) return; e.preventDefault(); navigate(a.dataset.go); });
$('#back').addEventListener('click', goHub);

/* ================= Dice: a slot machine inside the button ================= */
function roll(btn) {
  if (rolling || current) return;
  btn = btn && btn.offsetParent ? btn : rollBtns.find(b => b.offsetParent) || rollBtns[0];
  const ids = ORDER, n = ids.length, last = store.get('last', null);
  let target;
  do { target = Math.floor(Math.random() * n); } while (ids[target] === last && n > 1);
  if (!motionOK()) { navigate(ids[target], btn); return; }
  rolling = true;
  const label = $('.roll-label', btn), base = label.textContent;
  btn.classList.add('is-rolling'); shelf.classList.add('rolling');
  let i = Math.floor(Math.random() * n), h = 0;
  const hops = 2 * n + ((target - i + n) % n);
  const step = () => {
    const id = ids[i];
    label.textContent = TOYS[id].name;
    btn.style.setProperty('--rc', toyColor(id));
    $$('.tile.lit', shelf).forEach(t => t.classList.remove('lit'));
    const t = tileOf(id); if (t) t.classList.add('lit');
    Sound.blip(520 + h * 22, 0.035, 0.08, 'triangle');
    if (h === hops) {
      vibrate(12);
      setTimeout(() => {
        shelf.classList.remove('rolling'); $$('.tile.lit', shelf).forEach(x => x.classList.remove('lit'));
        btn.classList.remove('is-rolling'); label.textContent = base; rolling = false;
        navigate(id, btn);
      }, 420);
      return;
    }
    h++; i = (i + 1) % n;
    setTimeout(step, 40 + Math.pow(h / hops, 2.6) * 280);
  };
  step();
}
rollBtns.forEach(b => b.addEventListener('click', () => roll(b)));

const dot = $('#dot'), DOTS = ['orange', 'yellow', 'green', 'sky', 'pink', 'cobalt', 'mint', 'lilac', 'red', 'lime'];
let dotI = 0;
dot.addEventListener('click', () => {
  dotI = (dotI + 1) % DOTS.length; dot.style.setProperty('--dot', `var(--${DOTS[dotI]})`);
  Sound.blip(440 * Math.pow(2, dotI / 7), 0.09, 0.14, 'sine');
  if (motionOK()) dot.animate([{ transform: 'none' }, { transform: 'translateY(-.55em) scale(.92,1.08)', offset: 0.38 }, { transform: 'translateY(0) scale(1.18,.82)', offset: 0.72 }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
});

/* ================= Sound + theme ================= */
const soundBtns = $$('.sound-btn');
function syncSound() { soundBtns.forEach(b => { b.setAttribute('aria-pressed', Sound.on); b.querySelector('.lbl').textContent = Sound.on ? 'Ses açık' : 'Ses kapalı'; b.setAttribute('aria-label', Sound.on ? 'Sesi kapat' : 'Sesi aç'); }); }
soundBtns.forEach(b => b.addEventListener('click', () => { Sound.setOn(!Sound.on); if (Sound.on) Sound.blip(880, 0.06, 0.12); }));
Sound.onChange(syncSound);
const themeBtn = $('#theme-btn'), darkMQ = matchMedia('(prefers-color-scheme: dark)');
const savedTheme = store.get('theme', null);
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : darkMQ.matches);
function syncTheme() {
  const d = isDark();
  themeBtn.setAttribute('aria-label', d ? 'Açık temaya geç' : 'Koyu temaya geç');
  themeBtn.querySelector('.lbl').textContent = d ? 'Koyu' : 'Açık';
  const bg = getComputedStyle(document.body).backgroundColor;
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bg));
}
const themeEvent = () => window.dispatchEvent(new CustomEvent('sikildim:theme', { detail: { dark: isDark() } }));
themeBtn.addEventListener('click', () => { root.dataset.theme = isDark() ? 'light' : 'dark'; store.set('theme', root.dataset.theme); syncTheme(); themeEvent(); });
if (darkMQ.addEventListener) darkMQ.addEventListener('change', () => { syncTheme(); themeEvent(); });

/* ================= Reset with in-page confirmation ================= */
const resetZone = $('#reset-zone');
resetZone.addEventListener('click', e => {
  if (e.target.id === 'reset') {
    resetZone.innerHTML = '<span>Tüm skorlar ve kayıtlar silinsin mi?</span><button type="button" class="link-btn danger" id="reset-yes">Evet, sıfırla</button><button type="button" class="link-btn" id="reset-no">Vazgeç</button>';
    $('#reset-no').focus();
  } else if (e.target.id === 'reset-yes') {
    store.reset(['theme', 'sound', 'filter']); refreshStats();
    resetZone.innerHTML = '<span>Sıfırlandı.</span><button type="button" class="link-btn" id="reset">Skorları sıfırla</button>';
    say('Skorlar sıfırlandı.');
  } else if (e.target.id === 'reset-no') {
    resetZone.innerHTML = '<button type="button" class="link-btn" id="reset">Skorları sıfırla</button>';
    $('#reset').focus();
  }
});

/* ================= Keyboard ================= */
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (current) {
    if (current.inst.onKey) { try { current.inst.onKey(e); } catch (err) { console.error(err); } }
    if (e.key === 'Escape' && !e.defaultPrevented && current) { e.preventDefault(); goHub(); }
    return;
  }
  if (e.key === 'Escape') { const sw = $('.sheet-wrap'); if (sw) { sw.remove(); return; } }
  if (isField(e.target) || e.repeat) return;
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, ORDER.length)) { e.preventDefault(); navigate(ORDER[n - 1], tileOf(ORDER[n - 1])); }
  else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); roll(); }
});

/* ================= PWA: install + offline + updates ================= */
const installBtns = [$('#dock-install'), $('#foot-install')];
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installPrompt = null;
function syncInstall() { const can = !isStandalone() && (installPrompt || isIOS); installBtns.forEach(b => { b.hidden = !can; }); }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; syncInstall(); });
window.addEventListener('appinstalled', () => { installPrompt = null; syncInstall(); toast('Ana ekrana eklendi'); });
function iosSheet() {
  const wrap = document.createElement('div'); wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ios-h">
    <h2 id="ios-h">Ana ekrana ekle</h2>
    <ol>
      <li>Safari’nin alt çubuğundaki <strong>Paylaş</strong> simgesine dokun <svg class="share-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg></li>
      <li>Listeden <strong>Ana Ekrana Ekle</strong>’yi seç.</li>
      <li>Sağ üstte <strong>Ekle</strong>’ye dokun. Sıkıldım artık bir uygulama gibi açılır, internet olmadan da çalışır.</li>
    </ol>
    <button type="button" class="btn primary" data-close>Tamam</button>
  </div>`;
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) wrap.remove(); });
  document.body.append(wrap);
  $('[data-close]', wrap).focus();
}
installBtns.forEach(b => b.addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (e) {}
    installPrompt = null; syncInstall();
  } else if (isIOS) iosSheet();
}));

let wantReload = false;
function showUpdate(reg) {
  if ($('.update-bar')) return;
  const bar = document.createElement('div'); bar.className = 'update-bar'; bar.setAttribute('role', 'status');
  bar.innerHTML = '<span>Yeni sürüm hazır</span><button type="button">Yenile</button>';
  bar.querySelector('button').addEventListener('click', () => { wantReload = true; if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' }); else location.reload(); });
  document.body.append(bar);
}
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (wantReload) { wantReload = false; location.reload(); } });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (nw) nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(reg); });
      });
    }).catch(err => console.warn('Service worker kaydedilemedi', err));
  });
}

/* ================= Load choreography + boot ================= */
if (motionOK()) {
  $('.title-word').animate([{ transform: 'translateY(.18em)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  dot.animate([
    { transform: 'translateY(-2.2em)', opacity: 0, offset: 0 },
    { transform: 'translateY(-2.2em)', opacity: 1, offset: 0.08 },
    { transform: 'translateY(0) scale(1.22,.78)', offset: 0.5 },
    { transform: 'translateY(-.42em) scale(.95,1.05)', offset: 0.68 },
    { transform: 'translateY(0) scale(1.08,.92)', offset: 0.84 },
    { transform: 'translateY(-.08em)', offset: 0.92 },
    { transform: 'none', opacity: 1, offset: 1 },
  ], { duration: 1150, delay: 380, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'backwards' });
  $$('.tile', shelf).forEach((t, k) => t.animate([{ transform: 'translateY(26px)', opacity: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 720, delay: 140 + Math.min(k, 8) * 50, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
}
/* Keep the headline on one line even with a wide fallback font (before web fonts load, or offline on first visit). */
const titleEl = $('.title');
function fitTitle() {
  titleEl.style.fontSize = '';
  const main = titleEl.parentElement, twoCol = getComputedStyle(main).gridTemplateColumns.trim().split(/\s+/).length > 1;
  const avail = main.clientWidth - (twoCol ? 440 : 0), need = titleEl.scrollWidth;
  if (need > avail) titleEl.style.fontSize = (parseFloat(getComputedStyle(titleEl).fontSize) * avail / need * 0.98).toFixed(1) + 'px';
}
let fitRaf = 0;
addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitTitle); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
fitTitle();
renderFilters(); refreshStats(); syncSound(); syncTheme(); syncInstall();
(() => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && TOYS[id]) { try { history.replaceState({ depth: 0 }, '', '#' + id); } catch (e) {} openToy(id, { instant: true }); }
})();
