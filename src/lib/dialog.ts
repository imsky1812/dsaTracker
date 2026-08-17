// Cross-platform confirm / notify.
//
// react-native-web does NOT implement Alert.alert — it is a silent no-op there.
// That mattered: "Sign out" and "Reset all progress" both went through
// Alert.alert, so on web the button would appear to do nothing at all. Worse
// for a confirmation than for a message, because the user concludes the app is
// broken and tries again.
//
// Native keeps the real Alert (with a destructive style where appropriate); web
// falls back to window.confirm / window.alert, which are ugly but unambiguous.

import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label on the affirmative button. Defaults to "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the platform's destructive style. */
  destructive?: boolean;
}

/** Ask the user to confirm. Resolves true only if they affirmatively agree. */
export function confirm({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    // window.confirm is synchronous and blocking; wrap it so callers await one
    // shape regardless of platform.
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(message ? `${title}\n\n${message}` : title)
      : false;   // no window (SSR/prerender): never assume consent
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ], { onDismiss: () => resolve(false) });   // dismissing is not consent
  });
}

/** Tell the user something. No decision to make. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
