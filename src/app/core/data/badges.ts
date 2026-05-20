import { AppState } from '../state/types';
import { SCRIPTS, scriptById } from './scripts';
import { GROUPS } from './scripts';

export type BadgeTier = 'bronze' | 'silver' | 'gold';
export type BadgeGroup = 'streak' | 'accuracy' | 'volume' | 'daily' | 'breadth';

export interface BadgeDef {
  id: string;
  icon: string;
  tier: BadgeTier;
  group: BadgeGroup;
  titleIt: string;
  titleEn: string;
  descIt: string;
  descEn: string;
  questIt: string;
  check: (s: AppState) => number;
  target: number;
  valueOf: (s: AppState) => number;
}

export interface BadgeWithProgress extends BadgeDef {
  progress: number;
  unlocked: boolean;
}

export const BADGES: ReadonlyArray<BadgeDef> = [
  // STREAK
  {
    id: 'streak-5', icon: '🔥', tier: 'bronze', group: 'streak',
    titleIt: 'Calore', titleEn: 'Warmth',
    descIt: 'Raggiungi una striscia di 5 risposte corrette.',
    descEn: 'Reach a streak of 5 correct answers in a row.',
    questIt: 'Rispondi a 5 caratteri di fila senza sbagliare.',
    check: (s) => Math.min(1, s.bestStreak / 5),
    target: 5,
    valueOf: (s) => s.bestStreak,
  },
  {
    id: 'streak-15', icon: '🔥', tier: 'silver', group: 'streak',
    titleIt: 'Fiamma', titleEn: 'Flame',
    descIt: 'Striscia di 15 risposte corrette.',
    descEn: 'Streak of 15 correct answers.',
    questIt: 'Concatena 15 risposte giuste senza errori.',
    check: (s) => Math.min(1, s.bestStreak / 15),
    target: 15,
    valueOf: (s) => s.bestStreak,
  },
  {
    id: 'streak-50', icon: '🌋', tier: 'gold', group: 'streak',
    titleIt: 'Vulcano', titleEn: 'Volcano',
    descIt: 'Striscia di 50 risposte corrette.',
    descEn: 'Streak of 50 correct answers.',
    questIt: 'Cinquanta caratteri di fila, zero errori. Sublime.',
    check: (s) => Math.min(1, s.bestStreak / 50),
    target: 50,
    valueOf: (s) => s.bestStreak,
  },

  // ACCURACY
  {
    id: 'sharp-eye', icon: '🎯', tier: 'silver', group: 'accuracy',
    titleIt: 'Occhio fino', titleEn: 'Sharp eye',
    descIt: 'Mantieni precisione almeno dell\'80% su almeno 50 risposte.',
    descEn: 'Keep accuracy of at least 80% over at least 50 answers.',
    questIt: 'Gioca almeno 50 partite con precisione 80% o piu\'.',
    check: (s) =>
      s.played >= 50
        ? s.accuracy >= 80
          ? 1
          : s.accuracy / 80
        : (s.played / 50) * 0.4,
    target: 80,
    valueOf: (s) => s.accuracy,
  },

  // VOLUME
  {
    id: 'play-100', icon: '💯', tier: 'bronze', group: 'volume',
    titleIt: 'Centinaio', titleEn: 'A hundred',
    descIt: 'Rispondi a 100 caratteri.',
    descEn: 'Answer 100 characters.',
    questIt: 'Rispondi a un totale di 100 caratteri (anche sbagliando).',
    check: (s) => Math.min(1, s.played / 100),
    target: 100,
    valueOf: (s) => s.played,
  },
  {
    id: 'play-500', icon: '📚', tier: 'gold', group: 'volume',
    titleIt: 'Bibliotecario', titleEn: 'Librarian',
    descIt: 'Rispondi a 500 caratteri.',
    descEn: 'Answer 500 characters.',
    questIt: 'Cinquecento caratteri visti. Sei in viaggio.',
    check: (s) => Math.min(1, s.played / 500),
    target: 500,
    valueOf: (s) => s.played,
  },

  // DAILY
  {
    id: 'daily-streak-7', icon: '📅', tier: 'silver', group: 'daily',
    titleIt: 'Settimana piena', titleEn: 'Full week',
    descIt: 'Completa la sfida giornaliera per 7 giorni di fila.',
    descEn: 'Finish the daily challenge 7 days in a row.',
    questIt: 'Una sfida al giorno per 7 giorni consecutivi.',
    check: (s) => Math.min(1, (s.dailyStreak || 0) / 7),
    target: 7,
    valueOf: (s) => s.dailyStreak || 0,
  },
  {
    id: 'daily-perfect', icon: '⭐', tier: 'gold', group: 'daily',
    titleIt: 'Tutta intera', titleEn: 'Flawless',
    descIt: 'Concludi una sfida giornaliera con 5 su 5.',
    descEn: 'Get a perfect 5 out of 5 on a daily challenge.',
    questIt: 'Cinque caratteri, cinque risposte giuste.',
    check: (s) => ((s.dailyHistory || []).some((d) => d.score === 5) ? 1 : 0),
    target: 5,
    valueOf: (s) => Math.max(0, ...(s.dailyHistory || []).map((d) => d.score)),
  },

  // BREADTH
  {
    id: 'all-groups', icon: '🌍', tier: 'gold', group: 'breadth',
    titleIt: 'Cinque continenti', titleEn: 'Five continents',
    descIt: 'Indovina almeno un carattere per ogni gruppo di scritture.',
    descEn: 'Get at least one correct in every script group.',
    questIt: 'Una risposta corretta in ognuno dei 5 gruppi.',
    check: (s) => {
      const ok = new Set<string>();
      for (const [id, v] of Object.entries(s.perScript || {})) {
        if (v.correct > 0) {
          const script = scriptById(id);
          if (script) ok.add(script.group);
        }
      }
      return ok.size / GROUPS.length;
    },
    target: 5,
    valueOf: (s) => {
      const ok = new Set<string>();
      for (const [id, v] of Object.entries(s.perScript || {})) {
        if (v.correct > 0) {
          const script = scriptById(id);
          if (script) ok.add(script.group);
        }
      }
      return ok.size;
    },
  },
  {
    id: 'all-scripts', icon: '🗺️', tier: 'gold', group: 'breadth',
    titleIt: 'Atlante', titleEn: 'Atlas',
    descIt: 'Affronta almeno una volta tutte le scritture.',
    descEn: 'Encounter every script at least once.',
    questIt: 'Vedi ogni scrittura del catalogo almeno una volta.',
    check: (s) => Object.keys(s.perScript || {}).length / SCRIPTS.length,
    target: SCRIPTS.length,
    valueOf: (s) => Object.keys(s.perScript || {}).length,
  },
];

export function computeBadges(state: AppState): BadgeWithProgress[] {
  return BADGES.map((b) => {
    const p = Math.max(0, Math.min(1, b.check(state)));
    return { ...b, progress: p, unlocked: p >= 1 };
  });
}
