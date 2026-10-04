/* Syntetiserte lydeffekter og en liten chiptune-loop via Web Audio. Ingen filer å laste. */
const Sfx = (() => {
  let ctx = null, master = null, musicGain = null, enabled = true, musicOn = true, musicTimer = null, step = 0;
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    } catch (e) { ctx = null; }
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function tone({ f = 440, f2 = null, t = 0.15, type = 'square', g = 0.3, delay = 0, slide = false, dest = null }) {
    if (!ctx || !enabled) return;
    const o = ctx.createOscillator(), a = ctx.createGain();
    const t0 = ctx.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2 != null) o.frequency[slide ? 'linearRampToValueAtTime' : 'exponentialRampToValueAtTime'](Math.max(1, f2), t0 + t);
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.exponentialRampToValueAtTime(g, t0 + 0.01);
    a.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    o.connect(a); a.connect(dest || master);
    o.start(t0); o.stop(t0 + t + 0.02);
  }
  function noise({ t = 0.3, g = 0.3, delay = 0, hp = 800 }) {
    if (!ctx || !enabled) return;
    const n = Math.floor(ctx.sampleRate * t), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const a = ctx.createGain(); const t0 = ctx.currentTime + delay;
    a.gain.setValueAtTime(g, t0); a.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    s.connect(f); f.connect(a); a.connect(master); s.start(t0);
  }
  const S = {
    shoot(tier = 1) {
      const base = [0, 900, 500, 700, 300, 1400, 200][tier] || 800;
      if (tier === 5) { tone({ f: 1800, f2: 2400, t: 0.25, type: 'sawtooth', g: 0.15 }); return; }
      if (tier === 4) { noise({ t: 0.4, g: 0.25, hp: 300 }); tone({ f: 200, f2: 60, t: 0.4, type: 'sawtooth', g: 0.2 }); return; }
      if (tier === 2) { for (let i = 0; i < 3; i++) tone({ f: base + i * 120, f2: 120, t: 0.12, g: 0.18, delay: i * 0.02 }); return; }
      tone({ f: base, f2: base / 6, t: 0.14, type: tier === 6 ? 'sawtooth' : 'square', g: 0.22 });
    },
    hit() { noise({ t: 0.25, g: 0.35, hp: 400 }); tone({ f: 160, f2: 40, t: 0.25, type: 'sawtooth', g: 0.3 }); },
    correct(streak = 0) {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => tone({ f, t: 0.14, type: 'square', g: 0.18, delay: i * 0.06 }));
      if (streak >= 3) tone({ f: 1568, t: 0.3, type: 'triangle', g: 0.2, delay: 0.26 });
    },
    wrong() { tone({ f: 220, f2: 110, t: 0.35, type: 'sawtooth', g: 0.25 }); tone({ f: 160, f2: 70, t: 0.4, type: 'square', g: 0.2, delay: 0.1 }); },
    hurt() { noise({ t: 0.2, g: 0.3, hp: 200 }); tone({ f: 300, f2: 80, t: 0.3, type: 'square', g: 0.25 }); },
    step() { tone({ f: 90, f2: 60, t: 0.05, type: 'triangle', g: 0.08 }); },
    coin() { tone({ f: 988, t: 0.08, g: 0.15 }); tone({ f: 1319, t: 0.25, g: 0.15, delay: 0.08 }); },
    levelup() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ f, t: 0.18, type: i > 3 ? 'triangle' : 'square', g: 0.2, delay: i * 0.09 })); },
    fanfare() {
      const m = [[523, 0], [523, .12], [523, .24], [659, .36], [784, .6], [659, .78], [784, 1.0]];
      m.forEach(([f, d]) => { tone({ f, t: 0.22, type: 'square', g: 0.2, delay: d }); tone({ f: f / 2, t: 0.22, type: 'triangle', g: 0.15, delay: d }); });
    },
    boss() { tone({ f: 80, f2: 40, t: 0.8, type: 'sawtooth', g: 0.3 }); noise({ t: 0.6, g: 0.2, hp: 100 }); tone({ f: 110, t: 0.5, type: 'square', g: 0.2, delay: 0.4 }); },
    powerup() { [440, 554, 659, 880, 1109].forEach((f, i) => tone({ f, t: 0.12, type: 'triangle', g: 0.2, delay: i * 0.05 })); },
    click() { tone({ f: 600, f2: 900, t: 0.05, type: 'square', g: 0.08 }); },
    gameover() { [392, 370, 349, 330].forEach((f, i) => tone({ f, t: 0.35, type: 'sawtooth', g: 0.2, delay: i * 0.3 })); }
  };
  // Enkel musikkloop (bass + melodi) i 8 takter
  const bass = [131, 131, 165, 165, 196, 196, 147, 147];
  const mel = [[523, 659, 784, 659], [523, 659, 784, 1047], [659, 784, 988, 784], [587, 698, 880, 698]];
  function musicTick() {
    if (!ctx || !enabled || !musicOn) return;
    const bar = Math.floor(step / 4) % 8, beat = step % 4;
    tone({ f: bass[bar], t: 0.22, type: 'triangle', g: 0.5, dest: musicGain });
    if (beat % 2 === 0 || Math.random() < 0.4) tone({ f: mel[bar % 4][beat], t: 0.12, type: 'square', g: 0.22, dest: musicGain });
    if (beat === 0) noise({ t: 0.05, g: 0.08, hp: 3000 });
    step++;
  }
  function startMusic() { stopMusic(); if (!ctx || !musicOn) return; musicTimer = setInterval(musicTick, 230); }
  function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
  return {
    resume, play(name, ...a) { resume(); if (S[name]) S[name](...a); },
    setEnabled(v) { enabled = v; if (!v) stopMusic(); else if (musicOn) startMusic(); },
    setMusic(v) { musicOn = v; if (v) startMusic(); else stopMusic(); },
    startMusic, stopMusic, get enabled() { return enabled; }
  };
})();
