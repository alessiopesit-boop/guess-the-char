import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { AuthService } from '../../core/firebase/auth.service';
import { NicknameService } from '../../core/firebase/nickname.service';
import { AVATARS, avatarById } from '../../core/data/avatars';
import { scriptById } from '../../core/data/scripts';
import { computeBadges } from '../../core/data/badges';
import { AppBar } from '../../shared/app-bar';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { Icon } from '../../shared/icon';
import { InfoSheet } from '../../shared/info-sheet';

@Component({
  selector: 'app-profile',
  imports: [AppBar, ConfirmDialog, Icon, InfoSheet, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly authSvc = inject(AuthService);
  private readonly nicknames = inject(NicknameService);

  protected readonly state = this.appState.state;
  protected readonly avatars = AVATARS;

  protected readonly account = computed(() => this.state().account);
  protected readonly currentAvatar = computed(() => avatarById(this.account()?.avatar));

  /** Editor inline del nickname: input + tasto OK. */
  protected readonly editingNick = signal(false);
  protected readonly nickDraft = signal('');
  /** Stato del salvataggio nickname: 'idle' | 'saving' | 'taken'. */
  protected readonly nickStatus = signal<'idle' | 'saving' | 'taken'>('idle');

  /** Modale di scelta avatar. `pendingAvatar` tiene la selezione provvisoria
   *  mentre la modale e' aperta: l'utente puo' cliccare avatar diversi per
   *  vedere come si vedono, poi conferma con Salva o annulla con X. */
  protected readonly pickingAvatar = signal(false);
  protected readonly pendingAvatar = signal<number | null>(null);

  /** Dialog di conferma logout. */
  protected readonly signOutDialog = signal(false);

  /** Modale che spiega come si calcola il punteggio (tap sulla card Punti). */
  protected readonly scoreInfoOpen = signal(false);

  protected readonly scoreInfoTitle = computed(() =>
    this.i18n.lang() === 'it' ? 'Come si calcolano i punti' : 'How points work',
  );
  protected readonly scoreInfoBody = computed(() =>
    this.i18n.lang() === 'it'
      ? 'Il tuo punteggio in classifica si forma da due contributi: 1 punto per ogni risposta corretta che hai dato, piu\' 10 punti per ogni passo del tuo migliore streak personale di sempre. Formula: corrette + (migliore streak × 10) = punti totali. Cosi\' premia sia chi gioca tanto sia chi ha picchi di precisione.'
      : 'Your leaderboard points come from two contributors: 1 point per correct answer you gave, plus 10 points for each step of your personal best streak. Formula: correct + (best streak × 10) = total points. This rewards both volume and your peak skill.',
  );

  /** Per-scrittura, ordinate dalla migliore alla peggiore accuratezza. */
  protected readonly scriptStats = computed(() => {
    const entries = Object.entries(this.state().perScript ?? {})
      .map(([id, v]) => ({
        id,
        tries: v.tries,
        correct: v.correct,
        acc: v.tries > 0 ? Math.round((100 * v.correct) / v.tries) : 0,
        script: scriptById(id),
      }))
      .filter((e) => e.tries >= 1 && e.script);
    return entries.sort((a, b) => b.acc - a.acc);
  });

  /** Conteggio badge + preview per la teaser (stesso pattern della home). */
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

  /** Punteggio composito: corrette + bestStreak * 10. Stesso che usa la
   *  classifica alltime. Esposto qui in profilo come "Punti totali" con il
   *  breakdown della formula, cosi' l'utente capisce a colpo d'occhio cosa
   *  contribuisce al suo posizionamento. */
  protected readonly scoreBreakdown = computed(() => {
    const s = this.state();
    const fromCorrect = s.correctAnswers;
    const fromStreak = s.bestStreak * 10;
    return {
      total: fromCorrect + fromStreak,
      correct: fromCorrect,
      bestStreak: s.bestStreak,
      streakBonus: fromStreak,
    };
  });

  /** Storico daily (max 14 piu' recenti, in ordine cronologico inverso). */
  protected readonly dailyHistory = computed(() => {
    const list = this.state().dailyHistory ?? [];
    return [...list].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14);
  });

  /** "Iscritto da MMMM YYYY" (anche per anon viene "" se manca lo stamp). */
  protected readonly joinedLabel = computed(() => {
    const stamp = this.account()?.joinedStamp;
    if (!stamp) return '';
    const d = new Date(stamp);
    if (Number.isNaN(d.getTime())) return '';
    const locale = this.i18n.lang() === 'it' ? 'it-IT' : 'en-GB';
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  });

  protected startEditNick(): void {
    const a = this.account();
    if (!a) return;
    this.nickDraft.set(a.nickname);
    this.nickStatus.set('idle');
    this.editingNick.set(true);
  }

  /** Salva il nuovo nickname: lo claima atomicamente su Firestore via
   *  NicknameService. Se gia' preso, mostra "taken" come stato e l'utente puo'
   *  cambiarne uno diverso senza chiudere l'editor. */
  protected async saveNick(): Promise<void> {
    const v = this.nickDraft().trim();
    const a = this.account();
    if (!a || v.length < 2 || v.length > 24) return;
    if (v === a.nickname) {
      this.editingNick.set(false);
      return;
    }
    this.nickStatus.set('saving');
    try {
      const r = await this.nicknames.change(a.nickname, v, a.uid);
      if (r === 'taken') {
        this.nickStatus.set('taken');
        return;
      }
      // OK: la transazione ha gia' aggiornato /users/{uid}.nickname su cloud.
      // Aggiorniamo anche lo stato locale per la UI immediata.
      this.appState.updateAccount({ nickname: v });
      this.nickStatus.set('idle');
      this.editingNick.set(false);
    } catch (e) {
      console.warn('[nickname] change error:', e);
      this.nickStatus.set('idle');
    }
  }

  protected cancelEditNick(): void {
    this.editingNick.set(false);
    this.nickStatus.set('idle');
  }

  /** Quando l'utente edita il draft dopo un "taken", torniamo a 'idle' per
   *  rimuovere il messaggio d'errore e permettere un nuovo salva. */
  protected setNickDraft(v: string): void {
    this.nickDraft.set(v);
    if (this.nickStatus() === 'taken') this.nickStatus.set('idle');
  }

  protected openAvatarPicker(): void {
    if (!this.account()) return;
    this.pendingAvatar.set(this.account()?.avatar ?? 0);
    this.pickingAvatar.set(true);
  }

  protected closeAvatarPicker(): void {
    this.pickingAvatar.set(false);
    this.pendingAvatar.set(null);
  }

  /** Seleziona un avatar nella modale (solo provvisorio: non scrive ancora). */
  protected pickAvatar(id: number): void {
    this.pendingAvatar.set(id);
  }

  /** Conferma la scelta: scrive in state.account, l'auto-sync (UserDocService
   *  in PR #49) propaga a Firestore in automatico. */
  protected saveAvatar(): void {
    const id = this.pendingAvatar();
    if (id == null) return;
    this.appState.updateAccount({ avatar: id });
    this.closeAvatarPicker();
  }

  protected accLevel(pct: number): 'good' | 'mid' | 'bad' {
    if (pct >= 75) return 'good';
    if (pct >= 40) return 'mid';
    return 'bad';
  }

  /** Mappa il punteggio della daily (0-5) a un colore semantico per la card. */
  protected daySquareColor(score: number): 'gold' | 'green' | 'warm' | 'dim' {
    if (score >= 5) return 'gold';
    if (score >= 4) return 'green';
    if (score >= 3) return 'warm';
    return 'dim';
  }

  /** Formato compatto giorno: "12 mag". */
  protected formatDay(day: string): string {
    const d = new Date(day);
    if (Number.isNaN(d.getTime())) return day;
    return d.toLocaleDateString(this.i18n.lang() === 'it' ? 'it-IT' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    });
  }

  protected openScript(id: string): void {
    this.router.navigate(['/script', id]);
  }

  protected goBadges(): void {
    this.router.navigate(['/badges']);
  }

  protected goLogin(): void {
    this.router.navigate(['/login']);
  }

  protected goLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }

  protected goPublicProfile(): void {
    const nick = this.account()?.nickname;
    if (!nick) return;
    this.router.navigate(['/u', nick]);
  }

  protected openScoreInfo(): void {
    this.scoreInfoOpen.set(true);
  }
  protected closeScoreInfo(): void {
    this.scoreInfoOpen.set(false);
  }

  protected askSignOut(): void {
    this.signOutDialog.set(true);
  }
  protected cancelSignOut(): void {
    this.signOutDialog.set(false);
  }
  protected async confirmSignOut(): Promise<void> {
    this.signOutDialog.set(false);
    try {
      await this.authSvc.signOut();
    } catch {
      // sessione locale viene rimossa comunque
    }
    this.router.navigate(['/home']);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    if (this.editingNick()) this.cancelEditNick();
    else if (this.pickingAvatar()) this.closeAvatarPicker();
    else if (this.signOutDialog()) this.cancelSignOut();
    else if (this.scoreInfoOpen()) this.closeScoreInfo();
  }
}
