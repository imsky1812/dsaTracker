import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, type } from '../../src/theme/tokens';
import { AuthField, AuthButton, AuthLink, AuthNotice, AuthMark } from '../../src/components/auth-ui';
import { signUp, validate } from '../../src/lib/auth';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const invalid = validate(email, password);
    if (invalid) return setError(invalid);
    if (password !== confirm) return setError('Those passwords don’t match.');

    setError(null);
    setBusy(true);
    const res = await signUp(email, password);
    setBusy(false);

    if (res.error) return setError(res.error);
    if (res.needsConfirmation) {
      // Email confirmation is on: there is no session yet, so no redirect will
      // happen. Tell them rather than leaving the screen looking stuck.
      return setSent(`Account created. Confirm ${email.trim()} from your inbox, then sign in.`);
    }
    // Otherwise the auth listener has a session and the root layout redirects.
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
          <AuthMark caption="Create an account to sync across devices." />

          <AuthNotice message={error} />
          <AuthNotice message={sent} tone="ok" />

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
            placeholder="at least 6 characters"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />

          <AuthField
            label="Confirm password"
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setError(null); }}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          <AuthButton label="Create account" onPress={submit} busy={busy} />

          <View style={{ marginTop: spacing.sm }}>
            <AuthLink label="Already have an account? Sign in" onPress={() => router.back()} />
          </View>

          <Text style={styles.footnote}>
            Your progress is private to your account — row-level security means no one else can
            read it.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: 'center' },
  footnote: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xl,
  },
});
