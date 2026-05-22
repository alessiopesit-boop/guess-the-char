import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { ALL_SCRIPT_IDS } from '../../core/data/scripts';
import { buildQuestion, mulberry32, seedFromDate } from '../../core/data/quiz';
import { computeBadges } from '../../core/data/badges';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';
import { LangSwitch } from '../../shared/lang-switch';
import { StreakPill } from '../../shared/streak-pill';
import { APP_VERSION, BUILD_CONTEXT, BUILD_SHA } from '../../core/build-info';

@Component({
  selector: 'app-home',
  imports: [AppBar, Icon, LangSwitch, StreakPill],
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
