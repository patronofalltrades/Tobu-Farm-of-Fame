import { useSignpostModel } from './models';
import { LandmarkModel } from './LandmarkModel';

interface SignpostProps {
  onClick?: () => void;
}

export function Signpost({ onClick }: SignpostProps) {
  const { scene } = useSignpostModel();
  return (
    <LandmarkModel
      scene={scene}
      position={[8, 0, -4]}
      hitboxSize={[2.2, 2.6, 0.8]}
      onClick={onClick}
    />
  );
}
