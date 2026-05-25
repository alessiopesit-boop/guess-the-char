import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { NicknameEntry, UserSearchService } from '../../core/firebase/user-search.service';
import { AppBar } from '../../shared/app-bar';

@Component({
  selector: 'app-search',
  imports: [AppBar, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  private readonly appState = inject(AppStateService);
  private readonly searchSvc = inject(UserSearchService);

  protected readonly query = signal('');
  protected readonly results = signal<NicknameEntry[]>([]);
  protected readonly loading = signal(false);
  protected readonly hasSearched = signal(false);

  protected readonly myUid = computed(() => this.appState.state().account?.uid ?? null);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  protected setQuery(v: string): void {
    this.query.set(v);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    // Debounce 250ms: l'utente che digita "alessio" non scatena 7 ricerche.
    this.debounceTimer = setTimeout(() => void this.runSearch(), 250);
  }

  /** Trigger esplicito per la pressione Enter o il bottone "Cerca". */
  protected submitSearch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    void this.runSearch();
  }

  private async runSearch(): Promise<void> {
    const q = this.query().trim();
    if (q.length < 2) {
      this.results.set([]);
      this.hasSearched.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const r = await this.searchSvc.search(q);
      this.results.set(r);
      this.hasSearched.set(true);
    } catch (e) {
      console.warn('[search] error:', e);
      this.results.set([]);
      this.hasSearched.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected openProfile(nick: string): void {
    this.router.navigate(['/u', nick]);
  }

  protected clearQuery(): void {
    this.query.set('');
    this.results.set([]);
    this.hasSearched.set(false);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }

  /** Etichetta del conteggio con plurale corretto. */
  protected resultsLabel(): string {
    const n = this.results().length;
    if (this.i18n.lang() === 'it') {
      return n === 1 ? '1 utente trovato' : `${n} utenti trovati`;
    }
    return n === 1 ? '1 user found' : `${n} users found`;
  }
}
