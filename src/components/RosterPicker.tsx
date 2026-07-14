import { useEffect, useMemo, useRef, useState } from 'react';
import { ROSTER } from '../data/roster';
import { useFarmStore } from '../stores/useFarmStore';
import { unlockAudio } from '../audio/useFarmAudio';

/**
 * Searchable dropdown (combobox) over the ~70-name section roster
 * (prd-farm-polish-v2 P0-4). Closed by default; opens on focus/tap,
 * type-to-filter, arrow keys + Enter, Escape or outside tap to close.
 */
export function RosterPicker() {
  const setUserName = useFarmStore((s) => s.setUserName);
  const setGuest = useFarmStore((s) => s.setGuest);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROSTER;
    return ROSTER.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  // Close when tapping outside the combobox (mobile-first: pointerdown, not click).
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Keep the highlighted option scrolled into view during keyboard nav.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, isOpen]);

  const choose = (name: string) => {
    setSelected(name);
    setQuery(name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && isOpen && filtered[highlighted]) {
      e.preventDefault();
      choose(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleConfirm = () => {
    if (selected) {
      unlockAudio();
      setUserName(selected);
    }
  };

  const handleSkip = () => {
    unlockAudio();
    setGuest();
  };

  return (
    <div className="roster-picker">
      <div className="roster-card">
        <h2>Welcome to the farm 🐂</h2>
        <p>Pick your name from the section roster to start reacting and submitting Tobus.</p>

        <div className="roster-combobox" ref={containerRef}>
          <input
            type="text"
            className="roster-search"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="roster-dropdown"
            placeholder="Search your name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setHighlighted(0);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {isOpen && (
            <ul className="roster-dropdown" id="roster-dropdown" role="listbox" ref={listRef}>
              {filtered.length === 0 && <li className="roster-empty">No matches.</li>}
              {filtered.map((name, i) => (
                <li key={name} role="option" aria-selected={selected === name}>
                  <button
                    type="button"
                    className={`roster-item${selected === name ? ' is-selected' : ''}${i === highlighted ? ' is-highlighted' : ''}`}
                    data-highlighted={i === highlighted}
                    onPointerEnter={() => setHighlighted(i)}
                    onClick={() => choose(name)}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          className="roster-confirm"
          disabled={!selected}
          onClick={handleConfirm}
        >
          {selected ? `Continue as ${selected}` : 'Select a name'}
        </button>
        <button type="button" className="roster-skip" onClick={handleSkip}>
          Skip for now (Guest mode)
        </button>
      </div>
    </div>
  );
}
