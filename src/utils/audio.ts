/**
 * Web Audio API Ambient Soundscape & UI Sound Effects (uisfx.com style)
 * Generates tactile, crisp, modern micro-interactions & ambient audio.
 */

class UISoundEffects {
  private ctx: AudioContext | null = null;
  private lastHoverTime: number = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * uisfx Tactile Click / Tap
   */
  public playClick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';

      // Pitch drop for a solid tactile click
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio context silenced or blocked
    }
  }

  /**
   * uisfx Soft Hover Tick
   */
  public playHover() {
    const nowMs = Date.now();
    // Throttle hover sounds so rapid mouse moves don't overwhelm
    if (nowMs - this.lastHoverTime < 60) return;
    this.lastHoverTime = nowMs;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, now);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // Audio blocked
    }
  }

  /**
   * uisfx Springy Pop (for menu toggles & filter selection)
   */
  public playPop() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';

      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // Audio blocked
    }
  }

  /**
   * uisfx Page Transition Chime
   */
  public playSwitch() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1 (E5 - 659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.085);

      // Note 2 (B5 - 987Hz) slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.04);
      gain2.gain.setValueAtTime(0.07, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.125);
    } catch {
      // Audio blocked
    }
  }

  /**
   * uisfx Cyber Scramble/Decrypt Burst
   */
  public playScramble() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.08);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.095);
    } catch {
      // Audio blocked
    }
  }
}

export const uiSfx = new UISoundEffects();

/**
 * Global listener setup for automatically playing uisfx sound effects on buttons and links
 */
export function setupGlobalUISFX() {
  if (typeof window === 'undefined') return;

  const handlePointerOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const interactive = target.closest('button, a, [role="button"], input, select, textarea, .cursor-pointer');
    if (interactive) {
      uiSfx.playHover();
    }
  };

  const handlePointerDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const interactive = target.closest('button, a, [role="button"], input[type="submit"], .cursor-pointer');
    if (interactive) {
      uiSfx.playClick();
    }
  };

  window.addEventListener('mouseover', handlePointerOver, { passive: true });
  window.addEventListener('mousedown', handlePointerDown, { passive: true });
}

/**
 * Audio Engine: Custom Background Music Player (/backsound.mp3) with ambient fallback.
 * Automatically loops, applies smooth audio ramp (fade-in / fade-out), and persists playback state.
 */
class AmbientSoundscape {
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private targetVolume: number = 0.55;
  private fadeInterval: number | null = null;

  // Web Audio fallback if backsound.mp3 is unavailable
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private isUsingSynthFallback: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.audio) return;
    try {
      this.audio = new Audio('/backsound.mp3');
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = 0;

      this.audio.addEventListener('error', () => {
        // If backsound.mp3 is not yet uploaded or fails to load, fallback to synth drone
        if (this.isPlaying && !this.isUsingSynthFallback) {
          this.isUsingSynthFallback = true;
          this.startSynth();
        }
      });
    } catch {
      // Audio element initialization fallback
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public getStatus(): boolean {
    return this.isPlaying;
  }

  private start() {
    this.isPlaying = true;
    this.initAudioElement();

    if (this.audio) {
      // Always reset and attempt to play backsound.mp3
      this.audio.volume = 0;
      const playPromise = this.audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isUsingSynthFallback = false;
            this.fadeInAudio();
          })
          .catch(() => {
            // If play was rejected (e.g. file not found or autoplay block), fallback to synth
            this.isUsingSynthFallback = true;
            this.startSynth();
          });
      } else {
        this.fadeInAudio();
      }
    } else {
      this.isUsingSynthFallback = true;
      this.startSynth();
    }
  }

  private fadeInAudio() {
    if (!this.audio) return;
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    let currentVol = this.audio.volume;
    const step = 0.05;
    const intervalTime = 40; // ~450ms smooth fade-in

    this.fadeInterval = window.setInterval(() => {
      if (!this.audio) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        return;
      }
      currentVol = Math.min(this.targetVolume, currentVol + step);
      this.audio.volume = currentVol;

      if (currentVol >= this.targetVolume) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
      }
    }, intervalTime);
  }

  private fadeOutAudio(onComplete?: () => void) {
    if (!this.audio) {
      onComplete?.();
      return;
    }
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    let currentVol = this.audio.volume;
    const step = 0.08;
    const intervalTime = 30; // ~200ms quick fade-out

    this.fadeInterval = window.setInterval(() => {
      if (!this.audio) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        onComplete?.();
        return;
      }
      currentVol = Math.max(0, currentVol - step);
      this.audio.volume = currentVol;

      if (currentVol <= 0.01) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.audio.pause();
        this.audio.currentTime = 0;
        onComplete?.();
      }
    }, intervalTime);
  }

  private stop() {
    this.isPlaying = false;

    if (this.isUsingSynthFallback) {
      this.stopSynth();
    } else if (this.audio) {
      this.fadeOutAudio();
    }
  }

  // Synth Fallback Methods
  private startSynth() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 1.8);

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(420, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
      this.lfo.connect(lfoGain);
      lfoGain.connect(this.filter.frequency);
      this.lfo.start();

      const chord = [73.42, 110.00, 185.00, 277.18, 329.63];

      this.oscillators = chord.map((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() * 0.4 - 0.2), this.ctx!.currentTime);

        const volume = i === 0 ? 0.25 : 0.15;
        oscGain.gain.setValueAtTime(volume, this.ctx!.currentTime);

        osc.connect(oscGain);
        oscGain.connect(this.filter!);
        osc.start();
        return osc;
      });

      this.filter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Audio context failure
    }
  }

  private stopSynth() {
    if (!this.ctx || !this.masterGain) return;
    try {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);

      setTimeout(() => {
        this.oscillators.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        });
        if (this.lfo) {
          try {
            this.lfo.stop();
            this.lfo.disconnect();
          } catch {}
        }
        if (this.ctx && this.ctx.state !== 'closed') {
          this.ctx.close();
        }
        this.ctx = null;
      }, 850);
    } catch {}
  }
}

export const ambientSound = new AmbientSoundscape();
