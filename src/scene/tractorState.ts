// Live tractor pose shared between the Tractor component (writer, per-frame)
// and BullHerd's avoidance passes (reader, per-frame). A plain module-level
// mutable object on purpose: routing 60Hz position updates through Zustand
// would re-render the React tree every frame for state only useFrame loops
// care about. Same pattern as the audio singletons in useFarmAudio.ts.
export const tractorState = {
  x: 0,
  z: 0,
  heading: 0,
  /** False until the Tractor component's first frame writes a real pose. */
  active: false,
};

// Reverse channel (US-001): BullHerd writes the distance from the tractor to
// the nearest bull each frame; the Tractor reads it to decide whether to halt.
// One frame of staleness is inherent (Tractor's useFrame runs before
// BullHerd's, in mount order) and harmless at these speeds.
export const herdState = {
  minDistToTractor: Infinity,
};
