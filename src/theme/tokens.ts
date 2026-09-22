// Design system — two palettes with identical keys, one shape language.
//
// The app follows the phone's light/dark setting. Colour is read through
// `useColors()` in theme.ts, never imported directly by a screen, so both
// palettes stay drop-in replacements for each other.
//
// Direction: warm and soft rather than clinical. Light is warm sand with
// near-white cards; dark is warm charcoal (brown-black, not blue-black) so the
// terracotta accent belongs to both. Supporting colours are muted, never
// saturated.

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

  /** Hairline around cards. Transparent in light (shadows carry depth); in
   *  dark a shadow is invisible, so the edge has to do that job. */
  cardBorder: string;
  /** Dimmed backdrop behind bottom sheets and modals. */
  scrim: string;

  shadowColor: string;
  shadowOpacity: number;
}

export const lightPalette: Palette = {
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

  cardBorder: 'transparent',
  scrim: 'rgba(42,36,32,0.45)',

  shadowColor: '#4A3B2E',
  shadowOpacity: 0.09,
};

// Warm charcoal. The accent is lifted a step so it holds contrast on a dark
// ground, and text on it flips to near-black — white on a mid terracotta is
// under 3.5:1, dark ink on it is well over 5.
export const darkPalette: Palette = {
  bg: '#141210',
  surface: '#1D1A17',
  surface2: '#27231F',
  surface3: '#322D28',

  border: '#36302A',
  borderSoft: '#26221E',

  accent: '#E57A57',
  accentDim: '#7E3E2B',
  accentSoft: 'rgba(229,122,87,0.14)',
  onAccent: '#1A110C',

  mint: '#62B68F',
  mintSoft: 'rgba(98,182,143,0.14)',
  sun: '#E4AE4C',
  sunSoft: 'rgba(228,174,76,0.14)',

  text: '#F2ECE4',
  textMuted: '#B3A898',
  textFaint: '#7D7367',

  easy: '#62B68F',
  medium: '#E4AE4C',
  hard: '#E57A57',

  warmup: '#62B68F',
  core: '#E4AE4C',
  interview: '#DD9160',
  hardTier: '#E57A57',

  // Starts just above the card surface so an empty day still reads as a cell.
  heat0: '#2A2622',
  heat1: '#4A2C22',
  heat2: '#7A3D2B',
  heat3: '#B35638',
  heat4: '#E57A57',

  cardBorder: '#2B2723',
  scrim: 'rgba(0,0,0,0.6)',

  shadowColor: '#000000',
  shadowOpacity: 0.35,
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
