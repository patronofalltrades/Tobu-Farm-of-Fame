import { useMascotModel } from './models';
import { LandmarkModel } from './LandmarkModel';

interface MascotProps {
  onClick?: () => void;
}

export function Mascot({ onClick }: MascotProps) {
  const { scene } = useMascotModel();
  // ~40% bigger than a herd bull so Mama Tobu reads as the centerpiece.
  // No invisible hitbox: from the elevated camera ANY box tall enough to
  // cover her also shadows the pasture behind her, swallowing taps meant
  // for bulls there ("Tobus are not clickable", 2026-07-16 hotfix — the
  // scaled-up box had grown to 4.65×4.65×6.3 world units, eclipsing a
  // third of the screen on phones). Her real meshes are the tap target —
  // she's the largest object on screen, so she needs no fattening.
  return (
    <LandmarkModel
      scene={scene}
      position={[0, 0, 0]}
      scale={1.5}
      hitboxSize={null}
      onClick={onClick}
    />
  );
}
