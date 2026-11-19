/** A uniform random integer in [0, max), from the browser's secure random source. */
function randomBelow(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max; // reject the biased tail
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0]!;
  } while (n >= limit);
  return n % max;
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
