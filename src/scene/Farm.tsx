import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, Clone } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { BullHerd } from './BullHerd';
import { Barn } from './Barn';
import { Signpost } from './Signpost';
import { Mascot } from './Mascot';
import { useFenceModel, useTreeModel, useBushModel, useRockModel, useTractorModel } from './models';
import {
  approvedCount,
  computeCameraMaxDistance,
  computeFenceSegments,
  computePastureBound,
  computeSceneryRing,
} from './farmLayout';
import { useFarmStore } from '../stores/useFarmStore';
import './models';

// Sky/environment horizon tone — fog fades distant geometry into this so the
// oversized ground plane's edge is never visible (US-001).
const SKY_COLOR = '#87ceeb';

interface FarmProps {
  onBarnClick?: () => void;
  onMascotClick?: () => void;
  onSignpostClick?: () => void;
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

/** Red tractor parked beside the barn. Matching exclusion zone lives in
 *  BullHerd's LANDMARK_EXCLUSIONS so bulls never clip through it. */
function Tractor() {
  const { scene } = useTractorModel();
  return <Clone object={scene} position={[-11.5, 0, -8.5]} rotation={[0, 0.7, 0]} />;
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

export function Farm({ onBarnClick, onMascotClick, onSignpostClick }: FarmProps) {
  const tobus = useFarmStore((s) => s.tobus);
  const bound = computePastureBound(approvedCount(tobus));
  return (
    <Canvas shadows={false} camera={{ position: [0, 8, 14], fov: 50 }}>
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
      <Tractor />
      <Signpost onClick={onSignpostClick} />
      <BullHerd />

      <OrbitControls
        enablePan
        enableZoom
        maxPolarAngle={Math.PI / 2.2}
        minDistance={6}
        maxDistance={computeCameraMaxDistance(bound)}
      />
    </Canvas>
  );
}
