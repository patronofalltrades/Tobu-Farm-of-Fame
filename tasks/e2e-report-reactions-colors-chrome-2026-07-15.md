# E2E Report — Reaction Names, Unique Colors, Chrome, Firebase Data Fixes

**Date:** 2026-07-15 · **Branch:** `reactions-colors-chrome` · **Scope:** prd-reactions-colors-chrome-audio US-001–US-004 (US-005 audio deferred per request) + Firestore winner-data corrections
**Method:** live browser pane on the dev server, live Firestore round-trips as "Eve Guo", Vite-module-graph state driving, ref-based trusted clicks.

## Verdict: **PASS** — all four user stories + all three Firestore data fixes verified live. tsc / eslint / production build clean. No new console errors.

---

## US-001 — Reaction names popover (Slack-style)

| Check | Result |
|---|---|
| Chip tap opens names popover (`Hanif Ramadhan` listed for 😂) | ✅ |
| ARIA wiring: `aria-expanded`, `aria-controls=reaction-names-0`, popover `aria-label="People who reacted with 😂"` | ✅ |
| Own reaction shows **"You"** — `is-you` class, weight 800, brand blue `rgb(0,77,152)` | ✅ |
| Only one popover open at a time (single state slot) | ✅ |
| Escape closes popover, bubble stays open | ✅ |
| Outside tap (pointerdown on bubble header) closes popover | ✅ |
| Removal moved to picker: active pick shows `title="Tap to remove your reaction"` / `aria-label="Remove your ❤️ reaction"` | ✅ |
| **Full live Firestore cycle**: `{😂:[Hanif]}` → picker ❤️ → `{😂:[Hanif], ❤️:[Eve Guo]}` → picker ❤️ again → `{😂:[Hanif]}` (restored to pre-test state) | ✅ |
| Guest mode: chip enabled + popover opens read-only; add-button disabled; hint shown | ✅ |
| `prefers-reduced-motion` gate on popover animation (CSS) | ✅ code-verified |

## US-002 — Guaranteed-unique coat colors

| Check | Result |
|---|---|
| Leaderboard: 20 rows → **20 unique swatch colors** | ✅ |
| Formerly-colliding pairs split: Sydney `rgb(91,37,157)` vs Keita `rgb(105,169,191)`; Katrina `rgb(157,37,115)` vs Pedro `rgb(148,56,178)` | ✅ |
| Herd ↔ leaderboard ↔ sender-tint consistency: Guglielmo's bubble header `rgb(178,56,99)` = his exact swatch (all three consume `useWinnerColors()`) | ✅ |
| Repeat-winner variants preserved on new base: Keita `hsl(195,40%,58%)` (win 1) vs `hsl(195,32%,74%)` (win 2) — same hue family, distinct shades | ✅ |
| Deterministic: pure function of sorted distinct-name list, no randomness; evenly-spaced hue slots + coprime-stride scatter + sat/light bands by slot (hue-adjacent slots always differ in tone) | ✅ code-verified |
| Full-spectrum herd visually confirmed (purple, teal, violet, olive, green bulls in screenshots) | ✅ |

## US-003 — Top bar polish

- Computed style verified: `box-shadow: rgb(255,205,0) 0 -3px 0 inset` (yellow divider) + `rgba(0,0,0,0.22) 0 2px 10px` (drop shadow), gradient background ✅
- Inset divider → zero layout shift (canvas padding untouched at 48px + safe-area) ✅
- Title contrast/height/safe-area unchanged ✅

## US-004 — Bottom action bar

- Bar renders with Submit a Tobu / Wall of Fame / Tobu? (Lucide `CirclePlus`/`Trophy`/`Info`) ✅
- All three buttons live-verified to open the same overlays as the 3D landmarks (BarnSubmit, Leaderboard, mascot bubble) — shared handlers, no duplicated state ✅
- Buttons 44px min-height; focus ring white variant on red; `env(safe-area-inset-bottom)` in bar + canvas padding ✅
- Mobile 375×812: one row, all buttons fit, **no horizontal overflow**, bar 56px ✅
- Overlay z-order: backdrop covers the bar; bar doesn't block landmark taps (barn click opened form during this pass) ✅
- Intro toast repositioned above the bar (computed `bottom: 68px`) ✅

## Firestore data fixes (live, rules restored)

| Fix | Result |
|---|---|
| `Thomas Reeves` → **`Thomas Grainger Reeves`** (winner_name + bull_pattern_seed, both win docs); zero stale docs remain; leaderboard row renders new name | ✅ |
| Thomas 2nd-win commentary → "…This is the start of the Bad Thomas era." | ✅ |
| Lasse commentary → word-of-mouth/sloppy-kiss version; rendered live in his bubble | ✅ |
| Repo parity: `data/seed-term-2-3.json`, `src/data/roster.ts`, `docs/tobu-winners-full-list.md` all updated to match | ✅ |
| **Rules discipline**: updates require fields outside the public allow-list, so a narrowly-scoped curator clause (`winner_name`/`bull_pattern_seed`/`commentary` only, status frozen) was deployed, the fix script ran, and the **original rules were verified byte-identical (git diff empty) and redeployed**. Window open ~2 minutes. | ✅ |

## Gates

| Gate | Status |
|---|---|
| tsc -b | ✅ |
| eslint (--max-warnings=0) | ✅ |
| Production build + PWA precache (59 entries) | ✅ |
| Fresh console errors after final reload | ✅ zero (buffer contains only stale mid-edit HMR entries) |
| Firestore reaction write-paths (add → switch → remove) | ✅ live-verified, data restored |

## Notes / carried-forward

- **Known pane quirks re-confirmed**: screenshots render at 1.25× the 1280×720 viewport, so coordinate clicks land offset — ref-based clicks (`read_page` → `ref_N`) are the reliable path. First trusted click still needed to wake rAF before the herd renders.
- If Thomas had a persisted identity (`tobu_user_name = "Thomas Reeves"`) on his own device, old reaction entries under that name display as-is; his next roster pick uses the new name. Cosmetic, self-healing.
- US-005 (real audio) intentionally not implemented this pass — owner downloads CC0 assets first per PRD.
