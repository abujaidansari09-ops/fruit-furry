// audio.js
// All sounds are synthesized with the Web Audio API so the game needs zero
// external sound files. Drop real .mp3/.wav files into assets/sounds/ and
// wire them up in AudioManager.loadSample() if you'd rather use recordings.

import { STORAGE_KEYS } from './gameConfig.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem(STORAGE_KEYS.soundOn) !== 'false';
    this.masterGain = null;
  }

  // Must be called after a user gesture (browsers block autoplay otherwise)
  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? 1 : 0;
    this.masterGain.connect(this.ctx.destination);
  }

  setEnabled(on) {
    this.enabled = on;
    localStorage.setItem(STORAGE_KEYS.soundOn, on ? 'true' : 'false');
    if (this.masterGain) this.masterGain.gain.value = on ? 1 : 0;
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  _osc({ freq, type = 'sine', start = 0, dur = 0.15, gain = 0.3, freqEnd = null, gainEnd = 0.0001 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(gainEnd, t0 + dur);
    osc.connect(g).connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ start = 0, dur = 0.25, gain = 0.3, filterFreq = 1200 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.masterGain);
    src.start(t0);
  }

  slice() {
    if (!this.ctx) return;
    this._noise({ dur: 0.12, gain: 0.18, filterFreq: 4500 });
    this._osc({ freq: 900, freqEnd: 260, type: 'sine', dur: 0.12, gain: 0.12 });
  }

  bombExplosion() {
    if (!this.ctx) return;
    this._noise({ dur: 0.6, gain: 0.5, filterFreq: 900 });
    this._osc({ freq: 120, freqEnd: 40, type: 'sawtooth', dur: 0.5, gain: 0.35 });
  }

  combo(level) {
    if (!this.ctx) return;
    const base = 520 + Math.min(level, 10) * 40;
    this._osc({ freq: base, freqEnd: base * 1.6, type: 'triangle', dur: 0.18, gain: 0.22 });
  }

  buttonClick() {
    if (!this.ctx) return;
    this._osc({ freq: 700, freqEnd: 500, type: 'square', dur: 0.06, gain: 0.15 });
  }

  gameStart() {
    if (!this.ctx) return;
    this._osc({ freq: 440, freqEnd: 880, type: 'sine', dur: 0.3, gain: 0.25 });
  }

  gameOver() {
    if (!this.ctx) return;
    this._osc({ freq: 400, freqEnd: 120, type: 'sawtooth', dur: 0.7, gain: 0.3 });
  }

  powerUp() {
    if (!this.ctx) return;
    this._osc({ freq: 500, freqEnd: 1200, type: 'sine', dur: 0.25, gain: 0.25, start: 0 });
    this._osc({ freq: 650, freqEnd: 1500, type: 'sine', dur: 0.25, gain: 0.2, start: 0.05 });
  }
}
