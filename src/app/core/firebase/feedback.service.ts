import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from 'firebase/firestore/lite';
import { ensureFirebaseApp } from './firebase';
import { AuthService } from './auth.service';
import { AppStateService } from '../state/app-state.service';
import { APP_VERSION } from '../build-info';

/**
 * Invia feedback (bug o idea) alla collezione Firestore `/feedback`. Le regole
 * permettono create da chiunque (anche anonimi) ma con vincoli su shape e
 * lunghezza dei campi; read/update/delete sono bloccati (leggi dalla Firebase
 * Console).
 *
 * Rate limit lato client (localStorage `gtc.feedback.history`): massimo 3
 * submission nelle ultime 24 ore. Honor system: chi vuole spammare puo'
 * azzerare il localStorage, ma raise la barriera ai casual abuse.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly auth = inject(AuthService);
  private readonly appState = inject(AppStateService);
  private readonly db: Firestore | null;

  private readonly RATE_LIMIT = 3;
  private readonly RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
  private readonly STORAGE_KEY = 'gtc.feedback.history';

  constructor() {
    const app = ensureFirebaseApp();
    this.db = app ? getFirestore(app) : null;
  }

  /** Quante submission restano nelle ultime 24h prima del rate limit. */
  remainingSubmissions(): number {
    const sent = this.recentSubmissions();
    return Math.max(0, this.RATE_LIMIT - sent.length);
  }

  /**
   * Invia un feedback. Ritorna 'ok' se va a buon fine, 'rate-limited' se
   * l'utente ha gia' inviato il massimo nelle ultime 24h. Errori di rete o
   * regole Firestore vengono lanciati.
   */
  async submit(input: FeedbackInput): Promise<'ok' | 'rate-limited'> {
    if (!this.db) throw new Error('Firebase not configured');
    if (this.remainingSubmissions() <= 0) return 'rate-limited';

    const u = this.auth.user();
    const account = this.appState.state().account;
    const ref = collection(this.db, 'feedback');
    await addDoc(ref, {
      uid: u && u !== 'loading' ? u.uid : null,
      email: input.email?.trim() || account?.email || null,
      kind: input.kind,
      title: input.title.trim(),
      body: input.body.trim(),
      meta: {
        appVersion: APP_VERSION,
        lang: input.lang,
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
        played: this.appState.state().played,
        streak: this.appState.state().streak,
      },
      createdAt: serverTimestamp(),
    });
    this.recordSubmission();
    return 'ok';
  }

  /** Timestamps delle submission negli ultimi RATE_WINDOW_MS. */
  private recentSubmissions(): number[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return [];
      const cutoff = Date.now() - this.RATE_WINDOW_MS;
      return arr.filter((t): t is number => typeof t === 'number' && t >= cutoff);
    } catch {
      return [];
    }
  }

  private recordSubmission(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const recent = this.recentSubmissions();
      recent.push(Date.now());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // ignore
    }
  }
}

export interface FeedbackInput {
  kind: 'bug' | 'idea';
  title: string;
  body: string;
  email?: string;
  lang: 'it' | 'en';
}
