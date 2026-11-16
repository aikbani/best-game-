// A small seeded random number generator (mulberry32): the same seed gives the
// same sky, the same market and the same spawns, which is what makes the
// screenshot scenes repeatable.

export function createSeededRandom(seed) {
  let a = (seed | 0) || 1;
  return function nextRandom() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from the clock, for ordinary play (never used for screenshots). */
export function randomSeed() {
  return (Math.random() * 2147483647) | 0;
}
