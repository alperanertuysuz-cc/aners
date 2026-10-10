// SAHA 27 — three.js renderer: stadium / street cage, procedural player rigs, cameras.
import * as THREE from 'three';
import { BALL_R, ST, DIVE_LEN, diveRoll } from './sim.js';
import { SKIN, HAIR } from './data.js';

const PI = Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const ST_CODE = ST;

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { srgb = true, repeat = null, aniso = 1 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = aniso;
  return t;
}
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shade(hex, f) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, clamp(hsl.l * f, 0, 1));
  return '#' + c.getHexString();
}
function luminance(hex) { const c = new THREE.Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }

// ------------------------------------------------------------------ textures
function pitchCanvas(P, street) {
  const mx = street ? 0.6 : 6, mz = street ? 0.6 : 5;
  const Wm = P.L + mx * 2, Hm = P.W + mz * 2;
  const W = 2048, H = Math.round(W * Hm / Wm);
  const c = canvas(W, H), g = c.getContext('2d');
  const k = W / Wm;
  const X = (x) => (x + Wm / 2) * k, Z = (z) => (z + Hm / 2) * k;
  const r = rnd(7);
  const base = street ? ['#2E9A57', '#33A65E'] : ['#2C7A36', '#34883F'];
  g.fillStyle = street ? '#2A8F50' : '#285F2E'; g.fillRect(0, 0, W, H);
  const n = street ? 10 : 18;
  for (let i = 0; i < n; i++) {
    g.fillStyle = base[i % 2];
    g.fillRect(X(-P.H + (i * P.L) / n), Z(-P.HW), (P.L / n) * k + 1, P.W * k);
  }
  if (!street) {
    // subtle cross mow
    g.globalAlpha = 0.06;
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#000' : '#fff'; g.fillRect(X(-P.H), Z(-P.HW + (i * P.W) / 10), P.L * k, (P.W / 10) * k + 1); }
    g.globalAlpha = 1;
  }
  // speckle noise
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (r() - 0.5) * (street ? 10 : 18);
    d[i] = clamp(d[i] + v * 0.6, 0, 255); d[i + 1] = clamp(d[i + 1] + v, 0, 255); d[i + 2] = clamp(d[i + 2] + v * 0.5, 0, 255);
  }
  g.putImageData(img, 0, 0);
  if (!street) {
    // goalmouth wear
    for (const s of [-1, 1]) {
      const grd = g.createRadialGradient(X(s * (P.H - 4)), Z(0), 2, X(s * (P.H - 4)), Z(0), 9 * k);
      grd.addColorStop(0, 'rgba(120,110,60,.28)'); grd.addColorStop(1, 'rgba(120,110,60,0)');
      g.fillStyle = grd; g.fillRect(X(s * (P.H - 16)) - (s < 0 ? 0 : 0), Z(-10), 32 * k, 20 * k);
      g.fillRect(X(s * P.H - 16), Z(-10), 32 * k, 20 * k);
    }
  }
  // lines
  g.strokeStyle = 'rgba(245,248,240,.92)'; g.fillStyle = 'rgba(245,248,240,.92)';
  g.lineWidth = Math.max(2, 0.12 * k);
  g.lineJoin = 'miter';
  g.strokeRect(X(-P.H), Z(-P.HW), P.L * k, P.W * k);
  g.beginPath(); g.moveTo(X(0), Z(-P.HW)); g.lineTo(X(0), Z(P.HW)); g.stroke();
  g.beginPath(); g.arc(X(0), Z(0), P.cR * k, 0, PI * 2); g.stroke();
  g.beginPath(); g.arc(X(0), Z(0), 0.22 * k, 0, PI * 2); g.fill();
  for (const s of [-1, 1]) {
    const gx = s * P.H;
    const bx = gx - s * P.boxL;
    g.strokeRect(Math.min(X(gx), X(bx)), Z(-P.boxW / 2), P.boxL * k, P.boxW * k);
    if (P.sixL) { const sx = gx - s * P.sixL; g.strokeRect(Math.min(X(gx), X(sx)), Z(-P.sixW / 2), P.sixL * k, P.sixW * k); }
    const px = gx - s * P.pen;
    g.beginPath(); g.arc(X(px), Z(0), 0.2 * k, 0, PI * 2); g.fill();
    if (!street) {
      // penalty arc (outside the box only)
      const a = Math.acos((P.boxL - P.pen) / 9.15);
      g.beginPath();
      if (s > 0) g.arc(X(px), Z(0), 9.15 * k, PI - a, PI + a); else g.arc(X(px), Z(0), 9.15 * k, -a, a);
      g.stroke();
      for (const q of [-1, 1]) { g.beginPath(); const cx = X(gx), cz = Z(q * P.HW); const st = s > 0 ? (q > 0 ? PI : PI / 2) : (q > 0 ? -PI / 2 : 0); g.arc(cx, cz, 1 * k, st, st + PI / 2); g.stroke(); }
    }
  }
  return { c, Wm, Hm };
}

function crowdCanvas(colors, seed) {
  const W = 512, H = 256, c = canvas(W, H), g = c.getContext('2d');
  const r = rnd(seed);
  g.fillStyle = '#07090D'; g.fillRect(0, 0, W, H);
  const rows = 12, rh = H / rows;
  const neutrals = ['#E8E4DA', '#2A2E36', '#5D6470', '#9AA3AE', '#1C2A44', '#6B2A2A', '#C9B07A'];
  for (let y = 0; y < rows; y++) {
    g.fillStyle = y % 2 ? '#0E1117' : '#11151C'; g.fillRect(0, y * rh + rh * 0.78, W, rh * 0.22);
    for (let x = 0; x < W; x += 7 + r() * 3) {
      if (r() < 0.06) continue;
      const pick = r();
      const col = pick < 0.5 ? colors[0] : pick < 0.62 ? colors[1] : pick < 0.72 ? colors[2] : neutrals[Math.floor(r() * neutrals.length)];
      const bx = x + r() * 2, by = y * rh + rh * 0.42 + r() * 2;
      g.fillStyle = shade(col, 0.55 + r() * 0.5); g.fillRect(bx - 2.6, by, 5.2, rh * 0.42);
      g.fillStyle = ['#E9C9A8', '#C99872', '#8E5E3C', '#5E3B24'][Math.floor(r() * 4)]; g.beginPath(); g.arc(bx, by - 1.6, 2.1, 0, PI * 2); g.fill();
    }
  }
  return c;
}

function boardsCanvas(goal, accent) {
  const W = 2048, H = 64, c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#05060A'; g.fillRect(0, 0, W, H);
  const msgs = goal ? ['GOL', 'GOL', 'GOL', 'GOL'] : ['SAHA 27', 'ANERS', 'VERSATIL', 'ANERS BLOG'];
  const cols = goal ? [accent, '#FFFFFF', accent, '#FFFFFF'] : ['#F5F2EA', '#5EF2E4', '#FFB547', '#F5F2EA'];
  const seg = W / 8;
  for (let i = 0; i < 8; i++) {
    const x = i * seg;
    if (!goal) { g.fillStyle = i % 2 ? '#0B0E16' : '#0A0F14'; g.fillRect(x, 0, seg, H); }
    else { g.fillStyle = i % 2 ? '#05060A' : shade(accent, 0.35); g.fillRect(x, 0, seg, H); }
    g.fillStyle = cols[i % 4];
    g.font = `700 ${goal ? 44 : 34}px Geist, "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(msgs[i % 4], x + seg / 2, H / 2 + 2);
    if (!goal && i % 4 === 1) { g.fillStyle = '#5EF2E4'; g.fillRect(x + 18, H / 2 - 3, 6, 6); }
  }
  return c;
}

function netCanvas() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  return c;
}

function fenceCanvas() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.strokeStyle = 'rgba(190,200,210,.85)'; g.lineWidth = 2;
  for (let i = -128; i <= 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); }
  return c;
}

function ballCanvas() {
  const W = 512, H = 256, c = canvas(W, H), g = c.getContext('2d');
  const img = g.createImageData(W, H), d = img.data;
  const t = (1 + Math.sqrt(5)) / 2;
  const ico = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const seeds = ico.map((v) => ({ v, pent: true }));
  for (const f of faces) { const v = [0, 1, 2].map((k) => ico[f[0]][k] + ico[f[1]][k] + ico[f[2]][k]); const l = Math.hypot(...v); seeds.push({ v: v.map((x) => x / l), pent: false }); }
  for (let y = 0; y < H; y++) {
    const th = (y / H) * PI;
    for (let x = 0; x < W; x++) {
      const ph = (x / W) * PI * 2;
      const px = Math.sin(th) * Math.cos(ph), py = Math.cos(th), pz = Math.sin(th) * Math.sin(ph);
      let b1 = -2, b2 = -2, bi = 0;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i].v, dd = px * s[0] + py * s[1] + pz * s[2];
        if (dd > b1) { b2 = b1; b1 = dd; bi = i; } else if (dd > b2) b2 = dd;
      }
      const o = (y * W + x) * 4;
      let col = seeds[bi].pent ? [22, 24, 30] : [244, 244, 240];
      if (b1 - b2 < 0.012) col = [150, 150, 150];
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function glowCanvas(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = canvas(128, 128), g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(0.25, 'rgba(255,240,220,.45)'); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return c;
}

function blobCanvas() {
  const c = canvas(64, 64), g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(0.6, 'rgba(0,0,0,.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return c;
}

function shirtCanvas(kit, num, name, gk) {
  const W = 256, H = 128, c = canvas(W, H), g = c.getContext('2d');
  const shirt = gk ? kit.gkShirt : kit.shirt, alt = gk ? shade(kit.gkShirt, 0.7) : (kit.alt || kit.trim);
  g.fillStyle = shirt; g.fillRect(0, 0, W, H);
  const pat = gk ? 'plain' : kit.pattern;
  g.fillStyle = alt;
  if (pat === 'stripes') for (let x = 0; x < W; x += 32) g.fillRect(x + 16, 0, 14, H);
  else if (pat === 'hoops') for (let y = 6; y < H; y += 26) g.fillRect(0, y, W, 12);
  else if (pat === 'half') g.fillRect(W * 0.5, 0, W * 0.5, H);
  else if (pat === 'sash') { g.save(); g.translate(W * 0.25, H * 0.5); g.rotate(-0.7); g.fillRect(-12, -120, 24, 240); g.restore(); }
  // collar & side panels
  g.fillStyle = gk ? '#16181D' : kit.trim; g.fillRect(0, 0, W, 7);
  g.globalAlpha = 0.18; g.fillStyle = '#000'; g.fillRect(W * 0.46, 0, W * 0.08, H); g.fillRect(W * 0.96, 0, W * 0.08, H); g.fillRect(0, 0, W * 0.04, H); g.globalAlpha = 1;
  // number + name on the back (u = .75)
  const light = luminance(shirt) > 0.5 && pat === 'plain';
  const numCol = gk ? '#FFFFFF' : (light ? shade(kit.trim, 0.5) : '#FFFFFF');
  g.fillStyle = pat !== 'plain' ? (luminance(shirt) > 0.55 ? '#111' : '#fff') : numCol;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 46px Geist, "Helvetica Neue", Arial, sans-serif';
  if (pat !== 'plain') { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(W * 0.75 - 30, 38, 60, 54); g.fillStyle = '#fff'; }
  g.fillText(String(num), W * 0.75, 66);
  g.font = '700 11px Geist, "Helvetica Neue", Arial, sans-serif';
  g.fillText(name.split(' ').slice(-1)[0].toLocaleUpperCase('tr-TR'), W * 0.75, 30);
  // crest
  g.fillStyle = gk ? '#fff' : kit.trim; g.beginPath(); g.arc(W * 0.32, 32, 6, 0, PI * 2); g.fill();
  g.font = '800 14px Geist, Arial'; g.fillText(String(num), W * 0.2, 34);
  return c;
}

// superellipse helper
function superPt(a, b, th, n = 4) {
  const c = Math.cos(th), s = Math.sin(th), e = 2 / n;
  return [a * Math.sign(c) * Math.pow(Math.abs(c), e), b * Math.sign(s) * Math.pow(Math.abs(s), e)];
}
function ringStrip(a0, b0, h0, a1, b1, h1, segs, uMeters, vRep) {
  const pos = [], uv = [], idx = [];
  let acc = 0, prev = null;
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * PI * 2;
    const p0 = superPt(a0, b0, th), p1 = superPt(a1, b1, th);
    if (prev) acc += Math.hypot(p0[0] - prev[0], p0[1] - prev[1]);
    prev = p0;
    pos.push(p0[0], h0, p0[1], p1[0], h1, p1[1]);
    uv.push(acc / uMeters, 0, acc / uMeters, vRep);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ------------------------------------------------------------------ player rig
class Rig {
  constructor(shared, kit, sp, gk, isGKKit) {
    const S = shared;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.root.add(this.body);
    const shirtMat = new THREE.MeshStandardMaterial({ map: tex(shirtCanvas(kit, sp.num, sp.name, isGKKit)), roughness: 0.78 });
    const shirtCol = isGKKit ? kit.gkShirt : kit.shirt;
    const sleeveMat = new THREE.MeshStandardMaterial({ color: shirtCol, roughness: 0.8 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: isGKKit ? '#1A1C22' : kit.shorts, roughness: 0.8 });
    const sockMat = new THREE.MeshStandardMaterial({ color: isGKKit ? kit.gkShirt : kit.socks, roughness: 0.85 });
    const skinMat = S.skin[sp.skin % S.skin.length];
    const hairMat = S.hair[sp.hair % S.hair.length];
    const bootMat = S.boots[(sp.num + (sp.skin || 0)) % S.boots.length];
    this.mats = [shirtMat, sleeveMat, shortsMat, sockMat];
    const m = (geo, mat, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    this.hips = new THREE.Group(); this.hips.position.y = 0.95; this.body.add(this.hips);
    m(S.g.shorts, shortsMat, this.hips, 0, -0.05, 0);
    this.spine = new THREE.Group(); this.spine.position.y = 0.06; this.hips.add(this.spine);
    const torso = m(S.g.torso, shirtMat, this.spine, 0, 0.27, 0); torso.scale.set(1, 1, 0.7);
    m(S.g.neck, skinMat, this.spine, 0, 0.6, 0);
    this.head = new THREE.Group(); this.head.position.y = 0.72; this.spine.add(this.head);
    m(S.g.head, skinMat, this.head, 0, 0.03, 0);
    const hs = sp.hairStyle || 0;
    if (hs !== 3) { const h = m(S.g.hair[hs % 3], hairMat, this.head, 0, 0.04, -0.008); h.castShadow = false; }
    this.arms = [];
    for (const side of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(side * 0.235, 0.47, 0); this.spine.add(sh);
      m(S.g.upperArm, sleeveMat, sh, 0, -0.11, 0);
      const el = new THREE.Group(); el.position.y = -0.25; sh.add(el);
      m(S.g.forearm, skinMat, el, 0, -0.12, 0);
      m(gk ? S.g.glove : S.g.hand, gk ? S.gloveMat : skinMat, el, 0, -0.27, 0);
      this.arms.push({ sh, el });
    }
    this.legs = [];
    for (const side of [1, -1]) {
      const hp = new THREE.Group(); hp.position.set(side * 0.1, -0.08, 0); this.hips.add(hp);
      m(S.g.thigh, skinMat, hp, 0, -0.2, 0);
      const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn);
      m(S.g.shin, sockMat, kn, 0, -0.2, 0);
      m(S.g.boot, bootMat, kn, 0, -0.41, 0.045);
      this.legs.push({ hp, kn });
    }
    // blob shadow
    this.blob = new THREE.Mesh(S.g.blob, S.blobMat); this.blob.rotation.x = -PI / 2; this.blob.renderOrder = 1;
    this.lie = { rx: 0, rz: 0, y: 0 };
  }
  dispose() { for (const mt of this.mats) { mt.map && mt.map.dispose(); mt.dispose(); } }
}

function poseRig(rig, s, dt) {
  // s: {x, z, y, face, speed, st, stT, phase, diveDir}
  const root = rig.root;
  root.position.set(s.x, s.y, s.z);
  root.rotation.y = PI / 2 - s.face;
  const run = clamp(s.speed / 8.5, 0, 1);
  const ph = s.phase;
  const sn = Math.sin(ph);
  let a = 0.12 + 0.68 * run;
  let hipL = -sn * a, hipR = sn * a;
  let knL = Math.max(0, Math.sin(ph + 1.2)) * (0.15 + 1.25 * run) + 0.05;
  let knR = Math.max(0, Math.sin(ph + 1.2 + PI)) * (0.15 + 1.25 * run) + 0.05;
  let shL = sn * a * 0.85, shR = -sn * a * 0.85, shLz = 0.1, shRz = -0.1;
  let elL = -0.35 - run * 0.9, elR = -0.35 - run * 0.9;
  let bodyRx = run * 0.2, bodyRz = 0, bodyY = Math.abs(Math.cos(ph)) * 0.06 * run, spineRx = 0, headRx = 0, spineRy = 0;
  if (s.speed < 0.4) {
    const br = Math.sin(performance.now() * 0.002 + s.x) * 0.02;
    hipL = 0.02; hipR = -0.02; knL = 0.08; knR = 0.08; shL = br; shR = -br; elL = -0.25; elR = -0.25; bodyRx = 0.02;
  }
  const st = s.st, t = s.stT;
  const local = (wdir) => { const th = PI / 2 - s.face; return Math.sign(-Math.sin(th) * wdir) || 1; };
  switch (st) {
    case ST_CODE.kick: {
      const u = clamp(t / 0.32, 0, 1);
      const sw = u < 0.3 ? lerp(0, 0.75, u / 0.3) : u < 0.62 ? lerp(0.75, -1.25, (u - 0.3) / 0.32) : lerp(-1.25, -0.2, (u - 0.62) / 0.38);
      hipR = sw; knR = u < 0.3 ? 1.3 * (u / 0.3) : u < 0.62 ? lerp(1.3, 0.1, (u - 0.3) / 0.32) : 0.2;
      hipL = 0.12; knL = 0.25; shLz = 0.7; shRz = -0.5; shL = -0.4; shR = 0.3; bodyRx = -0.08; spineRy = -0.25 * Math.sin(u * PI);
      break;
    }
    case ST_CODE.throw: {
      const released = t < 0.4 && t > 0;
      shL = shR = released ? lerp(-2.9, -1.2, clamp(t / 0.3, 0, 1)) : -2.9; elL = elR = released ? -0.2 : -0.9; shLz = 0.15; shRz = -0.15;
      hipL = hipR = 0.05; knL = knR = 0.1; bodyRx = released ? 0.15 : -0.12;
      break;
    }
    case ST_CODE.tackle: {
      const u = clamp(t / 0.35, 0, 1), e = Math.sin(u * PI);
      hipR = -1.0 * e; knR = 0.15; hipL = 0.35 * e; knL = 0.7 * e; bodyY = -0.14 * e; bodyRx = 0.25 * e; shLz = 0.6 * e; shRz = -0.6 * e;
      break;
    }
    case ST_CODE.slide: {
      const e = clamp(t / 0.15, 0, 1);
      bodyRx = -1.18 * e; bodyY = 0; hipR = -0.25 * e; knR = 0.05; hipL = 0.45 * e; knL = 1.4 * e;
      spineRx = 0.55 * e; shL = 0.7 * e; shR = 0.9 * e; shLz = 0.5; shRz = -0.5; elL = elR = -0.2; headRx = 0.35 * e;
      rig.lie = { rx: bodyRx, rz: 0, y: bodyY };
      break;
    }
    case ST_CODE.dive: {
      const e = clamp(t / 0.5, 0, 1);
      const side = local(s.diveDir);
      const roll = diveRoll(Math.abs(s.diveDir) || 0.6, s.y);
      bodyRz = -side * roll * e; bodyRx = 0.05; bodyY = 0;
      shL = shR = -2.95 * e; elL = elR = -0.05; shLz = 0.15; shRz = -0.15;
      hipL = hipR = 0.05; knL = 0.25 * e; knR = 0.1;
      if (t > 0.6) { const f = clamp((t - 0.6) / 0.3, 0, 1); shL = shR = lerp(-2.95, -1.2, f); }
      rig.lie = { rx: bodyRx, rz: bodyRz, y: 0 };
      break;
    }
    case ST_CODE.header: {
      const u = clamp(t / 0.45, 0, 1);
      spineRx = Math.sin(u * PI) * 0.35 - 0.15; headRx = Math.sin(u * PI) * 0.4; shLz = 0.9; shRz = -0.9; shL = shR = -0.3; hipL = 0.25; hipR = -0.15; knL = 0.7; knR = 0.5;
      break;
    }
    case ST_CODE.down: {
      const e = clamp(t / 0.35, 0, 1);
      bodyRx = -1.52 * e; bodyY = 0.08 * e; hipL = -0.2; hipR = 0.25; knL = 0.5; knR = 0.2; shL = -0.4; shR = 0.6; shLz = 0.9; shRz = -0.4; elL = -1.2; elR = -0.3;
      rig.lie = { rx: bodyRx, rz: 0, y: bodyY };
      break;
    }
    case ST_CODE.getup: {
      const f = 1 - clamp(t / 0.55, 0, 1), L = rig.lie;
      bodyRx = L.rx * f; bodyRz = L.rz * f; bodyY = L.y * f; knL = knR = 0.6 * f + 0.1; hipL = hipR = -0.4 * f;
      break;
    }
    case ST_CODE.celebrate: {
      const w = Math.sin(performance.now() * 0.012 + s.x);
      shL = -2.6 + w * 0.2; shR = -2.6 - w * 0.2; shLz = 0.5; shRz = -0.5; elL = elR = -0.2; headRx = -0.3; bodyRx = run * 0.1;
      if (s.speed < 1) { bodyY = Math.abs(Math.sin(performance.now() * 0.009 + s.z)) * 0.18; knL = knR = 0.4; }
      break;
    }
    case ST_CODE.sad: {
      headRx = 0.55; shLz = 0.35; shRz = -0.35; elL = elR = -1.7; shL = shR = 0.2; spineRx = 0.12;
      break;
    }
    case ST_CODE.hold: {
      shL = shR = -1.05; elL = elR = -1.0; shLz = -0.15; shRz = 0.15;
      break;
    }
  }
  const [aL, aR] = rig.arms, [lL, lR] = rig.legs;
  aL.sh.rotation.set(shL, 0, shLz); aR.sh.rotation.set(shR, 0, shRz);
  aL.el.rotation.x = elL; aR.el.rotation.x = elR;
  lL.hp.rotation.x = hipL; lR.hp.rotation.x = hipR;
  lL.kn.rotation.x = knL; lR.kn.rotation.x = knR;
  rig.body.rotation.set(bodyRx, 0, bodyRz);
  rig.body.position.y = bodyY;
  rig.spine.rotation.set(spineRx, spineRy, 0);
  rig.head.rotation.x = headRx;
  rig.blob.position.set(s.x, 0.015, s.z);
  const bs = 1.15 - clamp(s.y, 0, 1.5) * 0.3;
  rig.blob.scale.set(bs, bs, bs);
}

// ------------------------------------------------------------------ renderer
export class Renderer {
  constructor(canvasEl, opts = {}) {
    this.canvas = canvasEl;
    this.quality = opts.quality || 'high';
    const hi = this.quality === 'high';
    this.gl = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: hi, powerPreference: 'high-performance', alpha: false });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1.25));
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.0;
    this.gl.shadowMap.enabled = hi;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.aniso = Math.min(8, this.gl.capabilities.getMaxAnisotropy());
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.4, 1400);
    this.camPos = new THREE.Vector3(0, 30, 80); this.camLook = new THREE.Vector3();
    this.camMode = opts.camMode || 'broadcast';
    this.fovKick = 0; this.shake = 0;
    this.world = null; this.rigs = new Map(); this.markers = [];
    this.shared = this.makeShared();
    this.makeBall();
    this.tmpV = new THREE.Vector3();
    this.ballQ = new THREE.Quaternion();
    this.lastBall = new THREE.Vector3();
    this.netBulge = [];
    this.boardFlash = 0;
    this.time = 0;
    this.resize();
  }

  makeShared() {
    const g = {
      torso: new THREE.CapsuleGeometry(0.19, 0.3, 4, 14),
      shorts: new THREE.CylinderGeometry(0.185, 0.205, 0.25, 14),
      neck: new THREE.CylinderGeometry(0.052, 0.058, 0.1, 8),
      head: new THREE.SphereGeometry(0.112, 16, 12),
      hair: [
        new THREE.SphereGeometry(0.118, 14, 8, 0, PI * 2, 0, PI * 0.5),
        new THREE.SphereGeometry(0.122, 14, 10, 0, PI * 2, 0, PI * 0.62),
        new THREE.SphereGeometry(0.128, 14, 8, 0, PI * 2, 0, PI * 0.42),
      ],
      upperArm: new THREE.CapsuleGeometry(0.058, 0.15, 3, 8),
      forearm: new THREE.CapsuleGeometry(0.047, 0.19, 3, 8),
      hand: new THREE.SphereGeometry(0.045, 8, 6),
      glove: new THREE.SphereGeometry(0.07, 8, 6),
      thigh: new THREE.CapsuleGeometry(0.078, 0.25, 3, 10),
      shin: new THREE.CapsuleGeometry(0.06, 0.29, 3, 10),
      boot: new THREE.BoxGeometry(0.1, 0.075, 0.25),
      blob: new THREE.PlaneGeometry(1.1, 1.1),
    };
    const skin = SKIN.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62 }));
    const hair = HAIR.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    const boots = ['#111214', '#F2F2F2', '#E4572E', '#1E64F0', '#F2C230'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    const gloveMat = new THREE.MeshStandardMaterial({ color: '#F4F4F4', roughness: 0.7 });
    const blobMat = new THREE.MeshBasicMaterial({ map: tex(blobCanvas(), { srgb: false }), transparent: true, depthWrite: false });
    return { g, skin, hair, boots, gloveMat, blobMat };
  }

  makeBall() {
    const t = tex(ballCanvas());
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), new THREE.MeshStandardMaterial({ map: t, roughness: 0.45 }));
    this.ball.castShadow = true;
    this.ballScale = 1.45;
    this.ball.scale.setScalar(this.ballScale);
    this.ballBlob = new THREE.Mesh(this.shared.g.blob, this.shared.blobMat);
    this.ballBlob.rotation.x = -PI / 2;
    this.ballBlob.scale.setScalar(0.45);
    // trail for hard shots
    const n = 14;
    this.trailPts = new Float32Array(n * 3);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(this.trailPts, 3));
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    this.trail.frustumCulled = false;
    this.trailOn = 0;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.W = w; this.H = h;
  }

  setCamMode(m) { this.camMode = m; }

  // -------------------------------------------------------------- world
  buildWorld(P, opts = {}) {
    if (this.world) { this.scene.remove(this.world); this.disposeGroup(this.world); }
    this.P = P;
    const street = P.size === '5';
    const tod = street ? 'dusk' : (opts.tod || 'night');
    this.tod = tod;
    const W = new THREE.Group();
    this.world = W;
    this.scene.add(W);
    this.scene.add(this.ball); this.scene.add(this.ballBlob); this.scene.add(this.trail);
    // sky
    const skyCols = tod === 'day' ? ['#6FA9E8', '#CFE4F7', '#E9EEF0'] : tod === 'dusk' ? ['#0B1530', '#3A3560', '#C9785A'] : ['#03050B', '#0A1222', '#18233A'];
    const skyGeo = new THREE.SphereGeometry(900, 32, 16);
    const cols = [];
    const pa = skyGeo.attributes.position;
    const c0 = new THREE.Color(skyCols[0]), c1 = new THREE.Color(skyCols[1]), c2 = new THREE.Color(skyCols[2]);
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i) / 900;
      const c = y > 0.25 ? c0.clone().lerp(c1, clamp(1 - (y - 0.25) / 0.75, 0, 1) * 0.6) : c1.clone().lerp(c2, clamp(1 - y / 0.25, 0, 1));
      cols.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    W.add(sky);
    if (tod !== 'day') {
      const sp = [], r = rnd(3);
      for (let i = 0; i < 500; i++) { const th = r() * PI * 2, ph = 0.15 + r() * 1.2; sp.push(Math.cos(th) * Math.cos(ph) * 850, Math.sin(ph) * 850, Math.sin(th) * Math.cos(ph) * 850); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      W.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: tod === 'dusk' ? 0.35 : 0.8 })));
    }
    this.scene.fog = new THREE.Fog(new THREE.Color(skyCols[2]).multiplyScalar(tod === 'day' ? 1 : 0.8), street ? 90 : 220, street ? 420 : 760);
    this.scene.background = new THREE.Color(skyCols[1]);
    // lights
    const hemi = new THREE.HemisphereLight(tod === 'day' ? 0xd8ecff : 0xb8c8ff, tod === 'day' ? 0x40602c : 0x18301a, tod === 'day' ? 1.35 : 1.05);
    W.add(hemi);
    const key = new THREE.DirectionalLight(tod === 'day' ? 0xfff0d8 : tod === 'dusk' ? 0xffd9b0 : 0xf4f6ff, tod === 'day' ? 3.0 : 2.6);
    key.position.set(tod === 'day' ? 55 : -35, 90, tod === 'day' ? -40 : 45);
    key.target.position.set(0, 0, 0);
    key.castShadow = this.quality === 'high';
    const ext = P.L / 2 + 6;
    Object.assign(key.shadow.camera, { left: -ext, right: ext, top: P.W / 2 + 12, bottom: -P.W / 2 - 12, near: 10, far: 260 });
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
    W.add(key); W.add(key.target);
    const fill = new THREE.DirectionalLight(tod === 'day' ? 0xbfd8ff : 0xc8d6ff, tod === 'day' ? 0.6 : 0.95);
    fill.position.set(40, 60, -50); W.add(fill);
    this.key = key;
    // ground + pitch
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: street ? '#1B1D21' : tod === 'day' ? '#2F4A2A' : '#0D140F', roughness: 1 }));
    ground.rotation.x = -PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; W.add(ground);
    const pc = pitchCanvas(P, street);
    const ptex = tex(pc.c, { aniso: this.aniso });
    ptex.generateMipmaps = true;
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(pc.Wm, pc.Hm), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.92 }));
    pitch.rotation.x = -PI / 2; pitch.receiveShadow = true; W.add(pitch);
    this.buildGoals(W, P);
    if (street) this.buildStreet(W, P, opts); else this.buildStadium(W, P, opts);
  }

  buildGoals(W, P) {
    const postMat = new THREE.MeshStandardMaterial({ color: '#F4F6F8', roughness: 0.35, metalness: 0.1 });
    const netTex = tex(netCanvas(), { srgb: true, repeat: [1, 1] });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
    const netMat = (rx, ry) => { const t = netTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85, alphaTest: 0.05 }); };
    const r = 0.06, gw = P.goalW, gh = P.goalH, gd = P.goalD;
    const post = new THREE.CylinderGeometry(r, r, gh, 12);
    const bar = new THREE.CylinderGeometry(r, r, gw + r * 2, 12);
    const thin = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
    this.nets = [];
    for (const s of [-1, 1]) {
      const G = new THREE.Group(); G.position.x = s * P.H; W.add(G);
      for (const q of [-1, 1]) { const p = new THREE.Mesh(post, postMat); p.position.set(0, gh / 2, q * gw / 2); p.castShadow = true; G.add(p); }
      const b = new THREE.Mesh(bar, postMat); b.rotation.x = PI / 2; b.position.set(0, gh, 0); b.castShadow = true; G.add(b);
      // back stanchions
      for (const q of [-1, 1]) {
        const st = new THREE.Mesh(thin, postMat); st.scale.y = Math.hypot(gd, gh); st.position.set(s * gd / 2, gh / 2, q * gw / 2); st.rotation.x = 0; st.rotation.z = s * Math.atan2(gd, gh); G.add(st);
        const rail = new THREE.Mesh(thin, postMat); rail.scale.y = gd; rail.rotation.z = PI / 2; rail.position.set(s * gd / 2, 0.02, q * gw / 2); G.add(rail);
      }
      const back = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh, 14, 8), netMat(gw * 4, gh * 4));
      back.position.set(s * gd, gh / 2, 0); back.rotation.y = PI / 2;
      G.add(back);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(gd, gw), netMat(gd * 4, gw * 4));
      top.rotation.x = -PI / 2; top.position.set(s * gd / 2, gh, 0); G.add(top);
      for (const q of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(gd, gh), netMat(gd * 4, gh * 4));
        side.position.set(s * gd / 2, gh / 2, q * gw / 2); G.add(side);
      }
      const bp = back.geometry.attributes.position;
      this.nets.push({ s, mesh: back, base: Float32Array.from(bp.array), amp: 0, hz: 0, hy: 0, G });
    }
    // corner flags
    if (P.size !== '5') {
      const flagMat = new THREE.MeshStandardMaterial({ color: '#F2C230', side: THREE.DoubleSide, roughness: 0.8 });
      this.flags = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), postMat); pole.position.set(sx * P.H, 0.8, sz * P.HW); W.add(pole);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28, 4, 1), flagMat); f.position.set(sx * P.H + 0.2, 1.45, sz * P.HW); W.add(f);
        this.flags.push(f);
      }
    }
  }

  buildStadium(W, P, opts) {
    const colors = opts.crowd || ['#C8202F', '#11284A', '#E9C46A'];
    this.crowdTex = tex(crowdCanvas(colors, 11), { repeat: [1, 1], aniso: this.aniso });
    this.crowdTex.wrapS = this.crowdTex.wrapT = THREE.RepeatWrapping;
    const crowdMat = new THREE.MeshStandardMaterial({ map: this.crowdTex, roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveMap: this.crowdTex, emissiveIntensity: this.tod === 'day' ? 0.05 : 0.22, side: THREE.DoubleSide });
    this.crowdMat = crowdMat;
    const a0 = P.H + 11, b0 = P.HW + 10;
    const seg = 192;
    const lower = new THREE.Mesh(ringStrip(a0, b0, 1.2, a0 + 20, b0 + 20, 14, seg, 28, 2.4), crowdMat); W.add(lower);
    const front = new THREE.Mesh(ringStrip(a0 - 0.01, b0 - 0.01, 0, a0, b0, 1.2, seg, 9, 1), new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.9, side: THREE.DoubleSide })); W.add(front);
    const facade = new THREE.Mesh(ringStrip(a0 + 20, b0 + 20, 14, a0 + 21, b0 + 21, 18, seg, 9, 1), new THREE.MeshStandardMaterial({ color: '#0E1118', roughness: 0.8, emissive: new THREE.Color('#5EF2E4'), emissiveIntensity: 0.0, side: THREE.DoubleSide })); W.add(facade);
    // LED ribbon on the facade
    const ribbonC = canvas(1024, 32), rg = ribbonC.getContext('2d');
    rg.fillStyle = '#04060A'; rg.fillRect(0, 0, 1024, 32);
    for (let i = 0; i < 16; i++) { rg.fillStyle = i % 4 === 0 ? '#5EF2E4' : i % 4 === 2 ? '#FFB547' : '#1A2230'; rg.fillRect(i * 64 + 4, 10, 56, 12); }
    this.ribbonTex = tex(ribbonC, { repeat: [1, 1] }); this.ribbonTex.wrapS = THREE.RepeatWrapping;
    const ribbon = new THREE.Mesh(ringStrip(a0 + 20.05, b0 + 20.05, 15.2, a0 + 20.6, b0 + 20.6, 16.4, seg, 14, 1), new THREE.MeshBasicMaterial({ map: this.ribbonTex, side: THREE.DoubleSide })); W.add(ribbon);
    const upper = new THREE.Mesh(ringStrip(a0 + 21, b0 + 21, 18, a0 + 42, b0 + 42, 36, seg, 28, 2.6), crowdMat); W.add(upper);
    const backWall = new THREE.Mesh(ringStrip(a0 + 42, b0 + 42, 36, a0 + 42.2, b0 + 42.2, 0, seg, 9, 1), new THREE.MeshStandardMaterial({ color: '#10131A', roughness: 1, side: THREE.DoubleSide })); W.add(backWall);
    const roofMat = new THREE.MeshStandardMaterial({ color: '#1A1F29', roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(ringStrip(a0 + 8, b0 + 8, 43, a0 + 46, b0 + 46, 40, seg, 20, 1), roofMat); W.add(roof);
    const lightC = canvas(64, 16), lg = lightC.getContext('2d'); lg.fillStyle = '#FFF8EA'; lg.fillRect(0, 0, 64, 16); lg.fillStyle = '#2A2C30'; for (let i = 0; i < 64; i += 16) lg.fillRect(i, 0, 3, 16);
    const lights = new THREE.Mesh(ringStrip(a0 + 7.6, b0 + 7.6, 42.2, a0 + 8, b0 + 8, 43, seg, 3, 1), new THREE.MeshBasicMaterial({ map: tex(lightC, { repeat: [1, 1] }), side: THREE.DoubleSide, color: this.tod === 'day' ? '#888' : '#fff' }));
    lights.material.map.wrapS = THREE.RepeatWrapping; W.add(lights);
    // glow sprites along the roof light ring
    if (this.tod !== 'day') {
      const gt = tex(glowCanvas());
      const gm = new THREE.SpriteMaterial({ map: gt, color: 0xfff1d8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false });
      for (let i = 0; i < 28; i++) {
        const [x, z] = superPt(a0 + 7.8, b0 + 7.8, (i / 28) * PI * 2);
        const s = new THREE.Sprite(gm); s.position.set(x, 42.4, z); s.scale.setScalar(16); W.add(s);
      }
    }
    // ad boards
    this.boardTex = tex(boardsCanvas(false), { repeat: [1, 1] }); this.boardTex.wrapS = THREE.RepeatWrapping;
    this.boardGoalTex = tex(boardsCanvas(true, opts.accent || '#5EF2E4'), { repeat: [1, 1] }); this.boardGoalTex.wrapS = THREE.RepeatWrapping;
    this.boardMat = new THREE.MeshBasicMaterial({ map: this.boardTex, color: this.tod === 'day' ? '#bbb' : '#fff' });
    const bh = 0.95, off = 4.5, offG = 5.5;
    const mk = (len, x, z, ry) => { const geo = new THREE.BoxGeometry(len, bh, 0.12); const mm = new THREE.Mesh(geo, [this.boardMat, this.boardMat, new THREE.MeshBasicMaterial({ color: '#0a0c10' }), new THREE.MeshBasicMaterial({ color: '#0a0c10' }), this.boardMat, this.boardMat]); mm.position.set(x, bh / 2, z); mm.rotation.y = ry; W.add(mm); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 26); };
    mk(P.L + 8, 0, -(P.HW + off), 0); mk(P.L + 8, 0, P.HW + off, PI);
    const bl = P.HW + off - (P.goalW / 2 + 3);
    for (const s of [-1, 1]) for (const q of [-1, 1]) mk(bl, s * (P.H + offG), q * (P.goalW / 2 + 3 + bl / 2), s * PI / 2);
    // dugouts
    const dug = new THREE.MeshStandardMaterial({ color: '#232A35', roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.85 });
    for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 2.2), dug); d.position.set(s * 9, 1.1, -(P.HW + 7.2)); W.add(d); }
  }

  buildStreet(W, P, opts) {
    // kickboards (graffiti) + fence
    const gc = canvas(1024, 128), g = gc.getContext('2d');
    const r = rnd(21);
    g.fillStyle = '#1E2229'; g.fillRect(0, 0, 1024, 128);
    const pal = ['#5EF2E4', '#FFB547', '#FF5E7E', '#F5F2EA', '#7C8CFF', '#3BD16F'];
    for (let i = 0; i < 26; i++) {
      g.fillStyle = pal[Math.floor(r() * pal.length)]; g.globalAlpha = 0.35 + r() * 0.5;
      g.beginPath(); const x = r() * 1024, y = r() * 128, rr = 10 + r() * 50; g.ellipse(x, y, rr * (1 + r()), rr * 0.5, r() * PI, 0, PI * 2); g.fill();
    }
    g.globalAlpha = 1; g.font = '900 64px Geist, Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillStyle = '#F5F2EA'; g.fillText('SAHA 27', 40, 66); g.fillStyle = '#5EF2E4'; g.fillText('SOKAK', 560, 66);
    g.strokeStyle = '#05060A'; g.lineWidth = 3; g.strokeText('SAHA 27', 40, 66); g.strokeText('SOKAK', 560, 66);
    const gtex = tex(gc, { repeat: [1, 1] }); gtex.wrapS = THREE.RepeatWrapping;
    const kbMat = new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.8 });
    const fenceTex = tex(fenceCanvas(), { repeat: [1, 1] }); fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
    const fenceMat = (len, h) => { const t = fenceTex.clone(); t.needsUpdate = true; t.repeat.set(len / 1.2, h / 1.2); return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.1, color: '#aab4c0' }); };
    const postMat = new THREE.MeshStandardMaterial({ color: '#3A414D', roughness: 0.5, metalness: 0.6 });
    const kb = 1.0, fh = 4.2;
    const wall = (len, x, z, ry, fence = true, h = kb) => {
      const geo = new THREE.BoxGeometry(len, h, 0.2);
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 22);
      const m = new THREE.Mesh(geo, kbMat); m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; m.castShadow = true; W.add(m);
      if (!fence) return;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(len, fh - h), fenceMat(len, fh - h)); f.position.set(x, h + (fh - h) / 2, z); f.rotation.y = ry; W.add(f);
      for (let i = 0; i <= Math.floor(len / 3); i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, fh, 6), postMat); const t = -len / 2 + i * (len / Math.floor(len / 3)); p.position.set(x + Math.cos(ry) * t, fh / 2, z - Math.sin(ry) * t); W.add(p); }
    };
    const t = 0.1;
    // the camera side keeps only a low board so the fence never blocks the view
    wall(P.L + 0.4, 0, -(P.HW + t), 0); wall(P.L + 0.4, 0, P.HW + t, 0, false, 0.6);
    const sideLen = (P.W - P.goalW) / 2;
    for (const s of [-1, 1]) for (const q of [-1, 1]) wall(sideLen, s * (P.H + t), q * (P.goalW / 2 + sideLen / 2), PI / 2);
    // above-goal fence
    for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(P.goalW, fh - P.goalH), fenceMat(P.goalW, fh - P.goalH)); f.position.set(s * (P.H + P.goalD + 0.1), P.goalH + (fh - P.goalH) / 2, 0); f.rotation.y = PI / 2; W.add(f); }
    // city blocks with lit windows
    const wc = canvas(128, 256), wg = wc.getContext('2d');
    wg.fillStyle = '#0D1018'; wg.fillRect(0, 0, 128, 256);
    for (let y = 8; y < 256; y += 16) for (let x = 6; x < 128; x += 14) { const on = r() < 0.38; wg.fillStyle = on ? (r() < 0.7 ? '#FFD9A0' : '#BFE3FF') : '#151A24'; wg.fillRect(x, y, 8, 9); }
    const wtex = tex(wc, { repeat: [1, 1] }); wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
    for (let i = 0; i < 34; i++) {
      const ang = (i / 34) * PI * 2 + r() * 0.1;
      const dist = 48 + r() * 50;
      const w = 10 + r() * 16, h = 12 + r() * 40, d = 10 + r() * 14;
      const t2 = wtex.clone(); t2.needsUpdate = true; t2.repeat.set(w / 12, h / 24);
      const mat = new THREE.MeshStandardMaterial({ color: '#202634', map: t2, emissive: '#ffffff', emissiveMap: t2, emissiveIntensity: 0.55, roughness: 0.9 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(Math.cos(ang) * dist * 1.25, h / 2, Math.sin(ang) * dist);
      b.lookAt(0, h / 2, 0); W.add(b);
    }
    // street lamps
    const gt = tex(glowCanvas());
    const gm = new THREE.SpriteMaterial({ map: gt, color: 0xffe2b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8, fog: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (P.H + 4), z = sz * (P.HW + 4);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 11, 8), postMat); pole.position.set(x, 5.5, z); W.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.8), new THREE.MeshBasicMaterial({ color: '#FFF4DA' })); head.position.set(x - sx * 0.6, 11, z - sz * 0.3); W.add(head);
      const s = new THREE.Sprite(gm); s.position.copy(head.position); s.scale.setScalar(9); W.add(s);
    }
    // bleachers on one side
    const bm = new THREE.MeshStandardMaterial({ color: '#2B313C', roughness: 0.7, metalness: 0.4 });
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(P.L * 0.7, 0.35, 0.9), bm); b.position.set(0, 0.4 + i * 0.45, -(P.HW + 2.2 + i * 0.9)); W.add(b); }
    this.crowdMat = null; this.boardMat = null;
  }

  disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) { if (m.map && m.map !== this.boardTex) m.map.dispose(); m.dispose(); }
    });
  }

  // -------------------------------------------------------------- players
  attach(match) {
    this.detachPlayers();
    this.match = match;
    for (const p of match.players) {
      const T = p.T;
      const kit = T.kit;
      const rig = new Rig(this.shared, { ...kit, gkShirt: T.def.gk || '#35C46A' }, p.sp, p.isGK, p.isGK);
      this.scene.add(rig.root); this.scene.add(rig.blob);
      this.rigs.set(p.id, rig);
    }
    const ringCols = ['#5EF2E4', '#FFB547'];
    this.markers = match.humans.map((h, i) => {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 40), new THREE.MeshBasicMaterial({ color: ringCols[i % 2], transparent: true, opacity: 0.95, depthWrite: false }));
      ring.rotation.x = -PI / 2;
      const arrowShape = new THREE.Shape(); arrowShape.moveTo(0, 0.95); arrowShape.lineTo(0.22, 0.72); arrowShape.lineTo(-0.22, 0.72); arrowShape.closePath();
      const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), ring.material);
      arrow.rotation.x = -PI / 2;
      g.add(ring); g.add(arrow);
      g.position.y = 0.03; g.renderOrder = 2;
      this.scene.add(g);
      return { g, arrow };
    });
  }

  detachPlayers() {
    for (const r of this.rigs.values()) { this.scene.remove(r.root); this.scene.remove(r.blob); r.dispose(); }
    this.rigs.clear();
    for (const m of this.markers) this.scene.remove(m.g);
    this.markers = [];
    this.match = null;
  }

  setCrowdColors(cols) {
    if (!this.crowdTex) return;
    const c = crowdCanvas(cols, 11);
    this.crowdTex.image = c; this.crowdTex.needsUpdate = true;
  }

  goalFx(accent) {
    this.boardFlash = 4.5;
    if (this.boardMat) {
      const c = boardsCanvas(true, accent);
      this.boardGoalTex.image = c; this.boardGoalTex.needsUpdate = true;
      this.boardMat.map = this.boardGoalTex;
    }
    this.fovKick = 1;
  }

  netHit(e) {
    const n = this.nets.find((q) => q.s === e.s);
    if (!n) return;
    n.amp = Math.min(0.55, 0.15 + (e.v || 8) * 0.03); n.hz = e.z; n.hy = e.y;
  }

  // -------------------------------------------------------------- per frame
  frame(dt, view) {
    this.time += dt;
    const m = view.match;
    // animated materials
    if (this.boardMat) {
      this.boardTex.offset.x -= dt * 0.025; this.boardGoalTex.offset.x -= dt * 0.08;
      if (this.boardFlash > 0) { this.boardFlash -= dt; if (this.boardFlash <= 0) this.boardMat.map = this.boardTex; }
    }
    if (this.ribbonTex) this.ribbonTex.offset.x += dt * 0.01;
    if (this.crowdTex) {
      const ex = view.excite || 0;
      this.crowdTex.offset.y = Math.abs(Math.sin(this.time * (6 + ex * 6))) * 0.012 * (0.2 + ex * 2);
    }
    if (this.flags) for (const f of this.flags) f.rotation.y = Math.sin(this.time * 2 + f.position.x) * 0.3;
    for (const n of this.nets) this.updateNet(n, dt);

    // players
    if (m) {
      if (view.frame) this.applyFrame(view.frame, dt);
      else {
        for (const p of m.players) {
          const rig = this.rigs.get(p.id); if (!rig) continue;
          if (p.off) { rig.root.visible = false; rig.blob.visible = false; continue; }
          rig.root.visible = true; rig.blob.visible = true;
          poseRig(rig, { x: p.x, z: p.z, y: p.y, face: p.face, speed: p.speed, st: ST_CODE[p.st] ?? 0, stT: p.stT, phase: p.phase, diveDir: p.diveDir * p.diveH }, dt);
        }
        this.applyBall(m.ball.x, m.ball.y, m.ball.z, dt, m.ball);
      }
      // human markers
      m.humans.forEach((h, i) => {
        const mk = this.markers[i]; if (!mk) return;
        const p = h.p;
        const show = p && !p.off && !view.frame && view.showMarkers !== false;
        mk.g.visible = !!show;
        if (show) { mk.g.position.set(p.x, 0.03, p.z); mk.g.rotation.y = -p.face - PI / 2; }
      });
    }
    this.updateCamera(dt, view);
    this.gl.render(this.scene, this.camera);
  }

  applyFrame(f, dt) {
    const m = this.match, n = m.players.length;
    for (let i = 0; i < n; i++) {
      const p = m.players[i], rig = this.rigs.get(p.id); if (!rig) continue;
      const o = 4 + i * 9;
      if (f[o + 5] < 0) { rig.root.visible = false; rig.blob.visible = false; continue; }
      rig.root.visible = true; rig.blob.visible = true;
      poseRig(rig, { x: f[o], z: f[o + 1], y: f[o + 2], face: f[o + 3], speed: f[o + 4], st: f[o + 5], stT: f[o + 6], phase: f[o + 7], diveDir: f[o + 8] }, dt);
    }
    this.applyBall(f[0], f[1], f[2], dt, null);
  }

  applyBall(x, y, z, dt, B) {
    const b = this.ball;
    const dx = x - this.lastBall.x, dz = z - this.lastBall.z;
    const dl = Math.hypot(dx, dz);
    if (dl > 0.0001 && dl < 3) {
      this.tmpV.set(dz, 0, -dx).normalize();
      this.ballQ.setFromAxisAngle(this.tmpV, dl / (BALL_R * this.ballScale) * 0.9);
      b.quaternion.premultiply(this.ballQ);
    }
    this.lastBall.set(x, y, z);
    const yy = Math.max(y, BALL_R * this.ballScale);
    b.position.set(x, yy, z);
    this.ballBlob.position.set(x, 0.016, z);
    const hs = 0.42 + Math.min(1.4, y) * 0.25;
    this.ballBlob.scale.setScalar(hs);
    this.ballBlob.material.opacity = 1;
    // trail
    const sp = B ? Math.hypot(B.vx, B.vy, B.vz) : (dt > 0 ? dl / dt : 0);
    const want = sp > 19 ? 1 : 0;
    this.trailOn += (want - this.trailOn) * damp(want ? 12 : 4, dt);
    const tp = this.trailPts;
    for (let i = tp.length - 3; i >= 3; i -= 3) { tp[i] = tp[i - 3]; tp[i + 1] = tp[i - 2]; tp[i + 2] = tp[i - 1]; }
    tp[0] = x; tp[1] = yy; tp[2] = z;
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.material.opacity = this.trailOn * 0.45;
  }

  updateNet(n, dt) {
    const pos = n.mesh.geometry.attributes.position, base = n.base;
    if (n.amp < 0.002 && !n.dirty) return;
    n.dirty = n.amp >= 0.002;
    // mesh is rotated: local x maps to world z (across), local y to height; local z -> outward (world x)
    for (let i = 0; i < pos.count; i++) {
      const lx = base[i * 3], ly = base[i * 3 + 1];
      const wz = -lx, wy = ly + this.P.goalH / 2;
      const d = Math.hypot(wz - n.hz, (wy - n.hy) * 1.2);
      const f = Math.exp(-d * d * 0.9) * n.amp;
      pos.setZ(i, base[i * 3 + 2] + f * n.s);
    }
    pos.needsUpdate = true;
    n.amp *= Math.exp(-dt * 3.2);
  }

  // -------------------------------------------------------------- camera
  updateCamera(dt, view) {
    const P = this.P, cam = this.camera;
    if (!P) return;
    const m = view.match;
    let tp = this.tmpTarget || (this.tmpTarget = new THREE.Vector3());
    let tl = this.tmpLook || (this.tmpLook = new THREE.Vector3());
    let fov = 30, k = 3.2, kl = 4.5;
    const sc = P.sc;
    if (view.mode === 'menu' || !m) {
      const a = this.time * 0.05;
      const R = P.size === '5' ? 46 : 112;
      tp.set(Math.cos(a) * R, P.size === '5' ? 16 : 34, Math.sin(a) * R * 0.78);
      tl.set(0, 2, 0); fov = 36; k = 1.2; kl = 1.2;
    } else {
      let bx, by, bz, vx = 0, vz = 0;
      if (view.frame) { bx = view.frame[0]; by = view.frame[1]; bz = view.frame[2]; }
      else { const B = m.ball; bx = B.x; by = B.y; bz = B.z; vx = B.vx; vz = B.vz; }
      const hp = m.humans[0] && m.humans[0].p;
      if (view.mode === 'replay') {
        const a = view.replayAng + this.time * 0.15;
        const R = 10 * Math.max(0.7, sc * 1.2);
        if (view.replayStyle === 1) { const s = view.replaySide || 1; tp.set(s * (P.H + (P.size === '5' ? 1.2 : 3.2)), P.size === '5' ? 2.4 : 3.4, clamp(bz * 0.5, -P.goalW, P.goalW) + 2); }
        else tp.set(bx + Math.cos(a) * R, 2.6 + by * 0.3, bz + Math.sin(a) * R);
        tl.set(bx, Math.max(0.8, by * 0.7), bz); fov = 34; k = 2.5; kl = 7;
      } else if (view.mode === 'pen') {
        const pen = view.pen;
        const s = pen ? pen.s : 1, sx = pen ? pen.spot.x : P.H - P.pen;
        tp.set(sx - s * 8.5, 2.3, 0.0); tl.set(s * P.H, 1.1, 0); fov = 40; k = 3; kl = 4;
        if (pen && pen.phase === 'flight') { tl.set(lerp(s * P.H, bx, 0.3), 1.1, bz * 0.4); }
      } else if (view.mode === 'celebrate' && view.focus) {
        const f = view.focus;
        const side = f.z > 0 ? -1 : 1;
        tp.set(f.x - Math.sign(f.x || 1) * 6, 3.2, f.z + side * 9); tl.set(f.x, 1.3, f.z); fov = 32; k = 1.8; kl = 3.5;
      } else {
        const mode = this.camMode;
        const lead = 0.35;
        let fx = bx + vx * lead, fz = bz + vz * lead;
        if (hp && !view.frame) { fx = fx * 0.82 + hp.x * 0.18; fz = fz * 0.82 + hp.z * 0.18; }
        const nearGoal = clamp((Math.abs(fx) - (P.H - 26 * sc)) / (14 * sc), 0, 1);
        if (mode === 'end') {
          const dir = view.attackDir || 1;
          tp.set(fx - dir * 24 * Math.max(sc, 0.6), 15 * Math.max(sc, 0.6) + 3, fz * 0.75);
          tl.set(fx + dir * 12 * Math.max(sc, 0.6), 0, fz * 0.9); fov = 42;
        } else {
          const tele = mode === 'tele';
          // the camera sits on the gantry above the lower tier (inside the bowl, clear of the upper stand)
          const h = P.size === '5' ? (tele ? 10 : 13) : (tele ? 13 : 19);
          const dist = P.size === '5' ? (tele ? 13 : 19) : (tele ? 14 : 21);
          const cx = clamp(fx * 0.9, -(P.H - 10 * sc), P.H - 10 * sc);
          const zoom = 1 - nearGoal * 0.12;
          tp.set(cx, h * zoom, P.HW + dist * zoom + clamp(fz, -P.HW, P.HW) * 0.3);
          tl.set(cx + (fx - cx) * 0.6, 0, clamp(fz * 0.82, -P.HW * 0.8, P.HW * 0.8) + 1.2);
          fov = tele ? 30 : 30;
        }
        k = 2.4; kl = 4.2;
      }
    }
    if (this.camSnap) { this.camPos.copy(tp); this.camLook.copy(tl); this.camSnap = false; }
    this.camPos.lerp(tp, damp(k, dt));
    this.camLook.lerp(tl, damp(kl, dt));
    cam.position.copy(this.camPos);
    if (this.shake > 0) { cam.position.x += (Math.random() - 0.5) * this.shake; cam.position.y += (Math.random() - 0.5) * this.shake; this.shake *= Math.exp(-dt * 8); if (this.shake < 0.01) this.shake = 0; }
    cam.lookAt(this.camLook);
    this.fovKick *= Math.exp(-dt * 2.5);
    const f = fov - this.fovKick * 4;
    if (Math.abs(cam.fov - f) > 0.01) { cam.fov += (f - cam.fov) * damp(4, dt); cam.updateProjectionMatrix(); }
  }

  snapCamera() { this.camSnap = true; }

  basis() {
    const d = this.tmpV2 || (this.tmpV2 = new THREE.Vector3());
    this.camera.getWorldDirection(d);
    let fx = d.x, fz = d.z; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
    return { fx, fz, rx: -fz, rz: fx };
  }

  project(x, y, z) {
    const v = this.tmpP || (this.tmpP = new THREE.Vector3());
    v.set(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H, on: v.z < 1 && v.z > -1 };
  }
}
