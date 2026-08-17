// Design system — one light palette, one shape language.
//
// Light only, by decision: a single palette means every surface, shadow and
// contrast pair is tuned once and actually checked, rather than two half-tuned
// sets. Colour is still read through `useColors()` in theme.ts, so a second
// palette can be reintroduced later without touching a single screen.
//
// Direction: warm and soft rather than clinical. The ground is a warm sand,
// cards are near-white and float on generous radii, and a single terracotta
// carries every primary action. Supporting colours are muted, never saturated.

export interface Palette {
  // grounds, low → high elevation
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

  /** calm secondary, used for "done" and positive states */
  mint: string;
  mintSoft: string;
  /** warm secondary, used for in-progress and attention */
  sun: string;
  sunSoft: string;

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

  shadowColor: string;
  shadowOpacity: number;
}

export const palette: Palette = {
  // Warm sand, not white — paper you'd want to work on for hours.
  bg: '#F6F3ED',
  surface: '#FFFFFF',
  surface2: '#F0ECE3',
  surface3: '#E5DFD2',

  border: '#E7E1D6',
  borderSoft: '#F0ECE3',

  // Terracotta: warmer and friendlier than the old fire-engine red, and it sits
  // naturally on sand instead of vibrating against it.
  accent: '#D2593C',
  accentDim: '#EBB3A2',
  accentSoft: '#FBEDE8',
  onAccent: '#FFFFFF',

  mint: '#4C9A78',
  mintSoft: '#E4F1EA',
  sun: '#D99A2B',
  sunSoft: '#FBF0DC',

  // Deep warm brown rather than black: softer, and it belongs to the ground.
  text: '#2A2420',
  textMuted: '#736A61',
  textFaint: '#A79D91',

  easy: '#4C9A78',
  medium: '#D99A2B',
  hard: '#D2593C',

  warmup: '#4C9A78',
  core: '#D99A2B',
  interview: '#C97544',
  hardTier: '#D2593C',

  // Pale → saturated, so an empty day reads as genuinely empty.
  heat0: '#EAE5DA',
  heat1: '#F7D9CD',
  heat2: '#EDAF97',
  heat3: '#DF8163',
  heat4: '#D2593C',

  shadowColor: '#4A3B2E',
  shadowOpacity: 0.09,
};

// ---------- shape & rhythm ----------

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36,
};

// Generous radii are the single biggest thing separating a considered layout
// from a default one. Cards are soft; anything interactive is a pill or circle.
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
