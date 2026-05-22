import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      // Transizioni di route con la View Transitions API nativa del browser
      // (Chrome/Edge moderni). Crossfade morbido tra schermate; sui browser che
      // non supportano la API il cambio resta istantaneo, niente di rotto.
      withViewTransitions(),
    ),
  ],
};
