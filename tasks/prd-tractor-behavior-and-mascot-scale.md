# PRD: Tractor Stop-for-Bull, Round Wheel Model, Bigger Mama Tobu

## Introduction

This PRD covers three small, independent fixes on top of the just-shipped tractor patrol and navigation work: the tractor currently drives its rectangular loop with no awareness of bulls at all (only the reverse — bulls avoid it), its wheels are flat rectangular boxes rather than round, and Mama Tobu (the mascot) is proportioned the same as a regular bull despite being the farm's centerpiece.

## Goals

- The tractor stops moving whenever a bull is within a set distance of it, in any direction, and resumes once the area clears
- The tractor's wheels read as round low-poly wheels (two large rear, two small front), not rectangular boxes
- Mama Tobu is visibly larger than the herd (~40% bigger) without breaking her tap hitbox or clipping into nearby landmarks

## User Stories

### US-001: Tractor stops for nearby bulls
**Description:** As a user watching the farm, I want the tractor to stop driving whenever a bull is too close to it, so the tractor never visibly plows through a bull.

**Acceptance Criteria:**
- [ ] The tractor continuously checks the distance from its current position to every bull's current position, every frame
- [ ] If any bull is within a defined stop-radius, the tractor halts its patrol (stays at its current position on the rectangular loop) rather than continuing to advance
- [ ] Once no bull remains within the stop-radius, the tractor resumes moving from exactly where it paused (no teleporting, no skipping ahead)
- [ ] The tractor's rotation/heading remains whatever it was facing when it stopped (it doesn't spin while paused)
- [ ] Pausing and resuming is visually smooth — no jitter or snapping at the stop/resume moment
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill — force a bull near the tractor's path and confirm it halts, then confirm it resumes once the bull wanders off

### US-002: Round tractor wheel model
**Description:** As a user looking at the tractor, I want its wheels to look round like real wheels, so the tractor doesn't look like it's rolling on boxes.

**Acceptance Criteria:**
- [ ] A new low-poly, flat-shaded "wheel" GLB exists, generated via the same procedural pipeline as the other models (`scripts/generate-models.mjs`)
- [ ] The wheel reads as round from the default camera distance (a many-sided low-poly cylinder/disc, not a cube) — no texture maps, no NORMAL attribute, consistent with every other asset's flat-shaded toy convention
- [ ] The tractor uses this one wheel model at two different scales: two large instances at the rear, two smaller instances at the front (matching the tractor's current big-rear/small-front box layout)
- [ ] The existing rectangular wheel boxes are removed from the tractor body once the round wheels replace them
- [ ] Regenerating via `node scripts/generate-models.mjs` produces the new wheel GLB and updated tractor GLB with no manual post-processing step
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Mama Tobu is bigger
**Description:** As a user viewing the farm, I want the mascot at the center to look noticeably bigger than a regular bull, so she reads as the farm's centerpiece.

**Acceptance Criteria:**
- [ ] The mascot's render scale increases from its current 1.1 to approximately 1.5 (~40% bigger)
- [ ] The mascot's tap hitbox grows proportionally so tapping around her (not just dead-center) still opens her info bubble
- [ ] The larger mascot does not visibly clip into the barn, signpost, or fence at her current position
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Every frame, compute the minimum distance from the tractor's current position to any bull's current position
- FR-2: Define a `TRACTOR_STOP_RADIUS` — if the minimum distance from FR-1 is below this radius, the tractor does not advance along its patrol path this frame
- FR-3: The tractor's progress along its rectangular loop is tracked as accumulated distance traveled (not raw elapsed clock time), so pausing simply stops accumulating distance and resuming continues from the same point
- FR-4: Add a `wheel()` generator function to `scripts/generate-models.mjs` producing a round, low-poly wheel mesh (an N-sided cylinder/disc, flat-shaded, no normals) — this likely requires adding a `cylinder`-style primitive to the existing `MeshBuilder` class alongside its current `box()`/`prism()` methods
- FR-5: Export the wheel model as its own GLB (`wheel.glb`) following the same pattern as `fence.glb`/`tree.glb`, so it can be `<Clone>`d multiple times at different scales
- FR-6: Add a `useWheelModel()` hook + `useGLTF.preload()` call in `src/scene/models.ts`, and add `models/wheel.glb` to any PWA precache patterns (already covered by the existing `models/*.glb` glob)
- FR-7: Update the tractor's procedural body in `scripts/generate-models.mjs` to drop its 4 box-wheel shapes; the Farm.tsx `Tractor` component instead renders the body plus 4 `<Clone>`d wheel instances (2 large at rear positions, 2 small at front positions) as children of the same moving/rotating group
- FR-8: Increase `Mascot.tsx`'s `scale` prop from `1.1` to `~1.5` and scale `hitboxSize` proportionally (from `[2.3, 2.3, 3.1]` to roughly `[3.1, 3.1, 4.2]`)

## Non-Goals

- No change to the tractor's fixed rectangular route or speed — only whether it's currently allowed to advance
- No swerving, rerouting, or honking — the tractor only ever fully stops or fully resumes, no partial slowdown
- No change to how bulls avoid the tractor (already implemented) — this PRD only adds the tractor's own awareness of bulls, which is the previously-missing other half
- No physically-accurate wheel rotation/rolling animation — the wheels are static geometry, just round instead of boxy (same treatment as every other static landmark part)
- No changes to the mascot's color, tap behavior, or info bubble content — only its size and hitbox
- No re-tuning of the pasture bound, fence, or scenery ring to accommodate the bigger mascot beyond confirming it doesn't clip nearby landmarks

## Design Considerations

- **Stop detection uses a circular radius, not a directional cone** — per product decision, the tractor stops for any bull within range in any direction (not just ones ahead of it in its direction of travel). This is a deliberate simplification: it means the tractor could technically stop for a bull standing beside or just behind it, not just in its path. Accepted tradeoff for simplicity.
- **Wheel geometry** should stay within the same low-poly language as the rest of the farm — an 8-to-12-sided extruded disc is "round enough" to read correctly at the default camera distance without looking like a smooth 3D-rendered tire, which would clash with the flat-shaded toy aesthetic.
- **Mascot hitbox scaling** should track the visual scale increase proportionally so the tap target grows with the model — a common miss is bumping the render scale but forgetting the invisible tap-hitbox, leaving a mismatch where part of the visually-bigger mascot doesn't respond to taps.

## Technical Considerations

- **Tractor motion refactor:** the tractor's position is currently a pure function of wall-clock time (`tractorPoseAt(state.clock.elapsedTime, bound, pose)` in `Farm.tsx`'s `Tractor` component, backed by `farmLayout.ts`'s `tractorPoseAt`). Supporting "stop and resume from the same spot" requires switching to an accumulated-distance model: keep a `distanceTraveled` ref in the `Tractor` component, only add `TRACTOR_SPEED * dt` to it when not currently blocked, and feed that accumulated value into the existing waypoint-interpolation logic (which already computes position from `s = (t * TRACTOR_SPEED) % perimeter` — trivial to adapt to take a distance directly instead of multiplying time by speed internally).
- **Bull-position visibility for the tractor:** `BullHerd.tsx` owns all live bull positions in a ref (`runtimes.current`), which `Farm.tsx`'s `Tractor` component has no access to. The cleanest fix, consistent with the existing `tractorState` module-level pattern (written by `Tractor`, read by `BullHerd`), is a small reverse channel — e.g. a `herdState` module that `BullHerd` updates each frame with a lightweight snapshot of bull positions (or just the minimum distance to the tractor's last known position, to avoid recomputing full arrays on the reader side), which the `Tractor` component reads before deciding whether to advance.
- **Wheel primitive:** `MeshBuilder` (in `scripts/generate-models.mjs`) currently only has `box()` and `prism()`. A new `cylinder(matKey, radius, height, segments, tx, ty, tz, opts)` method needs to generate a radial fan of vertices for two end-caps plus the side wall — same manual-triangulation style already used for `box()`/`prism()`, no new dependencies.
- **Mascot hitbox:** `LandmarkModel` (used by `Mascot.tsx`) takes `hitboxSize` as an explicit prop already, so this is a one-line change, not a structural one.

## Success Metrics

- Zero visible tractor-bull overlap across a full patrol loop with the herd actively wandering nearby (confirmed via observation, same bar as the existing bull-avoids-tractor check)
- Tractor visibly pauses and resumes at least once during a 60-second observation window with the current herd size
- Wheels read as round, not boxy, in a default-camera-distance screenshot
- Mascot is visibly larger than a regular bull in a side-by-side screenshot comparison, with no clipping into the barn/signpost/fence

## Open Questions

- **[Design]** Exact `TRACTOR_STOP_RADIUS` value — a reasonable starting point is close to the existing `TRACTOR_CLEARANCE` (2.8 units) used for the bulls'-side avoidance, possibly slightly larger so the tractor reacts before a bull is already right on top of it. Final number is a quick visual-tuning call during implementation, not a blocking decision.
- **[Design]** Whether the mascot's info-bubble copy should be updated to mention her size (e.g. "the big one") — not requested, assumed out of scope, but worth a quick gut-check.
