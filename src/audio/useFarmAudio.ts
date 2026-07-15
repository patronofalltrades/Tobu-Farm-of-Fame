import { Howl } from 'howler';
import { useFarmStore } from '../stores/useFarmStore';

// Real audio assets (prd-random-moo-sounds + prd-tobu-load-screen US-004).
// Per-clip gain balances perceived loudness: moo-3 (distant/quiet) boosted,
// moo-1/2 (close-up) eased. Values tuned by ear during browser verification.
const MOO_SOURCES: Array<{ src: string; volume: number }> = [
  { src: '/audio/moo-1.mp3', volume: 0.45 }, // Universfield, close-up
  { src: '/audio/moo-2.mp3', volume: 0.4 },  // KoiRoylers, close-up (loudest → most cut)
  { src: '/audio/moo-3.mp3', volume: 0.75 }, // ElevenLabs distant (quietest → boosted)
];

const AMBIENT_SRC = '/audio/ambient-farm.mp3';

let ambient: Howl | null = null;
let moos: Howl[] | null = null;
let lastMooIndex = -1;
let unlocked = false;

function ensureSounds() {
  if (!ambient) {
    ambient = new Howl({
      src: [AMBIENT_SRC],
      loop: true,
      volume: 0.3,
    });
  }
  if (!moos) {
    moos = MOO_SOURCES.map((s) => new Howl({ src: [s.src], volume: s.volume }));
  }
}

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  ensureSounds();
  const muted = useFarmStore.getState().isMuted;
  if (!muted) {
    ambient?.play();
  }
}

export function syncAmbientPlayback() {
  ensureSounds();
  if (!unlocked) return;
  const muted = useFarmStore.getState().isMuted;
  if (muted) {
    ambient?.pause();
  } else if (!ambient?.playing()) {
    ambient?.play();
  }
}

/**
 * Random real moo on bull tap (prd-random-moo-sounds):
 * - no-immediate-repeat pick across the three clips (US-002)
 * - any moo still playing is cut off first — single voice (US-003)
 * Mute + iOS first-gesture unlock gate playback exactly as before.
 */
export function playMoo() {
  unlockAudio();
  if (useFarmStore.getState().isMuted) return;
  ensureSounds();
  if (!moos || moos.length === 0) return;

  for (const m of moos) m.stop();

  let index = Math.floor(Math.random() * moos.length);
  if (moos.length > 1 && index === lastMooIndex) {
    index = (index + 1) % moos.length;
  }
  lastMooIndex = index;

  moos[index].play();
}

export function setAmbientMuted(muted: boolean) {
  ensureSounds();
  if (!unlocked) return;
  if (muted) ambient?.pause();
  else ambient?.play();
}

/** Runtime introspection for E2E tests — not used by app code. */
export function getAudioDebug(): {
  unlocked: boolean;
  ambientPlaying: boolean;
  lastMooIndex: number;
  moosPlaying: number;
  mooVolumes: number[];
} {
  return {
    unlocked,
    ambientPlaying: ambient?.playing() ?? false,
    lastMooIndex,
    moosPlaying: moos ? moos.filter((m) => m.playing()).length : 0,
    mooVolumes: moos ? moos.map((m) => m.volume()) : [],
  };
}
