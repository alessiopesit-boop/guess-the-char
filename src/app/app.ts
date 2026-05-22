import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppStateService } from './core/state/app-state.service';
import { ACCENT_PALETTES } from './core/state/types';
import { APP_VERSION, BUILD_CONTEXT, BUILD_SHA } from './core/build-info';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly appState = inject(AppStateService);
  /** Stringa minuscola in basso a destra: hash di commit in dev, vX.Y.Z in release. */
  protected readonly buildLabel =
    BUILD_CONTEXT === 'release' ? `v${APP_VERSION}` : `v${APP_VERSION} · dev · ${BUILD_SHA}`;

  constructor() {
    // Applica i token del tema sul root <html> ogni volta che cambia lo stato.
    effect(() => {
      const s = this.appState.state();
      const root = document.documentElement;
      const pal = ACCENT_PALETTES[s.accent];
      if (pal) {
        root.style.setProperty('--accent', pal.accent);
        root.style.setProperty('--accent-2', pal.accent2);
        root.style.setProperty('--accent-contrast', pal.contrast);
      }
      root.setAttribute('data-motion', s.motion);
      root.setAttribute('data-cb', s.colorblind);
    });
  }
}
