<div align="center">

# 🐂 Tobu Farm of Fame

**A living 3D bull farm celebrating every Tobu winner from the IESE MBA 2027 Barcelona Section.**

Each week, the section votes on who made the funniest comment, wildest gesture, or biggest contribution to the class. The winner receives Tobu — a plushie bull — for the week. Every award "births" a new bull onto this farm.

[🌐 Visit the Farm](https://tobu-farm-of-fame.vercel.app) · [📖 Read the PRD](docs/PRD.md)

</div>

---

## What is this?

Tobu Farm of Fame is a **real-time 3D web app** where every Tobu award winner lives as an animated bull on a shared pasture. Users can orbit, zoom, and explore the farm — tapping any bull to discover the story behind the moment.

It's not a feed. It's not a list. It's a farm. 🐂

### The Experience

- **Explore** — Orbit, pan, and zoom around a smooth low-poly 3D farm
- **Discover** — Tap any bull to reveal who won, what they said, and why it was legendary
- **React** — Drop a 😂 ❤️ 🔥 👏 or 🐂 on your favorite moments
- **Celebrate** — Watch the farm grow as new Tobu winners are added each week

### Farm Landmarks

| Landmark | What it does |
|----------|-------------|
| 🐂 **Mascot Tobu** | The star of the farm. Tap for the story behind Tobu. |
| 🏠 **The Barn** | Where new Tobu entries are added (admin only). |
| 🪧 **The Signpost** | Leaderboard — who's won Tobu the most? |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript + Vite |
| **3D Engine** | Three.js via React Three Fiber |
| **State** | Zustand |
| **Backend** | Firebase (Firestore + Storage) |
| **Audio** | Howler.js |
| **Hosting** | Vercel (PWA) |

### 3D Asset Pipeline

| Tool | Purpose |
|------|---------|
| Meshy / Tripo / Luma AI | Generate base bull model (text-to-3D) |
| Blender | Cleanup, poly reduction, export .glb |
| Kenney.nl | Farm environment assets (CC0) |
| InstancedMesh | Render 40+ bulls in a single draw call |

---

## Features

### Core
- 🌍 Real-time 3D farm with full orbit/pan/zoom controls
- 🐂 Each Tobu winner = one animated bull on the farm
- 💬 Tap a bull → speech bubble with the winning story + winner's name
- 😂 Emoji reactions (one per user per bull)
- 🏆 Leaderboard signpost (ranked by win count)
- 🎬 Cinematic camera intro on first visit
- 👆 Onboarding tap hint for new visitors
- 🔇 Ambient farm audio (muted by default) + moo on tap
- 📱 PWA — installable on home screen, works on desktop

### Admin
- 🔑 PIN-based admin access (gear icon)
- ➕ Add new Tobu entries via the barn
- ✏️ Edit or delete existing entries
- 📋 Pre-populated with Term 1 & 2 winners

### Design
- 🎨 Smooth low-poly 3D, flat shading (Crossy Road / Townscaper vibe)
- 🟡🔴🔵 Barcelona / Catalonia color palette (#D50032, #FFCD00, #004D98)
- 🐂 Each winner gets a unique bull color (deterministic from name)
- 📐 Portrait-first, responsive across all devices

---

## Architecture

```
src/
├── assets/          # 3D models (.glb), audio, images
│   ├── models/      # bull.glb, barn.glb, signpost.glb, mascot.glb
│   ├── audio/       # moo.mp3, ambient.mp3
│   └── images/      # tobu-logo.png, icons
├── components/      # React UI: SpeechBubble, NamePicker, BarnForm,
│                    # Leaderboard, LoadingScreen, MuteButton
├── scene/           # Three.js: Farm, BullHerd, Barn, Signpost,
│                    # Mascot, Fences, CameraIntro
├── firebase/        # Firestore config, tobus, roster, admin helpers
├── stores/          # Zustand stores (selected bull, admin, audio)
├── hooks/           # Custom React hooks
└── types/           # TypeScript interfaces
```

---

## Data Model

Each Tobu entry in Firestore:

```typescript
interface Tobu {
  id: string;
  winner_name: string;        // Full name from roster
  story: string;              // Tweet-length (max 280 chars)
  photo_url?: string;         // Optional
  date: string;               // Date awarded
  term: 1 | 2 | 3;
  bull_color_seed: number;    // Deterministic from winner_name
  bull_position: {x: number, z: number}; // Permanent once placed
  reactions: Record<string, string[]>;   // { "😂": ["name1", "name2"] }
  created_at: Timestamp;
}
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- A `.env` file with Firebase config

### Install

```bash
git clone https://github.com/YOUR_USERNAME/tobu-farm-of-fame.git
cd tobu-farm-of-fame
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Run

```bash
npm run dev
```

### Seed Data

```bash
npm run seed
```

Requires Firebase Admin credentials (`GOOGLE_APPLICATION_CREDENTIALS`) and `data/seed-demo.json`.

### Firestore rules

```bash
firebase deploy --only firestore:rules
```

Rules live in `firestore.rules`. Admin PIN (`VITE_ADMIN_PIN`) gates the queue UI only — not server auth. Share the PIN only with the class rep.

### Deploy

Push to GitHub → Vercel auto-deploys. Set all `VITE_*` env vars in Vercel, including `VITE_ADMIN_PIN`.

---

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| 🔴 Barcelona Red | `#D50032` | Barn, accents, loading screen |
| 🟡 Senyera Yellow | `#FFCD00` | Signpost, highlights, logo |
| 🔵 Barça Blue | `#004D98` | UI elements, sky accent |
| 🟢 Farm Green | Natural tones | Ground, hills, environment |
| 🐂 Bull Colors | Per-winner HSL | `hue = hash(name) % 360, S:65%, L:55%` |

---

## About Tobu

> *Tobu is the mascot of the IESE MBA 2027 Barcelona section. Each week, the section votes on who made the funniest comment, wildest gesture, or biggest contribution to the class. The winner gets Tobu — a plushie bull — for the week. Every bull on this farm is a moment worth remembering.*

---

## Built With

This entire project was built by a solo non-coder using AI tools:

- **[Cursor IDE](https://cursor.com)** — AI-powered code editor (Agent Mode)
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — Terminal agent for scaffolding & debugging
- **[Meshy AI](https://meshy.ai)** — Text-to-3D model generation
- **[Blender](https://blender.org)** — 3D model cleanup (learned from scratch with Claude)
- **[Claude](https://claude.ai)** — Product design, data extraction, Blender tutoring

---

## License

MIT

---

<div align="center">

**IESE MBA 2027 — Barcelona Section**

*Made with 🐂 and AI*

</div>
