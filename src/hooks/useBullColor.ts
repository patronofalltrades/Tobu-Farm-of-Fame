// Deterministic visuals + placement from a stable seed (winner name).
// Each winner owns a coat *hue family*; each of their wins gets a distinct
// shade within it (prd-farm-polish-v2 P0-6). variantIndex is the winner's
// occurrence index (0 = first win) — same-family-but-different bulls make
// repeat wins legible in the herd. Determinism depends on a stable Tobu
// ordering, which subscribeToTobus guarantees (sorted by date, then id).
// The seed also picks the spawn point so the farm looks stable across
// reloads before the bulls start wandering.

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface BullCoat {
  /** Base coat color, CSS string, fed to InstancedMesh.setColorAt. */
  baseColor: string;
  /** 0..1 seed that offsets the procedural spot pattern in the shader. */
  spotSeed: number;
  /** 0..1 how dark the spots render (some winners get bold patches, some subtle). */
  spotIntensity: number;
}

// Curated coat hues: browns, creams, greys, blacks, and a few playful
// Barcelona-adjacent tones. Saturation/lightness tuned so instanceColor
// tinting reads as a coat, not neon.
const COAT_HUES: Array<[number, number, number]> = [
  [25, 45, 42],  // chestnut
  [30, 35, 60],  // tan
  [40, 30, 78],  // cream
  [20, 15, 30],  // dark brown
  [0, 0, 88],    // white
  [0, 0, 35],    // charcoal
  [15, 55, 50],  // rust
  [45, 25, 52],  // olive-tan
  [350, 45, 45], // barcelona maroon
  [215, 30, 50], // slate blue-grey
  [35, 60, 55],  // golden
  [0, 0, 62],    // silver
];

export function bullCoatFromSeed(seed: string, variantIndex = 0): BullCoat {
  const h = hashString(seed);
  const [hue, sat, baseLight] = COAT_HUES[h % COAT_HUES.length];
  // Repeat wins keep the hue (family identity) but step lightness/saturation
  // and re-roll the spot layout, so no two of a winner's bulls look identical.
  // First wins (variantIndex 0) reproduce the pre-variant coat exactly.
  const light = variantIndex === 0
    ? baseLight
    : Math.min(85, Math.max(18, baseLight + (variantIndex % 2 === 1 ? 16 : -14) * Math.ceil(variantIndex / 2)));
  const satAdj = variantIndex === 0
    ? sat
    : Math.min(80, Math.max(12, sat + (variantIndex % 2 === 1 ? -8 : 10)));
  return {
    baseColor: `hsl(${hue}, ${satAdj}%, ${light}%)`,
    spotSeed: (((h >> 8) % 1000) / 1000 + variantIndex * 0.137) % 1,
    spotIntensity: 0.35 + (((h >> 16) % 100) / 100) * 0.45,
  };
}

/** @deprecated kept for leaderboard swatches; delegates to bullCoatFromSeed. */
export function bullColorFromSeed(seed: string): string {
  return bullCoatFromSeed(seed).baseColor;
}

export function useBullColor(seed: string): string {
  return bullCoatFromSeed(seed).baseColor;
}

// Spawn placement moved to farmLayout.computeSpawnPositions — the herd is now
// laid out in one pass with guaranteed spacing instead of per-bull ring hashing
// (prd-farm-navigation-behavior-fixes US-002).

/** Deterministic PRNG (mulberry32) for each bull's wander decisions. */
export function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
