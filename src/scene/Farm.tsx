import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { BullHerd } from './BullHerd';
import { Barn } from './Barn';
import { Signpost } from './Signpost';
import { Mascot } from './Mascot';
import './models';

interface FarmProps {
  onBarnClick?: () => void;
  onMascotClick?: () => void;
  onSignpostClick?: () => void;
}

function Fences() {
  const posts: Array<[number, number, number]> = [];
  for (let x = -14; x <= 14; x += 7) {
    posts.push([x, 0.4, -14], [x, 0.4, 14], [-14, 0.4, x], [14, 0.4, x]);
  }
  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.15, 0.8, 0.15]} />
          <meshStandardMaterial color="#8B4513" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.35, -14]} rotation={[0, 0, 0]}>
        <boxGeometry args={[28, 0.08, 0.08]} />
        <meshStandardMaterial color="#FFCD00" flatShading />
      </mesh>
      <mesh position={[0, 0.35, 14]}>
        <boxGeometry args={[28, 0.08, 0.08]} />
        <meshStandardMaterial color="#FFCD00" flatShading />
      </mesh>
      <mesh position={[-14, 0.35, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[28, 0.08, 0.08]} />
        <meshStandardMaterial color="#FFCD00" flatShading />
      </mesh>
      <mesh position={[14, 0.35, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[28, 0.08, 0.08]} />
        <meshStandardMaterial color="#FFCD00" flatShading />
      </mesh>
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
