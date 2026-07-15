# PRD: Tobu Load Screen + Ambient Entry

## Introduction

Today the app mounts and the 3D farm simply pops in — there's a beat where the canvas is blank/half-built while Firestore data and the GLB models load, and no audio ever starts on its own (the farm boots muted). This adds a **branded loading screen** shown from the moment the link opens until the farm is fully ready, and starts the **real ambient soundscape** the instant the visitor enters.

The loading screen uses the owner's **Tobu's Farm of Fame logo** as its centerpiece. Because browsers (especially iOS Safari) block audio until a user gesture, the loader ends with a **"Enter the farm" tap** — that single tap both reveals the ready-and-waiting farm and unlocks/starts the ambience, so sound plays reliably on mobile.

Locked decisions (from clarification):
- **Dismiss when the farm is fully ready** — 3D models loaded + first frame rendered, with a short minimum display so the logo always registers (no blank-canvas flash).
- **Tap-to-enter** — the CTA tap is the audio-unlock gesture.
- **Arrive with sound on** — entry unmutes and plays the ambience; the mute button still works.

The attached ambience (`ElevenLabs_Ambient_farm_sounds_at_sunset…mp3`, 30s / 472KB stereo) is a real, loopable track that **replaces the placeholder `ambient.wav`** and fulfills the ambient half of prd-reactions-colors-chrome-audio US-005.

## Goals

- A branded logo loading screen appears immediately on every cold load, before the farm is interactive
- The farm is only revealed once it's actually ready to look at (models loaded + first frame), so there's no blank/half-built canvas flash
- A single "Enter the farm" tap reveals the farm and starts the ambient soundscape reliably, including on iPhone
- The real ambient track loops as background audio from entry onward; the existing mute control still governs it
- The logo asset is web-optimized so it doesn't bloat the bundle or PWA precache
- No audio autoplays without the entry gesture (respectful + policy-compliant)

## User Stories

### US-001: Branded loading screen
**Description:** As a visitor opening the link, I want a polished branded screen while the farm loads, so the app feels intentional instead of showing a blank or half-built canvas.

**Acceptance Criteria:**
- [ ] A full-screen loading overlay renders immediately on mount, above the canvas, before the farm is ready
- [ ] The Tobu's Farm of Fame logo is the centerpiece, on a designed background using the brand palette (parchment/cream to match the logo, brand red/yellow accents)
- [ ] The screen shows clear loading feedback (e.g. animated progress or an animated motif), not a frozen image
- [ ] Layout is mobile-first / portrait-friendly, respects safe-area insets, and is centered at all viewport sizes
- [ ] Animations respect `prefers-reduced-motion`
- [ ] The overlay has appropriate a11y semantics (`role="status"` / `aria-live` while loading; the CTA is a real focusable button)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Reveal only when the farm is ready
**Description:** As a visitor, I want the farm to appear fully formed when the loader ends, so I never see it building itself.

**Acceptance Criteria:**
- [ ] The loader stays until: (a) the 3D assets (GLB models) have loaded, (b) the first frame has rendered, and (c) the Tobu list has arrived (or the demo-data fallback has applied)
- [ ] A short minimum display time (~1s) guarantees the logo is seen even on fast connections
- [ ] A safety timeout (e.g. ~10s) lets the visitor enter anyway if an asset stalls, so the loader never hangs forever
- [ ] When ready, the passive loading indicator is replaced by the active "Enter the farm" CTA
- [ ] Behind the (still-visible) loader, the farm is already rendered, so entry reveals it with no post-tap loading delay
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Tap to enter → ambience starts
**Description:** As a visitor, I want tapping "Enter the farm" to drop me into the farm with the ambient sound playing, so it feels alive from the first moment.

**Acceptance Criteria:**
- [ ] The CTA is disabled/inactive until the farm is ready, then becomes tappable
- [ ] Tapping it: dismisses the loader (with a brief fade, motion-gated), unlocks audio, sets sound on (unmuted), and starts the ambient loop
- [ ] The ambience is audible within a moment of the tap on desktop **and** iOS Safari
- [ ] The mute button reflects the now-on state and still toggles the ambience off/on afterward
- [ ] The entry gesture is keyboard-accessible (Enter/Space on the focused CTA works, and also unlocks audio)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Real ambient asset shipped
**Description:** As the maintainer, I want the real ambient track bundled and licensed, so it works offline and nothing questionable ships.

**Acceptance Criteria:**
- [ ] The attached ambient MP3 ships in `public/audio/` under a stable name and **replaces** the placeholder `ambient.wav` in the played path
- [ ] The ambient Howl loops the real track at a comfortable background level
- [ ] The optimized splash logo and the ambient MP3 are included in the PWA precache (offline entry works)
- [ ] A credits file records the ambient track's provenance/license (owner-generated via ElevenLabs)
- [ ] Production build succeeds; precache manifest includes the new assets and no longer requires `ambient.wav`
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Render a full-screen loading overlay from first mount, layered above the `Canvas`, dismissed by app state (not by a route change).
- FR-2: Track readiness from three signals — 3D asset load progress (drei `useProgress`), first-frame render (Canvas `onCreated` / first `useFrame`), and Tobu data arrival — plus a minimum-display timer and a max-timeout fallback.
- FR-3: While not ready, show passive loading feedback; when ready, enable the "Enter the farm" CTA.
- FR-4: On CTA activation, in order: call `unlockAudio()`, set `isMuted = false`, start the ambient loop, then fade out and unmount the overlay.
- FR-5: Replace the ambient source with the attached MP3 (looped) in `useFarmAudio.ts`; keep `setAmbientMuted` / `syncAmbientPlayback` semantics intact so the mute button still governs it.
- FR-6: Optimize the logo to a compact web asset (~512px, WebP/PNG) for the splash; keep the full-res source PNG out of the precache.
- FR-7: Add the splash logo + ambient MP3 to the PWA precache globs; drop the placeholder `ambient.wav` from the played path and precache.
- FR-8: Record ambient provenance/license in `public/audio/CREDITS.md`.

## Non-Goals

- **Not a tutorial/onboarding** — the existing IntroToast still handles first-visit tips; the loader is a load gate + entry, not a lesson.
- **Not a first-visit-only screen** — the loader shows on every cold load until ready (it gates asset readiness, not a "seen once" flag). It should feel quick when cached.
- **No video/animated-splash asset** — the screen is built from the logo + CSS/SVG motion, not a video file.
- **No change to the moo SFX** — bull-tap sounds are a separate PRD (prd-random-moo-sounds).
- **No per-channel volume UI** — still the single mute toggle.
- **No blocking on Firebase errors** — if live data fails, the existing demo-data fallback applies and the visitor can still enter.

## Design Considerations

- **Visual direction:** parchment/cream field matching the logo's background, logo centered, wordmark legible; a subtle, warm "sunset" feel to tie into the ambient track. Loading feedback should be low-key and on-brand (e.g. a slim progress bar in brand red/yellow, or a gently animated motif) rather than a generic spinner. The ready-state CTA ("Enter the farm") should be obviously tappable with a ≥44px target and a clear focus ring.
- **Perceived pace:** the ~1s minimum keeps the logo from flashing by on fast loads; the fade-out on entry (motion-gated) makes the reveal feel deliberate.
- **Respectful audio:** requiring the entry tap means sound never ambushes a visitor, satisfies autoplay policy, and gives a natural place to unlock — one interaction that does double duty.
- **Reduced motion:** all loader/reveal animation gated behind `prefers-reduced-motion: no-preference`; the static screen + instant reveal must fully work without motion.

## Technical Considerations

- **Boot flow:** `main.tsx` → `App`. The overlay lives in `App` (or a small `LoadScreen` component it renders), sitting above `.canvas-wrap`, controlled by a `hasEntered` / `isReady` state pair. The `Farm` `Canvas` mounts underneath immediately so assets load *while* the splash is shown.
- **Readiness:** drei's `useProgress` exposes asset load state for the GLB models; `Canvas onCreated` (or a one-shot `useFrame`) confirms the first render. Combine with the store's `tobus.length > 0 || demoFallbackApplied`. A `useEffect` timer enforces the min-display and max-timeout.
- **Audio:** `useFarmAudio.ts` already centralizes `unlockAudio()` + ambient control; the entry handler calls those. Swap the ambient `src` to the new MP3 (Howler decodes MP3 on all targets incl. iOS). The store's initial `isMuted` can stay `true`; entry sets it `false` — so a visitor who never taps Enter never gets surprise audio, and the mute button stays truthful.
- **Assets / size:** the source logos are ~950KB @1254². The splash needs a compact copy (target well under ~150KB) so the precache stays lean; the ambient MP3 (472KB) is acceptable but should be confirmed against the offline-bundle budget alongside the moo clips.
- **Interaction with other PRDs:** this delivers the real **ambient** asset + autostart (supersedes the ambient portion of prd-reactions-colors-chrome-audio US-005). The moo-SFX PRD is independent.

## Success Metrics

- Branded logo splash visible on every cold load; farm revealed only when ready, with zero blank/half-built-canvas flash (verified in dev-browser)
- Ambience audibly playing within a moment of tapping "Enter the farm" on both desktop and iOS Safari
- Mute button still silences/restores the ambience after entry; no audio before the entry gesture
- Production build succeeds; precache includes the optimized logo + ambient MP3; no console errors

## Open Questions

- **Which source file** is the intended splash logo (`tobus-farm-of-fame-logo.png` vs `-v2` vs `-v3`)? Assumed the attached/most-recent; confirmed at implementation by matching the attached image.
- Should the "Enter the farm" copy be exactly that, or something more on-brand (e.g. "Enter the herd", "Open the gate")? Assumed "Enter the farm" for now.
- Should entry state persist for the session (skip the tap on client-side re-renders) or always require the tap on a fresh document load? Assumed: fresh load always shows the loader; no cross-navigation memory needed for a single-page app.
