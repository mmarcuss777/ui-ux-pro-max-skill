// One short tick on win moments. Android Chrome supports vibrate();
// iOS Safari ignores it — the call is a safe no-op there.
export function buzz(ms = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms)
  }
}
