/**
 * Config pubblico Firebase. NON E' un segreto: la apiKey identifica solo il
 * progetto e va restritta lato Google Cloud Console via HTTP referrer allow-list
 * (localhost:4200 + alessiopesit-boop.github.io). La sicurezza vera vive nelle
 * regole Firestore + Auth providers, non qui.
 *
 * I valori reali vanno incollati dopo aver creato il progetto su
 * console.firebase.google.com (vedi guida in CLAUDE.md sezione "Firebase").
 * Finche' sono PLACEHOLDER l'app rileva la condizione e disabilita il bootstrap
 * di Firebase (vedi firebase.ts), cosi' lo sviluppo locale non blocca nulla.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'PLACEHOLDER_API_KEY',
  authDomain: 'PLACEHOLDER.firebaseapp.com',
  projectId: 'PLACEHOLDER_PROJECT_ID',
  storageBucket: 'PLACEHOLDER.appspot.com',
  messagingSenderId: 'PLACEHOLDER_SENDER_ID',
  appId: 'PLACEHOLDER_APP_ID',
} as const;

/** True se il config e' ancora valori PLACEHOLDER e non valori reali. */
export function isFirebaseConfigured(): boolean {
  return !FIREBASE_CONFIG.apiKey.startsWith('PLACEHOLDER');
}
