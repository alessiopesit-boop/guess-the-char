export interface Avatar {
  id: number;
  glyph: string;
  label: string;
}

export const AVATARS: ReadonlyArray<Avatar> = [
  { id: 0,  glyph: '字', label: 'Han'        },
  { id: 1,  glyph: 'あ', label: 'Hiragana'   },
  { id: 2,  glyph: '한', label: 'Hangul'     },
  { id: 3,  glyph: 'श', label: 'Devanagari'  },
  { id: 4,  glyph: 'ش', label: 'Arabic'      },
  { id: 5,  glyph: 'Ω', label: 'Greek'       },
  { id: 6,  glyph: 'ก', label: 'Thai'        },
  { id: 7,  glyph: 'א', label: 'Hebrew'      },
  { id: 8,  glyph: 'Ⴀ', label: 'Georgian'    },
  { id: 9,  glyph: 'Հ', label: 'Armenian'    },
  { id: 10, glyph: 'Ж', label: 'Cyrillic'    },
  { id: 11, glyph: 'অ', label: 'Bengali'     },
];

export function avatarById(id: number | null | undefined): Avatar {
  if (id == null) return AVATARS[0];
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
