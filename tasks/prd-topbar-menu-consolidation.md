# PRD: Top-Right Menu Consolidation + Remove Bottom Bar

## Introduction

The app currently has controls on two edges: the **top bar** (right side) holds the mute toggle and the admin wrench, and a **bottom red action bar** holds Submit a Tobu / Wall of Fame / Tobu?. This refactor collapses the scattered buttons into a **single top-right dropdown menu** and **deletes the bottom bar entirely**, giving the 3D farm more vertical room.

The bottom action bar was added recently (prd-reactions-colors-chrome-audio US-004) as a discoverability aid. This supersedes that decision: the same actions move into the top-right menu, and the reclaimed ~56px (plus the iPhone safe-area inset) goes back to the canvas.

Locked decisions (from clarification):
- **Menu holds Admin + Submit a Tobu + Wall of Fame + Tobu?** — **mute stays a one-tap icon** in the top bar (it's a frequent toggle now that sound starts on entry).
- **Dropdown panel** anchored under the top-right menu button (not a bottom sheet or full-screen overlay).
- **3D landmarks stay interactive** — tapping the barn / signpost / Mama Tobu still opens their panels; the menu is a second, discoverable path to the same panels.

## Goals

- One consolidated menu button on the top-right opens a dropdown with all non-mute controls
- The bottom red action bar is removed and its vertical space returned to the 3D canvas
- Mute remains a single-tap control in the top bar
- Tapping the 3D landmarks still opens the same panels (no loss of direct interactivity)
- No action becomes harder to reach than "open menu → tap item" (≤2 taps)
- The top bar keeps its polished look (gradient + yellow divider); only the bottom strip is deleted

## User Stories

### US-001: Top-right menu button + dropdown
**Description:** As a user, I want a single menu button in the top-right corner that opens a compact list of actions, so the controls are in one predictable place.

**Acceptance Criteria:**
- [ ] A menu trigger button (icon, e.g. Lucide `MoreVertical` kebab or `Menu` hamburger) sits at the far top-right of the top bar
- [ ] Tapping it opens a dropdown panel anchored under the button, listing labeled items with their Lucide icons
- [ ] Tapping a menu item runs its action and closes the menu
- [ ] The dropdown closes on: outside tap, Escape, tapping the trigger again, or selecting an item; only one instance open at a time
- [ ] Trigger has `aria-haspopup="menu"` + `aria-expanded`; the panel uses `role="menu"` with `role="menuitem"` children; keyboard-accessible (open, arrow/tab through items, Enter/Space to activate, Escape to close)
- [ ] Menu items are ≥44px tall with visible focus rings; panel respects safe-area and never overflows the viewport
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Move actions + admin into the menu
**Description:** As a user, I want Submit, Wall of Fame, Tobu?, and Admin inside the one menu, so I'm not hunting across two toolbars.

**Acceptance Criteria:**
- [ ] Menu items: **Submit a Tobu** (opens BarnSubmit), **Wall of Fame** (opens Leaderboard), **Tobu?** (opens the mascot bubble) — each calling the same handlers the 3D landmarks already use (`setIsBarnOpen` / `setIsLeaderboardOpen` / `setIsMascotOpen`)
- [ ] Menu item **Admin**: when not admin, opens the PIN gate; when admin, opens the pending queue
- [ ] The admin right-click-to-log-out gesture is replaced by an explicit **Log out of admin** menu item, shown only when `isAdmin` is true
- [ ] The standalone admin wrench button is removed from the top bar (its function now lives in the menu)
- [ ] Opening any panel from the menu behaves identically to opening it from the 3D landmark (no duplicated state)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Remove the bottom bar + reclaim canvas space
**Description:** As a user, I want the red bottom strip gone so I can see more of the farm.

**Acceptance Criteria:**
- [ ] The `BottomBar` component is removed from the app (render + import), and the `.bottombar` styles are deleted
- [ ] `.canvas-wrap` no longer reserves bottom padding for the bar; the canvas extends to the bottom edge (respecting `env(safe-area-inset-bottom)` so content isn't under the home indicator)
- [ ] The canvas visibly gains the height the bar used to occupy (~56px + safe-area)
- [ ] The intro toast, which was offset above the old bar, is repositioned to sit correctly near the bottom edge again (with safe-area inset)
- [ ] No dead references to `BottomBar` remain
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Mute + landmarks unchanged (regression guard)
**Description:** As a user, I want mute to stay one tap and the farm to stay tappable, so nothing I rely on got harder.

**Acceptance Criteria:**
- [ ] The mute button remains a single-tap icon in the top bar, immediately left of the menu trigger
- [ ] Muting/unmuting still works in one tap and still governs ambient + moo audio
- [ ] Tapping the barn, signpost, and Mama Tobu in the 3D scene still opens BarnSubmit / Leaderboard / mascot bubble respectively
- [ ] The conditional data-source warning icon (shown on Firebase error / demo mode) still appears in the top bar as a status indicator (it is not a button, so it stays visible rather than moving into the menu)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Add a top-right menu trigger + dropdown panel component (e.g. `TopMenu`) rendered inside `.topbar`.
- FR-2: Populate the menu with Submit a Tobu, Wall of Fame, Tobu?, Admin, and (conditionally) Log out of admin — wired to the existing `App.tsx` handlers/state.
- FR-3: Remove the standalone admin trigger button; fold its PIN-gate/queue behavior into the Admin menu item and its logout into the Log-out item.
- FR-4: Remove the `BottomBar` component, its render, import, and `.bottombar` CSS.
- FR-5: Remove `.canvas-wrap`'s bottom padding; keep only the safe-area inset at the bottom.
- FR-6: Reposition the intro toast to the bottom edge (with safe-area) now that the bar is gone.
- FR-7: Extend the existing Escape-key overlay chain so the menu closes before deeper overlays.
- FR-8: Keep the mute button and the conditional status icon in the top bar; keep 3D landmark taps functional.

## Non-Goals

- **No loss of 3D interactivity** — landmarks stay tappable; the menu is additive.
- **Mute is not buried** — it stays a one-tap top-bar icon, not a menu item.
- **No new actions** — this only relocates existing controls; it does not add features to the menu (no settings, no winners list, etc.).
- **No change to the top bar's visual treatment** — the gradient + yellow divider + shadow stay; only the *bottom* red bar is deleted.
- **No bottom sheet / full-screen menu** — the menu is a dropdown panel.
- **No change to any panel's contents** (BarnSubmit, Leaderboard, mascot bubble, admin queue unchanged).

## Design Considerations

- **Trigger icon:** a kebab (`MoreVertical`) or hamburger (`Menu`) from the existing Lucide set, matching the mute/admin icon sizing; white on the red bar with the white focus-ring variant already used there.
- **Dropdown:** brand-styled surface (reuse tokens: `--color-surface`, `--radius-md`, `--shadow-card`), right-aligned under the trigger, items left-aligned with icon + label. Reuse the interaction pattern already built for the reaction picker / names popover (anchor + outside-tap close + reduced-motion gate).
- **Admin affordance:** the current wrench has a hidden right-click-to-demote gesture that doesn't translate to a menu; replacing it with an explicit "Log out of admin" item is clearer and more discoverable.
- **Reclaimed space:** removing the bar is the whole point — verify the canvas actually grows (measure `.canvas-wrap` height before/after) and that nothing important sat only in the bar.

## Technical Considerations

- Current top-bar right side (`App.tsx`): a conditional status `<span>` (TriangleAlert), `<MuteButton />`, and the `.admin-trigger` button. Current bottom bar: `<BottomBar>` with three buttons calling `setIsBarnOpen` / `setIsLeaderboardOpen` / `setIsMascotOpen`.
- The menu can reuse the anchor/outside-pointerdown/Escape pattern already present for the reaction picker and names popover in `App.tsx`, keeping one consistent popover behavior.
- Escape precedence: the menu should close before the selected-Tobu bubble and other overlays; slot it into the existing `onKey` chain.
- The mascot bubble ("Tobu?"), BarnSubmit, Leaderboard, admin PIN gate, and admin panel components are unchanged — only their *entry points* move.
- Watch for the intro-toast offset (`bottom: calc(56px + ...)`) added when the bar shipped — it must revert to a bottom-edge position.

## Success Metrics

- Canvas vertical height increases by the removed bar's footprint (~56px + safe-area), measurable in dev-browser
- Every relocated action reachable in ≤2 taps (open menu → item); mute still 1 tap
- No regression: landmarks still open panels; mute still governs audio; admin login/logout still works
- No console errors; tsc/lint/build clean

## Open Questions

- Menu trigger glyph: kebab (`MoreVertical`) vs hamburger (`Menu`)? (Defaulting to kebab — reads as "more actions" rather than "site nav".)
- Should the data-source warning, when present, also surface as a line inside the menu, or is the top-bar status icon enough? (Defaulting to top-bar icon only.)
- Label wording for the info action — keep "Tobu?" or spell it "About Tobu" in the menu where there's room for a fuller label? (Defaulting to "Tobu?" for brand consistency.)
