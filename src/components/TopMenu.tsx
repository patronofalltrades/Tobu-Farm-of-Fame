import { useEffect, useRef } from 'react';
import { CirclePlus, Info, LogOut, MoreVertical, Trophy, Wrench } from 'lucide-react';

interface TopMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSubmit: () => void;
  onLeaderboard: () => void;
  onInfo: () => void;
  onAdmin: () => void;
  isAdmin: boolean;
  onAdminLogout: () => void;
}

/**
 * Single top-right dropdown that consolidates every non-mute control
 * (prd-topbar-menu-consolidation). Reuses the anchor + outside-pointerdown +
 * reduced-motion pattern established by the reaction picker; Escape is handled
 * by App's global overlay chain. Each item calls the same handler its 3D
 * landmark already triggers — the menu is a second path, not a duplicate.
 */
export function TopMenu({
  isOpen,
  onToggle,
  onClose,
  onSubmit,
  onLeaderboard,
  onInfo,
  onAdmin,
  isAdmin,
  onAdminLogout,
}: TopMenuProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, onClose]);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="top-menu-anchor" ref={anchorRef}>
      <button
        type="button"
        className="top-menu-trigger"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <MoreVertical size={20} aria-hidden />
      </button>
      {isOpen && (
        <div className="top-menu" role="menu" aria-label="Farm actions">
          <button type="button" role="menuitem" className="top-menu-item" onClick={() => run(onSubmit)}>
            <CirclePlus size={18} aria-hidden />
            <span>Submit a Tobu</span>
          </button>
          <button type="button" role="menuitem" className="top-menu-item" onClick={() => run(onLeaderboard)}>
            <Trophy size={18} aria-hidden />
            <span>Wall of Fame</span>
          </button>
          <button type="button" role="menuitem" className="top-menu-item" onClick={() => run(onInfo)}>
            <Info size={18} aria-hidden />
            <span>Tobu?</span>
          </button>
          <div className="top-menu-sep" role="separator" />
          <button type="button" role="menuitem" className="top-menu-item" onClick={() => run(onAdmin)}>
            <Wrench size={18} aria-hidden />
            <span>{isAdmin ? 'Pending queue' : 'Admin'}</span>
          </button>
          {isAdmin && (
            <button type="button" role="menuitem" className="top-menu-item" onClick={() => run(onAdminLogout)}>
              <LogOut size={18} aria-hidden />
              <span>Log out of admin</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
