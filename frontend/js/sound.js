/**
 * STMS - Synthetic Command Center Audio Effects Engine
 * Uses Native HTML5 Web Audio API (Zero external assets required)
 */

class SoundEffects {
  constructor() {
    this.enabled = localStorage.getItem('stms_sound_enabled') === 'true';
    this.audioCtx = null;
  }

  initContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('stms_sound_enabled', this.enabled);
    if (this.enabled) {
      this.initContext();
      this.playSuccess();
    }
    return this.enabled;
  }

  // Quick tactile interface click / blip
  playClick() {
    if (!this.enabled) return;
    try {
      this.initContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch {}
  }

  // Affirmative futuristic chime
  playSuccess() {
    if (!this.enabled) return;
    try {
      this.initContext();
      const now = this.audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.07, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.15);
      });
    } catch {}
  }

  // Warning / Danger alert sound
  playAlert() {
    if (!this.enabled) return;
    try {
      this.initContext();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.24);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  // Emergency Siren Sweep (Ambulance / Fire dispatch)
  playEmergencySiren() {
    if (!this.enabled) return;
    try {
      this.initContext();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.3);
      osc.frequency.linearRampToValueAtTime(600, now + 0.6);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.9);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 1.1);
    } catch {}
  }
}

const soundFx = new SoundEffects();
window.soundFx = soundFx;

