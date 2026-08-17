// M4 — drives the pending queue. Started once from the root layout.
//
// Deliberately dependency-free: no NetInfo, no background task. Reachability is
// inferred from whether a push succeeds, which is the only signal that actually
// matters, and flushes are triggered by the events that realistically follow a
// change in connectivity:
//
//   - a mutation lands in the queue      (debounced)
//   - the app returns to the foreground  (the common "was offline, now isn't")
//   - the user signs in
//   - a retry timer after a failure      (backoff, capped)
//
// Every path is safe to call at any time; overlapping calls collapse into one.

import { AppState, AppStateStatus } from 'react-native';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { supabaseEnabled } from './supabase';
import { pushOp, pullRemote } from './sync';

const DEBOUNCE_MS = 1500;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 5 * 60 * 1000;

let flushing = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = RETRY_BASE_MS;

const canSync = () => supabaseEnabled && Boolean(useSession.getState().session);

const clearRetry = () => {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryDelay = RETRY_BASE_MS;
};

const scheduleRetry = () => {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
};

/**
 * Drain the queue oldest-first. Stops at the first failure so ordering is
 * preserved — a later edit must never overtake an earlier one for the same key.
 */
export async function flush(): Promise<void> {
  if (flushing || !canSync()) return;

  const store = useProgress.getState();
  if (store.pending.length === 0) return;

  flushing = true;
  store.setSyncState('syncing');

  let sent = 0;
  try {
    // Snapshot: anything enqueued mid-flush is picked up by the next pass.
    const queue = [...useProgress.getState().pending];
    for (const op of queue) {
      const ok = await pushOp(op);
      if (!ok) break;
      sent++;
    }

    if (sent > 0) useProgress.getState().dropOps(sent);

    const remaining = useProgress.getState().pending.length;
    if (remaining > 0) {
      useProgress.getState().setSyncState('offline');
      scheduleRetry();
    } else {
      clearRetry();
      useProgress.getState().setSyncState('idle', new Date().toISOString());
    }
  } catch {
    useProgress.getState().setSyncState('error');
    scheduleRetry();
  } finally {
    flushing = false;
  }
}

/** Pull the server's copy and merge it in, then push anything still queued. */
export async function syncNow(): Promise<void> {
  if (!canSync()) return;

  useProgress.getState().setSyncState('syncing');
  const remote = await pullRemote();

  if (!remote) {
    useProgress.getState().setSyncState('offline');
    scheduleRetry();
    return;
  }

  useProgress.getState().mergeRemote(remote);
  await flush();
}

/** Called after every store mutation; coalesces bursts into one flush. */
function onStoreChange() {
  if (!canSync()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flush();
  }, DEBOUNCE_MS);
}

/**
 * Wire everything up. Returns a teardown. Safe to call when Supabase is
 * disabled — it simply does nothing, keeping the local-only build unchanged.
 */
export function initSync(): () => void {
  if (!supabaseEnabled) return () => {};

  const unsubStore = useProgress.subscribe((s, prev) => {
    if (s.pending.length > prev.pending.length) onStoreChange();
  });

  // Signing in is the moment local-mode progress gets claimed: syncNow pulls
  // the account's data, merges, then pushes everything still queued — which is
  // exactly the local work done before the account existed.
  let wasSignedIn = Boolean(useSession.getState().session);
  const unsubSession = useSession.subscribe((s) => {
    const signedIn = Boolean(s.session);
    if (signedIn && !wasSignedIn) {
      clearRetry();
      void syncNow();
    }
    wasSignedIn = signedIn;
  });

  const onAppState = (next: AppStateStatus) => {
    if (next === 'active') {
      clearRetry();
      void syncNow();
    }
  };
  const appStateSub = AppState.addEventListener('change', onAppState);

  if (canSync()) void syncNow();

  return () => {
    unsubStore();
    unsubSession();
    appStateSub.remove();
    if (debounceTimer) clearTimeout(debounceTimer);
    clearRetry();
  };
}
