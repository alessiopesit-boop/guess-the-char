import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { FIREBASE_CONFIG, isFirebaseConfigured } from './firebase.config';

/**
 * Inizializza l'app Firebase una sola volta (idempotente). Se il config e'
 * ancora a PLACEHOLDER, restituisce null e l'app continua a girare in modalita'
 * "solo locale" (niente login, niente sync). In console viene loggato un
 * avviso una volta sola.
 *
 * Chiamata in app.config.ts come parte dei providers, cosi' Firebase e' pronto
 * prima che qualunque service ci sia agganciato.
 */
let warned = false;

export function ensureFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    if (!warned) {
      warned = true;
      console.info(
        '[firebase] Config ancora a PLACEHOLDER, login disabilitato. ' +
          'Vedi CLAUDE.md > Firebase per i passi di setup.',
      );
    }
    return null;
  }
  if (getApps().length > 0) return getApp();
  return initializeApp(FIREBASE_CONFIG);
}
