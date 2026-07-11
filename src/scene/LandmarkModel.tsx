import type { Object3D } from 'three';
import { Clone } from '@react-three/drei';

interface LandmarkModelProps {
  scene: Object3D;
  position: [number, number, number];
  scale?: number;
  onClick?: () => void;
  hitboxSize?: [number, number, number];
}

export function LandmarkModel({
  scene,
  position,
  scale = 1,
  onClick,
  hitboxSize = [2, 2, 2],
}: LandmarkModelProps) {
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick?.();
  };
  const pointer = {
    onPointerOver: () => { document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = 'default'; },
  };

  return (
    <group position={position} scale={scale}>
      <Clone object={scene} onClick={handleClick} {...pointer} />
      <mesh position={[0, hitboxSize[1] / 2, 0]} onClick={handleClick} {...pointer}>
        <boxGeometry args={hitboxSize} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
