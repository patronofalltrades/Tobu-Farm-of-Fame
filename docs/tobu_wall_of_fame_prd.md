# TOBU WALL OF FAME 🐂

**Product Requirements Document**
IESE MBA 2027 — Barcelona Section
March 2026 · Version 1.1

---

## Document Overview

| Field | Details |
|---|---|
| Product Name | Tobu Wall of Fame |
| Target Audience | IESE MBA 2027 Barcelona Section (~70–80 students) |
| Platform | **Web (Progressive Web App)** — installable on iOS, Android, and desktop via "Add to Home Screen" |
| Framework | **React + Vite + TypeScript**, rendered with **React Three Fiber (Three.js)** |
| Backend | **Firebase Firestore** (+ Storage for photos) |
| Timeline | A few weeks — no hard deadline |
| Budget | No app-store fees. Hosting on a free-tier static host (e.g. Firebase Hosting, Vercel, Netlify). Custom domain optional. |
| Admin | Class rep (currently Steph Charouk) via shared PIN |

---

## 1. Product Vision

Tobu is the IESE MBA 2027 Barcelona Section's mascot — a plushie bull (Toro) awarded weekly to a section member who made a hilarious comment, a memorable gesture, or a meaningful contribution to the class.

The Tobu Wall of Fame is the permanent, living record of every Tobu winner: a digital bull farm where each award "births" a new animated bull into a shared pasture.

It is not a feed. It is not a list. It is an experiential, Animal Crossing-inspired 3D farm that section members can explore, tap around, and revisit — during the program and long after graduation.

It should feel playful, irreverent, and unmistakably Barcelona.

---

## 2. Core Concept: The Bull Farm

The entire app is a single 3D farm scene. Everything lives on the farm. There are no tabs, no navigation bars, no separate screens. **The farm is the app.**

### 2.1 The Farm Scene

- A smooth low-poly **3D** farm rendered with React Three Fiber, with flat shading and a toy-like aesthetic
- Mobile-first, portrait orientation priority — pan/orbit camera tuned for touch
- Barcelona / Catalonia color palette: red `#D50032`, yellow `#FFCD00`, blue `#004D98` (FC Barcelona + Senyera flag)
- Sized to comfortably hold one term's worth of bulls (~12–13). Pre-populated with Term 1 and Term 2 winners at launch; Term 3 bulls added as they're awarded
- Estimated total capacity: ~36–40 bulls across the full program
- Ambient farm sounds play in the background (via Howler); bulls moo when tapped

### 2.2 The Bulls (Tobus)

- Each Tobu award = one new bull "born" onto the farm
- Each bull represents one single winning moment (not a week's bundle)
- Bulls are smooth low-poly 3D models with idle walking animations
- Rendered via **`InstancedMesh`** (shared geometry) for performance — per-instance color/pattern attributes give each winner a unique look
- Each winner gets a unique color/pattern generated deterministically from their roster identity. Repeat winners share the same pattern across all their bulls, making them visually identifiable at a glance
- Bulls wander the farm autonomously (simple idle animation)

### 2.3 Tap Interaction: Speech Bubbles

Tapping a bull pops up a speech bubble (via `@react-three/drei`'s `<Html>`) showing:

- The quote or story (tweet-length, one-liner) — a direct quote or a description of the moment
- Who said it / who won the Tobu
- Emoji reactions (aggregate counts + ability to add your own)

Tapping outside the speech bubble dismisses it. No comments, no threading — just the moment and reactions.

---

## 3. Farm Landmarks & Navigation

Since the farm is the entire app, key features are accessed through interactive 3D structures on the farm itself. UI overlays use HTML layered above the canvas, with shared state via **Zustand**.

### 3.1 The Barn (Submit a Tobu)

- Tapping the barn opens a submission form overlay
- Fields: Winner's name (select from roster), the quote/story (short text), optional photo upload
- Submissions enter a pending queue in Firestore for admin approval
- Once approved, a new bull is "born" onto the farm with an animation

### 3.2 The Scoreboard Signpost (Leaderboard)

- A wooden signpost on the farm
- Tapping it opens an overlay showing a ranked list of section members by number of Tobu wins
- Displays winner name, win count, and their unique bull color/pattern

### 3.3 Tobu (Mascot Centerpiece)

A larger, distinct Tobu bull as the visual star of the farm — prominently placed. This is the mascot, not a specific award — it's always on the farm.

---

## 4. User Identity & Access

### 4.1 Viewing (No Login Required)

Anyone with the URL can open the PWA and explore the farm. No login, no access code, no friction. The farm is a public showcase.

### 4.2 Interacting (Roster-Based Identity)

- On first visit, users pick their name from a pre-loaded class roster (~70–80 names)
- No password, no email — just name selection
- This identity is used to tag submissions and emoji reactions
- Stored in `localStorage`; no account management needed

### 4.3 Admin Access (PIN-Based)

- A shared admin PIN, entered via a hidden gesture or settings panel on the farm
- Admin can approve/reject pending Tobu submissions
- Admin is currently Steph Charouk (class rep) but the PIN can be shared

---

## 5. Data & Pre-Population

### 5.1 Pre-Populating Term 1 & Term 2 Winners

The farm should launch with all past Tobu winners already present as bulls (~24–26 bulls from the first two terms).

**Data source:** Tobu nominations and winners have historically been decided via polls in the section's WhatsApp group chat. The project includes a one-time data extraction workstream:

- Build an agent or script to scroll through WhatsApp group chat history, capture screenshots of Tobu polls, extract winner data via OCR
- Output: structured list of winner name, date/week, and the winning quote or story

### 5.2 Ongoing Data Entry (Term 3+)

Going forward, new Tobu winners are submitted manually through the barn and approved by the admin. The WhatsApp nomination process continues as-is — the app is the archive, not the ballot box.

### 5.3 Data Model (Per Tobu Entry)

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `winner_name` | Name of the Tobu recipient (from roster) |
| `story` | The quote or description (tweet-length, max ~280 characters) |
| `photo_url` | Optional photo of the moment (Firebase Storage) |
| `date` | Date the Tobu was awarded |
| `term` | Term 1, 2, or 3 |
| `bull_pattern_seed` | Deterministic seed tied to winner for consistent bull color/pattern |
| `reactions` | Map of emoji types to counts and user IDs |
| `status` | `pending` / `approved` / `rejected` |
| `submitted_by` | Name of the person who submitted the entry |

---

## 6. Design & Art Direction

### 6.1 Visual Style

- **Smooth low-poly 3D**, flat shading, toy-like (Animal Crossing meets Monument Valley)
- Low-poly bulls with idle walking animations
- Warm, inviting farm environment — grass, fences, barn, signpost, sky
- Use `@react-three/drei`'s `<Environment>` for soft lighting

### 6.2 Color Palette

- Primary red: `#D50032` (Catalonia / FC Barcelona)
- Primary yellow: `#FFCD00` (Senyera flag)
- Primary blue: `#004D98` (FC Barcelona)

These inform the barn, signpost, UI accents, and farm decorations.

### 6.3 Audio (Howler)

- Ambient farm background loop (birds, wind, gentle countryside)
- Moo sound effect when a bull is tapped
- Optional: celebratory sound when a new bull is born onto the farm

### 6.4 Tone & Personality

Playful, irreverent, emoji-friendly. This is a celebration of inside jokes and classroom chaos — not a corporate app. Copy, labels, and micro-interactions should reflect humor and warmth.

---

## 7. Technical Architecture

### 7.1 Frontend Stack

- **React** (functional components + hooks only)
- **Vite** for dev server and bundling
- **TypeScript** in strict mode — **no `any`**
- **React Three Fiber** + **`@react-three/drei`** (`OrbitControls`, `Html`, `useGLTF`, `Environment`) for the 3D scene
- **Zustand** for shared state between the 3D scene and HTML UI overlays
- **Howler** for audio playback
- PWA manifest + service worker for installability and offline-first asset caching

### 7.2 Backend & Database

- **Firebase Firestore** for the entries collection, with real-time subscriptions so new approved bulls appear live
- **Firebase Storage** for optional submission photos
- **Firebase Hosting** (or Vercel/Netlify) for static PWA delivery
- Lightweight, serverless, free-tier friendly for ~80 users
- Should be low-maintenance enough to survive post-graduation without active upkeep

### 7.3 Performance

- Use **`InstancedMesh`** for rendering all bulls (shared geometry, per-instance color)
- Lazy-load GLTF assets via `useGLTF`
- Mobile-first: target 60fps on a mid-range phone in portrait

### 7.4 Longevity Consideration

The PWA should still work after graduation in 2027 as a keepsake. This means:

- Avoid infrastructure that requires active maintenance or payment monitoring
- Prefer serverless backends with generous free tiers
- Consider exporting all data as a static JSON snapshot the app can fall back to if Firestore ever goes offline
- No app-store review process to keep the app "alive" — just keep the static bundle hosted somewhere

### 7.5 Distribution

- Hosted at a public URL (e.g. `tobu.iese2027.com` or a free `*.web.app` / `*.vercel.app` subdomain)
- Shared with the section via WhatsApp link
- Installable to home screen on iOS and Android via PWA "Add to Home Screen" — looks and feels like a native app, no store gatekeeping
- **No Apple Developer or Google Play accounts required**

---

## 8. WhatsApp Data Extraction (One-Time)

This is a separate workstream to pre-populate the farm with Term 1 and Term 2 winners.

### 8.1 Approach

- Export or scroll through the section's WhatsApp group chat
- Identify Tobu nomination polls and their results
- Extract: winner name, date/week, winning quote or story
- Methods to explore: WhatsApp chat export + text parsing, or screenshot-based OCR extraction via an agent

### 8.2 Output

A structured JSON or CSV file with all historical Tobu winners, ready to be imported into Firestore as seed data.

### 8.3 Scope

One-time effort. Once the data is extracted and imported, all future Tobu entries are submitted manually through the app.

---

## 9. MVP Scope & Phasing

### 9.1 MVP (Launch)

- 3D farm scene with touch-friendly camera controls
- Pre-populated bulls for Term 1 and Term 2 winners
- Tap-to-reveal speech bubbles with story, winner name, and emoji reactions
- Barn: submission form with admin approval queue (PIN-based)
- Scoreboard signpost: leaderboard overlay
- Roster-based identity (pick name on first visit)
- Ambient audio + moo on tap
- Unique bull color/pattern per winner
- PWA manifest + installable to home screen

### 9.2 Post-Launch (Nice to Have)

- New bull "birth" animation when an entry is approved
- Web Push notification to the section when a new Tobu is awarded
- Static JSON snapshot export for long-term preservation
- Seasonal farm decorations (holiday themes, etc.)

---

## 10. Success Metrics

- **Adoption:** >50% of the section opens the PWA within the first two weeks of launch
- **Engagement:** Emoji reactions are used on >70% of Tobu entries
- **Completeness:** All Term 1 and Term 2 winners are successfully pre-populated at launch
- **Delight:** Section members voluntarily share the link or show it to people outside the section

---

## 11. Open Risks & Questions

- **WhatsApp data extraction:** Feasibility depends on chat export availability and data quality. May require manual cleanup.
- **3D art assets:** Low-poly bull and farm environment models need to be created or sourced (e.g. Sketchfab, Kenney.nl, or commissioned). This is a significant design dependency.
- **iOS PWA limitations:** iOS Safari has historically restricted some PWA features (push notifications only since iOS 16.4, audio autoplay quirks). Test early on iOS.
- **Roster maintenance:** If new students join or names need correcting, there's no self-service mechanism — requires a Firestore update.
- **Post-graduation longevity:** Free-tier backends can change pricing or terms. A data export feature mitigates this risk.
