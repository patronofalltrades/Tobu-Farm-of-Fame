// Placeholder mascot Tobu — bigger than herd bulls, Barcelona red.
export function Mascot() {
  return (
    <mesh position={[0, 0.9, 0]}>
      <boxGeometry args={[1.6, 1.6, 2.4]} />
      <meshStandardMaterial color="#D50032" flatShading />
    </mesh>
  );
}
