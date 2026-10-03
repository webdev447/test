// Formats milliseconds remaining as "m:ss" — used anywhere a stock hold's
// countdown is shown (shop grid ribbons, the cart checkout bar).
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
