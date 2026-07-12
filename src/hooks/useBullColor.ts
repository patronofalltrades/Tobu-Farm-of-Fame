// Deterministic visuals + placement from a stable seed (winner name).
// Each winner gets a coat: a base color plus a spot-pattern seed. The same
// winner always produces the identical coat, so repeat winners' bulls match
// (PRD US-004). The seed also picks the spawn point so the farm looks stable
// across reloads before the bulls start wandering.

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

export function bullCoatFromSeed(seed: string): BullCoat {
  const h = hashString(seed);
  const [hue, sat, light] = COAT_HUES[h % COAT_HUES.length];
  return {
    baseColor: `hsl(${hue}, ${sat}%, ${light}%)`,
    spotSeed: ((h >> 8) % 1000) / 1000,
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

// Scatter bulls on a ring around the mascot, avoiding the landmark slots.
// Adding `index` keeps repeat winners' bulls from overlapping each other.
// With the wander FSM this is the SPAWN point, not a resting position.
export function bullPositionFromSeed(seed: string, index: number): { x: number; z: number } {
  const base = hashString(seed);
  const angle = ((base % 360) + index * 53) * (Math.PI / 180);
  const radius = 4 + ((base >> 4) % 5) + (index % 3) * 0.6;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

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
