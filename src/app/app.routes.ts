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
  {
    path: 'game',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/game/game').then((m) => m.Game),
  },
  {
    path: 'daily',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/game/game').then((m) => m.Game),
  },
  {
    path: 'daily-result',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/daily-result/daily-result').then((m) => m.DailyResult),
  },
  {
    path: 'session-result',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/session-result/session-result').then((m) => m.SessionResult),
  },
  {
    path: 'settings',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
  },
  {
    path: 'badges',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/badges/badges').then((m) => m.Badges),
  },
  {
    path: 'script/:id',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/script-detail/script-detail').then((m) => m.ScriptDetail),
  },
  {
    path: 'glyph/:scriptId/:cp',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/glyph-detail/glyph-detail').then((m) => m.GlyphDetail),
  },
  { path: 'feedback',          canActivate: [onboardedGuard], loadComponent: comingSoon },

  // Pagina di login vera, collegata a Firebase Auth. NO onboardedGuard:
  // deve essere accessibile anche prima dell'onboarding (es. dal banner della
  // sezione Impostazioni).
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },

  // Aree social ancora stub: profilo pubblico, classifica, sfide tra amici.
  { path: 'profile',           canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'leaderboard',       canActivate: [onboardedGuard], loadComponent: comingSoon },
  { path: 'u/:nickname',       loadComponent: comingSoon },

  { path: '**', redirectTo: 'home' },
];
