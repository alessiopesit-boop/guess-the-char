import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';

const EPOCH = new Date(2026, 0, 1).getTime();

@Component({
  selector: 'app-daily-result',
  imports: [AppBar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daily-result.html',
  styleUrl: './daily-result.css',
})
export class DailyResult {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);

  protected readonly state = this.appState.state;
  protected readonly copied = signal(false);

  protected readonly lastEntry = computed(() => {
    const h = this.state().dailyHistory ?? [];
    return h.length > 0 ? h[h.length - 1] : null;
  });
  protected readonly score = computed(() => this.lastEntry()?.score ?? 0);
  protected readonly results = computed(() => this.lastEntry()?.results ?? []);
  protected readonly grid = computed(() =>
    this.results()
      .map((c) => (c ? '🟩' : '🟥'))
      .join(''),
  );
  protected readonly dayN = computed(() => {
    return Math.floor((Date.now() - EPOCH) / 86400000) + 1;
  });
  protected readonly perfectDays = computed(
    () => (this.state().dailyHistory ?? []).filter((d) => d.score === 5).length,
  );

  protected readonly headline = computed(() => {
    const s = this.score();
    const isIt = this.i18n.lang() === 'it';
    if (s === 5) return isIt ? 'Punteggio pieno. Sublime.' : 'Perfect score. Sublime.';
    if (s >= 4) return isIt ? 'Quasi perfetto.' : 'Almost perfect.';
    if (s >= 3) return isIt ? 'Buon lavoro.' : 'Solid run.';
    return isIt ? 'Sotto media. Domani meglio.' : 'Below average. Tomorrow is another day.';
  });

  protected readonly shareText = computed(() => {
    const isIt = this.i18n.lang() === 'it';
    const title = isIt ? 'Indovina il carattere' : 'Guess the Char';
    return `${title} #${this.dayN()}\n${this.score()}/5\n${this.grid()}`;
  });

  protected async share(): Promise<void> {
    const text = this.shareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch {
      // utente ha annullato o API non disponibile
    }
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
