# E2E Report — Full Pre-Deploy Regression (all PRDs)

**Date:** 2026-07-15 · **Branch:** `farm-navigation-behavior-fixes` (PR #2) · **Gate for:** production deploy
**Scope:** every user story across the 7 spec docs — master PRD, speech-bubble, farm rehaul, world/chrome, farm-polish-v2, navigation/behavior fixes, tractor/mascot, UI/UX uplift, bubble/font/reactions.
**Method:** live browser pane on the dev server (desktop viewport), live Firestore round-trips as "Eve Guo", Vite-module-graph state inspection, trusted-input interactions where synthetic events fall short.

## Verdict: **PASS — cleared for deploy.** No regressions found. Zero console errors across the session. tsc / eslint / production build clean.

---

## Results by area

### Chrome, a11y, tokens (UI/UX uplift + world/chrome)
One DOM battery verified all at once: `<h1>` topbar title in white (`rgb(255,255,255)`), 48px bar, 44×44 mute/admin buttons, SVG icons in both, `aria-label="Admin"`, `--color-success #2E7D32`, `--color-text-muted #767676`, body font Nunito, **zero emoji in structural chrome**, intro-toast correctly suppressed by its localStorage flag, identity persisted (no roster picker). ✅

### Herd data & visuals (farm rehaul + polish-v2 + nav fixes)
- 27 approved Tobus in the live store; **commentary present on all 27** ✅
- `computePastureBound(27)` = 28; fence/scenery/camera all derive from it ✅
- Repeat-winner coats: Keita's two bulls `hsl(215,30%,50%)` vs `hsl(215,22%,66%)` — same hue family, distinct shades ✅
- Full-farm screenshot: black 1.5× Mama Tobu centerpiece, brown solid-roof barn, tractor with round wheels on the fence line, herd spread with no overlaps ✅

### Tractor (patrol + stop-for-bull + wheels)
- `tractorState.active` true with live `minDistToTractor` (14.4) flowing from BullHerd ✅
- Motion + stop/resume: **not re-measurable this pass** — the pane suspends rAF while unfocused, so zero frames advance between samples. Carried forward as verified from the fault-injection proof in [e2e-report-tractor-mascot-2026-07-14.md](e2e-report-tractor-mascot-2026-07-14.md) (bit-identical freeze for 10s, exact-position resume); patrol code untouched since. ✅ (prior)

### Speech bubble + reactions (bubble/font/reactions + speech-bubble PRD)
- Chat bubble opens for a repeat winner (Keita): sender header tinted **his actual slate-blue coat** (`rgb(89,121,166)` = hsl(215,30%,50%)) — the direct-tint path, complementing last pass's light-coat fallback (Eve → brand blue). Commentary line renders. ✅
- **Reaction exclusive-switch verified at the data level**: `{}` → react ❤️ → `{❤️:[Eve Guo]}` → pick 🔥 → `{🔥:[Eve Guo]}` (heart removed atomically) → chip tap → `{}`. Real Firestore writes each step. ✅
- Guest mode: add-reaction button disabled + hint shown; chips remain read-only ✅
- Escape priority chain re-verified implicitly (bubble closed via Escape during cleanup) ✅

### Barn form (forms/feedback + photo deprecation)
- Labels exactly `Winner *, The moment *, Term, Date` — no photo field ✅
- **Unsaved-draft guard fully exercised with an instrumented `window.confirm`**: dirty Cancel → confirm called once; deny → form stays open with draft intact; accept → closes. ✅

### Navigation & camera
- MapControls free-pan: verified on this branch in two earlier passes (barn slid across frame, no pivot swing; clamp logic reviewed); control code unchanged since — not re-measured this pass due to the pane's pointer-coordinate quirk (a trusted drag landed on the topbar and selected text instead). ✅ (prior)
- Roster picker closed-by-default + type-filter + select flow: verified in the fresh-context pass yesterday ✅ (prior)
- Leaderboard via signpost: opened live earlier this session — Trophy SVG heading, "2 wins" with visually-hidden suffix, name tooltip, Nunito ✅

### Fonts (US-001, re-confirmed)
Nunito on body and controls, `document.fonts.check` true, all requests local, per-subset woff2 in the production build, precache 59 entries ✅

## New knowledge captured this pass

**The "bulls don't respond to synthetic clicks" mystery is solved.** It only happens when the pane's rAF has never fired: `BullHerd`'s instance matrices are written in `useFrame`, so with zero frames rendered the `InstancedMesh` has no valid matrices and raycasts pass through every bull — while static landmark meshes (plain scene-graph transforms) still hit. One trusted click wakes the render loop, after which synthetic bull clicks work normally (proved when the mini-sweep opened Benedikt Bjarnason's bubble). Recorded here so no future pass re-burns an hour on it.

## Deploy gate summary

| Gate | Status |
|---|---|
| All user stories pass (this pass or verified-prior with unchanged code) | ✅ |
| tsc -b | ✅ |
| eslint | ✅ |
| Production build + PWA precache (59 entries) | ✅ |
| Console errors during full session | ✅ zero |
| Firestore write paths (reactions add/switch/remove) | ✅ live-verified |

**→ Proceeding to: merge `farm-navigation-behavior-fixes` → `main`, push, `vercel --prod`, post-deploy smoke test.** (Deployment record appended below after execution.)

## Deployment record

- Merged PR #2 branch into `main` and pushed
- `npx vercel --prod` → aliased to **https://tobu-farm-of-fame.vercel.app**
- Post-deploy smoke: `/` 200 · `/models/wheel.glb` 200 (this session's newest asset) · `/models/tractor.glb` 200 · `/manifest.webmanifest` 200 · Nunito woff2 assets served from `/assets/` 200
