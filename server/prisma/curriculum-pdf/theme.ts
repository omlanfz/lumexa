// One palette per program, so each PDF has its own colour and gradient while the tests keep one
// look everywhere (deep navy with a gold edge — the "checkpoint" colour of every document).

import type { ThemeKey } from './types';

export interface Theme {
  key: ThemeKey;
  /** Darkest tone: hero base, headings on tinted cards. */
  deep: string;
  /** The program colour. */
  main: string;
  /** Lightest tone of the hero gradient. */
  light: string;
  /** Very light tint for cards and chips. */
  soft: string;
  /** Text colour on `soft`. */
  ink: string;
  /** Page-edge glow behind the cover. */
  glow: string;
  /** One gradient per course (cycled when a program has more courses). */
  courses: [string, string][];
}

export const GOLD = '#FFC83D';
export const NAVY = '#15133F';

export const THEMES: Record<ThemeKey, Theme> = {
  odyssey: {
    key: 'odyssey',
    deep: '#1B1763',
    main: '#5B3FE8',
    light: '#3B82F6',
    soft: '#F1EFFE',
    ink: '#3B2BA8',
    glow: '#E4DEFF',
    courses: [
      ['#7C3AED', '#A78BFA'],
      ['#EA580C', '#FDBA74'],
      ['#DB2777', '#F9A8D4'],
      ['#2563EB', '#7DB3FF'],
      ['#059669', '#6EE7B7'],
      ['#D97706', '#FCD34D'],
      ['#0D9488', '#5EEAD4'],
      ['#9333EA', '#E879F9'],
      ['#DC2626', '#FCA5A5'],
    ],
  },
  little: {
    key: 'little',
    deep: '#9A3412',
    main: '#F59E0B',
    light: '#FDE047',
    soft: '#FFF6E0',
    ink: '#B45309',
    glow: '#FFE7B8',
    courses: [
      ['#F59E0B', '#FDBA4D'],
      ['#F97316', '#FDA15C'],
      ['#8B5CF6', '#C4A3FF'],
      ['#10B981', '#5FDDB0'],
      ['#0EA5E9', '#6FCBF7'],
    ],
  },
  game: {
    key: 'game',
    deep: '#7A1620',
    main: '#E11D48',
    light: '#FB923C',
    soft: '#FFF0F2',
    ink: '#B3123A',
    glow: '#FFD9DF',
    courses: [
      ['#DC2626', '#FB923C'],
      ['#EA580C', '#FBBF24'],
      ['#BE185D', '#F472B6'],
    ],
  },
  ai: {
    key: 'ai',
    deep: '#2E0A63',
    main: '#7C3AED',
    light: '#E879F9',
    soft: '#F6EFFF',
    ink: '#5B21B6',
    glow: '#E9D8FF',
    courses: [
      ['#7C3AED', '#A78BFA'],
      ['#4F46E5', '#7DA0FF'],
      ['#C026D3', '#F0A5FF'],
    ],
  },
  web: {
    key: 'web',
    deep: '#0B3A66',
    main: '#2563EB',
    light: '#22D3EE',
    soft: '#EAF4FF',
    ink: '#1D4ED8',
    glow: '#CFE6FF',
    courses: [
      ['#2563EB', '#6FA8FF'],
      ['#0891B2', '#4FE0F5'],
      ['#4F46E5', '#8FA2FF'],
    ],
  },
  data: {
    key: 'data',
    deep: '#043B3A',
    main: '#0D9488',
    light: '#5EEAD4',
    soft: '#E9FBF8',
    ink: '#0F766E',
    glow: '#C5F3EB',
    courses: [
      ['#0D9488', '#4FE3D0'],
      ['#0284C7', '#5BC4F5'],
      ['#16A34A', '#6FE08F'],
    ],
  },
  ads: {
    key: 'ads',
    deep: '#1C1659',
    main: '#6D3AF0',
    light: '#38BDF8',
    soft: '#F2EEFF',
    ink: '#4C2BC4',
    glow: '#E2DAFF',
    courses: [
      ['#6D3AF0', '#A78BFA'],
      ['#EA6A0C', '#FBBF4B'],
      ['#2A7DE1', '#6CC4F6'],
      ['#0E9F87', '#4FD8B8'],
      ['#C8265F', '#F27BA4'],
    ],
  },
  digital: {
    key: 'digital',
    deep: '#123B2A',
    main: '#16A34A',
    light: '#A3E635',
    soft: '#EFFBEF',
    ink: '#157A3A',
    glow: '#D3F5D6',
    courses: [
      ['#15803D', '#58D68D'],
      ['#CA8A04', '#FACC15'],
      ['#0F766E', '#5EDBC7'],
    ],
  },
};
