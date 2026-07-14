# E2E Report — Tractor Stop-for-Bull, Round Wheels, Bigger Mama Tobu

**Date:** 2026-07-14 · **Branch:** `farm-navigation-behavior-fixes` · **Spec:** [prd-tractor-behavior-and-mascot-scale.md](prd-tractor-behavior-and-mascot-scale.md)
**Method:** browser preview (mobile 375×812) + live module-state sampling via Vite's dev-server module graph (dynamic import of the timestamped `tractorState.ts` module URL returns the same singleton the scene uses — enables reading real positions instead of eyeballing screenshots).

## Verdict: all 3 user stories pass

### US-001 — Tractor stops for nearby bulls ✅

The strongest evidence in this report is deterministic, not observational:

1. **Moving while clear:** 11 samples over ~25s show `x` advancing monotonically (-12.41 → -10.61) along the north leg while `minDistToTractor` held ~11.4–11.8 (well above the 3.4 stop radius).
2. **Fault-injected block:** pinned `herdState.minDistToTractor` to 0 via a property getter (making BullHerd's writes no-ops), simulating a bull standing on the tractor:
   - `blocked+2s` → x = **-9.079**
   - `blocked+6s` → x = **-9.079**
   - `blocked+10s` → x = **-9.079** (bit-identical — the distance accumulator fully stopped)
3. **Resume:** after restoring the real signal: -9.079 → -8.779 (+5s) → -8.25 (+10s) — **resumed from exactly the paused position**, same leg, same heading, no teleport.

Implementation notes: patrol progress is now accumulated distance (`traveled` ref), not wall-clock time — `tractorPoseFromDistance` replaced `tractorPoseAt` in `farmLayout.ts`. The bull-side data flows through a new `herdState` reverse channel in `tractorState.ts` (BullHerd computes min distance in the containment pass it already runs; zero added iteration cost). Stop radius 3.4 > bull clearance 2.8, so the tractor reacts before contact is geometrically possible.

### US-002 — Round wheels ✅

- New `cylinder()` primitive in `MeshBuilder` (two vertex rings + cap fans, axle along X); `wheel.glb` = dark 10-segment tire + proud yellow hub (2.5KB)
- Tractor body's box-wheels removed (replaced with axle housings); `Farm.tsx` clones the one wheel GLB 4× — rear pair at scale 0.95, front pair at 0.5, y-positions matching scaled radii so tires touch ground
- Close-up screenshot confirms both wheel sizes read as round, not boxy
- `npm run build` regenerates everything with no manual step; wheel.glb auto-covered by the existing `models/*.glb` precache glob

### US-003 — Bigger Mama Tobu ✅

- Scale 1.1 → 1.5, hitbox [2.3, 2.3, 3.1] → [3.1, 3.1, 4.2] (proportional)
- Mascot exclusion radius in `BullHerd` bumped 2.0 → 2.6 so bulls keep clear of her bigger footprint
- Screenshot confirms she now visibly dominates a nearby herd bull; no clipping with barn/signpost (they're 8+ units away)

## Build health

- `tsc -b` clean, `eslint` clean, production build + PWA precache (38 entries) succeed
- One transient HMR error appeared mid-implementation (`tractorPoseAt` import raced the rename across two files) — resolved by the same edit batch; not present after reload

## Testing technique worth keeping

Vite dev serves the live module graph — `import('/src/scene/tractorState.ts?t=<timestamp-from-performance.getEntriesByType>')` returns the **same module instance** the running scene uses. This enabled reading live positions and injecting a synthetic "bull nearby" signal without any debug hooks in shipped code. (The bare, un-timestamped URL returns a *different* instance after HMR — check `performance.getEntriesByType('resource')` for the current timestamped URL.)

## Out of scope / notes

- Natural bull-triggered stops will be common in production since outer spawn slots sit near the patrol path; the fault-injection test proves the gate works regardless of encounter timing.
- Background-tab rAF throttling makes the world advance slower in wall-clock terms during automated testing (dt-clamped at 0.1s/frame) — irrelevant to real foreground usage.
