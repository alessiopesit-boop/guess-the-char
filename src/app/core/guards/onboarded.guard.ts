import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from '../state/app-state.service';

/**
 * Blocca l'ingresso alle schermate principali se l'utente non ha ancora
 * concluso (o saltato) il flusso di onboarding.
 */
export const onboardedGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);
  if (appState.state().onboarded) return true;
  return router.parseUrl('/onboarding');
};
