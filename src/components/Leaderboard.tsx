import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useFarmStore } from '../stores/useFarmStore';
import { bullColorFromSeed } from '../hooks/useBullColor';

interface LeaderboardProps {
  onClose: () => void;
}

interface Row {
  name: string;
  wins: number;
}

export function Leaderboard({ onClose }: LeaderboardProps) {
  const tobus = useFarmStore((s) => s.tobus);

  const rows = useMemo<Row[]>(() => {
    const counts = new Map<string, number>();
    for (const tobu of tobus) {
      if (tobu.status !== 'approved') continue;
      counts.set(tobu.winner_name, (counts.get(tobu.winner_name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, wins]) => ({ name, wins }))
      .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
  }, [tobus]);

  const totalAwards = rows.reduce((sum, r) => sum + r.wins, 0);
  const winners = rows.length;

  return (
    <div className="speech-bubble" onClick={onClose}>
      <div className="speech-content leaderboard" onClick={(e) => e.stopPropagation()}>
        <h2><Trophy size={20} aria-hidden /> Wall of Fame</h2>
        <small>
          {totalAwards} Tobu{totalAwards === 1 ? '' : 's'} awarded · {winners} winner
          {winners === 1 ? '' : 's'}
        </small>

        <ol className="leaderboard-list">
          {rows.map((row, i) => (
            <li key={row.name} className="leaderboard-row">
              <span className="leaderboard-rank">#{i + 1}</span>
              <span
                className="leaderboard-swatch"
                style={{ background: bullColorFromSeed(row.name) }}
                aria-hidden
              />
              <span className="leaderboard-name" title={row.name}>{row.name}</span>
              <span className="leaderboard-wins">
                {row.wins}
                <span className="visually-hidden"> {row.wins === 1 ? 'win' : 'wins'}</span>
              </span>
            </li>
          ))}
        </ol>

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
