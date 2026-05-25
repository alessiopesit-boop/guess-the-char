import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AccountInfo, AppState, DEFAULT_STATE } from './types';
import { AuthService } from '../firebase/auth.service';

const STORAGE_KEY = 'gtc.state';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const today = new Date().toDateString();
    if (parsed.dailyDoneStamp !== today) {
      parsed.dailyDone = false;
    }
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly auth = inject(AuthService);

  private readonly _state = signal<AppState>(loadState());
  readonly state = this._state.asReadonly();

  /** True quando lo stato Auth ha emesso almeno un evento. Utile per evitare
   *  che la guardia onboarding flickeri prima di sapere se l'utente e' loggato. */
  readonly authReady = computed(() => this.auth.user() !== 'loading');

  constructor() {
    effect(() => {
      const s = this._state();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch {
        // localStorage quota o private mode: stato vive solo in memoria
      }
    });

    // Quando Firebase Auth cambia (login / logout esterno, sessione ripresa al
    // ritorno sulla scheda, ecc.) riflettiamo lo stato dentro state.account.
    // I campi nickname/avatar restano i valori locali precedenti se l'utente
    // li ha gia' scelti; al primo login da provider OAuth li seedeiamo da
    // displayName / valori default.
    //
    // IMPORTANTE: tutte le letture di _state qui dentro devono essere in
    // untracked(): se le tracciassimo, ogni write a _state rilancerebbe
    // l'effect, e ogni write nasce dallo spread di un nuovo oggetto, quindi
    // l'effect si auto-rilancerebbe all'infinito (loop che blocca il tab).
    effect(() => {
      const u = this.auth.user();
      if (u === 'loading') return;
      if (!u) {
        const hadAccount = untracked(() => this._state().account);
        if (hadAccount) {
          this._state.update((s) => ({ ...s, account: null }));
        }
        return;
      }
      const existing = untracked(() => this._state().account);
      // Se esiste gia' un account locale con lo stesso uid, manteniamo i
      // valori scelti dall'utente (nickname/avatar) e aggiorniamo solo i
      // campi che vengono dall'Auth.
      const account: AccountInfo = existing && existing.uid === u.uid
        ? {
            ...existing,
            email: u.email ?? existing.email,
            provider: providerOf(u),
          }
        : {
            uid: u.uid,
            email: u.email ?? '',
            nickname: u.displayName ?? (u.email ? u.email.split('@')[0] : 'lettore'),
            avatar: 0,
            provider: providerOf(u),
            joinedStamp: new Date().toISOString(),
          };
      this._state.update((s) => ({ ...s, account }));
    });
  }

  update(partial: Partial<AppState>): void {
    this._state.update((s) => ({ ...s, ...partial }));
  }

  patch(updater: (s: AppState) => AppState): void {
    this._state.update(updater);
  }

  /** Aggiorna i campi mutabili dell'account (nickname / avatar). UID, email e
   *  provider sono governati dal flusso Auth, non si toccano qui. */
  updateAccount(partial: Partial<Pick<AccountInfo, 'nickname' | 'avatar'>>): void {
    this._state.update((s) =>
      s.account ? { ...s, account: { ...s.account, ...partial } } : s,
    );
  }

  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this._state.set(DEFAULT_STATE);
  }
}

function providerOf(u: { providerData?: Array<{ providerId: string }> }): AccountInfo['provider'] {
  const pid = u.providerData?.[0]?.providerId;
  if (pid === 'password') return 'password';
  if (pid === 'google.com') return 'google.com';
  if (pid === 'apple.com') return 'apple.com';
  return 'demo';
}
