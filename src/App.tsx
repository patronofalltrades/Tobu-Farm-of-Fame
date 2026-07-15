import { useEffect, useMemo, useRef, useState } from 'react';
import { SmilePlus, TriangleAlert } from 'lucide-react';
import { Farm } from './scene/Farm';
import { bullCoatForWinner, useWinnerColors } from './hooks/useBullColor';
import type { WinnerHueMap } from './hooks/useBullColor';
import { RosterPicker } from './components/RosterPicker';
import { TopMenu } from './components/TopMenu';
import { LoadScreen } from './components/LoadScreen';
import { unlockAudio, syncAmbientPlayback } from './audio/useFarmAudio';
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

/** WhatsApp-group-style sender tint from the winner's coat color; light
 *  coats fall back to brand blue for contrast. Uses the same live unique
 *  assignment as the herd/leaderboard (US-002). */
function senderTint(name: string, colors: WinnerHueMap): string {
  const base = bullCoatForWinner(name, 0, colors).baseColor; // "hsl(h, s%, l%)"
  const lightness = Number(/(\d+)%\)$/.exec(base)?.[1] ?? 50);
  return lightness > 55 ? 'var(--color-brand-blue)' : base;
}

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
    <div role="status" aria-live="polite">
      <button type="button" className="intro-toast" onClick={() => markIntroSeen()}>
        Tap a bull to hear their story · Tap the barn to submit · Check the signpost for rankings
      </button>
    </div>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = useFarmStore((s) => s.isAdmin);
  const setAdmin = useFarmStore((s) => s.setAdmin);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // Load-screen gating (prd-tobu-load-screen): the farm mounts and loads
  // beneath the splash; entry needs data + a rendered first frame.
  const [hasEntered, setHasEntered] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const setMuted = useFarmStore((s) => s.setMuted);
  // Which reaction chip's names popover is open (US-001) — single slot, so
  // only one popover can ever be open at a time.
  const [namesFor, setNamesFor] = useState<ReactionEmoji | null>(null);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);
  const reactionBarRef = useRef<HTMLDivElement>(null);
  const winnerColors = useWinnerColors();

  // Reaction picker/popover housekeeping: reset when the bubble
  // changes/closes, close on outside tap while open.
  useEffect(() => {
    setIsPickerOpen(false);
    setNamesFor(null);
  }, [selectedTobuId]);

  useEffect(() => {
    if (!isPickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (pickerAnchorRef.current && !pickerAnchorRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isPickerOpen]);

  useEffect(() => {
    if (!namesFor) return;
    const onPointerDown = (e: PointerEvent) => {
      if (reactionBarRef.current && !reactionBarRef.current.contains(e.target as Node)) {
        setNamesFor(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [namesFor]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setTobus(MOCK_TOBUS);
      setDataReady(true);
      return;
    }

    const unsubscribe = subscribeToTobus(
      (liveTobus) => {
        setTobus(liveTobus);
        setHasFirebaseError(false);
        setDataReady(true);
      },
      () => {
        setTobus(MOCK_TOBUS);
        setHasFirebaseError(true);
        setDataReady(true); // demo fallback applied — don't block entry
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

  // Escape closes the topmost overlay. BarnSubmit is excluded — it owns its
  // own Escape handling so it can gate on an unsaved draft first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isBarnOpen) return;
      if (isMenuOpen) setIsMenuOpen(false);
      else if (isAdminPanelOpen) setIsAdminPanelOpen(false);
      else if (isAdminPinOpen) setIsAdminPinOpen(false);
      else if (isLeaderboardOpen) setIsLeaderboardOpen(false);
      else if (isMascotOpen) setIsMascotOpen(false);
      else if (namesFor) setNamesFor(null); // popovers close before the bubble
      else if (isPickerOpen) setIsPickerOpen(false);
      else if (selectedTobuId) selectTobu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isBarnOpen, isMenuOpen, isAdminPanelOpen, isAdminPinOpen, isLeaderboardOpen, isMascotOpen, namesFor, isPickerOpen, selectedTobuId, selectTobu]);

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
        <h1 className="topbar-title">Tobu Farm</h1>
        <div className="topbar-actions">
          {dataSourceMessage && (
            <span className="topbar-status" role="img" title={dataSourceMessage} aria-label={dataSourceMessage}>
              <TriangleAlert size={18} aria-hidden />
            </span>
          )}
          <MuteButton />
          <TopMenu
            isOpen={isMenuOpen}
            onToggle={() => setIsMenuOpen((open) => !open)}
            onClose={() => setIsMenuOpen(false)}
            onSubmit={() => setIsBarnOpen(true)}
            onLeaderboard={() => setIsLeaderboardOpen(true)}
            onInfo={() => setIsMascotOpen(true)}
            onAdmin={() => {
              if (isAdmin) setIsAdminPanelOpen(true);
              else setIsAdminPinOpen(true);
            }}
            isAdmin={isAdmin}
            onAdminLogout={() => setAdmin(false)}
          />
        </div>
      </div>

      <div className="canvas-wrap">
        <Farm
          onBarnClick={() => setIsBarnOpen(true)}
          onMascotClick={() => setIsMascotOpen(true)}
          onSignpostClick={() => setIsLeaderboardOpen(true)}
          onFirstFrame={() => setSceneReady(true)}
        />
      </div>

      {!userName && !isGuest && <RosterPicker />}

      {isLeaderboardOpen && <Leaderboard onClose={() => setIsLeaderboardOpen(false)} />}

      {selected && (
        <div className="speech-bubble" onClick={() => selectTobu(null)}>
          <div className="speech-content tobu-bubble" onClick={(e) => e.stopPropagation()}>
            <h2 className="tobu-sender" style={{ color: senderTint(selected.winner_name, winnerColors) }}>
              {selected.winner_name}
            </h2>
            {/* Stories carry their own quote marks where the moment is a quote. */}
            <p>{selected.story}</p>
            {selected.commentary && (
              <h4 className="tobu-commentary">{selected.commentary}</h4>
            )}
            {!userName && (
              <small className="reaction-hint">Pick your name from the roster to react.</small>
            )}
            <div className="reaction-bar" ref={reactionBarRef}>
              {REACTION_EMOJIS.filter((emoji) => (selected.reactions[emoji]?.length ?? 0) > 0).map(
                (emoji, chipIndex) => {
                  const reactors = selected.reactions[emoji] ?? [];
                  const active = selectedReaction === emoji;
                  const namesOpen = namesFor === emoji;
                  const namesId = `reaction-names-${chipIndex}`;
                  return (
                    // Chip tap shows WHO reacted (Slack-style, US-001);
                    // adding/removing your reaction lives in the picker.
                    <div key={emoji} className="reaction-chip-anchor">
                      <button
                        type="button"
                        className={`reaction-chip${active ? ' is-active' : ''}`}
                        onClick={() => setNamesFor((cur) => (cur === emoji ? null : emoji))}
                        aria-expanded={namesOpen}
                        aria-controls={namesOpen ? namesId : undefined}
                        title="See who reacted"
                      >
                        <span aria-hidden>{emoji}</span>
                        <span>{reactors.length}</span>
                        <span className="visually-hidden">
                          {emoji} reactions — see who reacted
                        </span>
                      </button>
                      {namesOpen && (
                        <div
                          className="reaction-names"
                          id={namesId}
                          role="group"
                          aria-label={`People who reacted with ${emoji}`}
                        >
                          <ul>
                            {reactors.map((name) => (
                              <li
                                key={name}
                                className={name === userName ? 'is-you' : undefined}
                              >
                                {name === userName ? 'You' : name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
              <div className="reaction-picker-anchor" ref={pickerAnchorRef}>
                <button
                  type="button"
                  className="reaction-add"
                  aria-label="Add reaction"
                  aria-expanded={isPickerOpen}
                  disabled={isUpdatingReaction || !userName}
                  title={!userName ? 'Pick your name first to react' : 'Add reaction'}
                  onClick={() => setIsPickerOpen((open) => !open)}
                >
                  <SmilePlus size={20} aria-hidden />
                </button>
                {isPickerOpen && (
                  <div className="reaction-picker">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`reaction-pick${selectedReaction === emoji ? ' is-active' : ''}`}
                        aria-label={
                          selectedReaction === emoji
                            ? `Remove your ${emoji} reaction`
                            : `React with ${emoji}`
                        }
                        title={
                          selectedReaction === emoji ? 'Tap to remove your reaction' : undefined
                        }
                        onClick={() => {
                          void handleReaction(emoji);
                          setIsPickerOpen(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

      {!hasEntered && (
        <LoadScreen
          ready={sceneReady && dataReady}
          onEnter={() => {
            // Inside the trusted tap: arrive with sound on (US-003).
            setMuted(false);
            unlockAudio();
            syncAmbientPlayback();
          }}
          onDone={() => setHasEntered(true)}
        />
      )}

      {isMascotOpen && (
        <div className="speech-bubble" onClick={() => setIsMascotOpen(false)}>
          <div className="speech-content" onClick={(e) => e.stopPropagation()}>
            <h2>Tobu Mascot</h2>
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
