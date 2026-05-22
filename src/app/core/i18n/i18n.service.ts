import { Injectable, computed, effect, signal } from '@angular/core';
import { Lang } from '../state/types';
import { STRINGS, StringKey } from './strings';

const STORAGE_KEY = 'gtc.lang';

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'it' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  return 'it';
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
