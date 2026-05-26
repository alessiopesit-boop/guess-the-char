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
  {
    path: 'feedback',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/feedback/feedback').then((m) => m.Feedback),
  },

  // Pagina di login vera, collegata a Firebase Auth. NO onboardedGuard:
  // deve essere accessibile anche prima dell'onboarding (es. dal banner della
  // sezione Impostazioni).
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },

  {
    path: 'profile',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },

  {
    path: 'search',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
  },
  {
    path: 'friends',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/friends/friends').then((m) => m.Friends),
  },

  // Sfide tra amici. L'ordine conta: /sfida/nuova/:toNickname deve venire
  // prima di /sfida/:id, altrimenti 'nuova' verrebbe interpretato come :id.
  {
    path: 'sfide',
    canActivate: [onboardedGuard],
    loadComponent: () =>
      import('./features/challenges-list/challenges-list').then((m) => m.ChallengesList),
  },
  {
    path: 'sfida/nuova/:toNickname',
    canActivate: [onboardedGuard],
    loadComponent: () =>
      import('./features/challenge-play/challenge-play').then((m) => m.ChallengePlay),
  },
  {
    path: 'sfida/:id',
    canActivate: [onboardedGuard],
    loadComponent: () =>
      import('./features/challenge-play/challenge-play').then((m) => m.ChallengePlay),
  },


  {
    path: 'leaderboard',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./features/leaderboard/leaderboard').then((m) => m.Leaderboard),
  },

  // Profilo pubblico di un utente qualunque. NO onboardedGuard: deve essere
  // raggiungibile anche da link condiviso fuori dall'app prima di essere
  // onboarded (nel caso l'utente non abbia ancora visto l'onboarding).
  {
    path: 'u/:nickname',
    loadComponent: () => import('./features/public-profile/public-profile').then((m) => m.PublicProfile),
  },

  { path: '**', redirectTo: 'home' },
];
