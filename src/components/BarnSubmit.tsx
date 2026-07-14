import { useEffect, useMemo, useState } from 'react';
import { PartyPopper, Warehouse } from 'lucide-react';
import { ROSTER } from '../data/roster';
import { useFarmStore } from '../stores/useFarmStore';
import { addTobu } from '../firebase/tobus';
import { isFirebaseConfigured } from '../firebase/config';
import type { Tobu } from '../types';

interface BarnSubmitProps {
  onClose: () => void;
  isFirebaseLive: boolean;
}

const STORY_MAX = 280;
const TERMS: Array<1 | 2 | 3> = [1, 2, 3];
const PROGRAM_START_DATE = '2025-01-11'; // IESE MBA 2027 Barcelona section start

export function BarnSubmit({ onClose, isFirebaseLive }: BarnSubmitProps) {
  const userName = useFarmStore((s) => s.userName);
  const tobus = useFarmStore((s) => s.tobus);
  const setTobus = useFarmStore((s) => s.setTobus);

  const [winner, setWinner] = useState('');
  const [winnerQuery, setWinnerQuery] = useState('');
  const [story, setStory] = useState('');
  const [term, setTerm] = useState<1 | 2 | 3>(3);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const matches = useMemo(() => {
    const q = winnerQuery.trim().toLowerCase();
    if (!q) return ROSTER.slice(0, 8);
    return ROSTER.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [winnerQuery]);

  const remaining = STORY_MAX - story.length;
  const canSubmit = Boolean(winner && story.trim() && !submitting);

  // Unsaved-draft guard (prd-ui-ux-uplift US-006): backdrop tap, Cancel, and
  // Escape all funnel through here so a half-written Tobu is never silently
  // discarded.
  const isDirty = Boolean(winner || winnerQuery.trim() || story.trim());
  const requestClose = () => {
    if (submitted || !isDirty || window.confirm('Discard this Tobu draft?')) onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const dirty = Boolean(winner || winnerQuery.trim() || story.trim());
      if (submitted || !dirty || window.confirm('Discard this Tobu draft?')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitted, winner, winnerQuery, story, onClose]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Omit<Tobu, 'id' | 'created_at'> = {
        winner_name: winner,
        story: story.trim(),
        date,
        term,
        bull_pattern_seed: winner,
        reactions: {},
        status: 'pending',
        submitted_by: userName ?? 'Guest',
      };

      if (isFirebaseLive) {
        await addTobu(payload);
      } else {
        // Local fallback: stash a pending entry in the store so the admin
        // queue can demo the flow without Firebase.
        const localId = `local-${Date.now()}`;
        setTobus([...tobus, { ...payload, id: localId, created_at: Date.now() }]);
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="speech-bubble" onClick={onClose}>
        <div className="speech-content" onClick={(e) => e.stopPropagation()}>
          <h2><PartyPopper size={20} aria-hidden /> Tobu submitted!</h2>
          <p>
            Sent to the pending queue for admin approval. Once approved, a new bull is born onto the farm.
          </p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="speech-bubble" onClick={requestClose}>
      <div className="speech-content barn-form" onClick={(e) => e.stopPropagation()}>
        <h2><Warehouse size={20} aria-hidden /> Submit a Tobu</h2>
        {!isFirebaseConfigured && (
          <small>Demo mode — submission stays local until Firebase is configured.</small>
        )}

        <label className="barn-label" htmlFor="barn-winner">
          Winner <span className="req" aria-hidden="true">*</span>
        </label>
        <input
          id="barn-winner"
          type="text"
          placeholder="Search the roster…"
          value={winner || winnerQuery}
          aria-required="true"
          onChange={(e) => {
            setWinner('');
            setWinnerQuery(e.target.value);
          }}
        />
        {!winner && (
          <ul className="barn-roster">
            {matches.map((name) => (
              <li key={name}>
                <button type="button" onClick={() => { setWinner(name); setWinnerQuery(''); }}>
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="barn-label" htmlFor="barn-story">
          The moment <span className="req" aria-hidden="true">*</span>
        </label>
        <textarea
          id="barn-story"
          placeholder="One-liner: what they said, did, or pulled off."
          value={story}
          maxLength={STORY_MAX}
          aria-required="true"
          onChange={(e) => setStory(e.target.value)}
          rows={3}
        />
        <small>{remaining} characters left</small>

        <div className="barn-row">
          <div>
            <label className="barn-label" htmlFor="barn-term">Term</label>
            <select id="barn-term" value={term} onChange={(e) => setTerm(Number(e.target.value) as 1 | 2 | 3)}>
              {TERMS.map((t) => <option key={t} value={t}>Term {t}</option>)}
            </select>
          </div>
          <div>
            <label className="barn-label" htmlFor="barn-date">Date</label>
            <input
              id="barn-date"
              type="date"
              value={date}
              min={PROGRAM_START_DATE}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="barn-error" role="alert">{error}</p>}

        <div className="barn-row">
          <button type="button" onClick={requestClose} disabled={submitting}>Cancel</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {submitting ? 'Submitting…' : 'Submit for approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
