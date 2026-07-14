# TRD — Farm Polish v2

**Companion to:** [prd-farm-polish-v2.md](./prd-farm-polish-v2.md)
**Stack:** React 19 + Vite + TypeScript (strict), React Three Fiber / Three.js, Zustand, Firebase Firestore, `@gltf-transform/core` for procedural GLB generation.

This TRD maps each PRD requirement to concrete file-level changes. Suggested implementation order matches the PRD's "Timeline Considerations" dependency chain.

---

## 1. Schema change: `commentary` field (underpins P0-5, P0-7)

**Files:** `src/types/index.ts`, `firestore.rules` (verify only — see finding below)

```ts
// src/types/index.ts
export interface Tobu {
  id: string;
  winner_name: string;
  story: string;
  commentary?: string;   // NEW — curated witty line, optional, curator-only (not user-submitted)
  photo_url?: string;
  date: string;
  term: 1 | 2 | 3;
  bull_pattern_seed: string;
  reactions: Record<string, string[]>;
  status: TobuStatus;
  submitted_by: string;
  created_at: number;
}
```

**Finding — no `firestore.rules` change required.** The existing `create` rule uses `request.resource.data.keys().hasAll([...])`, which checks the *required* keys are present — it does not use `hasOnly`, so it does not reject extra fields. `commentary` can be written on create today without a rules deploy. Confirm this holds by re-reading `firestore.rules:8-16` before implementation in case it's changed since this TRD was written.

The `update` rule (`hasOnly(['reactions'])` / `hasOnly(['status'])`) is unaffected — commentary is set once at creation and never updated via the app's normal flows.

---

## 2. Speech bubble renders commentary (P0-5)

**Files:** `src/App.tsx`, `src/App.css`

In the `.speech-content` block (`App.tsx` ~L216-245), after the story `<p>`:

```tsx
<p>"{selected.story}"</p>
{selected.commentary && (
  <h4 className="tobu-commentary">{selected.commentary}</h4>
)}
```

CSS (new rule in the "design tokens" pass, §4, but functionally needed here):

```css
.tobu-commentary {
  font-size: var(--font-size-h4, 13px);
  font-weight: 500;
  font-style: italic;
  color: var(--color-text-secondary, #6b6b6b);
  margin: 4px 0 12px;
  line-height: 1.35;
}
```

`BarnSubmit.tsx` is **not** touched — no commentary input field is added there (P0-5 acceptance criterion: commentary is curator-only).

---

## 3. Repeat-winner shade variants (P0-6)

**Files:** `src/hooks/useBullColor.ts`, `src/scene/BullHerd.tsx`

This is the smallest-surface-area change in the spec — the per-winner occurrence index (`perWinner` Map) already exists in `BullHerd.tsx:197-206` for spawn-position de-duplication. It just isn't threaded into the coat lookup yet.

**`useBullColor.ts` — extend `bullCoatFromSeed`:**

```ts
export function bullCoatFromSeed(seed: string, variantIndex = 0): BullCoat {
  const h = hashString(seed);
  const [hue, sat, baseLight] = COAT_HUES[h % COAT_HUES.length];
  // Same hue family across all of one winner's bulls; each repeat win
  // shifts lightness (and nudges saturation) so it's distinguishable
  // without leaving the family. Deterministic — no Math.random.
  const lightShift = (variantIndex * 17) % 40; // 0, 17, 34, 11(wrap), ...
  const light = Math.min(85, Math.max(18, baseLight - 15 + lightShift));
  const satShift = (variantIndex * 9) % 20;
  const sat2 = Math.min(80, Math.max(20, sat - 10 + satShift));
  return {
    baseColor: `hsl(${hue}, ${sat2}%, ${light}%)`,
    spotSeed: ((h >> 8) % 1000) / 1000 + variantIndex * 0.13, // also nudge spot placement
    spotIntensity: 0.35 + (((h >> 16) % 100) / 100) * 0.45,
  };
}
```

Note the comment at `useBullColor.ts:1-5` ("repeat winners' bulls match (PRD US-004)") is now stale and should be rewritten to describe the new family+variant behavior — leaving it as-is would misdescribe the function to the next reader.

**`BullHerd.tsx` — thread `index` into both coat call sites:**

- `instanceAttrs` memo (~L217-222): `bullCoatFromSeed(tobu.bull_pattern_seed, index)` — `index` is already destructured from `indexed.forEach(({ tobu, index }, i) => ...)`.
- Color-set effect (~L246-263): same — `bullCoatFromSeed(tobu.bull_pattern_seed, index).baseColor`.

No `bull_pattern_seed` data migration needed — the seed string itself is unchanged; the variant comes from the client-computed occurrence index, which is already deterministic (order of approved Tobus in Firestore, stably sorted by the existing query).

**Risk:** `perWinner` index order depends on Firestore query order. If that order isn't stable (e.g., no explicit `orderBy`), two page loads could theoretically assign variant 0/1 to different documents for the same winner, causing the shade to "flip" between reloads even though it stays internally consistent within a session. Check `src/firebase/tobus.ts`'s `subscribeToTobus` query for an explicit `orderBy('created_at')` (or add one) to guarantee stable variant assignment across reloads.

---

## 4. Design tokens (P0-3)

**Files:** new `src/styles/tokens.css`, `src/App.css` (refactor to consume), `src/App.tsx` (import)

Single stylesheet today (`App.css`, confirmed — no per-component CSS files exist). Add a tokens file imported before `App.css`:

```css
/* src/styles/tokens.css */
:root {
  /* Spacing — 4px base grid, common across Polaris/Gestalt/Evergreen */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;

  /* Elevation */
  --shadow-modal: 0 10px 40px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.12);

  /* Type scale — capped at 6 sizes per PRD acceptance criterion */
  --font-size-h1: 22px;
  --font-size-h2: 18px;
  --font-size-h3: 16px;
  --font-size-h4: 13px;
  --font-size-body: 14px;
  --font-size-small: 12px;

  /* Color roles — Barcelona palette stays the brand story; these are usage roles, not new colors */
  --color-brand-red: #D50032;
  --color-brand-yellow: #FFCD00;
  --color-brand-blue: #004D98;
  --color-surface: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #6b6b6b;
  --color-backdrop: rgba(0, 0, 0, 0.4);

  /* Motion (P1-1, defined now so P0 work can already reference it) */
  --transition-fast: 120ms ease;
  --transition-modal: 200ms ease;
}
```

**Refactor scope in `App.css`:** every hardcoded `border-radius`, `box-shadow`, `padding`, `font-size`, and brand hex currently duplicated across `.speech-content`, `.roster-picker/.roster-card`, `.barn-form`, `.admin-*`, `.leaderboard-*` (exact selector list to be confirmed via a full read of `App.css` at implementation time — the file is ~370+ lines per the `barn-form` reference found at line 371) gets swapped for the matching `var(--token)`. This is mechanical, file-wide find/replace work, not a design decision — flag any panel whose current spacing doesn't cleanly map to the 4px scale for a quick visual call rather than force-fitting it.

**Verification:** `mcp__Claude_Preview__preview_inspect` on each modal's root element (`.speech-content`, `.roster-card`, `.barn-form`, `.admin-panel`, `.leaderboard-card`, etc.) confirming `border-radius`/`box-shadow` match the token values, at both mobile (375×812) and desktop preview widths.

---

## 5. Roster picker → searchable dropdown (P0-4)

**Files:** `src/components/RosterPicker.tsx`, `src/App.css`

Custom combobox pattern (per the chosen "custom searchable dropdown" option) — no new dependency, built on existing React state:

```tsx
export function RosterPicker() {
  const setUserName = useFarmStore((s) => s.setUserName);
  const setGuest = useFarmStore((s) => s.setGuest);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROSTER;
    return ROSTER.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  // Close on outside click/tap
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // ... trigger input opens dropdown on focus; arrow-key nav over `filtered`;
  // Enter selects highlighted item; Escape closes.
}
```

Structural change from today: the `<ul className="roster-list">` currently renders unconditionally (always-visible list). It becomes conditionally rendered (`{isOpen && <ul className="roster-dropdown" role="listbox">...}`), absolutely positioned under the trigger input, `max-height` + `overflow-y: auto` for the 70-name scroll, `z-index` above the rest of `.roster-card`.

**Acceptance-criteria-driving details:**
- Keyboard: track a `highlightedIndex` in state; `ArrowDown`/`ArrowUp` move it within `filtered`, wrapping or clamping at bounds; `Enter` commits `filtered[highlightedIndex]`.
- Touch: no special handling needed beyond native scroll inside the `max-height` container.
- Selecting a name: `setSelected(name); setQuery(name); setIsOpen(false);` — mirrors today's `onClick` handler on list items, just now also closing.
- Downstream `handleConfirm`/`handleSkip` logic (`RosterPicker.tsx:18-28`) is unchanged.

---

## 6. Barn procedural detail pass (P0-2)

**File:** `scripts/generate-models.mjs` — `barn()` function only (L179-189)

Add to the existing `MeshBuilder` call chain, reusing existing palette keys (no new colors needed):

```js
function barn() {
  const b = new MeshBuilder();
  b.box('red', 4.2, 2.4, 3.4, 0, 1.2, 0);
  b.prism('blue', 4.7, 1.5, 4.1, 0, 2.4, 0);          // WIDENED roof for a visible eave overhang (was 4.4×3.8)
  b.box('white', 1.2, 1.5, 0.15, 0, 0.75, 1.72);      // door
  b.box('yellow', 0.7, 0.7, 0.12, 0, 2.75, 1.78);     // hayloft window
  b.box('white', 0.16, 0.9, 0.16, -1.6, 0.45, 1.74);  // door posts
  b.box('white', 0.16, 0.9, 0.16, 1.6, 0.45, 1.74);
  b.box('white', 4.3, 0.18, 3.5, 0, 2.34, 0);         // eave trim band
  // NEW — siding plank lines (thin horizontal trim strips on the front facade)
  for (const y of [0.5, 0.95, 1.4, 1.85]) {
    b.box('darkWood', 4.25, 0.04, 3.44, 0, y, 0);
  }
  // NEW — second window, gable end (side wall)
  b.box('yellow', 0.12, 0.5, 0.5, 2.14, 1.5, -0.4);
  b.box('white', 0.14, 0.55, 0.55, 2.16, 1.5, -0.4);  // window frame trim (behind, slightly larger)
  // NEW — small roof chimney
  b.box('darkWood', 0.35, 0.55, 0.35, 1.2, 3.05, 0.3);
  b.box('dark', 0.42, 0.1, 0.42, 1.2, 3.35, 0.3);     // chimney cap
  return b;
}
```

Exact offsets above are a starting point, not final — visual iteration against the flat-shaded low-poly style happens by running `node scripts/generate-models.mjs` and checking the result in the preview, per PRD Open Question on "which 3-4 details make the cut."

**Verification:** regenerate, confirm `public/models/barn.glb` file size stays small (existing GLBs are 2–5.4KB; a detail pass should stay well under 10KB — no textures, no NORMAL attribute per the file's own documented convention at L1-11), then visual check in preview.

---

## 7. Pasture auto-scale (P0-1)

**Files:** new `src/scene/farmLayout.ts`, `src/scene/BullHerd.tsx`, `src/scene/Farm.tsx`

This is the highest-surface-area change — it touches four independent pieces (wander bound, fence ring, scenery ring, camera distance) that today are four separately hardcoded constants/arrays.

**New shared module `src/scene/farmLayout.ts`:**

```ts
import { hashString, mulberry32 } from '../hooks/useBullColor';

const BASE_BOUND = 14;       // today's fixed pasture half-width
const BASE_COUNT = 13;       // herd size the current constants were tuned for
const SCENERY_MARGIN = 3;    // scenery ring sits this far outside the pasture fence

/** Sub-linear growth so a 3x herd doesn't demand a 3x-wider farm. */
export function computePastureBound(approvedCount: number): number {
  const growth = Math.sqrt(Math.max(approvedCount - BASE_COUNT, 0) / BASE_COUNT);
  return Math.min(40, BASE_BOUND + growth * 8); // clamp — see Open Question on final formula
}

export interface FenceSegment { position: [number, number, number]; rotY: number }

/** Same 7-unit-segment fence convention as today, generalized to any bound. */
export function computeFenceSegments(bound: number): FenceSegment[] {
  const segments: FenceSegment[] = [];
  const step = 7;
  const half = Math.round(bound / step) * step; // snap to segment-width multiples
  for (let x = -half + step / 2; x < half; x += step) {
    segments.push({ position: [x, 0, -half], rotY: 0 });
    segments.push({ position: [x, 0, half], rotY: 0 });
    segments.push({ position: [-half, 0, x], rotY: Math.PI / 2 });
    segments.push({ position: [half, 0, x], rotY: Math.PI / 2 });
  }
  return segments;
}

export interface ScenPlacement { position: [number, number, number]; rotY: number; scale: number }

/** Deterministic ring of scenery just outside the fence — replaces the
 *  hand-authored TREE/BUSH/ROCK_PLACEMENTS arrays so scenery always
 *  tracks the pasture size instead of being tuned for one herd count. */
export function computeSceneryRing(
  bound: number, kind: 'tree' | 'bush' | 'rock', count: number,
): ScenPlacement[] {
  const rng = mulberry32(hashString(kind));
  const radius = bound + SCENERY_MARGIN + rng() * 6;
  const placements: ScenPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.5;
    placements.push({
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      rotY: rng() * Math.PI * 2,
      scale: 0.9 + rng() * 0.35,
    });
  }
  return placements;
}

export function computeCameraMaxDistance(bound: number): number {
  return Math.max(30, bound * 1.2);
}
```

**`BullHerd.tsx` change:** `PASTURE_BOUND` constant (L38) becomes a value derived from `count` — replace with `const pastureBound = computePastureBound(count) - 1;` (the `-1` preserves today's fence-vs-wander margin) and use `pastureBound` everywhere `PASTURE_BOUND` is referenced (`pickTarget`, L72-73).

**`Farm.tsx` change:** `Fences()` and `Scenery()` currently take no props and use hardcoded arrays (`TREE_PLACEMENTS` etc., L50-78). They need the live approved-Tobu count — pull it from `useFarmStore((s) => s.tobus)` (filtered to `status === 'approved'`, matching `BullHerd.tsx`'s existing `indexed` filter) and call `computePastureBound(count)` to derive `bound`, then pass to `computeFenceSegments(bound)` / `computeSceneryRing(bound, 'tree', 8)` etc. Replace the hand-authored `TREE_PLACEMENTS`/`BUSH_PLACEMENTS`/`ROCK_PLACEMENTS` constants entirely.

**`Farm.tsx` `<OrbitControls>` change:** `maxDistance={30}` (L202) becomes `maxDistance={computeCameraMaxDistance(bound)}`, `bound` computed once in `Farm()` and threaded to `<Fences bound={bound} />`, `<Scenery bound={bound} />`, and the `OrbitControls` prop.

**Consideration — duplicated count-filtering logic.** Both `BullHerd.tsx` and `Farm.tsx` will independently filter `tobus` to `status === 'approved'` and derive a count/bound. Either accept the small duplication (both are cheap `Array.filter` calls, count is small — max ~50-100 realistic) or lift `approvedCount` into a Zustand selector/derived value once. Given the store already holds `tobus` directly, a small selector helper (`selectApprovedCount(state)` in `useFarmStore.ts`) avoids the duplication cleanly — recommended if touching `useFarmStore.ts` isn't otherwise out of scope for this pass.

**Ground plane:** stays at the existing `400×400` — already far larger than any realistic `computePastureBound` output (clamped to 40), no change needed.

---

## 8. Term 2/3 Firestore seed (P0-7)

**Files:** new `data/seed-term-2-3.json`, `scripts/seed-real.ts` (small parametrization)

**Data file** — 14 entries transcribed from `docs/tobu-winners-full-list.md` (Term 2 entries 14–22 minus the disputed Week 19, Term 3 entries 23–26 plus the Steph Charouk year-end honor):

```json
[
  {
    "winner_name": "Keita Suzuki",
    "story": "Poll winner (37 votes) — \"Let me protect the dignity of Japan.\"",
    "commentary": "Escalated a joke into a matter of national honor. Nobody asked him to personally defend Japan's dignity that day, and yet he suited up anyway.",
    "date": "2026-01-16",
    "term": 2,
    "submitted_by": "Steph Charouk"
  }
  // ... remaining 13 entries, same shape, transcribed verbatim from the MD doc's
  // "Why" (-> story) and "Commentary" (-> commentary) fields.
]
```

`story` is populated from each entry's **Why** field (not a paraphrase — copy verbatim to avoid re-introducing the kind of factual drift this doc went through several correction rounds to remove).

**Script parametrization** — `scripts/seed-real.ts` currently hardcodes its data path (`join(__dirname, '../data/seed-real.json')`, L14 per earlier read). Change to accept an optional CLI arg so the same script seeds either file without risking a re-run duplicating Term 1:

```ts
const dataFile = process.argv[2] ?? 'seed-real.json';
const dataPath = join(__dirname, '../data', dataFile);
```

Add `package.json` script: `"seed:term23": "tsx scripts/seed-real.ts seed-term-2-3.json"`.

**Rollout order (matches PRD dependency note):** run *after* the `commentary` field exists on the `Tobu` type (§1) is merged, so the seed writes `commentary` on first pass rather than requiring a follow-up field backfill on the 13 already-seeded Term 1 documents. Term 1's 13 existing documents do **not** get commentary in this pass by default — if the PRD intends Term 1 to also get commentary for UI consistency (the speech bubble should arguably show it for winners like Guglielmo, Anobi, etc. too), that's a second small backfill: extend `data/seed-real.json` with a `commentary` value per entry (already drafted in the MD doc, entries 1–13) and re-run a one-off `updateDoc` pass analogous to the earlier Week-2-winner correction script (temporarily loosen `firestore.rules` to allow the field, patch, revert — same pattern used earlier in this project's history).

**Verification:** post-seed, `tobus` collection should contain 27 documents; confirm via the in-app leaderboard count or a quick `firebase firestore:get` / preview check.

---

## Cross-Cutting Risks & Notes

- **`useBullColor.ts` docblock is stale after §3** — update the comment describing "repeat winners match" intent (this is explicitly called out above, repeating here since it's easy to miss in a diff review).
- **Firestore query ordering** (§3 risk) should be confirmed/fixed before P0-6 ships, or repeat-winner shades could flicker between which win gets which variant across reloads.
- **No new npm dependencies** are required for any of P0-1 through P0-7 — everything is built on the existing React/Three.js/Zustand/Firestore stack, consistent with the PRD's non-goal of not adopting a third-party design system.
- **Testing approach:** this project has no automated test suite based on current tooling (`npm run lint` only, per `package.json`). Verification for this spec is manual, browser-preview-based, per the existing pattern used throughout this project's history (screenshot + `preview_inspect` + `preview_console_logs` checks before calling any UI work done).
- **Suggested implementation order** (mirrors PRD): §1 schema → §8 seed → §2 speech bubble → §3 coat variants → §7 pasture auto-scale → §5 roster dropdown → §4 design tokens (last, sweeps up everything touched above) → §6 barn detail (independent, parallelizable at any point).
