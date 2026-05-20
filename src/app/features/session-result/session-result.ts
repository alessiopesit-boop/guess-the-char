import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';

interface HistoryEntry {
  correct: boolean;
  scriptId: string;
  glyph: string;
}

type Mode = 'training' | 'timed' | 'survival';

@Component({
  selector: 'app-session-result',
  imports: [AppBar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './session-result.html',
  styleUrl: './session-result.css',
})
export class SessionResult {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly mode = computed<Mode>(() => {
    const m = this.queryParams().get('mode');
    return m === 'timed' || m === 'survival' || m === 'training' ? m : 'training';
  });

  protected readonly scoreParam = computed(() => {
    const s = this.queryParams().get('score');
    if (s === null || s === '' || s === 'null') return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  });

  // history viene passato dal Game via Router state; window.history.state
  // funziona sia in path che hash routing.
  protected readonly history = signal<HistoryEntry[]>(
    ((window.history.state as { history?: HistoryEntry[] } | null)?.history) ?? [],
  );

  protected readonly correct = computed(() => this.history().filter((h) => h.correct).length);
  protected readonly total = computed(() => this.history().length);
  protected readonly accuracy = computed(() =>
    this.total() === 0 ? 0 : Math.round((100 * this.correct()) / this.total()),
  );
  protected readonly displayScore = computed(() => this.scoreParam() ?? this.correct());

  protected readonly modeLabel = computed(() => {
    switch (this.mode()) {
      case 'survival': return 'Survival';
      case 'timed': return this.i18n.t('timed');
      default: return this.i18n.t('training');
    }
  });

  protected readonly subline = computed(() => {
    const isIt = this.i18n.lang() === 'it';
    if (this.mode() === 'timed') {
      return isIt
        ? `${this.correct()} corrette in 60 secondi`
        : `${this.correct()} correct in 60 seconds`;
    }
    return isIt
      ? `${this.correct()} risposte corrette su ${this.total()}`
      : `${this.correct()} correct out of ${this.total()}`;
  });

  protected playAgain(): void {
    this.router.navigate(['/selection'], {
      queryParams: { mode: this.mode() },
      replaceUrl: true,
    });
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
