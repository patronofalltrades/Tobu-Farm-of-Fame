import { CirclePlus, Info, Trophy } from 'lucide-react';

interface BottomBarProps {
  onSubmit: () => void;
  onLeaderboard: () => void;
  onInfo: () => void;
}

/**
 * Fixed bottom action bar (prd-reactions-colors-chrome-audio US-004).
 * A discoverability aid, not a nav replacement: each button calls the same
 * handler its 3D landmark (barn / signpost / mascot) already triggers.
 */
export function BottomBar({ onSubmit, onLeaderboard, onInfo }: BottomBarProps) {
  return (
    <nav className="bottombar" aria-label="Farm actions">
      <button type="button" className="bottombar-button" onClick={onSubmit}>
        <CirclePlus size={20} aria-hidden />
        <span>Submit a Tobu</span>
      </button>
      <button type="button" className="bottombar-button" onClick={onLeaderboard}>
        <Trophy size={20} aria-hidden />
        <span>Wall of Fame</span>
      </button>
      <button type="button" className="bottombar-button" onClick={onInfo}>
        <Info size={20} aria-hidden />
        <span>Tobu?</span>
      </button>
    </nav>
  );
}
