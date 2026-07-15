# PRD: Random Moo Sounds on Bull Tap

## Introduction

Tapping a bull currently plays a single procedurally-synthesized placeholder "moo" (`public/audio/moo.wav`, a two-tone beep). This replaces it with **three real cow-moo recordings** that play at random on each bull tap, so the herd feels alive and no two taps sound identical. Mama Tobu (the mascot) stays silent — she opens an info bubble, not a moo — which is already how the code is wired.

The three assets are provided by the owner:

| Asset | Duration | Character |
|---|---|---|
| `universfield-cow-moo-122255.mp3` | 2.19s | close-up moo |
| `koiroylers-cow-moo-fx-351940.mp3` | 3.08s | close-up moo (longer) |
| `ElevenLabs_Distant_mooing…pasture.mp3` | 1.04s | distant / quieter herd moo |

Locked decisions (from clarification): **no-immediate-repeat randomization** · **per-clip gain so all three sound equally loud** · **a new tap cuts off any moo still playing** (single voice at a time).

## Goals

- Every tap on a non-mascot bull plays one of three real moo recordings, chosen at random
- The same clip never plays twice in a row (no-immediate-repeat)
- All three clips are perceived at roughly equal loudness despite different source levels
- A new tap immediately stops any moo still playing, so only one moo is ever audible
- The existing mute toggle still governs the moos; nothing plays before the first user gesture (iOS unlock)
- No unlicensed audio ships; provenance recorded in a credits file

## User Stories

### US-001: Real moo on bull tap
**Description:** As a user, I want a real cow sound when I tap a bull, so the farm feels alive instead of playing a synthetic beep.

**Acceptance Criteria:**
- [ ] Tapping any herd bull plays one of the three real moo MP3s
- [ ] Tapping Mama Tobu plays **no** moo (unchanged — opens her info bubble)
- [ ] The placeholder `moo.wav` is no longer played
- [ ] Respects mute: no moo while muted; first tap still unlocks audio (iOS)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Randomized, non-repeating selection
**Description:** As a user tapping several bulls in a row, I want variety, so it doesn't feel like one canned sound.

**Acceptance Criteria:**
- [ ] Each tap selects a clip at random from the three
- [ ] The clip that just played is excluded from the next pick (never the same twice consecutively)
- [ ] Selection is in-memory only (no persistence); deterministic seeding is **not** required
- [ ] Typecheck/lint passes

### US-003: Balanced loudness + single-voice playback
**Description:** As a user, I want the moos to sound consistent and not pile up, so rapid tapping stays pleasant.

**Acceptance Criteria:**
- [ ] Each clip carries its own gain so the distant clip is boosted and the loud close-ups eased — the three sound roughly equally loud on tap
- [ ] Tapping a second bull while a moo is still playing stops the first moo before starting the new one (only one moo audible at any instant)
- [ ] Overall moo volume sits at or below the previous placeholder level (no startling jump)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill (playback wired; acoustic loudness balance is a manual check)

### US-004: Assets shipped + licensed
**Description:** As the maintainer, I want the audio bundled and its licensing recorded, so the PWA works offline and nothing legally questionable ships.

**Acceptance Criteria:**
- [ ] The three MP3s live in `public/audio/` under stable, normalized names
- [ ] They are included in the PWA precache so bull taps work offline
- [ ] A credits file records each file's source/provenance and license
- [ ] Production build succeeds; precache manifest includes the three MP3s
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: On a non-mascot bull tap, play a random one of three moo clips; exclude the previously-played clip from the draw.
- FR-2: Apply a per-clip volume multiplier so perceived loudness is balanced across the three.
- FR-3: Before starting a new moo, stop any currently-playing moo(s).
- FR-4: Mute state and the iOS first-gesture unlock continue to gate all moo playback exactly as today.
- FR-5: Ship the three MP3s in `public/audio/` and add them to the PWA precache globs.
- FR-6: Record provenance + license for all three in a credits file (e.g. `public/audio/CREDITS.md`).
- FR-7: Remove the now-unused placeholder `moo.wav` from the played path (and from precache) once the real clips are wired.

## Non-Goals

- **Background/ambient music** — the ambient placeholder (`ambient.wav`) is out of scope for this task; only the tap SFX changes. (Real ambient is a separate PRD, US-005 of prd-reactions-colors-chrome-audio.)
- **A distinct Mama Tobu sound** — she stays silent; adding a mascot voice is a future idea, not this.
- **Spatial / distance-based audio** — no positional panning or volume-by-camera-distance; a tap is a flat 2D sound.
- **Per-bull fixed voices** — the sound is random per tap, not a stable "this bull always sounds like X."
- **Overlapping herd chorus** — explicitly rejected in favor of cut-off single-voice playback.
- **New mute/volume UI** — the existing single mute toggle is unchanged.

## Design Considerations

- **Loudness balance is subjective** — the per-clip gains are a tuning pass done by ear during implementation; the distant ElevenLabs clip will likely need a boost and the two close-ups a slight cut. Starting point in the TRD, final numbers set during dev-browser verification.
- **Cut-off vs. overlap** — cut-off keeps rapid tapping clean and predictable; the tradeoff (no "herd answering each other" chorus) is accepted per the owner's choice.
- **Clip length** — the longest clip is ~3s; cut-off means a fast tapper will hear clips truncated, which is fine and expected.

## Technical Considerations

- The moo path is centralized in `src/audio/useFarmAudio.ts` (`playMoo()`), called once from `BullHerd.tsx`'s instanced-mesh `onClick`. This is the only wiring point — the mascot never calls it.
- Howler already supports MP3; per-clip volume and `stop()` are native Howl features, so this is a data/logic change inside `useFarmAudio.ts`, not a new dependency.
- `vite.config.ts` currently globs `audio/*.wav` for PWA assets — must be widened to include `mp3`.
- Provenance: `universfield` and `koiroylers` are Pixabay-style contributor handles (royalty-free, attribution-friendly); the ElevenLabs clip is owner-generated. All recorded in the credits file; the owner has confirmed the files are cleared for use by providing them.

## Success Metrics

- 3 distinct real moos audible across repeated taps; never the same clip twice in a row (verifiable by instrumenting the selection in dev-browser)
- No perceptible loudness jump between clips on consecutive taps (manual acoustic check)
- Only one moo audible at any instant even under rapid tapping
- Mascot tap remains silent; mute still silences everything; production build + precache include the three MP3s

## Open Questions

- Exact per-clip gain values — deferred to the implementation tuning pass (not blocking).
- Should the credits file be user-visible in-app (e.g. linked from the mascot bubble) or repo-only? Assumed repo-only for now.
