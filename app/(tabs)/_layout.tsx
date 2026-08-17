import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Palette, type, spacing, radius } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';

// The tab bar is a floating pill; the active tab is a filled circle behind its
// glyph. Circular controls are the through-line of the design, and this is the
// most-seen instance of one.
function TabIcon({ glyph, focused, c }: { glyph: string; focused: boolean; c: Palette }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? c.accent : 'transparent',
      }}
    >
      <Text style={{ fontSize: 19, color: focused ? c.onAccent : c.textFaint, includeFontPadding: false }}>
        {glyph}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);

  const icon = (glyph: string) => ({ focused }: { focused: boolean }) =>
    <TabIcon glyph={glyph} focused={focused} c={c} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.bar,
        tabBarShowLabel: false,
        tabBarItemStyle: { height: 64 },
      }}
      sceneContainerStyle={{ backgroundColor: c.bg }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('◆') }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon('❖') }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('▣') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('◉') }} />
    </Tabs>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: Platform.OS === 'ios' ? 28 : 18,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderTopWidth: 0,
    paddingHorizontal: spacing.sm,
    // Floating element, so it needs a real lift off the page.
    shadowColor: c.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: c.shadowOpacity * 1.4,
    shadowRadius: 24,
    elevation: 12,
  },
});
