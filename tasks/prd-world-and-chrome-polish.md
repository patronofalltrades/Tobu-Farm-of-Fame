# PRD: World Completeness & Chrome Polish

## Introduction

The [farm visual rehaul](prd-farm-visual-rehaul.md) fixed the core rendering architecture (real low-poly models, single-draw-call walk shader, wander FSM) but under-scoped the environment itself. In testing, three problems surfaced that were flagged in the rehaul's retro but never had dedicated user stories:

1. **A visible rendering bug**: the 60×60 ground plane runs out before the camera's view distance, so a flat gray band (the raw `Environment` HDRI backdrop) is visible at the horizon in every screenshot — it reads as broken, not stylized.
2. **The pasture feels empty**, not just "incomplete" — a single flat green tone with 3–13 small objects scattered across a 28×28 fenced square has no texture variation, no scale reference, and nothing to break up the negative space.
3. **The HTML chrome fights the 3D scene for space.** The persistent header banner (title + data-source status + instructions, always visible) eats up to a third of the mobile viewport, directly contradicting the original product PRD's "no tabs, no navigation — the farm is the app" principle (`docs/tobu_wall_of_fame_prd.md` §2).

This PRD scopes the fix for all three: a horizon/ground-edge bug fix, light environmental dressing (ground texture variation + scattered trees/bushes/rocks), and a collapse of the persistent header into a minimal top bar with contextual (not always-on) messaging. It does **not** cover a full biome redesign (terrain height variation, ponds, zoning) — that's explicitly deferred.

## Goals

- Eliminate the visible gray horizon-band rendering bug
- Make the ground read as textured grass, not a flat plastic-green plane
- Add enough static scenery (trees, bushes, rocks) that the pasture doesn't look like an empty test level
- Replace the persistent, space-eating header with a minimal top bar
- Move instructional and status text out of permanent screen real estate into contextual, dismissible surfaces
- Preserve all existing interactions (tap-to-bubble, barn/signpost/mascot, wander animation, reactions) without regression

## User Stories

### US-001: Fix the horizon/ground-edge rendering bug
**Description:** As a visitor, I want the horizon to look like sky meeting ground, not a flat gray wall, so the scene doesn't look broken.

**Acceptance Criteria:**
- [ ] No gray/flat HDRI backdrop band is visible at any camera angle within the existing `OrbitControls` bounds (`minDistance={6}`, `maxDistance={30}`, `maxPolarAngle={Math.PI / 2.2}`)
- [ ] Fix uses a combination of: an oversized outer ground plane beyond the fenced pasture (e.g. 400×400, textured to blend into a duller/hazier tone at distance) and `THREE.Fog` (or `<fog>` in `Farm.tsx`'s `<Canvas>`) to fade distant geometry into the sky color, so no hard seam is visible
- [ ] Fog color matches the `Sky`/`Environment` tone so the transition is invisible at the default camera position
- [ ] No performance regression — the oversized outer plane is a single low-poly mesh, not a new draw-call-heavy system
- [ ] Typecheck passes
- [ ] Verify in browser using dev server — rotate/zoom through the full `OrbitControls` range and confirm no gray band at any angle

### US-002: Ground texture variation
**Description:** As a visitor, I want the grass to look like grass — with some color variation — instead of one uniform flat green, so the pasture feels like real ground.

**Acceptance Criteria:**
- [ ] The pasture ground material shows visible color/tone variation (e.g. patchy darker/lighter green, subtle noise-based texture or vertex-color blend) instead of a single flat `meshStandardMaterial` hue
- [ ] Variation is either a lightweight procedural shader effect (reusing the `onBeforeCompile` pattern already established for the bull walk shader) or a tileable low-res texture — no large texture files that blow the payload budget (see US-005 in [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md), 3MB total asset ceiling still applies)
- [ ] Ground still reads as flat-shaded/toy-style, consistent with the rest of the art direction — not photorealistic
- [ ] No measurable fps regression at 40 bulls (reuse the frame-sampling method from the farm rehaul's US-005 verification)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

### US-003: Scatter static scenery (trees, bushes, rocks)
**Description:** As a visitor, I want to see trees, bushes, and rocks around the pasture so it feels like a real place, not an empty test level.

**Acceptance Criteria:**
- [ ] At least 3 new low-poly static GLB assets exist: tree, bush, rock (generated via the same procedural pipeline as `scripts/generate-models.mjs`, matching the existing flat-shaded low-poly art direction and Barcelona-adjacent natural palette)
- [ ] Scenery is placed outside the fenced pasture (beyond `x, z: [-14, 14]`) and along/near the fence line, using deterministic placement (fixed seed or hand-authored positions) — not randomized per page load, so the farm looks stable across reloads
- [ ] Scenery renders efficiently: repeated objects (e.g. multiple trees) use `InstancedMesh` or `<Clone>` batching consistent with the existing `Fences` component pattern in `Farm.tsx`, not one draw call per object
- [ ] Scenery does not block or overlap the existing landmark tap targets (barn, signpost, mascot) or the bulls' wander bounds/exclusion zones
- [ ] Combined new asset payload stays within the existing 3MB total budget from the farm rehaul PRD
- [ ] Typecheck passes
- [ ] Verify in browser using dev server — confirm scenery is visible from the default camera position and doesn't clip into landmarks

### US-004: Collapse the persistent header into a minimal top bar
**Description:** As a mobile visitor, I want the 3D farm to fill most of my screen, not share it with a permanent text banner, so exploring the farm feels like the main experience.

**Acceptance Criteria:**
- [ ] The persistent header shrinks to a single slim bar containing only: a compact title/icon, the mute button, and the admin trigger (consolidating the currently separate fixed-position admin button into the same bar)
- [ ] The top bar's height does not scale with content — it stays a fixed, small height (e.g. ≤56px) regardless of viewport width, so it never grows to consume a third of a mobile screen
- [ ] The 3D canvas occupies the remaining viewport height (current `flex: 1` behavior in `.canvas-wrap` is preserved or improved)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server on a 375×812 mobile viewport — confirm the top bar takes no more than ~7% of vertical space

### US-005: Move instructional/status text to contextual surfaces
**Description:** As a first-time visitor, I want to see how to use the farm once, without permanent on-screen clutter, so the interface stays out of the way after I've learned it.

**Acceptance Criteria:**
- [ ] The "Tap the barn to submit · signpost for leaderboard · bulls for stories" instructional copy appears in a dismissible toast/banner shown once per session (or once ever, via `localStorage`, consistent with the existing roster-picker persistence pattern) — not as permanent header text
- [ ] The toast auto-dismisses after a short duration (e.g. 6–8 seconds) or on tap/swipe, whichever comes first
- [ ] The "Data source: Live Firebase / Demo fallback" status text is removed from permanent display; it only appears as a small, unobtrusive indicator (e.g. an icon or badge) when there IS a problem (Firebase error/fallback), not during normal operation
- [ ] No existing functionality is lost — the information is still discoverable (e.g. via the mascot's info bubble, which already exists and already explains the farm's purpose)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server — confirm the toast appears on first load, dismisses correctly, and does not reappear on a subsequent reload (same session/localStorage state)

## Functional Requirements

- FR-1: Add `<fog>` to the `Canvas` in `Farm.tsx`, tuned to match the `Sky`/`Environment` horizon color
- FR-2: Add a second, larger ground mesh beyond the existing 60×60 plane (or resize the existing plane), positioned/textured so its edge is hidden by fog before the camera's `maxDistance` of 30
- FR-3: Extend the ground material with a procedural tone-variation shader (via `onBeforeCompile`, reusing the pattern from `BullHerd.tsx`) or a small tileable texture
- FR-4: Add `tree`, `bush`, `rock` GLB generation to `scripts/generate-models.mjs` (or an equivalent Fable-sourced asset drop), following the existing low-poly/flat-shaded/vertex-colored convention
- FR-5: Add a `Scenery` component (parallel to `Fences`) that places the new decorative models at fixed, hand-chosen or seeded positions outside the pasture bounds, batched via `InstancedMesh`/`Clone` for repeated instances
- FR-6: Consolidate `MuteButton` and the admin trigger button into a single fixed-height top bar component, replacing the current `.header` element in `App.tsx`
- FR-7: Replace the always-visible instructional `<p>` elements in the header with a dismissible, `localStorage`-gated first-visit toast component
- FR-8: Replace the always-visible data-source status text with a conditional small indicator, shown only when `hasFirebaseError` is true or Firebase is unconfigured
- FR-9: All new GLB assets must be added to `vite.config.ts`'s PWA precache globs and `useGLTF.preload()` calls in `src/scene/models.ts`, consistent with the existing asset pipeline

## Non-Goals

- No terrain height variation (hills, slopes) — flat pasture stays flat
- No pond, water features, or new landmark structures
- No new farm zones/layout changes — existing landmark positions (barn, signpost, mascot) are unchanged
- No day/night cycle or weather system
- No change to the wander FSM, walk shader, or coat-pattern system from the farm rehaul (already shipped, out of scope here)
- No change to the speech bubble, reaction system, barn submission form, leaderboard, or admin panel logic (only their container chrome, per US-004/US-005)
- No real-device testing infrastructure (BrowserStack, physical device lab) — acceptance criteria rely on DevTools emulation and viewport resizing, consistent with the farm rehaul PRD
- No bull-to-scenery collision avoidance — bulls' existing wander exclusion-zone logic is not required to account for new decorative objects unless they visually overlap the pasture interior (which US-003 avoids by placement)

## Design Considerations

- Fog color and ground-tone variation must stay within the existing flat-shaded, toy-like art direction — no photorealistic textures or gradients that clash with the low-poly models
- New scenery (trees, bushes, rocks) should lean into the Barcelona/countryside setting implied by the original PRD, using natural greens/browns/grays rather than the red/yellow/blue palette (which stays reserved for barn/signpost/mascot/fence accents)
- The collapsed top bar should still clearly communicate "this is Tobu Farm of Fame" at a glance — a small icon + short title is sufficient; full descriptive copy moves to the toast/mascot bubble
- Reuse the existing roster-picker/guest-mode `localStorage` persistence pattern (`src/stores/useFarmStore.ts`) for the first-visit toast's dismissal state, rather than inventing a new mechanism

## Technical Considerations

- **Horizon fix approach:** The recommended technique is the standard "oversized ground + fog" trick used broadly in three.js scenes — cheap, no new draw calls beyond one additional mesh, and doesn't require reworking the `Sky`/`Environment` setup. This should be implemented and verified before US-002/US-003 land, since it's a pure bug fix with no art dependency.
- **Scenery batching:** Follow the same `<Clone>`-per-segment pattern already used for `Fences` in `Farm.tsx`, or `InstancedMesh` if scenery count grows large — avoid one draw call per tree/bush/rock.
- **Ground shader reuse:** The `onBeforeCompile` technique from `BullHerd.tsx`'s walk shader is directly reusable for ground tone variation (same Three.js material-patching approach, different injection point — `#include <color_fragment>` rather than `#include <begin_vertex>`).
- **Chrome consolidation:** `MuteButton` (`src/components/MuteButton.tsx`) and the admin trigger (currently inline in `App.tsx`) both need to move into a shared top-bar container; check both components' existing z-index/positioning assumptions before merging.
- **Toast persistence:** Reuse `localStorage` key conventions already established by `useFarmStore.ts` (`tobu_user_name`, `tobu_guest`) — e.g. `tobu_intro_seen`.
- **No Firestore/data model changes** — this PRD is purely rendering and UI chrome; no changes to `Tobu` type or Firebase functions.

## Success Metrics

- Zero visible gray horizon band across the full `OrbitControls` camera range
- Ground reads as textured (not flat single-hue) in a side-by-side screenshot comparison against the farm rehaul's baseline
- At least 3 scenery object types visible from the default camera position
- Top bar height ≤7% of viewport on a 375×812 mobile screen (down from the current ~33%)
- No fps regression versus the farm rehaul's measured baseline (~60fps median at 13 and 40 bulls)

## Open Questions

- Should the first-visit toast also cover the mascot's role, or should that information stay exclusively in the mascot's tap-triggered info bubble to avoid duplicating copy?
- Should scenery density scale with viewport size (more trees on desktop, fewer on mobile) for performance headroom, or stay fixed regardless of device?
- Is a full biome pass (terrain variation, pond, zoning) worth scoping as a follow-up PRD once this lands, or should the farm stay a flat pasture indefinitely per the original product PRD's "few weeks, no hard deadline" scope note?
