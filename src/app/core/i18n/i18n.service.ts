import { Injectable, computed, effect, signal } from '@angular/core';
import { Lang } from '../state/types';
import { STRINGS, StringKey } from './strings';

const STORAGE_KEY = 'gtc.lang';

/**
 * Determina la lingua iniziale al primo avvio. Priorita':
 *   1. Scelta precedente dell'utente salvata su localStorage (se ha gia' usato
 *      l'app, rispettiamo la sua decisione).
 *   2. Detect dal browser/device: se il primary tag della preferenza utente e'
 *      'it' usiamo italiano, altrimenti tutti finiscono in inglese.
 *   3. Fallback duro: 'en'. E' il default piu' inclusivo (l'app punta a un
 *      pubblico internazionale; gli italiani vengono catturati dal detect).
 */
function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'it' || stored === 'en') return stored;
  } catch {
    // ignore (storage non disponibile)
  }
  try {
    const navLang = (
      (typeof navigator !== 'undefined' ? navigator.language : '') || ''
    )
      .toLowerCase()
      .split('-')[0];
    if (navLang === 'it') return 'it';
  } catch {
    // ignore (in test runner / SSR navigator puo' essere assente)
  }
  return 'en';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<Lang>(loadLang());
  readonly lang = this._lang.asReadonly();
  readonly strings = computed(() => STRINGS[this._lang()]);

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, this._lang());
      } catch {
        // ignore
      }
    });
  }

  set(lang: Lang): void {
    this._lang.set(lang);
  }

  toggle(): void {
    this._lang.update((l) => (l === 'it' ? 'en' : 'it'));
  }

  t(key: StringKey): string {
    return this.strings()[key] ?? key;
  }
}
