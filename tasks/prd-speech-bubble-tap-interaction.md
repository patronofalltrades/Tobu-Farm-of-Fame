# PRD: Speech Bubble Tap Interaction

## Introduction

Refine the bull tap interaction so that tapping a bull on the 3D farm pops up a polished speech bubble showing the winner's name, their quote/story, and a row of fixed emoji reactions. The speech bubble is the primary way users engage with individual Tobu moments — it should feel instant, playful, and satisfying.

A basic implementation already exists in `App.tsx` (lines 164–193) as an HTML overlay with reaction buttons. This PRD covers polishing it into a complete, production-ready feature: proper positioning relative to the tapped bull, clean dismiss behavior, moo sound on tap, and fully functional emoji reactions persisted to Firestore.

## Goals

- Tapping any bull instantly shows a speech bubble with the winner's name, quote, and emoji reactions
- Tapping the same bull again (or tapping outside) dismisses the bubble
- A moo sound plays when a bull is tapped
- Users who have selected a roster identity can toggle emoji reactions (one per emoji per user)
- Reactions persist to Firestore in real time
- The interaction feels responsive on mobile (portrait, mid-range phone)

## User Stories

### US-001: Show speech bubble on bull tap
**Description:** As a visitor, I want to tap a bull and see who won and what they said, so I can enjoy the Tobu moment.

**Acceptance Criteria:**
- [ ] Tapping a bull shows a speech bubble overlay containing the winner's name and their quote/story
- [ ] The bubble appears instantly (no fade/scale animation)
- [ ] The moo sound (`public/audio/moo.wav`) plays on tap via `playMoo()`
- [ ] Only one speech bubble is visible at a time — tapping a different bull replaces the current bubble
- [ ] Typecheck passes (`npx tsc --noEmit`)
- [ ] Verify in browser using dev server

### US-002: Dismiss speech bubble
**Description:** As a visitor, I want to dismiss the speech bubble easily so I can continue exploring the farm.

**Acceptance Criteria:**
- [ ] Tapping the same bull again closes the bubble (toggle behavior via `selectTobu`)
- [ ] Tapping outside the bubble content (on the backdrop overlay) closes the bubble
- [ ] Tapping a different bull closes the current bubble and opens the new one
- [ ] A close button inside the bubble also dismisses it
- [ ] After dismissal, `selectedTobuId` in the Zustand store is `null`
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

### US-003: Display emoji reaction counts
**Description:** As a visitor, I want to see how many people reacted to each Tobu moment so I can see which ones are popular.

**Acceptance Criteria:**
- [ ] The speech bubble shows a row of 5 fixed emoji buttons: 😂 ❤️ 🔥 👏 🐂 (the `REACTION_EMOJIS` array)
- [ ] Each button displays the emoji and its aggregate count (number of unique users who reacted with it)
- [ ] Emojis with zero reactions show a count of `0`
- [ ] Counts update in real time when Firestore data changes (via the existing `subscribeToTobus` listener)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

### US-004: Toggle emoji reaction (authenticated users)
**Description:** As a section member who has selected my name, I want to tap an emoji to add or remove my reaction so I can express how I feel about the moment.

**Acceptance Criteria:**
- [ ] Tapping an emoji adds the user's `userName` to `reactions[emoji]` in Firestore
- [ ] Tapping the same emoji again removes the user's name (toggle off)
- [ ] Tapping a different emoji removes the previous one and adds the new one (one active reaction per user per Tobu)
- [ ] The currently active emoji button is visually highlighted (`.is-active` class)
- [ ] Reaction buttons are disabled while a Firestore write is in-flight (`isUpdatingReaction`)
- [ ] If the user has not selected a roster name (`userName === null`), reaction buttons are disabled or show a tooltip prompting identity selection
- [ ] When Firebase is not configured or has errored, reactions apply locally via `applyLocalReaction`
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

### US-005: Position and style the speech bubble for mobile
**Description:** As a mobile user, I want the speech bubble to be readable and easy to interact with on a small screen.

**Acceptance Criteria:**
- [ ] The speech bubble renders as an HTML overlay above the 3D canvas (not a `drei` `<Html>` attached to the bull's 3D position)
- [ ] The bubble is centered on the screen with a semi-transparent backdrop
- [ ] The bubble content area fits within the viewport on a 375px-wide screen (mobile portrait)
- [ ] Text is legible: winner name as a heading, quote in readable font size
- [ ] The reaction button row does not overflow horizontally on mobile
- [ ] Touch targets for emoji buttons are at least 44×44px
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

## Functional Requirements

- FR-1: When a bull instance is tapped (click/touch on `InstancedMesh`), call `playMoo()` and `selectTobu(tobu.id)` — already implemented in `BullHerd.tsx:84-89`
- FR-2: If the tapped bull's `id` equals the current `selectedTobuId`, set `selectedTobuId` to `null` (toggle dismiss)
- FR-3: Render the speech bubble overlay when `selectedTobuId` is non-null and a matching `Tobu` entry exists in the store
- FR-4: The speech bubble displays: winner name (heading), story/quote (paragraph text), and a reaction row
- FR-5: The reaction row contains exactly 5 buttons for the emojis defined in `ReactionEmoji`: `😂`, `❤️`, `🔥`, `👏`, `🐂`
- FR-6: Each reaction button shows the emoji and the count of unique users in `reactions[emoji]` (length of the string array)
- FR-7: Tapping a reaction button calls `handleReaction(emoji)` which updates `reactions` in Firestore via `updateTobu`
- FR-8: A user can have at most one active reaction per Tobu entry — toggling a new emoji removes the previous one
- FR-9: Reaction buttons require `userName !== null`; if no identity is set, disable the buttons
- FR-10: Clicking the backdrop overlay or the close button sets `selectedTobuId` to `null`

## Non-Goals

- No animation or transition effects on bubble appear/dismiss (instant pop-in per user choice)
- No photo display in the speech bubble (only name, quote, reactions)
- No date or term number shown in the bubble
- No comment threading or text replies
- No `@react-three/drei` `<Html>` component for positioning — the bubble is a screen-space overlay
- No haptic feedback
- No free-form emoji picker — only the 5 fixed emojis

## Design Considerations

- The speech bubble is currently implemented as a `div.speech-bubble` overlay in `App.tsx` (lines 164–193) with styles in `App.css`
- Keep the existing overlay approach (HTML above canvas) rather than migrating to `drei`'s `<Html>` — simpler, better mobile support, no 3D projection issues
- The `.speech-bubble` backdrop should use the Barcelona color palette for accents (red `#D50032`, yellow `#FFCD00`, blue `#004D98`)
- The `.is-active` reaction button style should clearly indicate the user's current reaction (e.g., highlighted border or background)
- Touch targets: emoji buttons should be at minimum 44×44px per Apple HIG / Android guidelines

## Technical Considerations

- **Data model:** `Tobu.reactions` is `Record<string, string[]>` — keys are emoji strings, values are arrays of `userName` strings. This is already defined in `src/types/index.ts`
- **Firestore writes:** Use the existing `updateTobu(id, { reactions })` function in `src/firebase/tobus.ts`. Reaction toggle logic already exists in `App.tsx` (`handleReaction` and `applyLocalReaction`)
- **Toggle behavior in BullHerd:** The `onClick` handler in `BullHerd.tsx:84-89` currently always calls `selectTobu(id)`. To support toggle-dismiss (tapping same bull closes bubble), check if the tapped bull's ID matches `selectedTobuId` and call `selectTobu(null)` if so
- **Zustand store:** `selectedTobuId` and `selectTobu` already exist in `useFarmStore`
- **InstancedMesh click detection:** Already working via `e.instanceId` in `BullHerd.tsx`
- **Real-time updates:** `subscribeToTobus` already provides live Firestore updates that flow into the store

## Success Metrics

- Tapping a bull and seeing the speech bubble takes <100ms (perceived instant)
- Emoji reactions are used on >70% of Tobu entries (per PRD success metric)
- The interaction works smoothly on a mid-range phone in portrait orientation
- No regressions to farm scene frame rate when a speech bubble is open

## Open Questions

- Should we debounce rapid reaction taps to avoid excessive Firestore writes?
- Should the bubble show a subtle indicator of which bull is selected (e.g., a highlight ring around the bull in the 3D scene)?
