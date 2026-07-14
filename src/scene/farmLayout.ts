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

/** How far the map-pan target may drift from center — covers the scenery
 *  ring (bound + margin + ~7 radius jitter + tree width) with a little air. */
export function computePanLimit(bound: number): number {
  return bound + 14;
}

/**
 * Deterministic, guaranteed-spread spawn layout (prd-farm-navigation-behavior-fixes US-002).
 * Vogel/golden-angle spiral gives a near-uniform nearest-neighbor distance of
 * ~maxR/√n (≈3.5 units at 27 bulls in a ±20 pasture) — comfortably above the
 * herd's 1.4-unit separation floor even after the small seeded jitter that
 * hides the spiral's regularity. Same ids in the same order → same layout.
 */
export function computeSpawnPositions(
  ids: string[],
  wanderBound: number,
  isBlocked: (x: number, z: number) => boolean,
): Array<{ x: number; z: number }> {
  const n = Math.max(ids.length, 1);
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const maxR = Math.max(wanderBound - 1.5, 4);
  const positions: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < ids.length; i++) {
    const rng = mulberry32(hashString('spawn:' + ids[i]));
    const theta = i * GOLDEN_ANGLE + (rng() - 0.5) * 0.3;
    let r = maxR * Math.sqrt((i + 0.6) / n);
    let x = Math.cos(theta) * r + (rng() - 0.5) * 1.0;
    let z = Math.sin(theta) * r + (rng() - 0.5) * 1.0;
    // Slot lands on a landmark: walk outward along the same ray (still
    // deterministic) until clear rather than picking a random spot.
    for (let attempt = 0; attempt < 10 && isBlocked(x, z); attempt++) {
      r += 1.2;
      x = Math.cos(theta) * r;
      z = Math.sin(theta) * r;
    }
    x = Math.min(Math.max(x, -wanderBound), wanderBound);
    z = Math.min(Math.max(z, -wanderBound), wanderBound);
    positions.push({ x, z });
  }
  return positions;
}

// --- Tractor patrol (prd-farm-navigation-behavior-fixes US-004/US-005) ---

export const TRACTOR_SPEED = 1.5; // units/sec, a touch quicker than a walking bull
/** Bulls keep this far from the tractor's center — larger than the model
 *  footprint so shoves happen before visual contact ever could. */
export const TRACTOR_CLEARANCE = 2.8;
/** The tractor halts while any bull is inside this radius — slightly wider
 *  than the bulls' own clearance so it reacts before contact is even close
 *  (prd-tractor-behavior-and-mascot-scale US-001). */
export const TRACTOR_STOP_RADIUS = 3.4;

export interface TractorPose {
  x: number;
  z: number;
  heading: number;
}

/** Rectangle corners for the patrol loop, just inside the fence. */
export function computeTractorWaypoints(bound: number): Array<{ x: number; z: number }> {
  const half = bound - 2.5;
  return [
    { x: -half, z: -half },
    { x: half, z: -half },
    { x: half, z: half },
    { x: -half, z: half },
  ];
}

/**
 * Position + facing along the rectangular loop after `distance` units of
 * travel. Distance-based (not clock-based) so the patrol can pause for
 * bulls and resume from exactly the same spot (US-001) — the caller owns
 * the accumulated distance and simply stops adding to it while blocked.
 */
export function tractorPoseFromDistance(
  distance: number,
  bound: number,
  out: TractorPose,
): TractorPose {
  const pts = computeTractorWaypoints(bound);
  const legs: number[] = [];
  let perimeter = 0;
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    legs.push(len);
    perimeter += len;
  }
  let s = distance % perimeter;
  for (let i = 0; i < 4; i++) {
    if (s <= legs[i]) {
      const a = pts[i];
      const b = pts[(i + 1) % 4];
      const f = legs[i] === 0 ? 0 : s / legs[i];
      out.x = a.x + (b.x - a.x) * f;
      out.z = a.z + (b.z - a.z) * f;
      out.heading = Math.atan2(b.x - a.x, b.z - a.z);
      return out;
    }
    s -= legs[i];
  }
  out.x = pts[0].x;
  out.z = pts[0].z;
  out.heading = 0;
  return out;
}
