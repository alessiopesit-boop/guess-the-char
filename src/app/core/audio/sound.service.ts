import { Injectable, inject } from '@angular/core';
import { AppStateService } from '../state/app-state.service';

interface BlipOptions {
  freq?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly appState = inject(AppStateService);
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    return this.ctx;
  }

  private blip(opts: BlipOptions = {}): void {
    if (!this.appState.state().sound) return;
    const { freq = 440, dur = 0.08, type = 'sine', gain = 0.05, delay = 0 } = opts;
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  playCorrect(): void {
    this.blip({ freq: 660, type: 'sine', dur: 0.09 });
    this.blip({ freq: 990, type: 'sine', dur: 0.12, delay: 0.06 });
  }

  playWrong(): void {
    this.blip({ freq: 220, type: 'square', dur: 0.12, gain: 0.04 });
  }

  playTick(): void {
    this.blip({ freq: 880, type: 'triangle', dur: 0.04, gain: 0.03 });
  }
}
