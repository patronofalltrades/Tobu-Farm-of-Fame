// Deterministic visuals + placement from a stable seed (winner name).
// Until real low-poly bulls land, color is a single hue. The pattern seed
// is also reused to place bulls so the farm stays stable across reloads.

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function bullColorFromSeed(seed: string): string {
  const hue = hashString(seed) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export function useBullColor(seed: string): string {
  return bullColorFromSeed(seed);
}

// Scatter bulls on a ring around the mascot, avoiding the landmark slots.
// Adding `index` keeps repeat winners' bulls from overlapping each other.
export function bullPositionFromSeed(seed: string, index: number): { x: number; z: number } {
  const base = hashString(seed);
  const angle = ((base % 360) + index * 53) * (Math.PI / 180);
  const radius = 4 + ((base >> 4) % 5) + (index % 3) * 0.6;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}
