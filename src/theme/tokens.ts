// Design system — two palettes, one shape language.
//
// The app follows the phone's colour scheme. Both palettes define exactly the
// same keys, so a screen never has to know which one it is rendering; it reads
// `useColors()` and the values swap underneath it.
//
// Shape and type are deliberately NOT themed: a card has the same generous
// radius and the same typographic rhythm in both modes. Only colour changes.

export interface Palette {
  // three grounds, low → high elevation
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;

  border: string;
  borderSoft: string;

  accent: string;
  accentDim: string;
  accentSoft: string;
  /** text/icons sitting on top of a filled accent */
  onAccent: string;

  text: string;
  textMuted: string;
  textFaint: string;

  easy: string;
  medium: string;
  hard: string;

  warmup: string;
  core: string;
  interview: string;
  hardTier: string;

  heat0: string;
  heat1: string;
  heat2: string;
  heat3: string;
  heat4: string;

  /** ambient shadow colour — near-black in light, pure black in dark */
  shadowColor: string;
  shadowOpacity: number;
}

// Warm off-white rather than pure white: paper, not a spreadsheet. Greys carry
// a slight warm cast so they sit with the red accent instead of fighting it.
export const lightPalette: Palette = {
  bg: '#F4F2EE',
  surface: '#FFFFFF',
  surface2: '#EEEBE5',
  surface3: '#E4E0D8',

  border: '#E2DED6',
  borderSoft: '#EDEAE4',

  accent: '#C8362F',
  accentDim: '#E8A9A5',
  accentSoft: 'rgba(200,54,47,0.10)',
  onAccent: '#FFFFFF',

  text: '#1B1A18',
  textMuted: '#6E6A63',
  textFaint: '#A19C93',

  easy: '#3E8E5F',
  medium: '#B08417',
  hard: '#C8362F',

  warmup: '#3E8E5F',
  core: '#B08417',
  interview: '#C97544',
  hardTier: '#C8362F',

  // Light-mode heat ramp runs pale → saturated so an empty day reads as
  // "nothing here" rather than as a filled square.
  heat0: '#E7E3DB',
  heat1: '#F3C9C4',
  heat2: '#E39A93',
  heat3: '#D2635B',
  heat4: '#C8362F',

  shadowColor: '#3A332B',
  shadowOpacity: 0.10,
};

export const darkPalette: Palette = {
  bg: '#0E0E10',
  surface: '#17171A',
  surface2: '#202024',
  surface3: '#2A2A30',

  border: '#2A2A30',
  borderSoft: '#1E1E22',

  accent: '#E5393B',
  accentDim: '#A01F2E',
  accentSoft: 'rgba(229,57,59,0.12)',
  onAccent: '#FFFFFF',

  text: '#EDE7E7',
  textMuted: '#A49B9C',
  textFaint: '#6B6466',

  easy: '#4A9D6A',
  medium: '#C9A227',
  hard: '#E5393B',

  warmup: '#4A9D6A',
  core: '#C9A227',
  interview: '#E5936B',
  hardTier: '#E5393B',

  heat0: '#1A1A1E',
  heat1: '#3A2224',
  heat2: '#6E2429',
  heat3: '#A62630',
  heat4: '#E5393B',

  shadowColor: '#000000',
  shadowOpacity: 0.35,
};

// ---------- shape & rhythm (theme-independent) ----------

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36,
};

// Generous radii are the single biggest thing separating a considered layout
// from a default one. Cards are soft; anything interactive is a full pill or a
// circle.
export const radius = {
  sm: 10, md: 16, lg: 22, xl: 28, xxl: 34, pill: 999,
};

/** Standard circular control sizes, so buttons match across screens. */
export const circle = {
  sm: 36, md: 44, lg: 56, xl: 64,
};

/**
 * Bottom padding every scrolling screen needs so its last row clears the
 * floating tab bar. Tab bar is 68 tall, sits 18-28 from the bottom.
 */
export const tabInset = 118;

export const type = {
  display: 'Archivo_800ExtraBold',
  heading: 'Archivo_600SemiBold',
  body: 'Archivo_400Regular',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
};

/** Shadows need the palette, since light mode wants a warm, much softer lift. */
export const shadows = (p: Palette) => ({
  card: {
    shadowColor: p.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: p.shadowOpacity,
    shadowRadius: 16,
    elevation: 3,
  },
  raised: {
    shadowColor: p.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: p.shadowOpacity * 1.3,
    shadowRadius: 28,
    elevation: 8,
  },
});

export const difficultyColor = (p: Palette, d: string) =>
  d === 'Easy' ? p.easy : d === 'Medium' ? p.medium : p.hard;

export const tierColor = (p: Palette, t: string) =>
  t === 'warmup' ? p.warmup :
  t === 'core' ? p.core :
  t === 'interview' ? p.interview : p.hardTier;
