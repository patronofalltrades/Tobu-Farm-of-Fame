# E2E Report — "Tobus are not clickable" Investigation + Hotfix

**Date:** 2026-07-16 · **Branch:** `main` (hotfix) · **Trigger:** owner report from production: bulls not clickable; PRD features seemingly missing.

## Verdict: **root cause found, fixed, verified.** Mama Tobu's invisible tap hitbox had grown to 4.65×4.65×6.3 world units and was eclipsing raycasts to bulls across roughly a third of a portrait phone screen. Taps on visible bulls opened her "Who is Tobu?" bubble instead.

---

## Diagnosis trail

1. **Repro:** trusted click dead-center on a bull → no winner bubble. Instrumented `document`-level event probe confirmed the click hit the CANVAS at the right coordinates.
2. **Partial half-action:** one bull click fired a moo but opened the *mascot* bubble — first hint two objects were competing for the ray.
3. **Instrumented `selectTobu` + re-click:** `selectCalls: []` while the mascot bubble opened — her hitbox won the raycast outright; the bull handler never ran.
4. **Control:** far from her (fx .89), bulls open fine (Kunal Doshi). The dead zone was center-screen only — exactly where a portrait camera puts her.
5. **Source:** `Mascot.tsx` passed `hitboxSize={[3.1, 3.1, 4.2]}` *inside a group already scaled 1.5×* — the US-003 mascot scale-up double-applied (numbers bumped AND group-scaled): world box 4.65×4.65×6.3. Meanwhile the herd's mascot exclusion radius (2.6) let bulls wander *inside* that box, guaranteeing eclipse.
6. **Probe map (before fix):** 10/10 synthetic clicks across the center band (fy 0.26–0.52, fx 0.42–0.58) opened the mascot — including points well above her head, over visible pasture.

## Fix

- **`LandmarkModel.tsx`**: `hitboxSize` now accepts `null` — box omitted, the model's real meshes carry the raycast (the `Clone` already had `onClick`).
- **`Mascot.tsx`**: passes `hitboxSize={null}`. Rationale in-code: from the elevated camera, *any* box tall enough to cover her also shadows pasture behind her — a snug box (tested at local `[2.3,2.3,3.1]`) still ate fy 0.23–0.33. Pixel-perfect mesh raycast is the only honest shape, and she's the largest tap target on screen anyway.
- **`BullHerd.tsx`**: mascot wander-exclusion reverted to its original 2.6 (the 3.1 bump was hitbox-driven, now moot).
- Barn/signpost keep their default fattening boxes — they're at the pasture edge where eclipse doesn't matter.

## Verification (probe map, after fix)

| Probe | Before | After |
|---|---|---|
| fy 0.35–0.52 (her body) | mascot | **mascot** — still fully tappable |
| fy 0.30 / 0.26 center (above her horns) | mascot | **nothing** (grass — correct) |
| fx 0.42, fy 0.30 (pasture behind her) | mascot | **bull: Stephanie Felix Amaral** — bubble opened |

- tsc / eslint / production build ✅ · no console errors ✅

## On "some of our PRD list are not implemented"

Audited: **all shipped stories are present in the deployed production bundle** (string-verified earlier this session: "Who is Tobu?", `tobu-pager`, all three loading stages, menu, unique colors, audio). Two effects made features look missing:

1. **This bug** — with center-screen bulls unclickable, the winner bubble / pager / reaction popover never appeared, reading as "not implemented."
2. **PWA staleness** — the service worker (`registerType: autoUpdate`) serves the previous build on the *first* visit after a deploy and swaps to the new one on the next load. If the farm was opened right after a deploy (or from an installed home-screen PWA), it may have been the older bundle. A full close-and-reopen (or pull-to-refresh twice) picks up the new build.

## Carried forward

- Task #8 (real-device QA) remains the right place to confirm tap feel on an actual iPhone — especially bulls near the mascot and audio-on-entry.
- Pane technique note: trusted-click coordinates are **viewport-space**, not screenshot-pixel space, in this environment (screenshots render at 2×) — a document-level event probe (`clientX/clientY/target/isTrusted`) is the fastest way to catch mis-aimed test clicks.
