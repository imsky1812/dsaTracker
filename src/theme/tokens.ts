// Dark "paper" design system — layered charcoal surfaces, soft shadows,
// a single disciplined red accent. Every color and spacing token lives here
// so the whole app stays consistent and re-themable.

export const colors = {
  // Three charcoal elevations imply layered paper
  bg: '#0E0E10',        // base canvas
  surface: '#161618',   // card
  surface2: '#1E1E22',  // raised card / code block
  surface3: '#26262B',  // hover / active

  border: '#2A2A30',
  borderSoft: '#202024',

  // Red accent family — used sparingly
  accent: '#E5393B',
  accentDim: '#A01F2E',
  accentSoft: 'rgba(229,57,59,0.12)',

  // Text
  text: '#EDE7E7',
  textMuted: '#A49B9C',
  textFaint: '#6B6466',

  // Semantic (difficulty / tiers)
  easy: '#4A9D6A',
  medium: '#C9A227',
  hard: '#E5393B',

  warmup: '#4A9D6A',
  core: '#C9A227',
  interview: '#E5936B',
  hardTier: '#E5393B',

  // Heatmap scale (empty → intense)
  heat0: '#1A1A1E',
  heat1: '#3A2224',
  heat2: '#6E2429',
  heat3: '#A62630',
  heat4: '#E5393B',
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36,
};

export const radius = {
  sm: 8, md: 12, lg: 18, xl: 24, pill: 999,
};

export const type = {
  display: 'Archivo_800ExtraBold',
  heading: 'Archivo_600SemiBold',
  body: 'Archivo_400Regular',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
};

// Soft ambient shadow for the "paper" lift
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const difficultyColor = (d: string) =>
  d === 'Easy' ? colors.easy : d === 'Medium' ? colors.medium : colors.hard;

export const tierColor = (t: string) =>
  t === 'warmup' ? colors.warmup :
  t === 'core' ? colors.core :
  t === 'interview' ? colors.interview : colors.hardTier;
