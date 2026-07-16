# E2E Report — Winner Navigation, Bubble Cleanup, Loading Copy, Topbar Gutter

**Date:** 2026-07-16 · **Branch:** `winner-nav-polish` · **Scope:** prd-winner-navigation-and-polish US-001–006 (per trd-winner-navigation-and-polish §9)
**Method:** live browser pane on the dev server, module-graph state driving, fresh-instance component mounting for the load screen, instrumented `window.confirm` for the regression guard.

## Verdict: **PASS** — all six user stories verified live. tsc / eslint / build clean. Zero console errors.

---

## US-001 — Mascot heading

- Menu "Tobu?" → bubble heading reads exactly **"Who is Tobu?"** ✅

## US-002 — Close buttons removed from read-only bubbles

| Bubble | Close buttons | Outside-tap | Escape |
|---|---|---|---|
| Who is Tobu? (mascot) | **0** | ✅ closes | (chain verified prior) |
| Wall of Fame | **0** | — | ✅ closes |
| Tobu story bubble | **0** | ✅ closes | — |

- Grep-verified: the only remaining "Close" matches in `App.tsx`/`Leaderboard.tsx` are `onClose` handler props, no visible buttons ✅
- **Regression guard**: BarnSubmit's Cancel still present; dirty draft → Cancel fires `window.confirm` exactly once; deny keeps the form open with draft intact; accept closes ✅ Admin PIN gate untouched (code-verified) ✅

## US-003 — Winner pager

Driven on Keita Suzuki (2 wins):

| Step | Pager | Prev | Next | Content |
|---|---|---|---|---|
| Open win 1 | **1 / 2** | disabled | enabled | "Let me protect the dignity of Japan…" |
| Tap next | **2 / 2** | enabled | disabled | "I think Alex S is wrong…" |
| Tap prev | **1 / 2** | disabled | enabled | back to win 1 |

- Bubble never closes/reopens — content swaps in place (sender, story, commentary, reactions all follow `selected`) ✅
- Single-win winner (Eve Guo): **no pager rendered** ✅
- `aria-label`s on both buttons ("Previous/Next win by {name}") ✅ code-verified

## US-004 — Tap a Wall of Fame name

- Clicked the **Thomas Grainger Reeves** row → leaderboard closed, story bubble opened ✅
- Opened his **most recent** win (date `2026-05-15` = expected max) with the pager at **2 / 2** ✅
- Rows are real `<button>`s (grid layout preserved, hover/focus states, whole row tappable) ✅

## US-005 — Loading subtitle stages

Verified through the **real component + real drei store** (fresh `LoadScreen` instance mounted with `ready=false`, `useProgress.setState` driven — the in-app instance's status branch is only visible for <1s on this cached dev machine):

| progress | Subtitle | Bar |
|---|---|---|
| 15% | "Rounding up the herd…" | 15% |
| 50% | "Brushing their coats…" | 50% |
| 85% | "Setting up the pasture…" | 85% |

- Subtitle and bar always agree (both pure functions of the same `progress`) ✅
- CTA replaces the status block when ready — unchanged behavior ✅

## US-006 — Topbar edge gutter

- Gutter (button edge → bar edge): **24px right / 24px left** at desktop **and** 375px — up from the old 12px, and clearing the PRD's ~20px metric ✅
- Note: first implementation used `--space-4` (16px) per the original TRD; measured 16px missed the PRD's ~20px success metric, so the gutter was bumped to `--space-5` (24px) and the TRD §7 updated to match. The safe-area inset (`env(safe-area-inset-right/left)`) is additive on top.
- Bar height unchanged (60px), vertical button inset unchanged (8px), no canvas layout shift ✅
- Mobile 375px: title clears the mute button by 77px; no horizontal overflow; the open Tobu bubble + pager fit within the viewport ✅

## Gates

| Gate | Status |
|---|---|
| tsc -b | ✅ |
| eslint --max-warnings=0 | ✅ |
| npm run build | ✅ |
| Console errors | ✅ zero ("No console logs") |

## Notes

- The load-screen status branch races the CTA on a warm dev machine (assets cached → ready in <1s, and after 10s the timeout locks the CTA on). Rather than fight timing, US-005 was verified by mounting a fresh `LoadScreen` (its own min/timeout clocks) and driving the shared `useProgress` zustand store — same component, same store, deterministic. Technique recorded for future loading-UI passes.
- `createRoot` lives under `.default` when importing `react-dom_client` from Vite's dep URLs — minor module-graph gotcha, noted.
