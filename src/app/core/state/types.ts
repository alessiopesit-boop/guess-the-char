export type Lang = 'it' | 'en';

export interface AccountInfo {
  email: string;
  nickname: string;
  avatar: number;
  provider: 'demo' | 'google' | 'apple' | 'email';
  joinedStamp: string;
}

export interface PerScriptStat {
  tries: number;
  correct: number;
}

export interface DailyHistoryEntry {
  day: string;
  score: number;
  stamp: string;
  results: boolean[];
}

export type AccentHex =
  | '#fbbf24'
  | '#7dd3fc'
  | '#a78bfa'
  | '#34d399'
  | '#fb923c'
  | '#f472b6';

export type MotionLevel = 'minimal' | 'playful' | 'rich';
export type ColorblindMode = 'none' | 'redgreen' | 'blueyellow';

export interface AppState {
  onboarded: boolean;
  selected: string[];
  streak: number;
  bestStreak: number;
  played: number;
  correctAnswers: number;
  accuracy: number;
  perScript: Record<string, PerScriptStat>;
  dailyDone: boolean;
  dailyDoneStamp: string | null;
  dailyScore: number;
  dailyStreak: number;
  dailyHistory: DailyHistoryEntry[];
  sound: boolean;
  haptics: boolean;
  showCodepoint: boolean;
  motion: MotionLevel;
  accent: AccentHex;
  colorblind: ColorblindMode;
  hintsLeft: number;
  account: AccountInfo | null;
  shownFirstWrong: boolean;
}

export const DEFAULT_STATE: AppState = {
  onboarded: false,
  // Nessuna scrittura selezionata di default: la prima volta che l'utente entra
  // in "Scegli le scritture" deve compiere una scelta esplicita. La sua scelta
  // viene poi memorizzata in localStorage e riproposta nelle sessioni seguenti.
  selected: [],
  streak: 0,
  bestStreak: 0,
  played: 0,
  correctAnswers: 0,
  accuracy: 0,
  perScript: {},
  dailyDone: false,
  dailyDoneStamp: null,
  dailyScore: 0,
  dailyStreak: 0,
  dailyHistory: [],
  sound: true,
  haptics: true,
  showCodepoint: false,
  motion: 'playful',
  accent: '#fbbf24',
  colorblind: 'none',
  hintsLeft: 1,
  account: null,
  shownFirstWrong: false,
};

export interface AccentPalette {
  accent: AccentHex;
  accent2: string;
  contrast: string;
  name: string;
}

export const ACCENT_PALETTES: Record<AccentHex, AccentPalette> = {
  '#fbbf24': { accent: '#fbbf24', accent2: '#f59e0b', contrast: '#3a2407', name: 'Amber' },
  '#7dd3fc': { accent: '#7dd3fc', accent2: '#38bdf8', contrast: '#06283c', name: 'Sky' },
  '#a78bfa': { accent: '#a78bfa', accent2: '#8b5cf6', contrast: '#1e1647', name: 'Violet' },
  '#34d399': { accent: '#34d399', accent2: '#10b981', contrast: '#052e1d', name: 'Mint' },
  '#fb923c': { accent: '#fb923c', accent2: '#f97316', contrast: '#3a1709', name: 'Orange' },
  '#f472b6': { accent: '#f472b6', accent2: '#ec4899', contrast: '#3a0b22', name: 'Pink' },
};
