# PRD: Farm Visual & Interaction Rehaul

## Introduction

The current Tobu Farm of Fame renders a functional but placeholder 3D scene: bulls, barn, signpost, and mascot are all procedurally-generated boxes with a single flat hue, and bulls sit in one fixed spot per winner, only bobbing up and down and swaying in place (`src/scene/BullHerd.tsx`, `src/hooks/useBullColor.ts`). This does not deliver on the PRD's original vision of a "smooth low-poly, Animal Crossing meets Monument Valley" farm that feels alive.

This rehaul replaces placeholder geometry with real low-poly art (generated with Fable) and gives bulls genuine autonomous movement — wandering, turning, walking animations — so the farm reads as a living pasture instead of a static diorama. The result must still run as a mobile-first web app (opened via URL, installable as a PWA, no native APK) within a defined performance budget.

This is a visual/behavioral rehaul, not a new-feature PRD — the existing data model, Firebase backend, speech bubble interaction ([prd-speech-bubble-tap-interaction.md](prd-speech-bubble-tap-interaction.md)), and UI overlays (barn form, leaderboard, admin panel) are unchanged and out of scope.

See [decision-log.md](decision-log.md) for the resolved animation-architecture decision (DEC-001) and [tech-farm-visual-rehaul.md](tech-farm-visual-rehaul.md) for the implementation spec Fable should follow.

## Goals

- Replace all placeholder box geometry (bull, barn, signpost, mascot, fencing) with real low-poly 3D models and materials, generated with Fable
- Give each bull a per-instance color/pattern that reads as a distinct "skin," not a single flat hue
- Make bulls wander autonomously around the farm — walking, turning, idle-standing — instead of bobbing in a fixed spot
- Maintain the existing tap-to-view-speech-bubble interaction without regression
- Hit a concrete mobile performance budget: 60fps target, 30fps floor, on a mid-range phone in portrait
- Ship as a URL-accessible PWA — no native app packaging

## User Stories

### US-001: Replace placeholder bull model with low-poly art
**Description:** As a visitor, I want bulls to actually look like bulls (not colored boxes) so the farm feels like a real place, not a prototype.

**Acceptance Criteria:**
- [ ] A new low-poly bull GLTF/GLB model (flat-shaded, toy-like, matching the existing art direction) replaces `public/models/bull.glb`
- [ ] The model is a **static, unrigged mesh** — no bones, no skeleton, no baked GLTF animation clips (per [DEC-001](decision-log.md#dec-001)). Legs must be modelable/separable enough that a vertex-height threshold can isolate them for shader-driven displacement — see the [Technical Requirements doc](tech-farm-visual-rehaul.md) for the exact mesh convention Fable must follow
- [ ] Each bull instance still supports a per-instance color/pattern tint (existing `instanceColor` mechanism or equivalent)
- [ ] Model file size is optimized for mobile load (target: under 300KB per model, Draco-compressed if needed)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server — confirm bulls render as bull-shaped, not boxes

### US-002: Replace placeholder landmark models (barn, signpost, mascot, fences)
**Description:** As a visitor, I want the barn, signpost, and mascot to look like real farm structures so the whole scene feels cohesive.

**Acceptance Criteria:**
- [ ] New low-poly GLB models for barn, signpost, and mascot replace the current placeholder boxes in `public/models/`
- [ ] Fence posts/rails are replaced with low-poly wood-style geometry (currently raw `boxGeometry` in `Farm.tsx`'s `Fences` component)
- [ ] All models share a consistent art style (flat shading, Barcelona palette: red `#D50032`, yellow `#FFCD00`, blue `#004D98`) per the existing PRD's `docs/tobu_wall_of_fame_prd.md` §6
- [ ] Existing tap targets (barn → submit form, signpost → leaderboard, mascot → info bubble) continue to work unchanged
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

### US-003: Bulls wander the farm autonomously
**Description:** As a visitor, I want to see bulls walking around the pasture so the farm feels alive, not static.

**Acceptance Criteria:**
- [ ] Each bull has a target position it walks toward; on arrival, it pauses (idle-stand) for a randomized duration, then picks a new nearby target within the fenced pasture bounds
- [ ] Bulls rotate to face their direction of travel while walking
- [ ] Movement is smooth (no teleporting) and stays within the fence boundary (reuse/extend the existing `[-14, 14]` pasture bounds in `Farm.tsx`)
- [ ] Each bull's wander pattern is deterministic per its `bull_pattern_seed` on initial load, but the animation itself runs client-side per frame (no server sync needed — this is ambient, non-authoritative motion)
- [ ] Bulls do not need to avoid colliding with each other (no complex flocking/avoidance) — per scope decision, only ambient autonomous wandering is required, not bull-to-bull interaction
- [ ] Walk animation (leg swing + body bob) is a **bone-free procedural vertex shader effect** driven by a per-instance phase attribute, not skeletal animation — per [DEC-001](decision-log.md#dec-001). All bulls render through a single `InstancedMesh` draw call
- [ ] Tapping a wandering bull still opens its speech bubble immediately (no requirement to stop moving first)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server — observe bulls walking for at least 30 seconds, confirm no bull leaves the fenced area

### US-004: Distinct per-winner bull appearance
**Description:** As a visitor, I want to visually recognize repeat winners' bulls at a glance, matching the original PRD requirement (§2.2).

**Acceptance Criteria:**
- [ ] Replace the single-hue `bullColorFromSeed` (currently `hsl(hue, 65%, 55%)`) with a richer deterministic look: e.g., base coat color + a spot/patch pattern, both derived from the winner's seed
- [ ] The same winner's multiple bulls (repeat winners) share the identical coat/pattern
- [ ] Pattern generation remains deterministic (same seed always produces the same look, no randomness at runtime)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server — confirm two bulls from the same winner look identical, and bulls from different winners look visually distinct

### US-005: Mobile performance budget compliance
**Description:** As a mobile visitor, I want the farm to run smoothly on my phone so exploring it doesn't feel janky or drain my battery.

**Acceptance Criteria:**
- [ ] Farm scene sustains ≥30fps (floor) with the full expected bull count (~36-40, per original PRD §2.1) on a mid-range mobile device profile (e.g., Chrome DevTools mobile CPU throttle 4x, iPhone 12 / Pixel 6 class)
- [ ] Farm scene targets 60fps under the same conditions with typical current bull count (~12-13, one term's worth)
- [ ] All bull instances continue to render via a single `InstancedMesh` (or documented equivalent) — no per-bull draw call
- [ ] Total scene asset payload (all GLB models + textures) stays under 3MB combined, gzip/Draco-compressed
- [ ] Verify using browser performance profiling (Chrome DevTools Performance tab or `preview_eval` FPS sampling) — record actual fps with 13 and 40 simulated bulls
- [ ] Verify in browser using dev server on a resized mobile viewport (375×812)

### US-006: Confirm PWA / web-app delivery (no regression)
**Description:** As a section member, I want to keep opening the farm from a shared link and adding it to my home screen, not download an APK.

**Acceptance Criteria:**
- [ ] App continues to build and deploy as a standard Vite web bundle (no native wrapper, no Capacitor/Cordova/React Native introduced)
- [ ] Existing PWA manifest (`vite.config.ts`'s `VitePWA` config) continues to validate — installable via "Add to Home Screen" on iOS/Android
- [ ] New GLB/texture assets are added to the PWA precache glob patterns (`workbox.globPatterns` in `vite.config.ts`) so the app remains usable offline after first load
- [ ] Typecheck passes
- [ ] Verify in browser using dev server — confirm PWA install prompt / manifest still resolves correctly

## Functional Requirements

- FR-1: Replace `public/models/bull.glb`, `barn.glb`, `signpost.glb`, `mascot.glb` with new low-poly art assets generated via Fable
- FR-2: Replace the procedural `boxGeometry` fence posts/rails in `Farm.tsx`'s `Fences` component with low-poly fence models or improved procedural geometry matching the new art direction
- FR-3: Extend `bullColorFromSeed` (or introduce a new `bullPatternFromSeed`) to output a coat color + pattern descriptor instead of a single HSL hue
- FR-4: Add a per-bull wander behavior: each bull tracks a current position, target position, and movement state (walking / idle), updated per-frame in `useFrame`
- FR-5: Bulls must stay within the existing pasture bounds (`x: [-14, 14]`, `z: [-14, 14]` minus landmark exclusion zones)
- FR-6: Bull rotation must face the direction of travel during walking state
- FR-7: The `InstancedMesh` rendering approach in `BullHerd.tsx` must be preserved — walk animation is achieved via a custom vertex shader (procedural, bone-free) applied to the shared instanced geometry, not per-bull `SkinnedMesh`/`AnimationMixer` (see [DEC-001](decision-log.md#dec-001))
- FR-8: Tap detection (`e.instanceId` → `selectTobu`) must continue to work regardless of a bull's current animated position
- FR-9: All new GLB assets must be added to `vite.config.ts`'s PWA precache patterns and `useGLTF.preload()` calls in `src/scene/models.ts`
- FR-10: New assets must ship at a combined payload under 3MB (compressed) to keep initial load reasonable on mobile networks

## Non-Goals

- No bull-to-bull social interaction, flocking, or collision avoidance (per scope decision — ambient wandering only)
- No changes to the speech bubble interaction, reaction system, barn submission form, leaderboard, or admin panel (already implemented, out of scope)
- No native app packaging (no Capacitor, Cordova, React Native, or APK build)
- No terrain variation, trees, ponds, or new environmental set-dressing beyond replacing existing landmark placeholders (deferred — see Open Questions)
- No new farm layout or zoning — landmarks keep their current positions
- No day/night cycle or weather system
- No change to the underlying Firestore data model or bull count/capacity logic

## Design Considerations

- Art direction must match the existing PRD's style guide (`docs/tobu_wall_of_fame_prd.md` §6): smooth low-poly, flat shading, toy-like, Animal Crossing/Monument Valley inspired
- Color palette stays anchored to Barcelona/Catalonia colors: red `#D50032`, yellow `#FFCD00`, blue `#004D98`, applied to barn/signpost/fence accents
- Bull coat patterns should be legible at the camera's default distance (`camera={{ position: [0, 8, 14], fov: 50 }}` in `Farm.tsx`) — avoid fine detail that disappears at that zoom level
- Reuse `@react-three/drei`'s `useGLTF` loading pattern already established in `src/scene/models.ts`

## Technical Considerations

- **Fable's role:** Fable generates the art direction and 3D asset source material (concept art, textures, potentially base meshes); a human/agent workflow converts that into optimized GLB files. Fable may also assist in writing the wander-behavior and shader/material code, per the user's clarification that Fable supports both art and implementation.
- **Animated InstancedMesh constraint — DECIDED:** Three.js's standard `InstancedMesh` does not natively support per-instance skeletal animation. Per [DEC-001](decision-log.md#dec-001), this rehaul uses **option (a): a bone-free procedural vertex shader** (per-instance phase uniform/attribute drives leg-swing + body-bob), validated by a throwaway one-bull spike before the full art pipeline is committed. `THREE.SkinnedMesh` per bull (option b) is explicitly rejected — it breaks the single-draw-call architecture and is the most likely path to miss the 30fps floor at ~40 bulls. Baked Vertex Animation Textures (option c) remain the documented fallback if the procedural shader reads as too crude after playtesting; see the [Technical Requirements doc](tech-farm-visual-rehaul.md) for the full shader spec and mesh convention Fable must follow.
- **Existing seed-based determinism:** `bullPositionFromSeed` currently returns a fixed static position; wandering requires this to become an *initial* position/seed for a per-frame simulation rather than the final resting spot. Keep the seed as the source of the bull's wander-pattern phase/offset so behavior stays reproducible across reloads without needing to persist live position to Firestore.
- **Asset pipeline:** `scripts/generate-models.mjs` currently procedurally generates the placeholder GLBs — this script (or a replacement) needs to produce/import the new Fable-directed assets instead.
- **PWA cache impact:** Larger, more detailed GLBs increase the service worker precache size — validate against `workbox.globPatterns` limits and confirm install/update flow still works after the asset swap.
- **Backward compatibility:** No Firestore schema changes required — `bull_pattern_seed` remains the single source of truth for both position-seed and coat-pattern derivation.

## Success Metrics

- Farm scene sustains ≥30fps floor / 60fps target per US-005's device profile, verified via profiling
- Zero placeholder box geometry remains in the rendered scene (bull, barn, signpost, mascot, fences all use real low-poly models)
- Bulls visibly move to a new position within any 30-second observation window (not static)
- Combined new asset payload stays under the 3MB budget
- No regression in existing interactions (tap-to-bubble, barn submit, leaderboard, admin panel) after the rehaul — confirmed via the [speech bubble PRD's](prd-speech-bubble-tap-interaction.md) existing acceptance criteria still passing

## Open Questions

- Should the wander radius per bull scale with the farm's total bull count (denser farm = smaller per-bull wander radius) to avoid crowding as more Tobus are awarded over the program?
- Should environmental set-dressing (trees, terrain variation) be scoped as a fast-follow PRD, or deliberately deferred indefinitely?
- What's the actual mobile device baseline for testing — do we have access to a real mid-range Android/iPhone, or is DevTools throttling emulation sufficient for this program's needs?

**Resolved:** Walk-cycle fidelity (bone-free procedural leg-swing + body-bob vs. true skeletal animation) — see [DEC-001](decision-log.md#dec-001). Animation approach for `InstancedMesh` at scale — see [DEC-001](decision-log.md#dec-001).
