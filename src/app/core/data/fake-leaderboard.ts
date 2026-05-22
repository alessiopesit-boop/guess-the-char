import { AVATARS } from './avatars';
import { mulberry32, seedFromDate } from './quiz';
import { AppState } from '../state/types';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

export interface LeaderboardRow {
  name: string;
  score: number;
  avatarId: number;
  isSelf?: boolean;
}

export const FAKE_NAMES: ReadonlyArray<string> = [
  'kanjiwave', 'glyphpilot', 'ms.silk', 'runa', '八千代', 'sutradhar', 'meridian',
  'kashida', 'varaha', 'phonema', 'typewriter', 'rōmaji', 'akshara', 'script_kid',
  'ojibe', 'mantra-08', 'shoji', 'helvetica-rio', 'noh', 'lapidary', 'vinyāsa',
  'cursive', 'baseline', 'xerxes', 'viraam', 'phrygian', 'beit-din', 'aksharavarna',
  'naskh', 'sanmari', 'rashida', 'typo-ji', 'panini', 'korean.tilde', 'tāra',
];

/**
 * Deterministic mock leaderboard. Real implementation will query Firestore.
 * The same period+date produces the same rows on every reload.
 */
export function fakeLeaderboard(
  period: LeaderboardPeriod,
  mySelf?: { nickname: string; avatar: number; stats: AppState } | null,
): LeaderboardRow[] {
  const today = new Date();
  let seed: number;
  if (period === 'daily') {
    seed = seedFromDate(today);
  } else if (period === 'weekly') {
    seed = seedFromDate(
      new Date(today.getFullYear(), today.getMonth(), Math.floor(today.getDate() / 7) * 7),
    );
  } else if (period === 'monthly') {
    seed = seedFromDate(new Date(today.getFullYear(), today.getMonth(), 1));
  } else {
    seed = 91234567;
  }
  const rng = mulberry32(seed);
  const ceiling =
    period === 'daily' ? 500 : period === 'weekly' ? 2400 : period === 'monthly' ? 7200 : 41000;

  const rows: LeaderboardRow[] = FAKE_NAMES.map((name, i) => {
    const score = Math.max(
      1,
      Math.floor(ceiling * (1 - i / FAKE_NAMES.length) - rng() * (ceiling / 24)),
    );
    const avatarId = Math.floor(rng() * AVATARS.length);
    return { name, score, avatarId };
  }).sort((a, b) => b.score - a.score);

  if (mySelf) {
    const s = mySelf.stats;
    const myScore =
      period === 'daily'
        ? s.dailyScore * 50 + s.dailyStreak * 10
        : period === 'weekly'
          ? s.played * 3 + s.bestStreak * 8
          : period === 'monthly'
            ? s.played * 5
            : s.played * 8 + s.bestStreak * 12;

    const meRow: LeaderboardRow = {
      name: mySelf.nickname,
      score: myScore,
      avatarId: mySelf.avatar,
      isSelf: true,
    };

    let inserted = false;
    for (let i = 0; i < rows.length; i++) {
      if (myScore >= rows[i].score) {
        rows.splice(i, 0, meRow);
        inserted = true;
        break;
      }
    }
    if (!inserted) rows.push(meRow);
  }

  return rows.slice(0, 30);
}
