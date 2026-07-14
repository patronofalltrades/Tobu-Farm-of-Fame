# UI/UX Best Practices Reference

Synthesized from the [UI/UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (10 priority-ranked categories, CRITICAL → LOW). This is a **reference document**, not a PRD — it exists to ground a follow-up implementation plan for Tobu Farm of Fame's HTML overlay UI (topbar, speech bubble, roster picker, barn form, admin panel, leaderboard, toasts).

**Scope note:** this project is a mobile-first 3D PWA with a small set of HTML overlays layered above a WebGL canvas — not a content-heavy app with charts, complex forms, or deep navigation. Categories 9 (Navigation) and 10 (Charts) barely apply here; categories 1–3 (Accessibility, Touch, Performance) and 4 (Style) are where the real gap likely is. Each section below is kept in full for reference, with a short 🎯 relevance note for this specific codebase.

---

## Priority 1 — Accessibility (CRITICAL)

- Contrast ratios: normal text 4.5:1, large text 3:1 (WCAG AA)
- Focus visibility: 2–4px focus rings on interactive elements
- Alt text on meaningful images; ARIA labels for icon-only buttons
- Full keyboard navigation; logical tab order matching visual hierarchy
- Form fields: associated `<label for>`; skip-to-main links
- Sequential heading structure (h1→h6, no skipped levels)
- Support system text scaling (Dynamic Type / Material Design)
- Honor `prefers-reduced-motion`
- Screen reader support: meaningful labels, logical reading order, semantic markup

🎯 **Relevance:** the reaction buttons, roster dropdown, and admin PIN field are all real interactive controls with no visible focus ring or ARIA labeling audit done yet. Worth a pass.

## Priority 2 — Touch & Interaction (CRITICAL)

- Touch targets ≥44×44pt (iOS) / ≥48×48dp (Material); expand invisible hit area if the visual is smaller
- ≥8px gap between adjacent interactive elements
- Visible tap feedback (ripple/opacity/elevation) within 80–150ms
- Avoid hover-only interactions — primary actions must be tap/click-triggered
- Disable buttons during async operations; show a spinner/progress indicator
- Contextual error messages positioned near the problem
- Visible affordance for swipe/gesture actions (chevron, label, tutorial)
- Keep primary targets clear of notches/Dynamic Island/gesture bars
- Use haptics for confirmations, sparingly

🎯 **Relevance:** already partially covered — reaction buttons are 44×44px by convention. Roster dropdown items and admin queue approve/reject buttons haven't been explicitly audited against the 44px floor.

## Priority 3 — Performance (HIGH)

- WebP/AVIF + responsive `srcset`/`sizes`; lazy-load non-critical assets
- Declare image width/height or `aspect-ratio` to prevent layout shift
- `font-display: swap/optional`; preload only critical fonts
- Inline or early-load critical above-the-fold CSS
- Code-split by route/feature
- Async/defer third-party scripts; audit necessity
- Batch DOM reads/writes; avoid frequent reflows
- Reserve space for async content (CLS prevention)
- Virtualize lists with 50+ items
- Keep per-frame work under ~16ms for 60fps
- Tap/scroll response under ~100ms
- Skeleton/shimmer for operations >1s
- Degraded fallback for slow networks

🎯 **Relevance:** the 3D scene itself already targets 60fps via `InstancedMesh`. The build already warns about a 1.5MB main JS chunk (no code-splitting) — directly actionable. No image assets to speak of (procedural GLBs), so most of this category doesn't apply.

## Priority 4 — Style & Visual Design (HIGH)

- Match style to product type; apply consistently across all surfaces
- SVG icons only (Heroicons, Lucide, Phosphor) — never emoji for structural UI
- Palette chosen for product type/industry
- Shadows/blur/radius consistent with chosen style (flat, glass, clay, etc.)
- Respect platform idioms (iOS HIG vs. Material)
- Hover/pressed/disabled states stay on-style and distinguishable
- Defined shadow scale, not arbitrary values
- Design light/dark together; test contrast independently
- One consistent icon family (stroke width, corner radius)
- Prefer native controls unless branding requires custom
- Blur reserved for dismissal (modals/sheets), not decoration
- One primary CTA per screen; secondary actions visually subordinate

🎯 **Relevance:** **this is the one that directly contradicts current practice.** Tobu Farm of Fame deliberately uses emoji everywhere — 🐂 for the mascot/reactions, 🔇/🔊 for mute, 🛠 for admin, 🏆 for the leaderboard, 🔐 for the PIN gate. The skill's "never emoji for structural icons" rule is a generic professional-SaaS guideline; this app is an intentionally playful, irreverent inside-joke keepsake per its own product PRD (`docs/tobu_wall_of_fame_prd.md` §6.4: "Playful, irreverent, emoji-friendly... not a corporate app"). **Do not blanket-apply this rule** — flag it as a conflict to resolve consciously, not silently, in the follow-up plan.

## Priority 5 — Layout & Responsive (HIGH)

- `<meta viewport width=device-width, initial-scale=1>`, never disable zoom
- Mobile-first: design constraints first, scale up
- Consistent breakpoints (375, 768, 1024, 1440px)
- ≥16px body text on mobile (avoids iOS auto-zoom on input focus)
- 35–60 char line length on mobile, 60–75 on desktop
- No horizontal scroll on mobile
- 4pt/8dp spacing scale
- Comfortable touch density, no cramping
- Desktop content max-width container
- Defined z-index scale (0, 10, 20, 40, 100, 1000)
- Fixed nav/bars reserve padding for content beneath
- Avoid nested scroll regions fighting the main scroll
- Prefer `min-h-dvh` over `100vh` on mobile
- Layout functional in landscape
- Core content first on mobile; secondary content folds

🎯 **Relevance:** already mostly followed — the app already uses a 4/8px spacing token scale (`tokens.css`), inputs are already bumped to 16px specifically to dodge iOS auto-zoom (both `.roster-search` and `.barn-form` inputs have a comment noting exactly this). Landscape orientation is explicitly **not** supported per the product PRD's portrait-first design — a deliberate, not accidental, deviation.

## Priority 6 — Typography & Color (MEDIUM)

- Line-height 1.5–1.75 body text
- 65–75 char line length
- Heading/body font pairing with coherent personality
- Consistent type scale (12/14/16/18/24/32px)
- Sufficient dark-text-on-light contrast
- Bold headings (600–700), regular body (400), medium labels (500)
- Semantic color tokens (primary/secondary/error/surface), not raw hex
- Dark mode: desaturated/lighter variants, not simple inversion
- 4.5:1 (AA) or 7:1 (AAA) foreground/background pairs
- Error/success states never rely on color alone — pair with icon/text
- Prefer wrapping over truncation; ellipsis + tooltip if truncating
- Respect platform letter-spacing defaults
- Tabular figures for numbers/prices/timers
- Intentional whitespace for grouping

🎯 **Relevance:** the app already has a capped 6-size type scale and named color-role tokens (`tokens.css`) from the last polish pass. No dark mode exists at all currently — the app is unconditionally light-themed; whether that's in scope for a future pass is a real open question, not assumed here.

## Priority 7 — Animation & Motion (MEDIUM)

- 150–300ms micro-interactions; ≤400ms for complex transitions
- Animate `transform`/`opacity` only — never `width`/`height`/`position` directly
- Skeleton/progress shown once loading exceeds 300ms
- Animate 1–2 key elements per view, max
- Ease-out entering, ease-in exiting; no linear UI transitions
- Every animation should express cause-effect, not be purely decorative
- Smooth hover/active/expanded transitions, not snap changes
- Shared-element continuity across page transitions
- Subtle parallax only; respect reduced-motion
- Prefer spring/physics curves over cubic-bezier where natural
- Exit animations ~60–70% the duration of enter
- Stagger list items 30–50ms each
- Animations must be interruptible by user action
- Crossfade for content replacement in the same container
- Subtle press-scale (0.95–1.05) on cards/buttons
- Real-time visual tracking for drag/swipe/pinch
- Forward navigation animates left/up, backward right/down
- Motion must never cause layout reflow/CLS

🎯 **Relevance:** the app has almost no CSS transition/animation work today beyond the intro toast's fade-in keyframe and a couple of `transition: background` hover states added in the tokens pass. This is the least-invested category currently — plausibly the highest-leverage place for a focused follow-up pass (button press feedback, modal enter/exit, toast timing already roughly matches the 150–300ms guidance).

## Priority 8 — Forms & Feedback (MEDIUM)

- Visible labels (not placeholder-only)
- Errors positioned below the related field
- Loading → success/error feedback on submit
- Mark required fields
- Helpful empty states with a clear action
- Toasts auto-dismiss in 3–5s
- Confirm before destructive actions
- Persistent helper text for complex inputs
- Disabled styling: reduced opacity (0.38–0.5) + cursor + semantic attribute
- Progressive disclosure for complex option sets
- Validate on blur, not keystroke
- Semantic input types (email/tel/number) for correct mobile keyboards
- Password show/hide toggle
- Autofill support via `autocomplete`
- Undo affordance for destructive/bulk actions
- Brief success confirmation (checkmark/toast/flash)
- Errors state cause + recovery path
- Multi-step forms show progress + allow back navigation
- Long forms autosave drafts
- Confirm before dismissing a modal with unsaved changes
- Related fields grouped logically
- Read-only visually distinct from disabled
- Auto-focus first invalid field on submit error
- Multiple errors get a summary with anchor links
- Mobile input height ≥44px
- Destructive actions get danger color + spatial separation
- Toasts don't steal focus; `aria-live="polite"`
- Form errors use `aria-live`/`role="alert"`
- Error/success colors meet 4.5:1 contrast
- Timeout errors offer a retry

🎯 **Relevance:** the barn submission form is the one real form in the app — worth checking against required-field marking, inline validation timing, and the "confirm before dismissing with unsaved changes" pattern (currently the barn form's Cancel button likely just closes with no confirmation, discarding a partially-written story).

## Priority 9 — Navigation Patterns (MEDIUM/LOW here)

- Bottom nav ≤5 items, always labeled + iconed
- Drawers for secondary nav, not primary actions
- Predictable back behavior preserving scroll/state
- Deep-linkable key screens
- Active nav state clearly highlighted
- Clear primary vs. secondary nav hierarchy
- Explicit modal close/dismiss affordance
- Reachable search with suggested/recent queries
- Breadcrumbs for 3+ level hierarchies (web)
- Back navigation restores scroll/filters/input
- Support OS-native back gestures
- Sparse, clearable tab badges
- Overflow/more menu instead of cramming actions
- Adaptive layout: sidebar ≥1024px, bottom/top nav below
- Never silently reset navigation state
- Consistent nav placement across pages
- Don't mix Tab + Sidebar + Bottom Nav at the same hierarchy level
- Avoid modals for primary flows
- Move focus to main content after transitions
- Core navigation reachable from deep pages
- Spatially separate dangerous actions (delete/logout) from normal nav
- Explain, don't silently hide, unavailable destinations

🎯 **Relevance:** almost entirely inapplicable — per the product PRD, "the farm IS the app," there are no tabs, no navigation bars, no routes. The one relevant idea: the admin panel's demote-via-right-click-context-menu is an undiscoverable, non-standard "hidden" interaction pattern worth a look under the "explain, don't silently hide" principle.

## Priority 10 — Charts & Data Visualization (LOW here)

- Match chart type to data shape
- Colorblind-safe palettes; never red/green alone
- Table alternative for screen readers
- Always-visible legend near the chart
- Hover/tap tooltips with exact values
- Labeled, readable axes
- Responsive reflow on small screens
- Meaningful empty/loading states
- Respect `prefers-reduced-motion` for chart entrance animation
- Aggregate/sample 1000+ point datasets
- Locale-aware number/date/currency formatting
- ≥44pt tap targets on interactive chart elements
- Avoid pie/donut for >5 categories
- ≥3:1 data contrast, ≥4.5:1 label contrast
- Clickable, toggleable legends
- Direct value labels on small datasets
- Keyboard-reachable tooltips
- Sortable tables with `aria-sort`
- Auto-skipping axis ticks on small screens
- Limit per-chart complexity
- Subtle, low-contrast gridlines
- Keyboard-focusable interactive elements
- Screen-reader chart summary
- Error state with retry
- CSV/image export option
- Clear drill-down breadcrumb
- Explicit time-granularity labeling

🎯 **Relevance:** not applicable. The leaderboard is a ranked list, not a chart — no plotted data exists anywhere in this app.

---

## Common Professional Pitfalls (cross-cutting)

**Icons:** no emoji as structural icons · SVG not PNG · stable pressed states (no layout shift/jitter) · sized via tokens, not arbitrary values · consistent stroke width · one filled-vs-outline style per hierarchy level · ≥44×44pt targets · baseline-aligned with text · 4.5:1 (small) / 3:1 (large) contrast · correct official brand-asset spacing

**Interaction:** tap feedback within 80–150ms · 150–300ms micro-interaction timing · screen-reader focus order matches visual order · clear disabled semantics · ≥44×44pt / ≥48×48dp targets · one primary gesture per region · native primitives with proper a11y roles

**Light/Dark mode:** clear surface separation · ≥4.5:1 primary text both themes · visible dividers both themes · state parity across themes · token-driven theming (not hardcoded hex) · 40–60% modal scrim opacity

**Layout & spacing:** safe-area compliance (notch/gesture bar) · consistent content width per device class · 4/8dp rhythm · readable text measure on large screens · defined vertical rhythm tiers (16/24/32/48) · adaptive gutters · scroll content not obscured by sticky elements

---

## Pre-Delivery Checklist (for any future UI change in this app)

**Visual:** no emoji as *structural* icons (open question — see Priority 4 note above) · consistent icon family · correct brand-asset proportions · no jitter on press · consistent token usage

**Interaction:** visible pressed feedback on every tappable element · ≥44×44px targets · 150–300ms timing · clear, non-interactive disabled states · screen-reader focus order matches visual · no gesture conflicts

**Light/Dark:** N/A today (single light theme) — revisit if dark mode is ever scoped

**Layout:** safe areas respected · scroll content never hidden behind fixed elements · tested at mobile/tablet, portrait (this app is portrait-only by design) · 4/8px rhythm maintained · readable text measure

**Accessibility:** meaningful alt text/ARIA labels on icon-only controls · form fields have labels + clear errors · color never the sole indicator · reduced-motion and dynamic type supported · correct ARIA state announcements (selected/disabled/expanded)

---

## Summary: where this app already conforms vs. where a follow-up pass would matter most

| Category | Current state |
|---|---|
| Touch targets | Mostly conformant (44px reaction buttons, 16px inputs to dodge iOS zoom) |
| Spacing/type tokens | Already has a capped scale from the last polish pass |
| Performance | 3D render path is solid (`InstancedMesh`); JS bundle is unsplit (1.5MB, flagged by Vite itself) |
| **Animation/motion** | **Least invested category — biggest opportunity** |
| Accessibility (focus rings, ARIA) | Not yet audited — likely gaps |
| Style: emoji vs. SVG icons | **Deliberate conflict with the skill's rule** — this app's brand voice is explicitly playful/emoji-friendly per its own product PRD; do not silently "fix" this |
| Forms | Barn form untested against unsaved-changes-confirmation and inline-validation-timing guidance |
| Navigation | Mostly N/A — no tabs/routes by design |
| Dark mode | Doesn't exist — open question, not a gap to silently close |
