// Theme access. Screens call `useColors()` for values and `useThemedStyles()`
// for a StyleSheet that rebuilds when the scheme flips.
//
// Why a hook rather than the old module-level `colors` object: styles were
// created once at import time via StyleSheet.create, which bakes the palette in
// permanently. Nothing themed can work that way. Every screen now builds its
// sheet inside the component from the active palette.

import { useMemo } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';
import { Palette, lightPalette, darkPalette, shadows } from './tokens';

export type { Palette };

/** The active palette, following the system setting (dark when unspecified). */
export function useColors(): Palette {
  const scheme = useColorScheme();
  return scheme === 'light' ? lightPalette : darkPalette;
}

export function useShadows() {
  const c = useColors();
  return useMemo(() => shadows(c), [c]);
}

/** True when rendering the light palette — for the odd one-off decision. */
export function useIsLight(): boolean {
  return useColorScheme() === 'light';
}

/**
 * Build a themed StyleSheet.
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (c: Palette) => StyleSheet.create({ ... });
 *
 * Memoised on the palette, so the sheet is created once per theme rather than
 * on every render.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Palette) => T
): T {
  const c = useColors();
  return useMemo(() => factory(c), [c, factory]);
}
