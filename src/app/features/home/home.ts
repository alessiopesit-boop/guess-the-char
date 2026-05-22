import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { ALL_SCRIPT_IDS } from '../../core/data/scripts';
import { buildQuestion, mulberry32, seedFromDate } from '../../core/data/quiz';
import { computeBadges } from '../../core/data/badges';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';
import { InfoSheet } from '../../shared/info-sheet';
import { LangSwitch } from '../../shared/lang-switch';
import { APP_VERSION, BUILD_CONTEXT, BUILD_SHA } from '../../core/build-info';

type InfoKind = 'streak' | 'accuracy' | 'played' | 'dailyStreak';

@Component({
  selector: 'app-home',
  imports: [AppBar, Icon, InfoSheet, LangSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);

  protected readonly state = this.appState.state;

  /** Versione mostrata in fondo alla home. In dev include "dev" e l'hash di commit. */
  protected readonly buildLabel =
    BUILD_CONTEXT === 'release' ? `v${APP_VERSION}` : `v${APP_VERSION} · dev · ${BUILD_SHA}`;

  /** Quale modale informativa e' aperta in questo momento (null = nessuna). */
  protected readonly infoOverlay = signal<InfoKind | null>(null);

  protected readonly infoTitle = computed(() => {
    const isIt = this.i18n.lang() === 'it';
    switch (this.infoOverlay()) {
      case 'streak':
        return isIt ? 'Striscia' : 'Streak';
      case 'accuracy':
        return isIt ? 'Precisione' : 'Accuracy';
      case 'played':
        return isIt ? 'Partite' : 'Played';
      case 'dailyStreak':
        return isIt ? 'Giorni consecutivi' : 'Days in a row';
      default:
        return '';
    }
  });

  protected readonly infoBody = computed(() => {
    const isIt = this.i18n.lang() === 'it';
    const s = this.state();
    switch (this.infoOverlay()) {
      case 'streak':
        return isIt
          ? `Risposte corrette consecutive in qualunque modalita'. Ricomincia da zero al primo errore. Migliore di sempre: ${s.bestStreak}.`
          : `Correct answers in a row across any mode. Resets to zero on your first mistake. Personal best: ${s.bestStreak}.`;
      case 'accuracy':
        return isIt
          ? 'Percentuale di risposte corrette sul totale dei caratteri ai quali hai risposto. Si aggiorna a ogni risposta.'
          : 'Percentage of correct answers over all the characters you have responded to. Updated after every answer.';
      case 'played':
        return isIt
          ? 'Numero totale di caratteri ai quali hai risposto in tutte le modalita\', corretti e sbagliati insieme.'
          : 'Total number of characters you have answered across all modes, correct and wrong combined.';
      case 'dailyStreak':
        return isIt
          ? `Giorni consecutivi in cui hai concluso la sfida giornaliera. Si azzera se ne salti uno.${s.dailyStreak > 0 ? ` Sei a ${s.dailyStreak}.` : ''}`
          : `Days in a row you finished the daily challenge. Resets if you skip a day.${s.dailyStreak > 0 ? ` You're on ${s.dailyStreak}.` : ''}`;
      default:
        return '';
    }
  });

  protected openInfo(kind: InfoKind, e?: Event): void {
    e?.stopPropagation();
    this.infoOverlay.set(kind);
  }

  protected closeInfo(): void {
    this.infoOverlay.set(null);
  }

  protected readonly todayLabel = computed(() => {
    const locale = this.i18n.lang() === 'it' ? 'it-IT' : 'en-GB';
    return new Date().toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  /** Anteprima deterministica di 3 glifi per la card della sfida giornaliera. */
  protected readonly previewGlyphs = computed(() => {
    const rng = mulberry32(seedFromDate());
    const out: string[] = [];
    let prev: string | null = null;
    for (let i = 0; i < 3; i++) {
      const q = buildQuestion(rng, ALL_SCRIPT_IDS, prev);
      out.push(q.glyph);
      prev = q.correct.id;
    }
    return out;
  });

  protected readonly weakScripts = computed(() => {
    const entries = Object.entries(this.state().perScript ?? {});
    return entries
      .filter(([, v]) => v.tries >= 5 && v.correct / v.tries < 0.6)
      .map(([id]) => id);
  });

  protected readonly badgeStats = computed(() => {
    const list = computeBadges(this.state());
    const unlocked = list.filter((b) => b.unlocked).length;
    return { total: list.length, unlocked, preview: list.slice(0, 4) };
  });

  protected goSelection(mode: 'training' | 'timed' | 'survival'): void {
    this.router.navigate(['/selection'], { queryParams: { mode } });
  }

  protected goDaily(): void {
    this.router.navigate([this.state().dailyDone ? '/daily-result' : '/daily']);
  }

  protected goWeak(): void {
    this.router.navigate(['/game'], { queryParams: { mode: 'training', weak: '1' } });
  }

  protected goProfile(): void {
    this.router.navigate(['/profile']);
  }

  protected goLogin(): void {
    this.router.navigate(['/login']);
  }

  protected goBadges(): void {
    this.router.navigate(['/badges']);
  }

  protected goSettings(): void {
    this.router.navigate(['/settings']);
  }

  protected goFeedback(): void {
    this.router.navigate(['/feedback']);
  }
}
