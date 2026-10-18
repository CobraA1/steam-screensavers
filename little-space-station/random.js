// Small deterministic PRNG helpers. Subsystems derive their own streams so unrelated
// additions do not reshuffle the whole station.
export function HashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function DeriveSeed(worldSeed, subsystem) {
  return HashSeed(`${worldSeed}::${subsystem}`);
}

export function CreateRandom(seed) {
  let state = seed >>> 0;
  return function Random() {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function Pick(random, values) {
  return values[Math.floor(random() * values.length)];
}
