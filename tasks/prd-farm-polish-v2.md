# PRD — Farm Polish v2

**Status:** Draft for review
**Owner:** Hanif Ramadhan
**Related:** [docs/tobu-winners-full-list.md](../docs/tobu-winners-full-list.md), `tasks/tech-farm-visual-rehaul.md` (prior PRD, US-001–US-005), Firestore project `tobu-s-farm-of`

---

## Problem Statement

The farm shipped its visual rehaul (walking bulls, procedural coats, scenery, chrome polish) and went live with 13 of 27 known Tobu entries seeded. Three things are now visibly out of step with where the project has grown:

1. **The pasture is running out of room.** It was tuned for ~13–26 bulls; at 27 (all three terms) bulls will visibly crowd and overlap near the landmarks.
2. **The UI overlays (roster picker, speech bubble, admin panels) were built fast and functionally, not to any consistent visual system** — spacing, type scale, and interaction patterns vary panel to panel.
3. **Every repeat winner's bulls are currently indistinguishable from each other** (same coat, by original design intent) — which undersells the fact that winning Tobu twice is a bigger deal than winning it once, and makes the herd read as less varied than the real roster of 26 distinct people.

Additionally, the section now has a fully verified, funny commentary track for every historical win (`docs/tobu-winners-full-list.md`) that has no home in the live product — it only exists as an internal reference doc.

## Goals

1. **The pasture scales with the roster, not the other way around** — no manual re-tuning needed as more terms get added over the program's remaining life.
2. **Every UI overlay in the app shares one small, documented set of design tokens** (spacing, type scale, radius, elevation, color usage) derived from patterns common across mature design systems, applied without diluting the existing Barcelona-palette brand identity.
3. **A user can tell, at a glance in the herd, which bulls belong to a repeat winner** — same "family" identity, distinguishable per win.
4. **Every Tobu's speech bubble surfaces its commentary line**, not just the raw quote — making the bubble the payoff moment the section actually wants to screenshot.
5. **The full roster (27 Tobus across 3 terms) is live in Firestore**, closing out the last seeding gap.

## Non-Goals

- **Hand-modeling any asset in Blender/an external 3D tool.** Barn polish stays inside the existing procedural pipeline (`scripts/generate-models.mjs`) — a new asset workflow is a separate, larger initiative.
- **Redesigning the app's information architecture.** No new screens, no nav — the "farm IS the app" principle from the original CLAUDE.md holds. This is a token/detail pass, not a rebuild.
- **Adopting any single third-party design system wholesale** (e.g. swapping in Chakra UI or Polaris components). The `awesome-design-systems` list is inspiration for *patterns*, not a dependency to install.
- **Per-user coat customization or bull "collecting" mechanics.** The recolor work in this spec is deterministic and automatic (seeded), not user-configurable.
- **Retroactively rewriting the disputed Week 19 (4 Mar 2026, Igor) or filling the flagged skipped weeks** (3/7 Nov 2025, 13/20 Feb 2026). Those stay open per `docs/tobu-winners-full-list.md`.

## User Stories

- As a section member browsing the farm, I want the pasture to comfortably fit all 27 bulls without them visibly stacking on the barn or each other, so the farm still feels alive rather than crowded.
- As a section member tapping a bull, I want to see the witty commentary alongside the original quote, so the speech bubble is actually worth screenshotting into the group chat.
- As a section member picking my name to react, I want a proper dropdown I can scroll or search through, so finding my name among 70 people is fast on mobile.
- As a repeat Tobu winner (e.g. Guglielmo, Kunal, Akshat, Lewis, Stephanie, Keita, Thomas), I want my second bull to look like *mine* but visibly different from my first, so both wins are represented, not deduplicated.
- As the admin, I want the full 27-entry roster live in Firestore, so the leaderboard and herd reflect the section's real history, not a partial seed.
- As any user on a mobile device, I want every overlay (roster picker, admin panel, submission form, leaderboard) to feel like it belongs to the same app, not five different prototypes stitched together.

## Requirements

### Must-Have (P0)

**P0-1 — Pasture auto-scales with herd size**
- The fenced pasture bound (currently a hardcoded ±13/±14) is computed from the live count of approved Tobus, not a constant.
- Acceptance criteria:
  - [ ] Given 13 approved Tobus, pasture bound renders equivalent to today's ±14 (no visual regression at current scale).
  - [ ] Given 27 approved Tobus, pasture bound expands enough that average nearest-neighbor bull spacing stays within the same band as it is today at 13 bulls (no denser packing).
  - [ ] Fence ring, ground plane, scenery placements, and camera `maxDistance` all derive from or accommodate the same computed bound — no visual seam between fenced pasture and the outer scenery ring at any herd size from 13–50.
  - [ ] Landmark exclusion zones (barn/mascot/signpost) remain proportionally unchanged.

**P0-2 — Barn model gets a procedural detail pass**
- Stays inside `scripts/generate-models.mjs` / `MeshBuilder`. Adds geometric detail without changing the low-poly flat-shaded style or the existing palette.
- Acceptance criteria:
  - [ ] Barn adds at least: roof overhang (eave extends past wall silhouette), visible siding/plank line detail (via secondary boxes, not textures), a second window or shutter detail, and a subtle chimney or roof vent.
  - [ ] Poly count increase stays modest — no texture maps, no NORMAL attribute (keep the flat-shaded toy look per existing convention).
  - [ ] Regenerating via `node scripts/generate-models.mjs` produces `public/models/barn.glb` with no manual post-processing step required.

**P0-3 — Design tokens applied across all overlay UI**
- A single token set (spacing scale, type scale, radius, shadow/elevation, color roles) is defined once and consumed by every overlay: topbar, speech bubble, roster picker, barn submit form, admin PIN gate, admin panel, leaderboard, intro toast.
- Acceptance criteria:
  - [ ] One canonical source of tokens (CSS custom properties in `App.css` or a new `tokens.css`) — no panel defines its own one-off spacing/radius/font-size values outside the scale.
  - [ ] Every modal/overlay uses the same corner radius, shadow, and backdrop treatment.
  - [ ] Type scale has a defined, limited set of sizes (no more than 5–6 distinct font sizes across the whole app).
  - [ ] Barcelona palette (`#D50032` / `#FFCD00` / `#004D98`) remains the dominant brand color story — tokens organize *how* it's used, not replace it.
  - [ ] Visually verified in the browser preview at both mobile (375×812) and desktop widths.

**P0-4 — Roster picker becomes a searchable dropdown**
- Replace the current always-expanded search+button-list with a closed-by-default dropdown control that opens on tap, supports type-to-filter, and closes on selection or outside tap.
- Acceptance criteria:
  - [ ] Default state shows a single closed control (placeholder "Search your name…" or similar), not a full list.
  - [ ] Tapping/focusing opens the dropdown; typing filters the ~70-name roster live.
  - [ ] Selecting a name closes the dropdown and populates the control.
  - [ ] Keyboard navigable (up/down + enter) for desktop; touch-scrollable on mobile.
  - [ ] Existing "Continue as {name}" / "Skip for now" flow is unchanged downstream of selection.

**P0-5 — Speech bubble shows commentary**
- `Tobu` type gains an optional `commentary` field. Firestore rules updated to allow it. Speech bubble renders it below the story quote, styled at heading-4 scale, visually distinct (smaller/lighter) from the primary story text.
- Acceptance criteria:
  - [ ] `commentary` is optional on the `Tobu` type — bulls without one (e.g. future user-submitted Tobus that skip it) render the bubble exactly as today, no broken layout.
  - [ ] Where present, commentary renders as its own line/block below the story quote, using an h4-equivalent size (visually smaller than the winner name h2 and the story text).
  - [ ] Firestore `create` rule is updated to permit the new optional field without weakening existing validation (status/story-length/term checks untouched).
  - [ ] `BarnSubmit` (new user submissions) does not collect a commentary field — commentary is reserved for the curated historical seed, not user input. New submissions render without it.

**P0-6 — Repeat winners get a shared-family, distinct-shade coat**
- `bull_pattern_seed` generation changes so that: (a) all of one winner's bulls share a coat *hue family* (recognizable as the same person), and (b) each individual win within that family gets a distinct shade/lightness variant so repeat wins are visually distinguishable from each other.
- Acceptance criteria:
  - [ ] For a winner with N wins, all N bulls share the same base hue (±small tolerance) from `COAT_HUES`.
  - [ ] Each of the N bulls has a measurably different lightness/saturation (or spot pattern) so no two of that winner's bulls are pixel-identical.
  - [ ] Single-win winners are visually unaffected — no regression to the 19 winners who've only won once.
  - [ ] Deterministic: reloading the app never reshuffles which shade belongs to which win (same input → same output, per existing seeded-PRNG convention).

**P0-7 — Full 27-entry roster seeded to Firestore**
- Terms 2 and 3 (14 remaining entries — 9 + 4 weekly wins and the year-end honor — from `docs/tobu-winners-full-list.md`, excluding the disputed Week 19) are seeded via the existing `scripts/seed-real.ts` pattern, including the new `commentary` field.
- Acceptance criteria:
  - [ ] `data/seed-real.json` (or a new `seed-term-2-3.json`) contains all confirmed Term 2 + Term 3 entries with `winner_name`, `story`, `commentary`, `date`, `term`, `submitted_by`.
  - [ ] Disputed Week 19 (4 Mar 2026, Igor) is excluded — not seeded as a Tobu.
  - [ ] Seed run produces exactly 14 new `approved` documents in the `tobus` collection (13 already-seeded Term 1 + 14 new = 27 total).
  - [ ] Verified live in the running preview: herd count and leaderboard reflect 27 entries post-seed.

### Nice-to-Have (P1)

- **P1-1 — Motion tokens.** Standardize transition durations/easings (modal open/close, dropdown open/close, toast) as part of the same token set, informed by the mobile-first, touch-optimized patterns common in the systems reviewed (Duolingo, Pinterest Gestalt).
- **P1-2 — Empty/loading states polish.** Apply the new token set to the "no matches" roster state and any Firestore loading states, currently minimally styled.
- **P1-3 — Coat shade legend.** A small visual key (e.g. in the leaderboard) showing that repeat winners have multiple shades, so the pattern is discoverable rather than only implicit.

### Future Considerations (P2)

- **P2-1 — User-submitted commentary.** If the community wants to add witty commentary to their own `BarnSubmit` entries later, the `commentary` field is already schema-ready; this spec intentionally keeps it curator-only for now.
- **P2-2 — Per-landmark procedural detail passes.** The same "more geometric detail, same pipeline" treatment applied to barn (P0-2) could extend to the signpost and mascot in a future pass.
- **P2-3 — Dynamic camera distance.** As the pasture auto-scales (P0-1), a future pass could also auto-adjust default camera `position`/`maxDistance` so a growing herd doesn't require the user to manually zoom out further over time.

## Success Metrics

Given this is an internal, ~70-person section app rather than a metered product, success is verified rather than measured over time:

- **Leading (verified at ship):**
  - All 7 requirements' acceptance criteria pass manual QA in the browser preview (mobile + desktop viewport) before merge.
  - Firestore `tobus` collection count == 27 post-seed, confirmed via `firebase firestore` query or the in-app leaderboard.
  - No console errors introduced in any touched component (per existing preview-verification workflow).
- **Lagging (check-in ~1–2 weeks post-ship, informal):**
  - Anecdotal: section members screenshot/share speech bubbles in the WhatsApp group (the commentary feature's actual success signal, given the app's use case).
  - No reported visual crowding complaints as more Tobus get added in future terms.

## Open Questions

- **[Design]** Exact procedural detail list for the barn (P0-2) — roof overhang + siding lines + chimney + second window is a reasonable default set, but final call on which 3–4 details make the cut is a quick visual iteration during implementation, not a blocking decision now.
- **[Engineering]** Auto-scale formula for P0-1 — e.g. `bound = 14 + sqrt(count / 13) * 6` vs. a simpler step function (14 → 20 → 28 at fixed count thresholds). Needs a quick spike to see which reads better visually; not blocking spec approval.
- **[Product]** Should the P1-3 "coat shade legend" ship in this pass or genuinely wait — it's borderline P0-adjacent since without it, most users won't consciously notice the repeat-winner distinction P0-6 creates. Flagging for a lightweight decision at kickoff, not deferring the whole spec on it.

## Timeline Considerations

- No hard external deadline. Internally sequenced to land before the section's next natural "moment" (e.g., a class session or social event) where re-sharing the app would have peak visibility — Hanif to confirm target date at kickoff.
- **Dependency chain:** P0-7 (seed data with `commentary`) should land *after* P0-5 (schema change + Firestore rule update) is deployed, so the seed script can write the field on first pass rather than requiring a second migration.
- **Suggested phase order:** P0-5 (schema/rules) → P0-7 (seed) → P0-6 (coat shading, needs full 27-entry data to be meaningful) → P0-1 (pasture auto-scale, best tuned against the full real herd) → P0-4 (roster dropdown) → P0-3 (design tokens, touches everything, do last so it can sweep up all previously-touched components) → P0-2 (barn detail, independent, can run in parallel with any of the above).
