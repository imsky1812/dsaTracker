import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, spacing, radius } from '../../src/theme/tokens';
import { useColors, useThemedStyles } from '../../src/theme/theme';

// Real icons rather than text glyphs: ◆/❖/▤ rendered inconsistently across
// fonts and read as improvised. Feather is a clean single-weight line set that
// suits the soft, rounded direction, and it ships with Expo — no new dependency.
type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, focused, c }: { name: FeatherName; focused: boolean; c: Palette }) {
  return (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? c.accent : 'transparent',
      }}
    >
      <Feather name={name} size={20} color={focused ? c.onAccent : c.textFaint} />
    </View>
  );
}

export default function TabLayout() {
  const c = useColors();
  const s = useThemedStyles(makeStyles);

  const icon = (name: FeatherName) => ({ focused }: { focused: boolean }) =>
    <TabIcon name={name} focused={focused} c={c} />;

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
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon('book-open') }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon('check-circle') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('bar-chart-2') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: Platform.OS === 'ios' ? 28 : 18,
    height: 70,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderTopWidth: 0,
    paddingHorizontal: spacing.sm,
    shadowColor: c.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: c.shadowOpacity * 1.6,
    shadowRadius: 24,
    elevation: 12,
  },
});
