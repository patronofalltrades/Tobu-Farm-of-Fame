# PRD: Winner Navigation, Bubble Cleanup, Loading Copy

## Introduction

Four small, independent polish items grounded in the current code:

1. **Mascot bubble heading** — currently reads "Tobu Mascot"; the menu item that opens it already reads "Tobu?" (prd-topbar-menu-consolidation). Change the heading to **"Who is Tobu?"** so the label and the content it opens read as one thought.
2. **Redundant Close buttons** — the Tobu story bubble, the mascot bubble, and Wall of Fame all render an explicit "Close" button *in addition to* the outside-tap-to-close and Escape-to-close behavior every overlay already has (`speech-bubble` backdrop `onClick`, plus the global Escape chain in `App.tsx`). This is also the pattern already used elsewhere with no button at all (RosterPicker, the reaction names popover, TopMenu) — removing the redundant button makes these three consistent with the rest of the app.
3. **Find a winner's Tobus fast** — reframed during clarification from a standalone search box into something more directly useful: **in-bubble navigation** between a repeat winner's multiple wins (prev/next inside the story bubble itself), plus **tappable names in Wall of Fame** that jump straight to that winner's story. Together these answer "show me Thomas's Tobus" in the fewest possible taps, using surfaces that already exist.
4. **Loading screen copy** — the load screen currently shows one static line ("Rounding up the herd…") the whole time. Make the subtitle change through **3 tonal stages** as the real asset-load progress bar advances, so the copy reflects genuine progress instead of sitting still.

Locked decisions (from clarification):
- **Close-button removal is scoped to read-only bubbles**: Tobu story bubble, Wall of Fame, and the mascot bubble. `BarnSubmit`'s Cancel and the Admin PIN gate's Cancel are unchanged — both already guard an in-progress action (unsaved draft / PIN entry) and keeping an explicit control there is safer.
- **Winner navigation**, not a search bar: (a) inside a Tobu's story bubble, if that winner has more than one approved Tobu, show a prev/next pager to step through their other wins without closing the bubble; (b) in Wall of Fame, tapping a name closes the leaderboard and opens that winner's story bubble directly.
- **Loading subtitle**: 3 stages tied to the real `%` from drei's asset-load progress, not a time-based rotation.

## Goals

- The mascot bubble's heading reads "Who is Tobu?"
- Tobu story bubble, Wall of Fame, and the mascot bubble no longer show an explicit Close button; outside-tap and Escape remain the only (and sufficient) way to dismiss them
- From any Tobu bubble for a repeat winner, the viewer can step to that winner's other win(s) in ≤1 tap per step, without leaving the bubble
- From Wall of Fame, tapping any name opens that person's story bubble in exactly 1 tap
- The load screen's subtitle visibly changes at least twice during a normal load, tracking real progress
- No regression to BarnSubmit's or the Admin PIN gate's existing Cancel + unsaved-draft-guard behavior

## User Stories

### US-001: Rename the mascot bubble heading
**Description:** As a user who taps "Tobu?", I want the bubble that opens to greet me with "Who is Tobu?", so the label and its content match.

**Acceptance Criteria:**
- [ ] The mascot bubble's `<h2>` reads "Who is Tobu?" instead of "Tobu Mascot"
- [ ] No other copy in the bubble changes
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Remove the Close button from read-only bubbles
**Description:** As a user, I want the Tobu story bubble, Wall of Fame, and the mascot bubble to dismiss the same way every other overlay in the app already does — tap outside or press Escape — so the app feels consistent and the bubble content isn't crowded by a redundant button.

**Acceptance Criteria:**
- [ ] The explicit "Close" button is removed from: the Tobu story bubble, the mascot ("Who is Tobu?") bubble, and Wall of Fame
- [ ] Tapping outside any of the three still closes it (existing `speech-bubble` backdrop behavior, unchanged)
- [ ] Escape still closes the topmost of the three (existing Escape chain in `App.tsx`, unchanged)
- [ ] `BarnSubmit`'s "Cancel" button and its unsaved-draft confirm are **unchanged**
- [ ] The Admin PIN gate's "Cancel" button is **unchanged**
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Prev/next navigation between a winner's Tobus
**Description:** As a user viewing one of a repeat winner's Tobus, I want to step to their other win(s) right from the bubble, so I can see everything a person won without hunting for it elsewhere.

**Acceptance Criteria:**
- [ ] Opening a Tobu bubble for a winner with **only one** approved Tobu shows no pager (unchanged from today)
- [ ] Opening a Tobu bubble for a winner with **two or more** approved Tobus shows a pager (e.g. "‹ 1 / 2 ›") below the reaction bar
- [ ] The pager's position reflects the currently-open Tobu's chronological order among that winner's wins (oldest = 1)
- [ ] Tapping next/prev switches the bubble's content in place (story, commentary, sender tint, reactions) to the adjacent win — the bubble stays open, it does not close and reopen
- [ ] At the first win, "prev" is disabled; at the last win, "next" is disabled (no wraparound)
- [ ] The pager is keyboard-reachable with visible focus rings; buttons have `aria-label`s ("Previous win by {name}" / "Next win by {name}")
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Tap a Wall of Fame name to open their story
**Description:** As a user browsing the leaderboard, I want to tap a name and land directly in that person's Tobu story, so checking "what did Thomas win for" takes one tap.

**Acceptance Criteria:**
- [ ] Each row in Wall of Fame is tappable (not just the name text — the whole row, for a comfortable target)
- [ ] Tapping a row closes Wall of Fame and opens that winner's Tobu story bubble
- [ ] For a repeat winner, the story bubble that opens defaults to their **most recent** win (highest date) — the US-003 pager is present so the viewer can step back through earlier wins from there
- [ ] Rows remain keyboard-reachable (real `<button>` semantics) with a visible focus ring and unchanged visual layout (rank/swatch/name/wins)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Loading screen subtitle tracks real progress
**Description:** As a visitor waiting on the load screen, I want the subtitle to visibly change as the farm loads, so it's clear something real is happening, not a frozen screen.

**Acceptance Criteria:**
- [ ] The subtitle shows one of 3 stage-appropriate lines depending on the real asset-load `%` (from drei's `useProgress`): roughly 0–33% / 34–66% / 67–99%
- [ ] The subtitle changes automatically as progress crosses each threshold — no user action required
- [ ] The progress bar fill and the subtitle always agree on which "third" the load is in
- [ ] Once ready, the subtitle/status block is replaced by the existing "Enter the farm" CTA exactly as today (no subtitle needed once the CTA shows)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Top-bar buttons no longer crowd the bar's edge
**Description:** As a user, I want the mute and menu buttons in the top bar to sit clear of the bar's own edges, so they don't look clipped or squeezed against it.

**Acceptance Criteria:**
- [ ] The mute and menu buttons have a visible, comfortable gutter between their outer edge and the top bar's right edge (not flush against it or the bar's corner)
- [ ] The gutter accounts for `env(safe-area-inset-right)` (and, symmetrically, `env(safe-area-inset-left)` on the title side), so the buttons stay clear of the edge on notched devices in landscape, not just portrait
- [ ] The existing vertical centering (buttons comfortably inset from the bar's top/bottom, not touching either) is unchanged
- [ ] No layout shift to the canvas below; bar height is unchanged
- [ ] Verified at both desktop width and mobile (375px) — no visual crowding at either
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Change the mascot bubble's heading text from "Tobu Mascot" to "Who is Tobu?" in `App.tsx`.
- FR-2: Remove the `<button>Close</button>` element from the Tobu story bubble, the mascot bubble (both in `App.tsx`), and `Leaderboard.tsx`. Leave their backdrop `onClick`/Escape wiring untouched.
- FR-3: Compute, for the currently-selected Tobu, the ordered list of that winner's approved Tobu ids (chronological, already guaranteed by `subscribeToTobus`'s sort) and the current Tobu's position within it.
- FR-4: When that list has length > 1, render a pager in the Tobu bubble with disabled-at-edges prev/next controls that call `selectTobu(otherId)`.
- FR-5: In `Leaderboard.tsx`, wrap each row in a real `<button>` that, on click, calls a new `onSelectWinner(name: string)` prop.
- FR-6: In `App.tsx`, implement `onSelectWinner`: find that winner's approved Tobus, pick the one with the latest date, call `selectTobu(id)`, and close the leaderboard (`setIsLeaderboardOpen(false)`).
- FR-7: In `LoadScreen.tsx`, replace the single static subtitle string with a 3-way pick keyed off the existing `progress` value from `useProgress()`.
- FR-8: Widen `.topbar`'s horizontal padding to include `env(safe-area-inset-right)` / `env(safe-area-inset-left)` on top of a larger fixed gutter, so the button cluster clears both the bar's visual edge and any device notch/inset.

## Non-Goals

- No change to `BarnSubmit`'s Cancel button or its unsaved-draft confirm dialog.
- No change to the Admin PIN gate's Cancel button.
- No change to the Admin panel (pending queue)'s Close button — not named in scope; left as-is.
- No standalone search box / text input for finding winners — superseded by the navigator + tappable-name design.
- No wraparound pager (stepping "next" past the last win does not loop to the first).
- No change to which Tobus are counted or how Wall of Fame ranks winners — only rows become tappable.
- No change to the load screen's readiness gating (min-display, timeout, first-frame/data-ready logic) — only the subtitle copy.
- No change to the top bar's height, gradient, or divider (prd-reactions-colors-chrome-audio US-003 / the later `--topbar-height` bump) — only its horizontal edge padding.

## Design Considerations

- **Consistency precedent:** RosterPicker, the reaction names popover, and TopMenu already dismiss via outside-tap/Escape with no explicit close button — removing Close from these three bubbles brings them in line with the app's existing pattern rather than introducing a new one.
- **Pager placement:** below the reaction bar, above nothing (it's the last element in the bubble) — small, unobtrusive, in the same visual language as the reaction chips (pill-shaped buttons, brand-blue icon color).
- **Wall of Fame row as a button:** must preserve the existing grid layout (rank/swatch/name/wins columns) — convert the row wrapper to a `<button>` carrying that same grid, rather than adding a nested click target that changes spacing.
- **Loading copy tone:** stay in the existing "Rounding up the herd…" voice — three short, warm, farm-themed lines, not technical ("Loading assets…").
- **Edge gutter:** the button cluster should read as sitting comfortably inside the bar, not pinned to its corner — a modest fixed gutter (bigger than the current `--space-3`/12px) plus the safe-area inset, not just the safe-area inset alone (which is 0 on most devices and would under-fix this on non-notched phones).

## Technical Considerations

- **Winner grouping for the pager:** `tobus` in the store is already sorted `date` then `id` (guaranteed by `subscribeToTobus`), so `tobus.filter(t => t.status === 'approved' && t.winner_name === selected.winner_name)` is already in chronological order — no extra sort needed, just a `useMemo` in `App.tsx` keyed on `tobus` and `selected`.
- **Most-recent-win default for Wall of Fame taps:** the same filtered-and-sorted array's last element is that winner's most recent approved Tobu.
- **No Firestore/schema changes** — this is entirely client-side derivation from data already loaded.
- **Leaderboard prop change:** `Leaderboard` gains `onSelectWinner: (name: string) => void` alongside its existing `onClose`; `App.tsx` passes both.
- **LoadScreen:** `progress` from `useProgress()` is already available in scope; the subtitle becomes a small pure function of that number, no new state.
- **Top bar padding:** `.topbar`'s current `padding: env(safe-area-inset-top, 0px) var(--space-3) 0;` only accounts for the *top* safe-area inset — the left/right value is a flat `var(--space-3)` (12px) with no safe-area term at all. This is the root cause of US-006: on a landscape notched device the buttons could sit under the sensor housing, and even on a plain rectangular viewport 12px reads as tight for a 44px circular target next to a rounded bar edge.

## Success Metrics

- Zero explicit Close buttons remain in the Tobu bubble, mascot bubble, and Wall of Fame (grep-verifiable)
- A repeat winner's Tobus are all reachable from any one of their bubbles in ≤(n-1) taps, n = their win count
- Tapping any Wall of Fame name opens a story bubble in exactly 1 tap
- The load screen's subtitle visibly changes at least once (ideally twice) during a normal (non-instant) load
- No regression: BarnSubmit and Admin PIN Cancel/guard behavior identical to before; tsc/lint/build clean; no console errors
- The button cluster's right edge sits at least ~20px clear of the top bar's edge at every tested viewport (desktop, 375px mobile), measurably wider than today's 12px

## Open Questions

- Wall of Fame's "jump to most recent win" default — acceptable, or would "first win" (their origin story) read better for a repeat winner? Defaulting to most recent per the PRD; easy to flip since the pager makes either choice reversible by the viewer.
- Exact load-screen copy for the three stages is a naming/tone choice for implementation, not a blocking decision (see TRD for a proposed set).
