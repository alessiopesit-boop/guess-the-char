import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/firebase/auth.service';
import { AppStateService } from '../../core/state/app-state.service';
import { AppBar } from '../../shared/app-bar';
import { Logo } from '../../shared/logo';

@Component({
  selector: 'app-login',
  imports: [AppBar, Logo, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  protected readonly appState = inject(AppStateService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  /** Se siamo gia' autenticati: tornare al rendering qui dentro significa che
   *  ci siamo arrivati dal redirect Google (o che eravamo gia' loggati e
   *  abbiamo riaperto /login). L'app-level effect ci portera' a /home, ma in
   *  attesa mostriamo un banner di stato esplicito + un bottone "Vai alla
   *  home" cosi' l'utente non sente che la pagina e' rotta se il redirect
   *  automatico fosse lento per qualche motivo. */
  protected readonly isAuthenticated = computed(() => {
    const u = this.auth.user();
    return u !== null && u !== 'loading';
  });
  protected readonly currentNickname = computed(
    () => this.appState.state().account?.nickname ?? '',
  );

  constructor() {
    // Login e' montato solo quando il browser e' su /login: niente race con il
    // router. Appena auth.user diventa un User autenticato, navighiamo a /home.
    // Questo copre tutti gli ingressi: completato un signInWithPopup, sessione
    // ripresa al caricamento pagina, o utente che riapre /login per sbaglio
    // mentre era gia' loggato.
    effect(() => {
      const u = this.auth.user();
      if (u && u !== 'loading') {
        this.router.navigate(['/home']);
      }
    });
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }

  protected readonly emailValid = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email()),
  );
  protected readonly passwordValid = computed(() => this.password().length >= 6);
  protected readonly canSubmit = computed(
    () => this.emailValid() && this.passwordValid() && !this.busy(),
  );

  /** Per [(ngModel)] al template, perche' i signal non hanno ancora il binding
   *  diretto. Patterns identici per email + password. */
  protected setEmail(v: string): void {
    this.email.set(v);
    if (this.error()) this.error.set(null);
  }
  protected setPassword(v: string): void {
    this.password.set(v);
    if (this.error()) this.error.set(null);
  }

  /**
   * Flow unificato login/registrazione (stile Google one-tap):
   *  1. Prova prima signIn (caso piu' frequente: utente che torna).
   *  2. Se Firebase risponde "account non esistente" / "credenziali invalide",
   *     tenta signUp. Se anche signUp fallisce per "email gia' in uso", allora
   *     l'account esiste davvero ma la password e' sbagliata: mostriamo questo
   *     errore specifico.
   *  3. Qualunque altro errore di signIn (rate limit, network, ecc.) viene
   *     propagato direttamente senza fallback.
   */
  protected async submitEmail(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(null);
    const email = this.email().trim();
    const password = this.password();
    try {
      try {
        await this.auth.signInEmail(email, password);
      } catch (signInErr: unknown) {
        const code = (signInErr as { code?: string })?.code ?? '';
        // Firebase non distingue piu' "utente non esistente" da "password
        // sbagliata" (entrambi → auth/invalid-credential), quindi proviamo
        // signUp solo per i codici che potrebbero indicare account assente.
        const looksLikeUnknownAccount =
          code === 'auth/invalid-credential' ||
          code === 'auth/user-not-found' ||
          code === 'auth/wrong-password';
        if (!looksLikeUnknownAccount) throw signInErr;
        try {
          await this.auth.signUpEmail(email, password);
        } catch (signUpErr: unknown) {
          // Se signUp fallisce con "email in uso", l'account esiste e la
          // password e' sbagliata. Lanciamo un codice custom cosi' il
          // messaggio user-facing dice "account gia' esistente" invece
          // del generico "credenziali errate" che confonde chi pensa di
          // stare creando un nuovo account.
          const upCode = (signUpErr as { code?: string })?.code ?? '';
          if (upCode === 'auth/email-already-in-use') {
            throw { code: 'gtc/account-exists-wrong-password' };
          }
          throw signUpErr;
        }
      }
      // Navigazione gestita dall'effect del costruttore: l'auth state cambia e
      // l'effect ci porta a /home. Niente navigate qui sotto per evitare la
      // doppia chiamata che generava AbortError "Transition was skipped".
    } catch (e: unknown) {
      this.error.set(this.translateError(e));
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Google sign-in via popup. signInWithPopup risolve con il User quando
   * l'utente completa il flow su accounts.google.com. Non navigamo qui: ci
   * pensa l'effect del costruttore quando auth.user cambia, evitando la
   * doppia navigate.
   *
   * Nota: il signInWithPopup emette warning innocui in console
   * ("Cross-Origin-Opener-Policy policy would block the window.closed call")
   * a causa del polling che Firebase fa sullo stato del popup. L'auth
   * funziona comunque via postMessage, i warning sono solo rumore.
   */
  protected async submitGoogle(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.signInGoogle();
    } catch (e: unknown) {
      this.error.set(this.translateError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected continueAnonymous(): void {
    this.router.navigate(['/home']);
  }

  protected goBack(): void {
    this.location.back();
  }

  /** Mappa gli errori Firebase ai messaggi user-facing in lingua corrente. Gli
   *  error code Firebase sono stringhe stabili tipo "auth/wrong-password". */
  private translateError(e: unknown): string {
    const isIt = this.i18n.lang() === 'it';
    const code = (e as { code?: string })?.code ?? '';
    switch (code) {
      case 'auth/invalid-email':
        return isIt ? 'Email non valida.' : 'Invalid email.';
      case 'auth/email-already-in-use':
        return isIt
          ? 'Questa email e\' gia\' registrata: prova ad accedere invece di crearne una nuova.'
          : 'This email is already registered: try signing in instead.';
      case 'auth/weak-password':
        return isIt
          ? 'La password deve essere lunga almeno 6 caratteri.'
          : 'Password must be at least 6 characters long.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return isIt
          ? 'Email o password non corrette.'
          : 'Email or password is incorrect.';
      case 'gtc/account-exists-wrong-password':
        return isIt
          ? 'Esiste gia\' un account con questa email, ma la password non corrisponde. Se non ricordi la password, prova con un\'email diversa.'
          : 'An account with this email already exists, but the password doesn\'t match. If you don\'t remember it, try a different email.';
      case 'auth/too-many-requests':
        return isIt
          ? 'Troppi tentativi in poco tempo: riprova fra qualche minuto.'
          : 'Too many attempts: please try again in a few minutes.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return isIt
          ? 'Accesso annullato.'
          : 'Sign-in cancelled.';
      case 'auth/popup-blocked':
        return isIt
          ? 'Il browser ha bloccato il popup. Abilitalo per questo sito e riprova.'
          : 'Your browser blocked the popup. Enable it for this site and try again.';
      case 'auth/network-request-failed':
        return isIt
          ? 'Niente connessione: controlla la rete e riprova.'
          : 'No connection: check your network and try again.';
      default:
        return isIt
          ? 'Qualcosa non ha funzionato. Riprova.'
          : 'Something went wrong. Please try again.';
    }
  }
}
