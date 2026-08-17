// Theme access. Screens call `useColors()` for values and `useThemedStyles()`
// for a StyleSheet built from them.
//
// There is one palette right now (light). The indirection stays because it is
// what makes a second palette a token change rather than a rewrite: styles are
// built inside components, never at module scope, so nothing bakes a colour in
// at import time.

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Palette, palette, shadows } from './tokens';

export type { Palette };

export function useColors(): Palette {
  return palette;
}

export function useShadows() {
  return useMemo(() => shadows(palette), []);
}

/**
 * Build a themed StyleSheet.
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (c: Palette) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Palette) => T
): T {
  return useMemo(() => factory(palette), [factory]);
}
