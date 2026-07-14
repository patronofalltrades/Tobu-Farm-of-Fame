// Single source of truth for pasture geometry (prd-farm-polish-v2 P0-1).
// The pasture half-width grows sub-linearly with the approved herd so bull
// density never exceeds what the original ±14 layout was tuned for at 13
// bulls, and everything that used to be four independent hardcoded pieces
// (wander bound, fence ring, scenery ring, camera range) derives from the
// same computed bound.
import { hashString, mulberry32 } from '../hooks/useBullColor';
import type { Tobu } from '../types';

const BASE_BOUND = 14; // pre-auto-scale pasture half-width
const BASE_COUNT = 13; // herd size the original constants were tuned for
const MAX_BOUND = 42; // hard clamp; ground plane (400×400) dwarfs this
const FENCE_SEGMENT = 7; // fence GLB is 7 units wide along X
const SCENERY_MARGIN = 2.5; // scenery ring hugs the outside of the fence

export function approvedCount(tobus: Tobu[]): number {
  return tobus.reduce((n, t) => (t.status === 'approved' ? n + 1 : n), 0);
}

/**
 * Sub-linear growth (sqrt of herd ratio), snapped to fence-segment multiples
 * so the fence ring closes exactly and the wander bound never drifts away
 * from the visible fence. 13 bulls → 14 (today's layout, no regression).
 */
export function computePastureBound(count: number): number {
  const growth = Math.sqrt(Math.max(count - BASE_COUNT, 0) / BASE_COUNT);
  const raw = BASE_BOUND + growth * 14;
  const snapped = Math.round(raw / FENCE_SEGMENT) * FENCE_SEGMENT;
  return Math.min(MAX_BOUND, Math.max(BASE_BOUND, snapped));
}

export interface FenceSegment {
  position: [number, number, number];
  rotY: number;
}

/** Closed fence ring from 7-unit segments; reproduces today's ring at bound 14. */
export function computeFenceSegments(bound: number): FenceSegment[] {
  const segments: FenceSegment[] = [];
  for (let x = -bound + FENCE_SEGMENT / 2; x < bound; x += FENCE_SEGMENT) {
    segments.push({ position: [x, 0, -bound], rotY: 0 });
    segments.push({ position: [x, 0, bound], rotY: 0 });
    segments.push({ position: [-bound, 0, x], rotY: Math.PI / 2 });
    segments.push({ position: [bound, 0, x], rotY: Math.PI / 2 });
  }
  return segments;
}

export interface SceneryPlacement {
  position: [number, number, number];
  rotY: number;
  scale: number;
}

/**
 * Deterministic scenery ring just outside the fence. Replaces the
 * hand-authored placement arrays so scenery tracks the pasture size;
 * seeded PRNG keeps the layout identical across reloads.
 */
export function computeSceneryRing(
  bound: number,
  kind: 'tree' | 'bush' | 'rock',
  count: number,
): SceneryPlacement[] {
  const rng = mulberry32(hashString('scenery:' + kind));
  const placements: SceneryPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = ((i + rng() * 0.55) / count) * Math.PI * 2;
    const radius = bound + SCENERY_MARGIN + rng() * 7;
    placements.push({
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      rotY: rng() * Math.PI * 2,
      scale: 0.85 + rng() * 0.45,
    });
  }
  return placements;
}

/** Let the camera pull back far enough to frame the whole (grown) pasture. */
export function computeCameraMaxDistance(bound: number): number {
  return Math.max(30, bound * 1.2);
}
