import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors, type } from '../../src/theme/tokens';

// Simple icon set drawn with text glyphs to avoid extra icon deps.
const icon = (glyph: string) => ({ color }: { color: string }) =>
  <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: type.mono, fontSize: 10, letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('◆') }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon('❖') }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('▣') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('◉') }} />
    </Tabs>
  );
}
