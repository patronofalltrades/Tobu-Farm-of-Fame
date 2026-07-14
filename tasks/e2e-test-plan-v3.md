# E2E Test Plan v3 — Full User Story Sweep

**Scope:** every P0/MVP acceptance criterion across all 5 specs, plus this session's unspecced additions (tractor, bull collision separation, barn recolor). This is a regression + new-feature sweep — the last full pass (`e2e-report-2026-07-12.md`) predates the entire `farm-polish-v2` PRD, the tractor, and collision handling.

**Method:** browser automation against the running dev server (`preview_*` tools), mobile viewport (375×812) as primary, desktop as secondary for token/spacing checks. No real physical device in this pass — that gap is tracked separately as task #8 and explicitly out of scope here (same limitation as every prior E2E pass on this project).

**Audit finding:** no outstanding P0/MVP user stories — full audit against current code found every acceptance criterion across the 5 PRDs implemented. This plan exists to *verify* that claim end-to-end against the live build, not to close implementation gaps.

---

## Group A — Master PRD MVP checklist (`docs/tobu_wall_of_fame_prd.md` §9.1)

| ID | Story | Steps | Expected |
|----|-------|-------|----------|
| A1 | 3D farm scene, touch-friendly camera | Load app; drag to orbit; pinch/scroll to zoom | Scene renders; orbit/zoom respond within `minDistance=6`/`maxDistance` (now dynamic) bounds |
| A2 | Pre-populated bulls (Term 1–3) | Load app; count visible bulls; check leaderboard total | 27 approved Tobus render as 27 bulls |
| A3 | Tap → speech bubble (name, story, reactions) | Tap any bull | Bubble shows winner name, story, 5 reaction buttons |
| A4 | Barn → submission form → approval queue | Tap barn; fill form; submit; open admin panel | Entry appears in barn form flow; pending queue shows it after PIN unlock |
| A5 | Signpost → leaderboard | Tap signpost | Ranked list of winners by win count, with coat swatches |
| A6 | Roster identity on first visit | Clear `localStorage`; reload | Roster picker (now dropdown) appears; selecting a name persists identity |
| A7 | Ambient audio + moo on tap | Unmute; tap a bull | `playMoo()` fires (audio verified via prior manual pass — not re-verified acoustically here) |
| A8 | Unique bull color/pattern per winner | Compare bulls for different winners; compare a repeat winner's two bulls | Distinct winners look different; repeat winner's bulls share hue family but differ in shade (P0-6) |
| A9 | PWA installable | Check manifest + service worker registration | `manifest.webmanifest` resolves; SW registers |

## Group B — Speech Bubble Tap Interaction (`prd-speech-bubble-tap-interaction.md`)

| ID | Story | Steps | Expected |
|----|-------|-------|----------|
| B1 (US-001) | Show bubble on tap | Tap a bull | Bubble appears instantly with name + story; only one bubble visible at a time |
| B2 (US-002) | Dismiss bubble | Tap same bull again; tap backdrop; tap Close button; tap a different bull | Each dismisses/replaces correctly; `selectedTobuId` returns to `null` |
| B3 (US-003) | Reaction counts | Open a bubble with existing reactions | 5 emoji buttons render with correct counts, including 0 |
| B4 (US-004) | Toggle reaction (identified user) | Select a roster name; tap an emoji; tap again; tap a different emoji | Adds/removes/swaps reaction; `.is-active` highlights correctly; buttons disable mid-write |
| B5 (US-004b) | Reaction gating (guest) | Skip identity (guest mode); open a bubble | Reaction buttons disabled; hint text shown |
| B6 (US-005) | Mobile bubble sizing | Open bubble at 375×812 | Fits viewport; reaction row doesn't overflow; touch targets ≥44×44px |

## Group C — Farm Visual Rehaul (`prd-farm-visual-rehaul.md`)

| ID | Story | Steps | Expected |
|----|-------|-------|----------|
| C1 (US-001) | Real bull model | Inspect rendered bull geometry | Bull-shaped, not a box |
| C2 (US-002) | Real landmark models + tractor | Inspect barn/signpost/mascot/fence/tractor | All real low-poly GLBs; tractor present near barn |
| C3 (US-003) | Autonomous wander, in-bounds | Observe bulls for 30s | Bulls walk, turn to face travel, stay within fence |
| C3b (NEW) | Bulls don't overlap | Observe herd for 30–60s, multiple regions | No two bulls visibly interpenetrate at any point |
| C4 (US-004, superseded by P0-6) | Distinct per-winner appearance | Compare Guglielmo's 2 bulls, Kunal's 2, Akshat's 2, Lewis's 2, Stephanie's 2, Keita's 2, Thomas's 2 | Each pair: same hue family, different shade — not identical, not unrelated |
| C5 (US-005) | Perf budget | Sample frame time over ~10s at current 27-bull count (with new O(n²) separation pass) | Comfortably above 30fps floor; ideally near 60fps |
| C6 (US-006) | PWA precache includes new assets | Check `workbox.globPatterns` coverage / build output | `tractor.glb` and all other new assets precached (glob pattern, not enumerated — verify pattern still matches) |

## Group D — World & Chrome Polish (`prd-world-and-chrome-polish.md`)

| ID | Story | Steps | Expected |
|----|-------|-------|----------|
| D1 (US-001) | No horizon band | Orbit/zoom through full camera range | No gray HDRI band visible at any angle |
| D2 (US-002) | Ground texture variation | Inspect ground at default and close-up camera | Patchy two-tone green, not flat hue |
| D3 (US-003) | Scenery scattered, non-blocking | Check trees/bushes/rocks outside pasture | Visible, don't block landmark taps or wander bounds |
| D4 (US-004) | Slim top bar | Inspect `.topbar` height at 375×812 | ≤56px, ≤~7% of viewport |
| D5 (US-005) | Intro toast once-per-session | Clear `tobu_intro_seen`; reload; wait/dismiss; reload again | Shows once, dismisses, doesn't reappear |

## Group E — Farm Polish v2 (`prd-farm-polish-v2.md`)

| ID | Story | Steps | Expected |
|----|-------|-------|----------|
| E1 (P0-1) | Pasture auto-scales | Check fence bound at current 27-bull count | Bound computed from `computePastureBound(27)`, fence/scenery/camera all consistent, no seam |
| E2 (P0-2) | Barn detail + correct colors | Inspect barn model | Brown body, solid dark roof (no hollow gaps), eave overhang, siding lines, gable window, chimney |
| E3 (P0-3) | Design tokens | Inspect `.speech-content`, `.roster-card`, `.barn-form`, admin panel, leaderboard for radius/shadow/spacing consistency | All draw from the same token scale |
| E4 (P0-4) | Roster searchable dropdown | Tap roster input; type a partial name; use arrow keys; tap outside | Closed by default, opens on focus, filters live, keyboard-navigable, closes on outside tap |
| E5 (P0-5) | Commentary in bubble | Open several bubbles across all 3 terms | `commentary` renders as smaller italic line under story where present |
| E6 (P0-6) | Repeat-winner shading | Same as C4 | Confirmed via coat inspection |
| E7 (P0-7) | Full 27-entry roster live | Check leaderboard total, terms represented | 13 Term 1 + 14 Term 2/3 = 27; disputed Igor week absent |

## Group F — This Session's Unspecced Additions

| ID | Change | Steps | Expected |
|----|--------|-------|----------|
| F1 | Tractor doesn't block wander | Observe bull paths near tractor position (-11.5, -8.5) | Bulls route around it, same as other landmark exclusions |
| F2 | Story/commentary realignment | Open bubbles for Eve Guo, Benny, Sydney, Joan, Pablo, Katrina, Alex Jones-Kuo, Guglielmo (2nd win) | Story text matches the corrected quotes from `docs/tobu-winners-full-list.md`, not the old buried-in-commentary versions |

---

## Out of Scope for This Pass

- Real physical iOS/Android device testing (task #8 — tracked separately, no device available in this environment)
- Acoustic verification of moo/ambient audio (requires human ears; last manually confirmed in a prior session)
- Production Vercel deployment smoke test (current production is several commits behind local `main` — separate deploy step, not this QA pass)
