export function uid() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
export function sum(arr, f) {
  return arr.reduce((acc, x) => acc + f(x), 0);
}
