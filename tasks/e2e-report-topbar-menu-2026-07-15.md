# E2E Report — Top-Right Menu Consolidation + Bottom Bar Removal

**Date:** 2026-07-15 · **Branch:** `topbar-menu` · **Scope:** prd-topbar-menu-consolidation US-001–004
**Method:** live browser pane on the dev server, module-graph state driving, offset-patched raycast PointerEvents, ref + JS-driven menu interactions.

## Verdict: **PASS** — all four user stories verified live. tsc / eslint / build clean. Zero console errors.

---

## US-001 — Menu button + dropdown

| Check | Result |
|---|---|
| Kebab (`MoreVertical`) trigger at far top-right, matching mute-icon sizing | ✅ screenshot |
| Tap opens a dropdown anchored under the trigger; icon + label items | ✅ |
| ARIA: trigger `aria-haspopup="menu"` + `aria-expanded` toggles; panel `role="menu"`; items `role="menuitem"`; `role="separator"` present | ✅ |
| Items ≥44px tall (all 4 measured at 44) | ✅ |
| Closes on select, outside-tap (pointerdown on title), Escape, and re-tapping trigger | ✅ all four |
| Panel stays within viewport (desktop + mobile) | ✅ |
| Reduced-motion gate on the open animation | ✅ code-verified |

## US-002 — Actions + admin in the menu

| Check | Result |
|---|---|
| **Submit a Tobu** → BarnSubmit opens; menu closes on select | ✅ |
| **Wall of Fame** → Leaderboard opens; menu closes | ✅ |
| **Tobu?** → mascot bubble opens | ✅ |
| **Admin** (not admin) → PIN gate opens | ✅ |
| When `isAdmin`: menu shows **Pending queue** + **Log out of admin** (5 items); item label switches Admin→Pending queue | ✅ `["Submit a Tobu","Wall of Fame","Tobu?","Pending queue","Log out of admin"]` |
| Pending queue → admin panel opens | ✅ |
| Log out of admin → `isAdmin` false (replaces the old right-click-demote gesture) | ✅ |
| Standalone admin wrench removed from top bar | ✅ (`adminTriggerGone: true`) |

## US-003 — Bottom bar removed + space reclaimed

| Check | Result |
|---|---|
| `BottomBar` component + import + render removed; `.bottombar` CSS deleted; no stray references | ✅ |
| `.canvas-wrap` bottom padding reduced to safe-area only (`padding-bottom: 0px` on desktop) | ✅ |
| Canvas extends to the viewport bottom: desktop `canvasBottom 720 / vh 720`; mobile `812 / 812` | ✅ |
| Intro-toast offset reverted from the old `56px+` to a bottom-edge position | ✅ code-verified |

## US-004 — Regression guards

| Check | Result |
|---|---|
| Mute stays a one-tap top-bar icon, immediately left of the menu | ✅ (topbar buttons: `["Mute","Menu"]`) |
| Mute one-tap: playing→muted→playing across two taps | ✅ (`oneTapWorks: true`) |
| 3D landmark tap still opens its panel (signpost raycast → Leaderboard) | ✅ (`leaderboard@0.73,0.34`) |
| Data-source warning icon logic unchanged (still a top-bar status `<span>`, not moved into the menu) | ✅ code-verified |

## Mobile (375×812)

- Menu opens right-aligned, **no horizontal overflow**, right edge 363 < 375 ✅
- Canvas fills the full 812px height (no bottom strip) ✅ screenshot

## Gates

| Gate | Status |
|---|---|
| tsc -b | ✅ |
| eslint --max-warnings=0 | ✅ |
| npm run build (62 precache entries) | ✅ |
| Console errors | ✅ zero ("No console logs") |

## Notes

- The one JS error during testing was a self-inflicted toggle race (a `.top-menu-trigger` click closed an already-open menu before measuring) — re-measured cleanly, menu confirmed open and within-viewport. Not an app bug.
- The kebab-vs-hamburger open question resolved to **kebab** (`MoreVertical`) — reads as "more actions", not site nav.
- No behavior change to any panel; only their entry points moved from the bottom bar / wrench into the one menu.
