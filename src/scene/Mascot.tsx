import { useMascotModel } from './models';
import { LandmarkModel } from './LandmarkModel';

interface MascotProps {
  onClick?: () => void;
}

export function Mascot({ onClick }: MascotProps) {
  const { scene } = useMascotModel();
  // ~40% bigger than a herd bull so Mama Tobu reads as the centerpiece;
  // hitbox scales with the model (prd-tractor-behavior-and-mascot-scale US-003).
  return (
    <LandmarkModel
      scene={scene}
      position={[0, 0, 0]}
      scale={1.5}
      hitboxSize={[3.1, 3.1, 4.2]}
      onClick={onClick}
    />
  );
}
