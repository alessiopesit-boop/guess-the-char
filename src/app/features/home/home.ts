import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { AuthService } from '../../core/firebase/auth.service';
import { FriendsService } from '../../core/firebase/friends.service';
import { ChallengesService } from '../../core/firebase/challenges.service';
import { ALL_SCRIPT_IDS } from '../../core/data/scripts';
import { buildQuestion, mulberry32, seedFromDate } from '../../core/data/quiz';
import { computeBadges } from '../../core/data/badges';
import { AppBar } from '../../shared/app-bar';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { Icon } from '../../shared/icon';
import { InfoSheet } from '../../shared/info-sheet';
import { LangSwitch } from '../../shared/lang-switch';
import { APP_VERSION, BUILD_CONTEXT, BUILD_SHA } from '../../core/build-info';

type InfoKind = 'streak' | 'accuracy' | 'played' | 'dailyStreak';

@Component({
  selector: 'app-home',
  imports: [AppBar, ConfirmDialog, Icon, InfoSheet, LangSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly authSvc = inject(AuthService);
  private readonly friendsSvc = inject(FriendsService);
  private readonly challengesSvc = inject(ChallengesService);

  protected readonly state = this.appState.state;

  /** Numero di richieste amicizia in arrivo, mostrato come pillino nel menu
   *  account. Refetchato lazy: ogni volta che la home si carica (componente
   *  ricreato dal router) e ad ogni cambio di uid dell'account loggato. */
  protected readonly pendingFriendRequests = signal(0);

  /** Numero di sfide in arrivo pending, badge nel menu account. */
  protected readonly pendingChallenges = signal(0);

  private readonly _refreshFriendsOnAuth = effect(() => {
    const uid = this.state().account?.uid ?? null;
    if (uid) {
      void this.refreshFriendRequests();
      void this.refreshPendingChallenges();
    } else {
      this.pendingFriendRequests.set(0);
      this.pendingChallenges.set(0);
    }
  });

  /** Apertura del menu account (popover sotto l'icona in alto a destra). */
  protected readonly accountMenuOpen = signal(false);

  /** Dialog di conferma logout: aperto dopo aver cliccato "Esci" nel menu,
   *  evita disconnessioni accidentali. */
  protected readonly signOutDialog = signal(false);

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
    const unlocked = list.filter((b) => b.unlocked);
    const locked = list
      .filter((b) => !b.unlocked)
      .sort((a, b) => b.progress - a.progress);
    const preview = [
      ...unlocked.slice(0, 2),
      ...locked.slice(0, 4 - Math.min(unlocked.length, 2)),
    ].slice(0, 4);
    const nextLocked = locked[0] ?? null;
    return { total: list.length, unlocked: unlocked.length, preview, nextLocked };
  });

  protected nextLockedTitle(): string {
    const next = this.badgeStats().nextLocked;
    if (!next) return '';
    return this.i18n.lang() === 'en' ? next.titleEn : next.titleIt;
  }

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

  protected goSearch(): void {
    this.router.navigate(['/search']);
  }

  protected goFriends(): void {
    this.router.navigate(['/friends']);
  }

  protected goChallenges(): void {
    this.router.navigate(['/sfide']);
  }

  /** Conteggio sfide pending in arrivo. Letto lazy, come pendingFriendRequests. */
  protected async refreshPendingChallenges(): Promise<void> {
    if (!this.state().account) {
      this.pendingChallenges.set(0);
      return;
    }
    try {
      const n = await this.challengesSvc.countPendingIncoming();
      this.pendingChallenges.set(n);
    } catch {
      // ignore
    }
  }

  /** Rileggi il conteggio richieste in arrivo. Chiamata all'apertura della
   *  home (via effect) e quando si torna sulla home (la component si ricrea
   *  con router OnPush). */
  protected async refreshFriendRequests(): Promise<void> {
    if (!this.state().account) {
      this.pendingFriendRequests.set(0);
      return;
    }
    try {
      const list = await this.friendsSvc.listIncomingRequests();
      this.pendingFriendRequests.set(list.length);
    } catch {
      // ignore: il badge resta com'era
    }
  }

  /** Toggle del popover account; chiude se aperto, apre se chiuso. Lo
   *  stopPropagation evita che il click-outside listener lo richiuda subito. */
  protected toggleAccountMenu(e: Event): void {
    e.stopPropagation();
    this.accountMenuOpen.update((v) => !v);
  }

  protected closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  /** Apre il dialog di conferma logout. Chiude il menu in modo che la modale
   *  resti l'unico elemento in primo piano. */
  protected askSignOut(): void {
    this.closeAccountMenu();
    this.signOutDialog.set(true);
  }

  protected cancelSignOut(): void {
    this.signOutDialog.set(false);
  }

  /** Conferma logout: Firebase signOut, l'effect in AppStateService azzera
   *  state.account in automatico. Restiamo sulla home con la modale chiusa. */
  protected async confirmSignOut(): Promise<void> {
    this.signOutDialog.set(false);
    try {
      await this.authSvc.signOut();
    } catch {
      // Fallimenti rari (es. rete offline durante la revoca): sessione locale
      // viene comunque rimossa.
    }
  }

  /** Click ovunque sul documento chiude il popover. Il bottone trigger ha
   *  stopPropagation quindi non si auto-richiude. */
  @HostListener('document:click')
  protected onDocClick(): void {
    if (this.accountMenuOpen()) this.closeAccountMenu();
  }

  /** Escape chiude il popover (accessibilita'). */
  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    if (this.accountMenuOpen()) this.closeAccountMenu();
  }
}
