import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { ChallengeDoc, ChallengesService } from '../../core/firebase/challenges.service';
import { AppBar } from '../../shared/app-bar';

type Tab = 'incoming' | 'outgoing' | 'history';

/**
 * Lista delle sfide tra amici per l'utente loggato.
 *
 *  - "In arrivo": sfide pending dove sono il destinatario, devo giocarle.
 *  - "Inviate": sfide pending che ho creato, in attesa che l'altro giochi.
 *  - "Storico": sfide completed in cui ho partecipato (sia come from sia come to).
 */
@Component({
  selector: 'app-challenges-list',
  imports: [AppBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './challenges-list.html',
  styleUrl: './challenges-list.css',
})
export class ChallengesList {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly challenges = inject(ChallengesService);

  protected readonly tab = signal<Tab>('incoming');

  protected readonly incoming = signal<ChallengeDoc[]>([]);
  protected readonly outgoing = signal<ChallengeDoc[]>([]);
  protected readonly loading = signal(true);

  protected readonly pendingIncoming = computed(() =>
    this.incoming().filter((c) => c.status === 'pending'),
  );
  protected readonly pendingOutgoing = computed(() =>
    this.outgoing().filter((c) => c.status === 'pending'),
  );

  /** Sfide completate (in arrivo + inviate) unite e ordinate per data desc. */
  protected readonly history = computed(() => {
    const completed = [
      ...this.incoming().filter((c) => c.status === 'completed'),
      ...this.outgoing().filter((c) => c.status === 'completed'),
    ];
    // Doc.createdAt e' un Timestamp Firestore, ma a noi basta confrontare la
    // stringa per ordinamento approssimativo: nel runtime Firestore restituisce
    // oggetti con `seconds`. Ordino su seconds quando disponibile.
    completed.sort((a, b) => {
      const sa = (a.createdAt as { seconds?: number } | null)?.seconds ?? 0;
      const sb = (b.createdAt as { seconds?: number } | null)?.seconds ?? 0;
      return sb - sa;
    });
    return completed;
  });

  /** UID utente loggato (signal-friendly). */
  protected readonly myUid = computed(() => this.appState.state().account?.uid ?? null);

  /** Caricamento iniziale, riarmato al cambio di auth. */
  private readonly _load = effect(() => {
    const uid = this.myUid();
    if (!uid) {
      this.incoming.set([]);
      this.outgoing.set([]);
      this.loading.set(false);
      return;
    }
    void this.refresh();
  });

  private async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const [inc, out] = await Promise.all([
        this.challenges.listIncoming(),
        this.challenges.listOutgoing(),
      ]);
      this.incoming.set(inc);
      this.outgoing.set(out);
    } catch (e) {
      console.warn('[challenges-list] refresh error:', e);
    } finally {
      this.loading.set(false);
    }
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
  }

  protected openChallenge(id: string): void {
    this.router.navigate(['/sfida', id]);
  }

  protected openFriend(nickname: string): void {
    if (nickname) this.router.navigate(['/u', nickname]);
  }

  /** Etichetta + colore del verdetto per il riquadro storico. */
  protected verdictFor(c: ChallengeDoc): { label: string; tone: 'win' | 'lose' | 'draw' } | null {
    if (c.status !== 'completed' || typeof c.toScore !== 'number') return null;
    const me = this.myUid();
    if (!me) return null;
    const meScore = me === c.to ? c.toScore : c.fromScore;
    const them = me === c.to ? c.fromScore : c.toScore;
    const isIt = this.i18n.lang() === 'it';
    if (meScore > them) return { label: isIt ? 'Vinta' : 'Won', tone: 'win' };
    if (meScore < them) return { label: isIt ? 'Persa' : 'Lost', tone: 'lose' };
    return { label: isIt ? 'Pari' : 'Tie', tone: 'draw' };
  }

  /** Nickname dell'avversario in un doc challenge (lato mio = uid utente). */
  protected opponentOf(c: ChallengeDoc): string {
    return this.myUid() === c.to ? c.fromNickname : c.toNickname;
  }

  protected goBack(): void {
    this.router.navigate(['/home']);
  }
}
