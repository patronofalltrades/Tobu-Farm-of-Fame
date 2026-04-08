// Placeholder signpost — replace with signpost.glb.
export function Signpost() {
  return (
    <group position={[8, 0, -4]}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 2]} />
        <meshStandardMaterial color="#8B4513" flatShading />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[1.6, 0.8, 0.1]} />
        <meshStandardMaterial color="#FFCD00" flatShading />
      </mesh>
    </group>
  );
}
