import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import {
  LeaderboardPeriod,
  LeaderboardRow,
  LeaderboardService,
} from '../../core/firebase/leaderboard.service';
import { AppBar } from '../../shared/app-bar';

/**
 * Pagina classifica con due viste (Daily/Alltime) e paginazione "Mostra
 * altri". Le righe sono cliccabili e portano al profilo pubblico
 * dell'utente. Top 3 hanno medaglie 🥇🥈🥉. La riga corrente (l'utente
 * loggato) e' evidenziata in ambra con pillola "TU".
 */
@Component({
  selector: 'app-leaderboard',
  imports: [AppBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
})
export class Leaderboard {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly lbSvc = inject(LeaderboardService);

  protected readonly period = signal<LeaderboardPeriod>('alltime');
  protected readonly rows = signal<LeaderboardRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(false);
  /** Errore generico (rete, rules, ecc.). Se settato, la UI mostra un retry. */
  protected readonly error = signal<string | null>(null);

  /** Cursor della paginazione: ultimo doc snapshot della pagina corrente. */
  private lastDoc: Awaited<ReturnType<LeaderboardService['fetch']>>['lastDoc'] = null;

  private readonly PAGE_SIZE = 30;

  protected readonly myUid = computed(() => this.appState.state().account?.uid ?? null);

  constructor() {
    // Carica la prima pagina quando cambia il period.
    effect(() => {
      const p = this.period();
      void this.firstLoad(p);
    });
  }

  protected setPeriod(p: LeaderboardPeriod): void {
    if (this.period() === p) return;
    this.period.set(p);
  }

  private async firstLoad(period: LeaderboardPeriod): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.rows.set([]);
    this.lastDoc = null;
    try {
      const page = await this.lbSvc.fetch(period, this.PAGE_SIZE);
      this.rows.set(page.rows);
      this.lastDoc = page.lastDoc;
      this.hasMore.set(page.hasMore);
    } catch (e) {
      console.warn('[leaderboard] error:', e);
      this.error.set(this.translateError(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore() || !this.lastDoc) return;
    this.loadingMore.set(true);
    try {
      const page = await this.lbSvc.fetch(this.period(), this.PAGE_SIZE, this.lastDoc);
      this.rows.update((rs) => [...rs, ...page.rows]);
      this.lastDoc = page.lastDoc;
      this.hasMore.set(page.hasMore);
    } catch (e) {
      console.warn('[leaderboard] loadMore error:', e);
      this.error.set(this.translateError(e));
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected openProfile(nick: string): void {
    if (!nick) return;
    this.router.navigate(['/u', nick]);
  }

  protected medal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  /** Formatta score per il display: Daily mostra "N/5", Alltime numero plain. */
  protected formatScore(score: number, period: LeaderboardPeriod): string {
    if (period === 'daily') return `${score}/5`;
    return score.toLocaleString(this.i18n.lang() === 'it' ? 'it-IT' : 'en-GB');
  }

  protected goBack(): void {
    this.location.back();
  }
  protected goHome(): void {
    this.router.navigate(['/home']);
  }
  protected goLogin(): void {
    this.router.navigate(['/login']);
  }
  protected retry(): void {
    void this.firstLoad(this.period());
  }

  private translateError(e: unknown): string {
    const code = (e as { code?: string })?.code ?? '';
    const isIt = this.i18n.lang() === 'it';
    if (code === 'failed-precondition' || (e as Error)?.message?.includes('index')) {
      return isIt
        ? 'Indice Firestore mancante. Esegui "npm run deploy:indexes" per crearlo.'
        : 'Missing Firestore index. Run "npm run deploy:indexes" to create it.';
    }
    return isIt
      ? 'Qualcosa non ha funzionato. Riprova tra poco.'
      : 'Something went wrong. Please try again.';
  }
}
