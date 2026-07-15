# E2E Report — Tobu Load Screen + Random Moo Sounds

**Date:** 2026-07-15 · **Branch:** `audio-load-screen` · **Scope:** prd-tobu-load-screen (US-001–004) + prd-random-moo-sounds / trd-random-moo-sounds (US-001–004)
**Method:** live browser pane on the dev server, module-graph audio introspection via `getAudioDebug()`, offset-patched synthetic PointerEvents for bull raycasts, trusted click for the entry gesture.

## Verdict: **PASS** — both PRDs verified live. tsc / eslint / production build clean. Zero fresh console errors. Precache **shrank 47%** while gaining all real audio.

---

## Load screen (prd-tobu-load-screen)

| Check | Result |
|---|---|
| Splash renders immediately on cold load: v3 logo centerpiece, parchment bg + sunset wash, brand-red progress bar, "Rounding up the herd…" status | ✅ screenshot |
| `role="status"` live region while loading; CTA is a real button | ✅ |
| Ready-gate: CTA appears only after data + assets + **first rendered frame** (verified: CTA held back until rAF woke, then appeared) | ✅ |
| Min-display (1s) + 10s safety timeout wired (`LoadScreen.tsx` timers) | ✅ code + behavior |
| **Pre-entry audio fully dormant**: `unlocked:false, ambientPlaying:false, isMuted:true` — nothing plays before the gesture | ✅ |
| **Entry tap (trusted click)**: splash fades+unmounts, `unlocked:true`, `isMuted:false`, **`ambientPlaying:true`** — arrive with sound on | ✅ |
| Mute button reflects post-entry state ("Mute" label) and still pauses/resumes the ambience | ✅ |
| Mobile 375×812: logo centered, bar + status clean, portrait-first | ✅ screenshot |
| Reduced-motion: logo/CTA animations + fade gated in CSS | ✅ code-verified |
| Load screen sits above roster picker (z 300 > 200) — name pick happens after entry | ✅ code-verified |

## Random moos (prd-random-moo-sounds)

| Check | Result |
|---|---|
| 12 sequential `playMoo()` picks: `[2,1,2,1,0,2,0,1,2,1,2,1]` — **all 3 clips used, zero consecutive repeats** | ✅ |
| Cut-off: rapid double-call → exactly **1** moo playing | ✅ |
| Per-clip gain applied: volumes `[0.45, 0.40, 0.75]` (distant clip boosted, close-ups eased) | ✅ |
| Mute gate: while muted, `playMoo()` is a no-op (index unchanged, nothing playing) and ambient pauses; unmute resumes ambient | ✅ |
| **Real bull tap integration**: synthetic raycast click on the magenta bull → Guglielmo's bubble opened **and** a moo fired (`lastMooIndex` 2→0, 1 playing) — same `onClick` path as production fingers | ✅ |
| **Mama Tobu silent**: tap opens her info bubble, `lastMooIndex` unchanged, zero moos playing (structural — she never routes through `playMoo`) | ✅ |
| Placeholder `moo.wav`/`ambient.wav` deleted; `scripts/generate-audio.mjs` removed from repo + build chain | ✅ |

## Assets, precache, licensing

- `public/audio/`: `moo-1.mp3` (72K, Universfield/Pixabay) · `moo-2.mp3` (100K, KoiRoylers/Pixabay) · `moo-3.mp3` (17K, ElevenLabs) · `ambient-farm.mp3` (472K, ElevenLabs, 30s loop) — provenance in `public/audio/CREDITS.md` ✅
- Splash: `splash-logo.jpg` **32K** (512px JPEG from the v3 source; the 238K PNG attempt was rejected) ✅
- **Precache: 59 entries / 4738 KiB → 62 entries / 2519 KiB.** The three ~950K source logo PNGs were silently riding in the precache via the `png` glob; moved to `assets-src/` (out of `public/`). Net: real audio added AND the offline bundle nearly halved. ✅
- `sw.js` manifest confirmed: 4 mp3s + `splash-logo.jpg` present; zero `wav`, zero `tobus-farm-of-fame-logo*` entries ✅
- `maximumFileSizeToCacheInBytes` pinned at 2MB so future oversized assets fail loudly ✅

## Gates

| Gate | Status |
|---|---|
| tsc -b | ✅ |
| eslint --max-warnings=0 | ✅ |
| npm run build (audio generator removed from chain) | ✅ |
| Fresh console errors | ✅ zero (buffer holds only yesterday's stale mid-edit HMR entries) |

## Notes / carried-forward

- **Pane quirk, again**: rAF stays suspended until a trusted interaction, so the CTA (which waits for a real first frame) needed a wake-up click in the pane. On real devices rAF fires immediately — but this is exactly the class of thing task #8 (physical-device QA) should confirm, now with audio: **verify the entry tap starts the ambience on a real iPhone.**
- Synthetic bull raycasts require `offsetX/offsetY` patched onto PointerEvents (R3F reads offsets, which are 0 on synthetic events). Re-learned; recorded here (again) for future passes.
- Acoustic loudness balance (0.45/0.40/0.75) is code-verified only — the pane can't listen. Tune by ear on a real device if any clip sticks out.
