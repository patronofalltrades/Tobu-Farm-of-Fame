# Technical Requirements: Farm Visual & Interaction Rehaul

Implementation spec for [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md), for Fable (art + implementation) to follow. Locks in [DEC-001](decision-log.md#dec-001): bone-free procedural vertex-shader animation, single `InstancedMesh`, no skeletal rigging.

---

## 1. Requirements

### 1.1 Functional Requirements (asset + shader specific)

| ID | Requirement |
|----|-------------|
| TR-1 | Bull mesh is static/unrigged; legs must be identifiable by a per-vertex weight so a shader can isolate them |
| TR-2 | Walk animation (leg swing + body bob) runs entirely in a vertex shader, driven by per-instance attributes |
| TR-3 | Idle-standing bulls get a subtle breathing bob, distinct from the walking bob |
| TR-4 | Bull heading (facing direction) stays a CPU-computed instance-matrix rotation — unchanged mechanism from today |
| TR-5 | Wander target-picking respects pasture bounds and landmark exclusion zones |
| TR-6 | Landmark models (barn, signpost, mascot) and fences are static — no shader animation needed |
| TR-7 | All new models preserve existing tap-target behavior (`onClick` handlers keyed by position/instanceId) |

### 1.2 Non-Functional Requirements

Same budget as [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md) US-005: 60fps target / 30fps floor at ~40 bulls on a throttled mobile profile; combined new-asset payload under 3MB compressed.

---

## 2. High-Level Design

```
Fable-authored mesh (Blender/DCC, static, vertex-color-weighted legs)
        │  export
        ▼
public/models/bull.glb  (unrigged, POSITION + COLOR_0 attributes)
        │  load (useGLTF)
        ▼
src/scene/gltfUtils.ts → mergeGltfMeshes()
        │  EXTEND: also merge COLOR_0.r into a custom `aLegWeight` BufferAttribute
        ▼
src/scene/BullHerd.tsx
        │  geometry: adds per-vertex `aLegWeight`, per-instance `aPhase` / `aState` / `aStateStart`
        │  material: MeshStandardMaterial + onBeforeCompile vertex patch
        │  useFrame: CPU wander FSM → instance matrix (position+rotation), rare instance-attribute writes on state change
        ▼
GPU vertex shader: displaces leg vertices (swing) + all vertices (body bob), gated by aLegWeight / aState blend
```

Rendering stays a **single `InstancedMesh`, one draw call** for the whole herd — this is the entire point of DEC-001.

---

## 3. Mesh Convention Fable Must Follow

### 3.1 Local space

- Origin: ground level, centered between the four feet (matches today's placeholder — see §7 below for the exact placeholder geometry it replaces)
- +Y up, +Z forward (direction the bull faces / walks)
- Feet rest at local `y = 0` (current placeholder has feet near `y ≈ -0.005`, close enough; new model should hit `y = 0` exactly so the instance offset in `BullHerd.tsx` can become a clean constant, e.g. `y = 0` instead of today's `0.5`)

### 3.2 Leg weight (primary technique: vertex color)

Paint a vertex color channel (`COLOR_0`, red channel) as a per-vertex weight, **not** a hard height cutoff:
- `1.0` (white) on leg vertices, fully affected by the swing shader
- `0.0` (black) on torso/head/tail vertices, rigid
- Values in between are allowed at the leg/body join for a soft blend (avoids visible seams)

This is the standard cheap technique used for wind-sway foliage / instanced-crowd shaders — it gives the artist direct control instead of the pipeline guessing from geometry.

**Fallback if vertex colors aren't feasible from the art pipeline:** derive `aLegWeight` automatically from a height threshold (`smoothstep` between two Y values measured from the mesh's own bounding box) in `mergeGltfMeshes`. This is strictly a fallback — vertex color is preferred because it's authoritative and doesn't need per-model threshold tuning.

### 3.3 Polycount & file size

- Target under 300KB per GLB (Draco-compressed if the toolchain supports it)
- Keep leg geometry simple (a swinging box/cylinder reads fine at the fixed camera distance — no need for joints or multiple bones' worth of detail)

### 3.4 Materials

- Flat-shaded, matching existing `flatShading: true` convention (`src/scene/BullHerd.tsx`)
- Base mesh should be a neutral white/gray — per-instance coat color and pattern are applied at runtime via `instanceColor` (US-004), not baked into the GLB texture

---

## 4. Shader Spec

### 4.1 Attributes and uniforms

| Name | Scope | Type | Source |
|---|---|---|---|
| `aLegWeight` | per-vertex | `float` (0–1) | Baked from `COLOR_0.r` in `mergeGltfMeshes` |
| `aPhase` | per-instance | `float` | `hash(bull_pattern_seed) % (2π)` |
| `aState` | per-instance | `float` (0 or 1) | CPU wander FSM: `0 = idle`, `1 = walking` |
| `aStateStart` | per-instance | `float` | `clock.elapsedTime` at the bull's last state transition |
| `uTime` | global uniform | `float` | `clock.elapsedTime`, updated every frame |
| `uWalkFrequency` | constant/uniform | `float` | e.g. `6.0` (leg cycles/sec at full stride) |
| `uLegSwingAmplitude` | constant/uniform | `float` | e.g. `0.12` (local units) |
| `uBodyBobFrequency` | constant/uniform | `float` | e.g. `3.0` |
| `uBodyBobAmplitude` | constant/uniform | `float` | e.g. `0.05` |
| `uIdleBreathFrequency` | constant/uniform | `float` | e.g. `0.8` |
| `uIdleBreathAmplitude` | constant/uniform | `float` | e.g. `0.015` |
| `uBlendDuration` | constant/uniform | `float` | e.g. `0.35` sec, idle↔walk crossfade |

### 4.2 Implementation technique: `onBeforeCompile`, not a raw `ShaderMaterial`

Patch the existing `MeshStandardMaterial` via `onBeforeCompile` rather than writing a fully custom shader. This keeps all of Three.js's built-in PBR lighting, shadows, and fog for free, and only injects the vertex displacement:

```ts
const material = useMemo(() => {
  const mat = new MeshStandardMaterial({ color: '#ffffff', flatShading: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWalkFrequency = { value: 6.0 };
    shader.uniforms.uLegSwingAmplitude = { value: 0.12 };
    shader.uniforms.uBodyBobFrequency = { value: 3.0 };
    shader.uniforms.uBodyBobAmplitude = { value: 0.05 };
    shader.uniforms.uIdleBreathFrequency = { value: 0.8 };
    shader.uniforms.uIdleBreathAmplitude = { value: 0.015 };
    shader.uniforms.uBlendDuration = { value: 0.35 };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float aLegWeight;
         attribute float aPhase;
         attribute float aState;
         attribute float aStateStart;
         uniform float uTime;
         uniform float uWalkFrequency;
         uniform float uLegSwingAmplitude;
         uniform float uBodyBobFrequency;
         uniform float uBodyBobAmplitude;
         uniform float uIdleBreathFrequency;
         uniform float uIdleBreathAmplitude;
         uniform float uBlendDuration;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float blendT = clamp((uTime - aStateStart) / uBlendDuration, 0.0, 1.0);
         float walkAmount = aState > 0.5 ? blendT : (1.0 - blendT);

         float legPhase = uTime * uWalkFrequency + aPhase;
         transformed.z += sin(legPhase) * uLegSwingAmplitude * aLegWeight * walkAmount;

         float bodyBob = sin(uTime * uBodyBobFrequency + aPhase) * uBodyBobAmplitude * walkAmount;
         float idleBreath = sin(uTime * uIdleBreathFrequency + aPhase) * uIdleBreathAmplitude * (1.0 - walkAmount);
         transformed.y += bodyBob + idleBreath;`,
      );

    mat.userData.shader = shader; // keep a handle so useFrame can update shader.uniforms.uTime
  };
  return mat;
}, []);
```

`transformed` here is the vertex position in the mesh's **local/instance** space — Three.js's built-in `<instancedMesh>` shader chunk (`#include <project_vertex>`, later in the pipeline) applies `instanceMatrix` after this, so this patch composes correctly with the existing per-instance position/rotation matrix from `BullHerd.tsx`'s wander FSM. No change needed to how position/heading are computed today.

### 4.3 Per-frame uniform update

In `useFrame`, alongside the existing instance-matrix loop:

```ts
if (material.userData.shader) {
  material.userData.shader.uniforms.uTime.value = state.clock.elapsedTime;
}
```

---

## 5. Wander Behavior (CPU side, `BullHerd.tsx`)

### 5.1 Per-bull runtime state

Kept in a `useRef` map (not React state — avoid re-renders), keyed by `tobu.id`:

```ts
interface BullRuntime {
  position: Vector3;
  target: Vector3;
  state: 'idle' | 'walking';
  stateChangeTime: number; // clock.elapsedTime at last transition, feeds aStateStart
  idleUntil: number;       // clock.elapsedTime when idle ends
  rng: () => number;       // seeded PRNG (e.g. mulberry32 keyed off hash(seed + index))
}
```

Initialize each bull's `position`/`target` from the existing `bullPositionFromSeed(seed, index)` — that function's output becomes the **spawn point**, not a fixed resting position.

### 5.2 Per-frame FSM (inside the existing `useFrame` loop)

For each bull, per frame:

1. **If `state === 'walking'`:** move `position` toward `target` at a constant `WALK_SPEED` (e.g. `1.2` units/sec) scaled by `delta`. Compute heading from the direction vector and write it into the instance matrix rotation (same mechanism as today's `sway`, but now driven by actual movement direction, not a sine wiggle). If `distance(position, target) < ARRIVE_THRESHOLD` (e.g. `0.15`): set `state = 'idle'`, `stateChangeTime = now`, `idleUntil = now + rng() * (IDLE_MAX - IDLE_MIN) + IDLE_MIN` (e.g. 2–6 sec).
2. **If `state === 'idle'`:** if `now >= idleUntil`, pick a new `target` (see §5.3), set `state = 'walking'`, `stateChangeTime = now`.
3. Write `position` + heading rotation into the instance matrix (`mesh.setMatrixAt`), same as today.
4. Only write to the `aState` / `aStateStart` instanced buffer attributes **when a transition actually happens** (not every frame) — mark `needsUpdate = true` on those attributes after any transitions this frame. This keeps the per-frame cost close to today's baseline; transitions are infrequent (every few seconds per bull) relative to the 60fps update loop.

### 5.3 Picking a new wander target

- Sample a random point within a wander radius (e.g. `3` units) of the bull's **current** position — not a full-farm random jump, so movement looks purposeful rather than teleport-adjacent
- Clamp the result to the pasture bounds: `x, z ∈ [-13, 13]` (slightly inside the `[-14, 14]` fence line from `Farm.tsx`)
- Reject (resample) if the point falls inside a landmark exclusion circle:

| Landmark | Position (`Farm.tsx`) | Exclusion radius |
|---|---|---|
| Barn | `(-8, 0, -6)` | `2.5` |
| Mascot | `(0, 0, 0)` | `2.0` |
| Signpost | `(8, 0, -4)` | `1.5` |

- Cap resampling at ~5 attempts; if still colliding, fall back to the bull's current position (effectively a short idle extension) rather than looping indefinitely

### 5.4 Determinism note

Only the **spawn** position/pattern is deterministic from `bull_pattern_seed` (needed so the farm looks stable across reloads before any bulls have moved). Live wander motion is a pure client-side simulation — per [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md) US-003, no server sync is required, and different viewers seeing bulls in slightly different live positions is expected and fine.

---

## 6. Data Model & Geometry Pipeline Changes

### 6.1 `src/scene/gltfUtils.ts` — `mergeGltfMeshes`

Extend to also produce a merged `aLegWeight` `BufferAttribute`:
- Read `COLOR_0` from each source mesh if present; use its red channel as leg weight
- If `COLOR_0` is absent, fall back to the height-threshold heuristic (§3.2) computed from the mesh's local bounding box
- Attach as `geometry.setAttribute('aLegWeight', new BufferAttribute(...))` on the merged geometry, parallel to `POSITION`

### 6.2 `src/scene/BullHerd.tsx`

- Add `InstancedBufferAttribute`s for `aPhase`, `aState`, `aStateStart` on the instanced geometry (`geometry.setAttribute('aPhase', new InstancedBufferAttribute(new Float32Array(count), 1))`, etc.), sized to `count`
- Initialize `aPhase` once per bull from `hashString(tobu.bull_pattern_seed) % (2 * Math.PI)` (reuse the existing `hashString` from `src/hooks/useBullColor.ts`)
- Replace the current `MeshStandardMaterial` with the `onBeforeCompile`-patched version from §4.2
- Replace the current bob/sway `useFrame` block with the wander FSM (§5) + shader uniform update (§4.3)

### 6.3 No Firestore/type changes

`Tobu.bull_pattern_seed` remains the sole seed source — no schema migration needed (confirmed in [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md) Technical Considerations).

---

## 7. What This Replaces

Current placeholder generation (`scripts/generate-models.mjs`) procedurally builds the bull from three box primitives with no vertex colors:
- Body: `1 × 0.9 × 1.4` at local `(0, 0.55, 0)`
- Head: `0.7 × 0.65 × 0.75` at local `(0, 1.05, 0.75)` (forward-offset, confirms `+Z` = forward)
- Four legs: `0.22 × 0.45 × 0.22` at local `(±0.32, 0.22, ±0.45)`

This script (or its replacement) needs to either import Fable-authored GLBs directly, or be replaced entirely by a manual asset-drop into `public/models/`. Either way, `scripts/generate-models.mjs` should stop being the source of truth for the bull mesh once real art lands — leave it in place only if still useful for barn/signpost/mascot placeholders during staged rollout (see §8).

---

## 8. Implementation Checklist

Ordered by dependency, matching [prd-farm-visual-rehaul.md](prd-farm-visual-rehaul.md)'s user stories:

- [x] **1. Spike:** §4 shader patch implemented in `BullHerd.tsx` via `onBeforeCompile` — leg swing (trot gait: diagonal pairs in opposite phase), walk bob, idle breath, and idle↔walk crossfade all run per-instance in one draw call. Validated DEC-001. (Went straight to the vertex-color path since the new bull mesh landed in the same pass.)
- [x] **2. Wander FSM:** Implemented per §5 — verified in browser: bulls translate, rotate to face travel direction, pause, and stay inside bounds/exclusion zones over multi-sample observation.
- [x] **3. Bull art:** New low-poly bull GLB (torso/hump/head/snout/horns/ears/tail/legs/hooves) per §3 — static mesh, `COLOR_0.r` leg weights, feet at `y=0`, +Z forward, 5.4KB. Shader reads the vertex-color path (fallback not needed).
- [x] **4. Landmark art:** Barn (red/blue/white/yellow palette, prism roof), signpost, plushie mascot with scarf, and fence-segment GLBs generated; `Farm.tsx` fence ring now uses the GLB segments.
- [x] **5. Coat patterns (US-004):** `bullCoatFromSeed` — curated 12-hue coat palette + per-winner spot seed/intensity rendered as procedural noise patches in the fragment shader. Deterministic per seed.
- [x] **6. PWA + perf:** fence.glb preloaded + covered by existing precache globs; production build precaches all 5 GLBs, 1.76MB total (< 3MB budget). Frame sampling: ~60fps median (vsync-capped) at both 13 and 40 bulls on dev hardware; real-device mobile profiling still recommended before launch.
- [x] **7. Regression:** Tap-on-moving-bull opens speech bubble (instanceId picking works mid-walk); barn/signpost/mascot tap targets verified; manifest.webmanifest builds valid.

---

## 9. What to Revisit Later

- If the vertex-color leg-weight pipeline proves hard for Fable's export path, invest in the height-threshold fallback becoming the primary path instead (simpler pipeline, less artist control)
- If playtesting shows the procedural walk still reads as too crude, escalate to Vertex Animation Textures (VAT) — the documented fallback in [DEC-001](decision-log.md#dec-001). The `onBeforeCompile` injection point in §4.2 is where a VAT sampling function would replace the sine-based swing, so this upgrade doesn't require re-architecting the render path
- Wander radius currently a fixed constant (§5.3); revisit scaling it down as bull count grows toward ~40, per the PRD's open question
