import { Injectable } from '@angular/core';
import {
  Firestore,
  QueryDocumentSnapshot,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore/lite';
import { ensureFirebaseApp } from './firebase';

export type LeaderboardPeriod = 'daily' | 'alltime';

export interface LeaderboardRow {
  uid: string;
  nickname: string;
  avatar: number;
  /** Score visualizzato sulla destra. Su Daily = dailyScore (0-5), su Alltime
   *  = correctAnswers (intero non negativo). */
  score: number;
}

/**
 * Classifica letta dalla collezione `/users`. Due viste:
 *  - daily: filtra per dailyDoneStamp == oggi, sort per dailyScore desc
 *  - alltime: sort per correctAnswers desc
 *
 * Paginazione cursor-based via `startAfter`: la prima fetch carica i primi N
 * documenti, le successive partono dall'ultimo doc della pagina precedente.
 * Niente caching: ogni cambio di tab e ogni "Mostra altri" e' una fetch fresca.
 */
@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly db: Firestore | null;

  constructor() {
    const app = ensureFirebaseApp();
    this.db = app ? getFirestore(app) : null;
  }

  /** Fetch della pagina iniziale (o successiva tramite `after`). */
  async fetch(
    period: LeaderboardPeriod,
    pageSize: number,
    after?: QueryDocumentSnapshot | null,
  ): Promise<LeaderboardPage> {
    if (!this.db) return { rows: [], lastDoc: null, hasMore: false };
    const usersRef = collection(this.db, 'users');
    const constraints =
      period === 'daily'
        ? [
            where('dailyDoneStamp', '==', new Date().toDateString()),
            orderBy('dailyScore', 'desc'),
          ]
        : [orderBy('correctAnswers', 'desc')];
    const q = after
      ? query(usersRef, ...constraints, startAfter(after), limit(pageSize))
      : query(usersRef, ...constraints, limit(pageSize));
    const snap = await getDocs(q);
    const rows: LeaderboardRow[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      rows.push({
        uid: d.id,
        nickname: typeof data['nickname'] === 'string' ? (data['nickname'] as string) : '',
        avatar: typeof data['avatar'] === 'number' ? (data['avatar'] as number) : 0,
        score:
          period === 'daily'
            ? typeof data['dailyScore'] === 'number'
              ? (data['dailyScore'] as number)
              : 0
            : typeof data['correctAnswers'] === 'number'
              ? (data['correctAnswers'] as number)
              : 0,
      });
    });
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    // hasMore approssimato: se ho ricevuto `pageSize` righe, probabilmente c'e'
    // ancora qualcosa dopo. Un'altra fetch potrebbe tornare vuota: la UI lo
    // gestisce graziosamente (Mostra altri sparisce dopo la prima pagina vuota).
    return { rows, lastDoc, hasMore: rows.length === pageSize };
  }
}

export interface LeaderboardPage {
  rows: LeaderboardRow[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}
