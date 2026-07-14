# PRD: Bubble Redesign, Web Font, WhatsApp-Style Reactions, Photo Deprecation

## Introduction

The Tobu speech bubble is the app's payoff moment — tap a bull, read the story — but it currently renders as a generic white modal with a permanent 5-button reaction strip, set in the system font. This PRD gives it a chat-bubble redesign (the natural metaphor for "what someone said"), moves the app onto a proper self-hosted web font (Nunito), replaces the always-visible reaction row with the WhatsApp pattern (count chips + a single button that opens an emoji popover), and removes the never-really-used photo upload feature.

Decisions locked with the product owner: **Nunito** (self-hosted via @fontsource, never a CDN request — offline PWA must keep working) · **same 5 reaction emojis** in the popover (they're the Firestore keys; no migration) · **count chips + one add button** for display · **chat-bubble look with a tail** · **photos deprecated** ("doesn't make sense" for this product).

## Goals

- The Tobu bubble reads as a chat message from the winner: sender-style name header, message-style quote, quieter commentary sub-line, tail on the card
- Whole app renders in Nunito with correct weights, self-hosted, precached for offline
- Reactions follow the WhatsApp pattern: chips only for emojis with ≥1 reaction, one add-reaction button, popover with the 5 choices
- Photo upload/display code removed from the submit form and admin queue
- No Firestore schema or rules changes required by any of this

## User Stories

### US-001: Self-hosted Nunito across the app
**Description:** As a user, I want the app set in a warm, rounded, professional typeface so it feels designed rather than default.

**Acceptance Criteria:**
- [ ] `@fontsource/nunito` installed; weights 400 (body), 600 (labels), 700 (headings), 800 (display) imported
- [ ] A `--font-family-base` token in `tokens.css` applies Nunito with the existing system stack as fallback; `html, body` and form controls (`input`/`button`/`select`/`textarea` don't inherit font by default) all use it
- [ ] Zero requests to external font CDNs (verify in the network panel); woff2 files land in the PWA precache (existing `woff2` glob already covers this)
- [ ] No FOIT: fontsource's default `font-display: swap` behavior confirmed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Chat-bubble redesign of the Tobu story card
**Description:** As a user tapping a bull, I want the story presented like a chat message from the winner so the "here's what they said" moment lands.

**Acceptance Criteria:**
- [ ] The Tobu bubble (only — not the barn/admin/leaderboard modals) gets a dedicated chat-bubble treatment: rounded card with a CSS tail, WhatsApp-group-style sender header (winner's name, small/bold, tinted with their bull's coat color from `bullColorFromSeed`), the quote as the primary message text, commentary as the existing quieter sub-line
- [ ] Other modals keep the shared card styling (they inherit the font change but no tail/chat layout)
- [ ] Touch targets and focus rings from the UI/UX uplift are preserved
- [ ] Bubble still fits a 375px viewport with reactions and long stories (280 chars)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: WhatsApp-style reactions — chips + single picker button
**Description:** As a section member, I want to react the way I do in WhatsApp — tap one button, pick an emoji from a floating row — so reacting feels familiar and the bubble isn't dominated by five permanent buttons.

**Acceptance Criteria:**
- [ ] The permanent 5-button row is replaced by: (a) count chips rendered only for emojis with ≥1 reaction (emoji + count), and (b) one add-reaction button (Lucide `SmilePlus`) that opens the picker
- [ ] The picker is a floating popover (pill-shaped row of the 5 emojis, WhatsApp-style) anchored near the add button; opens on tap, closes on selection, outside tap, or Escape
- [ ] Selecting an emoji in the picker toggles/switches the user's reaction exactly as today (same `handleReaction` logic, same one-reaction-per-user rule, same Firestore writes)
- [ ] Tapping a chip you already reacted with removes your reaction (WhatsApp behavior); your own chip is visually highlighted
- [ ] Guest mode: add button disabled with the existing hint; chips still visible read-only
- [ ] Picker entrance animation is subtle (~150-200ms scale/fade) and gated behind `prefers-reduced-motion`
- [ ] All targets ≥44px; picker is keyboard-reachable (focusable emoji buttons, Escape closes)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Deprecate the photo feature
**Description:** As the product owner, I want photo upload removed because it doesn't fit the product, simplifying the submit flow and admin review.

**Acceptance Criteria:**
- [ ] BarnSubmit: photo file input, its label, the `photo` state, `uploadTobuPhoto` call, and the "Photo uploads require Firebase" hint are removed
- [ ] AdminPanel: photo thumbnail rendering removed
- [ ] Dead CSS (`.speech-photo`) removed
- [ ] `photo_url?` stays on the `Tobu` type, commented as a deprecated legacy field (old documents may carry it; it is simply never written or rendered anymore) — no Firestore data or rules migration
- [ ] `src/firebase/storage.ts` and its re-export removed if nothing else references them
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Install `@fontsource/nunito`; import weight files once at the app entry; define `--font-family-base` and apply globally including form controls
- FR-2: Add a `tobu-bubble` variant class on the story bubble's `.speech-content` for the chat treatment; leave the shared `.speech-content` base intact for other modals
- FR-3: Chat header: winner name at `--font-size-h4`/700 colored via `bullColorFromSeed(winner_name)`; quote at `--font-size-h3`; tail built with a rotated/clipped pseudo-element matching the card background
- FR-4: New `ReactionBar` component (or inline in App.tsx): computes chips from `selected.reactions`, renders add button + popover; reuses the existing `handleReaction`/`applyLocalReaction` logic untouched
- FR-5: Popover closes on: emoji pick, outside pointerdown, Escape (integrate with the existing App-level Escape handler ordering — popover closes before the bubble does)
- FR-6: Remove photo code paths per US-004
- FR-7: No changes to `firestore.rules`, reaction data shape, or the `ReactionEmoji` type

## Non-Goals

- No full emoji library/search (the 5 fixed reactions are the schema)
- No date/term display in the bubble (unchanged prior decision)
- No restyling of barn/admin/leaderboard beyond inheriting the font
- No dark mode
- No deletion of existing `photo_url` values from Firestore, and no storage-rules teardown — old data stays readable, just unrendered
- No positional anchoring of the bubble to the tapped bull in 3D space (stays a centered overlay; the tail is stylistic)

## Technical Considerations

- **@fontsource** imports are plain CSS with local woff2 files — Vite bundles them, the existing `**/*.woff2` workbox glob precaches them; bundle grows ~100-140KB total for 4 weights (acceptable; they cache independently of JS)
- **Escape ordering:** App's existing Escape handler closes the bubble; the popover must intercept first (its own keydown listener added while open, or a guard flag), mirroring how BarnSubmit owns its Escape
- **Chip layout shift:** reacting creates/removes chips — keep the reaction row `min-height` fixed so the card doesn't jump (CLS guideline from the best-practices doc)
- **`bullColorFromSeed` for the name tint:** verify contrast on white; if a coat color is too light (cream/white coats), fall back to `--color-brand-blue`

## Success Metrics

- Reacting takes 2 taps (open picker → pick) vs. 1 before — accepted tradeoff for a dramatically cleaner card; chip toggle-off keeps un-reacting at 1 tap
- Bubble vertical footprint shrinks (5-button row → single chip row) — more of the farm visible behind
- Zero CDN font requests; PWA still fully offline-capable
- No regression in the reaction E2E flow (toggle on/off/switch verified against live Firestore)

## Open Questions

- Should the popover also appear on long-press of the message body (true WhatsApp muscle memory) in addition to the add button? Deferred unless requested — long-press conflicts with text selection.
- Legacy `photo_url` data: ~0 documents currently carry photos, so nothing visible changes; if any ever did, is silent non-rendering acceptable? (Assumed yes for a deprecated feature.)
