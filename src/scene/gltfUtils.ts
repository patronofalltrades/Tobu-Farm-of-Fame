import { BufferAttribute, BufferGeometry, Group, Mesh, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Merge all mesh geometries in a loaded GLTF scene into one buffer for InstancedMesh.
 * Also bakes a per-vertex `aLegWeight` attribute for the procedural walk shader
 * (tech-farm-visual-rehaul.md §3.2): COLOR_0.r when the model provides vertex
 * colors, otherwise a smoothstep height threshold over the merged bounding box.
 */
export function mergeGltfMeshes(root: Object3D): BufferGeometry {
  const parts: BufferGeometry[] = [];
  root.updateWorldMatrix(true, true);
  root.traverse((child) => {
    if (child instanceof Mesh && child.geometry) {
      const geom = (child.geometry as BufferGeometry).clone();
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

  const position = merged.getAttribute('position');
  const color = merged.getAttribute('color');
  const legWeight = new Float32Array(position.count);

  if (color) {
    for (let i = 0; i < position.count; i++) {
      legWeight[i] = color.getX(i);
    }
  } else if (merged.boundingBox) {
    // Fallback: vertices in the bottom band of the mesh count as legs.
    const minY = merged.boundingBox.min.y;
    const maxY = merged.boundingBox.max.y;
    const legTop = minY + (maxY - minY) * 0.35;
    const blend = (maxY - minY) * 0.1;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const t = Math.min(Math.max((legTop - y) / blend, 0), 1);
      legWeight[i] = t;
    }
  }
  merged.setAttribute('aLegWeight', new BufferAttribute(legWeight, 1));
  // COLOR_0 encodes shader data, not display color — drop it so materials
  // with vertexColors disabled (the default) are unaffected either way.
  merged.deleteAttribute('color');
  return merged;
}

export function getGltfScene(gltf: { scene: Group }): Group {
  return gltf.scene;
}
