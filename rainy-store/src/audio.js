// 声音：程序化雨声 / 远雷 / 店内轻音乐 / 各种交互音效，并做室内外过渡
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.level = 1;
    this.master = null;
    this.rainGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noise = null;
    this.musicTimer = 0;
    this.chordIdx = 0;
    this.beat = 0;
    this.raf = null;
  }

  _noiseBuffer() {
    const ctx = this.ctx;
    const seconds = 4;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        const pink = (b0 + b1 + b2 + white * 0.1848) * 0.18;
        d[i] = pink * 0.55 + white * 0.45;
      }
    }
    return buf;
  }

  _build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    this.master = master;

    // 雨声总线
    const rain = ctx.createGain();
    rain.gain.value = 0.9;
    rain.connect(master);
    this.rainGain = rain;

    // 音乐总线
    const music = ctx.createGain();
    music.gain.value = 0.0;
    music.connect(master);
    this.musicGain = music;

    // 音效总线
    const sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(master);
    this.sfxGain = sfx;

    const noise = this._noiseBuffer();
    this.noise = noise;

    const mk = (offset) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.start(0, offset);
      return src;
    };

    // 主雨幕
    const s1 = mk(0);
    const hp1 = ctx.createBiquadFilter();
    hp1.type = 'highpass';
    hp1.frequency.value = 320;
    const lp1 = ctx.createBiquadFilter();
    lp1.type = 'lowpass';
    lp1.frequency.value = 7200;
    const g1 = ctx.createGain();
    g1.gain.value = 0.5;
    s1.connect(hp1).connect(lp1).connect(g1).connect(rain);

    // 高频雨点
    const s2 = mk(1.3);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.55;
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    s2.connect(bp).connect(g2).connect(rain);

    // 低频底噪
    const s3 = mk(2.6);
    const lp3 = ctx.createBiquadFilter();
    lp3.type = 'lowpass';
    lp3.frequency.value = 220;
    const g3 = ctx.createGain();
    g3.gain.value = 0.34;
    s3.connect(lp3).connect(g3).connect(rain);

    // 起伏
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(g1.gain);
    lfo.start();

    this.layers = [s1, s2, s3];
  }

  async start() {
    if (!this.ctx) this._build();
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (e) { /* ignore */ }
    }
    this.enabled = true;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.42, now, 1.2);
    this.musicGain.gain.setTargetAtTime(0.11, now, 2.0);
  }

  stop() {
    if (!this.ctx) return;
    this.enabled = false;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(0.0001, now, 0.5);
  }

  async toggle() {
    if (this.enabled) this.stop();
    else await this.start();
    return this.enabled;
  }

  setRainLevel(v) {
    this.level = v;
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(0.55 + Math.min(1.6, v) * 0.45, this.ctx.currentTime, 0.4);
  }

  /** 根据玩家位置在室内外之间过渡 */
  update(dt, playerPos) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const inside = playerPos.z < -3.4 ? 1 : 0;
    const now = this.ctx.currentTime;

    // 注意：这里必须先初始化，否则会算出 NaN 传给 setTargetAtTime 而每帧抛错
    if (typeof this._lastInside !== 'number' || !Number.isFinite(this._lastInside)) {
      this._lastInside = inside;
    }
    this._lastInside += (inside - this._lastInside) * Math.min(1, dt * 2);

    this.rainGain.gain.setTargetAtTime(0.55 + this._lastInside * 0.12, now, 0.5);
    this.musicGain.gain.setTargetAtTime(0.035 + this._lastInside * 0.1, now, 0.8);

    // 页面不可见时不再往音频图里塞新节点
    if (document.hidden) return;

    // 店内轻音乐：简单的琶音
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer += 0.42;
      this._playMusicStep();
    }
  }

  _playMusicStep() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    // 日式便利店感的和弦进行：Fmaj7 - G - Em7 - Am
    const chords = [
      [349.23, 440.0, 523.25, 659.25], // F A C E
      [392.0, 493.88, 587.33, 698.46], // G B D F
      [329.63, 392.0, 493.88, 587.33], // E G B D
      [440.0, 523.25, 659.25, 783.99], // A C E G
    ];
    const bar = Math.floor(this.beat / 8) % chords.length;
    const chord = chords[bar];
    const note = chord[this.beat % 4];
    const now = ctx.currentTime;

    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = note * (this.beat % 8 < 4 ? 1 : 2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    o.connect(g).connect(this.musicGain);
    o.start(now);
    o.stop(now + 1.0);

    // 低音
    if (this.beat % 8 === 0) {
      const b = ctx.createOscillator();
      b.type = 'sine';
      b.frequency.value = chord[0] / 2;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, now);
      bg.gain.exponentialRampToValueAtTime(0.1, now + 0.05);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
      b.connect(bg).connect(this.musicGain);
      b.start(now);
      b.stop(now + 2.1);
    }
    this.beat++;
  }

  /* ---------------------------------------------------------- 音效 */

  _tone(freq, dur, type = 'sine', gain = 0.18, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  _noiseBurst(dur = 0.08, freq = 1200, gain = 0.12, type = 'bandpass') {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  pick() { this._noiseBurst(0.09, 900, 0.14); this._tone(520, 0.08, 'triangle', 0.08); }
  tap() { this._noiseBurst(0.06, 480, 0.1); }
  beep(freq = 1180, dur = 0.07) { this._tone(freq, dur, 'square', 0.07); }
  coin() {
    this._tone(2100, 0.08, 'square', 0.07);
    this._tone(2600, 0.1, 'square', 0.06, 0.07);
    this._tone(3200, 0.12, 'square', 0.05, 0.14);
  }
  step(running = false) {
    this._noiseBurst(running ? 0.07 : 0.09, 220 + Math.random() * 120, 0.05 + Math.random() * 0.02, 'lowpass');
  }
  doorBell() {
    this._tone(1318.5, 0.35, 'sine', 0.09);
    this._tone(1046.5, 0.5, 'sine', 0.08, 0.16);
  }
  uiOpen() { this._tone(880, 0.1, 'sine', 0.07); this._tone(1174, 0.12, 'sine', 0.05, 0.06); }
  uiClose() { this._tone(660, 0.12, 'sine', 0.06); }
  uiSelect() { this._tone(1320, 0.07, 'triangle', 0.07); }

  /** 远处闷雷 */
  thunder(delay = 1.4) {
    if (!this.ctx || !this.enabled || !this.noise) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180 + Math.random() * 90, t0);
    lp.frequency.exponentialRampToValueAtTime(70, t0 + 2.6);
    lp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
    src.connect(lp).connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + 3.0);
  }
}
