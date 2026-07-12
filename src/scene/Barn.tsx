import { useBarnModel } from './models';
import { LandmarkModel } from './LandmarkModel';

interface BarnProps {
  onClick?: () => void;
}

export function Barn({ onClick }: BarnProps) {
  const { scene } = useBarnModel();
  return (
    <LandmarkModel
      scene={scene}
      position={[-8, 0, -6]}
      hitboxSize={[5.2, 3.8, 5.2]}
      onClick={onClick}
    />
  );
}
