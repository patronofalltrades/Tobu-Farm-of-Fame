import { create } from 'zustand';
import type { Tobu } from '../types';

interface FarmState {
  tobus: Tobu[];
  selectedTobuId: string | null;
  isAdmin: boolean;
  isMuted: boolean;
  userName: string | null;
  isGuest: boolean;
  hasSeenIntro: boolean;
  setTobus: (tobus: Tobu[]) => void;
  selectTobu: (id: string | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  toggleMute: () => void;
  setUserName: (name: string) => void;
  setGuest: () => void;
  markIntroSeen: () => void;
}

// Safari private mode (and similar) can throw on any localStorage access, not just
// when full — guard every call so a storage restriction never blanks the app.
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — state still updates in-memory via `set()`, just won't persist.
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clean up.
  }
}

// Older builds stored the literal name "Guest" for skipped identity; treat it as anonymous.
const storedName = safeGetItem('tobu_user_name');
const initialUserName = storedName === 'Guest' ? null : storedName;
const initialIsGuest = storedName === 'Guest' || safeGetItem('tobu_guest') === '1';
const initialHasSeenIntro = safeGetItem('tobu_intro_seen') === '1';

export const useFarmStore = create<FarmState>((set) => ({
  tobus: [],
  selectedTobuId: null,
  isAdmin: false,
  isMuted: true,
  userName: initialUserName,
  isGuest: initialIsGuest,
  hasSeenIntro: initialHasSeenIntro,
  setTobus: (tobus) => set({ tobus }),
  selectTobu: (id) => set({ selectedTobuId: id }),
  setAdmin: (isAdmin) => set({ isAdmin }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setUserName: (name) => {
    safeSetItem('tobu_user_name', name);
    safeRemoveItem('tobu_guest');
    set({ userName: name, isGuest: false });
  },
  setGuest: () => {
    safeSetItem('tobu_guest', '1');
    safeRemoveItem('tobu_user_name');
    set({ userName: null, isGuest: true });
  },
  markIntroSeen: () => {
    safeSetItem('tobu_intro_seen', '1');
    set({ hasSeenIntro: true });
  },
}));
