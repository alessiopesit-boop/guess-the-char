import { Injectable, effect, signal } from '@angular/core';
import { AppState, DEFAULT_STATE } from './types';

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
  private readonly _state = signal<AppState>(loadState());
  readonly state = this._state.asReadonly();

  constructor() {
    effect(() => {
      const s = this._state();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch {
        // localStorage quota o private mode: stato vive solo in memoria
      }
    });
  }

  update(partial: Partial<AppState>): void {
    this._state.update((s) => ({ ...s, ...partial }));
  }

  patch(updater: (s: AppState) => AppState): void {
    this._state.update(updater);
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
