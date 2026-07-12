import { useEffect, useMemo, useState } from 'react';
import { Farm } from './scene/Farm';
import { RosterPicker } from './components/RosterPicker';
import { Leaderboard } from './components/Leaderboard';
import { BarnSubmit } from './components/BarnSubmit';
import { AdminPinGate } from './components/AdminPinGate';
import { AdminPanel } from './components/AdminPanel';
import { MuteButton } from './components/MuteButton';
import { useFarmStore } from './stores/useFarmStore';
import type { ReactionEmoji, Tobu } from './types';
import { subscribeToTobus, updateTobu } from './firebase/tobus';
import { isFirebaseConfigured } from './firebase/config';
import './App.css';

// Mock data until Firebase is wired up.
const mockTobu = (
  id: string,
  winner_name: string,
  story: string,
  date: string,
): Tobu => ({
  id,
  winner_name,
  story,
  date,
  term: 1,
  bull_pattern_seed: winner_name,
  reactions: {},
  status: 'approved',
  submitted_by: 'Seed',
  created_at: Date.now(),
});

const MOCK_TOBUS: Tobu[] = [
  mockTobu('1', 'Steph Charouk', 'Asked the prof if EBITDA stood for "Earnings Before I Tricked Dumb Analysts."', '2025-10-12'),
  mockTobu('2', 'Hanif Ramadhan', 'Built a Tobu prototype before class and casually demoed it in the hallway.', '2025-10-19'),
  mockTobu('3', 'Agnes Chen', 'Summarized a 40-minute debate in one sentence and everyone nodded in silence.', '2025-11-02'),
];

const REACTION_EMOJIS: ReactionEmoji[] = ['😂', '❤️', '🔥', '👏', '🐂'];

function App() {
  const setTobus = useFarmStore((s) => s.setTobus);
  const selectedTobuId = useFarmStore((s) => s.selectedTobuId);
  const tobus = useFarmStore((s) => s.tobus);
  const selectTobu = useFarmStore((s) => s.selectTobu);
  const userName = useFarmStore((s) => s.userName);
  const [hasFirebaseError, setHasFirebaseError] = useState(false);
  const [isUpdatingReaction, setIsUpdatingReaction] = useState(false);
  const [isBarnOpen, setIsBarnOpen] = useState(false);
  const [isMascotOpen, setIsMascotOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const isAdmin = useFarmStore((s) => s.isAdmin);
  const setAdmin = useFarmStore((s) => s.setAdmin);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setTobus(MOCK_TOBUS);
      return;
    }

    const unsubscribe = subscribeToTobus(
      (liveTobus) => {
        setTobus(liveTobus);
        setHasFirebaseError(false);
      },
      () => {
        setTobus(MOCK_TOBUS);
        setHasFirebaseError(true);
      },
    );

    return () => unsubscribe();
  }, [setTobus]);

  const dataSourceMessage = useMemo(() => {
    if (!isFirebaseConfigured) {
      return 'Using demo data. Add Firebase env vars in `.env` to load live Tobu entries.';
    }
    if (hasFirebaseError) {
      return 'Could not load Firebase data. Showing demo entries instead.';
    }
    return null;
  }, [hasFirebaseError]);

  const selected = tobus.find((t) => t.id === selectedTobuId);
  const selectedReaction = useMemo(() => {
    if (!selected || !userName) return null;
    return REACTION_EMOJIS.find((emoji) => selected.reactions[emoji]?.includes(userName)) ?? null;
  }, [selected, userName]);

  const applyLocalReaction = (emoji: ReactionEmoji) => {
    if (!selected || !userName) return;

    const current = selected.reactions;
    const next: Tobu['reactions'] = {};
    const currentlySelected = REACTION_EMOJIS.find((item) => current[item]?.includes(userName)) ?? null;

    for (const item of REACTION_EMOJIS) {
      const withoutUser = (current[item] ?? []).filter((name) => name !== userName);
      if (withoutUser.length > 0) next[item] = withoutUser;
    }

    if (currentlySelected !== emoji) {
      next[emoji] = [...(next[emoji] ?? []), userName];
    }

    setTobus(tobus.map((entry) => (entry.id === selected.id ? { ...entry, reactions: next } : entry)));
  };

  const handleReaction = async (emoji: ReactionEmoji) => {
    if (!selected || !userName) return;

    if (!isFirebaseConfigured || hasFirebaseError) {
      applyLocalReaction(emoji);
      return;
    }

    setIsUpdatingReaction(true);
    try {
      const current = selected.reactions;
      const next: Tobu['reactions'] = {};
      const currentlySelected = REACTION_EMOJIS.find((item) => current[item]?.includes(userName)) ?? null;

      for (const item of REACTION_EMOJIS) {
        const withoutUser = (current[item] ?? []).filter((name) => name !== userName);
        if (withoutUser.length > 0) next[item] = withoutUser;
      }

      if (currentlySelected !== emoji) {
        next[emoji] = [...(next[emoji] ?? []), userName];
      }

      await updateTobu(selected.id, { reactions: next });
    } finally {
      setIsUpdatingReaction(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <MuteButton />
        <h1>🐂 Tobu Farm of Fame</h1>
        <p>Data source: {isFirebaseConfigured && !hasFirebaseError ? 'Live Firebase' : 'Demo fallback'}</p>
        {dataSourceMessage && <p>{dataSourceMessage}</p>}
        <p>Tap the barn to submit · signpost for leaderboard · bulls for stories.</p>
      </header>

      <div className="canvas-wrap">
        <Farm
          onBarnClick={() => setIsBarnOpen(true)}
          onMascotClick={() => setIsMascotOpen(true)}
          onSignpostClick={() => setIsLeaderboardOpen(true)}
        />
      </div>

      {!userName && <RosterPicker />}

      {isLeaderboardOpen && <Leaderboard onClose={() => setIsLeaderboardOpen(false)} />}

      {selected && (
        <div className="speech-bubble" onClick={() => selectTobu(null)}>
          <div className="speech-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.winner_name}</h2>
            {selected.photo_url && (
              <img className="speech-photo" src={selected.photo_url} alt="" />
            )}
            <p>"{selected.story}"</p>
            <small>{selected.date} · Term {selected.term}</small>
            <div className="reaction-row">
              {REACTION_EMOJIS.map((emoji) => {
                const count = selected.reactions[emoji]?.length ?? 0;
                const active = selectedReaction === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={`reaction-button${active ? ' is-active' : ''}`}
                    onClick={() => void handleReaction(emoji)}
                    disabled={isUpdatingReaction}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => selectTobu(null)}>Close</button>
          </div>
        </div>
      )}

      {isBarnOpen && (
        <BarnSubmit
          onClose={() => setIsBarnOpen(false)}
          isFirebaseLive={isFirebaseConfigured && !hasFirebaseError}
        />
      )}

      <button
        type="button"
        className={`admin-trigger${isAdmin ? ' is-admin' : ''}`}
        title={isAdmin ? 'Open pending Tobu queue' : 'Admin PIN'}
        onClick={() => {
          if (isAdmin) setIsAdminPanelOpen(true);
          else setIsAdminPinOpen(true);
        }}
        onContextMenu={(e) => { e.preventDefault(); if (isAdmin) setAdmin(false); }}
      >
        {isAdmin ? '🛠' : ''}
      </button>

      {isAdminPinOpen && (
        <AdminPinGate
          onClose={() => setIsAdminPinOpen(false)}
          onSuccess={() => { setIsAdminPinOpen(false); setIsAdminPanelOpen(true); }}
        />
      )}
      {isAdminPanelOpen && (
        <AdminPanel
          onClose={() => setIsAdminPanelOpen(false)}
          isFirebaseLive={isFirebaseConfigured && !hasFirebaseError}
        />
      )}

      {isMascotOpen && (
        <div className="speech-bubble" onClick={() => setIsMascotOpen(false)}>
          <div className="speech-content" onClick={(e) => e.stopPropagation()}>
            <h2>🐂 Tobu Mascot</h2>
            <p>
              Tobu is the IESE MBA 2027 Barcelona section mascot — a plushie bull awarded weekly for the funniest comment,
              wildest gesture, or biggest contribution to class.
            </p>
            <p>Every Tobu winner births a new bull on this farm. Tap any bull to read their moment.</p>
            <button onClick={() => setIsMascotOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
