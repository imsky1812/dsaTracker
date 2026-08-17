// Auth actions (M3). Thin wrappers over supabase-js that never throw — each
// returns `{ error }` with a message worth showing a user.
//
// The schema's `on_auth_user_created` trigger creates the profiles + streaks
// rows on signup, so the client must NOT do that itself (CLAUDE.md).

import { supabase, supabaseEnabled } from './supabase';

export interface AuthResult {
  error?: string;
  /** Signup succeeded but Supabase is holding the account for email confirmation. */
  needsConfirmation?: boolean;
}

const NO_BACKEND = 'No backend configured. Add your Supabase keys to .env.';

/**
 * Supabase surfaces raw errors that are unhelpful or alarming to a user. The
 * offline case matters most: a request with no network fails as a generic
 * "Network request failed", which should read as "you're offline", not as a
 * broken app.
 */
function humanize(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('network request failed') || m.includes('fetch failed'))
    return 'No connection. You can keep working offline and sign in later.';
  if (m.includes('invalid login credentials')) return 'That email and password don’t match an account.';
  if (m.includes('email not confirmed')) return 'Check your inbox and confirm your email first.';
  if (m.includes('user already registered')) return 'That email already has an account — sign in instead.';
  if (m.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'That doesn’t look like a valid email address.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Wait a minute and try again.';
  return message;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabaseEnabled || !supabase) return { error: NO_BACKEND };
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error ? { error: humanize(error.message) } : {};
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabaseEnabled || !supabase) return { error: NO_BACKEND };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) return { error: humanize(error.message) };
  // With "Confirm email" on, Supabase returns a user but no session.
  return { needsConfirmation: Boolean(data.user) && !data.session };
}

export async function signOut(): Promise<AuthResult> {
  if (!supabaseEnabled || !supabase) return {};
  // 'local' clears this device's stored session without needing the server —
  // so signing out works offline too.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return error ? { error: humanize(error.message) } : {};
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!supabaseEnabled || !supabase) return { error: NO_BACKEND };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return error ? { error: humanize(error.message) } : {};
}

/** Cheap client-side checks so obvious mistakes don't cost a round-trip. */
export function validate(email: string, password: string): string | null {
  if (!email.trim()) return 'Enter your email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'That doesn’t look like a valid email address.';
  if (!password) return 'Enter your password.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}
