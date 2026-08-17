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
import { sendPasswordReset } from '../../src/lib/auth';

export default function Reset() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError('That doesn’t look like a valid email address.');

    setError(null);
    setBusy(true);
    const { error: err } = await sendPasswordReset(email);
    setBusy(false);

    // Deliberately confirm even on success only — Supabase does not reveal
    // whether an address is registered, and neither should this screen.
    if (err) return setError(err);
    setSent(true);
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
          <AuthMark caption="Reset your password." />

          <AuthNotice message={error} />
          {sent && (
            <AuthNotice
              tone="ok"
              message={`If ${email.trim()} has an account, a reset link is on its way. Open it on this device.`}
            />
          )}

          {!sent && (
            <>
              <AuthField
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              <AuthButton label="Send reset link" onPress={submit} busy={busy} />
            </>
          )}

          <View style={{ marginTop: spacing.sm }}>
            <AuthLink label="Back to sign in" onPress={() => router.back()} />
          </View>

          <Text style={styles.footnote}>
            The link opens a Supabase page where you set a new password, then you sign in here
            with it.
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
