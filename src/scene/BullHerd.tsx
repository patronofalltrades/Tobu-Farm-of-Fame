import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { useFarmStore } from '../stores/useFarmStore';
import {
  bullCoatFromSeed,
  bullPositionFromSeed,
  hashString,
  mulberry32,
} from '../hooks/useBullColor';
import { useBullModel } from './models';
import { mergeGltfMeshes } from './gltfUtils';
import { computePastureBound } from './farmLayout';
import type { Tobu } from '../types';
import { playMoo } from '../audio/useFarmAudio';

const _matrix = new Matrix4();
const _color = new Color();
const _quat = new Quaternion();
const _scale = new Vector3(1, 1, 1);
const _dir = new Vector3();
const UP = new Vector3(0, 1, 0);

// Wander tuning (tech-farm-visual-rehaul.md §5)
const WALK_SPEED = 1.2;
const ARRIVE_THRESHOLD = 0.15;
const WANDER_RADIUS = 3;
const IDLE_MIN = 2;
const IDLE_MAX = 6;
const FENCE_MARGIN = 1; // wander stays this far inside the fence line
const TURN_RATE = 4; // rad/sec toward travel heading

const LANDMARK_EXCLUSIONS: Array<{ x: number; z: number; r: number }> = [
  { x: -8, z: -6, r: 2.5 },     // barn
  { x: 0, z: 0, r: 2.0 },       // mascot
  { x: 8, z: -4, r: 1.5 },      // signpost
  { x: -11.5, z: -8.5, r: 2.0 }, // tractor (Farm.tsx <Tractor /> position)
];

// Herd separation: bulls softly push each other apart so they never stand
// inside one another. Center-to-center target distance ≈ one body length.
const MIN_SEPARATION = 1.4;
const SEPARATION_RELAX = 0.35; // fraction of overlap corrected per frame (softens jitter)

interface BullRuntime {
  position: Vector3;
  target: Vector3;
  heading: number;
  state: 'idle' | 'walking';
  stateChangeTime: number;
  idleUntil: number;
  rng: () => number;
}

interface IndexedTobu {
  tobu: Tobu;
  index: number;
}

function insideExclusion(x: number, z: number): boolean {
  return LANDMARK_EXCLUSIONS.some(
    (e) => (x - e.x) * (x - e.x) + (z - e.z) * (z - e.z) < e.r * e.r,
  );
}

function pickTarget(from: Vector3, rng: () => number, out: Vector3, wanderBound: number): void {
  for (let attempt = 0; attempt < 5; attempt++) {
    const angle = rng() * Math.PI * 2;
    const dist = 0.8 + rng() * WANDER_RADIUS;
    const x = Math.min(Math.max(from.x + Math.cos(angle) * dist, -wanderBound), wanderBound);
    const z = Math.min(Math.max(from.z + Math.sin(angle) * dist, -wanderBound), wanderBound);
    if (!insideExclusion(x, z)) {
      out.set(x, 0, z);
      return;
    }
  }
  out.copy(from); // give up this round; bull idles in place a bit longer
}

/** Shortest-arc angle lerp so bulls turn smoothly through ±π. */
function turnToward(current: number, desired: number, maxDelta: number): number {
  let diff = desired - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + Math.min(Math.max(diff, -maxDelta), maxDelta);
}

export function BullHerd() {
  const tobus = useFarmStore((s) => s.tobus);
  const selectTobu = useFarmStore((s) => s.selectTobu);
  const selectedTobuId = useFarmStore((s) => s.selectedTobuId);
  const gltf = useBullModel();
  const meshRef = useRef<InstancedMesh>(null);
  const runtimes = useRef(new Map<string, BullRuntime>());

  const geometry = useMemo(() => mergeGltfMeshes(gltf.scene), [gltf.scene]);

  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({ color: '#ffffff', flatShading: true });
    mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
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
           attribute float aSpotSeed;
           attribute float aSpotIntensity;
           uniform float uTime;
           uniform float uWalkFrequency;
           uniform float uLegSwingAmplitude;
           uniform float uBodyBobFrequency;
           uniform float uBodyBobAmplitude;
           uniform float uIdleBreathFrequency;
           uniform float uIdleBreathAmplitude;
           uniform float uBlendDuration;
           varying vec3 vLocalPos;
           varying float vSpotSeed;
           varying float vSpotIntensity;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vLocalPos = position;
           vSpotSeed = aSpotSeed;
           vSpotIntensity = aSpotIntensity;

           float blendT = clamp((uTime - aStateStart) / uBlendDuration, 0.0, 1.0);
           float walkAmount = mix(1.0 - blendT, blendT, step(0.5, aState));

           // Diagonal leg pairs move in opposite phase (trot gait).
           float diagOffset = step(0.0, position.x * position.z) * 3.14159;
           float legPhase = uTime * uWalkFrequency + aPhase + diagOffset;
           transformed.z += sin(legPhase) * uLegSwingAmplitude * aLegWeight * walkAmount;

           float bodyBob = sin(uTime * uBodyBobFrequency + aPhase) * uBodyBobAmplitude * walkAmount;
           float idleBreath = sin(uTime * uIdleBreathFrequency + aPhase) * uIdleBreathAmplitude * (1.0 - walkAmount);
           transformed.y += bodyBob + idleBreath;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vLocalPos;
           varying float vSpotSeed;
           varying float vSpotIntensity;

           float coatHash(vec2 p) {
             return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
           }
           float coatNoise(vec2 p) {
             vec2 i = floor(p);
             vec2 f = fract(p);
             vec2 u = f * f * (3.0 - 2.0 * f);
             return mix(
               mix(coatHash(i), coatHash(i + vec2(1.0, 0.0)), u.x),
               mix(coatHash(i + vec2(0.0, 1.0)), coatHash(i + vec2(1.0, 1.0)), u.x),
               u.y);
           }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           {
             // Procedural coat patches: big soft blobs over body sides.
             vec2 coatUv = vLocalPos.zy * 2.2 + vec2(vSpotSeed * 37.0, vSpotSeed * 61.0);
             float n = coatNoise(coatUv);
             float spots = smoothstep(0.62, 0.72, n);
             diffuseColor.rgb *= 1.0 - spots * vSpotIntensity;
           }`,
        );

      mat.userData.shader = shader;
    };
    return mat;
  }, []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const indexed = useMemo<IndexedTobu[]>(() => {
    const perWinner = new Map<string, number>();
    return tobus
      .filter((t) => t.status === 'approved')
      .map((t) => {
        const i = perWinner.get(t.winner_name) ?? 0;
        perWinner.set(t.winner_name, i + 1);
        return { tobu: t, index: i };
      });
  }, [tobus]);

  const count = indexed.length;
  const wanderBound = computePastureBound(count) - FENCE_MARGIN;

  // Per-instance shader attributes, rebuilt when the herd roster changes.
  const instanceAttrs = useMemo(() => {
    const phase = new Float32Array(count);
    const state = new Float32Array(count);
    const stateStart = new Float32Array(count);
    const spotSeed = new Float32Array(count);
    const spotIntensity = new Float32Array(count);
    indexed.forEach(({ tobu, index }, i) => {
      const coat = bullCoatFromSeed(tobu.bull_pattern_seed, index);
      phase[i] = (hashString(tobu.bull_pattern_seed + index) % 628) / 100;
      spotSeed[i] = coat.spotSeed;
      spotIntensity[i] = coat.spotIntensity;
    });
    return {
      aPhase: new InstancedBufferAttribute(phase, 1),
      aState: new InstancedBufferAttribute(state, 1),
      aStateStart: new InstancedBufferAttribute(stateStart, 1),
      aSpotSeed: new InstancedBufferAttribute(spotSeed, 1),
      aSpotIntensity: new InstancedBufferAttribute(spotIntensity, 1),
    };
  }, [indexed, count]);

  useEffect(() => {
    geometry.setAttribute('aPhase', instanceAttrs.aPhase);
    geometry.setAttribute('aState', instanceAttrs.aState);
    geometry.setAttribute('aStateStart', instanceAttrs.aStateStart);
    geometry.setAttribute('aSpotSeed', instanceAttrs.aSpotSeed);
    geometry.setAttribute('aSpotIntensity', instanceAttrs.aSpotIntensity);
  }, [geometry, instanceAttrs]);

  // Seed runtimes + instance colors when the roster changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    const seen = new Set<string>();
    indexed.forEach(({ tobu, index }, i) => {
      seen.add(tobu.id);
      if (!runtimes.current.has(tobu.id)) {
        const spawn = bullPositionFromSeed(tobu.bull_pattern_seed, index);
        const rng = mulberry32(hashString(tobu.bull_pattern_seed + ':' + index));
        runtimes.current.set(tobu.id, {
          position: new Vector3(spawn.x, 0, spawn.z),
          target: new Vector3(spawn.x, 0, spawn.z),
          heading: rng() * Math.PI * 2,
          state: 'idle',
          stateChangeTime: 0,
          idleUntil: rng() * IDLE_MAX,
          rng,
        });
      }
      _color.setStyle(bullCoatFromSeed(tobu.bull_pattern_seed, index).baseColor);
      mesh.setColorAt(i, _color);
    });
    for (const id of runtimes.current.keys()) {
      if (!seen.has(id)) runtimes.current.delete(id);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [indexed, count]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const now = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1); // clamp tab-switch spikes

    let stateAttrDirty = false;

    indexed.forEach(({ tobu }, i) => {
      const rt = runtimes.current.get(tobu.id);
      if (!rt) return;

      if (rt.state === 'walking') {
        _dir.subVectors(rt.target, rt.position);
        _dir.y = 0;
        const dist = _dir.length();
        if (dist < ARRIVE_THRESHOLD) {
          rt.state = 'idle';
          rt.stateChangeTime = now;
          rt.idleUntil = now + IDLE_MIN + rt.rng() * (IDLE_MAX - IDLE_MIN);
          instanceAttrs.aState.setX(i, 0);
          instanceAttrs.aStateStart.setX(i, now);
          stateAttrDirty = true;
        } else {
          _dir.normalize();
          const desired = Math.atan2(_dir.x, _dir.z);
          rt.heading = turnToward(rt.heading, desired, TURN_RATE * dt);
          const step = Math.min(WALK_SPEED * dt, dist);
          rt.position.addScaledVector(_dir, step);
        }
      } else if (now >= rt.idleUntil) {
        pickTarget(rt.position, rt.rng, rt.target, wanderBound);
        if (rt.target.distanceToSquared(rt.position) > ARRIVE_THRESHOLD * ARRIVE_THRESHOLD) {
          rt.state = 'walking';
          rt.stateChangeTime = now;
          instanceAttrs.aState.setX(i, 1);
          instanceAttrs.aStateStart.setX(i, now);
          stateAttrDirty = true;
        } else {
          rt.idleUntil = now + IDLE_MIN + rt.rng() * (IDLE_MAX - IDLE_MIN);
        }
      }
    });

    // Separation pass: soft pairwise push-apart so bulls never overlap.
    // O(n²) is fine at herd scale (~27–50); relaxation spreads the
    // correction over a few frames so clusters ease apart without jitter.
    const rts = indexed.map(({ tobu }) => runtimes.current.get(tobu.id));
    for (let a = 0; a < count; a++) {
      const ra = rts[a];
      if (!ra) continue;
      for (let b = a + 1; b < count; b++) {
        const rb = rts[b];
        if (!rb) continue;
        let dx = rb.position.x - ra.position.x;
        let dz = rb.position.z - ra.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= MIN_SEPARATION * MIN_SEPARATION) continue;
        let dist = Math.sqrt(d2);
        if (dist < 1e-4) {
          // Coincident (e.g. same spawn ring slot): split along a
          // deterministic per-index direction instead of dividing by ~0.
          const ang = a * 2.399963; // golden angle spreads directions
          dx = Math.cos(ang);
          dz = Math.sin(ang);
          dist = 0;
        } else {
          dx /= dist;
          dz /= dist;
        }
        const push = (MIN_SEPARATION - dist) * SEPARATION_RELAX * 0.5;
        ra.position.x -= dx * push;
        ra.position.z -= dz * push;
        rb.position.x += dx * push;
        rb.position.z += dz * push;
      }
    }

    // Containment + compose: keep everyone inside the fence and out of
    // landmark footprints (also stops walk paths clipping through the barn
    // or the parked tractor), then write instance matrices.
    indexed.forEach((_, i) => {
      const rt = rts[i];
      if (!rt) return;
      rt.position.x = Math.min(Math.max(rt.position.x, -wanderBound), wanderBound);
      rt.position.z = Math.min(Math.max(rt.position.z, -wanderBound), wanderBound);
      for (const e of LANDMARK_EXCLUSIONS) {
        const ex = rt.position.x - e.x;
        const ez = rt.position.z - e.z;
        const ed2 = ex * ex + ez * ez;
        if (ed2 < e.r * e.r && ed2 > 1e-6) {
          const ed = Math.sqrt(ed2);
          const out = (e.r - ed) * SEPARATION_RELAX;
          rt.position.x += (ex / ed) * out;
          rt.position.z += (ez / ed) * out;
        }
      }
      _quat.setFromAxisAngle(UP, rt.heading);
      _matrix.compose(rt.position, _quat, _scale);
      mesh.setMatrixAt(i, _matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (stateAttrDirty) {
      const attrs = mesh.geometry.attributes;
      (attrs.aState as InstancedBufferAttribute).needsUpdate = true;
      (attrs.aStateStart as InstancedBufferAttribute).needsUpdate = true;
    }
    const meshMaterial = mesh.material as MeshStandardMaterial;
    const shader = meshMaterial.userData.shader as
      | WebGLProgramParametersWithUniforms
      | undefined;
    if (shader) shader.uniforms.uTime.value = now;
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      key={count}
      ref={meshRef}
      args={[geometry, material, count]}
      onClick={(e) => {
        e.stopPropagation();
        const i = e.instanceId;
        if (i === undefined || i < 0) return;
        playMoo();
        const tappedId = indexed[i].tobu.id;
        selectTobu(tappedId === selectedTobuId ? null : tappedId);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    />
  );
}
