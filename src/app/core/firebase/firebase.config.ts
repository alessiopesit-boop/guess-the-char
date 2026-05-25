/**
 * Config pubblico Firebase. NON E' un segreto: la apiKey identifica solo il
 * progetto e va restritta lato Google Cloud Console via HTTP referrer allow-list
 * (localhost:4200 + alessiopesit-boop.github.io). La sicurezza vera vive nelle
 * regole Firestore + Auth providers, non qui.
 *
 * measurementId e' presente solo se in fase di setup e' stato attivato Google
 * Analytics; non lo consumiamo lato SDK (non inizializziamo getAnalytics()),
 * lo lasciamo qui solo per allinearci al formato del config ufficiale.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCMR6E0AUZs1XCK6V05X17-ecv37cpElNc',
  authDomain: 'guess-the-char-48f68.firebaseapp.com',
  projectId: 'guess-the-char-48f68',
  storageBucket: 'guess-the-char-48f68.firebasestorage.app',
  messagingSenderId: '1006327769183',
  appId: '1:1006327769183:web:b6edca0946159ce07693ea',
  measurementId: 'G-6B7VRVE719',
} as const;

/** True se il config e' configurato con valori reali (non placeholder).
 *  L'app cade graziosamente in modalita' "solo locale" se non lo e'. */
export function isFirebaseConfigured(): boolean {
  return !FIREBASE_CONFIG.apiKey.startsWith('PLACEHOLDER');
}
