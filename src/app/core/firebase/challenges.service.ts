import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore/lite';
import { ensureFirebaseApp } from './firebase';
import { AppStateService } from '../state/app-state.service';
import { ALL_SCRIPT_IDS, scriptById } from '../data/scripts';

export type ChallengeStatus = 'pending' | 'completed';

/**
 * Una "domanda" pre-generata della sfida: il glifo e' fissato al momento della
 * creazione (entrambi i giocatori vedono lo stesso), idem le 4 opzioni e la
 * risposta corretta. Cosi' la sfida e' deterministica per entrambi e non
 * dipende dalla pool selezionata dei singoli giocatori.
 */
export interface ChallengeQuestion {
  glyph: string;
  cp: string;
  correctId: string;
  options: string[];
}

export interface ChallengeDoc {
  id: string;
  from: string;
  fromNickname: string;
  to: string;
  toNickname: string;
  questions: ChallengeQuestion[];
  fromScore: number;
  toScore: number | null;
  status: ChallengeStatus;
  createdAt: unknown;
  completedAt: unknown;
}

export interface ChallengeStats {
  won: number;
  lost: number;
  draw: number;
  total: number;
}

const TOTAL_Q = 5;

/**
 * Gestione sfide tra amici nella collezione `/challenges`. Una sfida ha sempre:
 *  - un creatore (`from`) che gioca per primo e setta `fromScore`
 *  - un destinatario (`to`) che la riceve e quando la apre setta `toScore`
 *  - 5 domande pre-generate al momento della creazione cosi' entrambi giocano
 *    la stessa identica sequenza
 *
 * Le regole Firestore consentono read/write solo alle due parti coinvolte.
 */
@Injectable({ providedIn: 'root' })
export class ChallengesService {
  private readonly appState = inject(AppStateService);
  private readonly db: Firestore | null;

  constructor() {
    const app = ensureFirebaseApp();
    this.db = app ? getFirestore(app) : null;
  }

  get enabled(): boolean {
    return this.db !== null;
  }

  /** Genera 5 domande deterministicamente dal catalogo intero. Le opzioni sono
   *  4 script casuali (corretto + 3 distrattori) sortati in un ordine fisso. */
  private generateQuestions(): ChallengeQuestion[] {
    const out: ChallengeQuestion[] = [];
    let prevId: string | null = null;
    for (let i = 0; i < TOTAL_Q; i++) {
      // Sceglie correctId evitando ripetizioni consecutive.
      let correctId = ALL_SCRIPT_IDS[Math.floor(Math.random() * ALL_SCRIPT_IDS.length)];
      for (let tries = 0; tries < 4; tries++) {
        if (correctId !== prevId) break;
        correctId = ALL_SCRIPT_IDS[Math.floor(Math.random() * ALL_SCRIPT_IDS.length)];
      }
      const script = scriptById(correctId);
      if (!script) continue;
      const glyph = script.samples[Math.floor(Math.random() * script.samples.length)];
      const cp = (glyph.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0');
      // 3 distrattori casuali da scritture diverse dalla corretta.
      const candidates = ALL_SCRIPT_IDS.filter((id) => id !== correctId);
      const distractors: string[] = [];
      while (distractors.length < 3 && candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        distractors.push(candidates.splice(idx, 1)[0]);
      }
      const options = [correctId, ...distractors].sort(() => Math.random() - 0.5);
      out.push({ glyph, cp, correctId, options });
      prevId = correctId;
    }
    return out;
  }

  /** Crea una nuova sfida verso `toUid` con 5 glifi auto-generati. Il
   *  creatore deve giocare PRIMA e passare fromScore al momento della
   *  creazione, cosi' il destinatario quando apre la sfida ha gia' un
   *  riferimento da battere. */
  async create(
    toUid: string,
    toNickname: string,
    fromScore: number,
    questions: ChallengeQuestion[],
  ): Promise<string> {
    if (!this.db) throw new Error('Firebase not configured');
    const account = this.appState.state().account;
    if (!account) throw new Error('Not authenticated');
    const ref = collection(this.db, 'challenges');
    const docRef = await addDoc(ref, {
      from: account.uid,
      fromNickname: account.nickname,
      to: toUid,
      toNickname,
      questions,
      fromScore,
      toScore: null,
      status: 'pending',
      createdAt: serverTimestamp(),
      completedAt: null,
    });
    return docRef.id;
  }

  /** Genera 5 domande pronte per essere giocate dal challenger. Esposto come
   *  metodo separato cosi' chi crea la sfida puo' giocarle PRIMA di chiamare
   *  `create` (le passa poi a create per ottenere lo stesso set nel doc). */
  newQuestionSet(): ChallengeQuestion[] {
    return this.generateQuestions();
  }

  /** Legge una sfida per id. Le rules consentono read solo alle due parti
   *  coinvolte; restituisce null se non esiste o se non sei autorizzato. */
  async getById(id: string): Promise<ChallengeDoc | null> {
    if (!this.db) return null;
    const ref = doc(this.db, 'challenges', id);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const data = snap.data() as Omit<ChallengeDoc, 'id'>;
      return { id: snap.id, ...data };
    } catch (e) {
      console.warn('[challenges] getById error:', e);
      return null;
    }
  }

  /** Sfide in cui l'utente loggato e' destinatario (challenger ha gia'
   *  giocato, tu devi rispondere). Ordinate per createdAt desc. */
  async listIncoming(): Promise<ChallengeDoc[]> {
    if (!this.db) return [];
    const me = this.appState.state().account?.uid;
    if (!me) return [];
    const ref = collection(this.db, 'challenges');
    const q = query(ref, where('to', '==', me), orderBy('createdAt', 'desc'), limit(50));
    return await this.runQuery(q);
  }

  /** Sfide inviate dall'utente loggato. */
  async listOutgoing(): Promise<ChallengeDoc[]> {
    if (!this.db) return [];
    const me = this.appState.state().account?.uid;
    if (!me) return [];
    const ref = collection(this.db, 'challenges');
    const q = query(ref, where('from', '==', me), orderBy('createdAt', 'desc'), limit(50));
    return await this.runQuery(q);
  }

  /** Sfide pendenti in arrivo (status pending E to == me). Servono per il
   *  badge contatore nel menu account. */
  async countPendingIncoming(): Promise<number> {
    const all = await this.listIncoming();
    return all.filter((c) => c.status === 'pending').length;
  }

  /**
   * True se esiste una sfida pending tra l'utente loggato e `friendUid`,
   * in qualunque direzione. Usato dal profilo pubblico per impedire di
   * mandare una seconda sfida quando una e' gia' in corso.
   */
  async existsPendingWith(friendUid: string): Promise<boolean> {
    const me = this.appState.state().account?.uid;
    if (!me) return false;
    const [inc, out] = await Promise.all([this.listIncoming(), this.listOutgoing()]);
    const fromHim = inc.some((c) => c.status === 'pending' && c.from === friendUid);
    const fromMe = out.some((c) => c.status === 'pending' && c.to === friendUid);
    return fromHim || fromMe;
  }

  /**
   * Aggregato di tutte le sfide completate dell'utente loggato: quante ha
   * vinto, perso, pareggiato. Usato in /profile per mostrare un record
   * sintetico delle sfide tra amici. Conta come "vittoria" se il mio score
   * supera quello dell'avversario, "sconfitta" se inferiore, "pareggio" se
   * uguali (incluse le 5-5 e le 0-0).
   *
   * Costo: 2 query Firestore (incoming + outgoing). Aggregato lato client.
   */
  async getChallengeStats(): Promise<ChallengeStats> {
    if (!this.db) return { won: 0, lost: 0, draw: 0, total: 0 };
    const me = this.appState.state().account?.uid;
    if (!me) return { won: 0, lost: 0, draw: 0, total: 0 };
    const [inc, out] = await Promise.all([this.listIncoming(), this.listOutgoing()]);
    let won = 0;
    let lost = 0;
    let draw = 0;
    const completed = [...inc, ...out].filter(
      (c) => c.status === 'completed' && typeof c.toScore === 'number',
    );
    for (const c of completed) {
      const meScore = me === c.to ? (c.toScore ?? 0) : c.fromScore;
      const them = me === c.to ? c.fromScore : (c.toScore ?? 0);
      if (meScore > them) won++;
      else if (meScore < them) lost++;
      else draw++;
    }
    return { won, lost, draw, total: won + lost + draw };
  }

  /**
   * Revoca una sfida pending che il challenger ha inviato. Cancella il doc
   * Firestore. Le rules consentono delete solo se `auth.uid === from` E
   * `status === 'pending'`: una sfida gia' giocata dal destinatario non
   * puo' piu' essere annullata. Idempotente lato client: se il doc non
   * esiste piu' (es. l'altro l'ha gia' completata nel frattempo), la
   * delete fallisce silently e l'UI ricarica lo stato fresco.
   */
  async cancelOutgoing(id: string): Promise<void> {
    if (!this.db) throw new Error('Firebase not configured');
    const ref = doc(this.db, 'challenges', id);
    await deleteDoc(ref);
  }

  /** Risposta del destinatario alla sfida: setta toScore e segna completed. */
  async submitToScore(id: string, toScore: number): Promise<void> {
    if (!this.db) throw new Error('Firebase not configured');
    const ref = doc(this.db, 'challenges', id);
    await updateDoc(ref, {
      toScore,
      status: 'completed',
      completedAt: serverTimestamp(),
    });
  }

  private async runQuery(q: ReturnType<typeof query>): Promise<ChallengeDoc[]> {
    const snap = await getDocs(q);
    const out: ChallengeDoc[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<ChallengeDoc, 'id'>;
      out.push({ id: d.id, ...data });
    });
    return out;
  }
}
