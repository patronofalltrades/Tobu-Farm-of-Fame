import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, Clone } from '@react-three/drei';
import { BullHerd } from './BullHerd';
import { Barn } from './Barn';
import { Signpost } from './Signpost';
import { Mascot } from './Mascot';
import { useFenceModel } from './models';
import './models';

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

export function Farm({ onBarnClick, onMascotClick, onSignpostClick }: FarmProps) {
  return (
    <Canvas shadows={false} camera={{ position: [0, 8, 14], fov: 50 }}>
      <Sky sunPosition={[100, 20, 100]} />
      <Environment preset="park" />
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} color="#fff8e7" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#7CB342" flatShading />
      </mesh>

      <Fences />
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
