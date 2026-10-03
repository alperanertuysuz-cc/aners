/* Kaleydoskop — simetrik çizim: tek bir çizgi 6–16 kez yansır; geri al, fırça kalınlığı, PNG olarak kaydet */
(() => {
'use strict';
const PALETTES = {
  gunbatimi: { name: 'Gün batımı', c: ['#FF7EB3', '#FF6B2C', '#FFC83A', '#FFE9C9'] },
  deniz: { name: 'Deniz', c: ['#5DB6FF', '#2E54EA', '#93D8C0', '#E6F5FF'] },
  orman: { name: 'Orman', c: ['#22B36C', '#93D8C0', '#FFC83A', '#F1FFE8'] },
  seker: { name: 'Şeker', c: ['#FF7EB3', '#FFE58A', '#93D8C0', '#FFF4F8'] },
  gokkusagi: { name: 'Gökkuşağı', c: ['#F2493B', '#FF6B2C', '#FFC83A', '#C6EE4B', '#22B36C', '#5DB6FF', '#2E54EA', '#FF7EB3'], sp: 0.6 },
  tebesir: { name: 'Tebeşir', c: ['#F4F4F5', '#9AA0AA', '#E9EAEE', '#C9CDD3'] },
};
const PAL_IDS = Object.keys(PALETTES);
const V1_PALS = ['gunbatimi', 'deniz', 'orman', 'tebesir'];   // the only values V1 knows for 'kal-pal'
const SYMS = [6, 8, 12, 16];
/* k scales the speed-based stroke width; d is the dot drawn on the button */
const BRUSHES = { ince: { name: 'İnce', k: 0.5, d: 4 }, orta: { name: 'Orta', k: 1, d: 8 }, kalin: { name: 'Kalın', k: 1.9, d: 13 } };
const BRUSH_IDS = Object.keys(BRUSHES);
const MAX_UNDO = 12;
const MAX_PX = 1600;                      // canvas backing store cap (keeps 12 undo snapshots affordable)
const BG = '#0E0F12';                     // = --canvas, same in both themes
const GLOW = [[3.4, 0.3], [2.3, 0.6], [1.5, 1]];   // glow bands: [width × brush, brightness]
/* Side-by-side layout (canvas left, tools right). FULL adds labels, the swatch row and key hints. Keep in sync with the CSS below. */
const FULL_Q = '(min-width: 980px) and (min-height: 600px)';
const SIDE_Q = `${FULL_Q}, (orientation: landscape) and (max-height: 599px) and (min-width: 600px)`;

const swatchBg = k => `conic-gradient(${PALETTES[k].c.concat(PALETTES[k].c[0]).join(', ')})`;
function readSettings() {
  const o = store.get('kal2', null), s = o && typeof o === 'object' ? o : {};
  let sym = store.get('kal-sym', 8);
  if (!SYMS.includes(sym)) sym = 8;
  const mirror = store.get('kal-mirror', true) !== false;
  const v1 = store.get('kal-pal', 'gunbatimi');
  /* V2-only palettes live in kal2; for the shared ones follow 'kal-pal', so a change made in V1 still shows up here. */
  let pal = PALETTES[s.pal] && !V1_PALS.includes(s.pal) ? s.pal : PALETTES[v1] ? v1 : 'gunbatimi';
  if (!PALETTES[pal]) pal = 'gunbatimi';
  const brush = BRUSHES[s.brush] ? s.brush : 'orta';
  return { sym, mirror, pal, brush };
}

const UNDO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14.5 4 9.5l5-5"/><path d="M4 9.5h10a5.5 5.5 0 0 1 0 11h-3"/></svg>';
const CLEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5h16"/><path d="M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7"/><path d="M6.3 6.5 7.2 19a1.6 1.6 0 0 0 1.6 1.5h6.4a1.6 1.6 0 0 0 1.6-1.5l.9-12.5"/><path d="M10.2 10.5v6M13.8 10.5v6"/></svg>';
const SAVE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/></svg>';
const CYCLE_SVG = '<svg class="kal-cyc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 11a7.5 7.5 0 0 1 13-4.2L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 13a7.5 7.5 0 0 1-13 4.2L4.5 15"/><path d="M4.5 19.5V15H9"/></svg>';

registerToy('kaleydoskop', {
  name: 'Kaleydoskop', color: 'pink', cf: 'on-light', kind: 'Çizim', open: 'Kaleydoskop’u aç',
  cats: ['yaratici', 'sakin'],
  desc: 'Tek bir çizgi çiz, on altı kez yansısın. Beğendiğini görsel olarak kaydet.',
  art: '<div class="kal-mini"><i></i><i></i><i></i></div>',
  stat: () => { const s = readSettings(); return `${s.sym}× · ${PALETTES[s.pal].name}`; },
  css: `
.kal-mini { position: relative; width: 118px; aspect-ratio: 1; transition: transform 2.4s var(--ease); }
.kal-mini i { position: absolute; border-radius: 50%; }
.kal-mini i:nth-child(1) {
  inset: 0; background: repeating-conic-gradient(var(--on-light) 0 5deg, transparent 5deg 15deg);
  -webkit-mask: radial-gradient(circle, transparent 0 56%, #000 57% 100%); mask: radial-gradient(circle, transparent 0 56%, #000 57% 100%);
}
.kal-mini i:nth-child(2) {
  inset: 18%; background: repeating-conic-gradient(var(--paper) 0 15deg, transparent 15deg 30deg);
  -webkit-mask: radial-gradient(circle, transparent 0 30%, #000 31% 100%); mask: radial-gradient(circle, transparent 0 30%, #000 31% 100%);
}
.kal-mini i:nth-child(3) { inset: 40%; background: var(--on-light); }
.tile:hover .kal-mini { transform: rotate(60deg); }

.kal-root { --s: 320px; --pw: 340px; gap: clamp(12px, 2vh, 18px); -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; touch-action: manipulation; }
.kal-root svg { width: 20px; height: 20px; flex: none; }
.kal-root kbd { display: none; }

/* actions: undo · clear ··· auto · save */
.kal-root .kal-bar { display: flex; align-items: center; gap: 8px; width: var(--s); min-width: min(100%, 300px); max-width: 100%; }
.kal-root .kal-sp { flex: 1 1 0; min-width: 0; }
.kal-root .kal-ib {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: none; width: 44px; height: 44px; border-radius: 999px;
  background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); font-size: 15px; font-weight: 600; white-space: nowrap;
  transition: background .2s, transform .3s var(--spring), opacity .2s;
}
.kal-root .kal-ib:hover:not(:disabled) { background: var(--panel-2); }
.kal-root .kal-ib:active:not(:disabled) { transform: scale(.93); transition-duration: .1s; }
.kal-root .kal-ib:disabled { opacity: .36; cursor: default; }
.kal-root .kal-ib .kal-t { display: none; }
.kal-root .kal-auto { flex: none; height: 44px; padding: 0 15px; gap: 8px; white-space: nowrap; }
.kal-root .kal-ai { display: none; place-items: center; }
.kal-root .kal-auto svg { width: 15px; height: 15px; }
.kal-root .kal-save {
  flex: none; height: 44px; padding: 0 18px 0 14px; gap: 8px; font-size: 15px;
  background: var(--c); color: var(--cf); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .12);
}
.kal-root .kal-save:hover { background: var(--c); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .12), 0 12px 26px -16px var(--shade); }
.kal-root .kal-save[disabled] { opacity: .5; }
.kal-root .kal-bar.tight .kal-auto { width: 44px; padding: 0; justify-content: center; }
.kal-root .kal-bar.tight .kal-auto .kal-t { display: none; }
.kal-root .kal-bar.tight .kal-ai { display: grid; }
.kal-root .kal-bar.tighter .kal-save { width: 44px; padding: 0; }
.kal-root .kal-bar.tighter .kal-save span { display: none; }

/* canvas */
.kal-root .kal-stage {
  position: relative; flex: none; width: var(--s); max-width: 100%; aspect-ratio: 1; border-radius: var(--r-xl); overflow: hidden; isolation: isolate;
  background: var(--canvas); box-shadow: 0 36px 70px -44px var(--shade); touch-action: none; cursor: crosshair;
}
.kal-root .kal-stage::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .06); pointer-events: none; }
.kal-root .kal-stage canvas { display: block; width: 100%; height: 100%; transition: opacity .22s; }
.kal-root .kal-hint {
  position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); padding: 8px 14px; border-radius: 999px;
  background: rgba(255, 255, 255, .08); color: var(--canvas-fg); pointer-events: none; white-space: nowrap; transition: opacity .4s;
}
.kal-root .kal-flash { position: absolute; inset: 0; background: #FFFDF8; opacity: 0; pointer-events: none; }

/* settings: [symmetry · mirror] / [palette · brush] */
.kal-root .kal-opts { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 8px; width: 100%; }
.kal-root .kal-grp { display: flex; min-width: 0; max-width: 100%; }
.kal-root .kal-g-sym { flex: 1 0 100%; justify-content: center; }
.kal-root .kal-lbl, .kal-root .kal-swatches { display: none; }
.kal-root .kal-lbl b { color: var(--fg); font-weight: 600; }
.kal-root .kal-row { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
.kal-root .seg { flex-wrap: nowrap; gap: 2px; padding: 3px; flex: none; }
.kal-root .seg button { position: relative; min-height: 38px; padding: 0 13px; }
.kal-root .seg button::after { content: ""; position: absolute; inset: -3px -1px; }
.kal-root .kal-sym button { min-width: 46px; font-variant-numeric: tabular-nums; }
.kal-root .kal-brush button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-width: 46px; padding: 0 12px; }
.kal-root .kal-dot { width: var(--d); height: var(--d); border-radius: 50%; background: currentColor; flex: none; }
.kal-root .kal-brush .kal-t, .kal-root .kal-tip { display: none; }
.kal-root .kal-opts .chip { flex: none; height: 44px; }
.kal-root .kal-mirror { padding: 0 16px; }
.kal-root .kal-pal-cycle { padding: 0 13px 0 10px; gap: 9px; color: var(--fg); }
.kal-root .kal-pal-cycle:hover { box-shadow: inset 0 0 0 1.5px var(--fg); }
.kal-root .kal-sw { width: 22px; height: 22px; border-radius: 50%; flex: none; box-shadow: inset 0 0 0 1px rgba(22, 23, 26, .1); }
.kal-root .kal-pal-cycle .kal-cyc { width: 14px; height: 14px; opacity: .45; }
.kal-root .kal-pal-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kal-root .kal-swatches { gap: 4px; }
.kal-root .kal-swb { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; }
.kal-root .kal-swb i {
  width: 32px; height: 32px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(22, 23, 26, .1);
  transition: transform .35s var(--spring), box-shadow .2s;
}
.kal-root .kal-swb:hover i { transform: scale(1.08); }
.kal-root .kal-swb[aria-pressed="true"] i { box-shadow: 0 0 0 3px var(--bg), 0 0 0 5px var(--fg); }
@media (max-width: 359px) {
  .kal-root .seg button { padding: 0 11px; }
  .kal-root .kal-sym button, .kal-root .kal-brush button { min-width: 42px; }
  .kal-root .kal-pal-cycle .kal-cyc { display: none; }
  .kal-root .kal-pal-cycle { padding: 0 12px 0 10px; }
  .kal-root .kal-stage { border-radius: 22px; }
}

@media ${SIDE_Q} {
  .kal-root.toy {
    display: grid; grid-template-columns: var(--s) var(--pw); grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas: "stage opts" "stage ." "stage bar"; justify-content: center; align-items: start;
    column-gap: clamp(20px, 2.6vw, 40px); row-gap: 14px;
  }
  .kal-root .kal-stage { grid-area: stage; }
  .kal-root .kal-opts { grid-area: opts; justify-content: flex-start; }
  .kal-root .kal-g-sym { justify-content: flex-start; }
  .kal-root .kal-bar { grid-area: bar; width: auto; min-width: 0; }
}
@media ${FULL_Q} {
  .kal-root { --pw: 320px; }
  .kal-root .kal-opts { display: grid; gap: 24px; align-content: start; }
  .kal-root .kal-grp { display: grid; gap: 10px; justify-items: start; }
  .kal-root .kal-lbl { display: block; color: var(--mute); }
  .kal-root .kal-pal-cycle { display: none; }
  .kal-root .kal-swatches { display: flex; margin-left: -6px; }
  .kal-root .kal-brush .kal-t { display: inline; }
  .kal-root .kal-brush button { padding: 0 16px 0 14px; }
  .kal-root .kal-tip { display: block; max-width: 30ch; color: var(--mute); font-size: 14.5px; line-height: 1.4; }
  .kal-root .kal-ai { display: grid; }
  .kal-root .kal-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .kal-root .kal-sp { display: none; }
  .kal-root .kal-ib { width: auto; padding: 0 14px; }
  .kal-root .kal-ib .kal-t { display: inline; }
  .kal-root .kal-auto, .kal-root .kal-save { grid-column: 1 / -1; justify-content: center; width: auto; }
  .kal-root .kal-save { height: 52px; font-size: 16px; }
  .kal-root .kal-save kbd { color: var(--cf); }
}
@media ${FULL_Q} and (hover: hover) {
  .kal-root kbd { display: inline-grid; }
  .kal-root .kal-ib kbd { margin-left: -2px; }
}
`,
  hint: 'Z geri al · C temizle · S kaydet · O kendiliğinden',
  mount(el) {
    const set = readSettings();
    let sym = set.sym, mirror = set.mirror, palKey = set.pal, brush = set.brush;
    el.innerHTML = `
      <div class="toy kal-root">
        <div class="kal-bar" id="kal-bar">
          <button type="button" class="kal-ib" data-act="undo" aria-label="Geri al" title="Geri al" disabled>${UNDO_SVG}<span class="kal-t">Geri al</span><kbd>Z</kbd></button>
          <button type="button" class="kal-ib" data-act="clear" aria-label="Temizle" title="Temizle" disabled>${CLEAR_SVG}<span class="kal-t">Temizle</span><kbd>C</kbd></button>
          <span class="kal-sp" aria-hidden="true"></span>
          <button type="button" class="chip kal-auto" data-act="auto" aria-pressed="false" aria-label="Kendiliğinden" title="Kendiliğinden çizsin"><span class="kal-ai">${ICON.play}</span><span class="kal-t">Kendiliğinden</span><kbd>O</kbd></button>
          <button type="button" class="btn kal-save" data-act="save" aria-label="Kaydet" disabled>${SAVE_SVG}<span>Kaydet</span><kbd>S</kbd></button>
        </div>
        <div class="kal-stage" id="kal-stage">
          <canvas id="kal-cv" role="img" aria-label="Kaleydoskop çizim alanı"></canvas>
          <p class="kal-hint mono" id="kal-hint">Sürükle ve çiz</p>
          <i class="kal-flash" id="kal-flash" aria-hidden="true"></i>
        </div>
        <div class="kal-opts" id="kal-opts">
          <div class="kal-grp kal-g-sym">
            <p class="mono kal-lbl">Simetri</p>
            <div class="kal-row">
              <div class="seg kal-sym" role="group" aria-label="Simetri">${SYMS.map((n, i) => `<button type="button" data-sym="${n}" aria-pressed="${n === sym}" title="${n} kat simetri (${i + 1})">${n}×</button>`).join('')}</div>
              <button type="button" class="chip kal-mirror" data-act="mirror" aria-pressed="${mirror}" title="Ayna (A)">Ayna<kbd>A</kbd></button>
            </div>
          </div>
          <div class="kal-grp kal-g-pal">
            <p class="mono kal-lbl">Renk · <b id="kal-pal-name"></b></p>
            <button type="button" class="chip kal-pal-cycle" data-act="pal" id="kal-pal-cycle"><i class="kal-sw" id="kal-sw"></i><span class="kal-pal-t" id="kal-pal-t"></span>${CYCLE_SVG}</button>
            <div class="kal-swatches" role="group" aria-label="Renkler">${PAL_IDS.map(k => `<button type="button" class="kal-swb" data-pal="${k}" aria-pressed="${k === palKey}" aria-label="${PALETTES[k].name}" title="${PALETTES[k].name}"><i style="background:${swatchBg(k)}"></i></button>`).join('')}</div>
          </div>
          <div class="kal-grp kal-g-brush">
            <p class="mono kal-lbl">Fırça</p>
            <div class="seg kal-brush" role="group" aria-label="Fırça">${BRUSH_IDS.map(k => `<button type="button" data-brush="${k}" aria-pressed="${k === brush}" aria-label="${BRUSHES[k].name}" title="${BRUSHES[k].name} (B)"><i class="kal-dot" style="--d:${BRUSHES[k].d}px" aria-hidden="true"></i><span class="kal-t">${BRUSHES[k].name}</span></button>`).join('')}</div>
            <p class="kal-tip">Yavaş çizdikçe çizgi kalınlaşır, hızlandıkça incelir.</p>
          </div>
        </div>
      </div>`;
    const rootEl = $('.kal-root', el), bar = $('#kal-bar', el), opts = $('#kal-opts', el);
    const stageEl = $('#kal-stage', el), cv = $('#kal-cv', el), g = cv.getContext('2d'), hint = $('#kal-hint', el), flashEl = $('#kal-flash', el);
    const btn = a => $(`[data-act="${a}"]`, bar);
    const undoBtn = btn('undo'), clearBtn = btn('clear'), autoBtn = btn('auto'), saveBtn = btn('save');
    const sideMQ = matchMedia(SIDE_Q), deskMQ = matchMedia('(hover: hover) and (pointer: fine)');

    let size = 0, dpr = 1, hueT = Math.random(), rgb = [], pen = null, auto = false, raf = 0, demoT = 0, autoPen = null, seed = [], hinted = false;
    let alive = true, dirty = false, clearT = 0, ver = 0, blobP = null, blobVer = -1, prepT = 0, saving = false;
    const hist = [];                         // undo snapshots: { c: canvas, dirty }

    /* ---------- colour ---------- */
    const parse = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    function setPal() { rgb = PALETTES[palKey].c.map(parse); }
    function colorAt(t) {
      const n = rgb.length, x = ((t % 1) + 1) % 1 * n, i = Math.floor(x), f = x - i, a = rgb[i], b = rgb[(i + 1) % n];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }

    /* ---------- canvas ---------- */
    function paintBg() { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = BG; g.fillRect(0, 0, cv.width, cv.height); g.restore(); }
    function resize(s) {
      if (Math.abs(s - size) < 2 && cv.width) return;
      const relayer = !!(lay && lay.on);     // mid-stroke: flatten, rescale, then keep drawing on fresh layers
      if (relayer) layerEnd();
      let tmp = null;
      if (size && cv.width) { tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height; tmp.getContext('2d').drawImage(cv, 0, 0); }
      const old = size;
      size = s; dpr = Math.min(2, window.devicePixelRatio || 1, MAX_PX / s);
      cv.width = Math.round(s * dpr); cv.height = Math.round(s * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); paintBg();
      if (tmp) { g.drawImage(tmp, 0, 0, s, s); tmp.width = tmp.height = 0; }
      if (pen && old) { pen.x *= s / old; pen.y *= s / old; pen.w *= s / old; }
      autoPen = null; ver++;
      if (relayer) layerBegin();
    }
    function markDirty() { ver++; if (!dirty) { dirty = true; syncBtns(); } }
    /* Stroke layers. The stroke in progress (or the auto pen) is drawn opaque onto its own glow and core layers, which are then
       screened over a copy of the canvas from before the stroke. Overlapping segment caps no longer stack up into a bead chain,
       while separate strokes still glow where they cross. */
    let lay = null;
    const mkCv = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; return c; };
    function layerFree() { if (lay) { [lay.base, lay.halo, lay.core].forEach(c => { c.width = c.height = 0; }); lay = null; } }
    function layerBegin() {
      if (!lay || lay.base.width !== cv.width || lay.base.height !== cv.height) {
        layerFree();
        const base = mkCv(), halo = mkCv(), core = mkCv();
        lay = { base, halo, core, bg: base.getContext('2d'), hg: halo.getContext('2d'), cg: core.getContext('2d'), on: false, fresh: false };
      }
      lay.bg.setTransform(1, 0, 0, 1, 0, 0); lay.bg.globalCompositeOperation = 'source-over'; lay.bg.globalAlpha = 1; lay.bg.drawImage(cv, 0, 0);   // cv is opaque: a plain copy
      [lay.hg, lay.cg].forEach(x => { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, cv.width, cv.height); x.setTransform(dpr, 0, 0, dpr, 0, 0); });
      lay.on = true; lay.fresh = false;
    }
    function layerEnd() { if (lay && lay.on) { compose(); lay.on = false; } }
    function compose() {
      if (!lay || !lay.on || !lay.fresh) return;
      lay.fresh = false;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.drawImage(lay.base, 0, 0);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.24; g.drawImage(lay.halo, 0, 0);
      g.globalAlpha = 0.95; g.drawImage(lay.core, 0, 0);
      g.restore();
    }
    function draw(x0, y0, x1, y1, w, col) {
      const c = size / 2, path = new Path2D();
      for (let k = 0; k < sym; k++) {
        const a = k * TAU / sym, ca = Math.cos(a), sa = Math.sin(a);
        path.moveTo(x0 * ca - y0 * sa, x0 * sa + y0 * ca); path.lineTo(x1 * ca - y1 * sa, x1 * sa + y1 * ca);
        if (mirror) { path.moveTo(x0 * ca + y0 * sa, x0 * sa - y0 * ca); path.lineTo(x1 * ca + y1 * sa, x1 * sa - y1 * ca); }
      }
      const css = k => `rgb(${Math.round(col[0] * k)},${Math.round(col[1] * k)},${Math.round(col[2] * k)})`;
      const pass = (x, mode, alpha, lw, k) => {
        x.save(); x.translate(c, c); x.globalCompositeOperation = mode; x.globalAlpha = alpha;
        x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = css(k); x.lineWidth = lw; x.stroke(path); x.restore();
      };
      /* Glow: three opaque bands, dimmer toward the edge; 'lighten' keeps the brightest band, so overlaps never build up. */
      if (lay && lay.on) { GLOW.forEach(([m, k]) => pass(lay.hg, 'lighten', 1, w * m, k)); pass(lay.cg, 'source-over', 1, w, 1); lay.fresh = true; }
      else { pass(g, 'screen', 0.13, w * 2.8, 1); pass(g, 'screen', 0.95, w, 1); }
      markDirty();
    }
    /* Faster strokes get thinner; the brush scales the whole range. */
    function seg(st, x, y) {
      const dx = x - st.x, dy = y - st.y, d = Math.hypot(dx, dy);
      if (d < 0.6) return;
      const mx = st.max || 10, k = size / 600 * BRUSHES[brush].k, target = clamp(mx - d * 0.32, 1.4, mx) * k;
      st.w += (target - st.w) * 0.35;
      hueT += d / (size * 1.6) * (PALETTES[palKey].sp || 1);
      const c = size / 2;
      draw(st.x - c, st.y - c, x - c, y - c, st.w, colorAt(hueT));
      st.x = x; st.y = y;
    }
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (size / r.width), y: (e.clientY - r.top) * (size / r.height) }; };
    function hideHint() { if (!hinted) { hinted = true; hint.style.opacity = 0; } }

    /* ---------- undo: one snapshot per stroke, clear or auto run ---------- */
    function snap() {
      const c = hist.length >= MAX_UNDO ? hist.shift().c : document.createElement('canvas');
      if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; }
      c.getContext('2d').drawImage(cv, 0, 0);
      hist.push({ c, dirty });
      syncBtns();
    }
    function undo() {
      if (!hist.length) return false;
      finishClear(); stopAuto(); pen = null;
      if (lay) lay.on = false;                  // a stroke still in progress is dropped, not flattened
      const h = hist.pop();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.drawImage(h.c, 0, 0, cv.width, cv.height); g.restore();
      h.c.width = h.c.height = 0;               // frees the bitmap right away (iOS keeps canvas memory until GC otherwise)
      dirty = h.dirty; ver++;
      syncBtns(); prep(); vibrate(10);
      say(hist.length ? 'Geri alındı' : 'Geri alındı, başa dönüldü');
      return true;
    }
    /* Blank canvas; the auto pen may keep drawing, so its layers start over too. */
    function wipe() {
      paintBg();
      if (lay && lay.on) {
        lay.bg.drawImage(cv, 0, 0);
        [lay.hg, lay.cg].forEach(x => { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.restore(); });
      }
    }
    function finishClear() { if (clearT) { clearTimeout(clearT); clearT = 0; wipe(); cv.style.opacity = 1; } }
    function clear() {
      finishClear();
      if (!dirty) return;
      snap(); dirty = false; ver++; syncBtns(); vibrate(10); say('Temizlendi');
      if (motionOK()) { cv.style.opacity = 0; clearT = setTimeout(() => { clearT = 0; wipe(); cv.style.opacity = 1; }, 220); }
      else wipe();
    }
    function syncBtns() {
      undoBtn.disabled = !hist.length;
      clearBtn.disabled = !dirty;
      saveBtn.disabled = !dirty;
    }

    /* ---------- auto mode ---------- */
    /* Older lines sink back into the dark (every 4th frame, by 5%: ~1 s half-life). Scaling toward black keeps their hue
       (an 8-bit fade toward the background colour drifts teal and leaves ghosts) and 'lighten' with the background stops the
       base from going darker than the canvas. The layers fade at the same rate and are folded into the base every 2 s. */
    function fadeStep() {
      if (!lay || !lay.on) return;
      const b = lay.bg;
      b.fillStyle = 'rgba(0,0,0,0.05)'; b.fillRect(0, 0, cv.width, cv.height);
      b.globalCompositeOperation = 'lighten'; b.fillStyle = BG; b.fillRect(0, 0, cv.width, cv.height);
      b.globalCompositeOperation = 'source-over';
      [lay.hg, lay.cg].forEach(x => {
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,0.05)';
        x.fillRect(0, 0, cv.width, cv.height); x.restore();
      });
      lay.fresh = true;
    }
    function startAuto(fade) {
      stopAuto(); auto = true; autoBtn.setAttribute('aria-pressed', 'true'); $('.kal-ai', autoBtn).innerHTML = ICON.stop;
      layerBegin();
      seed = Array.from({ length: 4 }, () => rand(0, TAU)); autoPen = null;
      const t0 = performance.now();
      let frames = 0;
      const loop = now => {
        const t = (now - t0) / 1000, R = size * 0.46;
        const r = R * (0.3 + 0.64 * (0.5 + 0.5 * Math.sin(t * 1.25 + seed[0])) * (0.75 + 0.25 * Math.sin(t * 0.41 + seed[1])));
        const a = seed[3] + t * 1.05 + 0.8 * Math.sin(t * 0.6 + seed[2]);
        const x = size / 2 + r * Math.cos(a), y = size / 2 + r * Math.sin(a);
        if (fade && frames % 4 === 0) fadeStep();
        if (!autoPen) autoPen = { x, y, w: 2.5 * size / 600 * BRUSHES[brush].k, max: 5.5 }; else seg(autoPen, x, y);
        compose();
        if (fade && ++frames % 120 === 0) layerBegin();     // fold the newest lines into the fading base
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    function stopAuto() {
      clearTimeout(demoT);
      if (!auto) return;
      auto = false; cancelAnimationFrame(raf); layerEnd();
      autoBtn.setAttribute('aria-pressed', 'false'); $('.kal-ai', autoBtn).innerHTML = ICON.play;
      prep();
    }
    function toggleAuto() {
      if (auto) { stopAuto(); return; }
      hideHint(); finishClear(); snap(); startAuto(true);
      say('Kendiliğinden çiziyor');
    }

    /* ---------- save as PNG ---------- */
    function blob() {
      if (blobP && blobVer === ver) return blobP;
      blobVer = ver;
      blobP = new Promise(res => { try { cv.toBlob(b => res(b), 'image/png'); } catch (e) { res(null); } });
      return blobP;
    }
    /* Encode ahead of time while idle, so the share sheet opens straight from the tap (iOS wants it inside the gesture). */
    function prep() { clearTimeout(prepT); prepT = setTimeout(() => { if (alive && dirty && !auto && !pen && !clearT) blob(); }, 1100); }
    function flash() {
      if (!motionOK()) return;
      flashEl.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    async function save() {
      if (saving) return;
      finishClear();
      if (!dirty) return;
      saving = true;
      const b = await blob();
      saving = false;
      if (!alive) return;
      if (!b) { toast('Kaydedilemedi'); return; }
      let file;
      try { file = new File([b], 'kaleydoskop.png', { type: 'image/png' }); } catch (e) { file = b; file.name = 'kaleydoskop.png'; }
      flash(); vibrate(10);
      if (deskMQ.matches) { downloadBlob(file, 'kaleydoskop.png'); toast('Görsel indirildi'); return; }
      const res = await shareResult({
        title: 'Sıkıldım · Kaleydoskop',
        text: `Kaleydoskop’ta çizdim: ${sym} kat simetri, ${PALETTES[palKey].name}.`,
        files: [file],
      });
      if (res === 'shared' && alive) say('Paylaşıldı');
    }

    /* ---------- settings ---------- */
    const saveSettings = () => {
      store.set('kal2', { v: 1, pal: palKey, brush });
      if (V1_PALS.includes(palKey)) store.set('kal-pal', palKey);
    };
    function showPal() {
      const p = PALETTES[palKey];
      $('#kal-sw', el).style.background = swatchBg(palKey);
      $('#kal-pal-t', el).textContent = p.name;
      $('#kal-pal-name', el).textContent = p.name;
      $('#kal-pal-cycle', el).setAttribute('aria-label', `Renk: ${p.name}. Değiştir`);
      $$('[data-pal]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.pal === palKey));
    }
    function setPalette(k, spin) {
      if (!PALETTES[k]) return;
      palKey = k; setPal(); showPal(); saveSettings(); say(PALETTES[k].name);
      if (spin && motionOK()) $('#kal-sw', el).animate([{ transform: 'rotate(-140deg) scale(.7)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,1.45,.55,1)' });
    }
    const cyclePal = () => setPalette(PAL_IDS[(PAL_IDS.indexOf(palKey) + 1) % PAL_IDS.length], true);
    function setSym(n) {
      if (!SYMS.includes(n)) return;
      sym = n; store.set('kal-sym', n);
      $$('[data-sym]', el).forEach(b => b.setAttribute('aria-pressed', +b.dataset.sym === n));
      say(`${n} kat simetri`);
    }
    function toggleMirror() {
      mirror = !mirror; store.set('kal-mirror', mirror);
      $('[data-act="mirror"]', el).setAttribute('aria-pressed', mirror);
      say(mirror ? 'Ayna açık' : 'Ayna kapalı');
    }
    function setBrush(k) {
      if (!BRUSHES[k]) return;
      brush = k; saveSettings();
      $$('[data-brush]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.brush === k));
      say(`Fırça: ${BRUSHES[k].name}`);
    }

    /* ---------- drawing input ---------- */
    function onDown(e) {
      if (e.button > 0 || pen) return;
      e.preventDefault();
      stopAuto(); finishClear(); hideHint(); clearTimeout(prepT);
      snap(); layerBegin();
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      const p = pt(e); pen = { id: e.pointerId, x: p.x, y: p.y, w: 5 * size / 600 * BRUSHES[brush].k };
      seg({ x: p.x - 1, y: p.y, w: pen.w }, p.x, p.y);
      compose();
    }
    function onMove(e) {
      if (!pen || e.pointerId !== pen.id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(ev => { const p = pt(ev); seg(pen, p.x, p.y); });
      compose();
    }
    function onUp(e) { if (pen && e.pointerId === pen.id) { pen = null; layerEnd(); prep(); } }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('lostpointercapture', onUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());

    rootEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !rootEl.contains(b) || b.disabled) return;
      if (b.dataset.sym) setSym(+b.dataset.sym);
      else if (b.dataset.pal) setPalette(b.dataset.pal, false);
      else if (b.dataset.brush) setBrush(b.dataset.brush);
      else switch (b.dataset.act) {
        case 'undo': undo(); break;
        case 'clear': clear(); break;
        case 'auto': toggleAuto(); break;
        case 'save': save(); break;
        case 'mirror': toggleMirror(); break;
        case 'pal': cyclePal(); break;
      }
    });
    saveBtn.addEventListener('pointerdown', () => { if (dirty && !saving) blob(); });

    /* ---------- layout: the canvas is the biggest square that fits ---------- */
    function layout() {
      const cs = getComputedStyle(el), rs = getComputedStyle(rootEl);
      const cw = Math.min(1100, el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
      const ch = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let s;
      if (sideMQ.matches) {
        const pw = parseFloat(rs.getPropertyValue('--pw')) || 300, colGap = parseFloat(rs.columnGap) || 28;
        s = Math.min(cw - pw - colGap, ch);
      } else {
        const gap = parseFloat(rs.rowGap) || 14;
        s = Math.min(cw, ch - bar.offsetHeight - opts.offsetHeight - gap * 2);
      }
      s = Math.floor(clamp(s, 200, 780));
      rootEl.style.setProperty('--s', s + 'px');
      resize(s);
      bar.classList.remove('tight', 'tighter');
      if (bar.scrollWidth > bar.clientWidth + 1) bar.classList.add('tight');
      if (bar.scrollWidth > bar.clientWidth + 1) bar.classList.add('tighter');
    }
    let ro = null, rraf = 0, lastW = 0, lastH = 0;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        if (el.clientWidth === lastW && el.clientHeight === lastH) return;
        lastW = el.clientWidth; lastH = el.clientHeight;
        cancelAnimationFrame(rraf); rraf = requestAnimationFrame(() => { if (alive) layout(); });
      });
      ro.observe(el);
    }
    const onMQ = () => { if (alive) layout(); };
    if (sideMQ.addEventListener) sideMQ.addEventListener('change', onMQ);

    setPal(); showPal(); layout(); syncBtns();
    /* Button widths change when the display font arrives: re-check whether the action bar needs its compact form. */
    const onFonts = () => { if (alive) layout(); };
    if (document.fonts) {
      if (document.fonts.ready) document.fonts.ready.then(onFonts).catch(() => {});
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', onFonts);
    }
    if (motionOK()) { snap(); startAuto(false); demoT = setTimeout(stopAuto, 3200); }

    return {
      onKey(e) {
        if (isField(e.target) || e.repeat) return;
        const k = e.key.toLocaleLowerCase('tr');
        const act = {
          z: undo, c: clear, o: toggleAuto, s: save, p: cyclePal, a: toggleMirror,
          b: () => setBrush(BRUSH_IDS[(BRUSH_IDS.indexOf(brush) + 1) % BRUSH_IDS.length]),
          1: () => setSym(6), 2: () => setSym(8), 3: () => setSym(12), 4: () => setSym(16),
        }[k];
        if (!act) return;
        e.preventDefault();
        if (k === 'o') hideHint();
        act();
      },
      destroy() {
        alive = false; stopAuto(); clearTimeout(demoT); clearTimeout(clearT); clearTimeout(prepT); pen = null;
        if (ro) ro.disconnect(); cancelAnimationFrame(rraf);
        if (sideMQ.removeEventListener) sideMQ.removeEventListener('change', onMQ);
        if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', onFonts);
        hist.forEach(h => { h.c.width = h.c.height = 0; }); hist.length = 0; layerFree();
        blobP = null;
      },
    };
  },
});
})();
