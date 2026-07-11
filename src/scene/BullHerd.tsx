import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Matrix4, MeshStandardMaterial } from 'three';
import { useFarmStore } from '../stores/useFarmStore';
import { bullColorFromSeed, bullPositionFromSeed } from '../hooks/useBullColor';
import { useBullModel } from './models';
import { mergeGltfMeshes } from './gltfUtils';
import type { Tobu } from '../types';
import { playMoo } from '../audio/useFarmAudio';

const _matrix = new Matrix4();
const _color = new Color();

interface IndexedTobu {
  tobu: Tobu;
  index: number;
}

export function BullHerd() {
  const tobus = useFarmStore((s) => s.tobus);
  const selectTobu = useFarmStore((s) => s.selectTobu);
  const gltf = useBullModel();
  const meshRef = useRef<InstancedMesh>(null);

  const geometry = useMemo(() => mergeGltfMeshes(gltf.scene), [gltf.scene]);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ffffff',
        flatShading: true,
      }),
    [],
  );

  const indexed = useMemo<IndexedTobu[]>(() => {
    const perWinner = new Map<string, number>();
    return tobus
      .filter((t) => t.status === 'approved')
      .map((t) => {
        const i = perWinner.get(t.winner_name) ?? 0;
        perWinner.set(t.winner_name, i + 1);
        return { tobu: t, index: i };
      });
  }, [tobus]);

  const count = indexed.length;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    indexed.forEach(({ tobu, index }, i) => {
      const pos = bullPositionFromSeed(tobu.bull_pattern_seed, index);
      _matrix.makeTranslation(pos.x, 0.5, pos.z);
      mesh.setMatrixAt(i, _matrix);
      _color.setStyle(bullColorFromSeed(tobu.bull_pattern_seed));
      mesh.setColorAt(i, _color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [indexed, count]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const t = state.clock.elapsedTime;
    indexed.forEach(({ tobu, index }, i) => {
      const pos = bullPositionFromSeed(tobu.bull_pattern_seed, index);
      const bob = Math.sin(t * 1.2 + i * 0.7) * 0.06;
      const sway = Math.sin(t * 0.4 + i) * 0.08;
      _matrix.makeRotationY(sway);
      _matrix.setPosition(pos.x, 0.5 + bob, pos.z);
      mesh.setMatrixAt(i, _matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      onClick={(e) => {
        e.stopPropagation();
        const i = e.instanceId;
        if (i === undefined || i < 0) return;
        playMoo();
        selectTobu(indexed[i].tobu.id);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    />
  );
}
