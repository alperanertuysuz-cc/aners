// SAHA 27 — procedural audio (WebAudio). No sample files: crowd, whistle, kicks are synthesised.
export class Sound {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, crowd: 0.7, sfx: 0.9 };
    this.excite = 0; this.exT = 0;
    this.chantT = 0; this.lastRoar = -9;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 3; this.comp.connect(this.master);
    this.crowdBus = ctx.createGain(); this.crowdBus.connect(this.comp);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.comp);
    this.noise = this.makeNoise(4);
    // crowd bed: three filtered noise layers
    const mk = (type, f, q, g) => {
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true; src.loopStart = Math.random();
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const gn = ctx.createGain(); gn.gain.value = g;
      src.connect(fl); fl.connect(gn); gn.connect(this.crowdBus);
      src.start(0, Math.random() * 3);
      return { src, fl, gn };
    };
    this.bed = mk('bandpass', 520, 0.6, 0.0);
    this.murmur = mk('lowpass', 260, 0.7, 0.0);
    this.hi = mk('bandpass', 1500, 0.9, 0.0);
    this.applyVolumes();
    this.setAmbient(0.25);
  }

  makeNoise(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    return buf;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.crowdBus.gain.setTargetAtTime(this.vol.crowd, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  }

  setAmbient(level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bed.gn.gain.setTargetAtTime(0.35 * level, t, 0.6);
    this.murmur.gn.gain.setTargetAtTime(0.55 * level, t, 0.6);
    this.hi.gn.gain.setTargetAtTime(0.03 * level, t, 0.6);
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // called every frame with the current "danger" of play (0..1)
  update(dt, excite, homeAttacking) {
    if (!this.ctx) return;
    this.excite += (excite - this.excite) * Math.min(1, dt * 1.5);
    this.exT -= dt;
    if (this.exT <= 0) {
      this.exT = 0.35 + Math.random() * 0.5;
      const t = this.ctx.currentTime, e = this.excite;
      if (t - this.lastRoar > 5) {
        const wob = 0.85 + Math.random() * 0.3;
        this.bed.gn.gain.setTargetAtTime((0.3 + e * 0.5) * wob, t, 0.5);
        this.bed.fl.frequency.setTargetAtTime(480 + e * 380, t, 0.6);
        this.murmur.gn.gain.setTargetAtTime(0.45 + e * 0.2, t, 0.8);
        this.hi.gn.gain.setTargetAtTime(0.02 + e * e * 0.35, t, 0.4);
      }
    }
    this.chantT -= dt;
    if (homeAttacking && this.excite > 0.35 && this.chantT <= 0 && Math.random() < dt * 0.25) { this.chant(); this.chantT = 8; }
  }

  env(g, t, a, peak, d, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + d);
  }

  noiseHit(t, { f = 1200, type = 'lowpass', q = 0.7, peak = 0.5, a = 0.002, d = 0.08, bus = this.sfxBus, pan = 0, rate = 1 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = rate;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain();
    let node = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    src.connect(fl); fl.connect(g); node.connect(bus);
    this.env(g, t, a, peak, d);
    src.start(t, Math.random() * 3); src.stop(t + a + d + 0.05);
    return fl;
  }

  tone(t, { f = 440, f2 = null, type = 'sine', peak = 0.3, a = 0.003, d = 0.1, bus = this.sfxBus, pan = 0 }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    const g = ctx.createGain();
    let node = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    o.connect(g); node.connect(bus);
    this.env(g, t, a, peak, d);
    o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }

  kick(power, pan = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, p = Math.min(1, power / 30);
    this.noiseHit(t, { f: 900 + p * 1600, peak: 0.12 + p * 0.35, d: 0.05 + p * 0.03, pan });
    this.tone(t, { f: 140 + p * 40, f2: 55, peak: 0.25 + p * 0.45, d: 0.09 + p * 0.05, pan });
  }

  thud(v, pan = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, p = Math.min(1, v / 10);
    this.tone(t, { f: 95, f2: 50, peak: 0.08 + p * 0.18, d: 0.08, pan });
  }

  post() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [f, g, d] of [[523, 0.22, 1.2], [1318, 0.14, 0.8], [2179, 0.09, 0.6], [3410, 0.05, 0.4]]) this.tone(t, { f, peak: g, d, type: 'sine' });
    this.noiseHit(t, { f: 3000, type: 'highpass', peak: 0.15, d: 0.05 });
  }

  net() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, { f: 2200, type: 'bandpass', q: 0.6, peak: 0.25, a: 0.01, d: 0.35 });
  }

  whistle(kind = 'short') {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const seq = kind === 'end' ? [[0, 0.32], [0.45, 0.32], [0.9, 1.05]] : kind === 'half' ? [[0, 0.35], [0.5, 0.95]] : kind === 'long' ? [[0, 0.7]] : [[0, 0.22]];
    for (const [off, len] of seq) {
      const t = ctx.currentTime + off;
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 2950;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 3120;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 27;
      const lg = ctx.createGain(); lg.gain.value = 140;
      lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 2;
      const g = ctx.createGain();
      o.connect(bp); o2.connect(bp); bp.connect(g); g.connect(this.sfxBus);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
      g.gain.setValueAtTime(0.32, t + len - 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      for (const n of [o, o2, lfo]) { n.start(t); n.stop(t + len + 0.05); }
    }
  }

  roar(level = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.lastRoar = t;
    this.hi.gn.gain.cancelScheduledValues(t); this.bed.gn.gain.cancelScheduledValues(t);
    this.hi.gn.gain.setTargetAtTime(0.75 * level, t, 0.12);
    this.hi.gn.gain.setTargetAtTime(0.12, t + 2.8, 1.6);
    this.bed.gn.gain.setTargetAtTime(1.0 * level, t, 0.15);
    this.bed.gn.gain.setTargetAtTime(0.45, t + 3.2, 1.8);
    this.bed.fl.frequency.setTargetAtTime(900, t, 0.2);
    this.bed.fl.frequency.setTargetAtTime(560, t + 3, 1.5);
    setTimeout(() => this.chant(), 2600);
  }

  ooh(level = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const fl = this.noiseHit(t, { f: 900, type: 'bandpass', q: 3, peak: 0.55 * level, a: 0.12, d: 1.4, bus: this.crowdBus });
    fl.frequency.setValueAtTime(950, t); fl.frequency.exponentialRampToValueAtTime(380, t + 1.4);
    this.hi.gn.gain.setTargetAtTime(0.25 * level, t, 0.1); this.hi.gn.gain.setTargetAtTime(0.05, t + 0.6, 0.6);
  }

  chant() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const pat = [0, 0.46, 0.92, 1.15, 1.38];
    for (let r = 0; r < 3; r++) for (const o of pat) {
      const t = t0 + r * 1.84 + o;
      this.noiseHit(t, { f: 1700, type: 'bandpass', q: 1.2, peak: 0.22, a: 0.004, d: 0.06, bus: this.crowdBus, rate: 0.9 + Math.random() * 0.2 });
    }
  }

  ui(hi = false) {
    if (!this.ctx) return;
    this.tone(this.ctx.currentTime, { f: hi ? 1400 : 1000, peak: 0.06, d: 0.04 });
  }
}
