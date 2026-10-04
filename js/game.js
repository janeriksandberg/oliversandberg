// Paragrafagenten – et skytespill for å pugge forvaltningsrett.
(() => {
'use strict';

// ---------- Oppsett ----------
const SAVE_KEY = 'fvr-spill-v1';
const PW_KEY = 'fvr-spill-pw';
const RUN_LEN = 10;          // spørsmål per nivå (eller færre hvis kapitlet har færre)
const MIX_LEN = 15;
const MAX_HEARTS = 5;
const OPT_COLORS = ['#3fc8ff', '#ff5fd2', '#ff9f1c', '#a78bfa'];
const LETTERS = ['A', 'B', 'C', 'D'];

// Bokens seks deler. Del 2–6 har titler fra boken; del 1 består av kapittel 1–4.
const WORLDS = [
  { del: 'Del 1', title: 'Kapittel 1–4', name: 'Grunnmuren', from: 1, to: 4,
    sky: ['#1a1b4b', '#4b2c8f'], hill: '#2c2470', near: '#3a2f8f', ground: '#211a55', tint: 'rgba(120,90,255,.18)' },
  { del: 'Del 2', title: 'Forvaltningsapparatet og styringen av det', name: 'Departementsdalen', from: 5, to: 10,
    sky: ['#0b2a4a', '#1f6f8b'], hill: '#124a62', near: '#1b5f78', ground: '#0d3346', tint: 'rgba(63,200,255,.15)' },
  { del: 'Del 3', title: 'Alminnelige regler om forvaltningens saksbehandling', name: 'Saksbehandlingsskogen', from: 11, to: 14,
    sky: ['#0d2b1f', '#2e7d4f'], hill: '#1d5a3a', near: '#246b45', ground: '#123824', tint: 'rgba(46,229,157,.14)' },
  { del: 'Del 4', title: 'Behandlingen av saker som gjelder «vedtak»', name: 'Vedtaksvulkanen', from: 15, to: 22,
    sky: ['#2b0f1f', '#a33a2c'], hill: '#5a1f26', near: '#7a2a2a', ground: '#3a1418', tint: 'rgba(255,120,60,.16)' },
  { del: 'Del 5', title: 'Rettsgrunnlag og grenser for forvaltningens virksomhet', name: 'Hjemmelsfjellet', from: 23, to: 28,
    sky: ['#2a1a0a', '#b8742a'], hill: '#5c3a1a', near: '#6e4722', ground: '#3a240f', tint: 'rgba(255,95,210,.14)' },
  { del: 'Del 6', title: 'Ugyldighet, håndheving og kontroll', name: 'Domstolsborgen', from: 29, to: 33,
    sky: ['#05060f', '#1d2b5a'], hill: '#151f42', near: '#1e2b57', ground: '#0a1028', tint: 'rgba(255,209,102,.12)' },
];
const worldOf = ch => WORLDS.findIndex(w => ch >= w.from && ch <= w.to);

const WEAPONS = [
  { name: 'Blyantblaster', color: '#ffd166', rate: 0.22, speed: 720, dmg: 1, shape: 'pellet' },
  { name: 'Stempelkanon', color: '#ff4d6d', rate: 0.26, speed: 640, dmg: 1.4, shape: 'stamp' },
  { name: 'Paragrafpistol', color: '#3fc8ff', rate: 0.18, speed: 760, dmg: 1.1, shape: 'para' },
  { name: 'Vedtakslaser', color: '#2ee59d', rate: 0.1, speed: 1100, dmg: 0.7, shape: 'laser' },
  { name: 'Lovbokrakett', color: '#ff9f1c', rate: 0.3, speed: 520, dmg: 2.2, shape: 'rocket' },
  { name: 'Høyesterettshammer', color: '#fff2a8', rate: 0.2, speed: 680, dmg: 2, shape: 'hammer' },
];
const POWER_NAMES = ['', ' II', ' III', ' MAKS'];

const RANKS = [
  [0, 'Saksbehandler'], [1000, 'Førstekonsulent'], [2500, 'Rådgiver'], [5000, 'Seniorrådgiver'],
  [8000, 'Fagdirektør'], [12000, 'Avdelingsdirektør'], [17000, 'Departementsråd'], [23000, 'Sivilombud'], [30000, 'Høyesterettsdommer'],
];
const FODDER = ['Skjemablob', 'Køtroll', 'Stempelspøkelse', 'Saksbunke', 'Purreklegg', 'Arkivmøll'];
const BOSSES = ['Byråkratkongen', 'Instruks-hydraen', 'Inhabilitetsgolemen', 'Vedtaksdragen', 'Hjemmelsløsheten', 'Ugyldighetstitanen'];
const PRAISE = ['Riktig!', 'Knallbra!', 'Sånn ja!', 'Rått!', 'Juss-geni!', 'Treff!', 'Helt rett!'];

// ---------- Hjelpere ----------
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const screens = ['login', 'menu', 'intro', 'pause', 'result', 'help'];
function show(id) { screens.forEach(s => $(s).classList.toggle('hidden', s !== id)); }

// ---------- Lagring ----------
let save = loadSave();
function loadSave() {
  const def = { xp: 0, coins: 0, ch: {}, q: {}, settings: { sound: true, music: false, calm: false, motion: false } };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) return { ...def, ...s, settings: { ...def.settings, ...(s.settings || {}) } }; } catch (e) {}
  return def;
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// ---------- Data ----------
let BANK = null;         // { chapters: [...] }
let CH = {};             // kapittelnummer -> kapittel
function prepareBank(data) {
  BANK = data; CH = {};
  data.chapters.forEach(c => {
    CH[c.chapter] = c;
    c.questions.forEach(q => { q.id = c.chapter + '-' + hash(q.q); q.chapter = c.chapter; });
  });
}
const allQuestions = () => BANK.chapters.flatMap(c => c.questions);

// Velger spørsmål: aldri sett og nylig feil først, så de man kan minst godt.
function pickQuestions(pool, n) {
  const score = q => {
    const s = save.q[q.id];
    if (!s) return 1 + Math.random();
    return (s.lastWrong ? 2 : 0) + 1 / (1 + s.right) + Math.random() * 0.6;
  };
  return pool.map(q => [score(q), q]).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);
}
function prepQ(q) {
  const order = shuffle([0, 1, 2, 3]);
  return { ...q, opts: order.map(i => q.options[i]), correct: order.indexOf(q.answer) };
}

// ---------- Canvas ----------
const cv = $('game'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize); resize();

// ---------- Spilltilstand ----------
const G = {
  mode: 'idle', world: 0, t: 0, scroll: 0, speed: 60, shake: 0, flash: 0, flashColor: '#fff',
  hero: { x: 110, y: 300, ty: 300, dash: 0, hurt: 0, cool: 0 },
  bullets: [], enemies: [], parts: [], texts: [], stars: [],
  run: null,
};
for (let i = 0; i < 90; i++) G.stars.push({ x: Math.random(), y: Math.random() * 0.7, z: rand(0.2, 1) });

function playTop() { return W <= 640 ? 104 : 64; }
function playBottom() {
  const p = $('qpanel');
  if (!p.classList.contains('hidden')) return Math.max(playTop() + 160, H - p.offsetHeight - 24);
  return H - 70;
}

// ---------- Effekter ----------
const reduced = () => save.settings.motion;
function burst(x, y, color, n = 18, sp = 260, size = 4) {
  if (reduced()) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(sp * 0.3, sp);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 0.9), max: 0.9, color, size: rand(size * 0.5, size * 1.4), g: 300 });
  }
}
function confetti(n = 120) {
  const cols = ['#ffd166', '#ff5fd2', '#3fc8ff', '#2ee59d', '#a78bfa', '#ff9f1c'];
  for (let i = 0; i < n; i++) G.parts.push({ x: rand(0, W), y: rand(-60, -10), vx: rand(-60, 60), vy: rand(80, 260), life: rand(2, 3.5), max: 3.5, color: cols[i % cols.length], size: rand(4, 8), g: 60, rect: true, rot: rand(0, 6) });
}
function floatText(x, y, text, color = '#ffd166', size = 22) {
  G.texts.push({ x, y, text, color, size, life: 1.2 });
}
function shake(a) { if (!reduced()) G.shake = Math.max(G.shake, a); }
function flash(color, a = 0.35) { if (!reduced()) { G.flash = a; G.flashColor = color; } }
function banner(html, ms = 1400) {
  const b = $('banner'); b.innerHTML = html; b.classList.remove('hidden');
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.add('hidden'), ms);
}

// ---------- Kjøring av nivå ----------
function startRun(kind, chapter) {
  let qs, world, label, startPower = 0;
  if (kind === 'chapter') {
    const c = CH[chapter];
    qs = pickQuestions(c.questions, Math.min(RUN_LEN, c.questions.length));
    world = worldOf(chapter);
    label = `Kapittel ${chapter}: ${c.title}`;
    if ((save.ch[chapter]?.stars || 0) >= 2) startPower = 1;
  } else if (kind === 'mixed') {
    qs = pickQuestions(allQuestions(), MIX_LEN);
    world = highestWorld();
    label = 'Eksamenstrening – blandede kapitler';
  } else {
    const pool = allQuestions().filter(q => save.q[q.id]?.lastWrong);
    qs = shuffle(pool).slice(0, MIX_LEN);
    world = highestWorld();
    label = 'Feilbanken – spørsmål du har bommet på';
  }
  shuffle(qs);
  G.world = world;
  G.run = {
    kind, chapter, label, queue: qs.map(prepQ), main: qs.length, qi: 0, retry: [], retrying: false,
    hearts: MAX_HEARTS, streak: 0, bestStreak: 0, power: startPower, weapon: world,
    score: 0, coins: 0, firstRight: 0, answered: 0, missed: [], bomb: 0,
    phase: 'wave', phaseT: 0, spawnLeft: 0, spawnT: 0, cur: null, timer: 0, timerMax: 0, chosen: -1,
  };
  G.bullets = []; G.enemies = []; G.parts = []; G.texts = [];
  G.hero.y = G.hero.ty = H * 0.45; G.hero.hurt = 0;
  G.mode = 'play';
  show(null);
  $('hud').classList.remove('hidden');
  $('hudLabel').textContent = label;
  updateHud();
  banner(`${WORLDS[world].name}<small>${esc(label)}</small>`, 1800);
  Sfx.power();
  beginWave();
}
function highestWorld() {
  let w = 0;
  Object.keys(save.ch).forEach(c => { if (save.ch[c].plays) w = Math.max(w, worldOf(+c)); });
  return w;
}

function beginWave() {
  const r = G.run;
  r.phase = 'wave'; r.phaseT = 0;
  r.spawnLeft = 4 + r.power * 2 + Math.floor(r.qi / 3);
  r.spawnT = 0.3;
  $('qpanel').classList.add('hidden');
}

function beginQuestion() {
  const r = G.run;
  if (r.qi >= r.queue.length) {
    if (!r.retrying && r.retry.length) {
      r.retrying = true; r.queue = r.queue.concat(r.retry.map(prepQ)); r.retry = [];
      banner('Repetisjon!<small>Nå tar vi de du bommet på – en gang til</small>', 1800);
      Sfx.charge();
    } else return finishRun(true);
  }
  r.cur = r.queue[r.qi];
  r.cur.isBoss = !r.retrying && r.qi === r.main - 1 && r.main >= 5;
  r.phase = 'question'; r.phaseT = 0; r.chosen = -1;
  // Rydd bort småfiender så det er lett å lese.
  G.enemies.forEach(e => { if (e.kind === 'fodder') { e.dead = true; burst(e.x, e.y, e.color, 8, 160); } });
  renderQuestion();
  const len = r.cur.q.length + r.cur.opts.join('').length;
  r.timerMax = clamp(18 + len * 0.07, 25, 70) * (r.cur.isBoss ? 1.15 : 1);
  r.timer = r.timerMax;
  if (r.cur.isBoss) { banner(`BOSS!<small>${BOSSES[G.world]}</small>`, 1600); Sfx.boss(); shake(10); }
  spawnAnswerEnemies();
}

function laneYs() {
  const top = playTop() + 30, bot = playBottom() - 20;
  const gap = (bot - top) / 4;
  return [0, 1, 2, 3].map(i => top + gap * (i + 0.5));
}
function spawnAnswerEnemies() {
  const r = G.run; if (!r || r.phase !== 'question') return;
  const ys = laneYs();
  const br = clamp(W * 0.09, 36, 70);
  const sc = clamp((ys[1] - ys[0]) / 72, 0.55, 1);
  const tx = r.cur.isBoss ? Math.min(W * 0.78, W - 2 * br - 90) : W * 0.78;
  for (let i = 0; i < 4; i++) {
    G.enemies.push({ kind: 'answer', idx: i, x: W + 60 + i * 30, y: ys[i], baseY: ys[i], tx, sc, r: 26, color: OPT_COLORS[i], hp: 99, t: Math.random() * 6 });
  }
  if (r.cur.isBoss) G.enemies.push({ kind: 'boss', x: W + 200, y: (ys[0] + ys[3]) / 2, tx: W - br - 50, r: br, color: '#ff4d6d', hp: 999, t: 0 });
}

function renderQuestion() {
  const r = G.run, q = r.cur;
  const p = $('qpanel');
  p.classList.toggle('boss', !!q.isBoss);
  const where = r.kind === 'chapter' ? `Kapittel ${q.chapter}` : `Kap. ${q.chapter}: ${CH[q.chapter].title}`;
  $('qMeta').textContent = `${q.isBoss ? '👹 BOSS · ' : ''}${r.retrying ? '🔁 Repetisjon · ' : ''}Spørsmål ${Math.min(r.qi + 1, r.queue.length)}/${r.queue.length} · ${where}`;
  $('qText').textContent = q.q;
  const box = $('qOptions'); box.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.style.setProperty('--oc', OPT_COLORS[i]);
    b.innerHTML = `<span class="k">${i + 1}</span><span>${esc(o)}</span>`;
    b.addEventListener('click', () => answer(i));
    box.appendChild(b);
  });
  $('qTimerWrap').style.visibility = save.settings.calm ? 'hidden' : 'visible';
  p.classList.remove('hidden');
  p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
}

function answer(i) {
  const r = G.run;
  if (!r || r.phase !== 'question' || G.mode !== 'play') return;
  r.phase = 'resolve'; r.phaseT = 0; r.chosen = i;
  Sfx.charge();
  const ys = laneYs();
  G.hero.ty = i >= 0 ? ys[i] : G.hero.y;
  [...$('qOptions').children].forEach(b => b.disabled = true);
  if (i >= 0) {
    const target = G.enemies.find(e => e.kind === 'answer' && e.idx === i);
    setTimeout(() => {
      if (!G.run || G.run !== r) return;
      if (!target) return resolveAnswer(i);
      G.bullets.push({ x: G.hero.x + 30, y: ys[i], vx: 1500, vy: 0, big: true, color: OPT_COLORS[i], target, dmg: 0, life: 2 });
      Sfx.shoot(r.weapon);
    }, 220);
  } else {
    setTimeout(() => resolveAnswer(-1), 50);
  }
}

function resolveAnswer(i) {
  const r = G.run; if (!r || r.phase !== 'resolve') return;
  r.phase = 'feedback';
  const q = r.cur, ok = i === q.correct, first = !r.retrying;
  const btns = [...$('qOptions').children];
  btns[q.correct]?.classList.add('right');
  if (i >= 0 && !ok) btns[i]?.classList.add('wrong');
  const st = save.q[q.id] || (save.q[q.id] = { right: 0, wrong: 0, lastWrong: false });
  const ans = G.enemies.filter(e => e.kind === 'answer');
  if (ok) {
    st.right++; st.lastWrong = false;
    r.streak++; r.bestStreak = Math.max(r.bestStreak, r.streak);
    if (first) r.firstRight++;
    const pts = (q.isBoss ? 250 : 100) + r.streak * 15 + (save.settings.calm ? 0 : Math.round(40 * r.timer / r.timerMax));
    r.score += pts; r.bomb = Math.min(5, r.bomb + 1);
    const e = ans.find(e => e.idx === i);
    if (e) { burst(e.x, e.y, OPT_COLORS[i], 40, 420, 6); burst(e.x, e.y, '#fff', 14, 300, 3); floatText(e.x, e.y - 30, '+' + pts, '#ffd166', 28); }
    ans.forEach((o, k) => { if (o.idx !== i) setTimeout(() => { o.dead = true; burst(o.x, o.y, o.color, 14, 220); Sfx.pop(); }, 120 + k * 90); });
    if (e) e.dead = true;
    const boss = G.enemies.find(e => e.kind === 'boss');
    if (boss) { setTimeout(() => { boss.dead = true; burst(boss.x, boss.y, '#ff4d6d', 90, 600, 8); burst(boss.x, boss.y, '#ffd166', 60, 500, 6); Sfx.boom(); shake(22); flash('#fff', 0.6); }, 300); }
    Sfx.correct(); flash('#2ee59d', 0.18); shake(6);
    G.hero.dash = 1;
    const before = r.power;
    r.power = r.streak >= 7 ? 3 : r.streak >= 4 ? 2 : r.streak >= 2 ? 1 : Math.min(r.power, 1) ;
    r.power = Math.max(r.power, before);
    if (r.power > before) { setTimeout(() => { banner(`VÅPEN OPPGRADERT!<small>${WEAPONS[r.weapon].name}${POWER_NAMES[r.power]}</small>`, 1500); Sfx.power(); }, 500); }
    if (r.streak >= 3) floatText(G.hero.x + 40, G.hero.y - 40, `KOMBO x${r.streak}!`, '#ff9f1c', 26);
    if (r.bomb === 5) floatText(W / 2, H * 0.3, '💣 Bomben er klar! Trykk X', '#ff4d6d', 24);
  } else {
    st.wrong++; st.lastWrong = true;
    r.streak = 0; r.hearts--; r.power = Math.max(0, r.power - 1);
    r.missed.push(q);
    if (first) r.retry.push(q);
    const e = ans.find(e => e.idx === i);
    if (e) { e.wrongHit = 1; burst(e.x, e.y, '#ff4d6d', 16, 200); }
    const c = ans.find(e => e.idx === q.correct); if (c) c.glow = 1;
    G.hero.hurt = 1; Sfx.wrong(); setTimeout(() => Sfx.hurt(), 150); shake(16); flash('#ff4d6d', 0.4);
    floatText(G.hero.x + 30, G.hero.y - 40, '-1 ❤', '#ff4d6d', 26);
  }
  r.answered++;
  persist(); updateHud();
  setTimeout(() => showFeedback(ok, i), ok ? 450 : 650);
}

let fbTimer = null, fbAutoAnim = null;
function showFeedback(ok, i) {
  const r = G.run; if (!r) return;
  const q = r.cur;
  const card = document.querySelector('.fb-card');
  card.classList.toggle('bad', !ok);
  $('fbHead').textContent = ok ? `✅ ${PRAISE[Math.floor(Math.random() * PRAISE.length)]}` : (i < 0 ? '⏰ Tiden gikk ut' : '❌ Ikke helt');
  $('fbAnswer').textContent = (ok ? '' : 'Riktig svar: ') + q.opts[q.correct];
  $('fbExplain').textContent = q.explanation;
  $('fbSource').textContent = '«' + q.source + '»';
  $('fbSource').classList.toggle('hidden', ok && q.source.length > 400);
  $('fbNext').textContent = ok ? 'Videre ▶' : 'Skjønner! ▶';
  $('feedback').classList.remove('hidden');
  const auto = $('fbAuto'); const bar = auto.querySelector('i');
  if (fbAutoAnim) fbAutoAnim.cancel();
  if (ok) {
    auto.classList.remove('hidden');
    const ms = 6000 + q.explanation.length * 25;
    fbAutoAnim = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, fill: 'forwards' });
    fbTimer = setTimeout(nextAfterFeedback, ms);
  } else {
    auto.classList.add('hidden');
  }
  setTimeout(() => $('fbNext').focus(), 50);
}
function nextAfterFeedback() {
  clearTimeout(fbTimer); fbTimer = null;
  if ($('feedback').classList.contains('hidden')) return;
  $('feedback').classList.add('hidden');
  const r = G.run; if (!r) return;
  Sfx.click();
  G.enemies = G.enemies.filter(e => e.kind === 'fodder');
  r.qi++;
  if (r.hearts <= 0) return finishRun(false);
  beginWave();
}

function useBomb() {
  const r = G.run;
  if (!r || G.mode !== 'play' || r.bomb < 5 || r.phase !== 'wave') return;
  r.bomb = 0;
  Sfx.boom(); shake(26); flash('#fff', 0.7);
  banner('UGYLDIG!<small>Ugyldighetsbomben rydder banen</small>', 1100);
  G.enemies.forEach(e => { if (e.kind === 'fodder') { e.dead = true; burst(e.x, e.y, e.color, 30, 400, 6); r.score += 20; r.coins += 2; } });
  for (let i = 0; i < 6; i++) burst(rand(W * 0.3, W), rand(100, H - 100), ['#ffd166', '#ff4d6d', '#fff'][i % 3], 30, 500, 6);
  r.spawnLeft = 0;
  updateHud();
}

function finishRun(cleared) {
  const r = G.run; if (!r) return;
  G.mode = 'result';
  G.enemies = []; G.bullets = [];
  $('qpanel').classList.add('hidden'); $('hud').classList.add('hidden'); $('feedback').classList.add('hidden');
  const acc = r.main ? r.firstRight / r.main : 0;
  const stars = !cleared ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
  const xpGain = Math.round(r.score / 4) + (cleared ? 50 : 10) + stars * 40;
  const oldRank = rankOf(save.xp);
  save.xp += xpGain; save.coins += r.coins;
  let unlockMsg = '';
  if (r.kind === 'chapter') {
    const c = save.ch[r.chapter] || (save.ch[r.chapter] = { stars: 0, best: 0, plays: 0 });
    const prev = c.stars;
    c.plays++; c.stars = Math.max(c.stars, stars); c.best = Math.max(c.best, Math.round(acc * 100));
    if (stars > prev) unlockMsg = `Ny rekord: ${stars} ⭐ i kapittel ${r.chapter}!`;
    const nw = worldOf(r.chapter + 1);
    if (cleared && nw > worldOf(r.chapter) && nw >= 0) unlockMsg += ` Neste del gir nytt våpen: ${WEAPONS[nw].name}!`;
  }
  const newRank = rankOf(save.xp);
  if (newRank[1] !== oldRank[1]) unlockMsg += ` 🎖 Forfremmet til ${newRank[1]}!`;
  persist();

  $('resTitle').textContent = cleared ? (stars === 3 ? 'Perfekt! Kapittelet sitter!' : 'Nivå fullført!') : 'Tomt for hjerter';
  $('resStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}" style="animation-delay:${0.2 + i * 0.25}s">⭐</span>`).join('');
  $('resStats').innerHTML = `
    <div><b>${Math.round(acc * 100)} %</b>riktig første gang</div>
    <div><b>${r.bestStreak}</b>lengste kombo</div>
    <div><b>+${xpGain}</b>XP</div>
    <div><b>+${r.coins}</b>mynter</div>`;
  $('resUnlock').textContent = unlockMsg.trim() || (cleared ? 'Bra jobba! Ta neste kapittel mens det er varmt.' : 'Ingen fare – alt du bommet på havner i Feilbanken.');
  const uniq = [...new Map(r.missed.map(q => [q.id, q])).values()];
  $('resReviewWrap').classList.toggle('hidden', !uniq.length);
  $('resReview').innerHTML = uniq.map(q => `<div class="rev"><div>${esc(q.q)}</div><div class="ra">✔ ${esc(q.options[q.answer])}</div><div>${esc(q.explanation)}</div></div>`).join('');
  const hasNext = r.kind === 'chapter' && CH[r.chapter + 1];
  $('resNext').classList.toggle('hidden', !hasNext);
  $('resNext').textContent = cleared ? 'Neste nivå ▶' : 'Hopp til neste ▶';
  show('result');
  if (cleared) { confetti(stars === 3 ? 220 : 120); Sfx.fanfare(); } else Sfx.wrong();
  G.lastRun = { kind: r.kind, chapter: r.chapter };
  G.run = null;
  G.mode = 'idle';
}

// ---------- Oppdatering ----------
function update(dt) {
  G.t += dt;
  const r = G.run;
  const targetSpeed = r ? 60 + r.streak * 25 + (G.hero.dash > 0 ? 400 : 0) : 40;
  G.speed += (targetSpeed - G.speed) * Math.min(1, dt * 2);
  G.scroll += G.speed * dt;
  G.shake = Math.max(0, G.shake - dt * 40);
  G.flash = Math.max(0, G.flash - dt * 1.2);

  // helt
  const h = G.hero;
  if (r && G.mode === 'play') {
    if (r.phase === 'wave') {
      if (keys.up) h.ty -= 420 * dt;
      if (keys.down) h.ty += 420 * dt;
    }
    h.ty = clamp(h.ty, playTop() + 20, playBottom() - 20);
    h.y += (h.ty - h.y) * Math.min(1, dt * 10);
  } else { h.y += (H * 0.45 + Math.sin(G.t * 1.5) * 20 - h.y) * dt * 2; }
  h.dash = Math.max(0, h.dash - dt * 1.4);
  h.hurt = Math.max(0, h.hurt - dt * 1.5);

  if (r && G.mode === 'play') {
    r.phaseT += dt;
    if (r.phase === 'wave') {
      // automatisk skyting
      h.cool -= dt;
      const wp = WEAPONS[r.weapon];
      if (h.cool <= 0) { fire(r); h.cool = wp.rate * (r.power >= 3 ? 0.65 : 1); }
      r.spawnT -= dt;
      if (r.spawnLeft > 0 && r.spawnT <= 0) {
        r.spawnLeft--; r.spawnT = rand(0.35, 0.8);
        const hp = 1 + Math.floor(Math.random() * (1 + r.power)) + G.world * 0.3;
        G.enemies.push({ kind: 'fodder', name: FODDER[Math.floor(Math.random() * FODDER.length)], x: W + 40, y: rand(playTop() + 30, playBottom() - 30), vx: -rand(170, 240) - G.world * 12, r: rand(16, 24), hp, max: hp, color: `hsl(${rand(0, 360)},80%,65%)`, t: Math.random() * 6 });
      }
      const alive = G.enemies.some(e => e.kind === 'fodder' && !e.dead);
      if ((r.spawnLeft <= 0 && !alive && r.phaseT > 1.2) || r.phaseT > 7) beginQuestion();
    } else if (r.phase === 'question') {
      if (!save.settings.calm) {
        r.timer -= dt;
        const f = clamp(r.timer / r.timerMax, 0, 1);
        const bar = $('qTimer'); bar.style.width = (f * 100) + '%';
        bar.style.background = f > 0.5 ? '#2ee59d' : f > 0.25 ? '#ffd166' : '#ff4d6d';
        if (r.timer <= 0) answer(-1);
      }
    }
  }

  // kuler
  G.bullets.forEach(b => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.homing) {
      const t = G.enemies.find(e => e.kind === 'fodder' && !e.dead);
      if (t) { const a = Math.atan2(t.y - b.y, t.x - b.x); b.vy += Math.sin(a) * 900 * dt; b.vy *= 0.97; }
    }
    if (b.big && b.target) {
      b.vy = (b.target.y - b.y) * 10;
      if (b.x >= b.target.x - b.target.r) {
        b.dead = true;
        burst(b.x, b.y, b.color, 20, 300);
        resolveAnswer(b.target.idx);
      }
    }
  });
  // treff mot småfiender
  G.bullets.forEach(b => {
    if (b.dead || b.big) return;
    for (const e of G.enemies) {
      if (e.dead || e.kind !== 'fodder') continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy < (e.r + 6) ** 2) {
        e.hp -= b.dmg; e.hitT = 0.1; b.dead = !b.pierce;
        burst(b.x, b.y, b.color, 4, 120, 2);
        if (b.splash) G.enemies.forEach(o => { if (o !== e && o.kind === 'fodder' && Math.hypot(o.x - e.x, o.y - e.y) < 70) { o.hp -= b.dmg * 0.6; o.hitT = 0.1; } });
        Sfx.hit();
        if (b.splash) burst(e.x, e.y, '#ff9f1c', 14, 220, 4);
        break;
      }
    }
  });
  G.enemies.forEach(e => {
    e.t += dt;
    if (e.kind === 'fodder') {
      e.x += e.vx * dt; e.y += Math.sin(e.t * 3) * 30 * dt;
      e.hitT = Math.max(0, (e.hitT || 0) - dt);
      if (e.hp <= 0 && !e.dead) {
        e.dead = true; burst(e.x, e.y, e.color, 22, 300, 5); Sfx.pop();
        if (G.run) { G.run.score += 10; G.run.coins += 1; floatText(e.x, e.y, '+10 🪙', '#ffd166', 18); if (Math.random() < 0.3) Sfx.coin(); updateHud(); }
      }
      if (e.x < -50) e.dead = true;
    } else if (e.kind === 'answer') {
      const r2 = G.run;
      if (e.x > e.tx) e.x += (e.tx - e.x) * Math.min(1, dt * 3);
      else if (r2 && r2.phase === 'question' && !save.settings.calm) {
        // kryper sakte mot helten i takt med tidsfristen
        const f = clamp(r2.timer / r2.timerMax, 0, 1);
        const goal = G.hero.x + 120 + (e.tx - G.hero.x - 120) * f;
        e.x += (goal - e.x) * Math.min(1, dt * 2);
      }
      e.y = e.baseY + Math.sin(e.t * 2.2) * 6;
      e.wrongHit = Math.max(0, (e.wrongHit || 0) - dt);
    } else if (e.kind === 'boss') {
      e.x += (e.tx - e.x) * Math.min(1, dt * 1.5);
    }
  });
  G.bullets = G.bullets.filter(b => !b.dead && b.life > 0 && b.x < W + 60 && b.y > -40 && b.y < H + 40);
  G.enemies = G.enemies.filter(e => !e.dead);
  G.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.99; p.life -= dt; if (p.rot !== undefined) p.rot += dt * 6; });
  G.parts = G.parts.filter(p => p.life > 0);
  G.texts.forEach(t => { t.y -= 50 * dt; t.life -= dt; });
  G.texts = G.texts.filter(t => t.life > 0);
}

function fire(r) {
  const wp = WEAPONS[r.weapon], h = G.hero;
  const n = [1, 2, 3, 5][r.power];
  const spread = r.weapon === 3 ? 0.06 : 0.16;
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
    const b = { x: h.x + 34, y: h.y + (n > 1 && r.weapon === 3 ? (i - (n - 1) / 2) * 8 : 0), vx: Math.cos(a) * wp.speed, vy: Math.sin(a) * wp.speed, dmg: wp.dmg, color: wp.color, shape: wp.shape, life: 2, rot: 0 };
    if (wp.shape === 'rocket') { b.splash = true; b.homing = r.power >= 2; }
    if (wp.shape === 'laser') b.pierce = r.power >= 2;
    if (wp.shape === 'hammer') b.pierce = true;
    if (wp.shape === 'para' && r.power >= 3) b.homing = true;
    G.bullets.push(b);
  }
  Sfx.shoot(r.weapon);
}

// ---------- Tegning ----------
function draw() {
  const wd = WORLDS[G.world];
  cx.save();
  if (G.shake > 0) cx.translate(rand(-G.shake, G.shake) * 0.5, rand(-G.shake, G.shake) * 0.5);
  // himmel
  const g = cx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, wd.sky[0]); g.addColorStop(1, wd.sky[1]);
  cx.fillStyle = g; cx.fillRect(-20, -20, W + 40, H + 40);
  // stjerner
  G.stars.forEach(s => {
    const x = ((s.x * W - G.scroll * s.z * 0.15) % W + W) % W;
    cx.globalAlpha = 0.3 + 0.5 * s.z * (0.6 + 0.4 * Math.sin(G.t * 2 + s.x * 40));
    cx.fillStyle = '#fff'; cx.fillRect(x, s.y * H, 2 * s.z, 2 * s.z);
  });
  cx.globalAlpha = 1;
  // fjerne åser
  layer(wd.hill, 0.2, H * 0.62, 70, 0.004, 0);
  // bygninger / søyler
  pillars(wd.near, 0.45);
  layer(wd.ground, 1, H - 50, 12, 0.02, 1);
  // bakkestriper
  cx.fillStyle = 'rgba(255,255,255,.08)';
  for (let x = -((G.scroll) % 80); x < W; x += 80) cx.fillRect(x, H - 26, 40, 4);

  // fiender
  G.enemies.forEach(e => {
    if (e.kind === 'fodder') drawFodder(e);
    else if (e.kind === 'boss') drawBoss(e);
  });
  G.enemies.forEach(e => { if (e.kind === 'answer') drawAnswer(e); });
  // kuler
  G.bullets.forEach(drawBullet);
  // helt
  drawHero();
  // partikler
  G.parts.forEach(p => {
    cx.globalAlpha = clamp(p.life / p.max, 0, 1);
    cx.fillStyle = p.color;
    if (p.rect) { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); cx.restore(); }
    else { cx.beginPath(); cx.arc(p.x, p.y, p.size, 0, 7); cx.fill(); }
  });
  cx.globalAlpha = 1;
  G.texts.forEach(t => {
    cx.globalAlpha = clamp(t.life, 0, 1);
    cx.font = `900 ${t.size}px "Segoe UI",system-ui,sans-serif`;
    cx.textAlign = 'center'; cx.lineWidth = 5; cx.strokeStyle = 'rgba(0,0,0,.7)';
    cx.strokeText(t.text, t.x, t.y); cx.fillStyle = t.color; cx.fillText(t.text, t.x, t.y);
  });
  cx.globalAlpha = 1;
  cx.restore();
  if (G.flash > 0) { cx.globalAlpha = G.flash; cx.fillStyle = G.flashColor; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }
}

function layer(color, par, base, amp, freq, seed) {
  cx.fillStyle = color; cx.beginPath(); cx.moveTo(0, H);
  const off = G.scroll * par;
  for (let x = 0; x <= W + 20; x += 20) {
    const X = x + off;
    const y = base - amp * (0.5 + 0.5 * Math.sin(X * freq + seed)) - amp * 0.4 * Math.sin(X * freq * 2.7 + seed * 3);
    cx.lineTo(x, y);
  }
  cx.lineTo(W, H); cx.closePath(); cx.fill();
}
function pillars(color, par) {
  const off = G.scroll * par, spacing = 180;
  cx.fillStyle = color;
  for (let i = -1; i < W / spacing + 2; i++) {
    const k = Math.floor(off / spacing) + i;
    const x = i * spacing - (off % spacing);
    const hgt = 90 + ((k * 73) % 5) * 28;
    const w = 46 + ((k * 31) % 3) * 14;
    const y = H - 50 - hgt;
    cx.fillRect(x, y, w, hgt);
    // tak / gavl
    cx.beginPath(); cx.moveTo(x - 6, y); cx.lineTo(x + w / 2, y - 22); cx.lineTo(x + w + 6, y); cx.fill();
    cx.fillStyle = 'rgba(255,230,150,.18)';
    for (let wy = y + 12; wy < H - 66; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 14) if (((k + wx + wy) | 0) % 3) cx.fillRect(wx, wy, 6, 10);
    cx.fillStyle = color;
  }
}

function drawHero() {
  const h = G.hero, r = G.run;
  const x = h.x + h.dash * 60 * Math.sin(h.dash * Math.PI), y = h.y + Math.sin(G.t * 6) * 3;
  cx.save(); cx.translate(x, y);
  if (h.hurt > 0 && Math.floor(G.t * 20) % 2) cx.globalAlpha = 0.4;
  // fartsstriper
  if (h.dash > 0 || (r && r.streak >= 3)) {
    cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const yy = -20 + i * 10; const l = 30 + Math.random() * 40; cx.beginPath(); cx.moveTo(-30 - l, yy); cx.lineTo(-30, yy); cx.stroke(); }
  }
  // jetpack-flamme
  const fl = 14 + Math.random() * 10 + (h.dash * 20);
  cx.fillStyle = '#ff9f1c'; cx.beginPath(); cx.moveTo(-26, 4); cx.lineTo(-26 - fl, 10); cx.lineTo(-26, 16); cx.fill();
  cx.fillStyle = '#ffd166'; cx.beginPath(); cx.moveTo(-26, 7); cx.lineTo(-26 - fl * 0.6, 10); cx.lineTo(-26, 13); cx.fill();
  // kappe
  cx.fillStyle = '#c1121f';
  cx.beginPath(); cx.moveTo(-8, -10); cx.quadraticCurveTo(-34, 0 + Math.sin(G.t * 10) * 4, -30, 24); cx.lineTo(-6, 18); cx.fill();
  // jetpack (dokumentmappe)
  rr(-28, -6, 14, 24, 4, '#6b4226');
  // kropp (dress)
  rr(-14, -10, 28, 30, 8, '#24305e');
  cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(-4, -10); cx.lineTo(0, 2); cx.lineTo(4, -10); cx.fill();
  cx.fillStyle = '#ffd166'; cx.font = '900 14px system-ui'; cx.textAlign = 'center'; cx.fillText('§', 0, 16);
  // hode
  cx.fillStyle = '#f2c79b'; cx.beginPath(); cx.arc(2, -22, 13, 0, 7); cx.fill();
  cx.fillStyle = '#3b2412'; cx.beginPath(); cx.arc(0, -27, 13, Math.PI, 0); cx.fill();
  // briller
  cx.strokeStyle = '#111'; cx.lineWidth = 2;
  cx.beginPath(); cx.arc(5, -22, 4, 0, 7); cx.stroke(); cx.beginPath(); cx.arc(13, -22, 4, 0, 7); cx.stroke();
  cx.fillStyle = '#111'; cx.fillRect(4, -23, 2, 2); cx.fillRect(12, -23, 2, 2);
  // smil
  cx.beginPath(); cx.arc(8, -15, 4, 0.1, Math.PI - 0.1); cx.stroke();
  // våpen
  const wp = r ? WEAPONS[r.weapon] : WEAPONS[0];
  rr(10, 2, 24, 8, 3, '#555');
  cx.fillStyle = wp.color; cx.fillRect(28, 3, 8, 6);
  if (r && r.power) { cx.shadowColor = wp.color; cx.shadowBlur = 12 + r.power * 6; cx.fillRect(28, 3, 8, 6); cx.shadowBlur = 0; }
  cx.restore();
}
function rr(x, y, w, h, r, color) { cx.fillStyle = color; cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, w, h, r) : cx.rect(x, y, w, h); cx.fill(); }

function drawFodder(e) {
  cx.save(); cx.translate(e.x, e.y);
  const s = 1 + Math.sin(e.t * 8) * 0.06;
  cx.scale(s, 1 / s);
  cx.fillStyle = e.hitT > 0 ? '#fff' : e.color;
  cx.beginPath();
  for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2; const rr2 = e.r * (1 + 0.12 * Math.sin(a * 3 + e.t * 4)); cx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  cx.fill();
  cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(-e.r * 0.35, -4, 6, 0, 7); cx.arc(e.r * 0.15, -4, 6, 0, 7); cx.fill();
  cx.fillStyle = '#111'; cx.beginPath(); cx.arc(-e.r * 0.42, -3, 3, 0, 7); cx.arc(e.r * 0.08, -3, 3, 0, 7); cx.fill();
  cx.strokeStyle = '#111'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(-e.r * 0.45, 8); cx.lineTo(e.r * 0.2, 6); cx.stroke();
  cx.restore();
  if (e.max > 1.5) { cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fillRect(e.x - 16, e.y - e.r - 12, 32, 4); cx.fillStyle = '#2ee59d'; cx.fillRect(e.x - 16, e.y - e.r - 12, 32 * clamp(e.hp / e.max, 0, 1), 4); }
}
function drawAnswer(e) {
  const r = G.run;
  cx.save(); cx.translate(e.x, e.y);
  const shakeX = e.wrongHit ? rand(-6, 6) : 0;
  cx.translate(shakeX, 0);
  cx.scale(e.sc || 1, e.sc || 1);
  if (e.glow) { cx.shadowColor = '#2ee59d'; cx.shadowBlur = 30 + Math.sin(G.t * 10) * 10; }
  // dokumentmonster
  const w = 48, h = 58;
  cx.fillStyle = e.wrongHit ? '#ff4d6d' : '#f7f3e8';
  cx.beginPath(); cx.moveTo(-w / 2, -h / 2); cx.lineTo(w / 2 - 12, -h / 2); cx.lineTo(w / 2, -h / 2 + 12); cx.lineTo(w / 2, h / 2); cx.lineTo(-w / 2, h / 2); cx.closePath(); cx.fill();
  cx.shadowBlur = 0;
  cx.lineWidth = 4; cx.strokeStyle = e.glow ? '#2ee59d' : e.color; cx.stroke();
  cx.fillStyle = '#d8d0bd'; cx.beginPath(); cx.moveTo(w / 2 - 12, -h / 2); cx.lineTo(w / 2 - 12, -h / 2 + 12); cx.lineTo(w / 2, -h / 2 + 12); cx.fill();
  // øyne
  cx.fillStyle = '#111';
  cx.beginPath(); cx.arc(-9, -12, 4, 0, 7); cx.arc(7, -12, 4, 0, 7); cx.fill();
  cx.strokeStyle = '#111'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(-14, -20); cx.lineTo(-4, -17); cx.moveTo(12, -20); cx.lineTo(2, -17); cx.stroke();
  // bokstav
  cx.fillStyle = e.color; cx.font = '900 24px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(String(e.idx + 1), 0, 12);
  if (e.glow) { cx.fillStyle = '#2ee59d'; cx.font = '900 26px system-ui'; cx.fillText('✓', 0, -h / 2 - 16); }
  cx.restore();
  cx.textBaseline = 'alphabetic';
  if (r && r.phase === 'question') {
    cx.fillStyle = 'rgba(255,255,255,.12)';
    cx.fillRect(G.hero.x + 40, e.y - 1, e.x - G.hero.x - 70, 2);
  }
}
function drawBoss(e) {
  cx.save(); cx.translate(e.x, e.y + Math.sin(e.t * 1.5) * 12);
  cx.scale(e.r / 70, e.r / 70);
  const R = 70;
  cx.fillStyle = '#3a0d1f'; cx.beginPath(); cx.arc(0, 0, R + 8, 0, 7); cx.fill();
  const g = cx.createRadialGradient(-20, -20, 10, 0, 0, R);
  g.addColorStop(0, '#ff7a90'); g.addColorStop(1, '#8a1030');
  cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, R, 0, 7); cx.fill();
  // krone
  cx.fillStyle = '#ffd166'; cx.beginPath(); cx.moveTo(-36, -R + 8); cx.lineTo(-30, -R - 26); cx.lineTo(-12, -R - 6); cx.lineTo(0, -R - 34); cx.lineTo(12, -R - 6); cx.lineTo(30, -R - 26); cx.lineTo(36, -R + 8); cx.fill();
  // øyne
  cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(-22, -10, 14, 0, 7); cx.arc(22, -10, 14, 0, 7); cx.fill();
  cx.fillStyle = '#111'; const look = Math.sin(e.t * 2) * 4; cx.beginPath(); cx.arc(-24 + look, -8, 6, 0, 7); cx.arc(20 + look, -8, 6, 0, 7); cx.fill();
  cx.strokeStyle = '#111'; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(-38, -30); cx.lineTo(-10, -20); cx.moveTo(38, -30); cx.lineTo(10, -20); cx.stroke();
  cx.fillStyle = '#111'; cx.beginPath(); cx.arc(0, 26, 22, 0, Math.PI); cx.fill();
  cx.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { cx.beginPath(); cx.moveTo(i * 8 - 4, 26); cx.lineTo(i * 8, 36); cx.lineTo(i * 8 + 4, 26); cx.fill(); }
  cx.restore();
  cx.font = `900 ${W <= 640 ? 12 : 16}px system-ui`; cx.textAlign = 'center'; cx.fillStyle = '#ffd166'; cx.strokeStyle = '#000'; cx.lineWidth = 4;
  const tw = cx.measureText(BOSSES[G.world]).width / 2 + 6;
  const bx = clamp(e.x, tw, W - tw);
  cx.strokeText(BOSSES[G.world], bx, e.y + e.r + 34); cx.fillText(BOSSES[G.world], bx, e.y + e.r + 34);
}
function drawBullet(b) {
  cx.save(); cx.translate(b.x, b.y);
  if (b.big) {
    cx.shadowColor = b.color; cx.shadowBlur = 25;
    cx.fillStyle = b.color; cx.beginPath(); cx.arc(0, 0, 14, 0, 7); cx.fill();
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, 0, 7, 0, 7); cx.fill();
    cx.restore(); return;
  }
  cx.rotate(Math.atan2(b.vy, b.vx));
  cx.fillStyle = b.color;
  switch (b.shape) {
    case 'pellet': cx.fillRect(-6, -2, 12, 4); cx.fillStyle = '#fff'; cx.fillRect(2, -1, 4, 2); break;
    case 'stamp': cx.fillRect(-6, -6, 12, 12); cx.fillStyle = '#fff'; cx.fillRect(-3, -3, 6, 6); break;
    case 'para': cx.font = '900 18px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('§', 0, 0); break;
    case 'laser': cx.shadowColor = b.color; cx.shadowBlur = 10; cx.fillRect(-18, -2, 36, 4); break;
    case 'rocket': cx.fillRect(-8, -4, 16, 8); cx.fillStyle = '#fff'; cx.fillRect(4, -3, 5, 6); cx.fillStyle = '#ff4d6d'; cx.fillRect(-14, -2, 6, 4); break;
    case 'hammer': cx.rotate(G.t * 18); cx.fillRect(-3, -10, 6, 20); cx.fillStyle = '#c08a3e'; cx.fillRect(-10, -14, 20, 9); break;
  }
  cx.restore();
}

// ---------- HUD ----------
function updateHud() {
  const r = G.run; if (!r) return;
  $('hearts').innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) => `<span class="${i < r.hearts ? '' : 'lost'}">❤️</span>`).join('');
  $('weaponName').textContent = '🔫 ' + WEAPONS[r.weapon].name + POWER_NAMES[r.power];
  $('score').textContent = r.score;
  const c = $('combo'); c.textContent = r.streak >= 2 ? `🔥 x${r.streak}` : ''; c.classList.toggle('hot', r.streak >= 5 && !reduced());
  const prog = r.queue.length ? (r.qi + (r.phase === 'feedback' ? 1 : 0)) / r.queue.length : 0;
  $('roadFill').style.width = (prog * 100) + '%';
  $('roadHero').style.left = (prog * 100) + '%';
  $('bombFill').style.height = (r.bomb / 5 * 100) + '%';
  $('btnBomb').classList.toggle('ready', r.bomb >= 5);
}

// ---------- Meny ----------
function rankOf(xp) { let r = RANKS[0]; RANKS.forEach(x => { if (xp >= x[0]) r = x; }); return r; }
function nextRank(xp) { return RANKS.find(x => x[0] > xp); }
function recommended() {
  for (const c of BANK.chapters) if ((save.ch[c.chapter]?.stars || 0) < 2) return c.chapter;
  return BANK.chapters[0].chapter;
}
function renderMenu() {
  G.mode = 'idle';
  const totalStars = Object.values(save.ch).reduce((a, c) => a + (c.stars || 0), 0);
  $('mStars').textContent = `${totalStars}/${BANK.chapters.length * 3}`;
  $('mXp').textContent = save.xp; $('mCoins').textContent = save.coins;
  const rk = rankOf(save.xp), nx = nextRank(save.xp);
  $('rank').textContent = `Rang: ${rk[1]}`;
  const pct = nx ? (save.xp - rk[0]) / (nx[0] - rk[0]) : 1;
  $('xpFill').style.width = (pct * 100) + '%';
  $('xpText').textContent = nx ? `${save.xp - rk[0]} / ${nx[0] - rk[0]} XP til ${nx[1]}` : 'Høyeste rang!';
  const rec = recommended();
  $('btnContinue').textContent = `▶ Fortsett: kapittel ${rec}`;
  $('btnContinue').onclick = () => openIntro(rec);
  const wrongN = allQuestions().filter(q => save.q[q.id]?.lastWrong).length;
  $('btnWrong').textContent = `🧠 Feilbanken (${wrongN})`;
  $('btnWrong').disabled = !wrongN;
  const box = $('worlds'); box.innerHTML = '';
  WORLDS.forEach((w, wi) => {
    const sec = document.createElement('section');
    sec.className = 'world';
    sec.style.background = `linear-gradient(135deg, ${w.sky[0]}cc, ${w.sky[1]}88)`;
    const chs = BANK.chapters.filter(c => c.chapter >= w.from && c.chapter <= w.to);
    const ws = chs.reduce((a, c) => a + (save.ch[c.chapter]?.stars || 0), 0);
    sec.innerHTML = `<h3>${w.del}: ${esc(w.name)} <span style="font-weight:400;color:#ffd166;font-size:.9rem">⭐ ${ws}/${chs.length * 3}</span></h3><div class="wsub">${esc(w.title)} · Våpen: ${WEAPONS[wi].name}</div><div class="tiles"></div>`;
    const tiles = sec.querySelector('.tiles');
    chs.forEach(c => {
      const s = save.ch[c.chapter] || { stars: 0, best: 0, plays: 0 };
      const b = document.createElement('button');
      b.className = 'tile' + (c.chapter === rec ? ' next' : '') + (s.stars >= 3 ? ' done' : '');
      b.innerHTML = `<span class="num">KAPITTEL ${c.chapter}</span><span class="tname">${esc(c.title)}</span><span class="tstars">${'⭐'.repeat(s.stars)}${'<span style="opacity:.25">⭐</span>'.repeat(3 - s.stars)}</span><span class="tmeta">${c.questions.length} spørsmål${s.plays ? ` · beste ${s.best} %` : ''}</span>`;
      b.onclick = () => { Sfx.click(); openIntro(c.chapter); };
      tiles.appendChild(b);
    });
    box.appendChild(sec);
  });
  show('menu');
}

let introCh = null;
function openIntro(ch) {
  introCh = ch;
  const c = CH[ch], wi = worldOf(ch), w = WORLDS[wi];
  G.world = wi;
  $('introWorld').textContent = `${w.del} · ${w.name}`;
  $('introTitle').textContent = `Kapittel ${ch}: ${c.title}`;
  $('introSummary').textContent = c.summary;
  const sp = (save.ch[ch]?.stars || 0) >= 2;
  $('introWeapon').textContent = `🔫 Våpen: ${WEAPONS[wi].name}${sp ? ' II (bonus for tidligere ⭐⭐)' : ''}`;
  show('intro');
  setTimeout(() => $('introStart').focus(), 30);
}

// ---------- Input ----------
const keys = { up: false, down: false };
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') { keys.up = true; e.preventDefault(); }
  if (k === 'arrowdown' || k === 's') { keys.down = true; e.preventDefault(); }
  if (G.mode === 'play' && G.run) {
    const r = G.run;
    if (!$('feedback').classList.contains('hidden')) {
      if (k === ' ' || k === 'enter') { e.preventDefault(); nextAfterFeedback(); }
      return;
    }
    if (r.phase === 'question') {
      const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      if (k in map) { e.preventDefault(); answer(map[k]); }
    }
    if (k === 'x') useBomb();
    if (k === 'p' || k === 'escape') pause(true);
  } else if (G.mode === 'paused') {
    if (k === 'p' || k === 'escape' || k === ' ') { e.preventDefault(); pause(false); }
  } else if (!$('intro').classList.contains('hidden')) {
    if (k === ' ' || k === 'enter') { e.preventDefault(); startRun('chapter', introCh); }
    if (k === 'escape') renderMenu();
  }
  if (k === 'm') { $('setSound').checked = !$('setSound').checked; $('setSound').dispatchEvent(new Event('change')); }
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') keys.up = false;
  if (k === 'arrowdown' || k === 's') keys.down = false;
});
function pointerMove(y) { if (G.mode === 'play' && G.run && G.run.phase === 'wave') G.hero.ty = y; }
cv.addEventListener('mousemove', e => pointerMove(e.clientY));
cv.addEventListener('touchstart', e => { pointerMove(e.touches[0].clientY); }, { passive: true });
cv.addEventListener('touchmove', e => { pointerMove(e.touches[0].clientY); e.preventDefault(); }, { passive: false });
cv.addEventListener('click', e => {
  // Klikk på et svar-monster svarer også.
  if (!G.run || G.run.phase !== 'question') return;
  const hit = G.enemies.find(en => en.kind === 'answer' && Math.abs(en.x - e.clientX) < 34 && Math.abs(en.y - e.clientY) < 40);
  if (hit) answer(hit.idx);
});
document.addEventListener('pointerdown', () => Sfx.unlock(), { once: false });
document.addEventListener('keydown', () => Sfx.unlock());

function pause(on) {
  if (on && G.mode === 'play') { G.mode = 'paused'; show('pause'); clearTimeout(fbTimer); }
  else if (!on && G.mode === 'paused') {
    G.mode = 'play'; show(null);
    if (!$('feedback').classList.contains('hidden') && document.querySelector('.fb-card:not(.bad)')) fbTimer = setTimeout(nextAfterFeedback, 2500);
  }
}

// ---------- Knapper ----------
$('fbNext').onclick = nextAfterFeedback;
$('btnBomb').onclick = useBomb;
$('btnPause').onclick = () => pause(true);
$('pauseResume').onclick = () => pause(false);
$('pauseQuit').onclick = () => { G.run = null; G.mode = 'idle'; $('hud').classList.add('hidden'); $('qpanel').classList.add('hidden'); $('feedback').classList.add('hidden'); G.enemies = []; G.bullets = []; renderMenu(); };
$('introStart').onclick = () => startRun('chapter', introCh);
$('introBack').onclick = renderMenu;
$('btnMixed').onclick = () => startRun('mixed');
$('btnWrong').onclick = () => startRun('wrong');
$('resMenu').onclick = renderMenu;
$('resRetry').onclick = () => { const l = G.lastRun; l.kind === 'chapter' ? openIntro(l.chapter) : startRun(l.kind); };
$('resNext').onclick = () => openIntro(G.lastRun.chapter + 1);
$('btnHelp').onclick = () => show('help');
$('helpClose').onclick = renderMenu;
$('btnLogout').onclick = () => { try { localStorage.removeItem(PW_KEY); } catch (e) {} location.reload(); };

function bindSetting(id, key, fn) {
  const el = $(id); el.checked = !!save.settings[key];
  el.addEventListener('change', () => { save.settings[key] = el.checked; persist(); fn && fn(el.checked); });
  fn && fn(el.checked);
}
bindSetting('setSound', 'sound', v => Sfx.setSound(v));
bindSetting('setMusic', 'music', v => Sfx.setMusic(v));
bindSetting('setCalm', 'calm');
bindSetting('setMotion', 'motion', v => document.body.classList.toggle('calm-motion', v));

// ---------- Innlogging ----------
async function unlock(pw, remember) {
  const msg = $('loginMsg');
  msg.className = 'msg ok'; msg.textContent = 'Låser opp …';
  try {
    const data = await Vault.open(pw);
    prepareBank(data);
    try { remember ? localStorage.setItem(PW_KEY, pw) : localStorage.removeItem(PW_KEY); } catch (e) {}
    Sfx.correct();
    renderMenu();
  } catch (e) {
    msg.className = 'msg';
    msg.textContent = e.badPassword ? 'Feil passord. Prøv igjen.' : 'Noe gikk galt: ' + e.message;
    if (e.badPassword) { try { localStorage.removeItem(PW_KEY); } catch (_) {} }
    show('login');
  }
}
$('loginForm').addEventListener('submit', e => { e.preventDefault(); Sfx.unlock(); unlock($('pw').value, $('remember').checked); });

// ---------- Løkke ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.mode !== 'paused') update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

let saved = null;
try { saved = localStorage.getItem(PW_KEY); } catch (e) {}
if (saved) unlock(saved, true); else { show('login'); setTimeout(() => $('pw').focus(), 50); }

// For testing
window.__G = G;
})();
