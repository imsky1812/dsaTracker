import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useColors } from '../src/theme/theme';
import { useSession, initAuth, sessionReady, isUnlocked } from '../src/store/session';
import { initSync } from '../src/lib/syncManager';
import { useProgress } from '../src/store/progress';
import { scheduleDailyReminder } from '../src/lib/notifications';

SplashScreen.preventAutoHideAsync();

/**
 * Redirects between the (auth) and (tabs) groups whenever the session changes.
 * Runs as an effect rather than a conditional render because expo-router needs
 * the navigator mounted before it will accept a navigation.
 */
function useAuthGate(ready: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const unlocked = useSession(isUnlocked);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!unlocked && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (unlocked && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, unlocked, segments, router]);
}

export default function RootLayout() {
  const c = useColors();
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  const authReady = useSession(sessionReady);
  const ready = fontsLoaded && authReady;

  useEffect(() => initAuth(), []);
  useEffect(() => initSync(), []);
  useAuthGate(ready);

  // Re-arm the OS reminder each launch. The schedule does not survive a
  // reinstall, and the notification text quotes the streak — which is stale by
  // the next day if we only ever scheduled it once.
  useEffect(() => {
    if (!ready) return;
    const { reminderTime, currentStreak, lastActiveDate } = useProgress.getState();
    if (reminderTime) {
      void scheduleDailyReminder(reminderTime, { streak: currentStreak, lastActiveDate });
    }
  }, [ready]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Holding on the splash avoids a flash of the wrong screen while we work out
  // whether there is a session.
  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Light ground, so the status bar needs dark icons. */}
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        {/* Topic detail sits OUTSIDE (tabs): as a tab route it became a sixth
            phantom tab, and the nested tab navigator did not deliver the
            [slug] param — so the screen rendered blank. As a stack screen it
            pushes over the tab bar, which is also the right UX for a detail. */}
        <Stack.Screen name="topic/[slug]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}
