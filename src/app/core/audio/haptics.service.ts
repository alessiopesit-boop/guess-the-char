import { Injectable, inject } from '@angular/core';
import { AppStateService } from '../state/app-state.service';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly appState = inject(AppStateService);

  vibrate(ms = 12): void {
    if (!this.appState.state().haptics) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      // Vibration API non supportata
    }
  }
}
