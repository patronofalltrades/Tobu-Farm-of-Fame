# TRD: Winner Navigation, Bubble Cleanup, Loading Copy

Companion to [prd-winner-navigation-and-polish.md](prd-winner-navigation-and-polish.md). Covers the concrete implementation: exact edits, data flow, edge cases, and the test plan.

## 1. Overview

All five items are small, localized edits to existing components — no new files, no new dependencies, no data-model changes.

```
App.tsx
 ├─ mascot bubble <h2>            → "Who is Tobu?"                          (US-001)
 ├─ mascot bubble <button>Close   → removed                                  (US-002)
 ├─ Tobu bubble <button>Close     → removed                                  (US-002)
 ├─ Tobu bubble                   → + winner-pager (prev/next)               (US-003)
 └─ <Leaderboard onSelectWinner>  → new prop, implemented here                (US-004)

Leaderboard.tsx
 ├─ <button>Close                → removed                                  (US-002)
 └─ row <li><span>…</span></li>  → row <li><button onClick=onSelectWinner>…</button></li>  (US-004)

LoadScreen.tsx
 └─ static subtitle string        → 3-stage function of `progress`           (US-005)

App.css
 ├─ .top-menu-item-style pager buttons (new .tobu-pager rules)                (US-003)
 ├─ .leaderboard-row → button reset + hover/focus states                     (US-004)
 └─ .topbar horizontal padding → safe-area-aware edge gutter                  (US-006)
```

## 2. US-001 — Mascot heading

**File:** `src/App.tsx`

```diff
- <h2>Tobu Mascot</h2>
+ <h2>Who is Tobu?</h2>
```

One-line change. No other copy in that block changes.

## 3. US-002 — Remove Close buttons

**Files:** `src/App.tsx` (Tobu bubble + mascot bubble), `src/components/Leaderboard.tsx`

Remove exactly these three lines (and nothing else in their surrounding JSX):

```diff
  {/* Tobu story bubble */}
- <button onClick={() => selectTobu(null)}>Close</button>

  {/* Mascot bubble */}
- <button onClick={() => setIsMascotOpen(false)}>Close</button>

  {/* Leaderboard.tsx */}
- <button onClick={onClose}>Close</button>
```

`BarnSubmit.tsx`'s `<button onClick={requestClose}>Cancel</button>` and `AdminPinGate.tsx`'s `<button onClick={onClose}>Cancel</button>` are **not touched** — different label ("Cancel" vs "Close"), different semantics (they gate an in-progress action), explicitly out of scope per the PRD.

The backdrop `onClick={onClose}` (or `selectTobu(null)` / `setIsMascotOpen(false)`) on each `.speech-bubble` wrapper already exists and is untouched — that's what continues to close these on outside-tap. The global Escape-key `useEffect` in `App.tsx` already handles `isMascotOpen` and `selectedTobuId` in its chain — also untouched.

## 4. US-003 — Winner pager inside the Tobu bubble

**File:** `src/App.tsx`

### 4.1 Derive the winner's ordered win list

Add a `useMemo`, alongside the existing `selected`/`selectedReaction` derivations:

```ts
const winnerTobus = useMemo(() => {
  if (!selected) return [];
  return tobus.filter(
    (t) => t.status === 'approved' && t.winner_name === selected.winner_name,
  );
}, [tobus, selected]);

const winnerIndex = selected ? winnerTobus.findIndex((t) => t.id === selected.id) : -1;
const hasMultipleWins = winnerTobus.length > 1;
```

`tobus` is already sorted `date` then `id` ascending (guaranteed by `subscribeToTobus` — see its comment: "repeat-winner coat variants are assigned by occurrence index — an unstable order would swap which win gets which shade between reloads"). Filtering preserves that order, so `winnerTobus[0]` is the winner's first win and `winnerTobus[winnerTobus.length - 1]` is their most recent — no extra sort needed.

### 4.2 Render the pager

Inside the Tobu bubble, after the reaction bar's closing `</div>` and before the (now-removed) Close button's old position:

```tsx
{hasMultipleWins && (
  <div className="tobu-pager">
    <button
      type="button"
      className="tobu-pager-btn"
      disabled={winnerIndex <= 0}
      aria-label={`Previous win by ${selected.winner_name}`}
      onClick={() => selectTobu(winnerTobus[winnerIndex - 1].id)}
    >
      <ChevronLeft size={18} aria-hidden />
    </button>
    <span className="tobu-pager-count">
      {winnerIndex + 1} / {winnerTobus.length}
    </span>
    <button
      type="button"
      className="tobu-pager-btn"
      disabled={winnerIndex >= winnerTobus.length - 1}
      aria-label={`Next win by ${selected.winner_name}`}
      onClick={() => selectTobu(winnerTobus[winnerIndex + 1].id)}
    >
      <ChevronRight size={18} aria-hidden />
    </button>
  </div>
)}
```

Add `ChevronLeft, ChevronRight` to the existing `lucide-react` import in `App.tsx`.

Clicking prev/next calls the existing `selectTobu(id)` — the same setter that already drives which Tobu's data renders in the bubble. No new state, no bubble close/reopen; React just re-renders the same `.speech-content` with the new `selected` object (story, commentary, sender tint, and reaction bar all naturally follow since they already derive from `selected`).

### 4.3 CSS — `App.css`

```css
.tobu-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.tobu-pager-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-brand-blue);
  cursor: pointer;
}

.tobu-pager-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tobu-pager-count {
  font-size: var(--font-size-small);
  font-weight: 700;
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: center;
}
```

## 5. US-004 — Tap a Wall of Fame name

**Files:** `src/components/Leaderboard.tsx`, `src/App.tsx`

### 5.1 `Leaderboard.tsx` — new prop + clickable rows

```diff
 interface LeaderboardProps {
   onClose: () => void;
+  onSelectWinner: (name: string) => void;
 }

-export function Leaderboard({ onClose }: LeaderboardProps) {
+export function Leaderboard({ onClose, onSelectWinner }: LeaderboardProps) {
```

Row markup — wrap the existing row content in a button instead of a bare `<li>`:

```diff
- <li key={row.name} className="leaderboard-row">
-   <span className="leaderboard-rank">#{i + 1}</span>
-   <span className="leaderboard-swatch" ... aria-hidden />
-   <span className="leaderboard-name" title={row.name}>{row.name}</span>
-   <span className="leaderboard-wins">...</span>
- </li>
+ <li key={row.name}>
+   <button
+     type="button"
+     className="leaderboard-row"
+     onClick={() => onSelectWinner(row.name)}
+   >
+     <span className="leaderboard-rank">#{i + 1}</span>
+     <span className="leaderboard-swatch" ... aria-hidden />
+     <span className="leaderboard-name" title={row.name}>{row.name}</span>
+     <span className="leaderboard-wins">...</span>
+   </button>
+ </li>
```

`.leaderboard-row`'s existing CSS (`display: grid; grid-template-columns: 44px 18px 1fr auto; ...`) moves from the `<li>` selector onto the `<button>` — a `<button>` accepts `display: grid` identically, so the visual layout is unaffected. Add button resets (`background: none; border: none; width: 100%; text-align: left; cursor: pointer; font: inherit;`) plus a hover/focus state.

### 5.2 `App.tsx` — implement `onSelectWinner`

```ts
const handleSelectWinner = (name: string) => {
  const wins = tobus
    .filter((t) => t.status === 'approved' && t.winner_name === name)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const mostRecent = wins[wins.length - 1];
  if (!mostRecent) return;
  selectTobu(mostRecent.id);
  setIsLeaderboardOpen(false);
};
```

(The explicit re-sort here is defensive/self-documenting; `tobus` is already in this order, so `.filter` alone would suffice — but spelling out the order at the call site makes the "most recent" intent unambiguous to a future reader without needing to trace `subscribeToTobus`.)

```diff
- {isLeaderboardOpen && <Leaderboard onClose={() => setIsLeaderboardOpen(false)} />}
+ {isLeaderboardOpen && (
+   <Leaderboard
+     onClose={() => setIsLeaderboardOpen(false)}
+     onSelectWinner={handleSelectWinner}
+   />
+ )}
```

Opening the Tobu bubble this way is just `selectTobu(id)` — the same path a bull tap already uses — so the pager from US-003 is present automatically if that winner has multiple wins.

### 5.3 CSS — `App.css`

```css
.leaderboard-row {
  /* existing grid rules unchanged, plus button reset: */
  width: 100%;
  background: none;
  border: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.leaderboard-row:hover,
.leaderboard-row:focus-visible {
  background: var(--color-surface-hover);
}
```

## 6. US-005 — Loading screen subtitle stages

**File:** `src/components/LoadScreen.tsx`

```ts
const LOAD_STAGES = [
  { max: 33, text: 'Rounding up the herd…' },
  { max: 66, text: 'Brushing their coats…' },
  { max: 100, text: 'Setting up the pasture…' },
];

function loadingSubtitle(progress: number): string {
  const stage = LOAD_STAGES.find((s) => progress <= s.max);
  return (stage ?? LOAD_STAGES[LOAD_STAGES.length - 1]).text;
}
```

```diff
- <span>Rounding up the herd…</span>
+ <span>{loadingSubtitle(progress)}</span>
```

`progress` is already destructured from `useProgress()` at the top of the component — no new state, no new prop. The existing `shownProgress` (an 8–100 floor-clamped display value used for the bar's `width`) stays as-is for the bar; `loadingSubtitle` reads the raw `progress` so the two never visually disagree (the bar and the subtitle are both monotonic functions of the same number, and the 33/66 thresholds fall inside the 8–100 display range).

Once `canEnter` is true, this branch doesn't render at all (replaced by the `Enter the farm` button) — matching FR from US-005's acceptance criteria ("no subtitle needed once the CTA shows").

## 7. US-006 — Top-bar edge gutter for mute/menu buttons

**File:** `src/App.css`

Root cause: `.topbar`'s padding shorthand only threads the safe-area inset through the *top* value; the horizontal value is a flat `var(--space-3)` (12px) with no safe-area term:

```css
/* current */
.topbar {
  padding: env(safe-area-inset-top, 0px) var(--space-3) 0;
}
```

Fix: give the left/right padding its own `calc()` combining a larger fixed gutter with the matching safe-area inset, instead of reusing one bare token for both edges:

```diff
 .topbar {
-  padding: env(safe-area-inset-top, 0px) var(--space-3) 0;
+  padding-top: env(safe-area-inset-top, 0px);
+  padding-right: calc(var(--space-5) + env(safe-area-inset-right, 0px));
+  padding-bottom: 0;
+  padding-left: calc(var(--space-5) + env(safe-area-inset-left, 0px));
 }
```

`--space-5` is already defined in `src/styles/tokens.css` as `24px` — swapping `--space-3` (12px) for `--space-5` (24px, chosen over `--space-4`/16px during verification to clear the PRD's ~20px success metric) plus a safe-area term widens the gutter on every device and additionally protects the notched-landscape case where `--space-3` alone left the button cluster with no clearance from the sensor housing.

This only touches `.topbar`'s own padding — `.topbar-actions`'s `gap` (button-to-button spacing) and every button's own size (44px) are untouched, so US-006 doesn't affect US-004 spacing between mute and menu, just their distance from the bar's outer edge. `.canvas-wrap`'s `padding-top` (which reads `--topbar-height`, not this padding) is also untouched — the bar's height doesn't change, only its internal horizontal padding, so there's no layout shift to the canvas below.

## 8. Edge cases

- **Winner has exactly 1 approved Tobu:** `hasMultipleWins` is false → no pager rendered. Identical to today's bubble.
- **Winner has 0 Tobus at the moment `onSelectWinner` fires** (shouldn't happen — the name only exists in Wall of Fame because it has ≥1 approved win, but defensive anyway): `mostRecent` is `undefined`, function returns early, leaderboard stays open, nothing crashes.
- **Pager at boundaries:** prev disabled when `winnerIndex <= 0`; next disabled when `winnerIndex >= winnerTobus.length - 1`. `disabled` buttons already get the app's existing disabled-opacity/no-pointer treatment via `.speech-content button:disabled` — the new `.tobu-pager-btn:disabled` rule adds the same treatment scoped to the smaller pager buttons.
- **Stepping via pager while a reaction popover (`namesFor`) is open:** switching `selected` via `selectTobu` doesn't explicitly clear `namesFor`/`isPickerOpen` — but the existing `useEffect(() => { setIsPickerOpen(false); setNamesFor(null); }, [selectedTobuId])` already resets both whenever `selectedTobuId` changes, which firing `selectTobu` from the pager does. No new bug surface.
- **Load screen progress exactly at a boundary (33, 66):** `progress <= s.max` means 33 and 66 land in the lower stage — acceptable, boundaries are illustrative, not exact contract.
- **Load screen never reaching 100 before timeout:** unaffected — `loadingSubtitle` just reflects whatever `progress` last was; the existing `timedOut` fallback still lets the visitor enter regardless of subtitle stage.

## 9. Test plan (dev-browser)

1. **US-001:** open the mascot bubble via the top-menu "Tobu?" item; assert the heading text is exactly "Who is Tobu?".
2. **US-002:** open the Tobu bubble, mascot bubble, and Wall of Fame one at a time; assert no element with text "Close" exists in each; assert outside-tap and Escape still close each. Separately assert `BarnSubmit`'s Cancel and `AdminPinGate`'s Cancel are still present and still guard as before (dirty-draft confirm still fires).
3. **US-003:** open a bubble for a winner with 2 wins (e.g. Keita Suzuki); assert pager shows "1 / 2", next is enabled/prev disabled; click next, assert content updates (story/commentary/sender tint change) and pager now shows "2 / 2" with next disabled; click prev, assert it returns to "1 / 2". Open a bubble for a single-win winner; assert no pager renders.
4. **US-004:** open Wall of Fame, click a repeat winner's row; assert the leaderboard closes and the Tobu bubble opens showing that winner's **latest** date entry, with the US-003 pager present and positioned at the last index.
5. **US-005:** throttle/observe `useProgress` during a cold load (or drive `progress` via the module graph in a controlled test); assert the subtitle text changes at least once as progress crosses 33 and 66; assert the bar fill and subtitle never disagree on stage.
6. **US-006:** measure the mute/menu button cluster's right edge against `.topbar`'s right edge at desktop width and at 375px; assert the gap is visibly larger than the old 12px and that neither button touches the bar's border; repeat with a simulated `env(safe-area-inset-right)` (e.g. via `resize_window`'s device presets) to confirm the inset is additive, not a replacement for the fixed gutter.
7. **Regression:** tsc + eslint + production build clean; no new console errors; existing reaction-popover and pager interplay (edge case above) spot-checked; bar height and canvas offset unchanged (US-006 didn't touch `--topbar-height`).

## 10. Rollback

Every change here is a localized JSX/CSS edit inside existing components — no schema, no Firestore, no new files besides this doc pair. Rollback is reverting the touched hunks in `App.tsx`, `Leaderboard.tsx`, `LoadScreen.tsx`, and `App.css`.
