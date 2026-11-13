export function buzz(kind: 'ok' | 'bad' | 'tap', enabled: boolean) {
  if (!enabled || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(kind === 'ok' ? 25 : kind === 'bad' ? [60, 40, 60] : 10);
  } catch {
    /* ignore */
  }
}
