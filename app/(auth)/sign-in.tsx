import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, type } from '../../src/theme/tokens';
import { AuthField, AuthButton, AuthLink, AuthNotice, AuthMark } from '../../src/components/auth-ui';
import { signIn, validate } from '../../src/lib/auth';
import { useSession } from '../../src/store/session';

export default function SignIn() {
  const continueLocally = useSession((s) => s.continueLocally);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const invalid = validate(email, password);
    if (invalid) return setError(invalid);

    setError(null);
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    // On success the auth listener updates the session and the root layout
    // redirects — nothing to do here.
    if (err) setError(err);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthMark caption="Sign in to sync your progress." />

          <AuthNotice message={error} />

          <AuthField
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); }}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <AuthField
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          <AuthButton label="Sign in" onPress={submit} busy={busy} />

          <View style={{ marginTop: spacing.sm }}>
            <AuthLink label="Create an account" onPress={() => router.push('/(auth)/sign-up')} />
            <AuthLink label="Forgot password?" onPress={() => router.push('/(auth)/reset')} />
          </View>

          {/* Offline-first escape hatch: signing up needs a network, so someone
              with no signal and no account must still be able to get in. */}
          <View style={styles.divider} />
          <Pressable onPress={continueLocally} hitSlop={12}>
            {({ pressed }) => (
              <View style={[styles.offline, pressed && { opacity: 0.6 }]}>
                <Text style={styles.offlineText}>Continue without an account  →</Text>
                <Text style={styles.offlineHint}>
                  Everything works offline. Your progress saves on this device and moves to your
                  account when you sign in later.
                </Text>
              </View>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },
  offline: { alignItems: 'center' },
  offlineText: { fontFamily: type.heading, fontSize: 14, color: colors.text },
  offlineHint: {
    fontFamily: type.body,
    fontSize: 12.5,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.sm,
  },
});
