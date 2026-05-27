import { Injectable, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import { ensureFirebaseApp } from './firebase';
import { isFirebaseConfigured } from './firebase.config';

/**
 * Astrazione thin sopra Firebase Auth. Espone un signal `user` con lo stato
 * corrente (User Firebase | null | 'loading') e metodi imperativi per i flow di
 * accesso. Quando il config e' ancora PLACEHOLDER, tutti i metodi rigettano
 * con AuthDisabledError per chiarezza: la UI sa che deve mostrare il messaggio
 * "BaaS non configurato".
 *
 * Non gestisce la pagina di login: quella vive in features/login. Qui solo
 * il transport.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** 'loading' finche' Firebase non ha emesso il primo evento; poi User | null. */
  readonly user = signal<User | null | 'loading'>('loading');

  /** True se Firebase e' configurato e quindi i flow di login sono utilizzabili. */
  readonly enabled = isFirebaseConfigured();

  private readonly auth: Auth | null;

  constructor() {
    const app = ensureFirebaseApp();
    if (!app) {
      this.auth = null;
      this.user.set(null);
      return;
    }
    this.auth = getAuth(app);
    onAuthStateChanged(this.auth, (u) => this.user.set(u));
  }

  async signInEmail(email: string, password: string): Promise<User> {
    const auth = this.requireAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async signUpEmail(email: string, password: string): Promise<User> {
    const auth = this.requireAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  /**
   * Flow OAuth Google via popup. Avevamo provato signInWithRedirect per
   * aggirare i problemi di Cross-Origin-Opener-Policy, ma Firebase non riusciva
   * a finalizzare il return del redirect su localhost (getRedirectResult
   * tornava "no redirect pending" anche dopo un'autenticazione riuscita lato
   * server). Il popup invece e' un flow piu' diretto: signInWithPopup risolve
   * con il User quando l'utente completa il flow Google.
   */
  async signInGoogle(): Promise<User> {
    const auth = this.requireAuth();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  }

  async signOut(): Promise<void> {
    if (!this.auth) return;
    await fbSignOut(this.auth);
  }

  /**
   * Manda il classico "email di reset password" all'indirizzo dato. Firebase
   * non ritorna feedback diverso a seconda che l'email esista o no (scelta
   * voluta per privacy: non vogliamo che un attaccante possa enumerare gli
   * account registrati). Quindi la UI dice sempre "se l'email esiste, hai
   * ricevuto un link" indipendentemente dal risultato.
   *
   * `languageCode` ('it' / 'en' / ecc.) seleziona la lingua del template
   * della mail. Firebase ha gia' i template tradotti per ~50 lingue
   * (incluse IT + EN), quindi non c'e' nulla da configurare lato console.
   *
   * Lancia comunque per i casi di errore reale (formato email invalido,
   * rate limit, network), che la UI mappa a messaggi specifici.
   */
  async sendPasswordReset(email: string, languageCode?: string): Promise<void> {
    const auth = this.requireAuth();
    if (languageCode) auth.languageCode = languageCode;
    await sendPasswordResetEmail(auth, email);
  }

  /**
   * Provider con cui l'utente corrente ha fatto login ('google.com' /
   * 'password'), o null se non c'e' utente. Serve alla cancellazione account
   * per decidere se chiedere una reautenticazione via popup Google.
   */
  currentProviderId(): string | null {
    return this.auth?.currentUser?.providerData[0]?.providerId ?? null;
  }

  /**
   * Reautentica l'utente Google via popup. Necessario prima di operazioni
   * "sensibili" come deleteUser quando il login non e' recente: Firebase
   * rifiuta queste operazioni con 'auth/requires-recent-login' se la sessione
   * e' vecchia, e il popup rinfresca le credenziali.
   */
  async reauthenticateGoogle(): Promise<void> {
    const auth = this.requireAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new AuthDisabledError('Nessun utente loggato da reautenticare.');
    }
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }

  /**
   * Cancella definitivamente l'account Auth dell'utente corrente. Va chiamata
   * solo dopo aver ripulito i dati Firestore (vedi UserDocService). Puo'
   * lanciare 'auth/requires-recent-login' per utenti email con sessione
   * vecchia: il chiamante lo intercetta per chiedere un re-login.
   */
  async deleteCurrentUser(): Promise<void> {
    const u = this.auth?.currentUser;
    if (!u) {
      throw new AuthDisabledError('Nessun utente loggato da eliminare.');
    }
    await deleteUser(u);
  }

  private requireAuth(): Auth {
    if (!this.auth) {
      throw new AuthDisabledError(
        'Firebase non configurato: completa i passi in CLAUDE.md > Firebase prima di usare il login.',
      );
    }
    return this.auth;
  }
}

export class AuthDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthDisabledError';
  }
}
