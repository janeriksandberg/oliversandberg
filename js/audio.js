// Lydeffekter laget med Web Audio (ingen lydfiler).
const Sfx = (() => {
  let ctx = null, master = null, musicGain = null, musicTimer = null;
  const state = { sound: true, music: false };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.12; musicGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'square', vol = 0.5, slide = 0, delay = 0, out = null } = {}) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out || master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, { vol = 0.5, delay = 0, filter = 1200 } = {}) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }

  const shots = [
    () => tone(880, 0.06, { vol: 0.12, slide: -300 }),
    () => tone(300, 0.07, { type: 'sawtooth', vol: 0.12, slide: -120 }),
    () => tone(1200, 0.05, { type: 'triangle', vol: 0.18, slide: -600 }),
    () => tone(1500, 0.09, { type: 'sine', vol: 0.15, slide: -1100 }),
    () => { tone(200, 0.12, { type: 'sawtooth', vol: 0.1, slide: 300 }); },
    () => { tone(140, 0.1, { type: 'square', vol: 0.12, slide: -60 }); tone(1800, 0.04, { type: 'triangle', vol: 0.08 }); },
  ];

  const api = {
    state,
    unlock() { if (state.sound || state.music) ensure(); if (state.music) startMusic(); },
    shoot(w) { if (state.sound) shots[w % shots.length](); },
    hit() { if (state.sound) tone(520, 0.05, { type: 'triangle', vol: 0.15, slide: -200 }); },
    pop() { if (state.sound) { noise(0.18, { vol: 0.3, filter: 2200 }); tone(260, 0.12, { vol: 0.15, slide: -180 }); } },
    boom() { if (state.sound) { noise(0.6, { vol: 0.7, filter: 900 }); tone(90, 0.5, { type: 'sawtooth', vol: 0.3, slide: -50 }); } },
    coin() { if (state.sound) { tone(988, 0.07, { vol: 0.15 }); tone(1319, 0.14, { vol: 0.15, delay: 0.07 }); } },
    correct() { if (state.sound) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.3, delay: i * 0.07 })); },
    wrong() { if (state.sound) { tone(330, 0.25, { type: 'sawtooth', vol: 0.25, slide: -150 }); tone(220, 0.35, { type: 'sawtooth', vol: 0.25, slide: -110, delay: 0.18 }); } },
    hurt() { if (state.sound) noise(0.3, { vol: 0.5, filter: 600 }); },
    power() { if (state.sound) [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, { type: 'square', vol: 0.16, delay: i * 0.05 })); },
    charge() { if (state.sound) tone(200, 0.35, { type: 'sawtooth', vol: 0.15, slide: 900 }); },
    click() { if (state.sound) tone(660, 0.04, { type: 'triangle', vol: 0.15 }); },
    boss() { if (state.sound) [110, 104, 98, 92].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.3, delay: i * 0.25 })); },
    fanfare() {
      if (!state.sound) return;
      const seq = [[523, 0], [523, .12], [523, .24], [659, .36], [784, .6], [659, .78], [784, .9], [1047, 1.1]];
      seq.forEach(([f, d]) => { tone(f, 0.22, { type: 'square', vol: 0.18, delay: d }); tone(f / 2, 0.22, { type: 'triangle', vol: 0.2, delay: d }); });
    },
    setSound(v) { state.sound = v; },
    setMusic(v) { state.music = v; if (!v) stopMusic(); else if (ctx) startMusic(); },
  };

  // Enkel, rolig chiptune-loop.
  const bass = [110, 110, 131, 131, 98, 98, 147, 131];
  const lead = [440, 0, 523, 0, 494, 440, 392, 0, 440, 0, 587, 523, 494, 0, 392, 0];
  let step = 0;
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = setInterval(() => {
      if (!state.music) return;
      const b = bass[Math.floor(step / 2) % bass.length];
      if (step % 2 === 0) tone(b, 0.22, { type: 'triangle', vol: 0.5, out: musicGain });
      const l = lead[step % lead.length];
      if (l) tone(l, 0.12, { type: 'square', vol: 0.18, out: musicGain });
      step++;
    }, 220);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  return api;
})();
