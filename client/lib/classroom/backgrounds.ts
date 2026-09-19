// FILE PATH: client/lib/classroom/backgrounds.ts
//
// The curated Lumexa virtual-background gallery offered in the Video Effects
// panel. Images live in /public/classroom-backgrounds — generated brand
// gradients/patterns, kept subtle and professional (no cartoon scenes).

export interface LumexaBackground {
  id: string;
  label: string;
  imagePath: string;
  thumbnailPath: string;
}

export const LUMEXA_BACKGROUNDS: LumexaBackground[] = [
  {
    id: 'blue-classroom',
    label: 'Lumexa Blue Classroom',
    imagePath: '/classroom-backgrounds/blue-classroom.jpg',
    thumbnailPath: '/classroom-backgrounds/blue-classroom.jpg',
  },
  {
    id: 'space-lab',
    label: 'Lumexa Space Lab',
    imagePath: '/classroom-backgrounds/space-lab.jpg',
    thumbnailPath: '/classroom-backgrounds/space-lab.jpg',
  },
  {
    id: 'ai-lab',
    label: 'Lumexa AI Lab',
    imagePath: '/classroom-backgrounds/ai-lab.jpg',
    thumbnailPath: '/classroom-backgrounds/ai-lab.jpg',
  },
  {
    id: 'coding-studio',
    label: 'Lumexa Coding Studio',
    imagePath: '/classroom-backgrounds/coding-studio.jpg',
    thumbnailPath: '/classroom-backgrounds/coding-studio.jpg',
  },
  {
    id: 'dark-space',
    label: 'Lumexa Dark Space',
    imagePath: '/classroom-backgrounds/dark-space.jpg',
    thumbnailPath: '/classroom-backgrounds/dark-space.jpg',
  },
  {
    id: 'gradient',
    label: 'Lumexa Gradient',
    imagePath: '/classroom-backgrounds/gradient.jpg',
    thumbnailPath: '/classroom-backgrounds/gradient.jpg',
  },
];

export type BackgroundEffect =
  | { mode: 'none' }
  | { mode: 'blur-slight' }
  | { mode: 'blur' }
  | { mode: 'image'; imagePath: string; label: string };

export const DEFAULT_BACKGROUND_EFFECT: BackgroundEffect = { mode: 'none' };
