import { SCRIPTS, ScriptInfo, scriptById } from './scripts';

export interface Question {
  correct: ScriptInfo;
  glyph: string;
  options: ScriptInfo[];
  cp: string;
}

export type Rng = () => number;

/** Deterministic PRNG (Mulberry32) so daily challenges are stable per seed. */
export function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a YYYY-M-D string to a 32-bit seed (FNV-1a). */
export function seedFromDate(d: Date = new Date()): number {
  const s = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Build a quiz question. `selectedIds` is the pool the correct answer is drawn
 * from; distractors prefer the same pool but fall back to the full catalog.
 * `prevId` is avoided as the correct answer when possible (no two in a row).
 */
export function buildQuestion(
  rng: Rng,
  selectedIds: ReadonlyArray<string>,
  prevId: string | null,
): Question {
  let pool = selectedIds.slice();
  if (pool.length < 2) {
    pool = SCRIPTS.map((s) => s.id);
  }

  let correctId = pool[0];
  for (let tries = 0; tries < 4; tries++) {
    correctId = pool[Math.floor(rng() * pool.length)];
    if (correctId !== prevId) break;
  }

  const correct = scriptById(correctId);
  if (!correct) {
    throw new Error(`Unknown script id: ${correctId}`);
  }
  const glyph = correct.samples[Math.floor(rng() * correct.samples.length)];

  const others = pool.filter((id) => id !== correctId);
  const shuffled = others.slice().sort(() => rng() - 0.5);
  const distractors: ScriptInfo[] = shuffled
    .slice(0, 3)
    .map((id) => scriptById(id))
    .filter((s): s is ScriptInfo => !!s);

  while (distractors.length < 3) {
    const candidate = SCRIPTS[Math.floor(rng() * SCRIPTS.length)];
    if (candidate.id !== correctId && !distractors.find((d) => d.id === candidate.id)) {
      distractors.push(candidate);
    }
  }

  const options = [correct, ...distractors].sort(() => rng() - 0.5);
  const cp = (glyph.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0');

  return { correct, glyph, options, cp };
}
