// Placeholder barn — replace with barn.glb.
export function Barn() {
  return (
    <mesh position={[-8, 1.5, -6]}>
      <boxGeometry args={[4, 3, 4]} />
      <meshStandardMaterial color="#D50032" flatShading />
    </mesh>
  );
}
