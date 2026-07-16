# E2E Report — A Proper Farm (Farmstead Props + Ground Variety)

**Date:** 2026-07-16 · **Branch:** `proper-farm` · **Scope:** prd-proper-farm US-001–004
**Method:** live browser pane, screenshot verification of the farmyard composition, programmatic exclusion sweep over the live `bullPositions` channel, interaction regression via camera tracking + synthetic raycast clicks.

## Verdict: **PASS** — all four user stories verified. tsc / eslint / build clean. Zero console errors. Pasture size untouched.

---

## US-001 — Procedural farmstead models

- Four new GLBs from the existing `MeshBuilder` pipeline: `silo.glb` (5.1KB), `hay.glb` (2.7KB), `trough.glb` (2.6KB), `well.glb` (4.9KB) ✅
- New `cylinderY` primitive (vertical cylinder) added for silo/well — same flat-shaded, double-sided treatment as the wheel's X-axis cylinder ✅
- New palette tones: straw ×2, silo cream, water — the well's roof is senyera red as the one brand accent ✅
- `useSiloModel`/`useHayModel`/`useTroughModel`/`useWellModel` hooks + preloads in `models.ts` ✅
- `node scripts/generate-models.mjs` regenerates everything cleanly (already in `npm run build`) ✅

## US-002 — Farmyard composed and protected

- **Screenshot-verified composition**: silo (grey + cream dome) tucked behind-left of the barn, hay bale at the wall, well (stone ring + posts + red roof) set apart, trough on the barn's far side ✅
- Every prop inside the tractor's **minimum** patrol loop (±11.5): silo x extent −10.65 > −11.5, well −11.2 > −11.5, all others well inside ✅
- New `LANDMARK_EXCLUSIONS`: silo r1.7, hay r1.5 (shared circle over the pair), trough r1.5, well r1.4 ✅
- **Exclusion sweep**: all 27 live bull positions sampled 3× over ~4s — **zero violations** of any zone (0.3 tolerance for the soft push-out) ✅
- Props are pure scenery: no tap handlers, no invisible hitboxes ✅

## US-003 — Ground variety

- **Dirt path**: four slightly-rotated segments from the fence side to the barn door — visibly bent, reads as used (screenshot) ✅
- **Pond**: water disc + darker rim at (7, 6.5), r 2.2; exclusion r 2.8 — no bull stood in it across the sweep ✅
- **Patches**: 5 low-contrast mud/dry-grass circles, hand-placed constants (fully deterministic), all inside the minimum ±14 bound ✅
- All decals use the tracking-ring technique (y-offset ≤0.03, `depthWrite:false`, `raycast={() => null}`, explicit renderOrder) — no z-fighting observed, and raycast-transparency proven by the bull-click regression below ✅

## US-004 — No-regression guard

| Check | Result |
|---|---|
| `farmLayout.ts` untouched (bounds, growth curve, camera, pan limits) | ✅ zero diff |
| Wall of Fame → camera tracking: Lewis Hall tracked, marker distance 0.00 | ✅ |
| Synthetic raycast bull click through the decorated scene: Benedikt's bubble opened | ✅ |
| Console errors | ✅ zero |
| tsc / eslint | ✅ |
| Production build: 70 precache entries (2542 KiB, +21 KiB for 4 models); all four new GLBs in the manifest | ✅ |

## Notes

- The pond + farmstead exclusions raise `LANDMARK_EXCLUSIONS` from 3 to 8 entries — per-bull-per-frame cost is negligible at herd scale (~27–50).
- Exclusion positions in `BullHerd.tsx` mirror the prop positions in `Farm.tsx` (noted in both files); if the farmyard is ever rearranged, both must move together.
- Deploy intentionally **not** run — this pass was implement + E2E + git push per instruction; production still serves the previous build.
