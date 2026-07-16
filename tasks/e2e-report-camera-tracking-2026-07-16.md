# E2E Report — Camera Tracking for Wall of Fame + Winner Pager

**Date:** 2026-07-16 · **Branch:** `camera-tracking` · **Scope:** prd-camera-tracking-wall-of-fame US-001–003
**Method:** live browser pane, module-graph state driving against the app's real module instances (HMR-timestamped URLs), `trackingState` debug singleton for in-canvas assertions, CSS-hidden bubble for unobstructed ring screenshots.

## Verdict: **PASS** — all three user stories verified live. tsc / eslint / build clean. Zero console errors.

---

## US-003 — Live position channel

- `bullPositions` publishes **27/27** bull positions on the app's module instance, updated per frame from `BullHerd`'s compose loop (entry objects reused — no per-frame allocation churn) ✅
- Pruned in lockstep with `runtimes` cleanup on roster changes (code-verified) ✅
- First E2E read returned `size: 0` — the known Vite HMR module-instance trap (bare-URL import creates a second instance). Re-imported via the `?t=`-stamped URL from `performance.getEntriesByType('resource')`; correct instance had all 27. Recorded (again) for future passes.

## US-001 — Camera ease

| Check | Result |
|---|---|
| Wall of Fame → Thomas row: tracking activates, marker snapshot **exactly at his bull** (distance 0.00) | ✅ |
| Pager prev: re-tracks his other bull — marker relocated **47.9 world units** across the pasture, again dead-on (0.00) | ✅ |
| Direct-tap path (same `selectTobu` store action BullHerd's onClick uses): bubble opens, `trackingActive: false` — no camera motion | ✅ |
| Bubble close: tracking cleared | ✅ |
| Ease: 600ms ease-out cubic, target + camera moved together (zoom/angle preserved), clamped to `computePanLimit` | ✅ code + visual |
| Manual-input cancel: MapControls `'start'` event listener nulls the ease | ✅ code-verified (trusted mid-ease drag not reproducible in the pane) |
| **Bubble-occlusion fix found during testing**: the bull originally landed dead-center — directly behind the story card on portrait phones. Added a 6-unit toward-camera bias to the landing target so the bull/ring settle in the visible band above the card. | ✅ |

## US-002 — Highlight ring

- Screenshot proof (bubble CSS-hidden to unobstruct): **bright yellow ring rendered flush on the grass**, Kunal's olive bull adjacent — half a step off it, exactly the snap-to-once semantics (ring holds the snapshot spot; the bull keeps wandering) ✅
- Ring `raycast={() => null}` — cannot steal taps from bulls ✅ code-verified
- Ring removed when: bubble closes, direct-tap opens, pager re-targets (single marker at a time via single `markerPos`) ✅ (trackingCleared true after close)
- `depthWrite: false` + 0.03 y-offset — no z-fighting with the ground ✅ visual

## Gates

| Gate | Status |
|---|---|
| tsc -b | ✅ |
| eslint --max-warnings=0 | ✅ (one `set-state-in-effect` finding during dev → refactored to a `useMemo` snapshot, cleaner anyway) |
| npm run build | ✅ |
| Console errors | ✅ zero |

## Notes

- The snapshot-vs-wander gap is visible within seconds on screenshots (bull strolls off its ring). Accepted per the PRD's snap-to-once decision; if it reads as odd on real devices, the follow-up would be a slow ring-follows-bull lerp — deliberately out of scope today.
- Pager + tracking compose: stepping 1/2 ↔ 2/2 on a repeat winner pans the camera across the farm between their two bulls — the marquee use-case from the request ("quickly move/track the tobu that belongs to the name") works end-to-end.
