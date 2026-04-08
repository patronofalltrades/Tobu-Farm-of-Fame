import { useEffect } from 'react';
import { Farm } from './scene/Farm';
import { useFarmStore } from './stores/useFarmStore';
import type { Tobu } from './types';
import './App.css';

// Mock data until Firebase is wired up.
const MOCK_TOBUS: Tobu[] = [
  {
    id: '1',
    winner_name: 'Steph Charouk',
    story: 'Asked the prof if EBITDA stood for "Earnings Before I Tricked Dumb Analysts."',
    date: '2025-10-12',
    term: 1,
    bull_color_seed: 0,
    bull_position: { x: -3, z: 2 },
    reactions: {},
    created_at: Date.now(),
  },
  {
    id: '2',
    winner_name: 'Marc Puig',
    story: 'Brought a guitar to ethics class. Played a riff. Said nothing. Sat down.',
    date: '2025-10-19',
    term: 1,
    bull_color_seed: 0,
    bull_position: { x: 3, z: 3 },
    reactions: {},
    created_at: Date.now(),
  },
  {
    id: '3',
    winner_name: 'Alessia Romano',
    story: 'Solved the LBO case in 4 minutes flat and went back to sketching.',
    date: '2025-11-02',
    term: 1,
    bull_color_seed: 0,
    bull_position: { x: -2, z: -3 },
    reactions: {},
    created_at: Date.now(),
  },
];

function App() {
  const setTobus = useFarmStore((s) => s.setTobus);
  const selectedTobuId = useFarmStore((s) => s.selectedTobuId);
  const tobus = useFarmStore((s) => s.tobus);
  const selectTobu = useFarmStore((s) => s.selectTobu);

  useEffect(() => {
    setTobus(MOCK_TOBUS);
  }, [setTobus]);

  const selected = tobus.find((t) => t.id === selectedTobuId);

  return (
    <div className="app">
      <header className="header">
        <h1>🐂 Tobu Farm of Fame</h1>
      </header>

      <div className="canvas-wrap">
        <Farm />
      </div>

      {selected && (
        <div className="speech-bubble" onClick={() => selectTobu(null)}>
          <div className="speech-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.winner_name}</h2>
            <p>"{selected.story}"</p>
            <small>{selected.date}</small>
            <button onClick={() => selectTobu(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
