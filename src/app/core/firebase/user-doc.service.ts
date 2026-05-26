import { Injectable, effect, inject, untracked } from '@angular/core';
import { User } from 'firebase/auth';
// Usiamo la build "lite" di Firestore (firebase/firestore/lite): supporta
// getDoc/setDoc/doc/serverTimestamp ma non onSnapshot ne' persistenza offline,
// ed e' molto piu' leggera dell'SDK completo. Ci basta perche' il sync e'
// lazy (solo al login + debounced writes).
import {
  Firestore,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore/lite';
import { ensureFirebaseApp } from './firebase';
import { AuthService } from './auth.service';
import { NicknameService } from './nickname.service';
import { AppStateService } from '../state/app-state.service';
import { AppState, DailyHistoryEntry, PerScriptStat } from '../state/types';

/**
 * Sincronizza lo stato di gioco con Firestore quando l'utente e' loggato.
 *
 * - All'auth.user che diventa autenticato: legge /users/{uid}, fa max-merge
 *   coi contatori cumulativi locali, salva lo stato mergiato sia in locale che
 *   in cloud.
 * - Mentre l'utente e' loggato: scrive in cloud ad ogni cambio di state, con
 *   debounce di 1 secondo (per non spammare Firestore su sequenze di update
 *   rapide tipo "20 risposte di fila in 60 secondi").
 * - Al logout: smette di scrivere. Lo stato locale resta com'e' per il
 *   prossimo utente anonimo che vuole giocare offline.
 *
 * Le preferenze UI (accent, motion, colorblind, sound, haptics, showCodepoint,
 * selected scripts, hintsLeft, shownFirstWrong, onboarded) NON vengono
 * sincronizzate: sono scelte per-dispositivo. Su un nuovo telefono ti ritrovi
 * i progressi, ma puoi mettere accent diverso senza che si propaghi.
 */
@Injectable({ providedIn: 'root' })
export class UserDocService {
  private readonly auth = inject(AuthService);
  private readonly appState = inject(AppStateService);
  private readonly nicknames = inject(NicknameService);
  private readonly db: Firestore | null;

  /** Uid della sessione attualmente in sync. Quando cambia (login / logout)
   *  riarmiamo le scritture e annulliamo i debounce precedenti. */
  private currentUid: string | null = null;
  /** True mentre stiamo applicando il merge iniziale dal cloud sul locale.
   *  Necessario per evitare che il push debounced rimandi al cloud lo stesso
   *  valore appena ricevuto. */
  private applyingMerge = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const app = ensureFirebaseApp();
    this.db = app ? getFirestore(app) : null;
    if (!this.db) return;

    // Reagisce ai cambi di auth.user: al login fa il merge iniziale, al logout
    // ferma il timer di push. Il merge e' sincrono in effetto (apre la richiesta
    // di rete ma non blocca l'effect): durante il fetch da Firestore lo stato
    // locale resta usabile come sempre.
    effect(() => {
      const u = this.auth.user();
      if (u === 'loading') return;
      if (!u) {
        this.currentUid = null;
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        return;
      }
      if (this.currentUid !== u.uid) {
        this.currentUid = u.uid;
        // Fire-and-forget: errori loggati ma non bloccano l'app.
        void this.onLogin(u);
      }
    });

    // Reagisce ai cambi di state mentre c'e' un utente loggato. La lettura di
    // auth.user e' untracked: l'effect deve dipendere SOLO dallo state, non
    // dall'auth (che viene gestito dall'altro effect sopra).
    effect(() => {
      const s = this.appState.state();
      const u = untracked(() => this.auth.user());
      if (!u || u === 'loading') return;
      if (this.applyingMerge) return;
      this.schedulePush(u.uid, s);
    });
  }

  /** Merge iniziale tra cloud e locale. Crea il documento se non esiste. */
  private async onLogin(user: User): Promise<void> {
    if (!this.db) return;
    const ref = doc(this.db, 'users', user.uid);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        // Primo accesso assoluto per questo account: cloud non sa niente,
        // scriviamo lo stato locale corrente come "punto zero". Prima pero'
        // claimiamo un nickname libero: il seed e' quello tentativo gia'
        // settato da AppStateService (displayName Google o email-prefix);
        // se occupato, findAvailable trova alessio.pes2, ...3, o un suffix
        // random.
        const local = this.appState.state();
        const seed = local.account?.nickname ?? user.displayName ?? 'lettore';
        let claimedNick = seed;
        try {
          claimedNick = await this.nicknames.findAvailable(seed, user.uid);
        } catch (e) {
          console.warn('[firestore] nickname claim failed, using seed as-is:', e);
        }
        if (claimedNick !== local.account?.nickname) {
          // Aggiorna lo stato locale prima di scrivere su /users, cosi' i due
          // resteranno consistenti.
          this.applyingMerge = true;
          try {
            this.appState.updateAccount({ nickname: claimedNick });
          } finally {
            queueMicrotask(() => {
              this.applyingMerge = false;
            });
          }
        }
        const updatedLocal = {
          ...local,
          account: local.account ? { ...local.account, nickname: claimedNick } : local.account,
        };
        await setDoc(
          ref,
          {
            ...toCloudShape(updatedLocal, user),
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        return;
      }
      // Documento esistente: max-merge per i contatori, "cloud vince" per
      // nickname e avatar (l'utente potrebbe averli editati su un altro
      // dispositivo). Applichiamo il risultato sul locale.
      const cloud = snap.data() as CloudUserDoc;
      const local = this.appState.state();
      const merged = mergeStates(local, cloud);
      this.applyingMerge = true;
      try {
        this.appState.patch(() => merged);
      } finally {
        // L'applyingMerge resta true finche' il microtask termina cosi'
        // l'effect di push non si attiva sulla scrittura derivante dal merge.
        queueMicrotask(() => {
          this.applyingMerge = false;
        });
      }
      // Riallinea il cloud allo stato mergiato (cosi' il cloud accumula i
      // progressi accumulati offline su questo dispositivo).
      await setDoc(
        ref,
        { ...toCloudShape(merged, user), updatedAt: serverTimestamp() },
        { merge: true },
      );
      // Migrazione utenti legacy: alcuni account creati prima che la
      // collezione /nicknames esistesse (o per cui il claim e' fallito
      // silenziosamente all'epoca) hanno una entry in /users ma niente in
      // /nicknames. Senza entry, search e profilo pubblico non li trovano.
      // findAvailable e' idempotente: se gia' possiedi il nickname, no-op;
      // se non esiste, lo claim ora; se qualcun altro lo ha rubato nel
      // frattempo, ti assegna una variante (es. nick2). In quest'ultimo caso
      // aggiorniamo state.account.nickname per restare consistenti.
      try {
        const currentNick = merged.account?.nickname ?? user.displayName ?? '';
        if (currentNick) {
          const owned = await this.nicknames.findAvailable(currentNick, user.uid);
          if (owned !== currentNick) {
            // Era stato preso da qualcun altro; passiamo alla variante.
            this.applyingMerge = true;
            try {
              this.appState.updateAccount({ nickname: owned });
            } finally {
              queueMicrotask(() => {
                this.applyingMerge = false;
              });
            }
            await setDoc(
              ref,
              { nickname: owned, updatedAt: serverTimestamp() },
              { merge: true },
            );
          }
        }
      } catch (e) {
        console.warn('[firestore] legacy nickname claim failed:', e);
      }
    } catch (e) {
      console.warn('[firestore] sync merge error:', e);
    }
  }

  private schedulePush(uid: string, state: AppState): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.pushNow(uid, state);
    }, 1000);
  }

  private async pushNow(uid: string, state: AppState): Promise<void> {
    if (!this.db) return;
    try {
      const ref = doc(this.db, 'users', uid);
      // Fittiamo solo i campi che ci interessano sincronizzare. Niente
      // preferenze UI: restano locali per device.
      const u = this.auth.user();
      const userOrNull = u && u !== 'loading' ? u : null;
      await setDoc(
        ref,
        { ...toCloudShape(state, userOrNull), updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (e) {
      console.warn('[firestore] push error:', e);
    }
  }
}

/** Shape di /users/{uid} in Firestore. Solo i campi del game state cross-device. */
interface CloudUserDoc {
  nickname: string;
  avatar: number;
  email: string;
  provider: string;
  joinedAt?: unknown;
  streak: number;
  bestStreak: number;
  played: number;
  correctAnswers: number;
  accuracy: number;
  /** Score composito per la classifica alltime: correctAnswers + bestStreak*10.
   *  Premia sia il volume sia il picco di bravura. Calcolato lato client e
   *  scritto qui per poterci fare orderBy() direttamente. */
  score: number;
  perScript: Record<string, PerScriptStat>;
  dailyDone: boolean;
  dailyDoneStamp: string | null;
  dailyScore: number;
  dailyStreak: number;
  dailyHistory: DailyHistoryEntry[];
  updatedAt?: unknown;
}

function toCloudShape(s: AppState, user: User | null): Omit<CloudUserDoc, 'joinedAt' | 'updatedAt'> {
  const account = s.account;
  return {
    nickname: account?.nickname ?? user?.displayName ?? 'lettore',
    avatar: account?.avatar ?? 0,
    email: account?.email ?? user?.email ?? '',
    provider: account?.provider ?? 'password',
    streak: s.streak,
    bestStreak: s.bestStreak,
    played: s.played,
    correctAnswers: s.correctAnswers,
    accuracy: s.accuracy,
    // Score composito per leaderboard alltime: 1 punto per ogni corretta, 10
    // punti bonus per ogni step del miglior streak personale.
    score: s.correctAnswers + s.bestStreak * 10,
    perScript: s.perScript,
    dailyDone: s.dailyDone,
    dailyDoneStamp: s.dailyDoneStamp,
    dailyScore: s.dailyScore,
    dailyStreak: s.dailyStreak,
    dailyHistory: s.dailyHistory,
  };
}

/**
 * Merge locale + cloud all'auth iniziale:
 *  - Contatori cumulativi (played, correctAnswers, bestStreak, dailyStreak):
 *    max() tra i due lati. Cosi' se hai giocato su due telefoni offline
 *    accumuli i progressi senza perderli.
 *  - streak corrente: scegliamo il maggiore (non avendo timestamp affidabili,
 *    e' una conservativa overestimate, ma non genera bug visibili).
 *  - accuracy: ricalcoliamo da played + correctAnswers mergiati.
 *  - perScript: per ogni scrittura, max(tries, correct) tra cloud e locale.
 *  - dailyDone/dailyDoneStamp/dailyScore: cloud vince se ha uno stamp piu'
 *    recente (giornaliera e' un evento globale).
 *  - dailyHistory: unione per `day` (preferisce l'entry con score piu' alto
 *    se duplicata).
 *  - nickname/avatar: cloud vince (sono scelte esplicite dell'utente).
 */
function mergeStates(local: AppState, cloud: CloudUserDoc): AppState {
  const merged: AppState = {
    ...local,
    // Account: applichiamo cloud su locale (nickname/avatar scelti dall'utente
    // su un altro device hanno priorita').
    account: local.account
      ? {
          ...local.account,
          nickname: cloud.nickname || local.account.nickname,
          avatar: cloud.avatar ?? local.account.avatar,
        }
      : local.account,
    // Contatori cumulativi: max-merge.
    streak: Math.max(local.streak, cloud.streak ?? 0),
    bestStreak: Math.max(local.bestStreak, cloud.bestStreak ?? 0),
    played: Math.max(local.played, cloud.played ?? 0),
    correctAnswers: Math.max(local.correctAnswers, cloud.correctAnswers ?? 0),
    perScript: mergePerScript(local.perScript, cloud.perScript ?? {}),
    // Daily: cloud "vince" se ha lo stesso giorno o uno piu' recente.
    ...mergeDaily(local, cloud),
    dailyStreak: Math.max(local.dailyStreak, cloud.dailyStreak ?? 0),
    dailyHistory: mergeDailyHistory(local.dailyHistory, cloud.dailyHistory ?? []),
  };
  // Ricalcola accuracy dai merged.
  merged.accuracy = merged.played > 0
    ? Math.round((merged.correctAnswers / merged.played) * 100)
    : 0;
  return merged;
}

function mergePerScript(
  local: Record<string, PerScriptStat>,
  cloud: Record<string, PerScriptStat>,
): Record<string, PerScriptStat> {
  const out: Record<string, PerScriptStat> = { ...local };
  for (const [id, c] of Object.entries(cloud)) {
    const l = out[id];
    if (!l) {
      out[id] = c;
    } else {
      out[id] = {
        tries: Math.max(l.tries, c.tries),
        correct: Math.max(l.correct, c.correct),
      };
    }
  }
  return out;
}

function mergeDaily(
  local: AppState,
  cloud: CloudUserDoc,
): Pick<AppState, 'dailyDone' | 'dailyDoneStamp' | 'dailyScore'> {
  // Se cloud ha uno stamp di "oggi" e local no, prendiamo cloud (l'utente ha
  // fatto la daily da un altro device). Se entrambi hanno stamps differenti
  // (oggi vs ieri o altro), prevale il piu' recente.
  const lStamp = local.dailyDoneStamp;
  const cStamp = cloud.dailyDoneStamp ?? null;
  if (!cStamp) return { dailyDone: local.dailyDone, dailyDoneStamp: lStamp, dailyScore: local.dailyScore };
  if (!lStamp) {
    return {
      dailyDone: cloud.dailyDone ?? false,
      dailyDoneStamp: cStamp,
      dailyScore: cloud.dailyScore ?? 0,
    };
  }
  // Entrambi presenti: prendiamo quello con stamp lessicograficamente maggiore
  // (le stamp sono toDateString() o ISO, in genere sortabili come stringa).
  if (cStamp > lStamp) {
    return {
      dailyDone: cloud.dailyDone ?? false,
      dailyDoneStamp: cStamp,
      dailyScore: cloud.dailyScore ?? 0,
    };
  }
  if (lStamp === cStamp) {
    return {
      dailyDone: local.dailyDone || (cloud.dailyDone ?? false),
      dailyDoneStamp: lStamp,
      dailyScore: Math.max(local.dailyScore, cloud.dailyScore ?? 0),
    };
  }
  return { dailyDone: local.dailyDone, dailyDoneStamp: lStamp, dailyScore: local.dailyScore };
}

function mergeDailyHistory(
  local: DailyHistoryEntry[],
  cloud: DailyHistoryEntry[],
): DailyHistoryEntry[] {
  const byDay = new Map<string, DailyHistoryEntry>();
  for (const e of local) byDay.set(e.day, e);
  for (const e of cloud) {
    const existing = byDay.get(e.day);
    if (!existing || e.score > existing.score) {
      byDay.set(e.day, e);
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}
