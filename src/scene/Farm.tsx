import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { BullHerd } from './BullHerd';
import { Barn } from './Barn';
import { Signpost } from './Signpost';
import { Mascot } from './Mascot';

export function Farm() {
  return (
    <Canvas shadows={false} camera={{ position: [0, 8, 14], fov: 50 }}>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 5]} intensity={1.1} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#7CB342" flatShading />
      </mesh>

      <Mascot />
      <Barn />
      <Signpost />
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
