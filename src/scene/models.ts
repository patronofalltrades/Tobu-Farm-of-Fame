import { useGLTF } from '@react-three/drei';

const BULL_URL = '/models/bull.glb';
const BARN_URL = '/models/barn.glb';
const SIGNPOST_URL = '/models/signpost.glb';
const MASCOT_URL = '/models/mascot.glb';
const FENCE_URL = '/models/fence.glb';
const TREE_URL = '/models/tree.glb';
const BUSH_URL = '/models/bush.glb';
const ROCK_URL = '/models/rock.glb';
const TRACTOR_URL = '/models/tractor.glb';

useGLTF.preload(BULL_URL);
useGLTF.preload(BARN_URL);
useGLTF.preload(SIGNPOST_URL);
useGLTF.preload(MASCOT_URL);
useGLTF.preload(FENCE_URL);
useGLTF.preload(TREE_URL);
useGLTF.preload(BUSH_URL);
useGLTF.preload(ROCK_URL);
useGLTF.preload(TRACTOR_URL);

export const MODEL_URLS = {
  bull: BULL_URL,
  barn: BARN_URL,
  signpost: SIGNPOST_URL,
  mascot: MASCOT_URL,
  fence: FENCE_URL,
  tree: TREE_URL,
  bush: BUSH_URL,
  rock: ROCK_URL,
  tractor: TRACTOR_URL,
} as const;

export function useBullModel() {
  return useGLTF(BULL_URL);
}

export function useBarnModel() {
  return useGLTF(BARN_URL);
}

export function useSignpostModel() {
  return useGLTF(SIGNPOST_URL);
}

export function useMascotModel() {
  return useGLTF(MASCOT_URL);
}

export function useFenceModel() {
  return useGLTF(FENCE_URL);
}

export function useTreeModel() {
  return useGLTF(TREE_URL);
}

export function useBushModel() {
  return useGLTF(BUSH_URL);
}

export function useRockModel() {
  return useGLTF(ROCK_URL);
}

export function useTractorModel() {
  return useGLTF(TRACTOR_URL);
}
