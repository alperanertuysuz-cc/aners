// SAHA 27 — teams, squads, formations, difficulty tables.
// All clubs and players are fictional. Use the in-game team editor to rename.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const FIRST = ['Arda', 'Kerem', 'Emir', 'Yusuf', 'Burak', 'Efe', 'Mert', 'Kaan', 'Can', 'Deniz', 'Barış', 'Onur', 'Oğuz', 'Tolga', 'Umut', 'Selim', 'Eren', 'Alp', 'Berk', 'Kuzey', 'Doruk', 'Çağan', 'Ozan', 'Furkan', 'Ömer', 'Hakan', 'Volkan', 'Serkan', 'Batuhan', 'Taylan', 'Görkem', 'Ege', 'Aras', 'Rüzgar', 'Atlas', 'Mirza', 'Yiğit', 'Koray', 'Sinan', 'Levent', 'Tuna', 'Bora', 'Ufuk', 'Cem', 'Murat', 'Halil', 'İlkay', 'Kenan', 'Orkun', 'Cenk', 'Rıza', 'Samet', 'Taner', 'Uğur', 'Yasin', 'Zeki', 'Baran', 'Ali', 'Mehmet', 'Hamza'];
const LAST = ['Yıldız', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Erdem', 'Tekin', 'Aksoy', 'Bulut', 'Güneş', 'Ateş', 'Tunç', 'Akın', 'Uçar', 'Sezer', 'Erkan', 'Duman', 'Karaca', 'Toprak', 'Yalçın', 'Ekinci', 'Oral', 'Turan', 'Bozkurt', 'Keskin', 'Soylu', 'Ergin', 'Uysal', 'Önal', 'Akbaş', 'Taş', 'Yavuz', 'Gündoğdu', 'Er', 'Altay', 'Işık', 'Sarı', 'Yazıcı', 'Avcı', 'Ilgaz', 'Tan', 'Gök', 'Kaplan', 'Ova', 'Dalgıç', 'Coşkun', 'Ünal'];

// kit: shirt, shorts, socks, trim, pattern: plain|stripes|hoops|half|sash
export const TEAMS = [
  { id: 'bogazici', name: 'Boğaziçi FK', short: 'BOĞ', city: 'İstanbul', ovr: 85, style: { press: .75, tempo: .7, width: .6 }, form: '4-3-3',
    home: { shirt: '#11284A', shorts: '#11284A', socks: '#E9C46A', trim: '#E9C46A', pattern: 'plain' }, away: { shirt: '#F3EFE4', shorts: '#11284A', socks: '#F3EFE4', trim: '#11284A', pattern: 'plain' }, gk: '#35C46A' },
  { id: 'baskent', name: 'Başkent Atlas', short: 'BAŞ', city: 'Ankara', ovr: 82, style: { press: .6, tempo: .55, width: .5 }, form: '4-2-3-1',
    home: { shirt: '#C8202F', shorts: '#FFFFFF', socks: '#C8202F', trim: '#FFFFFF', pattern: 'plain' }, away: { shirt: '#1D1D22', shorts: '#1D1D22', socks: '#C8202F', trim: '#C8202F', pattern: 'plain' }, gk: '#F2C230' },
  { id: 'ege', name: 'Ege Rüzgârı', short: 'EGE', city: 'İzmir', ovr: 81, style: { press: .55, tempo: .8, width: .75 }, form: '4-3-3',
    home: { shirt: '#6EC1EA', shorts: '#FFFFFF', socks: '#6EC1EA', trim: '#FFFFFF', pattern: 'stripes', alt: '#FFFFFF' }, away: { shirt: '#0F3B5F', shorts: '#0F3B5F', socks: '#6EC1EA', trim: '#6EC1EA', pattern: 'plain' }, gk: '#FF7A1A' },
  { id: 'akdeniz', name: 'Akdeniz Güneşi', short: 'AKD', city: 'Antalya', ovr: 79, style: { press: .5, tempo: .65, width: .7 }, form: '4-4-2',
    home: { shirt: '#F57C1F', shorts: '#16161A', socks: '#F57C1F', trim: '#16161A', pattern: 'plain' }, away: { shirt: '#FFFFFF', shorts: '#F57C1F', socks: '#FFFFFF', trim: '#F57C1F', pattern: 'plain' }, gk: '#3E8EF7' },
  { id: 'toros', name: 'Toros Gücü', short: 'TOR', city: 'Adana', ovr: 78, style: { press: .7, tempo: .5, width: .45 }, form: '4-4-2',
    home: { shirt: '#1E8C4E', shorts: '#FFFFFF', socks: '#1E8C4E', trim: '#FFFFFF', pattern: 'hoops', alt: '#FFFFFF' }, away: { shirt: '#F4F1E8', shorts: '#1E8C4E', socks: '#1E8C4E', trim: '#1E8C4E', pattern: 'plain' }, gk: '#9B4DE0' },
  { id: 'uludag', name: 'Uludağ Kar SK', short: 'ULU', city: 'Bursa', ovr: 77, style: { press: .55, tempo: .6, width: .6 }, form: '4-2-3-1',
    home: { shirt: '#F5F7FA', shorts: '#0E7C86', socks: '#F5F7FA', trim: '#0E7C86', pattern: 'sash', alt: '#0E7C86' }, away: { shirt: '#0E7C86', shorts: '#0E7C86', socks: '#F5F7FA', trim: '#F5F7FA', pattern: 'plain' }, gk: '#E23D5B' },
  { id: 'karadeniz', name: 'Karadeniz Dalga', short: 'KAR', city: 'Samsun', ovr: 76, style: { press: .8, tempo: .7, width: .5 }, form: '4-3-3',
    home: { shirt: '#0B4F4A', shorts: '#0B4F4A', socks: '#FFFFFF', trim: '#9FE3D8', pattern: 'half', alt: '#9FE3D8' }, away: { shirt: '#E8E2D0', shorts: '#E8E2D0', socks: '#0B4F4A', trim: '#0B4F4A', pattern: 'plain' }, gk: '#F2C230' },
  { id: 'kapadokya', name: 'Kapadokya SK', short: 'KAP', city: 'Nevşehir', ovr: 74, style: { press: .45, tempo: .45, width: .55 }, form: '4-4-2',
    home: { shirt: '#B4532A', shorts: '#F1E3C8', socks: '#B4532A', trim: '#F1E3C8', pattern: 'plain' }, away: { shirt: '#F1E3C8', shorts: '#B4532A', socks: '#F1E3C8', trim: '#B4532A', pattern: 'plain' }, gk: '#2C7BE5' },
  { id: 'mezopotamya', name: 'Mezopotamya FK', short: 'MEZ', city: 'Diyarbakır', ovr: 75, style: { press: .6, tempo: .55, width: .6 }, form: '3-5-2',
    home: { shirt: '#7A1F2B', shorts: '#FFFFFF', socks: '#2E7D32', trim: '#2E7D32', pattern: 'plain' }, away: { shirt: '#FFFFFF', shorts: '#7A1F2B', socks: '#FFFFFF', trim: '#7A1F2B', pattern: 'plain' }, gk: '#F2C230' },
  { id: 'pamukkale', name: 'Pamukkale Beyaz', short: 'PAM', city: 'Denizli', ovr: 73, style: { press: .5, tempo: .6, width: .65 }, form: '4-3-3',
    home: { shirt: '#FFFFFF', shorts: '#8EC5E8', socks: '#FFFFFF', trim: '#8EC5E8', pattern: 'plain' }, away: { shirt: '#22344F', shorts: '#22344F', socks: '#8EC5E8', trim: '#8EC5E8', pattern: 'plain' }, gk: '#FF7A1A' },
  { id: 'kizilirmak', name: 'Kızılırmak SK', short: 'KIZ', city: 'Kırşehir', ovr: 72, style: { press: .65, tempo: .5, width: .5 }, form: '4-4-2',
    home: { shirt: '#A3122A', shorts: '#16161A', socks: '#16161A', trim: '#16161A', pattern: 'stripes', alt: '#16161A' }, away: { shirt: '#D9D9DE', shorts: '#16161A', socks: '#D9D9DE', trim: '#A3122A', pattern: 'plain' }, gk: '#35C46A' },
  { id: 'vangolu', name: 'Van Gölü FK', short: 'VAN', city: 'Van', ovr: 71, style: { press: .5, tempo: .5, width: .6 }, form: '4-2-3-1',
    home: { shirt: '#18B7B0', shorts: '#FFFFFF', socks: '#18B7B0', trim: '#FFFFFF', pattern: 'plain' }, away: { shirt: '#24303D', shorts: '#24303D', socks: '#18B7B0', trim: '#18B7B0', pattern: 'plain' }, gk: '#F2C230' },
  { id: 'nemrut', name: 'Nemrut Dağı SK', short: 'NEM', city: 'Adıyaman', ovr: 70, style: { press: .55, tempo: .45, width: .5 }, form: '4-4-2',
    home: { shirt: '#17171B', shorts: '#17171B', socks: '#F28C28', trim: '#F28C28', pattern: 'hoops', alt: '#F28C28' }, away: { shirt: '#F28C28', shorts: '#FFFFFF', socks: '#F28C28', trim: '#17171B', pattern: 'plain' }, gk: '#3E8EF7' },
  { id: 'marmara', name: 'Marmara Liman', short: 'MAR', city: 'Kocaeli', ovr: 72, style: { press: .6, tempo: .6, width: .55 }, form: '3-5-2',
    home: { shirt: '#5D6B7A', shorts: '#1C2A3A', socks: '#5D6B7A', trim: '#F5F7FA', pattern: 'plain' }, away: { shirt: '#F5F7FA', shorts: '#5D6B7A', socks: '#F5F7FA', trim: '#1C2A3A', pattern: 'plain' }, gk: '#E23D5B' },
  { id: 'gobeklitepe', name: 'Göbeklitepe FK', short: 'GÖB', city: 'Şanlıurfa', ovr: 70, style: { press: .45, tempo: .5, width: .6 }, form: '4-3-3',
    home: { shirt: '#D8B577', shorts: '#5A3B22', socks: '#D8B577', trim: '#5A3B22', pattern: 'half', alt: '#5A3B22' }, away: { shirt: '#5A3B22', shorts: '#5A3B22', socks: '#D8B577', trim: '#D8B577', pattern: 'plain' }, gk: '#35C46A' },
  { id: 'efes', name: 'Efes Antik', short: 'EFE', city: 'Selçuk', ovr: 74, style: { press: .55, tempo: .65, width: .65 }, form: '4-3-3',
    home: { shirt: '#2747A8', shorts: '#C9CED6', socks: '#2747A8', trim: '#C9CED6', pattern: 'plain' }, away: { shirt: '#C9CED6', shorts: '#2747A8', socks: '#C9CED6', trim: '#2747A8', pattern: 'plain' }, gk: '#F2C230' },
];

// Formation slots: d = depth (0 back line .. 1 front line), w = width (-1 left .. 1 right), r = role.
export const FORMATIONS = {
  '4-3-3': [
    { k: 'KL', r: 'GK' },
    { k: 'SLB', r: 'DEF', d: .06, w: -.82 }, { k: 'STP', r: 'DEF', d: 0, w: -.3 }, { k: 'STP', r: 'DEF', d: 0, w: .3 }, { k: 'SĞB', r: 'DEF', d: .06, w: .82 },
    { k: 'OS', r: 'MID', d: .46, w: -.42 }, { k: 'DOS', r: 'MID', d: .32, w: 0 }, { k: 'OS', r: 'MID', d: .46, w: .42 },
    { k: 'SLK', r: 'FWD', d: .93, w: -.74 }, { k: 'SNT', r: 'FWD', d: 1, w: 0 }, { k: 'SĞK', r: 'FWD', d: .93, w: .74 },
  ],
  '4-4-2': [
    { k: 'KL', r: 'GK' },
    { k: 'SLB', r: 'DEF', d: .06, w: -.82 }, { k: 'STP', r: 'DEF', d: 0, w: -.3 }, { k: 'STP', r: 'DEF', d: 0, w: .3 }, { k: 'SĞB', r: 'DEF', d: .06, w: .82 },
    { k: 'SLO', r: 'MID', d: .5, w: -.78 }, { k: 'MO', r: 'MID', d: .42, w: -.24 }, { k: 'MO', r: 'MID', d: .42, w: .24 }, { k: 'SĞO', r: 'MID', d: .5, w: .78 },
    { k: 'SNT', r: 'FWD', d: 1, w: -.2 }, { k: 'SNT', r: 'FWD', d: .96, w: .2 },
  ],
  '4-2-3-1': [
    { k: 'KL', r: 'GK' },
    { k: 'SLB', r: 'DEF', d: .06, w: -.82 }, { k: 'STP', r: 'DEF', d: 0, w: -.3 }, { k: 'STP', r: 'DEF', d: 0, w: .3 }, { k: 'SĞB', r: 'DEF', d: .06, w: .82 },
    { k: 'DOS', r: 'MID', d: .3, w: -.22 }, { k: 'DOS', r: 'MID', d: .3, w: .22 },
    { k: 'SLK', r: 'MID', d: .7, w: -.72 }, { k: 'OOS', r: 'MID', d: .68, w: 0 }, { k: 'SĞK', r: 'MID', d: .7, w: .72 },
    { k: 'SNT', r: 'FWD', d: 1, w: 0 },
  ],
  '3-5-2': [
    { k: 'KL', r: 'GK' },
    { k: 'STP', r: 'DEF', d: 0, w: -.46 }, { k: 'STP', r: 'DEF', d: -.03, w: 0 }, { k: 'STP', r: 'DEF', d: 0, w: .46 },
    { k: 'SLK', r: 'MID', d: .45, w: -.86 }, { k: 'MO', r: 'MID', d: .45, w: -.3 }, { k: 'DOS', r: 'MID', d: .32, w: 0 }, { k: 'MO', r: 'MID', d: .45, w: .3 }, { k: 'SĞK', r: 'MID', d: .45, w: .86 },
    { k: 'SNT', r: 'FWD', d: 1, w: -.2 }, { k: 'SNT', r: 'FWD', d: .96, w: .2 },
  ],
  '1-2-1': [
    { k: 'KL', r: 'GK' },
    { k: 'DEF', r: 'DEF', d: 0, w: 0 },
    { k: 'SLO', r: 'MID', d: .5, w: -.62 }, { k: 'SĞO', r: 'MID', d: .5, w: .62 },
    { k: 'SNT', r: 'FWD', d: 1, w: 0 },
  ],
};
export const FORMATION_LIST = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'];

// AI tuning per difficulty (applies to CPU-controlled teams).
export const DIFFICULTY = {
  amator: { label: 'Amatör', react: .46, err: 1.75, press: .5, tackle: .32, gkReact: .27, gkReach: .82, speed: .93, smart: .45, shoot: .8 },
  pro: { label: 'Profesyonel', react: .32, err: 1.2, press: .72, tackle: .5, gkReact: .2, gkReach: .94, speed: .97, smart: .7, shoot: .95 },
  dunya: { label: 'Dünya Klası', react: .22, err: .9, press: .88, tackle: .66, gkReact: .155, gkReach: 1.0, speed: 1.0, smart: .86, shoot: 1.05 },
  efsane: { label: 'Efsane', react: .15, err: .7, press: 1.0, tackle: .8, gkReact: .12, gkReach: 1.06, speed: 1.03, smart: .97, shoot: 1.12 },
};
// Human team's AI teammates always play at this level.
export const MATE_LEVEL = { react: .28, err: 1.1, press: .7, tackle: .5, gkReact: .18, gkReach: .97, speed: .98, smart: .75, shoot: 1 };

const TEMPL = {
  GK: { pac: .55, sho: .3, pas: .62, dri: .45, def: .4, phy: .78, gk: 1.0 },
  DEF: { pac: .82, sho: .45, pas: .72, dri: .66, def: .99, phy: .93, gk: .1 },
  MID: { pac: .82, sho: .76, pas: 1.0, dri: .92, def: .74, phy: .8, gk: .1 },
  WNG: { pac: 1.04, sho: .84, pas: .86, dri: 1.0, def: .4, phy: .72, gk: .1 },
  FWD: { pac: .98, sho: 1.02, pas: .76, dri: .94, def: .35, phy: .86, gk: .1 },
};
const SQUAD_ROLES = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'WNG', 'FWD', 'WNG'];
const NATURAL_POS = ['KL', 'SLB', 'STP', 'STP', 'SĞB', 'OS', 'DOS', 'OS', 'SLK', 'SNT', 'SĞK'];
const NUMS = [1, 3, 4, 5, 2, 8, 6, 10, 11, 9, 7];

export function generateSquad(team) {
  const r = rng(hashStr(team.id) ^ 0x5a17);
  const used = new Set();
  const star = 7 + Math.floor(r() * 4);
  return SQUAD_ROLES.map((role, i) => {
    let name;
    for (let k = 0; k < 20; k++) {
      name = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)];
      if (!used.has(name)) break;
    }
    used.add(name);
    const t = TEMPL[role];
    const base = team.ovr + (i === star ? 4 : 0) + Math.round((r() - .5) * 6);
    const a = {};
    for (const k of Object.keys(t)) a[k] = Math.max(25, Math.min(97, Math.round(base * t[k] + (r() - .5) * 10)));
    return {
      name, num: NUMS[i], pos: NATURAL_POS[i], role, a,
      ovr: overall(role, a),
      skin: Math.floor(r() * 5), hair: Math.floor(r() * 6), hairStyle: Math.floor(r() * 4),
    };
  });
}

const OVR_W = {
  GK: { gk: 1 },
  DEF: { def: .45, phy: .22, pac: .15, pas: .13, dri: .05 },
  MID: { pas: .34, dri: .24, sho: .14, def: .14, pac: .08, phy: .06 },
  WNG: { pac: .3, dri: .3, sho: .18, pas: .17, phy: .05 },
  FWD: { sho: .38, pac: .22, dri: .2, phy: .1, pas: .1 },
};
// Templates scale attributes below the base rating; dividing by the role's template weight keeps OVR on the club's scale.
const OVR_NORM = { GK: 1, DEF: .9, MID: .885, WNG: .945, FWD: .953 };
export function overall(role, a) {
  const w = OVR_W[role] || OVR_W.MID;
  let s = 0; for (const k in w) s += a[k] * w[k];
  return Math.min(99, Math.round(s / (OVR_NORM[role] || 1)));
}

export function teamRatings(squad) {
  const avg = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  return {
    att: avg(squad.slice(8).map(p => (p.a.sho + p.a.pac + p.a.dri) / 3)),
    mid: avg(squad.slice(5, 8).map(p => (p.a.pas + p.a.dri + p.a.def) / 3)),
    def: avg([...squad.slice(1, 5).map(p => (p.a.def + p.a.phy) / 2), squad[0].a.gk]),
    ovr: avg(squad.map(p => p.ovr)),
  };
}

// For 5v5 street mode: GK + best defender, two mids/wingers, striker.
export function pickFive(squad) {
  const byDef = squad.slice(1, 5).sort((a, b) => b.a.def - a.a.def)[0];
  const mids = [squad[5], squad[7]].concat(squad.slice(8, 9)).sort((a, b) => b.ovr - a.ovr).slice(0, 2);
  return [squad[0], byDef, mids[0], mids[1], squad[9]];
}

// "redmean" weighted RGB distance: cheap and close enough to perceived difference for kit clashes.
export function colorDist(a, b) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r1 = (pa >> 16) & 255, r2 = (pb >> 16) & 255;
  const dr = r1 - r2, dg = ((pa >> 8) & 255) - ((pb >> 8) & 255), db = (pa & 255) - (pb & 255);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

export const SKIN = ['#F2D0B5', '#E0B092', '#C68B63', '#9A6440', '#6B4329'];
export const HAIR = ['#1C1612', '#3B2618', '#6A4628', '#B78A4A', '#D9C08A', '#0E0E10'];
