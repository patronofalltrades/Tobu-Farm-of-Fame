# UI/UX Benchmark — Tobu Farm of Fame

Audited against `docs/ui-ux-best-practices.md`. Scope: the HTML overlay UI only (topbar,
speech bubble, roster picker, barn form, admin panel/PIN gate, leaderboard, mute button,
intro toast) — not the 3D canvas itself. Every evidence citation below was read directly
from source; contrast ratios were computed from the hex values in `src/styles/tokens.css`
using the WCAG relative-luminance formula. The Charts category (10) and most of Navigation
(9) are out of scope per the reference doc's own 🎯 notes and are omitted below except the
one Navigation item the reference flags (admin demote gesture).

Legend: ✅ Conforms · 🟡 Partial · ❌ Gap · 🎨 Deliberate brand deviation (per PRD §6.4) · N/A

---

## 1. Scorecard

### Accessibility

| Practice | Status | Evidence |
|---|---|---|
| Contrast 4.5:1 normal / 3:1 large text | 🟡 Partial | Most text passes (brand-red #D50032 on white ≈5.4:1, `tokens.css:33`, used `App.css:208,334`; brand-blue #004D98 on white ≈8.4:1, `tokens.css:35`, used `App.css:87,314,367`). Three concrete failures: (1) topbar title, yellow `#FFCD00` text on red `#D50032` bg ≈3.6:1, fails 4.5:1 for 16px/700 text (`App.css:24-43`, `tokens.css:33-34`); (2) admin "Approve" button, white text on `--color-success #4CAF50` ≈2.8:1 (`App.css:541-548`, `tokens.css:46`); (3) `--color-text-muted #999999` on white ≈2.85:1, used for hint/empty-state text (`tokens.css:42`; consumed at `App.css:284-289` roster-empty, `App.css:337-339` leaderboard subtitle, `App.css:390-397` zero-win rows). |
| Focus visibility (2-4px ring) | ❌ Gap | `.roster-search` explicitly removes the native outline and substitutes only a 2px border-color swap (`App.css:225-237`, `outline: none` at line 231). No other interactive element (`reaction-button`, `roster-confirm`, `roster-skip`, `roster-item`, Close/Cancel/Submit/Approve/Reject/Unlock buttons) has any `:focus` or `:focus-visible` rule anywhere in `App.css` (grep for `:focus` returns only lines 228/235/448, none of which style buttons). |
| Alt text / ARIA labels on icon-only controls | 🟡 Partial | `MuteButton` has `aria-label` (`src/components/MuteButton.tsx:18`) ✅. The admin-trigger button when logged out renders an **empty string** as its only content with no `aria-label` — an icon-only button with no accessible name at all (`src/App.tsx:189-200`, esp. line 199 `{isAdmin ? '🛠' : ''}`). Photo thumbnail in the admin queue uses `alt=""` (`src/components/AdminPanel.tsx:73`) — acceptable for decorative treatment but arguably loses information for a screen-reader user reviewing a submission. |
| Full keyboard navigation / tab order | 🟡 Partial | `RosterPicker` combobox has real keyboard support — ArrowUp/Down, Enter, Escape (`src/components/RosterPicker.tsx:54-71`). None of the modal overlays (speech-bubble, Leaderboard, AdminPanel, BarnSubmit, AdminPinGate) close on Escape or trap focus — only escape-to-close text mentions the roster picker specifically (`RosterPicker.tsx:11`). |
| Form fields have associated `<label for>` | ❌ Gap | `BarnSubmit` labels are plain `<label>` elements with no `htmlFor`/`id` pairing to their inputs, relying purely on DOM adjacency (`src/components/BarnSubmit.tsx:102,124,136,142,153`). `AdminPinGate`'s PIN input has no `<label>` at all, just a preceding `<p>` (`src/components/AdminPinGate.tsx:28-38`). `RosterPicker`'s search input likewise has no `<label>`/`aria-label` (`RosterPicker.tsx:92-108`). |
| Skip-to-main link | N/A | Single-view SPA, no distinct "main content" region to skip to — the canvas *is* the app per CLAUDE.md. |
| Sequential heading structure (h1→h6) | ❌ Gap | No `<h1>` exists anywhere in `src` (grep across all `.tsx` confirms zero). The visual app title is a `<span className="topbar-title">` (`App.tsx:181`, styled `App.css:39-43`), not a heading. Every modal opens directly at `<h2>` (`App.tsx:219,277`; `AdminPanel.tsx:56`; `Leaderboard.tsx:34`; `RosterPicker.tsx:88`; `BarnSubmit.tsx:84,97`; `AdminPinGate.tsx:28`) — a skipped level with no h1 ancestor. |
| System text scaling / Dynamic Type | 🟡 Partial | Entire type scale is hard-coded in `px` (`src/styles/tokens.css:25-30`), not `rem`, so it won't scale with a user's browser base-font-size preference the way `rem`-based scales do. |
| `prefers-reduced-motion` honored | ❌ Gap | Zero matches for `prefers-reduced-motion` anywhere in `src` (confirmed by grep). The one CSS animation (`@keyframes intro-toast-in`, `App.css:521-524`) always plays. |

### Touch & Interaction

| Practice | Status | Evidence |
|---|---|---|
| ≥44×44 touch targets | 🟡 Partial | Reaction buttons: `min-width/height: 44px` ✅ (`App.css:130-146`). `roster-confirm`: 14px padding + 16px font ≈ 47px total ✅ (`App.css:291-302`). **Fails:** `.mute-button` and `.admin-trigger` are both explicitly `34px × 34px` (`App.css:402-427`) — well under the 44px floor for two always-visible topbar icons. `.barn-roster li button` (winner-picker results in the barn form) has only 8px vertical padding around 14px text ≈ 33px tall (`App.css:470-479`). `.roster-item` ≈ 41px (`App.css:261-271`) — borderline under. |
| ≥8px gap between adjacent targets | ✅ Conforms | `.topbar-actions { gap: var(--space-2) }` = 8px between mute/admin buttons (`App.css:45-49`); `.reaction-row { gap: var(--space-2) }` = 8px between reaction buttons (`App.css:123-128`). |
| Visible tap feedback within 80-150ms | ❌ Gap | No `:active` pseudo-class anywhere in `App.css` (confirmed by grep). All feedback is `:hover` background-color transitions (`App.css:148-150,270-276,481`), which don't fire reliably on touch devices — there is no press-state feedback at all on a touch-first app. |
| Avoid hover-only interactions | ✅ Conforms | All primary actions are `onClick`/`onPointerEnter`-driven, not hover-gated (e.g. `RosterPicker.tsx:119` `choose` fires on click). |
| Disable buttons during async + progress indicator | 🟡 Partial | Disabling logic is correct and present everywhere it matters: `BarnSubmit.tsx:165-168` (`disabled={submitting}`), `AdminPanel.tsx:79,86` (`disabled={busyId === t.id}`), `App.tsx:238` (`disabled={isUpdatingReaction \|\| !userName}`). No spinner — only a text swap ("Submitting…", `BarnSubmit.tsx:167`), which is an acceptable equivalent, but as noted below the disabled *style* often doesn't change visually. |
| Contextual error messages near the problem | 🟡 Partial | `AdminPinGate` error sits directly under its one field ✅ (`AdminPinGate.tsx:39`). `BarnSubmit`'s single `.barn-error` (`BarnSubmit.tsx:162`) is form-level, not tied to which field (Winner vs. Story) actually failed. |
| Safe-area / notch clearance | ❌ Gap | `viewport-fit=cover` is declared (`index.html:6`) but no `env(safe-area-inset-*)` usage exists anywhere in `src` (confirmed by grep) — the fixed 48px topbar (`App.css:24-37`) has no inset padding for notched/Dynamic-Island devices. |
| Haptics for confirmations | N/A / unverifiable | No `navigator.vibrate` calls found; not present, likely out of scope for a web PWA. |

### Performance

| Practice | Status | Evidence |
|---|---|---|
| Code-split by route/feature | ❌ Gap | Verified directly: `npx vite build` emits a single `dist/assets/index-*.js` at **1,568.85 kB (449.28 kB gzip)** with Vite's own warning to use dynamic `import()`. No `React.lazy`/dynamic `import()` exists anywhere in `src` (grep confirms zero), and `vite.config.ts` has no `manualChunks`/`rollupOptions` config. |
| `InstancedMesh` for repeated geometry | ✅ Conforms | `src/scene/BullHerd.tsx:6,136` imports and uses `InstancedMesh` for the bull herd, per CLAUDE.md's own mandate. |
| Reserve space for async content (CLS) | ✅ Conforms | Topbar has a fixed `height: 48px` (`App.css:29`) and `.canvas-wrap` has matching `padding-top: 48px` (`App.css:57-61`), so the conditional data-source warning icon (`App.tsx:183-187`) can't shift layout. |
| Virtualize lists ≥50 items | 🟡 Partial | The ~70-name roster dropdown (`ROSTER`, referenced `RosterPicker.tsx:2,23-27`) renders every filtered match as a plain `<ul>`/`.map()` with `max-height: 240px; overflow-y: auto` (`App.css:239-255`) rather than a virtualized list. Not currently a visible problem at ~70 rows, but doesn't meet the letter of the guideline. |
| Custom-font loading (`font-display`) | N/A | No custom `@font-face` anywhere — the app uses the system font stack only (`App.css:10`), so this category doesn't apply. |
| Async/defer third-party scripts | N/A | No third-party scripts present. |

### Style & Visual Design

| Practice | Status | Evidence |
|---|---|---|
| SVG icons, never emoji for structural UI | 🎨 Deliberate deviation | Emoji used throughout as structural icons: 🐂 topbar/mascot (`App.tsx:181,277`), 🔇/🔊 mute (`MuteButton.tsx:25`), 🛠 admin (`App.tsx:199`, `AdminPanel.tsx:56`), 🏆 leaderboard (`Leaderboard.tsx:34`), 🔐 PIN gate (`AdminPinGate.tsx:28`), 🏠 barn form (`BarnSubmit.tsx:97`). This is explicitly sanctioned by `docs/tobu_wall_of_fame_prd.md:169-171` ("Playful, irreverent, emoji-friendly... not a corporate app") — **not** a gap. |
| Defined shadow scale | ✅ Conforms | Three named tokens (`--shadow-modal/card/toast`, `tokens.css:19-22`) consumed consistently (`App.css:78,81,203,252,515`) — no arbitrary one-off shadow values found. |
| Hover/pressed/disabled states stay on-style | 🟡 Partial | Hover states exist and are on-brand (`App.css:148-150,273-276`). Pressed states don't exist (see Touch category). Disabled states are only implemented for 2 of ~8 button types (see Forms category). |
| One primary CTA per screen, secondary subordinate | ✅ Conforms | Each modal has one clear primary action visually distinct from its secondary: `roster-confirm` (filled red) vs. `roster-skip` (transparent/outlined) (`App.css:291-321`); BarnSubmit's "Submit for approval" vs. plain "Cancel" (`BarnSubmit.tsx:164-169`). |
| Consistent palette applied to product type | ✅ Conforms | Barcelona palette (`--color-brand-red/yellow/blue`, `tokens.css:33-35`) is the only palette in use, applied consistently across every surface in `App.css`. |

### Layout & Responsive

| Practice | Status | Evidence |
|---|---|---|
| Correct viewport meta, zoom never disabled | ✅ Conforms | `index.html:6` — `width=device-width, initial-scale=1.0, viewport-fit=cover`, no `maximum-scale`/`user-scalable=no`. |
| ≥16px inputs to dodge iOS auto-zoom | ✅ Conforms | Explicit `font-size: 16px` with inline comments on both the roster search (`App.css:228`) and barn-form inputs (`App.css:448`). |
| 4/8px spacing scale | ✅ Conforms | `--space-1` through `--space-6` are 4/8/12/16/24/32px (`tokens.css:5-11`), used throughout `App.css`. |
| Defined z-index scale | 🟡 Partial | Values in use: 10, 100, 100, 150, 200 (`App.css:36,72,190,253,517`) — functional (roster picker at 200 correctly sits above the speech-bubble family at 100) but two visually-distinct layers (`.topbar` and `.speech-bubble`) both use the same literal `z-index: 100` (`App.css:36` vs. `App.css:72`) with no documented scale/comment explaining the ordering. |
| No horizontal scroll on mobile | ✅ Conforms (best-effort) | `html, body { overflow: hidden }` (`App.css:5-13`) plus `.app { position: fixed; inset: 0 }` (`App.css:15-20`) strongly prevent horizontal scroll; not device-tested. |
| Landscape support | 🎨 Deliberate deviation | PWA manifest pins `orientation: 'portrait'` (`vite.config.ts:13`), matching the product's portrait-first design — not an oversight. |
| Safe-area padding for fixed bars | ❌ Gap | See Touch category above — `viewport-fit=cover` declared but no `env(safe-area-inset-*)` applied to the fixed topbar (`App.css:24-37`). |

### Typography & Color

| Practice | Status | Evidence |
|---|---|---|
| Capped, consistent type scale | ✅ Conforms | Six sizes total, named by role (`--font-size-h1` … `--font-size-small`, `tokens.css:24-30`). |
| Semantic color tokens, not raw hex | 🟡 Partial | `tokens.css` itself is fully tokenized, but several components bypass it with raw hex: `.speech-content button.reaction-button { background: #f3f3f3 }` (`App.css:130-131`), `.leaderboard-row.is-zero .leaderboard-rank { color: #bbb }` (`App.css:394-397`), `.roster-skip { border: 1px solid #d9e1f0 }` (`App.css:314-316`), and an inline `border: 1px solid #ccc` on the PIN input (`AdminPinGate.tsx:37`). |
| Dark mode | N/A (open question) | No dark theme exists; per the reference doc this is a deliberate scope question, not a silently-closed gap. |
| Error/success never color-alone | ✅ Conforms | Errors are conveyed via text content, not color alone (`BarnSubmit.tsx:162`, `AdminPinGate.tsx:39`, `AdminPanel.tsx:60`). |
| Line-height 1.5–1.75 body text | 🟡 Partial | `.speech-content p { line-height: 1.4 }` (`App.css:90-95`) and `.roster-card p { line-height: 1.4 }` (`App.css:212-217`) are both below the 1.5 floor. |
| Prefer wrapping over truncation | 🟡 Partial | `.leaderboard-name` truncates with `text-overflow: ellipsis; white-space: nowrap` and no tooltip fallback (`App.css:378-382`) — long names are silently cut off with no way to see the full value. |

### Animation & Motion

| Practice | Status | Evidence |
|---|---|---|
| 150–300ms micro-interaction timing | ✅ Conforms (mostly) | `--transition-fast: 120ms` (`tokens.css:49`, slightly under 150ms but negligible) and `--transition-modal: 200ms` (`tokens.css:50`) are both in/near range. |
| Animate `transform`/`opacity` only | ✅ Conforms | The one keyframe animation (`intro-toast-in`, `App.css:521-524`) animates `opacity` and `transform` only. |
| `prefers-reduced-motion` respected | ❌ Gap | Same finding as Accessibility — zero matches project-wide. |
| Subtle press-scale (0.95–1.05) on buttons/cards | ❌ Gap | No `transform: scale` anywhere in `App.css` (confirmed by grep of transition/animation rules) — no press-scale feedback exists on any button. |
| Ease-out entering | ✅ Conforms | `animation: intro-toast-in var(--transition-modal) ease-out` (`App.css:518`). |
| Stagger list items 30–50ms | N/A | Not implemented for roster/leaderboard lists; low-impact given list sizes involved. |

### Forms & Feedback

| Practice | Status | Evidence |
|---|---|---|
| Visible labels, not placeholder-only | 🟡 Partial | `BarnSubmit` has real `<label>` text above every field ✅ (`BarnSubmit.tsx:102,124,136,142,153`). `AdminPinGate`'s PIN field and `RosterPicker`'s search field rely on placeholder/surrounding copy only, with no `<label>` (`AdminPinGate.tsx:30-38`; `RosterPicker.tsx:92-108`). |
| Mark required fields | ❌ Gap | Winner + Story are required for submit (`canSubmit`, `BarnSubmit.tsx:40`) but neither label shows any required indicator; only the optional Photo field is explicitly marked "(optional)" (`BarnSubmit.tsx:153`), leaving required vs. optional inconsistently signaled. |
| Toasts auto-dismiss 3–5s | 🟡 Partial | `IntroToast` auto-dismisses at **7000ms** (`App.tsx:64`) — outside the 3-5s guideline, though it's instructional copy (not a status toast) that arguably needs the extra reading time; also tap-dismissible. |
| Confirm before destructive actions | ❌ Gap | `AdminPanel`'s Reject action (`AdminPanel.tsx:76-91`) fires immediately on click with no confirmation step. |
| Disabled styling: opacity + cursor + semantic attribute | 🟡 Partial | `.reaction-button:disabled` (`App.css:158-161`) and `.roster-confirm:disabled` (`App.css:304-308`) are properly styled (opacity, `cursor: not-allowed`, background swap). Every other disabled button (`Cancel`/`Submit for approval` in `BarnSubmit.tsx:165-166`, `Approve`/`Reject` in `AdminPanel.tsx:79,86`, `Unlock` in `AdminPinGate.tsx:42`) has the semantic `disabled` attribute ✅ but **no corresponding CSS rule** — `.speech-content button` (`App.css:169-179`) and `.admin-actions .approve/.reject` (`App.css:541-557`) define no `:disabled` state at all. |
| Undo affordance for destructive/bulk actions | ❌ Gap | No undo for a Reject decision in `AdminPanel.tsx:76-91`. |
| Confirm before dismissing a modal with unsaved changes | ❌ Gap | `BarnSubmit`'s backdrop `onClick={onClose}` (`BarnSubmit.tsx:95`) and its `Cancel` button (`BarnSubmit.tsx:165`) both discard an in-progress story with zero confirmation. |
| Toasts don't steal focus; `aria-live="polite"` | ❌ Gap | `IntroToast` is a plain `<button>` (`App.tsx:71-74`) with no `aria-live` region anywhere in the app (confirmed by grep — zero matches for `aria-live`). |
| Semantic input types for mobile keyboards | ✅ Conforms | `type="password" inputMode="numeric"` for the PIN (`AdminPinGate.tsx:31-32`), `type="date"` for the date field (`BarnSubmit.tsx:144`), `type="file" accept="image/*"` for photo (`BarnSubmit.tsx:155-156`). |
| Mobile input height ≥44px | 🟡 Partial | `.barn-form input/textarea/select` uses `padding: var(--space-2) 10px` (8px vertical) + 16px font ≈ 35px tall (`App.css:439-450`) — under the 44px comfortable-target floor. |
| Autofill via `autocomplete` | N/A | No `autoComplete` attributes anywhere (confirmed by grep), but none of the fields (roster name search, admin PIN) are standard autofill-able identity fields, so this mostly doesn't apply. |

### Navigation (the one applicable item)

| Practice | Status | Evidence |
|---|---|---|
| Explain, don't silently hide, non-standard interactions | ❌ Gap | Right-click/context-menu to demote from admin is a real, working, but entirely undiscoverable gesture with zero on-screen affordance: `onContextMenu={(e) => { e.preventDefault(); if (isAdmin) setAdmin(false); }}` (`App.tsx:197`) — no label, tooltip, or hint anywhere tells an admin this exists. |

---

## 2. Category-level conformance summary

| Category | ✅ Conforms | 🟡 Partial | ❌ Gap | 🎨 Deliberate | N/A | Approx. conformance* |
|---|---|---|---|---|---|---|
| Accessibility | 0 | 3 | 4 | 0 | 2 | ~2/7 scored rows (29%) |
| Touch & Interaction | 2 | 3 | 2 | 0 | 1 | ~2/7 scored (43%, partial counted half) |
| Performance | 2 | 1 | 1 | 0 | 2 | ~2.5/4 scored (63%) |
| Style | 3 | 1 | 0 | 1 | 0 | 3.5/4 scored (88%, excl. deliberate) |
| Layout & Responsive | 3 | 1 | 1 | 1 | 0 | ~3.5/5 scored (excl. deliberate) (70%) |
| Typography & Color | 2 | 3 | 0 | 0 | 1 | ~3.5/5 scored (70%) |
| Animation & Motion | 3 | 0 | 2 | 0 | 1 | 3/5 scored (60%) |
| Forms & Feedback | 1 | 5 | 5 | 0 | 1 | ~3.5/11 scored (32%) |

\* "Partial" counted as half-credit; N/A and 🎨 excluded from the denominator. **Overall
weighted conformance across all scored rows ≈ 50%.** The two weakest categories —
**Accessibility (29%)** and **Forms & Feedback (32%)** — are also the two the reference
doc flagged as "not yet audited" going in, which the audit confirms. Style (88%) is the
strongest, and the one "failure" there (emoji icons) is an intentional brand choice, not
a defect.

---

## 3. Prioritized gap list (top 10, ranked by impact × effort)

1. **Topbar icon buttons are 34×34px, under the 44px touch-target floor.**
   Where: `src/App.css:402-427` (`.mute-button`, `.admin-trigger`).
   Fix: bump both to `min-width/height: 44px` and keep the icon glyph centered at its current visual size — 15 min.

2. **No visible focus ring on any interactive control except one border-color swap.**
   Where: `src/App.css` — no `:focus-visible` rule exists for buttons anywhere; `.roster-search:focus` (`App.css:235-237`) only swaps border color after removing the native outline (`App.css:231`).
   Fix: add a shared `:focus-visible { outline: 2px solid var(--color-brand-blue); outline-offset: 2px; }` rule scoped to `.speech-content button, .roster-item, .roster-confirm, .roster-skip, .admin-actions button`. Medium effort (~30 min incl. visual check).

3. **No disabled-state CSS for 5 of 7 button types.**
   Where: `src/App.css:169-179` (`.speech-content button`), `src/App.css:541-557` (`.admin-actions .approve/.reject`) — no `:disabled` rule, despite the `disabled` attribute being set correctly in `BarnSubmit.tsx:165-166`, `AdminPanel.tsx:79,86`, `AdminPinGate.tsx:42`.
   Fix: add `.speech-content button:disabled, .admin-actions button:disabled { opacity: 0.5; cursor: not-allowed; }` — 10 min.

4. **Barn form discards an in-progress story with no confirmation.**
   Where: `src/components/BarnSubmit.tsx:95` (backdrop click) and `:165` (Cancel button).
   Fix: only call `onClose` directly if `story.trim() === '' && !winner`; otherwise show a `window.confirm('Discard this Tobu?')` gate before closing. ~20 min.

5. **Admin Reject is one click, irreversible, with no confirmation or undo.**
   Where: `src/components/AdminPanel.tsx:76-91` (`decide(t.id, false)` fires immediately from the `reject` button).
   Fix: wrap the reject click in a `window.confirm` (cheap) or add a 5s toast-based undo (better, more effort). ~15-45 min depending on approach.

6. **Contrast failures: topbar title (yellow-on-red ≈3.6:1) and admin Approve button (white-on-green ≈2.8:1), both under the 4.5:1 AA floor.**
   Where: `src/App.css:24-43` + `tokens.css:33-34` (topbar); `src/App.css:541-548` + `tokens.css:46` (approve button).
   Fix: darken `--color-success` to something like `#2E8B3D` (≈4.6:1 with white) and either bump the topbar title to bold 18px+ (clears the "large text" 3:1 bar) or swap its color to white. ~20 min incl. re-checking ratios.

7. **No heading hierarchy — every modal opens at `<h2>` with no `<h1>` anywhere in the app.**
   Where: `src/App.tsx:181` (topbar title is a `<span>`), all modal headers (`App.tsx:219,277`; `AdminPanel.tsx:56`; `Leaderboard.tsx:34`; `RosterPicker.tsx:88`; `BarnSubmit.tsx:84,97`; `AdminPinGate.tsx:28`).
   Fix: change the topbar title span to an `<h1 className="topbar-title">` (visually identical, same CSS class) — 5 min, but confirm it doesn't conflict with any assumed single-span layout logic in `Farm.tsx`.

8. **`prefers-reduced-motion` is never checked anywhere in the codebase.**
   Where: no matches project-wide; the one animation is `App.css:518-524`.
   Fix: wrap the keyframe in `@media (prefers-reduced-motion: no-preference) { .intro-toast { animation: ...; } }` — 10 min.

9. **Form fields have no programmatic label association (`<label for>`/`id`), and two fields (PIN, roster search) have no `<label>` at all.**
   Where: `src/components/BarnSubmit.tsx:102,124,136,142,153`; `src/components/AdminPinGate.tsx:28-38`; `src/components/RosterPicker.tsx:92-108`.
   Fix: add matching `id`/`htmlFor` pairs to the `BarnSubmit` labels (quick), and add a visually-hidden `<label>` or `aria-label` to the PIN and roster-search inputs. ~30-40 min across all three components.

10. **Admin bundle is a single unsplit 1.57MB JS chunk (449KB gzip) — verified via `npx vite build`, which itself warns about it.**
    Where: `vite.config.ts` (no `manualChunks`/code-splitting config); no `React.lazy` anywhere in `src`.
    Fix: lazy-load `AdminPanel` + `AdminPinGate` (only needed by the class rep, never by most users) via `React.lazy`/`Suspense` in `App.tsx:6-7`. Medium effort — ~45-60 min incl. testing the loading fallback doesn't flash awkwardly.

---

## 4. Quick wins (< 15 minutes each)

- **#1** — Bump `.mute-button`/`.admin-trigger` to 44×44px (`App.css:402-427`).
- **#3** — Add a shared `:disabled` opacity/cursor rule for `.speech-content button` and `.admin-actions button` (`App.css:169-179,541-557`).
- **#7** — Swap the topbar title `<span>` to `<h1>` with the same class (`App.tsx:181`).
- **#8** — Gate the intro-toast keyframe behind `@media (prefers-reduced-motion: no-preference)` (`App.css:518-524`).
- **Bonus:** replace the three raw-hex color values (`#f3f3f3` `App.css:131`, `#bbb` `App.css:396`, `#d9e1f0` `App.css:315`) with new named tokens in `tokens.css` for consistency with the rest of the system — mechanical, low-risk.
- **Bonus:** add `aria-label="Admin"` to the admin-trigger button so it always has an accessible name even when logged out and rendering an empty glyph (`App.tsx:189-200`).

**Quick-win count: 6** (4 from the top-10 gap list marked above, plus 2 additional bonus items not in the top 10 but trivially fixable).

---

## 5. What this audit deliberately did *not* flag

- **Emoji as structural icons** — sanctioned by `docs/tobu_wall_of_fame_prd.md:169-171`. Marked 🎨 throughout, not ❌.
- **Portrait-only / no landscape support** — sanctioned by the same PRD's portrait-first design and enforced via `vite.config.ts:13`.
- **No dark mode** — the reference doc itself frames this as an open question, not a gap to silently close.
- **Real-device touch/gesture behavior, haptics, actual screen-reader announcement order** — these require a physical device or AT (assistive technology) session and are marked "unverifiable from code" rather than guessed at.
