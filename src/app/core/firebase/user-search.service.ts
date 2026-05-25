import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  getFirestore,
  limit,
  query,
} from 'firebase/firestore/lite';
import { ensureFirebaseApp } from './firebase';

/**
 * Ricerca utenti per nickname con tolleranza fuzzy (Levenshtein <=2).
 *
 * Strategia: la collezione `/nicknames` e' piccola (un doc per utente, ~50
 * byte ciascuno) e leggerla in blocco e' ragionevole finche' restiamo sotto i
 * ~2000 utenti. Carico la lista una volta a sessione (con cache TTL di 5
 * minuti), poi tutte le ricerche successive sono client-side: niente
 * round-trip per ogni tasto premuto, costo Firestore quasi nullo.
 *
 * Oltre i 2000 utenti questo approccio costerebbe troppe read per ricerca;
 * a quel punto si passa a un indice esterno (Algolia / Typesense / Meilisearch)
 * o a uno schema con n-gram in una collezione dedicata. Per ora overkill.
 */
@Injectable({ providedIn: 'root' })
export class UserSearchService {
  private readonly db: Firestore | null;
  private cache: NicknameEntry[] | null = null;
  private cacheAt = 0;
  /** TTL della cache: oltre questo intervallo, la prossima search rilegge da Firestore. */
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor() {
    const app = ensureFirebaseApp();
    this.db = app ? getFirestore(app) : null;
  }

  /**
   * Cerca utenti per nickname. Restituisce risultati ordinati per rilevanza:
   * match esatto > prefisso > sottostringa > distanza Levenshtein crescente.
   * Restituisce fino a `max` risultati (default 30).
   */
  async search(qStr: string, max = 30): Promise<NicknameEntry[]> {
    const q = qStr.trim().toLowerCase();
    if (q.length < 2) return [];
    const all = await this.loadAll();
    return rankMatches(all, q).slice(0, max);
  }

  /**
   * Invalida la cache. Da chiamare dopo che l'utente cambia il proprio
   * nickname, cosi' il cambio si riflette nella ricerca senza aspettare il TTL.
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheAt = 0;
  }

  private async loadAll(): Promise<NicknameEntry[]> {
    if (this.cache && Date.now() - this.cacheAt < this.CACHE_TTL_MS) {
      return this.cache;
    }
    if (!this.db) return [];
    const ref = collection(this.db, 'nicknames');
    const snap = await getDocs(query(ref, limit(2000)));
    const entries: NicknameEntry[] = [];
    snap.forEach((d) => {
      const uid = d.data()?.['uid'];
      if (typeof uid === 'string') entries.push({ nick: d.id, uid });
    });
    this.cache = entries;
    this.cacheAt = Date.now();
    return entries;
  }
}

export interface NicknameEntry {
  /** Nickname in forma lowercased (cosi' come e' la doc ID in /nicknames). */
  nick: string;
  /** Uid Firebase Auth dell'utente proprietario. */
  uid: string;
}

/**
 * Calcola uno score di rilevanza tra query e nickname. Score piu' basso = match
 * migliore.
 *   0  - match esatto
 *   1  - nickname inizia con la query
 *   2  - nickname contiene la query come sottostringa
 *   3+ - distanza Levenshtein (3 = 1 errore, 4 = 2 errori)
 * Tutto oltre 2 errori viene scartato.
 */
function rankMatches(all: NicknameEntry[], q: string): NicknameEntry[] {
  const scored: Array<{ entry: NicknameEntry; score: number }> = [];
  for (const e of all) {
    const n = e.nick; // gia' lowercased (e' la doc ID)
    let score: number;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (n.includes(q)) score = 2;
    else {
      const d = levenshtein(q, n);
      if (d > 2) continue;
      score = 2 + d;
    }
    scored.push({ entry: e, score });
  }
  scored.sort(
    (a, b) => a.score - b.score || a.entry.nick.localeCompare(b.entry.nick),
  );
  return scored.map((s) => s.entry);
}

/** Levenshtein distance iterativa con due righe. Char-by-char, niente Unicode special. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}
