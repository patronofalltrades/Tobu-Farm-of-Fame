import { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useFarmStore } from '../stores/useFarmStore';
import { setAmbientMuted, syncAmbientPlayback, unlockAudio } from '../audio/useFarmAudio';

export function MuteButton() {
  const isMuted = useFarmStore((s) => s.isMuted);
  const toggleMute = useFarmStore((s) => s.toggleMute);

  useEffect(() => {
    setAmbientMuted(isMuted);
  }, [isMuted]);

  return (
    <button
      type="button"
      className="mute-button"
      title={isMuted ? 'Unmute farm sounds' : 'Mute farm sounds'}
      aria-label={isMuted ? 'Unmute' : 'Mute'}
      onClick={() => {
        unlockAudio();
        toggleMute();
        syncAmbientPlayback();
      }}
    >
      {isMuted ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}
    </button>
  );
}
