import { Lang } from '../state/types';
import { ScriptInfo } from './scripts';

/**
 * Suggerimento testuale mostrato in modalita' allenamento la prima volta che
 * l'utente sbaglia in assoluto (banner ambra in feedback bar).
 */
export function scriptHint(s: ScriptInfo, lang: Lang): string {
  const isIt = lang === 'it';
  const hints: Record<string, { it: string; en: string }> = {
    devanagari: {
      it: 'Devanagari: cerca la linea orizzontale sopra le lettere.',
      en: 'Devanagari: look for the horizontal line above the letters.',
    },
    bengali: {
      it: 'Bengalese: linea sopra, ma con curve piu\' morbide del devanagari.',
      en: 'Bengali: line above, with softer curves than Devanagari.',
    },
    arabic: {
      it: 'Arabo: cursivo, da destra a sinistra. Punti sopra e sotto.',
      en: 'Arabic: cursive, right-to-left. Dots above and below.',
    },
    hebrew: {
      it: 'Ebraico: lettere squadrate, da destra a sinistra.',
      en: 'Hebrew: squared, right-to-left.',
    },
    hiragana: {
      it: 'Hiragana: forme tondeggianti e morbide.',
      en: 'Hiragana: rounded, soft shapes.',
    },
    katakana: {
      it: 'Katakana: angoli netti, tratti separati.',
      en: 'Katakana: sharp angles, separate strokes.',
    },
    hangul: {
      it: 'Hangul: blocchi sillabici, spesso un cerchio o un quadrato.',
      en: 'Hangul: syllabic blocks, often a circle or square.',
    },
    thai: {
      it: 'Thai: cerca i piccoli "loop" iniziali nelle consonanti.',
      en: 'Thai: small initial "loops" in consonants.',
    },
    greek: {
      it: 'Greco: Φ, Ψ, Ω sono inconfondibili.',
      en: 'Greek: Φ, Ψ, Ω are unmistakable.',
    },
    cyrillic: {
      it: 'Cirillico: Ж, Я, Ы non esistono in altri alfabeti.',
      en: 'Cyrillic: Ж, Я, Ы don\'t appear elsewhere.',
    },
  };
  const found = hints[s.id];
  if (found) return isIt ? found.it : found.en;
  return isIt
    ? `${s.nameIt} viene da ${s.region}.`
    : `${s.nameEn} comes from ${s.region}.`;
}
