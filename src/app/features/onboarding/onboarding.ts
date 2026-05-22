import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { Icon } from '../../shared/icon';
import { Logo } from '../../shared/logo';

interface OnboardingStep {
  eyebrow: string;
  titleIt: string;
  titleEn: string;
  bodyIt: string;
  bodyEn: string;
  glyphs: string[];
}

const STEPS: ReadonlyArray<OnboardingStep> = [
  {
    eyebrow: 'BENVENUTO',
    titleIt: 'Indovina il carattere.',
    titleEn: 'Guess the character.',
    bodyIt: 'Compare un glifo. Tu riconosci da quale scrittura del mondo proviene. Tutto qui.',
    bodyEn: 'A glyph appears. You name the writing system it comes from. That is it.',
    glyphs: ['字', 'ज', 'ش', 'Ω', 'ก', 'А', 'ㄱ', 'א'],
  },
  {
    eyebrow: 'COME FUNZIONA',
    titleIt: 'Quattro opzioni. Tasti 1 a 4.',
    titleEn: 'Four options. Keys 1 to 4.',
    bodyIt: 'Risposta in un tocco o un tasto. Migliora la tua striscia, sblocca nuove scritture.',
    bodyEn: 'Answer in a tap, or a keystroke. Build a streak, unlock new scripts.',
    glyphs: ['ण', 'ج', 'み', '한', 'क', 'ル', 'ლ', 'ר'],
  },
];

@Component({
  selector: 'app-onboarding',
  imports: [Icon, Logo],
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

  protected readonly current = computed(() => STEPS[this.step()]);
  protected readonly isLast = computed(() => this.step() === STEPS.length - 1);
  /** Chiave usata da @for per forzare il remount del DOM e far ripartire l'animazione di slide ad ogni cambio di step/direzione. */
  protected readonly slideKey = computed(() => `${this.step()}:${this.dir()}`);
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
}
