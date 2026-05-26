import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { NicknameService } from '../../core/firebase/nickname.service';
import { FriendStatus, FriendsService } from '../../core/firebase/friends.service';
import { avatarById } from '../../core/data/avatars';
import { BadgeWithProgress, computeBadges } from '../../core/data/badges';
import { ScriptInfo, scriptById } from '../../core/data/scripts';
import { AppBar } from '../../shared/app-bar';
import { InfoSheet } from '../../shared/info-sheet';
import { AppState, DEFAULT_STATE } from '../../core/state/types';

/**
 * Profilo pubblico mostrato a `/u/:nickname`. Funziona sia per il proprio
 * profilo (mostra "tu" + tasto Condividi) sia per quello di altri utenti
 * (mostra CTA "Gioca anche tu"). Legge da Firestore via NicknameService;
 * niente real-time, una sola fetch all'ingresso (e su cambio param).
 */
@Component({
  selector: 'app-public-profile',
  imports: [AppBar, InfoSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-profile.html',
  styleUrl: './public-profile.css',
})
export class PublicProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly nicknames = inject(NicknameService);
  private readonly friends = inject(FriendsService);

  /** Param `:nickname` dalla rotta, in formato URL-encoded come arriva. */
  protected readonly nickname = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('nickname') ?? '')),
    { initialValue: '' },
  );

  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly profile = signal<PublicProfileData | null>(null);
  protected readonly copyFlash = signal(false);

  /** Stato amicizia con l'utente visualizzato. null = nessuna relazione. */
  protected readonly friendStatus = signal<FriendStatus | null>(null);
  /** Lock per evitare doppi-click sui bottoni amicizia. */
  protected readonly friendBusy = signal(false);

  /** Modale "come si calcolano i punti": tap sulla card Punti la apre. */
  protected readonly scoreInfoOpen = signal(false);
  protected readonly scoreInfoTitle = computed(() =>
    this.i18n.lang() === 'it' ? 'Come si calcolano i punti' : 'How points work',
  );
  protected readonly scoreInfoBody = computed(() =>
    this.i18n.lang() === 'it'
      ? 'Il punteggio in classifica si forma da due contributi: 1 punto per ogni risposta corretta data, piu\' 10 punti per ogni passo del migliore streak personale di sempre. Formula: corrette + (migliore streak × 10) = punti totali. Premia sia il volume sia i picchi di precisione.'
      : 'Leaderboard points come from two contributors: 1 point per correct answer, plus 10 points per step of personal best streak. Formula: correct + (best streak × 10) = total points. Rewards both volume and peak skill.',
  );

  protected openScoreInfo(): void {
    this.scoreInfoOpen.set(true);
  }
  protected closeScoreInfo(): void {
    this.scoreInfoOpen.set(false);
  }

  protected readonly isSelf = computed(() => {
    const p = this.profile();
    const me = this.appState.state().account?.uid;
    return !!(p && me && p.uid === me);
  });

  protected readonly profileUrl = computed(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname.replace(/\/u\/.*$/, '')}/u/${this.nickname()}`;
  });

  protected readonly avatarGlyph = computed(() => {
    return avatarById(this.profile()?.avatar ?? 0).glyph;
  });

  protected readonly joinedLabel = computed(() => {
    const ts = this.profile()?.joinedAt;
    if (!ts) return '';
    // Firestore Timestamp ha .toDate(); fallback a stringa ISO.
    let d: Date;
    if (typeof (ts as { toDate?: () => Date })?.toDate === 'function') {
      d = (ts as { toDate: () => Date }).toDate();
    } else if (typeof ts === 'string') {
      d = new Date(ts);
    } else {
      return '';
    }
    if (Number.isNaN(d.getTime())) return '';
    const locale = this.i18n.lang() === 'it' ? 'it-IT' : 'en-GB';
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  });

  constructor() {
    // Quando cambia il nickname nell'URL (o al primo entry) facciamo fetch.
    effect(() => {
      const n = this.nickname();
      if (!n) return;
      this.loading.set(true);
      this.notFound.set(false);
      this.profile.set(null);
      this.friendStatus.set(null);
      void this.fetch(n);
    });
  }

  private async fetch(nick: string): Promise<void> {
    try {
      const doc = await this.nicknames.getUserByNickname(nick);
      if (!doc) {
        this.notFound.set(true);
        return;
      }
      // Ricostruisce un AppState parziale per usare computeBadges sui dati cloud.
      const stateForBadges: AppState = {
        ...DEFAULT_STATE,
        streak: (doc as Record<string, number>)['streak'] ?? 0,
        bestStreak: (doc as Record<string, number>)['bestStreak'] ?? 0,
        played: (doc as Record<string, number>)['played'] ?? 0,
        correctAnswers: (doc as Record<string, number>)['correctAnswers'] ?? 0,
        accuracy: (doc as Record<string, number>)['accuracy'] ?? 0,
        perScript: (doc as Record<string, AppState['perScript']>)['perScript'] ?? {},
        dailyDone: (doc as Record<string, boolean>)['dailyDone'] ?? false,
        dailyDoneStamp: (doc as Record<string, string | null>)['dailyDoneStamp'] ?? null,
        dailyScore: (doc as Record<string, number>)['dailyScore'] ?? 0,
        dailyStreak: (doc as Record<string, number>)['dailyStreak'] ?? 0,
        dailyHistory: (doc as Record<string, AppState['dailyHistory']>)['dailyHistory'] ?? [],
      };
      const allBadges = computeBadges(stateForBadges);
      const unlockedBadges = allBadges.filter((b) => b.unlocked);
      // Stats per-scrittura calcolate dai perScript cloud, ordinate per
      // accuratezza desc (come nella propria pagina /profilo).
      const scriptStats = Object.entries(stateForBadges.perScript)
        .map(([id, v]) => ({
          id,
          tries: v.tries,
          correct: v.correct,
          acc: v.tries > 0 ? Math.round((100 * v.correct) / v.tries) : 0,
          script: scriptById(id),
        }))
        .filter((e): e is typeof e & { script: ScriptInfo } =>
          e.tries >= 1 && e.script != null,
        )
        .sort((a, b) => b.acc - a.acc);
      // Score composito: usa il campo persistito se c'e' (popolato da
      // UserDocService in #61), altrimenti calcolalo on-the-fly cosi' anche
      // i profili pre-deploy mostrano un numero coerente.
      const persistedScore = (doc as Record<string, number>)['score'];
      const computedScore =
        stateForBadges.correctAnswers + stateForBadges.bestStreak * 10;
      const score = typeof persistedScore === 'number' ? persistedScore : computedScore;

      this.profile.set({
        uid: doc.uid,
        nickname: (doc as Record<string, string>)['nickname'] ?? nick,
        avatar: (doc as Record<string, number>)['avatar'] ?? 0,
        joinedAt: doc['joinedAt'],
        score,
        bestStreak: stateForBadges.bestStreak,
        accuracy: stateForBadges.accuracy,
        played: stateForBadges.played,
        dailyStreak: stateForBadges.dailyStreak,
        unlockedBadges,
        totalBadges: allBadges.length,
        scriptStats,
      });
      // Stato amicizia: read separata (non bloccante per il render).
      if (this.appState.state().account && doc.uid !== this.appState.state().account?.uid) {
        try {
          const status = await this.friends.statusWith(doc.uid);
          this.friendStatus.set(status);
        } catch (e) {
          console.warn('[public-profile] friend status error:', e);
        }
      }
    } catch (e) {
      console.warn('[public-profile] fetch error:', e);
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Azione "Aggiungi amico": manda richiesta. Aggiorna lo stato locale a
   *  'pending-sent' senza ricaricare l'intera pagina. */
  protected async addFriend(): Promise<void> {
    const p = this.profile();
    const myNick = this.appState.state().account?.nickname;
    if (!p || !myNick || this.friendBusy()) return;
    this.friendBusy.set(true);
    try {
      const r = await this.friends.sendRequest(p.uid, p.nickname, myNick);
      if (r === 'sent') this.friendStatus.set('pending-sent');
    } catch (e) {
      console.warn('[public-profile] addFriend error:', e);
    } finally {
      this.friendBusy.set(false);
    }
  }

  /** Annulla richiesta inviata (rimuove la pending). */
  protected async cancelRequest(): Promise<void> {
    const p = this.profile();
    if (!p || this.friendBusy()) return;
    this.friendBusy.set(true);
    try {
      await this.friends.remove(p.uid);
      this.friendStatus.set(null);
    } catch (e) {
      console.warn('[public-profile] cancelRequest error:', e);
    } finally {
      this.friendBusy.set(false);
    }
  }

  /** Accetta richiesta in arrivo (l'altro mi ha invitato, sono sul suo profilo). */
  protected async acceptRequest(): Promise<void> {
    const p = this.profile();
    if (!p || this.friendBusy()) return;
    this.friendBusy.set(true);
    try {
      await this.friends.accept(p.uid);
      this.friendStatus.set('accepted');
    } catch (e) {
      console.warn('[public-profile] acceptRequest error:', e);
    } finally {
      this.friendBusy.set(false);
    }
  }

  /** Rimuove l'amicizia (gia' accettata). */
  protected async removeFriend(): Promise<void> {
    const p = this.profile();
    if (!p || this.friendBusy()) return;
    if (typeof window !== 'undefined') {
      const msg =
        this.i18n.lang() === 'it'
          ? 'Vuoi rimuovere ' + p.nickname + ' dagli amici?'
          : 'Remove ' + p.nickname + ' from friends?';
      if (!window.confirm(msg)) return;
    }
    this.friendBusy.set(true);
    try {
      await this.friends.remove(p.uid);
      this.friendStatus.set(null);
    } catch (e) {
      console.warn('[public-profile] removeFriend error:', e);
    } finally {
      this.friendBusy.set(false);
    }
  }

  protected async share(): Promise<void> {
    const url = this.profileUrl();
    const p = this.profile();
    if (!url || !p) return;
    const text =
      this.i18n.lang() === 'it'
        ? `${p.nickname} su Indovina il carattere`
        : `${p.nickname} on Guess the Char`;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ url, text });
        return;
      }
    } catch {
      // Utente ha annullato lo share sheet: ignoriamo silenziosamente.
    }
    // Fallback: copia negli appunti.
    try {
      await navigator.clipboard.writeText(url);
      this.copyFlash.set(true);
      setTimeout(() => this.copyFlash.set(false), 1600);
    } catch {
      // ignore
    }
  }

  protected goPlay(): void {
    this.router.navigate(['/home']);
  }

  protected accLevel(pct: number): 'good' | 'mid' | 'bad' {
    if (pct >= 75) return 'good';
    if (pct >= 40) return 'mid';
    return 'bad';
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}

interface PublicProfileData {
  uid: string;
  nickname: string;
  avatar: number;
  joinedAt: unknown;
  /** Score composito (correctAnswers + bestStreak*10). Stesso che usa la
   *  classifica alltime; mostrato qui come "Punti" senza breakdown. */
  score: number;
  bestStreak: number;
  accuracy: number;
  played: number;
  dailyStreak: number;
  unlockedBadges: BadgeWithProgress[];
  totalBadges: number;
  scriptStats: Array<{
    id: string;
    tries: number;
    correct: number;
    acc: number;
    script: ScriptInfo;
  }>;
}
