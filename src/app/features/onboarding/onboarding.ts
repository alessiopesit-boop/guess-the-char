import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { Icon } from '../../shared/icon';
import { LangSwitch } from '../../shared/lang-switch';
import { Logo } from '../../shared/logo';

interface OnboardingStep {
  eyebrowIt: string;
  eyebrowEn: string;
  titleIt: string;
  titleEn: string;
  bodyIt: string;
  bodyEn: string;
  glyphs: string[];
}

const STEPS: ReadonlyArray<OnboardingStep> = [
  {
    eyebrowIt: 'BENVENUTO',
    eyebrowEn: 'WELCOME',
    titleIt: 'Indovina il carattere.',
    titleEn: 'Guess the character.',
    bodyIt: 'Compare un glifo. Tu riconosci da quale scrittura del mondo proviene. Tutto qui.',
    bodyEn: 'A glyph appears. You name the writing system it comes from. That is it.',
    glyphs: ['字', 'ज', 'ش', 'Ω', 'ก', 'А', 'ㄱ', 'א'],
  },
  {
    eyebrowIt: 'COME FUNZIONA',
    eyebrowEn: 'HOW IT WORKS',
    titleIt: 'Quattro opzioni. Tasti 1 a 4.',
    titleEn: 'Four options. Keys 1 to 4.',
    bodyIt: 'Risposta in un tocco o un tasto. Migliora la tua striscia, sblocca nuove scritture.',
    bodyEn: 'Answer in a tap, or a keystroke. Build a streak, unlock new scripts.',
    glyphs: ['ण', 'ج', 'み', '한', 'क', 'ル', 'ლ', 'ר'],
  },
];

const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_OFFAXIS = 60;

@Component({
  selector: 'app-onboarding',
  imports: [Icon, LangSwitch, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding {
  protected readonly i18n = inject(I18nService);
  private readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly dir = signal<'fwd' | 'back'>('fwd');

  /** Coordinate iniziali del touch (per il riconoscimento dello swipe). */
  private touchStart: { x: number; y: number } | null = null;

  protected readonly current = computed(() => STEPS[this.step()]);
  protected readonly isLast = computed(() => this.step() === STEPS.length - 1);
  /** Chiave usata da @for per forzare il remount del DOM e far ripartire l'animazione di slide ad ogni cambio di step/direzione. */
  protected readonly slideKey = computed(() => `${this.step()}:${this.dir()}`);
  protected readonly currentEyebrow = computed(() => {
    const s = this.current();
    return this.i18n.lang() === 'en' ? s.eyebrowEn : s.eyebrowIt;
  });
  protected readonly currentTitle = computed(() => {
    const s = this.current();
    return this.i18n.lang() === 'en' ? s.titleEn : s.titleIt;
  });
  protected readonly currentBody = computed(() => {
    const s = this.current();
    return this.i18n.lang() === 'en' ? s.bodyEn : s.bodyIt;
  });
  protected readonly continueLabel = computed(() => {
    if (this.isLast()) {
      return this.i18n.lang() === 'en' ? 'Start playing' : 'Inizia a giocare';
    }
    return this.i18n.t('continue');
  });

  protected go(next: number): void {
    this.dir.set(next > this.step() ? 'fwd' : 'back');
    this.step.set(next);
  }

  protected next(): void {
    if (this.isLast()) {
      this.done();
    } else {
      this.go(this.step() + 1);
    }
  }

  protected done(): void {
    this.appState.update({ onboarded: true });
    this.router.navigate(['/home']);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (this.step() < STEPS.length - 1) {
        e.preventDefault();
        this.go(this.step() + 1);
      } else {
        e.preventDefault();
        this.done();
      }
    } else if (e.key === 'ArrowLeft' && this.step() > 0) {
      e.preventDefault();
      this.go(this.step() - 1);
    }
  }

  @HostListener('touchstart', ['$event'])
  protected onTouchStart(e: TouchEvent): void {
    const t = e.touches[0];
    if (!t) return;
    this.touchStart = { x: t.clientX, y: t.clientY };
  }

  @HostListener('touchend', ['$event'])
  protected onTouchEnd(e: TouchEvent): void {
    const start = this.touchStart;
    this.touchStart = null;
    if (!start) return;
    const end = e.changedTouches[0];
    if (!end) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    // Riconosci come swipe solo se prevale l'asse orizzontale e supera la soglia.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_MAX_OFFAXIS) return;
    if (dx < 0) {
      // Swipe verso sinistra: avanza.
      if (this.step() < STEPS.length - 1) this.go(this.step() + 1);
      else this.done();
    } else if (this.step() > 0) {
      // Swipe verso destra: torna indietro.
      this.go(this.step() - 1);
    }
  }
}
