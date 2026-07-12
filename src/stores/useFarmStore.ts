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

// Older builds stored the literal name "Guest" for skipped identity; treat it as anonymous.
const storedName = localStorage.getItem('tobu_user_name');
const initialUserName = storedName === 'Guest' ? null : storedName;
const initialIsGuest = storedName === 'Guest' || localStorage.getItem('tobu_guest') === '1';
const initialHasSeenIntro = localStorage.getItem('tobu_intro_seen') === '1';

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
    localStorage.setItem('tobu_user_name', name);
    localStorage.removeItem('tobu_guest');
    set({ userName: name, isGuest: false });
  },
  setGuest: () => {
    localStorage.setItem('tobu_guest', '1');
    localStorage.removeItem('tobu_user_name');
    set({ userName: null, isGuest: true });
  },
  markIntroSeen: () => {
    localStorage.setItem('tobu_intro_seen', '1');
    set({ hasSeenIntro: true });
  },
}));
