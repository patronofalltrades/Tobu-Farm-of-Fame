import { Howl } from 'howler';
import { useFarmStore } from '../stores/useFarmStore';

let ambient: Howl | null = null;
let moo: Howl | null = null;
let unlocked = false;

function ensureSounds() {
  if (!ambient) {
    ambient = new Howl({
      src: ['/audio/ambient.wav'],
      loop: true,
      volume: 0.25,
    });
  }
  if (!moo) {
    moo = new Howl({
      src: ['/audio/moo.wav'],
      volume: 0.5,
    });
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

export function playMoo() {
  unlockAudio();
  if (useFarmStore.getState().isMuted) return;
  ensureSounds();
  moo?.play();
}

export function setAmbientMuted(muted: boolean) {
  ensureSounds();
  if (!unlocked) return;
  if (muted) ambient?.pause();
  else ambient?.play();
}
