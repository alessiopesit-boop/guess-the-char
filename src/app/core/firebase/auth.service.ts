import { Injectable, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
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
   * Lancia comunque per i casi di errore reale (formato email invalido,
   * rate limit, network), che la UI mappa a messaggi specifici.
   */
  async sendPasswordReset(email: string): Promise<void> {
    const auth = this.requireAuth();
    await sendPasswordResetEmail(auth, email);
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
