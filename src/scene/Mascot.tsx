import { useMascotModel } from './models';
import { LandmarkModel } from './LandmarkModel';

interface MascotProps {
  onClick?: () => void;
}

export function Mascot({ onClick }: MascotProps) {
  const { scene } = useMascotModel();
  return (
    <LandmarkModel
      scene={scene}
      position={[0, 0, 0]}
      scale={1.1}
      hitboxSize={[2.3, 2.3, 3.1]}
      onClick={onClick}
    />
  );
}
