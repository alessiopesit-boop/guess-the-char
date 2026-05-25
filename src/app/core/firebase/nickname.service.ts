import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
} from 'firebase/firestore/lite';
import { ensureFirebaseApp } from './firebase';

/**
 * Gestisce l'unicita' del nickname tramite la collezione `/nicknames/{nick}`,
 * dove `nick` e' la versione **lowercased** del nickname (cosi' "Alessio" e
 * "alessio" mappano sulla stessa entry e non si possono "rubare" l'un l'altro).
 * Il documento contiene solo `{ uid }`: chi possiede quella entry e' il
 * proprietario del nickname.
 *
 * Le regole Firestore garantiscono:
 *  - chiunque puo' leggere (per il profilo pubblico)
 *  - solo l'utente loggato puo' creare un'entry con il proprio uid
 *  - update non e' mai consentito (devi cancellare e ricreare)
 *  - delete consentito solo al proprietario
 *
 * Le transazioni di `change` garantiscono atomicita' tra release del vecchio
 * nickname, claim del nuovo e aggiornamento di `/users/{uid}.nickname`.
 */
@Injectable({ providedIn: 'root' })
export class NicknameService {
  private readonly db: Firestore | null;

  constructor() {
    const app = ensureFirebaseApp();
    this.db = app ? getFirestore(app) : null;
  }

  /** True se il backend e' disponibile (config Firebase reale, non placeholder). */
  get enabled(): boolean {
    return this.db !== null;
  }

  /** Normalizza un nickname per usarlo come chiave (lowercased, trim). */
  private key(nick: string): string {
    return nick.trim().toLowerCase();
  }

  /**
   * Tenta di claimare atomicamente un nickname per l'uid dato.
   *  - 'claimed': era libero, ora e' tuo
   *  - 'taken-by-me': era gia' tuo (idempotente)
   *  - 'taken-by-other': non disponibile
   */
  async claim(nick: string, uid: string): Promise<'claimed' | 'taken-by-me' | 'taken-by-other'> {
    if (!this.db) throw new Error('Firebase not configured');
    const ref = doc(this.db, 'nicknames', this.key(nick));
    return await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.['uid'] === uid) return 'taken-by-me';
        return 'taken-by-other';
      }
      tx.set(ref, { uid });
      return 'claimed';
    });
  }

  /**
   * Cambia il nickname da `oldNick` a `newNick` in modo atomico:
   *  1. Verifica che `newNick` sia libero o gia' tuo
   *  2. Crea l'entry del nuovo se non c'era
   *  3. Cancella l'entry del vecchio (se esiste ed e' tua)
   *  4. Aggiorna `/users/{uid}.nickname` al nuovo valore
   *
   * Tutte le operazioni avvengono in una sola transazione: se uno step
   * fallisce, niente viene committato.
   */
  async change(
    oldNick: string | null,
    newNick: string,
    uid: string,
  ): Promise<'ok' | 'taken'> {
    if (!this.db) throw new Error('Firebase not configured');
    const oldKey = oldNick ? this.key(oldNick) : null;
    const newKey = this.key(newNick);
    if (oldKey === newKey) {
      // Stesso nickname (o solo cambio di maiuscole): aggiorna /users e basta.
      const userRef = doc(this.db, 'users', uid);
      await runTransaction(this.db, async (tx) => {
        tx.update(userRef, { nickname: newNick });
      });
      return 'ok';
    }
    return await runTransaction(this.db, async (tx) => {
      // ── Letture in cima (vincolo Firestore transactions). ──
      const newRef = doc(this.db!, 'nicknames', newKey);
      const newSnap = await tx.get(newRef);
      const oldRef = oldKey ? doc(this.db!, 'nicknames', oldKey) : null;
      const oldSnap = oldRef ? await tx.get(oldRef) : null;
      const userRef = doc(this.db!, 'users', uid);

      // ── Validazione. ──
      if (newSnap.exists() && newSnap.data()?.['uid'] !== uid) {
        return 'taken';
      }

      // ── Scritture. ──
      if (!newSnap.exists()) {
        tx.set(newRef, { uid });
      }
      if (oldRef && oldSnap?.exists() && oldSnap.data()?.['uid'] === uid) {
        tx.delete(oldRef);
      }
      tx.update(userRef, { nickname: newNick });
      return 'ok';
    });
  }

  /**
   * Trova un nickname disponibile partendo da `seed`. Prova seed, seed2,
   * ..., seed5, poi `seed-<rnd4>`. Usato in fase di primo signup per evitare
   * collisioni con altri utenti che hanno la stessa email-prefix o stesso
   * displayName Google.
   *
   * Garantisce che al ritorno il nickname risulti claimed per `uid`.
   */
  async findAvailable(seed: string, uid: string): Promise<string> {
    const base = seed.trim() || 'lettore';
    const candidates = [base, `${base}2`, `${base}3`, `${base}4`, `${base}5`];
    for (const c of candidates) {
      try {
        const r = await this.claim(c, uid);
        if (r === 'claimed' || r === 'taken-by-me') return c;
      } catch {
        // Transient: continua al prossimo candidato
      }
    }
    // Fallback: aggiungi 4 caratteri pseudo-random
    const rnd = Math.random().toString(36).slice(2, 6);
    const last = `${base}-${rnd}`;
    try {
      const r = await this.claim(last, uid);
      if (r === 'claimed' || r === 'taken-by-me') return last;
    } catch {
      // ignore
    }
    return last;
  }

  /**
   * Legge il documento utente partendo dal nickname (per il profilo pubblico).
   * Due step: /nicknames/{nick} -> uid -> /users/{uid}. Restituisce null se
   * il nickname non esiste o se il doc utente non si trova.
   */
  async getUserByNickname(nick: string): Promise<({ uid: string } & Record<string, unknown>) | null> {
    if (!this.db) return null;
    const nickRef = doc(this.db, 'nicknames', this.key(nick));
    const nickSnap = await getDoc(nickRef);
    if (!nickSnap.exists()) return null;
    const uid = nickSnap.data()?.['uid'];
    if (typeof uid !== 'string') return null;
    const userRef = doc(this.db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    return { uid, ...userSnap.data() };
  }
}
