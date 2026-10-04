/* Spill-logikk: skjermer, levels, spørsmål, poeng, lagring. */
(() => {
  const $ = s => document.querySelector(s);
  const WORLDS = [
    { name: 'Del 1: Grunnlaget', chapters: [1, 2, 3, 4] },
    { name: 'Del 2: Forvaltningsapparatet', chapters: [5, 6, 7, 8, 9, 10] },
    { name: 'Del 3: Grunnregler for saksbehandlingen', chapters: [11, 12, 13, 14] },
    { name: 'Del 4: Forvaltningsloven', chapters: [15, 16, 17, 18, 19, 20, 21, 22] },
    { name: 'Del 5: Materiell kompetanse', chapters: [23, 24, 25, 26, 27, 28] },
    { name: 'Del 6: Ugyldighet og kontroll', chapters: [29, 30, 31, 32, 33] }
  ];
  const HEARTS = 4, TIMER_MS = 30000, MAIN_Q = 10, BOSS_Q = 3;
  const KEY_P = 'oe_progress_v1', KEY_PW = 'oe_pw';

  let DATA = null;           // {chapters:[...]}
  let P = loadProgress();    // fremgang
  let G = null;              // aktiv runde
  let timerId = null, timerStart = 0, autoNextId = null;

  function loadProgress() {
    try { return Object.assign({ levels: {}, score: 0, qstats: {}, settings: {}, seenWeapons: [] }, JSON.parse(localStorage.getItem(KEY_P) || '{}')); }
    catch { return { levels: {}, score: 0, qstats: {}, settings: {}, seenWeapons: [] }; }
  }
  function save() { try { localStorage.setItem(KEY_P, JSON.stringify(P)); } catch {} }
  const setting = (k, d) => P.settings[k] === undefined ? d : P.settings[k];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const worldOf = ch => WORLDS.findIndex(w => w.chapters.includes(ch));
  const chapter = n => DATA.chapters.find(c => c.chapter === n);
  const qid = (ch, idx) => `${ch}:${idx}`;
  const isUnlocked = ch => ch === 1 || (P.levels[ch - 1] && P.levels[ch - 1].done);
  const highestUnlocked = () => { let h = 1; for (const c of DATA.chapters) if (isUnlocked(c.chapter)) h = Math.max(h, c.chapter); return h; };

  /* ---------- Skjermer ---------- */
  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); $(id).classList.add('active'); window.scrollTo(0, 0); }
  function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), ms); }

  /* ---------- Lås ---------- */
  async function tryUnlock(pw, remember, silent) {
    const msg = $('#lock-msg'); msg.className = 'msg'; msg.textContent = silent ? '' : 'Låser opp…';
    $('#unlock-btn').disabled = true;
    try {
      DATA = await Vault.unlock(pw, window.ENC_DATA);
      DATA.chapters.sort((a, b) => a.chapter - b.chapter);
      if (remember) localStorage.setItem(KEY_PW, pw); else localStorage.removeItem(KEY_PW);
      msg.className = 'msg ok'; msg.textContent = 'Åpnet! Lykke til.';
      Sfx.play('powerup');
      setTimeout(() => { renderMap(); show('#screen-map'); }, silent ? 0 : 500);
    } catch (e) {
      msg.textContent = e.message === 'Feil passord' ? 'Feil passord. Prøv igjen.' : 'Kunne ikke låse opp: ' + e.message;
      if (!silent) { $('#pw').classList.add('wrong'); setTimeout(() => $('#pw').classList.remove('wrong'), 500); Sfx.play('wrong'); }
      localStorage.removeItem(KEY_PW);
    }
    $('#unlock-btn').disabled = false;
  }
  $('#lock-form').addEventListener('submit', e => { e.preventDefault(); Sfx.resume(); tryUnlock($('#pw').value, $('#remember').checked, false); });
  $('#pw-toggle').addEventListener('click', () => { const i = $('#pw'); i.type = i.type === 'password' ? 'text' : 'password'; });
  $('#btn-lock').addEventListener('click', () => { localStorage.removeItem(KEY_PW); DATA = null; $('#pw').value = ''; $('#lock-msg').textContent = ''; Sfx.stopMusic(); show('#screen-lock'); });

  /* ---------- Kart ---------- */
  function stars(n, big) { return [1, 2, 3].map(i => `<span class="${i <= n ? '' : 'off'}">★</span>`).join(''); }
  function renderMap() {
    $('#total-score').textContent = P.score.toLocaleString('nb-NO');
    const totalStars = Object.values(P.levels).reduce((s, l) => s + (l.stars || 0), 0);
    $('#total-stars').textContent = totalStars; $('#max-stars').textContent = DATA.chapters.length * 3;
    const next = highestUnlocked();
    const wrap = $('#worlds'); wrap.innerHTML = '';
    WORLDS.forEach((w, wi) => {
      const el = document.createElement('div'); el.className = 'world';
      const wp = Engine.WEAPONS[wi + 1];
      el.innerHTML = `<div class="world-head"><h2 style="color:${Engine.WORLD_COLORS[wi]}">${w.name}</h2><span class="weapon">Våpen: ${wp.icon} ${wp.name}</span></div><div class="levels"></div>`;
      const lv = el.querySelector('.levels');
      w.chapters.forEach(ch => {
        const c = chapter(ch); if (!c) return;
        const st = P.levels[ch] || {}; const unlocked = isUnlocked(ch);
        const b = document.createElement('button'); b.className = 'level' + (unlocked ? '' : ' locked') + (st.done ? ' done' : '') + (ch === next && !st.done ? ' next' : '');
        b.innerHTML = `<div><div class="num">Level ${ch} · ${c.questions.length} spørsmål</div><div class="ttl">${c.title}</div></div><div class="stars">${st.done ? stars(st.stars) : (unlocked ? '<span class="off">★★★</span>' : '')}</div>${unlocked ? '' : '<span class="lock">🔒</span>'}`;
        b.disabled = !unlocked;
        b.addEventListener('click', () => { Sfx.play('click'); startLevel(ch); });
        lv.appendChild(b);
      });
      wrap.appendChild(el);
    });
    const missed = trainingPool();
    $('#btn-training').disabled = missed.length === 0;
    $('#btn-training').querySelector('small').textContent = missed.length ? `${missed.length} spørsmål du har bommet på` : 'Ingen bom ennå. Spill noen levels først!';
    $('#btn-exam').disabled = !(P.levels[1] && P.levels[1].done);
    $('#btn-exam').querySelector('small').textContent = $('#btn-exam').disabled ? 'Fullfør level 1 først' : `30 spørsmål fra level 1–${next}`;
    $('#btn-sound').textContent = Sfx.enabled ? '🔊' : '🔇';
  }
  function trainingPool() {
    const out = [];
    for (const c of DATA.chapters) { if (!isUnlocked(c.chapter)) continue; c.questions.forEach((q, i) => { const s = P.qstats[qid(c.chapter, i)]; if (s && s.wrong > (s.right || 0) - 1) out.push({ q, ch: c.chapter, idx: i }); }); }
    return out;
  }
  $('#btn-training').addEventListener('click', () => { Sfx.play('click'); startSpecial('training'); });
  $('#btn-exam').addEventListener('click', () => { Sfx.play('click'); startSpecial('exam'); });
  $('#btn-sound').addEventListener('click', () => { Sfx.setEnabled(!Sfx.enabled); P.settings.sound = Sfx.enabled; $('#set-sound').checked = Sfx.enabled; save(); renderMap(); });

  /* ---------- Innstillinger ---------- */
  function applySettings() {
    Sfx.setEnabled(setting('sound', true)); Sfx.setMusic(setting('music', true)); Engine.setShake(setting('shake', false));
    $('#set-sound').checked = setting('sound', true); $('#set-music').checked = setting('music', true);
    $('#set-timer').checked = setting('timer', true); $('#set-shake').checked = setting('shake', false); $('#set-auto').checked = setting('auto', true);
  }
  $('#btn-settings').addEventListener('click', () => $('#settings').classList.remove('hidden'));
  $('#btn-settings-close').addEventListener('click', () => { $('#settings').classList.add('hidden'); renderMap(); });
  ['sound', 'music', 'timer', 'shake', 'auto'].forEach(k => $('#set-' + k).addEventListener('change', e => { P.settings[k] = e.target.checked; save(); applySettings(); }));
  $('#btn-reset').addEventListener('click', () => { if (confirm('Slette all fremgang, stjerner og poeng?')) { P = loadProgressFresh(); save(); applySettings(); renderMap(); $('#settings').classList.add('hidden'); toast('Fremgang slettet'); } });
  function loadProgressFresh() { return { levels: {}, score: 0, qstats: {}, settings: P.settings, seenWeapons: [] }; }

  /* ---------- Level ---------- */
  function startLevel(ch) {
    const c = chapter(ch); const all = c.questions.map((q, idx) => ({ q, ch, idx }));
    const mainN = Math.max(1, Math.min(MAIN_Q, all.length - BOSS_Q));
    const sh = shuffle(all);
    G = { mode: 'level', ch, title: `Level ${ch}`, sub: c.title, world: worldOf(ch), queue: sh.slice(0, mainN), reserve: sh.slice(mainN), boss: null, bossLeft: BOSS_Q,
      hearts: HEARTS, score: 0, streak: 0, best: 0, asked: 0, firstTry: 0, wrongs: 0, total: mainN + BOSS_Q, done: 0, cur: null, startedAt: Date.now(), reasked: new Set() };
    if (all.length <= BOSS_Q) { G.total = all.length; G.bossLeft = 0; }
    beginRound(true);
  }
  function startSpecial(mode) {
    const top = highestUnlocked(); let pool;
    if (mode === 'training') pool = shuffle(trainingPool()).slice(0, 15);
    else { pool = []; for (const c of DATA.chapters) if (isUnlocked(c.chapter)) c.questions.forEach((q, idx) => pool.push({ q, ch: c.chapter, idx })); pool = shuffle(pool).slice(0, 30); }
    if (!pool.length) { toast('Ingen spørsmål tilgjengelig'); return; }
    G = { mode, ch: 0, title: mode === 'training' ? 'Treningsleir' : 'Eksamensmodus', sub: mode === 'training' ? 'Spørsmålene du har bommet på' : `Level 1–${top} blandet`, world: worldOf(top), queue: pool, reserve: [], bossLeft: 0,
      hearts: mode === 'exam' ? 6 : 99, score: 0, streak: 0, best: 0, asked: 0, firstTry: 0, wrongs: 0, total: pool.length, done: 0, cur: null, startedAt: Date.now(), reasked: new Set() };
    beginRound(true);
  }
  function beginRound(intro) {
    show('#screen-game'); Engine.init($('#game')); Engine.setWorld(G.world); Engine.clearEnemy(); Engine.stopRun();
    $('#hud-level').textContent = G.title; $('#hud-title').textContent = G.sub;
    updateHud(); setWeapon();
    Sfx.startMusic();
    const w = Engine.WEAPONS[G.world + 1]; const newWeapon = G.mode === 'level' && !P.seenWeapons.includes(G.world);
    if (newWeapon) { P.seenWeapons.push(G.world); save(); }
    $('#qtext').textContent = 'Gjør deg klar…'; $('#answers').innerHTML = '';
    overlay(`<div class="ov-card"><h2>${G.title}</h2><div class="sub">${G.sub}</div>
      ${newWeapon ? `<div class="weapon-card"><canvas width="90" height="72" id="wicon"></canvas><div><div class="wname">Nytt våpen: ${w.name}</div><div class="wdesc">${w.desc}</div></div></div>` : `<div class="muted">Våpen: ${w.icon} ${w.name}</div>`}
      <p class="muted" style="margin:14px 0 0">${G.mode === 'level' ? `${G.total - G.bossLeft} fiender, så venter <b>Sensor</b> 👑. Svar riktig for å skyte dem ned.` : G.mode === 'exam' ? '30 spørsmål. 6 liv. Ingen omkamper.' : 'Alle spørsmålene du har bommet på. Ubegrenset liv.'}</p>
      <div class="row"><button class="btn primary big" id="ov-start">Start! ⚡</button></div></div>`);
    if (newWeapon) { Engine.drawWeaponIcon($('#wicon'), G.world + 1); Sfx.play('powerup'); }
    $('#ov-start').focus();
    $('#ov-start').addEventListener('click', () => { hideOverlay(); Sfx.play('click'); Engine.run(700, nextQuestion); });
  }
  function overlay(html) { const o = $('#overlay'); o.innerHTML = html; o.classList.remove('hidden'); }
  function hideOverlay() { $('#overlay').classList.add('hidden'); }

  function setWeapon() {
    const charge = G.streak >= 6 ? 2 : G.streak >= 3 ? 1 : 0;
    Engine.setWeapon(G.world + 1, charge);
    const w = Engine.WEAPONS[G.world + 1]; const b = $('#weapon-badge');
    b.textContent = `${w.icon} ${w.name}` + (charge === 2 ? ' · RETTSKRAFT ×3' : charge === 1 ? ' · Overladet ×2' : '');
    b.classList.toggle('charged', charge > 0);
  }
  function updateHud() {
    $('#hud-hearts').innerHTML = G.hearts > 10 ? '∞' : Array.from({ length: Math.max(G.hearts, HEARTS, G.mode === 'exam' ? 6 : 0) }, (_, i) => `<span class="${i < G.hearts ? '' : 'lost'}">❤️</span>`).join('');
    $('#hud-score').textContent = G.score.toLocaleString('nb-NO');
    $('#hud-streak').textContent = G.streak >= 2 ? `🔥 ${G.streak} på rad` : '';
    $('#hud-progress').style.width = Math.round(100 * G.done / G.total) + '%';
    $('.boss-flag').style.display = G.mode === 'level' ? '' : 'none';
  }

  function nextQuestion() {
    clearTimers();
    if (G.queue.length === 0) {
      if (G.bossLeft > 0) { startBoss(); return; }
      finishRound(); return;
    }
    const item = G.queue.shift(); G.cur = item;
    const boss = G.inBoss;
    if (!boss) Engine.spawnEnemy({ hp: 1 }); else Engine.resetDrones();
    renderQuestion(item);
    if (setting('timer', true)) startTimer();
  }
  function startBoss() {
    G.inBoss = true; Sfx.play('boss');
    overlay(`<div class="ov-card"><div class="boss-warn">⚠ SENSOR KOMMER ⚠</div><h2>Sjefskamp</h2><div class="sub">${G.bossLeft} spørsmål. Hvert riktige svar tar ett liv fra Sensor.</div><div class="row"><button class="btn primary big" id="ov-boss">Jeg er klar</button></div></div>`);
    // bosspørsmål: først de du bommet på i denne runden, så resten
    const pool = shuffle(G.reserve); G.queue = pool.slice(0, G.bossLeft);
    if (G.queue.length < G.bossLeft) { const c = chapter(G.ch).questions.map((q, idx) => ({ q, ch: G.ch, idx })); G.queue = G.queue.concat(shuffle(c)).slice(0, G.bossLeft); }
    $('#ov-boss').focus();
    $('#ov-boss').addEventListener('click', () => { hideOverlay(); Engine.spawnEnemy({ boss: true, hp: G.bossLeft }); Engine.run(600, nextQuestion); });
  }
  function renderQuestion(item) {
    const q = item.q; $('#qtext').textContent = q.q;
    const order = shuffle([0, 1, 2, 3]); G.curOrder = order;
    const box = $('#answers'); box.innerHTML = '';
    order.forEach((oi, pos) => {
      const b = document.createElement('button'); b.className = 'answer'; b.dataset.pos = pos;
      b.innerHTML = `<span class="key" style="background:${Engine.LETTER_COLORS[pos]}">${Engine.LETTERS[pos]}</span><span>${q.options[oi]}</span>`;
      b.addEventListener('click', () => answer(pos));
      box.appendChild(b);
    });
    G.answered = false; G.qStart = Date.now();
  }
  function startTimer() {
    timerStart = Date.now(); $('#timer').style.display = '';
    timerId = setInterval(() => {
      const f = Math.min(1, (Date.now() - timerStart) / TIMER_MS);
      $('#timer-bar').style.width = (100 - f * 100) + '%'; $('#timer-bar').style.background = f > 0.75 ? '#ef476f' : f > 0.5 ? '#ffd166' : '#06d6a0';
      Engine.setApproach(f);
      if (f >= 1) { clearTimers(); timeout(); }
    }, 100);
  }
  function clearTimers() { clearInterval(timerId); timerId = null; clearTimeout(autoNextId); $('#timer').style.display = setting('timer', true) ? '' : 'none'; $('#timer-bar').style.width = '100%'; Engine.setApproach(0); }
  function timeout() {
    if (G.answered) return; G.answered = true; lockAnswers();
    Sfx.play('hurt'); Engine.playerHurt();
    const correctPos = G.curOrder.indexOf(G.cur.q.answer);
    Engine.markCorrect(correctPos); document.querySelectorAll('.answer')[correctPos].classList.add('correct');
    setTimeout(() => wrongResult('⏰ Tiden gikk ut!'), 500);
  }
  function lockAnswers() { document.querySelectorAll('.answer').forEach(b => b.disabled = true); }

  function answer(pos) {
    if (!G || G.answered) return; G.answered = true; clearInterval(timerId); timerId = null;
    const q = G.cur.q, correct = G.curOrder[pos] === q.answer, correctPos = G.curOrder.indexOf(q.answer);
    lockAnswers(); const btns = document.querySelectorAll('.answer');
    Sfx.play('shoot', G.world + 1);
    const elapsed = Date.now() - G.qStart;
    Engine.fire(pos, correct, () => {
      if (correct) {
        btns[pos].classList.add('correct'); btns.forEach((b, i) => i !== pos && b.classList.add('dim'));
        G.streak++; G.best = Math.max(G.best, G.streak); G.done++; G.asked++;
        const first = !G.reasked.has(qidOf(G.cur)); if (first) G.firstTry++;
        const mult = G.streak >= 6 ? 3 : G.streak >= 3 ? 2 : 1;
        const speed = setting('timer', true) ? Math.max(0, Math.round(50 * (1 - elapsed / TIMER_MS))) : 0;
        const pts = (100 + speed) * mult; G.score += pts;
        stat(G.cur, true);
        Sfx.play('hit'); setTimeout(() => Sfx.play('correct', G.streak), 120);
        Engine.addText(560, 60, `+${pts}`, '#ffd166', 34);
        if (G.streak === 3) { toast('🔥 Overladet! Dobbel poengsum'); Sfx.play('powerup'); }
        if (G.streak === 6) { toast('⚖️ RETTSKRAFT! Trippel poengsum'); Sfx.play('powerup'); Engine.celebrate(60); }
        if (G.inBoss) G.bossLeft--;
        setWeapon(); updateHud();
        showFeedback(true, q, pos);
      } else {
        btns[pos].classList.add('wrong'); btns[correctPos].classList.add('correct');
        Engine.markCorrect(correctPos); Sfx.play('wrong');
        setTimeout(() => wrongResult('Feil!'), 300);
      }
    });
  }
  const qidOf = it => qid(it.ch, it.idx);
  function stat(it, right) { const k = qidOf(it); const s = P.qstats[k] || { right: 0, wrong: 0 }; right ? s.right++ : s.wrong++; P.qstats[k] = s; save(); }
  function wrongResult(head) {
    G.streak = 0; G.hearts--; G.wrongs++; G.asked++; stat(G.cur, false); setWeapon(); updateHud();
    Sfx.play('hurt'); $('#screen-game').classList.add('flash-bad'); setTimeout(() => $('#screen-game').classList.remove('flash-bad'), 400);
    if (G.mode !== 'exam') { // spør igjen senere i runden
      G.reasked.add(qidOf(G.cur));
      const back = Math.min(G.queue.length, 2 + Math.floor(Math.random() * 3));
      G.queue.splice(back, 0, G.cur);
    } else { G.done++; }
    showFeedback(false, G.cur.q, null, head);
  }
  function showFeedback(ok, q, pos, head) {
    const fb = $('#feedback');
    $('#fb-head').textContent = ok ? ['Riktig!', 'Pang! 💥', 'Treff!', 'Knallbra!', 'Juridisk presisjon! ⚖️'][Math.min(4, Math.floor(Math.random() * 5))] : head;
    $('#fb-head').className = 'fb-head ' + (ok ? 'ok' : 'bad');
    $('#fb-body').innerHTML = (ok ? '' : `<span class="ans">✓ Riktig svar: ${q.options[q.answer]}</span>`) + `<p style="margin:10px 0 0">${q.explain || ''}</p>`;
    $('#fb-source').textContent = q.source || ''; $('#fb-source').style.display = q.source ? '' : 'none';
    $('#fb-next').textContent = G.hearts <= 0 ? 'Se resultat' : 'Fortsett ➜';
    fb.classList.remove('hidden'); $('#fb-next').focus();
    if (ok && setting('auto', true)) autoNextId = setTimeout(continueAfterFeedback, 2200);
    G.fbOk = ok;
  }
  function continueAfterFeedback() {
    clearTimeout(autoNextId); const fb = $('#feedback'); if (fb.classList.contains('hidden')) return; fb.classList.add('hidden');
    if (G.hearts <= 0) { gameOver(); return; }
    if (G.fbOk) Engine.run(900, nextQuestion); else nextQuestion();
  }
  $('#fb-next').addEventListener('click', continueAfterFeedback);

  function gameOver() {
    clearTimers(); Sfx.play('gameover'); Sfx.stopMusic();
    overlay(`<div class="ov-card"><h2>Au! Ingen liv igjen</h2><div class="sub">${G.title} · ${G.sub}</div>
      <div class="result-grid"><div><b>${G.score}</b><span>poeng</span></div><div><b>${G.done}/${G.total}</b><span>fiender slått</span></div><div><b>${G.best}</b><span>beste rekke</span></div></div>
      <p class="muted">Ingen fare. Du har sett de riktige svarene nå. Prøv igjen!</p>
      <div class="row"><button class="btn primary big" id="ov-retry">Prøv igjen 🔁</button><button class="btn" id="ov-map">Til kartet</button></div></div>`);
    P.score += Math.floor(G.score / 4); save();
    $('#ov-retry').addEventListener('click', () => G.mode === 'level' ? startLevel(G.ch) : startSpecial(G.mode));
    $('#ov-map').addEventListener('click', toMap);
  }
  function finishRound() {
    clearTimers(); Engine.clearEnemy(); Engine.celebrate(160); Sfx.play('fanfare'); setTimeout(() => Sfx.play('levelup'), 1200);
    const acc = G.asked ? G.firstTry / (G.firstTry + G.wrongs) : 1;
    const s = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    const timeBonus = Math.max(0, 300 - Math.floor((Date.now() - G.startedAt) / 1000)) ; G.score += timeBonus;
    P.score += G.score;
    let unlockedMsg = '';
    if (G.mode === 'level') {
      const prev = P.levels[G.ch] || {}; P.levels[G.ch] = { done: true, stars: Math.max(prev.stars || 0, s), best: Math.max(prev.best || 0, G.score) };
      const nxt = chapter(G.ch + 1); if (nxt) unlockedMsg = `🔓 Level ${nxt.chapter} åpnet: ${nxt.title}`;
      if (nxt && worldOf(nxt.chapter) !== G.world) unlockedMsg += ` · Nytt våpen venter!`;
    }
    save();
    overlay(`<div class="ov-card"><h2>${G.mode === 'level' ? 'Level fullført! 🏆' : 'Runde fullført! 🏆'}</h2><div class="sub">${G.sub}</div>
      <div class="big-stars">${stars(s)}</div>
      <div class="result-grid"><div><b>${G.score.toLocaleString('nb-NO')}</b><span>poeng (+${timeBonus} tidsbonus)</span></div><div><b>${Math.round(acc * 100)} %</b><span>riktig på første forsøk</span></div><div><b>${G.best}</b><span>beste rekke</span></div></div>
      ${unlockedMsg ? `<p style="color:var(--accent2);font-weight:900">${unlockedMsg}</p>` : ''}
      ${s < 3 ? '<p class="muted">Tips: 90 % riktig på første forsøk gir tre stjerner.</p>' : '<p class="muted">Perfekt! Du kan dette kapittelet.</p>'}
      <div class="row">${G.mode === 'level' && chapter(G.ch + 1) ? `<button class="btn primary big" id="ov-next">Neste level ➜</button>` : ''}<button class="btn" id="ov-again">Spill igjen</button><button class="btn" id="ov-map">Til kartet</button></div></div>`);
    const n = $('#ov-next'); if (n) { n.focus(); n.addEventListener('click', () => startLevel(G.ch + 1)); }
    $('#ov-again').addEventListener('click', () => G.mode === 'level' ? startLevel(G.ch) : startSpecial(G.mode));
    $('#ov-map').addEventListener('click', toMap);
  }
  function toMap() { clearTimers(); hideOverlay(); $('#feedback').classList.add('hidden'); G = null; Engine.clearEnemy(); Engine.stopRun(); renderMap(); show('#screen-map'); }
  $('#btn-quit').addEventListener('click', () => { if (!G || confirm('Avbryte runden? Fremgangen i denne runden går tapt.')) toMap(); });

  /* ---------- Tastatur ---------- */
  document.addEventListener('keydown', e => {
    if (!$('#screen-game').classList.contains('active')) return;
    if (!$('#feedback').classList.contains('hidden')) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); continueAfterFeedback(); } return; }
    if (!$('#overlay').classList.contains('hidden')) return;
    const map = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
    const k = e.key.toLowerCase(); if (k in map) { const b = document.querySelectorAll('.answer')[map[k]]; if (b && !b.disabled) b.click(); }
  });

  /* ---------- Oppstart ---------- */
  applySettings();
  const savedPw = localStorage.getItem(KEY_PW);
  if (savedPw) { $('#pw').value = savedPw; tryUnlock(savedPw, true, true); }
  else $('#pw').focus();
  window.__OE = { get P() { return P; }, get G() { return G; }, startLevel, toMap };
})();
