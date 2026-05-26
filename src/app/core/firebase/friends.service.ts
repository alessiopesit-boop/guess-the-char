import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore/lite';
import { ensureFirebaseApp } from './firebase';
import { AuthService } from './auth.service';
import { NicknameService } from './nickname.service';

/**
 * Stato di un'amicizia dal punto di vista del titolare della subcollezione.
 *  - 'pending-sent': ho mandato una richiesta a `friendUid`, in attesa che accetti
 *  - 'pending-received': `friendUid` mi ha mandato una richiesta, posso accettare/rifiutare
 *  - 'accepted': siamo amici
 */
export type FriendStatus = 'pending-sent' | 'pending-received' | 'accepted';

export interface FriendEntry {
  /** UID dell'altro utente. */
  uid: string;
  /** Nickname dell'altro (snapshot al momento della richiesta; non si aggiorna). */
  nickname: string;
  /** Stato corrente della relazione. */
  status: FriendStatus;
  /** Timestamp di quando e' arrivata/inviata la richiesta. */
  addedAt: unknown;
}

/**
 * Gestione amicizie mutuali via subcollezione `/users/{uid}/friends/{friendUid}`.
 *
 * Pattern: per ogni relazione esistono SEMPRE due doc speculari, uno nella
 * subcollezione di A e uno in quella di B. Quando A invita B, scriviamo:
 *   /users/A/friends/B = { status: 'pending-sent',    nickname: 'B-nick', addedAt }
 *   /users/B/friends/A = { status: 'pending-received', nickname: 'A-nick', addedAt }
 *
 * Le scritture sono atomiche via `writeBatch` (cosi' non resta mai una meta'
 * orfana se la rete cade a meta'). Le regole Firestore permettono a entrambe
 * le parti di scrivere su entrambi i lati della relazione (uid == request.auth
 * o friendUid == request.auth).
 *
 * Niente real-time: le query sono lazy, riarmate dai chiamanti al cambio rotta.
 */
@Injectable({ providedIn: 'root' })
export class FriendsService {
  private readonly auth = inject(AuthService);
  private readonly nicknameSvc = inject(NicknameService);
  private readonly db: Firestore | null;

  constructor() {
    const app = ensureFirebaseApp();
    this.db = app ? getFirestore(app) : null;
  }

  /** True se Firebase e' configurato. */
  get enabled(): boolean {
    return this.db !== null;
  }

  /** UID dell'utente loggato corrente, o null se anonimo / non caricato. */
  private myUid(): string | null {
    const u = this.auth.user();
    return u && u !== 'loading' ? u.uid : null;
  }

  /**
   * Manda una richiesta di amicizia a `friendUid`. Idempotente: se la
   * relazione esiste gia' (in qualunque stato), no-op.
   *
   * Per evitare di leggere un nickname esterno via cross-user query, l'utente
   * chiamante passa il nickname dell'altro (lo conosciamo perche' siamo sulla
   * sua pagina pubblica quando clicchiamo "Aggiungi amico").
   */
  async sendRequest(
    friendUid: string,
    friendNickname: string,
    myNickname: string,
  ): Promise<'sent' | 'already' | 'self'> {
    if (!this.db) throw new Error('Firebase not configured');
    const me = this.myUid();
    if (!me) throw new Error('Not authenticated');
    if (me === friendUid) return 'self';

    const myRef = doc(this.db, 'users', me, 'friends', friendUid);
    const theirRef = doc(this.db, 'users', friendUid, 'friends', me);
    const mySnap = await getDoc(myRef);
    if (mySnap.exists()) return 'already';

    const batch = writeBatch(this.db);
    batch.set(myRef, {
      status: 'pending-sent',
      nickname: friendNickname,
      addedAt: serverTimestamp(),
    });
    batch.set(theirRef, {
      status: 'pending-received',
      nickname: myNickname,
      addedAt: serverTimestamp(),
    });
    await batch.commit();
    return 'sent';
  }

  /**
   * Accetta una richiesta ricevuta da `friendUid`. Aggiorna a 'accepted' su
   * entrambi i lati. Falla se la richiesta non esiste o non e' nello stato
   * 'pending-received' dal lato dell'utente.
   */
  async accept(friendUid: string): Promise<void> {
    if (!this.db) throw new Error('Firebase not configured');
    const me = this.myUid();
    if (!me) throw new Error('Not authenticated');
    const batch = writeBatch(this.db);
    batch.update(doc(this.db, 'users', me, 'friends', friendUid), {
      status: 'accepted',
    });
    batch.update(doc(this.db, 'users', friendUid, 'friends', me), {
      status: 'accepted',
    });
    await batch.commit();
  }

  /**
   * Rifiuta una richiesta ricevuta da `friendUid` (cancella entrambi i lati).
   * Stesso effetto di `remove` ma semanticamente distinto per chiarire il
   * caso d'uso. Sicuro chiamare anche se una delle due meta' e' gia' sparita.
   */
  async decline(friendUid: string): Promise<void> {
    await this.removePair(friendUid);
  }

  /** Rimuove un'amicizia o annulla una richiesta inviata. Cancella entrambi i lati. */
  async remove(friendUid: string): Promise<void> {
    await this.removePair(friendUid);
  }

  private async removePair(friendUid: string): Promise<void> {
    if (!this.db) throw new Error('Firebase not configured');
    const me = this.myUid();
    if (!me) throw new Error('Not authenticated');
    const myRef = doc(this.db, 'users', me, 'friends', friendUid);
    const theirRef = doc(this.db, 'users', friendUid, 'friends', me);
    // Le delete sono tolleranti a "doc inesistente", quindi non serve
    // controllo preliminare.
    const batch = writeBatch(this.db);
    batch.delete(myRef);
    batch.delete(theirRef);
    await batch.commit();
  }

  /** Tutte le relazioni dell'utente loggato (accettate + pending). */
  async listAll(): Promise<FriendEntry[]> {
    if (!this.db) return [];
    const me = this.myUid();
    if (!me) return [];
    const ref = collection(this.db, 'users', me, 'friends');
    const snap = await getDocs(ref);
    const out: FriendEntry[] = [];
    snap.forEach((d) => {
      const data = d.data();
      out.push({
        uid: d.id,
        nickname: typeof data['nickname'] === 'string' ? (data['nickname'] as string) : '',
        status: data['status'] as FriendStatus,
        addedAt: data['addedAt'],
      });
    });
    return out;
  }

  /** Filtro su `listAll` per le sole relazioni accettate. */
  async listFriends(): Promise<FriendEntry[]> {
    return (await this.listAll()).filter((f) => f.status === 'accepted');
  }

  /** Filtro su `listAll` per le sole richieste in arrivo da accettare. */
  async listIncomingRequests(): Promise<FriendEntry[]> {
    return (await this.listAll()).filter((f) => f.status === 'pending-received');
  }

  /** Filtro per le richieste inviate ancora in attesa. */
  async listOutgoingRequests(): Promise<FriendEntry[]> {
    return (await this.listAll()).filter((f) => f.status === 'pending-sent');
  }

  /** Stato della relazione con `friendUid`, o null se non esiste. */
  async statusWith(friendUid: string): Promise<FriendStatus | null> {
    if (!this.db) return null;
    const me = this.myUid();
    if (!me) return null;
    const ref = doc(this.db, 'users', me, 'friends', friendUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return (snap.data()?.['status'] as FriendStatus) ?? null;
  }

  /**
   * Risolve il nickname di un altro utente in uid (servizio di comodo via
   * NicknameService) e manda la richiesta. Usato dal bottone "Aggiungi
   * amico" sulla pagina del profilo pubblico, dove abbiamo solo il nickname.
   */
  async sendRequestByNickname(
    friendNickname: string,
    myNickname: string,
  ): Promise<'sent' | 'already' | 'self' | 'not-found'> {
    const userDoc = await this.nicknameSvc.getUserByNickname(friendNickname);
    if (!userDoc) return 'not-found';
    return await this.sendRequest(userDoc.uid, friendNickname, myNickname);
  }
}
