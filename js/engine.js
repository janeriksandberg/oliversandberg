/* Canvas-motor: spiller, fiender, droner (svaralternativer), prosjektiler, partikler, bakgrunn. */
const Engine = (() => {
  const W = 960, H = 420, GROUND = 352;
  const LETTERS = ['A', 'B', 'C', 'D'];
  const LETTER_COLORS = ['#ffd166', '#06d6a0', '#4cc9f0', '#b388ff'];
  const WEAPONS = [
    null,
    { name: 'Paragrafpistol', icon: '§', desc: 'Skyter små paragrafer. Nok til å komme i gang.', color: '#ffd166' },
    { name: 'Hjemmelshagle', icon: '⁂', desc: 'Tre skudd på én gang. Krever hjemmel i lov.', color: '#06d6a0' },
    { name: 'Klagekanon', icon: '●', desc: 'Tung kule. Går aldri ut over klagefristen.', color: '#ff9f1c' },
    { name: 'Vedtaksrakett', icon: '🚀', desc: 'Begrunnet, skriftlig og med full fart.', color: '#ef476f' },
    { name: 'Skjønnslaser', icon: '⚡', desc: 'Presis stråle. Innenfor lovens rammer.', color: '#4cc9f0' },
    { name: 'Ugyldighetsblaster', icon: '✺', desc: 'Nulliteter til alle kanter. Ingen vedtak står igjen.', color: '#b388ff' }
  ];
  const WORLD_COLORS = ['#ef476f', '#ff9f1c', '#06d6a0', '#4cc9f0', '#b388ff', '#ff5fa2'];

  let canvas, ctx, last = 0, raf = 0;
  const st = {
    t: 0, scroll: 0, runSpeed: 0, runUntil: 0, onRunDone: null,
    weapon: 1, charge: 0, world: 0,
    player: { x: 150, y: GROUND, vy: 0, jump: 0, hurt: 0, bob: 0, face: 1 },
    enemy: null, drones: [], shots: [], parts: [], texts: [], confetti: [],
    shake: 0, flash: 0, approach: 0, dead: false, shakeOn: false
  };
  const rnd = (a, b) => a + Math.random() * (b - a);

  function init(c) {
    canvas = c; ctx = c.getContext('2d');
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function setShake(v) { st.shakeOn = v; }
  function setWeapon(tier, charge) { st.weapon = tier; st.charge = charge; }
  function setWorld(w) { st.world = w; }
  function setApproach(f) { st.approach = Math.max(0, Math.min(1, f)); }

  function spawnEnemy({ boss = false, hp = 1 } = {}) {
    st.enemy = { x: W + 80, y: GROUND, tx: boss ? 700 : 740, hp, maxHp: hp, boss, flash: 0, dead: false, dying: 0, bob: Math.random() * 6, hit: 0, kb: 0, wink: 0 };
    st.drones = LETTERS.map((L, i) => ({ i, L, x: W + 160 + i * 40, y: 0, tx: 540, ty: 62 + i * 64, state: 'idle', bob: Math.random() * 6, shield: 0, dead: false, glow: 0 }));
    st.approach = 0;
  }
  function clearEnemy() { st.enemy = null; st.drones = []; }
  function resetDrones() {
    const e = st.enemy;
    st.drones = LETTERS.map((L, i) => ({ i, L, x: e ? e.x - 60 : W + 100, y: e ? e.y - 80 : 200, tx: 540, ty: 62 + i * 64, state: 'idle', bob: Math.random() * 6, shield: 0, dead: false, glow: 0 }));
    st.approach = 0;
  }
  function markCorrect(i) { const d = st.drones[i]; if (d) d.glow = 1; }
  function playerHurt() {
    st.player.hurt = 1; st.flash = 1; if (st.shakeOn) st.shake = 14;
    addText(st.player.x, st.player.y - 110, '−❤', '#ef476f', 30);
    burst(st.player.x, st.player.y - 50, 18, '#ef476f');
  }
  function run(ms, cb) { st.runSpeed = 420; st.runUntil = st.t + ms / 1000; st.onRunDone = cb; }
  function stopRun() { st.runSpeed = 0; st.runUntil = 0; }
  function celebrate(n = 120) {
    for (let i = 0; i < n; i++) st.confetti.push({ x: rnd(0, W), y: rnd(-H, 0), vx: rnd(-40, 40), vy: rnd(80, 220), r: rnd(0, 6.28), vr: rnd(-6, 6), c: LETTER_COLORS[i % 4], w: rnd(6, 12), h: rnd(4, 8) });
  }
  function addText(x, y, s, color = '#fff', size = 22) { st.texts.push({ x, y, s, color, size, t: 0 }); }
  function burst(x, y, n, color, speed = 260) {
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(speed * 0.3, speed); st.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: rnd(0.4, 0.9), color, r: rnd(2, 6) }); }
  }

  /* Avfyr mot drone i. correct bestemmer hva som skjer ved treff. onDone kalles når hele sekvensen er ferdig. */
  function fire(i, correct, onDone) {
    const d = st.drones[i]; if (!d) { onDone && onDone(); return; }
    const p = st.player, gx = p.x + 38, gy = p.y - 58;
    const tier = st.weapon, big = st.charge >= 1 ? 1.35 : 1, rainbow = st.charge >= 2;
    const color = rainbow ? 'rainbow' : WEAPONS[tier].color;
    p.recoil = 1;
    const mk = (extra) => st.shots.push(Object.assign({ x: gx, y: gy, tx: d.x, ty: d.y, drone: i, correct, tier, big, color, t: 0, done: false, trail: [], spd: tier === 3 ? 620 : tier === 4 ? 760 : 980, delay: 0, onDone }, extra));
    if (tier === 5) {
      st.shots.push({ laser: true, x: gx, y: gy, tx: d.x, ty: d.y, drone: i, correct, tier, big, color, t: 0, life: 0.28, onDone, done: false, spd: 0 });
    } else if (tier === 2) {
      mk({}); mk({ delay: 0.05, oy: -14, extra: true }); mk({ delay: 0.1, oy: 14, extra: true });
    } else mk({});
  }

  function shotArrive(s) {
    const d = st.drones[s.drone], e = st.enemy;
    if (!d) return;
    if (s.correct) {
      d.dead = true; burst(d.x, d.y, 26, LETTER_COLORS[d.i], 320); burst(d.x, d.y, 10, '#fff', 200);
      if (st.shakeOn) st.shake = Math.max(st.shake, 6);
      if (e && !e.dead) {
        e.hp--; e.flash = 1; e.kb = 1; burst(e.x, e.y - 60, 14, '#fff', 180);
        if (e.hp <= 0) { e.dead = true; e.dying = 1; burst(e.x, e.y - 60, 60, WORLD_COLORS[st.world], 420); burst(e.x, e.y - 60, 30, '#ffd166', 500); if (st.shakeOn) st.shake = 12; }
      }
    } else {
      d.shield = 1; burst(d.x, d.y, 10, '#4cc9f0', 180);
      if (e && !e.dead) e.wink = 1;
      // fienden skyter tilbake
      st.shots.push({ x: e ? e.x - 50 : W, y: e ? e.y - 70 : 200, tx: st.player.x + 10, ty: st.player.y - 55, enemyShot: true, t: 0, spd: 700, done: false, trail: [], color: '#ef476f', onDone: s.onDone, correct: false });
      s.onDone = null;
    }
    if (s.onDone) { const cb = s.onDone; s.onDone = null; setTimeout(cb, s.correct ? 420 : 0); }
  }

  function update(dt) {
    st.t += dt; const p = st.player, e = st.enemy;
    // Løping
    if (st.runSpeed) { st.scroll += st.runSpeed * dt; p.bob += dt * 14; if (st.t >= st.runUntil) { st.runSpeed = 0; const cb = st.onRunDone; st.onRunDone = null; cb && cb(); } }
    else p.bob += dt * 3;
    if (p.recoil) p.recoil = Math.max(0, p.recoil - dt * 6);
    if (p.hurt) p.hurt = Math.max(0, p.hurt - dt * 2);
    st.flash = Math.max(0, st.flash - dt * 3); st.shake = Math.max(0, st.shake - dt * 30);
    // Fiende inn / nærmer seg
    if (e) {
      e.bob += dt * 2;
      if (!e.dead) {
        const target = e.tx - st.approach * (e.tx - p.x - 160);
        e.x += (target - e.x) * Math.min(1, dt * 4);
        if (e.kb) { e.x += e.kb * 90 * dt; e.kb = Math.max(0, e.kb - dt * 3); }
        e.flash = Math.max(0, e.flash - dt * 4); e.wink = Math.max(0, e.wink - dt * 2);
      } else { e.dying = Math.max(0, e.dying - dt * 1.4); }
    }
    for (const d of st.drones) {
      d.bob += dt * 2.5; d.x += (d.tx - d.x) * Math.min(1, dt * 4); d.y += (d.ty - d.y) * Math.min(1, dt * 4);
      if (e && !e.dead) { d.tx = e.x - 210 + (d.i % 2) * 44; }
      d.shield = Math.max(0, d.shield - dt * 1.5);
    }
    // Skudd
    for (const s of st.shots) {
      if (s.done) continue;
      s.t += dt;
      if (s.laser) { if (s.t >= s.life) { s.done = true; shotArrive(s); } continue; }
      if (s.delay && s.t < s.delay) continue;
      const d = s.enemyShot ? null : st.drones[s.drone];
      if (d) { s.tx = d.x; s.ty = d.y + (s.oy || 0); }
      const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy), step = s.spd * dt;
      s.trail.push({ x: s.x, y: s.y }); if (s.trail.length > 10) s.trail.shift();
      if (dist <= step) {
        s.x = s.tx; s.y = s.ty; s.done = true;
        if (s.enemyShot) { playerHurt(); if (s.onDone) setTimeout(s.onDone, 350); }
        else if (!s.extra) shotArrive(s);
        else burst(s.x, s.y, 4, s.color === 'rainbow' ? '#fff' : s.color, 120);
      } else { s.x += dx / dist * step; s.y += dy / dist * step; }
    }
    st.shots = st.shots.filter(s => !s.done);
    for (const q of st.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; }
    st.parts = st.parts.filter(q => q.t < q.life);
    for (const t of st.texts) { t.t += dt; t.y -= 40 * dt; }
    st.texts = st.texts.filter(t => t.t < 1.3);
    for (const c of st.confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; c.vx += Math.sin(st.t * 3 + c.y) * 20 * dt; }
    st.confetti = st.confetti.filter(c => c.y < H + 20);
    if (st.enemy && st.enemy.dead && st.enemy.dying <= 0) st.enemy = null;
    if (st.enemy == null) st.drones = st.drones.filter(d => !d.dead);
  }

  /* ---------- Tegning ---------- */
  function drawBg() {
    const w = st.world, hue = [340, 28, 160, 195, 265, 320][w];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `hsl(${hue},45%,12%)`); g.addColorStop(0.7, `hsl(${hue},35%,22%)`); g.addColorStop(1, `hsl(${hue},30%,16%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // stjerner
    ctx.fillStyle = '#ffffff55';
    for (let i = 0; i < 40; i++) { const x = ((i * 193 + 37) - st.scroll * 0.05) % W, y = (i * 71) % 180; ctx.fillRect((x + W) % W, y, 2, 2); }
    // måne
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(820 - (st.scroll * 0.02 % W) * 0 , 60, 26, 0, 7); ctx.fill();
    // fjerne bygninger (parallax)
    drawBuildings(0.25, `hsl(${hue},30%,26%)`, 120, 1);
    drawBuildings(0.5, `hsl(${hue},32%,20%)`, 200, 2);
    // bakken
    ctx.fillStyle = `hsl(${hue},25%,14%)`; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = `hsl(${hue},40%,30%)`; ctx.fillRect(0, GROUND, W, 6);
    ctx.fillStyle = `hsl(${hue},30%,20%)`;
    for (let i = -1; i < 12; i++) { const x = ((i * 100 - st.scroll) % (W + 100) + W + 100) % (W + 100) - 100; ctx.fillRect(x, GROUND + 14, 60, 6); }
  }
  function drawBuildings(par, color, maxH, seed) {
    ctx.fillStyle = color;
    const period = 1800;
    for (let i = 0; i < 24; i++) {
      const bw = 50 + ((i * 37 * seed) % 60), bh = 40 + ((i * 53 * seed) % maxH);
      let x = ((i * 95 * seed * 0.8 + 0) - st.scroll * par) % period; if (x < -bw) x += period;
      if (x > W) continue;
      ctx.fillRect(x, GROUND - bh, bw, bh);
      // vinduer
      ctx.fillStyle = '#ffd16622';
      for (let r = 0; r < Math.floor(bh / 22); r++) for (let c = 0; c < Math.floor(bw / 18); c++) if ((r * 7 + c * 3 + i) % 3 === 0) ctx.fillRect(x + 6 + c * 18, GROUND - bh + 8 + r * 22, 8, 10);
      ctx.fillStyle = color;
      // søyler (tinghus) på noen
      if (i % 5 === 0) { ctx.fillRect(x - 6, GROUND - bh - 14, bw + 12, 10); for (let c = 0; c < 4; c++) ctx.fillRect(x + 6 + c * (bw - 16) / 3, GROUND - bh, 6, bh); }
    }
  }
  function drawPlayer() {
    const p = st.player, run = st.runSpeed > 0, x = p.x, y = p.y - (run ? Math.abs(Math.sin(p.bob)) * 8 : Math.sin(p.bob) * 2);
    ctx.save(); ctx.translate(x, y);
    if (p.hurt) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(st.t * 40); }
    // bein
    ctx.strokeStyle = '#2b2f5a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    const l = run ? Math.sin(p.bob) * 18 : 0;
    ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(-8 + l, -4); ctx.moveTo(8, -40); ctx.lineTo(8 - l, -4); ctx.stroke();
    // sko
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(-8 + l + 3, -3, 11, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(8 - l + 3, -3, 11, 5, 0, 0, 7); ctx.fill();
    // kappe
    ctx.fillStyle = '#ef476f'; ctx.beginPath(); ctx.moveTo(-14, -82); ctx.quadraticCurveTo(-46 - (run ? 18 : 4) - Math.sin(st.t * 6) * 6, -50, -22 - (run ? 16 : 0), -22); ctx.lineTo(-10, -40); ctx.closePath(); ctx.fill();
    // kropp
    ctx.fillStyle = '#4cc9f0'; roundRect(-18, -86, 36, 50, 10); ctx.fill();
    ctx.fillStyle = '#0b1020'; ctx.font = 'bold 20px Georgia'; ctx.textAlign = 'center'; ctx.fillText('§', 0, -52);
    // hode
    ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(0, -104, 20, 0, 7); ctx.fill();
    // hår/hatt (studenterlue)
    ctx.fillStyle = '#1b2242'; ctx.beginPath(); ctx.moveTo(-26, -118); ctx.lineTo(26, -118); ctx.lineTo(0, -132); ctx.closePath(); ctx.fill();
    ctx.fillRect(-16, -124, 32, 8);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(22, -120, 3, 14);
    // briller
    ctx.strokeStyle = '#1b2242'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-8, -104, 7, 0, 7); ctx.arc(9, -104, 7, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-1, -104); ctx.lineTo(2, -104); ctx.stroke();
    ctx.fillStyle = '#1b2242'; ctx.fillRect(-10, -105, 3, 3); ctx.fillRect(7, -105, 3, 3);
    // smil
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -96, 7, 0.2, 2.9); ctx.stroke();
    // arm + våpen
    const rec = (p.recoil || 0) * 8;
    ctx.save(); ctx.translate(14 - rec, -62);
    ctx.strokeStyle = '#ffe0bd'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 4); ctx.stroke();
    drawWeapon(24, 4, st.weapon, st.charge);
    ctx.restore();
    ctx.restore();
  }
  function drawWeapon(x, y, tier, charge) {
    const w = WEAPONS[tier]; ctx.save(); ctx.translate(x, y);
    if (charge >= 1) { ctx.shadowColor = charge >= 2 ? '#fff' : w.color; ctx.shadowBlur = 18; }
    ctx.fillStyle = '#2b2f5a';
    const len = [0, 28, 36, 40, 46, 44, 42][tier];
    roundRect(-4, -8, len, 14, 5); ctx.fill();
    ctx.fillStyle = w.color;
    if (tier === 1) { roundRect(len - 8, -5, 10, 8, 2); ctx.fill(); }
    if (tier === 2) { roundRect(-2, -12, len, 5, 2); ctx.fill(); roundRect(-2, 6, len, 5, 2); ctx.fill(); }
    if (tier === 3) { ctx.beginPath(); ctx.arc(len - 2, -1, 12, 0, 7); ctx.fill(); }
    if (tier === 4) { ctx.beginPath(); ctx.moveTo(len - 4, -14); ctx.lineTo(len + 14, -1); ctx.lineTo(len - 4, 12); ctx.closePath(); ctx.fill(); }
    if (tier === 5) { ctx.fillRect(len - 6, -3, 14, 4); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(len + 8, -1, 3, 0, 7); ctx.fill(); }
    if (tier === 6) { ctx.beginPath(); ctx.arc(len - 2, -1, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(len - 2, -1, 14, 0, 7); ctx.stroke(); }
    ctx.restore();
  }
  function drawEnemy() {
    const e = st.enemy; if (!e) return;
    const s = e.boss ? 1.6 : 1, col = WORLD_COLORS[st.world];
    ctx.save(); ctx.translate(e.x, e.y - Math.sin(e.bob) * 6);
    if (e.dead) { ctx.globalAlpha = e.dying; ctx.scale(1 + (1 - e.dying) * 1.5, Math.max(0.05, e.dying)); }
    ctx.scale(s, s);
    // skygge
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(0, 4, 44, 8, 0, 0, 7); ctx.fill();
    // kropp (blob)
    ctx.fillStyle = e.flash ? '#ffffff' : col;
    ctx.beginPath(); ctx.moveTo(-42, 0); ctx.quadraticCurveTo(-50, -70, -20, -96); ctx.quadraticCurveTo(0, -112, 20, -96); ctx.quadraticCurveTo(50, -70, 42, 0);
    for (let i = 4; i >= -4; i--) ctx.lineTo(i * 10, i % 2 ? -8 : 0); ctx.closePath(); ctx.fill();
    // paragraf-merke
    ctx.fillStyle = '#0b1020'; ctx.font = 'bold 44px Georgia'; ctx.textAlign = 'center'; ctx.fillText('§', 0, -24);
    // øyne
    const ey = -72;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-14, ey, 11, 0, 7); ctx.arc(14, ey, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#0b1020';
    if (e.wink) { ctx.fillRect(-22, ey - 2, 16, 4); ctx.fillRect(6, ey - 2, 16, 4); }
    else { ctx.beginPath(); ctx.arc(-16 - 2, ey, 5, 0, 7); ctx.arc(12 - 2, ey, 5, 0, 7); ctx.fill(); }
    // sinte bryn
    ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-26, ey - 16); ctx.lineTo(-4, ey - 10); ctx.moveTo(26, ey - 16); ctx.lineTo(4, ey - 10); ctx.stroke();
    if (e.boss) {
      // krone + briller = Sensor
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(-30, -104); ctx.lineTo(-30, -130); ctx.lineTo(-15, -114); ctx.lineTo(0, -138); ctx.lineTo(15, -114); ctx.lineTo(30, -130); ctx.lineTo(30, -104); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-14, ey, 14, 0, 7); ctx.arc(14, ey, 14, 0, 7); ctx.stroke();
      // HP-bar
      ctx.fillStyle = '#0b1020'; ctx.fillRect(-40, -150, 80, 8); ctx.fillStyle = '#ef476f'; ctx.fillRect(-40, -150, 80 * (e.hp / e.maxHp), 8);
    } else if (e.maxHp > 1) {
      ctx.fillStyle = '#0b1020'; ctx.fillRect(-30, -120, 60, 6); ctx.fillStyle = '#ef476f'; ctx.fillRect(-30, -120, 60 * (e.hp / e.maxHp), 6);
    }
    ctx.restore();
  }
  function drawDrones() {
    for (const d of st.drones) {
      if (d.dead) continue;
      const y = d.y + Math.sin(d.bob) * 5;
      ctx.save(); ctx.translate(d.x, y);
      if (d.glow) { ctx.shadowColor = '#06d6a0'; ctx.shadowBlur = 24; }
      // propell
      ctx.fillStyle = '#ffffff66'; ctx.fillRect(-22, -30, 44, 3);
      ctx.fillStyle = '#2b2f5a'; ctx.fillRect(-2, -30, 4, 8);
      // sekskant
      ctx.fillStyle = LETTER_COLORS[d.i]; hex(0, 0, 26); ctx.fill();
      ctx.strokeStyle = '#0b1020'; ctx.lineWidth = 3; hex(0, 0, 26); ctx.stroke();
      ctx.fillStyle = '#0b1020'; ctx.font = '900 24px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.L, 0, 1);
      if (d.shield) { ctx.strokeStyle = `rgba(76,201,240,${d.shield})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 34 + (1 - d.shield) * 10, 0, 7); ctx.stroke(); }
      if (d.glow) { ctx.fillStyle = '#06d6a0'; ctx.font = '900 16px Nunito, sans-serif'; ctx.fillText('✓ riktig', 0, -44); }
      ctx.restore();
    }
  }
  function drawShots() {
    for (const s of st.shots) {
      if (s.delay && s.t < s.delay) continue;
      if (s.laser) {
        const a = 1 - s.t / s.life; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = s.color === 'rainbow' ? `hsl(${st.t * 400 % 360},100%,60%)` : s.color; ctx.lineWidth = 10 * s.big; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); continue;
      }
      const col = s.color === 'rainbow' ? `hsl(${(st.t * 500 + s.x) % 360},100%,60%)` : s.color;
      ctx.save();
      if (s.enemyShot) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.fill(); ctx.restore(); continue; }
      // trail
      ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 4 * s.big; ctx.beginPath();
      s.trail.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillStyle = col;
      const ang = Math.atan2(s.ty - s.y, s.tx - s.x); ctx.translate(s.x, s.y); ctx.rotate(ang); ctx.scale(s.big, s.big);
      if (s.tier === 1) { ctx.font = 'bold 22px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('§', 0, 0); }
      else if (s.tier === 2) { ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); }
      else if (s.tier === 3) { ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#fff5'; ctx.beginPath(); ctx.arc(-4, -4, 5, 0, 7); ctx.fill(); }
      else if (s.tier === 4) { ctx.fillRect(-14, -5, 24, 10); ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(20, 0); ctx.lineTo(10, 8); ctx.fill(); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(-16, 0, 6 + Math.random() * 4, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(st.t * 30) * 3, 0, 7); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawFx() {
    for (const q of st.parts) { ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.color; ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r); }
    ctx.globalAlpha = 1;
    for (const c of st.confetti) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore(); }
    for (const t of st.texts) { ctx.globalAlpha = Math.min(1, 2 - t.t * 1.5); ctx.font = `900 ${t.size}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#0b1020'; ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.s, t.x, t.y); }
    ctx.globalAlpha = 1;
    if (st.flash) { ctx.fillStyle = `rgba(239,71,111,${st.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function hex(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    ctx.save();
    if (st.shake) ctx.translate(rnd(-st.shake, st.shake), rnd(-st.shake, st.shake));
    drawBg(); drawDrones(); drawEnemy(); drawPlayer(); drawShots(); drawFx();
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }

  /* Lite våpenikon til kort */
  function drawWeaponIcon(c, tier) {
    const cx = c.getContext('2d'); const saved = ctx; ctx = cx; cx.clearRect(0, 0, c.width, c.height);
    cx.save(); cx.translate(10, c.height / 2); cx.scale(1.4, 1.4); drawWeapon(0, 0, tier, 1); cx.restore(); ctx = saved;
  }

  return { init, setWeapon, setWorld, setApproach, setShake, spawnEnemy, clearEnemy, resetDrones, markCorrect, fire, run, stopRun, celebrate, addText, burst, playerHurt, drawWeaponIcon, WEAPONS, LETTERS, LETTER_COLORS, WORLD_COLORS, W, H };
})();
