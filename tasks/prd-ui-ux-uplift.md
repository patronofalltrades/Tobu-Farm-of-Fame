# PRD: UI/UX Uplift — Icons, Accessibility, Best Practices

## Introduction

[docs/ui-ux-benchmark.md](../docs/ui-ux-benchmark.md) measured the overlay UI at ~50% conformance against [docs/ui-ux-best-practices.md](../docs/ui-ux-best-practices.md), weakest in Accessibility (29%) and Forms & Feedback (32%). The user has additionally overridden the previous "emoji as brand" stance for **structural** UI: no emojis as interface chrome, open-source SVG icons instead.

This PRD implements: (1) full structural-emoji → Lucide icon replacement, (2) every ❌ gap and 🟡 partial from the benchmark's prioritized list that is fixable in the UI layer, (3) the 6 quick wins.

**Scope decision — reaction emojis stay.** 😂❤️🔥👏🐂 in the speech bubble are user-generated *content* (like Slack/GitHub reactions), and they are the literal Firestore map keys for stored reactions — replacing them requires a data migration for zero UX benefit. The best-practices source itself scopes its rule to *structural* elements.

## Goals

- Zero emoji characters in structural UI (headings, buttons, status indicators, tallies)
- One consistent open-source icon family (Lucide) at consistent sizing
- Close the benchmark's top gaps: touch targets, focus visibility, disabled states, contrast failures, reduced-motion, heading hierarchy, label association, destructive-action confirmation, unsaved-changes protection, safe-area insets
- No regressions to existing flows (roster pick, reactions, barn submit, admin approve/reject, leaderboard)

## User Stories

### US-001: Structural emojis → Lucide icons
**Description:** As a user, I want crisp, consistent vector icons instead of emoji glyphs so the UI reads as designed rather than improvised, and renders identically across platforms.

**Acceptance Criteria:**
- [ ] `lucide-react` installed; icons render at consistent sizes via shared props
- [ ] Replacements: mute 🔇/🔊 → `VolumeX`/`Volume2`; admin 🛠 → `Wrench` (rendered even when logged out, with `aria-label`); status ⚠️ → `TriangleAlert`; leaderboard 🏆 → `Trophy`; PIN 🔐 → `Lock`; barn 🏠 → `Warehouse`; pending queue 🛠 → `ClipboardList`; submitted 🐂 → `PartyPopper`
- [ ] Text-only cleanups: topbar "🐂 Tobu Farm" → "Tobu Farm"; "Welcome to the farm 🐂" → no emoji; "Nothing in the queue. 🎉" → text only; leaderboard wins "3 🐂" → number only; mascot bubble heading text-only
- [ ] Reaction emoji buttons unchanged (content + Firestore keys)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Touch targets & press feedback
**Acceptance Criteria:**
- [ ] `.mute-button` / `.admin-trigger` ≥44×44px
- [ ] `.roster-item` and `.barn-roster` buttons min-height 44px; barn form inputs ≥44px tall
- [ ] All overlay buttons get an `:active` press state (subtle scale) — first press feedback in the app
- [ ] Verify in browser using dev-browser skill

### US-003: Focus visibility, ARIA, headings, keyboard
**Acceptance Criteria:**
- [ ] Global `:focus-visible` ring (brand blue, 2px offset) on buttons/inputs; white variant inside the red topbar
- [ ] Topbar title becomes `<h1>` (visually unchanged)
- [ ] `aria-label` on admin trigger; labels associated via `htmlFor`/`id` in BarnSubmit; `aria-label` on PIN + roster-search inputs
- [ ] Intro toast wrapped in `role="status"`/`aria-live="polite"`; form errors get `role="alert"`
- [ ] Escape closes the topmost open overlay
- [ ] Admin trigger `title` documents the right-click demote gesture
- [ ] Verify in browser using dev-browser skill

### US-004: Contrast & token hygiene
**Acceptance Criteria:**
- [ ] Topbar title ≥4.5:1 (white on brand red ≈5.4:1)
- [ ] `--color-success` darkened so white-on-green ≥4.5:1
- [ ] `--color-text-muted` darkened to ≥4.5:1 on white
- [ ] Raw hexes (#f3f3f3, #bbb, #d9e1f0, PIN inline #ccc) replaced with tokens; PIN input inline style → class
- [ ] Verify in browser using dev-browser skill

### US-005: Motion, layout, misc best-practices
**Acceptance Criteria:**
- [ ] Intro-toast animation gated behind `prefers-reduced-motion: no-preference`
- [ ] Topbar + canvas respect `env(safe-area-inset-top)` (notch clearance)
- [ ] Body line-heights 1.4 → ≥1.5
- [ ] Leaderboard names get `title` tooltip fallback for truncation
- [ ] Verify in browser using dev-browser skill

### US-006: Form safety
**Acceptance Criteria:**
- [ ] Barn form: closing with a non-empty draft asks for confirmation (backdrop, Cancel, and Escape paths)
- [ ] Admin Reject asks for confirmation before firing
- [ ] Required fields (Winner, The moment) visibly marked
- [ ] Verify in browser using dev-browser skill

## Non-Goals

- Reaction emoji replacement (content + data keys — see scope decision)
- Dark mode (still an open product question)
- Code splitting / bundle chunking (perf refactor with its own risk profile — separate pass; benchmark gap #10 explicitly deferred)
- List virtualization (~70 rows, no measured problem)
- Full focus-trap in modals (Escape-close ships now; trap is a follow-up)
- Rem-based type scale migration (larger refactor, low observed impact for this audience)

## Technical Considerations

- `lucide-react` is tree-shaken per-icon (~1KB each); no measurable bundle impact vs. the existing 1.5MB three.js chunk
- Topbar `<h1>` needs `margin: 0` (UA default would break the 48px bar)
- Press-scale uses `transform` only (compositor-safe, no CLS), applied via `:active:not(:disabled)`
- Safe-area: `height: calc(48px + env(safe-area-inset-top))` on `.topbar`, matching `padding-top` on `.canvas-wrap`

## Success Metrics

- Re-running the benchmark's checks: Accessibility and Forms categories move from 29%/32% to majority-conformant; zero structural emojis remain (grep-verifiable); all six quick wins closed
- No console errors; tsc/lint/build clean; all existing E2E flows still pass
