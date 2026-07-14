# E2E Report — Bubble Redesign, Nunito, WhatsApp Reactions, Photo Deprecation

**Date:** 2026-07-15 · **Branch:** `farm-navigation-behavior-fixes` · **Spec:** [prd-bubble-font-reactions.md](prd-bubble-font-reactions.md)
**Method:** live browser pane against the dev server (desktop-width viewport this pass), DOM/state assertions via JS eval, live Firestore reaction round-trips as "Eve Guo", plus the Vite-module-graph store-driving technique from the prior report. Production build verified separately.

## Verdict: all 4 user stories pass · 1 unrelated latent bug found and fixed

| Story | Result |
|---|---|
| US-001 Self-hosted Nunito | ✅ Pass |
| US-002 Chat-bubble redesign | ✅ Pass |
| US-003 WhatsApp-style reactions | ✅ Pass |
| US-004 Photo deprecation | ✅ Pass |
| Bonus: white-on-white barn roster text | 🐛 Found + fixed |

---

## US-001 — Nunito (self-hosted)

- `getComputedStyle(document.body).fontFamily` → `Nunito, -apple-system, …` ✅
- `document.fonts.check('16px Nunito')` → `true` ✅
- All font requests local (`/node_modules/@fontsource/nunito/...woff2` in dev; hashed `dist/assets/nunito-*-normal-*.woff2` in the production build) — **zero** requests to `fonts.googleapis.com`/`gstatic` ✅
- Form controls inherit the face (verified computed style on a `.speech-content button`: Nunito) — the `button/input/textarea/select { font-family: inherit }` rule works ✅
- Production build emits per-subset woff2 files (latin/latin-ext/cyrillic/vietnamese × 4 weights) picked up by the existing `**/*.woff2` precache glob; browsers download only the latin subset in practice ✅

## US-002 — Chat-bubble redesign

Verified live on Eve Guo's Tobu (opened via `useFarmStore.getState().selectTobu(...)` through the Vite module graph — see Testing Notes):

- `.tobu-bubble` renders with the `::after` chat tail (computed `content` present; visibly pointing down-left in the screenshot) ✅
- Sender header: small/800-weight winner name; **light-coat fallback triggered correctly** — Eve's cream coat is too light on white, so the name rendered `var(--color-brand-blue)` per the `senderTint` lightness check ✅
- Story reads as the primary message text; commentary below in the quieter italic style, unchanged ✅
- Other modals (barn form, leaderboard, PIN gate) inherit Nunito but no tail/chat layout — confirmed visually across this pass's screenshots ✅

## US-003 — WhatsApp-style reactions

Full loop against **live Firestore** as "Eve Guo":

1. Bubble with zero reactions → **no chips, just the SmilePlus add button** ✅
2. Add button → picker pops (floating pill, `animation: picker-in`, reduced-motion gated) with exactly `😂 ❤️ 🔥 👏 🐂` ✅
3. Pick 😂 → picker closes on selection; after the Firestore round-trip a **"😂 1" chip appears, highlighted `is-active`** (screenshot captured) ✅
4. Tap the active chip → reaction removed in Firestore → chip disappears (back to zero-chip state) ✅ — un-reacting stays one tap
5. **Escape priority chain** verified in sequence with a (deliberately) stacked leaderboard underneath: Escape #1 closed the leaderboard, #2 closed the picker (bubble survived), #3 closed the bubble — exactly the designed ordering ✅
6. Guest gating not re-tested this pass (identical `disabled={!userName}` pattern as the old row, verified in the previous E2E)

## US-004 — Photo deprecation

- Barn form live-inspected: labels are exactly `Winner *, The moment *, Term, Date` — **no Photo label, no `input[type=file]`** ✅
- `AdminPanel` thumbnail block, `uploadTobuPhoto`, `src/firebase/storage.ts`, and `.speech-photo` CSS all removed; repo-wide grep for `uploadTobuPhoto|speech-photo` returns nothing ✅
- `photo_url?` retained on the `Tobu` type with a `@deprecated` docblock (legacy documents stay type-safe) ✅
- No Firestore rules/data changes needed or made ✅

## 🐛 Found & fixed along the way (pre-existing, not from this PRD)

**Barn winner-roster buttons rendered white text on a white background** — `.barn-roster li button` sets `background: var(--color-surface)` but never overrode the `color: white` it inherits from the generic `.speech-content button` rule. Latent since the design-tokens pass; every prior E2E read that list through the accessibility tree (which ignores color) and missed it. Fixed by adding `color: var(--color-text-primary)` and verified live via HMR (computed color now `rgb(26,26,26)`).

## Build health

- `tsc -b` clean · `eslint` clean · production build + PWA precache clean · zero console errors after a full test session
- Bundle: Nunito adds ~40KB of latin-subset woff2 to what a browser actually downloads (multi-subset files exist in dist but load on demand)

## Testing notes (additions to the playbook)

- **This browser pane couldn't trigger `InstancedMesh` click events** (bull taps) even with the offset-patched dispatch technique that works for regular meshes — landmark clicks (barn/signpost/mascot) worked fine, bull hover-cursor worked, bull clicks silently no-oped, no errors thrown. Worked around by driving `selectTobu` directly through the Vite-module-graph import (`import('/src/stores/useFarmStore.ts')` → `getState().selectTobu(id)`), which is the *right* isolation boundary anyway: this PRD changed the bubble UI, not the unchanged, previously-verified bull-tap path.
- The overlay-stacking quirk (multiple `.speech-bubble` overlays open at once under synthetic canvas dispatches) remains testing-only noise, as documented in `e2e-report-2026-07-13.md` — but it accidentally provided a perfect Escape-priority test fixture this pass.

## Out of scope / carried forward

- Real-device iOS pass (task #8) — the safe-area topbar insets and the new picker especially deserve a real-notch check
- Production deploy: this branch (PR #2) is still undeployed; production runs main
