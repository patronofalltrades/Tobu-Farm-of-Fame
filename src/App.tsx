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

const BASE_MOCK_TOBUS: Tobu[] = [
  mockTobu('1', 'Steph Charouk', 'Asked the prof if EBITDA stood for "Earnings Before I Tricked Dumb Analysts."', '2025-10-12'),
  mockTobu('2', 'Hanif Ramadhan', 'Built a Tobu prototype before class and casually demoed it in the hallway.', '2025-10-19'),
  mockTobu('3', 'Agnes Chen', 'Summarized a 40-minute debate in one sentence and everyone nodded in silence.', '2025-11-02'),
];

/** `?bulls=N` inflates demo data for perf testing (US-005: 13 and 40 bulls). */
function buildMockTobus(): Tobu[] {
  const n = Number(new URLSearchParams(window.location.search).get('bulls'));
  if (!Number.isFinite(n) || n <= BASE_MOCK_TOBUS.length) return BASE_MOCK_TOBUS;
  const extra: Tobu[] = [];
  for (let i = BASE_MOCK_TOBUS.length; i < n; i++) {
    extra.push(
      mockTobu(`mock-${i}`, `Demo Winner ${i}`, `Synthetic Tobu #${i} for performance testing.`, '2025-11-09'),
    );
  }
  return [...BASE_MOCK_TOBUS, ...extra];
}

const MOCK_TOBUS: Tobu[] = buildMockTobus();

const REACTION_EMOJIS: ReactionEmoji[] = ['😂', '❤️', '🔥', '👏', '🐂'];

/** First-visit instructional toast — auto-dismisses after 7s or on tap (US-005). */
function IntroToast() {
  const hasSeenIntro = useFarmStore((s) => s.hasSeenIntro);
  const markIntroSeen = useFarmStore((s) => s.markIntroSeen);

  useEffect(() => {
    if (hasSeenIntro) return;
    const timer = window.setTimeout(() => markIntroSeen(), 7000);
    return () => window.clearTimeout(timer);
  }, [hasSeenIntro, markIntroSeen]);

  if (hasSeenIntro) return null;

  return (
    <button type="button" className="intro-toast" onClick={() => markIntroSeen()}>
      Tap a bull to hear their story · Tap the barn to submit · Check the signpost for rankings
    </button>
  );
}

function App() {
  const setTobus = useFarmStore((s) => s.setTobus);
  const selectedTobuId = useFarmStore((s) => s.selectedTobuId);
  const tobus = useFarmStore((s) => s.tobus);
  const selectTobu = useFarmStore((s) => s.selectTobu);
  const userName = useFarmStore((s) => s.userName);
  const isGuest = useFarmStore((s) => s.isGuest);
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
      <div className="topbar">
        <span className="topbar-title">🐂 Tobu Farm</span>
        <div className="topbar-actions">
          {dataSourceMessage && (
            <span className="topbar-status" title={dataSourceMessage} aria-label={dataSourceMessage}>
              ⚠️
            </span>
          )}
          <MuteButton />
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
        </div>
      </div>

      <div className="canvas-wrap">
        <Farm
          onBarnClick={() => setIsBarnOpen(true)}
          onMascotClick={() => setIsMascotOpen(true)}
          onSignpostClick={() => setIsLeaderboardOpen(true)}
        />
      </div>

      {!userName && !isGuest && <RosterPicker />}

      {isLeaderboardOpen && <Leaderboard onClose={() => setIsLeaderboardOpen(false)} />}

      {selected && (
        <div className="speech-bubble" onClick={() => selectTobu(null)}>
          <div className="speech-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.winner_name}</h2>
            {/* Stories carry their own quote marks where the moment is a quote. */}
            <p>{selected.story}</p>
            {selected.commentary && (
              <h4 className="tobu-commentary">{selected.commentary}</h4>
            )}
            {!userName && (
              <small className="reaction-hint">Pick your name from the roster to react.</small>
            )}
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
                    disabled={isUpdatingReaction || !userName}
                    title={!userName ? 'Pick your name first to react' : undefined}
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

      <IntroToast />

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
