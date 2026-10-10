// SAHA 27 — input: keyboard (solo / two players), gamepads, touch. Produces camera-relative commands.
const MAPS = {
  solo: { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    pass: ['KeyJ', 'Space', 'KeyX'], shoot: ['KeyK', 'KeyC'], through: ['KeyL', 'KeyV'], lob: ['KeyI', 'KeyZ'], sprint: ['ShiftLeft', 'ShiftRight'], sw: ['KeyQ', 'KeyE'] },
  p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], pass: ['KeyF'], shoot: ['KeyG'], through: ['KeyH'], lob: ['KeyT'], sprint: ['ShiftLeft'], sw: ['KeyR'] },
  p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], pass: ['Numpad1', 'Comma'], shoot: ['Numpad2', 'Period'], through: ['Numpad3', 'Slash'], lob: ['Numpad5', 'Semicolon'], sprint: ['Numpad0', 'ShiftRight'], sw: ['Numpad4', 'Quote'] },
};
const BTNS = ['pass', 'shoot', 'through', 'lob'];

function mkBtn() { return { held: false, down: false, up: false, dur: 0 }; }
function mkCmd() { return { mx: 0, mz: 0, mag: 0, sx: 0, sy: 0, sprint: false, sw: false, pause: false, pass: mkBtn(), shoot: mkBtn(), through: mkBtn(), lob: mkBtn() }; }

export class Input {
  constructor() {
    this.keys = new Set(); this.latched = new Set();
    this.cmds = [mkCmd(), mkCmd()];
    this.layout = 'solo'; // or 'duo'
    this.touch = { active: false, sx: 0, sy: 0, btn: {}, latched: new Set() };
    this.pausePressed = false;
    this.enabled = true;
    this.padPrev = [{}, {}];
    this.padHold = [false, false];
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (this.capture && this.isGameKey(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys.add(e.code); this.latched.add(e.code); }
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat && this.capture) this.pausePressed = true;
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); });
  }

  isGameKey(code) {
    for (const m of Object.values(MAPS)) for (const arr of Object.values(m)) if (arr.includes(code)) return true;
    return code === 'Tab';
  }

  setLayout(l) { this.layout = l; }

  key(code) { return this.keys.has(code) || this.latched.has(code); }
  anyKey(list) { for (const c of list) if (this.key(c)) return true; return false; }

  readKeys(map, raw) {
    const m = MAPS[map];
    let sx = (this.anyKey(m.right) ? 1 : 0) - (this.anyKey(m.left) ? 1 : 0);
    let sy = (this.anyKey(m.up) ? 1 : 0) - (this.anyKey(m.down) ? 1 : 0);
    if (sx || sy) { const l = Math.hypot(sx, sy); raw.sx += sx / l; raw.sy += sy / l; }
    raw.sprint ||= this.anyKey(m.sprint);
    for (const b of BTNS) raw[b] ||= this.anyKey(m[b]);
    raw.sw ||= m.sw.some((c) => this.latched.has(c));
  }

  readPad(i, raw) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const list = [...pads].filter(Boolean);
    const gp = list[i];
    if (!gp) return false;
    const b = (k) => !!(gp.buttons[k] && (gp.buttons[k].pressed || gp.buttons[k].value > 0.5));
    // after a reset, buttons still held from a menu press are ignored until released
    if (this.padHold[i]) { if (gp.buttons.some((x) => x.pressed)) { const prev = this.padPrev[i]; prev.lb = b(4); prev.start = b(9); } else this.padHold[i] = false; }
    const held = this.padHold[i];
    let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const l = Math.hypot(ax, ay);
    if (l < 0.22) { ax = 0; ay = 0; } else { const k = Math.min(1, (l - 0.22) / 0.7) / l; ax *= k; ay *= k; }
    if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
    raw.sx += ax; raw.sy += -ay;
    if (held) return true;
    raw.pass ||= b(0); raw.shoot ||= b(1); raw.lob ||= b(2); raw.through ||= b(3);
    raw.sprint ||= b(7) || b(5);
    const prev = this.padPrev[i];
    if (b(4) && !prev.lb) raw.sw = true;
    if (b(9) && !prev.start) this.pausePressed = true;
    prev.lb = b(4); prev.start = b(9);
    return true;
  }

  readTouch(raw) {
    const T = this.touch;
    if (!T.active) return;
    raw.sx += T.sx; raw.sy += T.sy;
    for (const b of BTNS) raw[b] ||= !!T.btn[b] || T.latched.has(b);
    raw.sprint ||= !!T.btn.sprint;
    raw.sw ||= T.latched.has('sw');
  }

  // dt seconds; basis: camera ground vectors {fx,fz,rx,rz}
  poll(dt, basis, humans = 1) {
    for (let h = 0; h < 2; h++) {
      const raw = { sx: 0, sy: 0, sprint: false, sw: false, pass: false, shoot: false, through: false, lob: false };
      if (this.enabled) {
        if (this.layout === 'duo' && humans > 1) {
          this.readKeys(h === 0 ? 'p1' : 'p2', raw);
          this.readPad(h, raw);
          if (h === 0) this.readTouch(raw);
        } else if (h === 0) {
          this.readKeys('solo', raw);
          this.readPad(0, raw); this.readPad(1, raw);
          this.readTouch(raw);
        } else {
          this.readPad(1, raw);
        }
      }
      const c = this.cmds[h];
      let l = Math.hypot(raw.sx, raw.sy);
      if (l > 1) { raw.sx /= l; raw.sy /= l; l = 1; }
      c.sx = raw.sx; c.sy = raw.sy; c.mag = l;
      c.mx = basis.rx * raw.sx + basis.fx * raw.sy;
      c.mz = basis.rz * raw.sx + basis.fz * raw.sy;
      c.sprint = raw.sprint;
      if (raw.sw) c.sw = true;
      for (const b of BTNS) {
        const s = c[b];
        if (raw[b]) {
          if (!s.held) { s.held = true; s.down = true; s.dur = 0; }
          else s.dur += dt;
        } else if (s.held) { s.held = false; s.up = true; }
      }
    }
    this.latched.clear();
    this.touch.latched.clear();
    if (this.pausePressed) { this.cmds[0].pause = true; this.pausePressed = false; }
    return this.cmds;
  }

  consume() {
    for (const c of this.cmds) { c.sw = false; c.pause = false; for (const b of BTNS) { c[b].down = false; c[b].up = false; } }
  }

  reset() {
    this.keys.clear(); this.latched.clear();
    this.pausePressed = false;
    this.padHold = [true, true];
    for (const c of this.cmds) { c.sw = false; c.pause = false; for (const b of BTNS) Object.assign(c[b], mkBtn()); }
    this.touch.btn = {};
  }

  anyPadButton() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    return pads.some((gp) => gp.buttons.some((b) => b.pressed));
  }

  // ---------------------------------------------------------------- touch overlay
  mountTouch(root, onPause) {
    this.touchRoot = root;
    root.innerHTML = `
      <div class="t-stick" data-zone="stick"><div class="t-base"><div class="t-knob"></div></div></div>
      <div class="t-btns">
        <button class="t-btn t-sw" data-b="sw" aria-label="Oyuncu değiştir">⇄</button>
        <button class="t-btn t-sprint" data-b="sprint"><span>SPRİNT</span></button>
        <button class="t-btn t-lob" data-b="lob"><span data-l="lob">ORTA</span></button>
        <button class="t-btn t-through" data-b="through"><span data-l="through">ARA PAS</span></button>
        <button class="t-btn t-pass" data-b="pass"><span data-l="pass">PAS</span></button>
        <button class="t-btn t-shoot" data-b="shoot"><span data-l="shoot">ŞUT</span></button>
      </div>`;
    const T = this.touch;
    const stick = root.querySelector('.t-stick'), base = root.querySelector('.t-base'), knob = root.querySelector('.t-knob');
    let sid = null, ox = 0, oy = 0;
    const R = 56;
    stick.addEventListener('pointerdown', (e) => {
      sid = e.pointerId; stick.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect();
      ox = e.clientX; oy = e.clientY;
      base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px';
      base.classList.add('on');
      T.active = true; e.preventDefault();
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== sid) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const m = Math.min(1, l / R);
      T.sx = l > 6 ? (dx / R) : 0; T.sy = l > 6 ? (-dy / R) : 0;
      if (m > 0.95) { const k = 1 / Math.max(0.001, Math.hypot(T.sx, T.sy)); T.sx *= k; T.sy *= k; }
    });
    const end = (e) => { if (e.pointerId !== sid) return; sid = null; T.sx = T.sy = 0; knob.style.transform = ''; base.classList.remove('on'); };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    root.querySelectorAll('.t-btn').forEach((b) => {
      const k = b.dataset.b;
      b.addEventListener('pointerdown', (e) => { T.active = true; T.btn[k] = true; T.latched.add(k); b.classList.add('on'); b.setPointerCapture(e.pointerId); e.preventDefault(); });
      const up = () => { T.btn[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  setTouchLabels(defending) {
    if (!this.touchRoot || this._def === defending) return;
    this._def = defending;
    const L = defending ? { pass: 'BASKI', shoot: 'MÜDAHALE', through: 'YARDIM', lob: 'KAYARAK' } : { pass: 'PAS', shoot: 'ŞUT', through: 'ARA PAS', lob: 'ORTA' };
    for (const [k, v] of Object.entries(L)) { const el = this.touchRoot.querySelector(`[data-l="${k}"]`); if (el) el.textContent = v; }
    this.touchRoot.classList.toggle('def', defending);
  }
}
