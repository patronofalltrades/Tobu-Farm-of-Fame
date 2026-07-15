// Deterministic visuals + placement from a stable seed (winner name).
// Each winner owns a coat *hue family*; each of their wins gets a distinct
// shade within it (prd-farm-polish-v2 P0-6). variantIndex is the winner's
// occurrence index (0 = first win) — same-family-but-different bulls make
// repeat wins legible in the herd. Determinism depends on a stable Tobu
// ordering, which subscribeToTobus guarantees (sorted by date, then id).
// The seed also picks the spawn point so the farm looks stable across
// reloads before the bulls start wandering.

import { useMemo } from 'react';
import { useFarmStore } from '../stores/useFarmStore';

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

/** Shared variant stepping: repeat wins keep the hue (family identity) but
 *  step lightness/saturation and re-roll the spot layout, so no two of a
 *  winner's bulls look identical. First wins (variantIndex 0) reproduce the
 *  base coat exactly. */
function buildCoat(
  hue: number,
  sat: number,
  baseLight: number,
  h: number,
  variantIndex: number,
): BullCoat {
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

export function bullCoatFromSeed(seed: string, variantIndex = 0): BullCoat {
  const h = hashString(seed);
  const [hue, sat, baseLight] = COAT_HUES[h % COAT_HUES.length];
  return buildCoat(hue, sat, baseLight, h, variantIndex);
}

// ---------------------------------------------------------------------------
// Guaranteed-unique winner colors (prd-reactions-colors-chrome-audio US-002).
// The 12-hue curated palette collides once the section has >12 distinct
// winners (pigeonhole), so live winner sets get a full-spectrum assignment:
// evenly spaced hue slots over the whole wheel, visited in a coprime-stride
// order so alphabetical neighbors land on far-apart hues, with sat/light
// bands cycling by slot so even hue-adjacent slots differ in tone. The
// assignment is a pure function of the sorted distinct-name list —
// deterministic across reloads, no randomness.

export type WinnerHueMap = Map<string, readonly [number, number, number]>;

/** Sat/light bands cycle by hue slot: slots 18° apart also differ in tone,
 *  so "adjacent" colors never read as the same coat. Mid bands keep the
 *  spectrum toy-farm, not neon. */
const SAT_BAND = [52, 40, 62] as const;
const LIGHT_BAND = [46, 58, 38] as const;
const HUE_OFFSET = 15; // start the wheel on a warm chestnut-ish tone

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function assignWinnerColors(distinctSortedNames: string[]): WinnerHueMap {
  const n = distinctSortedNames.length;
  const map: WinnerHueMap = new Map();
  if (n === 0) return map;
  // Golden-ratio stride, nudged to be coprime with n so every slot is hit
  // exactly once and alphabetical neighbors scatter across the wheel.
  let stride = Math.max(1, Math.round(n * 0.618));
  while (n > 1 && gcd(stride, n) !== 1) stride++;
  distinctSortedNames.forEach((name, i) => {
    const slot = (i * stride) % n;
    const hue = Math.round((HUE_OFFSET + (slot * 360) / n) % 360);
    map.set(name, [hue, SAT_BAND[slot % 3], LIGHT_BAND[slot % 3]]);
  });
  return map;
}

/** Coat for a winner under the unique assignment; falls back to the legacy
 *  curated palette for names outside the map (e.g. a pending submission
 *  previewed before it lands in the approved set). */
export function bullCoatForWinner(
  name: string,
  variantIndex: number,
  colors: WinnerHueMap,
): BullCoat {
  const base = colors.get(name);
  if (!base) return bullCoatFromSeed(name, variantIndex);
  return buildCoat(base[0], base[1], base[2], hashString(name), variantIndex);
}

/** The one live winner→color assignment, derived from the approved Tobu set.
 *  BullHerd, Leaderboard, and the bubble sender tint all consume this hook so
 *  a winner's swatch, bull, and name tint can never disagree. */
export function useWinnerColors(): WinnerHueMap {
  const tobus = useFarmStore((s) => s.tobus);
  return useMemo(
    () =>
      assignWinnerColors(
        Array.from(
          new Set(tobus.filter((t) => t.status === 'approved').map((t) => t.winner_name)),
        ).sort((a, b) => a.localeCompare(b)),
      ),
    [tobus],
  );
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
