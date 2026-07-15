# PRD: Reaction Attribution, Unique Coat Colors, Chrome Polish, Real Audio

## Introduction

Four independent minor fixes, grounded in the current code:

1. **Reaction attribution** — the reaction data already stores *who* reacted (`reactions: Record<emoji, userName[]>`), but the UI only shows counts. Surface the names Slack-style.
2. **Unique per-winner coat colors** — `COAT_HUES` in `useBullColor.ts` has only **12 hues**, but the section has **20 distinct winners**. `bullCoatFromSeed` picks `COAT_HUES[hash % 12]`, so color collisions are mathematically guaranteed (confirmed pairs: Sydney Ontong/Keita Suzuki, Katrina Ocampo/Pedro Cruz Silvestre). Give every winner a distinct color, reflected in both the 3D herd and the leaderboard swatches.
3. **Top/bottom chrome** — polish the flat red topbar and add a discoverable bottom action bar (the barn/signpost/mascot actions are currently only reachable by tapping 3D landmarks).
4. **Real audio** — the current `moo.wav`/`ambient.wav` are procedurally-synthesized placeholder tones (a 220 Hz sine bed + a two-beep "moo"). Replace with real open-source (CC0) sound + music and a proper player.

Locked decisions: **full-spectrum guaranteed-unique colors** · **tap-a-chip → names popover** · **polish top bar + add bottom action bar** · **audio: I recommend CC0 sources with links/licenses, owner downloads the files, I wire the player.**

## Goals

- A viewer can see exactly who reacted with each emoji, tapping a reaction chip
- Every one of the 20 distinct winners has a visually distinct coat color, consistent between the herd and the leaderboard
- The top bar reads as intentionally designed (depth, divider), and core actions (Submit, Wall of Fame) are reachable from a labeled bottom bar, not only via 3D landmarks
- The farm plays real, pleasant cow SFX and ambient music, with the existing mute control still governing everything

## User Stories

### US-001: Show who reacted (Slack-style names popover)
**Description:** As a section member, I want to tap a reaction and see which people used it, so reactions feel social and accountable like Slack/WhatsApp.

**Acceptance Criteria:**
- [ ] Tapping a reaction chip opens a small popover listing the display names stored in `reactions[emoji]` for that Tobu (e.g. "❤️ · Eve Guo, Hanif Ramadhan")
- [ ] The popover closes on outside tap, Escape, or tapping the chip again; only one open at a time
- [ ] Because chip-tap is repurposed to "show names", **removing your own reaction now happens through the picker** (re-open the SmilePlus picker and tap your active emoji to toggle it off) — the picker already supports this; update the chip's `title`/aria to reflect the new behavior
- [ ] Your own name is emphasized in the list (e.g. "You") so it's clear you're included
- [ ] Names popover is keyboard-reachable and has `aria-label`; respects `prefers-reduced-motion`
- [ ] Guest viewers can still open the names popover (read-only); reacting stays gated as today
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Guaranteed-unique coat color per winner
**Description:** As a viewer, I want each winner's bull(s) to be a distinct color so I can tell people apart in the herd and on the leaderboard.

**Acceptance Criteria:**
- [ ] A new deterministic assignment maps each **distinct winner name** to a unique hue spread across the full color wheel (e.g. golden-angle distribution over the sorted distinct-winner list), so no two winners share a base color
- [ ] Repeat winners keep one shared base color across their bulls, with the existing per-win shade/spot variation preserved (so a person's multiple bulls still read as "theirs")
- [ ] The 3D herd (`BullHerd`) and the leaderboard swatches (`Leaderboard`) use the **same** assignment so a winner's swatch matches their bull
- [ ] Previously-colliding pairs (Sydney Ontong/Keita Suzuki, Katrina Ocampo/Pedro Cruz Silvestre) now render clearly different colors — verified visually
- [ ] Assignment is deterministic across reloads for a fixed winner set (no `Math.random`)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Top bar polish
**Description:** As a user, I want the top bar to look designed, not like a flat colored strip.

**Acceptance Criteria:**
- [ ] Top bar gains visual depth: a subtle shadow/gradient and a crisp bottom divider (brand-accent line, e.g. yellow) separating it from the canvas
- [ ] Existing content (h1 title, mute, admin), 48px height, safe-area inset, and contrast (white title on red) are preserved
- [ ] No layout shift to the canvas below
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Bottom action bar
**Description:** As a first-time user, I want obvious buttons for the main actions so I don't have to discover that 3D landmarks are tappable.

**Acceptance Criteria:**
- [ ] A fixed bottom bar with labeled buttons + Lucide icons: **Submit a Tobu** (opens BarnSubmit) and **Wall of Fame** (opens Leaderboard); optionally a **Tobu?** info button (opens the mascot bubble)
- [ ] Buttons are ≥44px, have focus rings, and use the design tokens; bar respects `env(safe-area-inset-bottom)`
- [ ] The bar does not cover the 3D landmarks' own tap targets (both paths open the same overlays — no duplicated state, they call the same handlers already in `App.tsx`)
- [ ] Canvas height accounts for the bottom bar so nothing important sits behind it
- [ ] A reaction/other overlay opening still works with the bar present (z-index ordering correct)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Real audio assets + player
**Description:** As a user, I want real cow sounds and gentle background music instead of synthetic beeps.

**Acceptance Criteria:**
- [ ] `useFarmAudio` supports MP3/OGG assets (Howler already does; just change the `src` + precache glob to include `mp3`/`ogg`)
- [ ] A real ambient music/soundscape loop plays (respecting mute, default muted per current behavior) and a real "moo" SFX plays on bull tap
- [ ] Optional: a distinct SFX on new-bull "birth" (admin approval) if an asset is chosen for it
- [ ] All audio files are CC0 / public-domain or otherwise license-clear; an `ATTRIBUTIONS.md` (or `public/audio/CREDITS.md`) records each file's source + license
- [ ] The procedural `scripts/generate-audio.mjs` is either removed from the build chain or kept only as a fallback that no longer overwrites real files
- [ ] Mute button governs both ambient and SFX; no audio autoplays before first user gesture (iOS constraint — the existing `unlockAudio` gate stays)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill (confirm playback wired; acoustic check is manual)

## Functional Requirements

- FR-1: Render a names popover from `reactions[emoji]` on chip tap; repurpose chip tap away from toggle; keep removal via the picker
- FR-2: Add `assignWinnerColors(distinctSortedNames: string[]) → Map<name, BullCoat base>` (or similar) in `useBullColor.ts`; both `BullHerd` and `Leaderboard` consume it from the same live winner set
- FR-3: Preserve repeat-winner shade/spot variation on top of the new unique base
- FR-4: Style `.topbar` with shadow + accent divider; no height/contrast regression
- FR-5: New `BottomBar` component wired to the existing `setIsBarnOpen`/`setIsLeaderboardOpen`/`setIsMascotOpen` handlers; adjust `.canvas-wrap` sizing and safe-area
- FR-6: Extend `useFarmAudio` + `vite.config.ts` precache for real MP3/OGG; add credits file; stop the placeholder generator from clobbering real assets
- FR-7: No Firestore schema/rules changes (reactions shape unchanged; colors are client-derived)

## Non-Goals

- No change to the reaction emoji set or the `reactions` data shape (still `Record<emoji, userName[]>`)
- No per-user color customization — colors stay deterministic from identity
- No full audio mixing UI (volume sliders per channel) — just the existing single mute toggle
- No video/MP4 (the request said "MP4"; audio is MP3/OGG — clarified as an audio player, not video)
- No removal of the 3D landmark tap interactions — the bottom bar is additive, both open the same overlays
- No licensing risk: no audio ships unless it's CC0/public-domain with recorded attribution

## Design Considerations

- **Coat palette tradeoff:** full-spectrum unique colors mean some bulls will be non-natural (greens/blues/purples) — accepted per the owner's choice of "guaranteed unique" over "natural cowhide." Saturation/lightness should stay in a mid band so they still read as toy-farm, not neon.
- **Color-set dependency:** an assignment pass over the sorted winner list means adding a *new distinct winner* can shift others' hues. Acceptable for a mostly-historical roster (20 winners, a handful added per term). If stable-forever colors are later required, switch to a fixed name→hue table. Flagged as an open question.
- **Bottom bar vs. landmarks:** keep the bar minimal (2–3 buttons) so it doesn't fight the "the farm is the app" ethos — it's a discoverability aid, not the primary interface.
- **Audio tone:** ambient should be gentle/pastoral (light wind, distant birds, soft pad), loopable seamlessly; moo should be short and warm, not comedic-loud.

## Technical Considerations

- **Reactions already carry names** — `App.tsx` builds chips from `selected.reactions[emoji]` (a `string[]` of userNames); the popover is a pure read of that array. No new data.
- **Determinism for colors** — reuse `hashString`/golden-angle; both consumers must pass the identical `distinctSortedNames` (derive from the same `tobus` list, filtered to approved, deduped, sorted) so herd and leaderboard never disagree.
- **`bullColorFromSeed` (deprecated shim)** is what the leaderboard uses today — it must route through the new assignment, or the leaderboard will still show old colliding colors.
- **Audio sourcing (owner action):** the PRD implementation will include a shortlist of specific CC0 files (Freesound CC0 filter, Pixabay, OpenGameArt.org) with direct links + license lines; owner downloads to `public/audio/`; then wiring + credits. Claude will not download the binaries.
- **PWA precache size** — real MP3s are larger than the tiny placeholder WAVs; keep ambient under ~1–1.5 MB (compressed loop) to respect the offline-bundle budget.

## Success Metrics

- Zero coat-color collisions across the 20 winners (verified by rendering all swatches and checking distinctness)
- Tapping any reaction reveals its reactors in ≤1 tap
- Both primary actions reachable without touching the 3D scene
- Real audio plays on a real device with mute working; no unlicensed assets in the repo

## Open Questions

- Colors: accept set-dependent hue assignment (recompute when winners added), or invest in a permanent fixed name→color table now? (Defaulting to set-dependent.)
- Reaction removal UX: is "remove via re-opening the picker" discoverable enough, or should chips keep a small dedicated toggle affordance separate from the names trigger?
- Audio: one ambient track, or a couple that rotate? Birth SFX in scope now or later?
- Bottom bar: include the "Tobu?" mascot-info button, or just Submit + Wall of Fame?
