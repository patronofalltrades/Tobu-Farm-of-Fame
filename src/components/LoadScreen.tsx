import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

const MIN_DISPLAY_MS = 1000; // logo always registers, even on cached loads
const MAX_WAIT_MS = 10000;   // never hang forever on a stalled asset
const LEAVE_MS = 400;        // matches the CSS fade duration

interface LoadScreenProps {
  /** App-level readiness: Tobu data arrived + first frame rendered. */
  ready: boolean;
  /** Called synchronously inside the CTA's trusted click/keyboard gesture —
   *  the audio-unlock moment (prd-tobu-load-screen US-003). */
  onEnter: () => void;
  /** Called after the fade-out completes; the parent unmounts the screen. */
  onDone: () => void;
}

/**
 * Branded full-screen loader (prd-tobu-load-screen US-001/US-002).
 * Shown from first mount until the farm underneath is fully ready, then the
 * passive progress bar becomes an "Enter the farm" CTA whose tap doubles as
 * the audio-unlock gesture. Sits above every other overlay (z 300) so a
 * first-visit roster picker appears only after entry.
 */
export function LoadScreen({ ready, onEnter, onDone }: LoadScreenProps) {
  // drei's loading manager state — tracks the GLB model loads.
  const { active, progress } = useProgress();
  const [minShown, setMinShown] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const minTimer = window.setTimeout(() => setMinShown(true), MIN_DISPLAY_MS);
    const maxTimer = window.setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, []);

  const assetsReady = !active && progress >= 100;
  const canEnter = minShown && (timedOut || (ready && assetsReady));

  // Passive bar: blend asset progress with a floor so it never looks stuck at 0.
  const shownProgress = Math.max(8, Math.min(100, Math.round(progress)));

  const handleEnter = () => {
    if (leaving) return;
    onEnter(); // synchronous — inside the trusted gesture, unlocks audio
    setLeaving(true);
    window.setTimeout(onDone, LEAVE_MS);
  };

  return (
    <div className={`load-screen${leaving ? ' is-leaving' : ''}`}>
      <img
        className="load-logo"
        src="/splash-logo.jpg"
        alt="Tobu's Farm of Fame"
        width={512}
        height={512}
        decoding="async"
      />
      {canEnter ? (
        <button type="button" className="load-enter" onClick={handleEnter}>
          Enter the farm
        </button>
      ) : (
        <div className="load-status" role="status" aria-live="polite">
          <div className="load-bar" aria-hidden>
            <div className="load-bar-fill" style={{ width: `${shownProgress}%` }} />
          </div>
          <span>Rounding up the herd…</span>
        </div>
      )}
    </div>
  );
}
