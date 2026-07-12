import { useMemo, useState } from 'react';
import { ROSTER } from '../data/roster';
import { useFarmStore } from '../stores/useFarmStore';
import { unlockAudio } from '../audio/useFarmAudio';

export function RosterPicker() {
  const setUserName = useFarmStore((s) => s.setUserName);
  const setGuest = useFarmStore((s) => s.setGuest);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROSTER;
    return ROSTER.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

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

        <input
          type="text"
          className="roster-search"
          placeholder="Search your name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <ul className="roster-list">
          {filtered.length === 0 && <li className="roster-empty">No matches.</li>}
          {filtered.map((name) => (
            <li key={name}>
              <button
                type="button"
                className={`roster-item${selected === name ? ' is-selected' : ''}`}
                onClick={() => setSelected(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>

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
