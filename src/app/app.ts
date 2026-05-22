import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { AppStateService } from './core/state/app-state.service';
import { ACCENT_PALETTES } from './core/state/types';
import { BUILD_CONTEXT } from './core/build-info';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly appState = inject(AppStateService);
  private readonly title = inject(Title);

  constructor() {
    // In sviluppo, prefissa il nome della scheda con "[dev] " per distinguere a
    // colpo d'occhio le build locali da quelle pubblicate. In production il
    // file fileReplaced ha BUILD_CONTEXT='release' e il title resta com'e'.
    if (BUILD_CONTEXT === 'dev') {
      const base = this.title.getTitle() || 'Indovina il carattere';
      if (!base.startsWith('[dev] ')) this.title.setTitle(`[dev] ${base}`);
    }

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
