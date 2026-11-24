/* ============================================================
   효과음 — 파일 없이 합성
   ============================================================ */
export default class SoundFX {
  #ctx = null;
  #noiseBuf = null;
  #out = null;
  #last = { car: -9, flap: -9 };
  // ---------- setup ----------
  init() {
    try {
      this.#ensure();
    } catch {}
  }
  #ensure() {
    if (!this.#ctx) {
      const ctx = this.#ctx = new(window.AudioContext || window.webkitAudioContext)();
      const len = ctx.sampleRate | 0;
      this.#noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.#noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // 전체 출력 버스: 크게 틀어도 안 찢어지게 컴프레서를 거침
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 14;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.14;
      comp.connect(ctx.destination);
      this.#out = ctx.createGain();
      this.#out.gain.value = 1.0;
      this.#out.connect(comp);
    }
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    return this.#ctx;
  }
  /** 오디오 오류(자동재생 차단 등)가 게임을 멈추지 않도록 감싸는 헬퍼 */
  #play(fn) {
    try {
      const c = this.#ensure();
      fn(c, c.currentTime);
    } catch {}
  }
  // ---------- primitives ----------
  #burst(t0, dur, type, f0, f1, q, peak, attack) {
    const c = this.#ctx;
    const src = c.createBufferSource();
    src.buffer = this.#noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t0);
    fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(this.#out);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }
  #tone(t0, dur, type, f0, f1, peak, attack) {
    const c = this.#ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.#out);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  // ---------- sounds ----------
  flap() { // 푸드득
    this.#play((_, t0) => {
      if (t0 - this.#last.flap < 0.08) return;
      this.#last.flap = t0;
      this.#burst(t0, 0.26, 'bandpass', 620, 220, 0.55, 0.62, 0.07);
      this.#burst(t0 + 0.14, 0.22, 'bandpass', 520, 200, 0.55, 0.48, 0.06);
      this.#tone(t0 + 0.02, 0.14, 'sine', 105, 55, 0.30, 0.03);
    });
  }
  flutter() { // 미끄러져 퍼덕
    this.#play((_, t0) => {
      for (let i = 0; i < 5; i++) this.#burst(t0 + i * 0.09, 0.14, 'bandpass', 700, 260, 0.6, 0.48, 0.03);
    });
  }
  land() { // 착지 툭
    this.#play((_, t0) => {
      this.#tone(t0, 0.09, 'sine', 120, 55, 0.8, 0.008);
      this.#burst(t0, 0.05, 'lowpass', 900, 300, 0.7, 0.42, 0.005);
    });
  }
  peck() { // 톡
    this.#play((_, t0) => {
      this.#burst(t0, 0.022, 'highpass', 2600, 2600, 0.7, 0.6, 0.003);
      this.#tone(t0, 0.03, 'sine', 900, 400, 0.25, 0.003);
    });
  }
  thud() { // 유리에 박음
    this.#play((_, t0) => {
      this.#tone(t0, 0.18, 'sine', 95, 40, 1.1, 0.008);
      this.#burst(t0, 0.08, 'lowpass', 1200, 200, 0.6, 0.7, 0.004);
      this.#tone(t0 + 0.01, 0.35, 'sine', 2400, 2300, 0.18, 0.004);
    });
  }
  beep() { // 신고 접수
    this.#play((_, t0) => {
      this.#tone(t0, 0.06, 'square', 1320, 1320, 0.13, 0.004);
      this.#tone(t0 + 0.09, 0.09, 'square', 1760, 1760, 0.13, 0.004);
    });
  }
  car(k = 0) { // 차 지나감 (k: 0~1 가까움)
    this.#play((_, t0) => {
      if (t0 - this.#last.car < 0.9) return;
      this.#last.car = t0;
      this.#burst(t0, 0.95, 'lowpass', 260 + k * 700, 200, 0.6, 0.28 + k * 0.6, 0.30);
    });
  }
  fanfare() { // 빰-빠-밤-빠아
    this.#play((c, t0) => {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      lp.Q.value = 0.7;
      lp.connect(this.#out);
      const note = (f, s, d, peak) => {
        [1, 1.005].forEach(det => {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f * det;
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, t0 + s);
          g.gain.exponentialRampToValueAtTime(peak, t0 + s + 0.03);
          g.gain.setValueAtTime(peak, t0 + s + d * 0.7);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d);
          o.connect(g);
          g.connect(lp);
          o.start(t0 + s);
          o.stop(t0 + s + d + 0.05);
        });
      };
      note(523.25, 0.00, 0.16, 0.22);
      note(523.25, 0.18, 0.16, 0.22);
      note(659.25, 0.36, 0.16, 0.22);
      note(783.99, 0.54, 0.16, 0.22);
      note(1046.5, 0.74, 0.95, 0.26);
      note(783.99, 0.74, 0.95, 0.14);
      note(523.25, 0.74, 0.95, 0.14);
    });
  }
  coo() {
    this.#play((c, t0) => {
      const master = c.createGain();
      master.gain.setValueAtTime(0.0001, t0);
      master.connect(this.#out);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      lp.Q.value = 1.6;
      lp.connect(master);
      const o1 = c.createOscillator();
      o1.type = 'triangle';
      const o2 = c.createOscillator();
      o2.type = 'sine';
      const o3 = c.createOscillator();
      o3.type = 'sawtooth';
      const g2 = c.createGain();
      g2.gain.value = 0.6;
      const g3 = c.createGain();
      g3.gain.value = 0.18;
      o1.connect(lp);
      o2.connect(g2);
      g2.connect(lp);
      o3.connect(g3);
      g3.connect(lp);
      const trem = c.createOscillator();
      trem.type = 'sine';
      trem.frequency.value = 26;
      const tg = c.createGain();
      tg.gain.value = 0.55;
      trem.connect(tg);
      tg.connect(master.gain);
      [[0.00, 0.26, 330], [0.30, 0.20, 305], [0.55, 0.50, 285]].forEach(([s, d, f]) => {
        o1.frequency.setValueAtTime(f * 1.12, t0 + s);
        o1.frequency.exponentialRampToValueAtTime(f * 0.86, t0 + s + d);
        o2.frequency.setValueAtTime(f * 2.05, t0 + s);
        o2.frequency.exponentialRampToValueAtTime(f * 1.7, t0 + s + d);
        o3.frequency.setValueAtTime(f * 3.02, t0 + s);
        o3.frequency.exponentialRampToValueAtTime(f * 2.55, t0 + s + d);
        master.gain.setValueAtTime(0.0001, t0 + s);
        master.gain.exponentialRampToValueAtTime(1.5, t0 + s + 0.06);
        master.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d);
      });
      [o1, o2, o3, trem].forEach(o => {
        o.start(t0);
        o.stop(t0 + 1.2);
      });
    });
  }
}