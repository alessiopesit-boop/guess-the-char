import { Routes } from '@angular/router';
import { onboardedGuard } from './core/guards/onboarded.guard';

const comingSoon = () => import('./shared/coming-soon').then((m) => m.ComingSoon);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'home',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },

  // Stub navigabili: verranno sostituiti progressivamente con i veri componenti.
  {
    path: 'selection',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/selection/selection').then((m) => m.Selection),
  },
  { path: 'game',              canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'daily',             canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'daily-result',      canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'session-result',    canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'settings',          canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'badges',            canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'script/:id',        canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'glyph/:scriptId/:cp', canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'feedback',          canActivate: [onboardedGuard], loadComponent: comingSoon },

  // Aree social: stub fino alla 1.1.0 con Firebase.
  { path: 'login',             loadComponent: comingSoon },
  { path: 'profile',           canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'leaderboard',       canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'u/:nickname',       loadComponent: comingSoon },

  { path: '**', redirectTo: 'home' },
];
