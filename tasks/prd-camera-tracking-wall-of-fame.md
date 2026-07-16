# PRD: Camera Tracking for Wall of Fame + Winner Pager

## Introduction

Today, opening a Tobu bubble — whether by tapping a Wall of Fame name (prd-winner-navigation-and-polish US-004) or paging prev/next through a repeat winner's other wins (US-003) — only changes the bubble's *content*. The 3D camera never moves and nothing in the pasture indicates which of the 20–40 wandering bulls the story belongs to. With Wall of Fame explicitly designed so "any Tobu related to the clicked name is fine" (no picking/searching needed), the natural next gap is: once that bubble is open, the viewer still has to visually hunt for the matching bull themselves.

This adds **camera tracking**: when the displayed Tobu changes via Wall of Fame or the pager, the camera eases toward that Tobu's bull and a highlight ring appears under it, so the physical bull is identified in the same motion that opened its story.

Locked decisions (from clarification):
- **Visual treatment**: camera pan (eased, ~600ms) **plus** a highlight ring under the bull's feet — a pan alone risks leaving the viewer still scanning a crowded pasture.
- **Snap-to-once**, not continuous follow: the camera/ring settle on the bull's position at the moment of the Wall of Fame click or pager step, like a photo taken at that instant. The bull is free to keep wandering afterward; the camera does not chase it.
- **Trigger scope**: Wall of Fame click and pager prev/next only. A direct tap on a bull in the 3D scene does **not** trigger tracking — the viewer is already looking at that exact bull, so there's nothing to help them find.

## Goals

- Clicking a Wall of Fame name visibly identifies which bull in the pasture belongs to that person, without the viewer hunting for it
- Paging prev/next through a repeat winner's wins visibly identifies each different bull as the pager steps
- The camera move is smooth and quick (not a jarring teleport) and never overshoots the pasture's existing pan bounds
- The highlight ring is easy to spot against the grass and disappears cleanly when no longer relevant
- No change to direct bull-tap behavior (camera already framed correctly; no tracking motion needed)
- No regression to existing camera controls (free pan/zoom/rotate) — tracking is a one-time nudge, not a lock

## User Stories

### US-001: Camera eases toward the tracked bull
**Description:** As a viewer who just clicked a Wall of Fame name or paged to another win, I want the camera to smoothly move toward that bull, so I don't have to search the pasture myself.

**Acceptance Criteria:**
- [ ] When the currently-open Tobu changes via a Wall of Fame click, the camera eases its pan target toward that Tobu's bull's live position at the moment of the trigger
- [ ] When the currently-open Tobu changes via a pager prev/next step, the same easing occurs toward the newly-shown win's bull
- [ ] Tapping a bull directly in the 3D scene does **not** trigger this camera move (existing tap-to-open behavior unchanged)
- [ ] The ease completes in roughly 500–800ms, using a smooth (non-linear) curve — not an instant jump, not a slow drift
- [ ] The existing pan-bound clamp (`computePanLimit`) still applies — the camera never eases to a target outside the fenced area
- [ ] Zoom level and rotation are left as the viewer had them; only the pan target (and camera position, to keep the same relative offset) moves
- [ ] If the viewer manually pans/zooms/rotates *during* the ease, the ease stops immediately and manual control takes over (no fighting the user's input)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Highlight ring marks the tracked bull
**Description:** As a viewer, I want a clear visual marker on the correct bull once the camera arrives, so I can confirm which one it is even in a crowd.

**Acceptance Criteria:**
- [ ] A ring/glow marker appears at the tracked bull's feet, sized to be clearly visible against the grass and distinct from the bull's own coat color
- [ ] The marker appears at the bull's position at the moment of tracking (matching the "snap-to-once" camera behavior — it does not follow the bull if it wanders afterward)
- [ ] The marker is present only while its Tobu's bubble is the one currently open; it's removed when the bubble closes or a *non-tracking* bubble opens (e.g., direct bull tap, mascot, Wall of Fame itself)
- [ ] Switching between wins via the pager moves the marker to the new bull each step (old marker removed, new one appears at the new bull's position)
- [ ] The marker doesn't block or interfere with tapping the bull underneath it or any other bull nearby
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Live bull positions exposed for tracking
**Description:** As a developer, I need each bull's current position accessible outside `BullHerd`'s internal render loop, so the camera/marker can read where to go.

**Acceptance Criteria:**
- [ ] Bull positions (keyed by Tobu id) are published each frame to a shared, non-React-state channel (matching the existing `tractorState`/`herdState` module-singleton pattern) so reading them doesn't trigger extra re-renders
- [ ] The published positions always reflect the same live coordinates `BullHerd` is currently rendering — no lag beyond the existing one-frame staleness already accepted elsewhere in the codebase (e.g., `herdState.minDistToTractor`)
- [ ] Entries are cleaned up when a bull is removed from the herd (e.g., roster changes), matching `BullHerd`'s existing runtime cleanup
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Add a module-level singleton (e.g., `bullPositions: Map<tobuId, {x, z}>`) alongside `tractorState`/`herdState`; `BullHerd` writes each bull's position into it every frame, keyed by Tobu id, and prunes removed ids the same way its `runtimes` map already does.
- FR-2: Add a `trackedTobuId: string | null` prop threaded from `App.tsx` → `Farm` → a new small tracking component rendered inside the `Canvas`.
- FR-3: `App.tsx` sets `trackedTobuId` when (a) `handleSelectWinner` (Wall of Fame click) opens a bubble, and (b) the pager's prev/next handlers fire. It does **not** set it on a direct bull-tap open (`BullHerd`'s existing `onClick` → `selectTobu` path is untouched and does not set `trackedTobuId`).
- FR-4: The tracking component reads `trackedTobuId` and, on each *change* of that value (not every frame), captures the bull's current position from FR-1's map and begins an eased pan of the `MapControls` target + camera position toward it, respecting `computePanLimit`.
- FR-5: The same component renders a ring/marker mesh at the captured position, visible only while `trackedTobuId` matches the currently-open bubble's Tobu id; removed when `trackedTobuId` is cleared or changes to a bull whose bubble represents a non-tracked open (e.g., closed entirely).
- FR-6: `trackedTobuId` is cleared (set to `null`) whenever the bubble closes, a bull is tapped directly, or the mascot/leaderboard/other overlays open — so a stale marker never lingers into an unrelated view.
- FR-7: If the viewer manually operates `MapControls` (pan/zoom/rotate) while an ease is in progress, the ease is cancelled immediately in favor of manual input.

## Non-Goals

- **No continuous following** — the camera/ring settle once per trigger and do not chase a wandering bull afterward.
- **No tracking on direct bull taps** — tapping a bull in the pasture opens its bubble exactly as today, with no camera motion.
- **No change to the pan/zoom/rotate controls themselves** — `MapControls`' existing behavior, bounds, and limits are unchanged; tracking only nudges the target once per trigger.
- **No persistent multi-marker view** — only one bull is ever highlighted at a time (the currently-tracked one), not e.g. all of a repeat winner's bulls simultaneously.
- **No tracking for the mascot** — she's a single fixed landmark, not part of the wandering herd; this feature is scoped to herd bulls only.
- **No new Firestore data** — bull positions are already-computed runtime values; nothing is persisted.

## Design Considerations

- **Ease curve**: an ease-out curve (fast start, gentle settle) reads as "the camera noticed and moved," matching the "quickly move/track" framing from the request — a linear pan would feel mechanical, a heavily-eased one would feel sluggish for a ~600ms move.
- **Ring style**: should sit flush on the ground (a flat ring/decal, not a floating halo) so it doesn't visually compete with the bull's own silhouette; a warm brand-yellow tone reads well against the grass shader and ties into the app's existing accent color.
- **Interrupt-friendly**: canceling the ease the instant the viewer touches the controls (per FR-7) is important on mobile, where a drag-to-pan gesture starting mid-ease would otherwise feel like it's fighting the user.
- **Pager + tracking together**: since paging already swaps the bubble's content in place (prd-winner-navigation-and-polish US-003), the camera ease/ring update is a natural companion motion — the viewer pages, the view moves, the ring lands — reinforcing "this is a different physical bull now."

## Technical Considerations

- **Position channel**: `BullHerd.tsx`'s per-frame `useFrame` already computes every visible bull's `Vector3` position in its `runtimes` map — writing `{x, z}` into a new shared singleton (same file as `tractorState`/`herdState`, e.g. `bullPositions`) is a small addition to code that already runs every frame; no new render cost.
- **Camera control surface**: `Farm.tsx`'s `FarmControls` already holds a ref to the `MapControlsImpl` instance and directly mutates `controls.target` / `controls.object.position` in `clampPan` — the new tracking component follows the identical pattern (read the ref, lerp `target` and `position` together over several frames, same relative camera-to-target offset preserved so the "zoom level" and viewing angle don't visibly change).
- **Trigger plumbing**: `trackedTobuId` needs to reach from `App.tsx` (where `handleSelectWinner` and the pager's `selectTobu` calls live) down through `Farm`'s props to a component inside the `Canvas` — the same prop-drilling pattern already used for `onFirstFrame`/`onBarnClick`/etc.
- **Distinguishing tracked vs. untracked opens**: `App.tsx` already knows exactly which code path opened a given bubble (`handleSelectWinner` for Wall of Fame, the pager's inline `onClick`s, vs. `BullHerd`'s own `onClick` → `selectTobu`) — so setting/clearing `trackedTobuId` is a matter of which call sites additionally call a new setter, not new detection logic.

## Success Metrics

- Clicking any Wall of Fame name results in a visibly moving camera and a ring appearing on a bull within ~1 second
- Paging prev/next through a repeat winner's wins visibly relocates the ring/camera each step
- Tapping a bull directly in the pasture shows no camera movement (regression check)
- No degradation to existing pan/zoom/rotate responsiveness or frame rate with the herd at typical size (~27–50 bulls)
- No console errors; tsc/lint/build clean

## Open Questions

- Exact ring visual (flat decal vs. a thin animated pulse) is an implementation-time art choice, not a blocking decision.
- Should the ease distance/duration scale with how far the camera currently is from the target (a bull across the whole pasture vs. one nearby), or stay a fixed ~600ms regardless of distance? Defaulting to a fixed duration for predictability; flagged for a possible follow-up tune.
