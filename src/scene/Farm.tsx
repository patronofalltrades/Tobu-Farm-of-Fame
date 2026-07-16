import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls, Sky, Environment, Clone } from '@react-three/drei';
import { MeshStandardMaterial, Vector3 } from 'three';
import type { Group, WebGLProgramParametersWithUniforms } from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { BullHerd } from './BullHerd';
import { Barn } from './Barn';
import { Signpost } from './Signpost';
import { Mascot } from './Mascot';
import {
  useFenceModel,
  useTreeModel,
  useBushModel,
  useRockModel,
  useTractorModel,
  useWheelModel,
} from './models';
import {
  approvedCount,
  computeCameraMaxDistance,
  computeFenceSegments,
  computePanLimit,
  computePastureBound,
  computeSceneryRing,
  tractorPoseFromDistance,
  TRACTOR_SPEED,
  TRACTOR_STOP_RADIUS,
  type TractorPose,
} from './farmLayout';
import { bullPositions, herdState, tractorState, trackingState } from './tractorState';
import { useFarmStore } from '../stores/useFarmStore';
import './models';

// Sky/environment horizon tone — fog fades distant geometry into this so the
// oversized ground plane's edge is never visible (US-001).
const SKY_COLOR = '#87ceeb';

interface FarmProps {
  onBarnClick?: () => void;
  onMascotClick?: () => void;
  onSignpostClick?: () => void;
  /** Fires once, on the first rendered frame — the load screen's
   *  "scene is actually visible" signal (prd-tobu-load-screen US-002). */
  onFirstFrame?: () => void;
  /** Tobu id to camera-track (Wall of Fame click / pager step); null when no
   *  tracking is active (prd-camera-tracking-wall-of-fame). */
  trackedTobuId?: string | null;
}

function FirstFrameProbe({ onFirstFrame }: { onFirstFrame?: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onFirstFrame?.();
    }
  });
  return null;
}

/** Fence ring from repeated 7-unit GLB segments around the computed pasture. */
function Fences({ bound }: { bound: number }) {
  const { scene } = useFenceModel();
  const segments = useMemo(() => computeFenceSegments(bound), [bound]);
  return (
    <group>
      {segments.map((s, i) => (
        <Clone key={i} object={scene} position={s.position} rotation={[0, s.rotY, 0]} />
      ))}
    </group>
  );
}

function ClonedField({
  scene,
  placements,
}: {
  scene: import('three').Object3D;
  placements: ReturnType<typeof computeSceneryRing>;
}) {
  return (
    <group>
      {placements.map((p, i) => (
        <Clone
          key={i}
          object={scene}
          position={p.position}
          rotation={[0, p.rotY, 0]}
          scale={p.scale}
        />
      ))}
    </group>
  );
}

// Round wheels (US-002): one GLB cloned at two scales. Positions match the
// old box-wheel slots; y = scaled radius so tires touch the ground.
const WHEEL_SLOTS: Array<{ position: [number, number, number]; scale: number }> = [
  { position: [-0.62, 0.475, -0.75], scale: 0.95 }, // big rear
  { position: [0.62, 0.475, -0.75], scale: 0.95 },
  { position: [-0.53, 0.25, 0.75], scale: 0.5 },    // small front
  { position: [0.53, 0.25, 0.75], scale: 0.5 },
];

/** Tractor on a fixed rectangular patrol just inside the fence (US-004),
 *  publishing its pose to `tractorState` for BullHerd's moving exclusion
 *  (US-005). Progress is accumulated distance, not clock time: while any
 *  bull is inside TRACTOR_STOP_RADIUS the accumulator simply stops growing,
 *  so the tractor halts in place and later resumes from the exact same
 *  spot (prd-tractor-behavior-and-mascot-scale US-001). */
function Tractor({ bound }: { bound: number }) {
  const { scene } = useTractorModel();
  const wheel = useWheelModel();
  const groupRef = useRef<Group>(null);
  const pose = useRef<TractorPose>({ x: 0, z: 0, heading: 0 });
  const traveled = useRef(0);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1); // clamp tab-switch spikes, same as BullHerd
    if (herdState.minDistToTractor > TRACTOR_STOP_RADIUS) {
      traveled.current += TRACTOR_SPEED * dt;
    }
    const p = tractorPoseFromDistance(traveled.current, bound, pose.current);
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.heading;
    tractorState.x = p.x;
    tractorState.z = p.z;
    tractorState.heading = p.heading;
    tractorState.active = true;
  });

  useEffect(() => () => {
    tractorState.active = false;
  }, []);

  return (
    <group ref={groupRef}>
      <Clone object={scene} />
      {WHEEL_SLOTS.map((w, i) => (
        <Clone key={i} object={wheel.scene} position={w.position} scale={w.scale} />
      ))}
    </group>
  );
}

/** Decorative scenery ring just outside the (auto-scaled) pasture (US-003, P0-1). */
function Scenery({ bound }: { bound: number }) {
  const tree = useTreeModel();
  const bush = useBushModel();
  const rock = useRockModel();
  const trees = useMemo(() => computeSceneryRing(bound, 'tree', 8), [bound]);
  const bushes = useMemo(() => computeSceneryRing(bound, 'bush', 7), [bound]);
  const rocks = useMemo(() => computeSceneryRing(bound, 'rock', 6), [bound]);
  return (
    <group>
      <ClonedField scene={tree.scene} placements={trees} />
      <ClonedField scene={bush.scene} placements={bushes} />
      <ClonedField scene={rock.scene} placements={rocks} />
    </group>
  );
}

/**
 * Oversized ground plane with a procedural two-tone grass shader (US-002).
 * Reuses BullHerd's `onBeforeCompile` pattern — value-noise over world XZ
 * blends two greens so the pasture reads as patchy grass, not a flat hue.
 * Kept flat-shaded and toy-like. At 400×400 the edge sits far beyond the
 * camera's maxDistance and is faded out by fog (US-001).
 */
function Ground() {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({ color: '#7CB342', flatShading: true });
    mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vWorldPos;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vWorldPos;

           float grassHash(vec2 p) {
             return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
           }
           float grassNoise(vec2 p) {
             vec2 i = floor(p);
             vec2 f = fract(p);
             vec2 u = f * f * (3.0 - 2.0 * f);
             return mix(
               mix(grassHash(i), grassHash(i + vec2(1.0, 0.0)), u.x),
               mix(grassHash(i + vec2(0.0, 1.0)), grassHash(i + vec2(1.0, 1.0)), u.x),
               u.y);
           }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           {
             // Two greens in linear space; noise-blended for a patchy pasture.
             vec3 grassLight = vec3(0.260, 0.570, 0.084);
             vec3 grassDark = vec3(0.096, 0.260, 0.033);
             float n = grassNoise(vWorldPos.xz * 0.35)
                     + 0.5 * grassNoise(vWorldPos.xz * 1.1);
             n = clamp(n / 1.5, 0.0, 1.0);
             float grassBlend = smoothstep(0.35, 0.75, n);
             diffuseColor.rgb = mix(grassDark, grassLight, grassBlend);
           }`,
        );
    };
    return mat;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={material}>
      <planeGeometry args={[400, 400]} />
    </mesh>
  );
}

const EASE_DURATION_MS = 600;

/**
 * Camera tracking (prd-camera-tracking-wall-of-fame US-001/US-002): when
 * `trackedTobuId` changes to a bull, snapshot its live position, ease the
 * MapControls target (and camera, same offset — zoom/angle preserved) toward
 * it, and drop a brand-yellow ring at that spot. Snap-to-once: the ring and
 * ease use the position at trigger time; the bull is free to wander off.
 * Any manual control input ('start' event) cancels the ease immediately.
 */
function CameraTracker({
  trackedTobuId,
  bound,
  controlsRef,
}: {
  trackedTobuId: string | null;
  bound: number;
  controlsRef: RefObject<MapControlsImpl | null>;
}) {
  // Snap-to-once: the position is snapshotted when the tracked id changes,
  // not re-read per frame — the bull may wander off afterward by design.
  const markerPos = useMemo(() => {
    if (!trackedTobuId) return null;
    const p = bullPositions.get(trackedTobuId);
    return p ? { x: p.x, z: p.z } : null;
  }, [trackedTobuId]);

  const ease = useRef<{
    fromTarget: Vector3;
    toTarget: Vector3;
    camOffset: Vector3;
    startTime: number;
  } | null>(null);

  useEffect(() => {
    if (!markerPos) {
      ease.current = null;
      trackingState.active = false;
      return;
    }
    trackingState.active = true;
    trackingState.x = markerPos.x;
    trackingState.z = markerPos.z;
    const controls = controlsRef.current;
    if (!controls) return;
    const limit = computePanLimit(bound);
    const camOffset = controls.object.position.clone().sub(controls.target);
    // Bias the landing point toward the camera so the bull settles in the
    // upper (visible) band of the screen instead of dead center, where the
    // story bubble covers it — sized for portrait phones (the card spans
    // most of the middle of the screen there; landscape cards are narrow,
    // so the higher landing spot stays comfortably visible either way).
    const toward = new Vector3(camOffset.x, 0, camOffset.z);
    const bias = toward.lengthSq() > 1e-6 ? toward.normalize().multiplyScalar(6) : toward.set(0, 0, 0);
    ease.current = {
      fromTarget: controls.target.clone(),
      toTarget: new Vector3(
        Math.min(Math.max(markerPos.x + bias.x, -limit), limit),
        0,
        Math.min(Math.max(markerPos.z + bias.z, -limit), limit),
      ),
      camOffset,
      startTime: performance.now(),
    };
  }, [markerPos, bound, controlsRef]);

  // Manual pan/zoom/rotate wins instantly — never fight the user's fingers.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = () => {
      ease.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controlsRef]);

  useFrame(() => {
    const e = ease.current;
    const controls = controlsRef.current;
    if (!e || !controls) return;
    const t = Math.min((performance.now() - e.startTime) / EASE_DURATION_MS, 1);
    const k = 1 - Math.pow(1 - t, 3); // ease-out cubic: fast start, gentle settle
    controls.target.copy(e.fromTarget).lerp(e.toTarget, k);
    controls.object.position.copy(controls.target).add(e.camOffset);
    if (t >= 1) ease.current = null;
  });

  if (!markerPos) return null;
  return (
    // raycast disabled so the ring never steals taps from the bull above it.
    <mesh
      position={[markerPos.x, 0.03, markerPos.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => null}
    >
      <ringGeometry args={[0.9, 1.2, 40]} />
      <meshBasicMaterial color="#FFCD00" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

/** Map-style controls: drag pans across the ground plane (no fixed pivot on
 *  the mascot), pinch/scroll zooms, two-finger/right-drag rotates. The pan
 *  target is clamped so users can't scroll past the scenery into the void. */
function FarmControls({
  bound,
  controlsRef,
}: {
  bound: number;
  controlsRef: RefObject<MapControlsImpl | null>;
}) {
  const panLimit = computePanLimit(bound);

  const clampPan = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const t = controls.target;
    const cx = Math.min(Math.max(t.x, -panLimit), panLimit);
    const cz = Math.min(Math.max(t.z, -panLimit), panLimit);
    if (cx !== t.x || cz !== t.z) {
      // Shift the camera by the same delta so hitting the edge stops the
      // pan cleanly instead of swinging the view direction.
      controls.object.position.x += cx - t.x;
      controls.object.position.z += cz - t.z;
      t.x = cx;
      t.z = cz;
    }
  };

  return (
    <MapControls
      ref={controlsRef}
      enablePan
      enableZoom
      screenSpacePanning={false}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={6}
      maxDistance={computeCameraMaxDistance(bound)}
      onChange={clampPan}
    />
  );
}

export function Farm({
  onBarnClick,
  onMascotClick,
  onSignpostClick,
  onFirstFrame,
  trackedTobuId = null,
}: FarmProps) {
  const tobus = useFarmStore((s) => s.tobus);
  const bound = computePastureBound(approvedCount(tobus));
  const controlsRef = useRef<MapControlsImpl>(null);
  return (
    <Canvas shadows={false} camera={{ position: [0, 8, 14], fov: 50 }}>
      <FirstFrameProbe onFirstFrame={onFirstFrame} />
      <fog attach="fog" args={[SKY_COLOR, 32, 90]} />
      <Sky sunPosition={[100, 20, 100]} />
      <Environment preset="park" />
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} color="#fff8e7" />

      <Ground />

      <Fences bound={bound} />
      <Scenery bound={bound} />
      <Mascot onClick={onMascotClick} />
      <Barn onClick={onBarnClick} />
      <Tractor bound={bound} />
      <Signpost onClick={onSignpostClick} />
      <BullHerd />

      <CameraTracker trackedTobuId={trackedTobuId} bound={bound} controlsRef={controlsRef} />
      <FarmControls bound={bound} controlsRef={controlsRef} />
    </Canvas>
  );
}
