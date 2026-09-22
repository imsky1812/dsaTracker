// Theme access. Screens call `useColors()` for values and `useThemedStyles()`
// for a StyleSheet built from them.
//
// The palette follows the phone's light/dark setting. Styles are built inside
// components, never at module scope, so nothing bakes a colour in at import
// time — switching the system theme restyles every screen live.

import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Palette, lightPalette, darkPalette, shadows } from './tokens';

export type { Palette };

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

export function useColors(): Palette {
  return useIsDark() ? darkPalette : lightPalette;
}

export function useShadows() {
  const c = useColors();
  return useMemo(() => shadows(c), [c]);
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
  const c = useColors();
  return useMemo(() => factory(c), [factory, c]);
}
