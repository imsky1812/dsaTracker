// Session store (M3) — who the user is, and whether the app is gated.
//
// Offline-first shapes every decision here:
//
//  - `supabase.auth.getSession()` reads the persisted session out of
//    AsyncStorage; it does not need a network. So a signed-in user opens the
//    app on a plane and goes straight to the tabs.
//  - A user who has never signed in *cannot* sign up without a network, so
//    `localMode` lets them use the app anyway. That flag is persisted, so the
//    choice sticks across restarts.
//  - `ready` must become true even when everything fails. Any path that could
//    hang forever would be a launch that never finishes.
//
// Per-user progress still lives in `src/store/progress.ts`; this store only
// answers "who is signed in". M4 wires the two together.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '../lib/supabase';

interface SessionState {
  session: Session | null;
  /** User explicitly chose to continue without an account. Persisted. */
  localMode: boolean;
  /** Supabase's stored session has been read (or there was nothing to read). */
  authResolved: boolean;
  /** Zustand has rehydrated `localMode` from AsyncStorage. */
  hydrated: boolean;

  setSession: (s: Session | null) => void;
  continueLocally: () => void;
  /** Leaving local mode sends the user back to the sign-in screen. */
  exitLocalMode: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      localMode: false,
      // With no backend configured there is no session to wait for.
      authResolved: !supabaseEnabled,
      hydrated: false,

      setSession: (session) => set({ session }),
      // Signing in supersedes local mode, so clear it on the way in.
      continueLocally: () => set({ localMode: true }),
      exitLocalMode: () => set({ localMode: false }),
    }),
    {
      name: 'dsa-session-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // The Supabase session is already persisted by supabase-js — storing a
      // second copy here would let the two drift apart.
      partialize: (s) => ({ localMode: s.localMode }),
    }
  )
);

// Hydration is flagged here rather than via `onRehydrateStorage` because that
// callback would reference `useSession` inside its own initializer, which makes
// the store's type circular and infer as `any`.
if (useSession.persist.hasHydrated()) {
  useSession.setState({ hydrated: true });
} else {
  useSession.persist.onFinishHydration(() => useSession.setState({ hydrated: true }));
}

/** True once the app knows enough to decide which screen to show. */
export const sessionReady = (s: SessionState) => s.hydrated && s.authResolved;

/** True when the user may use the app: signed in, local-only, or no backend. */
export const isUnlocked = (s: SessionState) =>
  !supabaseEnabled || Boolean(s.session) || s.localMode;

/**
 * Wire up Supabase auth. Called once from the root layout; returns an
 * unsubscribe. Safe to call when Supabase is disabled.
 */
export function initAuth(): () => void {
  if (!supabaseEnabled || !supabase) {
    useSession.setState({ authResolved: true });
    return () => {};
  }

  // Reads from AsyncStorage — resolves offline. `.catch` matters: without it a
  // rejected promise would leave `authResolved` false and the app on a blank
  // screen forever.
  supabase.auth
    .getSession()
    .then(({ data }) => useSession.setState({ session: data.session, authResolved: true }))
    .catch(() => useSession.setState({ authResolved: true }));

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useSession.setState({
      session,
      authResolved: true,
      // A real session makes the local-mode escape hatch redundant.
      ...(session ? { localMode: false } : {}),
    });
  });

  return () => data.subscription.unsubscribe();
}
