import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, Clone } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { BullHerd } from './BullHerd';
import { Barn } from './Barn';
import { Signpost } from './Signpost';
import { Mascot } from './Mascot';
import { useFenceModel, useTreeModel, useBushModel, useRockModel } from './models';
import './models';

// Sky/environment horizon tone — fog fades distant geometry into this so the
// oversized ground plane's edge is never visible (US-001).
const SKY_COLOR = '#87ceeb';

interface FarmProps {
  onBarnClick?: () => void;
  onMascotClick?: () => void;
  onSignpostClick?: () => void;
}

/** Fence ring from repeated 7-unit GLB segments around the ±14 pasture. */
function Fences() {
  const { scene } = useFenceModel();
  const segments: Array<{ position: [number, number, number]; rotY: number }> = [];
  for (const x of [-10.5, -3.5, 3.5, 10.5]) {
    segments.push({ position: [x, 0, -14], rotY: 0 });
    segments.push({ position: [x, 0, 14], rotY: 0 });
    segments.push({ position: [-14, 0, x], rotY: Math.PI / 2 });
    segments.push({ position: [14, 0, x], rotY: Math.PI / 2 });
  }
  return (
    <group>
      {segments.map((s, i) => (
        <Clone key={i} object={scene} position={s.position} rotation={[0, s.rotY, 0]} />
      ))}
    </group>
  );
}

interface Placement {
  position: [number, number, number];
  rotY: number;
  scale: number;
}

// Deterministic, hand-authored placements outside the ±14 fenced pasture so the
// farm looks stable across reloads and never overlaps landmarks or wander bounds.
const TREE_PLACEMENTS: Placement[] = [
  { position: [-22, 0, -20], rotY: 0.4, scale: 1.1 },
  { position: [21, 0, -23], rotY: 1.9, scale: 1.25 },
  { position: [-25, 0, 9], rotY: 2.7, scale: 1.0 },
  { position: [24, 0, 16], rotY: 0.9, scale: 1.15 },
  { position: [-4, 0, -25], rotY: 3.5, scale: 1.2 },
  { position: [8, 0, 24], rotY: 5.1, scale: 1.05 },
  { position: [-18, 0, 23], rotY: 1.2, scale: 0.95 },
  { position: [19, 0, -6], rotY: 4.2, scale: 1.1 },
];

const BUSH_PLACEMENTS: Placement[] = [
  { position: [-16.5, 0, 6], rotY: 0.5, scale: 1.0 },
  { position: [16.5, 0, -9], rotY: 2.2, scale: 1.2 },
  { position: [6, 0, 16.5], rotY: 4.0, scale: 0.9 },
  { position: [-8, 0, -16.5], rotY: 1.5, scale: 1.1 },
  { position: [15.5, 0, 15.5], rotY: 3.1, scale: 1.0 },
  { position: [-15.5, 0, -15.5], rotY: 5.4, scale: 1.15 },
  { position: [0, 0, 17], rotY: 0.8, scale: 0.85 },
];

const ROCK_PLACEMENTS: Placement[] = [
  { position: [18, 0, 4], rotY: 0.3, scale: 1.0 },
  { position: [-17.5, 0, -3], rotY: 2.6, scale: 1.2 },
  { position: [4, 0, -17.5], rotY: 4.4, scale: 0.9 },
  { position: [-6, 0, 17.5], rotY: 1.1, scale: 1.1 },
  { position: [22, 0, -14], rotY: 3.7, scale: 1.3 },
  { position: [-21, 0, 17], rotY: 5.0, scale: 1.0 },
];

function ClonedField({ scene, placements }: { scene: import('three').Object3D; placements: Placement[] }) {
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

/** Static decorative scenery scattered outside the pasture (US-003). */
function Scenery() {
  const tree = useTreeModel();
  const bush = useBushModel();
  const rock = useRockModel();
  return (
    <group>
      <ClonedField scene={tree.scene} placements={TREE_PLACEMENTS} />
      <ClonedField scene={bush.scene} placements={BUSH_PLACEMENTS} />
      <ClonedField scene={rock.scene} placements={ROCK_PLACEMENTS} />
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
  return (
    <Canvas shadows={false} camera={{ position: [0, 8, 14], fov: 50 }}>
      <fog attach="fog" args={[SKY_COLOR, 32, 90]} />
      <Sky sunPosition={[100, 20, 100]} />
      <Environment preset="park" />
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} color="#fff8e7" />

      <Ground />

      <Fences />
      <Scenery />
      <Mascot onClick={onMascotClick} />
      <Barn onClick={onBarnClick} />
      <Signpost onClick={onSignpostClick} />
      <BullHerd />

      <OrbitControls
        enablePan
        enableZoom
        maxPolarAngle={Math.PI / 2.2}
        minDistance={6}
        maxDistance={30}
      />
    </Canvas>
  );
}
