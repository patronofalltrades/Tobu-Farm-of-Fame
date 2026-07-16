import type { Object3D } from 'three';
import { Clone } from '@react-three/drei';

interface LandmarkModelProps {
  scene: Object3D;
  position: [number, number, number];
  scale?: number;
  onClick?: () => void;
  /** Invisible tap-fattening box (local units, scaled with the group).
   *  Pass `null` to rely on the model's real meshes only — an oversized box
   *  eclipses raycasts to objects behind the landmark (the "Tobus are not
   *  clickable" bug: Mama Tobu's box swallowed taps meant for bulls). */
  hitboxSize?: [number, number, number] | null;
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
      {hitboxSize && (
        <mesh position={[0, hitboxSize[1] / 2, 0]} onClick={handleClick} {...pointer}>
          <boxGeometry args={hitboxSize} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
