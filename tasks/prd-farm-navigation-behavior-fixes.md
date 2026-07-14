# PRD: Farm Navigation & Behavior Fixes

## Introduction

The farm currently locks camera navigation to an orbit pivot centered on Mama Tobu (the mascot at the world origin), and several herd-behavior bugs remain visible: bulls still cluster and overlap at load, still occasionally crash into each other while wandering, and the roster picker's dropdown opens itself before the user asks for it. The tractor (added this session) is a static prop with no motion and no exclusion tracking beyond a fixed circle.

This PRD covers six fixes: free camera panning untethered from the mascot, deterministic non-overlapping bull spawn placement, target-aware wandering so bulls stop picking occupied spots, a moving rectangular tractor patrol with live bull avoidance, a roster dropdown that stays closed until the user asks for it, and recoloring Mama Tobu to black.

## Goals

- Users can freely pan the camera across the whole farm, not just orbit around the mascot
- No two bulls visibly overlap at any point — at load, or during wander
- The tractor patrols a rectangular loop around the farm continuously, and bulls never walk through its current position
- The roster picker never shows its dropdown until the user explicitly taps/focuses the search field
- Mama Tobu (the mascot) is recolored to black

## User Stories

### US-001: Free-pan camera navigation
**Description:** As a user exploring the farm, I want to drag to pan the camera anywhere across the map, not just orbit around a fixed point at the mascot, so I can look at any part of the farm without fighting the controls.

**Acceptance Criteria:**
- [ ] Dragging the view translates the camera across the X/Z plane instead of (or in addition to) rotating around a fixed pivot at the origin
- [ ] Zoom (scroll/pinch) still works and respects the existing `minDistance`/`maxDistance` bounds (computed from `computeCameraMaxDistance`)
- [ ] The camera cannot pan infinitely far — panning is bounded so the user can't scroll past the scenery ring into empty space
- [ ] Existing tap-to-interact behavior (bulls, barn, signpost, mascot, tractor) is unaffected by the control change
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Deterministic non-overlapping bull spawn placement
**Description:** As a user loading the farm, I want every bull to appear in a distinct, spread-out spot, so the herd doesn't look like a pile-up the moment the page loads.

**Acceptance Criteria:**
- [ ] Initial spawn positions for all approved Tobus are computed with a guaranteed minimum pairwise distance (not just independent per-bull hashing that can coincidentally overlap)
- [ ] Spawn placement remains deterministic — the same set of approved Tobus always produces the same layout across reloads (no `Math.random()`)
- [ ] Spawn placement respects the pasture bound (`computePastureBound`) and all landmark exclusion zones (barn, mascot, signpost, tractor)
- [ ] At the current 27-bull count, no two bulls render overlapping in the first rendered frame (verified via screenshot immediately after load, not after wander has had time to separate them)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Target-aware wandering (no walking into each other)
**Description:** As a user watching the herd, I want bulls to never crash into each other while wandering, so the farm looks alive instead of glitchy.

**Acceptance Criteria:**
- [ ] When a bull picks its next wander target, it does not choose a point that is already within the minimum separation distance of any other bull's current position or current target
- [ ] The existing reactive separation pass (soft push-apart) remains as a safety net, but is no longer the primary mechanism preventing overlap
- [ ] Observed over a 60-second window with the full current herd, no two bulls visibly interpenetrate at any point
- [ ] No regression to wander smoothness (bulls still turn/walk fluidly, no visible stuttering from the added target-rejection logic)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Tractor patrols a rectangular route
**Description:** As a user watching the farm, I want the tractor to drive a loop around the farm instead of sitting parked, so the farm feels more alive.

**Acceptance Criteria:**
- [ ] The tractor continuously follows a fixed rectangular path (four waypoints) around the farm, looping indefinitely
- [ ] The tractor rotates to face its direction of travel at each leg of the rectangle
- [ ] The path stays within the fenced pasture (or a deliberately chosen outer loop — see Open Questions) and doesn't clip through the barn, signpost, or mascot
- [ ] Motion is smooth (no teleporting between waypoints)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill — observe the tractor complete at least one full loop

### US-005: Bulls avoid the moving tractor (and vice versa)
**Description:** As a user watching the herd, I want bulls to never get run over by or walk into the tractor, so the two systems don't visibly collide.

**Acceptance Criteria:**
- [ ] Bulls treat the tractor's current live position as a moving exclusion zone (same radius-based avoidance already used for static landmarks, now updated every frame)
- [ ] A bull already standing where the tractor is about to pass gets pushed clear before the tractor reaches it
- [ ] A wandering bull never picks a wander target that is inside the tractor's exclusion radius at target-selection time
- [ ] The tractor's path and speed are fixed and uninterrupted — it does not slow, stop, or reroute for bulls (bulls always yield, per product decision)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill — confirm no bull visibly overlaps the tractor across a full patrol loop

### US-006: Roster dropdown stays closed until the user asks for it
**Description:** As a first-time visitor, I want the name picker to start closed so I'm not shown a giant list before I've done anything, so the first impression is calm, not overwhelming.

**Acceptance Criteria:**
- [ ] On page load, the roster search field is present but the dropdown list is **not** expanded
- [ ] The dropdown opens only when the user explicitly taps/clicks/focuses the search field themselves (not as a side effect of the initial page mount)
- [ ] Once opened by the user, all existing behavior (type-to-filter, arrow-key nav, outside-tap-to-close) works exactly as it does today
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill — reload the page and confirm the dropdown is closed on first paint

### US-007: Mama Tobu recolored to black
**Description:** As a user viewing the farm, I want the mascot at the center of the farm to look like a black bull, so it's visually distinct from the rest of the herd's Barcelona-palette coats.

**Acceptance Criteria:**
- [ ] The mascot's main body/head/torso color is black (or near-black)
- [ ] The mascot remains visually distinct as "the mascot" rather than blending into the regular herd (existing scarf/horn/eye accent details may stay to preserve this — see Design Considerations)
- [ ] Regenerating via `node scripts/generate-models.mjs` produces the updated `mascot.glb` with no manual post-processing step
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Replace or reconfigure the camera controls in `Farm.tsx` so dragging translates the camera across the ground plane rather than orbiting a fixed target at the origin, while preserving pinch/scroll zoom within existing distance bounds
- FR-2: Bound the pan range so the camera cannot be dragged past the outer scenery ring into empty space
- FR-3: Replace independent per-bull spawn hashing (`bullPositionFromSeed`) with a deterministic placement algorithm that assigns each approved Tobu a slot with guaranteed minimum spacing from every other bull and every landmark exclusion zone
- FR-4: Extend `pickTarget` (or its caller in `BullHerd.tsx`) to reject candidate wander targets that fall within `MIN_SEPARATION` of any other bull's current position or current target, retrying before falling back to idling in place
- FR-5: Add a `Tractor` motion system (likely a `useFrame`-driven position update, either in the `Tractor` component or a new `farmLayout.ts` helper) that advances the tractor along a 4-waypoint rectangular loop and updates its rotation to face its heading
- FR-6: Lift the tractor's live position into a place `BullHerd.tsx` can read every frame (e.g. a small Zustand slice or a shared mutable ref/module singleton) so the tractor's `LANDMARK_EXCLUSIONS` entry tracks its real-time position instead of a static constant
- FR-7: Apply the same exclusion-avoidance logic already used for static landmarks to the tractor's live position, for both the reactive containment pass and the predictive target-picking pass (FR-4)
- FR-8: Remove the `autoFocus` (or the auto-open side effect) from `RosterPicker.tsx`'s search input so the dropdown only opens from a genuine user-initiated focus/click event
- FR-9: In `scripts/generate-models.mjs`'s `mascot()` function, change the main body palette color to black (or add a new `blackCoat` palette entry) and regenerate `mascot.glb`

## Non-Goals

- No keyboard (WASD/arrow-key) camera movement — drag-pan and pinch/scroll-zoom only, per the chosen navigation model
- No separate top-down/map-view camera mode — this is a modification of the existing 3D view's pan behavior, not a new view
- No tractor swerving, slowing, or stopping for bulls — the tractor's rectangular loop is fixed and uninterrupted; avoidance responsibility is entirely on the bulls
- No true physics/rigid-body collision engine — separation remains the existing lightweight seed-based placement + reactive push-apart approach, just strengthened with predictive target rejection
- No changes to reaction system, leaderboard, admin panel, barn submission flow, or speech bubble/commentary features (all separate, unaffected systems)
- No change to the mascot's tap interaction (still opens the existing info bubble) — this PRD only changes its color

## Design Considerations

- **Mascot color:** the assumption going in is a black body/torso/head, keeping the existing cream horns, red Senyera scarf, and dark eyes as accents — full solid black with zero accent color would make it hard to tell the mascot apart from a regular black-coated herd bull (a black hue already exists in `COAT_HUES`) at a glance from the default camera distance. If the intent is fully solid black with no accents, flag that back and it's a one-line change to drop the scarf/horn colors too.
- **Tractor loop placement:** the rectangle's exact corners aren't specified by the request. Default assumption: a loop just inside the fence line, sized to avoid clipping the barn/signpost/mascot exclusion zones, at roughly the same speed as a walking bull (`WALK_SPEED`) so it doesn't look frantic or glacial. Final corner coordinates are an implementation-time visual call, not a blocking decision.
- **Camera pan technique:** `@react-three/drei` ships a `MapControls` component (an `OrbitControls` variant with map-style left-drag-to-pan / right-drag-to-rotate semantics) that may fit this ask more directly than hand-customizing `OrbitControls`. Worth evaluating first before writing custom pan logic.

## Technical Considerations

- **Camera:** `MapControls` from `@react-three/drei` is the natural starting point for FR-1/FR-2 — it's designed for exactly this "pan across a ground plane" interaction model and is a drop-in swap for the current `OrbitControls` import.
- **Spawn placement (FR-3):** needs to move from "each bull computes its own position independently" to "the full set of approved Tobus is placed together in one pass" (e.g., a deterministically-shuffled grid or Poisson-disc-style sampler seeded from the existing `hashString`/`mulberry32` utilities) — a structural change to how `BullHerd.tsx`'s spawn-seeding effect works, not just a tweak to the existing per-bull formula.
- **Predictive targeting (FR-4):** `BullHerd.tsx`'s `useFrame` already builds an `rts` array of every bull's live `BullRuntime` each frame — the data needed to check "is this candidate target too close to anyone else's position/target" already exists in scope; `pickTarget`'s signature needs to grow to accept that list.
- **Tractor state sharing (FR-6):** avoid re-rendering the whole scene tree on every tractor frame update — a plain module-level mutable object (mirroring the pattern already used for audio singletons in `useFarmAudio.ts`) or a non-reactive ref is preferable to putting the tractor's position in Zustand, which would trigger React re-renders 60 times a second.
- **Mascot (FR-9):** this is procedural-GLB generation, same pipeline as the recent barn detail pass — no new tooling, just a palette change in `scripts/generate-models.mjs` followed by `node scripts/generate-models.mjs`.
- **Roster dropdown (FR-8):** the fix is almost certainly deleting one prop (`autoFocus`) and/or decoupling the `onFocus` handler from firing on the React-triggered mount-time focus event versus a real user gesture — small, contained change in `RosterPicker.tsx`.

## Success Metrics

- Zero visible bull-bull overlap in a 60-second observation window at the current 27-bull herd size (spot-checked via screenshots at load and mid-wander)
- Camera can be dragged to view any point on the ground plane within the scenery ring, without needing to first "escape" an orbit pivot
- Tractor completes a visible rectangular loop with no bull overlap observed across at least one full circuit
- Dropdown is confirmed closed on first paint across multiple fresh-reload checks
- Mascot renders black in the default camera view

## Open Questions

- **[Design]** Exact tractor loop corner coordinates and speed — flagged in Design Considerations as a visual-iteration decision, not blocking.
- **[Design]** Whether "black bull" for Mama Tobu means fully solid black (no scarf/horn/eye accents) or black body with existing accents kept — default assumption stated above; easy to flip either way.
- **[Engineering]** Whether `MapControls` alone satisfies FR-1/FR-2 or whether custom pan-bounding logic is still needed on top of it — a quick spike during implementation will settle this, not blocking spec approval.
