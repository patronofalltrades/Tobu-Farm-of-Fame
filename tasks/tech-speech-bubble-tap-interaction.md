# Technical Requirements: Speech Bubble Tap Interaction

## 1. Requirements

### 1.1 Functional Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| FR-1 | Tap bull → play moo + show speech bubble | Exists (`BullHerd.tsx:84-89`) |
| FR-2 | Tap same bull → dismiss (toggle) | **Missing** — always re-selects |
| FR-3 | Tap backdrop / close button → dismiss | Exists (`App.tsx:165, 191`) |
| FR-4 | Bubble shows: winner name, quote, reaction row | Exists but shows extra fields |
| FR-5 | Strip date/term/photo from bubble content | **Needs change** |
| FR-6 | Fixed emoji set: 😂 ❤️ 🔥 👏 🐂 | Exists (`App.tsx:40`) |
| FR-7 | Tap emoji → toggle reaction (one per user per Tobu) | Exists (`App.tsx:94-139`) |
| FR-8 | Disable reactions when `userName === null` | **Missing** |
| FR-9 | Reaction buttons min 44×44px touch target | **Needs CSS fix** |
| FR-10 | Fallback to local-only reactions when no Firebase | Exists (`App.tsx:116-119`) |

### 1.2 Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Bubble appear latency | < 100ms (perceived instant, no animation) |
| Frame rate impact | 0 fps drop — bubble is HTML overlay, not in render loop |
| Mobile viewport | Fits within 375px portrait without horizontal scroll |
| Touch targets | ≥ 44×44px (Apple HIG / Android) |
| Firestore writes | ≤ 1 write per reaction tap (current behavior) |
| Offline tolerance | Local reactions work without Firebase |

---

## 2. High-Level Design

### 2.1 Component Architecture

```
App.tsx (orchestrator)
├── Farm.tsx (Canvas)
│   └── BullHerd.tsx (InstancedMesh)
│         └── onClick → playMoo() + selectTobu(id | null)  ← CHANGE: toggle logic
│
├── SpeechBubble (conditional on selectedTobuId)  ← EXTRACT from App.tsx
│   ├── Winner name (h2)
│   ├── Quote (p)
│   ├── ReactionRow
│   │   └── 5× ReactionButton (emoji + count)
│   └── Close button
│
└── Zustand Store (useFarmStore)
    ├── selectedTobuId: string | null
    ├── tobus: Tobu[]
    └── userName: string | null
```

### 2.2 Data Flow

1. **Tap** → `InstancedMesh.onClick` fires with `e.instanceId`
2. **Sound** → `playMoo()` fires immediately (Howler, non-blocking)
3. **Toggle** → if `indexed[i].tobu.id === selectedTobuId`, call `selectTobu(null)`; else `selectTobu(id)`
4. **Render** → `App.tsx` reads `selectedTobuId`, finds matching `Tobu`, renders speech bubble overlay
5. **React** → user taps emoji → `handleReaction(emoji)` → compute new `reactions` map → `updateTobu(id, { reactions })`
6. **Sync** → Firestore `onSnapshot` fires → `setTobus(liveTobus)` → bubble re-renders with updated counts

### 2.3 Storage

No schema changes. The existing Firestore document structure handles everything:

```typescript
// Firestore: tobus/{id}
{
  reactions: {
    "😂": ["Steph Charouk", "Hanif Ramadhan"],
    "🔥": ["Agnes Chen"]
  }
}
```

TypeScript type already defined:
```typescript
// src/types/index.ts
reactions: Record<string, string[]>;  // emoji → userName[]
type ReactionEmoji = '😂' | '❤️' | '🔥' | '👏' | '🐂';
```

---

## 3. Detailed Changes

### 3.1 `BullHerd.tsx` — Add toggle dismiss

**Current** (line 84-89):
```tsx
onClick={(e) => {
  e.stopPropagation();
  const i = e.instanceId;
  if (i === undefined || i < 0) return;
  playMoo();
  selectTobu(indexed[i].tobu.id);
}}
```

**Change:** Read `selectedTobuId` from store. If the tapped bull's ID matches, call `selectTobu(null)`.

```tsx
const selectedTobuId = useFarmStore((s) => s.selectedTobuId);

onClick={(e) => {
  e.stopPropagation();
  const i = e.instanceId;
  if (i === undefined || i < 0) return;
  playMoo();
  const tappedId = indexed[i].tobu.id;
  selectTobu(tappedId === selectedTobuId ? null : tappedId);
}}
```

**Impact:** Minimal — adds one store selector read. No performance concern.

### 3.2 `App.tsx` — Strip extra fields, disable reactions for anonymous users

**Remove from bubble:**
- `{selected.photo_url && <img>}` (line 169-171)
- `<small>{selected.date} · Term {selected.term}</small>` (line 173)

**Add disabled state:**
```tsx
<button
  className={`reaction-button${active ? ' is-active' : ''}`}
  onClick={() => void handleReaction(emoji)}
  disabled={isUpdatingReaction || !userName}
  title={!userName ? 'Pick your name first to react' : undefined}
>
```

### 3.3 `App.css` — Touch target sizing

**Current** `.reaction-button` (line 81-91):
```css
padding: 6px 10px;  /* too small for 44px touch target */
```

**Change:**
```css
.reaction-button {
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
  font-size: 16px;
}
```

### 3.4 Optional: Extract `SpeechBubble` component

The speech bubble logic in `App.tsx` (lines 164-193) is self-contained enough to extract into `src/components/SpeechBubble.tsx`. This reduces `App.tsx` complexity and makes the bubble testable in isolation.

**Props:**
```typescript
interface SpeechBubbleProps {
  tobu: Tobu;
  userName: string | null;
  isFirebaseLive: boolean;
  onClose: () => void;
}
```

This is optional — the feature works without extraction, but it improves readability.

---

## 4. API Contracts

### 4.1 Firestore Write (existing)

```typescript
updateTobu(id: string, { reactions: Record<string, string[]> }): Promise<void>
```

Called once per emoji tap. Overwrites the entire `reactions` map. This is safe because:
- ~80 users max, low concurrency risk
- `onSnapshot` provides near-instant conflict resolution
- No need for `arrayUnion`/`arrayRemove` — the full map write is simpler and sufficient at this scale

### 4.2 Zustand Actions (existing)

```typescript
selectTobu(id: string | null): void  // sets selectedTobuId
setTobus(tobus: Tobu[]): void        // bulk replace from Firestore
```

No new actions needed.

---

## 5. Scale and Reliability

### 5.1 Load Estimation

| Metric | Estimate |
|--------|----------|
| Concurrent users | 10-20 (section of ~80, not all online) |
| Bull taps / minute | ~5-10 across all users |
| Reaction writes / minute | ~2-5 across all users |
| Firestore reads | 1 `onSnapshot` listener per client (real-time) |
| Firestore writes | 1 `updateDoc` per reaction toggle |

This is well within Firestore's free tier (50K reads/day, 20K writes/day).

### 5.2 Failure Modes

| Failure | Handling | Status |
|---------|----------|--------|
| Firestore write fails | `isUpdatingReaction` resets via `finally`; UI shows stale count until next snapshot | Exists |
| Firestore offline | Falls back to `applyLocalReaction` (local-only) | Exists |
| Firebase not configured | Uses `MOCK_TOBUS` with local reactions | Exists |
| Race condition (two users react simultaneously) | Last-write-wins on full `reactions` map; next `onSnapshot` reconciles | Acceptable at scale |

### 5.3 Monitoring

No dedicated monitoring needed at this scale. Firebase console shows read/write counts. If the app survives post-graduation, the static JSON export fallback (PRD §7.4) is the safety net.

---

## 6. Trade-off Analysis

### Decision 1: HTML overlay vs. `drei <Html>` for bubble positioning

| Option | Pros | Cons |
|--------|------|------|
| **HTML overlay (chosen)** | Simple CSS, guaranteed mobile compat, no 3D math, already implemented | Not spatially attached to the bull |
| `drei <Html>` | Follows bull in 3D space | Jittery on mobile, z-fighting, harder to style, overflow issues |

**Verdict:** HTML overlay. The bubble is content-heavy (text, buttons) and benefits from normal CSS layout. Spatial attachment looks cool but adds complexity with no user benefit — users tap one bull at a time.

### Decision 2: Full reactions map overwrite vs. `arrayUnion/arrayRemove`

| Option | Pros | Cons |
|--------|------|------|
| **Full map overwrite (chosen)** | Simple toggle logic, handles one-reaction-per-user invariant cleanly | Theoretical race condition on concurrent writes |
| `arrayUnion`/`arrayRemove` | Atomic per-field updates | Can't enforce one-reaction-per-user atomically without a transaction; more Firestore ops |

**Verdict:** Full overwrite. At 80 users, concurrent write conflicts are rare and self-healing via `onSnapshot`. A transaction would cost 2× reads for negligible benefit.

### Decision 3: Extract SpeechBubble component vs. keep inline

| Option | Pros | Cons |
|--------|------|------|
| Extract to `SpeechBubble.tsx` | Cleaner App.tsx, testable, reusable | One more file, prop threading |
| **Keep inline (current)** | No refactor needed, ships faster | App.tsx growing (246 lines) |

**Verdict:** Either works. Recommended to extract if doing other refactoring, but not blocking.

---

## 7. Implementation Checklist

Ordered by dependency:

- [ ] **1. Toggle dismiss in BullHerd.tsx** — Read `selectedTobuId`, toggle on re-tap
- [ ] **2. Strip date/term/photo from bubble** — Remove `<small>` and `<img>` from `App.tsx:169-173`
- [ ] **3. Disable reactions for anonymous users** — Add `!userName` to `disabled` prop
- [ ] **4. Fix touch targets** — Update `.reaction-button` CSS to min 44×44px
- [ ] **5. (Optional) Extract SpeechBubble component** — Move bubble JSX + reaction logic to `src/components/SpeechBubble.tsx`
- [ ] **6. Verify in browser** — Test on mobile viewport (375px), confirm toggle, reactions, and dismiss

---

## 8. What to Revisit Later

- **Debounce reaction taps** — Not needed at 80 users, but if this scales to multiple sections, add a 300ms debounce to avoid excessive Firestore writes
- **Bull highlight ring** — Visual feedback showing which bull is selected in the 3D scene (requires shader/outline pass — significant complexity)
- **Optimistic UI** — Currently reactions wait for Firestore round-trip when online; could apply locally first then sync (already done in offline fallback, could unify)
