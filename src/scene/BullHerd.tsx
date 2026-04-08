import { useFarmStore } from '../stores/useFarmStore';
import { useBullColor } from '../hooks/useBullColor';
import type { Tobu } from '../types';

// Placeholder bull renderer. To be replaced with InstancedMesh + bull.glb.
function Bull({ tobu }: { tobu: Tobu }) {
  const color = useBullColor(tobu.winner_name);
  const selectTobu = useFarmStore((s) => s.selectTobu);
  return (
    <mesh
      position={[tobu.bull_position.x, 0.5, tobu.bull_position.z]}
      onClick={(e) => {
        e.stopPropagation();
        selectTobu(tobu.id);
      }}
    >
      <boxGeometry args={[1, 1, 1.5]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

export function BullHerd() {
  const tobus = useFarmStore((s) => s.tobus);
  return (
    <group>
      {tobus.map((t) => (
        <Bull key={t.id} tobu={t} />
      ))}
    </group>
  );
}
