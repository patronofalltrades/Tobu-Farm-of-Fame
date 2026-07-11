import { BufferGeometry, Group, Mesh, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Merge all mesh geometries in a loaded GLTF scene into one buffer for InstancedMesh. */
export function mergeGltfMeshes(root: Object3D): BufferGeometry {
  const parts: BufferGeometry[] = [];
  root.updateWorldMatrix(true, true);
  root.traverse((child) => {
    if (child instanceof Mesh && child.geometry) {
      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      parts.push(geom);
    }
  });
  const merged = mergeGeometries(parts);
  if (!merged) {
    return new BufferGeometry();
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function getGltfScene(gltf: { scene: Group }): Group {
  return gltf.scene;
}
