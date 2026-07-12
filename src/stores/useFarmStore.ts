import { create } from 'zustand';
import type { Tobu } from '../types';

interface FarmState {
  tobus: Tobu[];
  selectedTobuId: string | null;
  isAdmin: boolean;
  isMuted: boolean;
  userName: string | null;
  setTobus: (tobus: Tobu[]) => void;
  selectTobu: (id: string | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  toggleMute: () => void;
  setUserName: (name: string) => void;
}

export const useFarmStore = create<FarmState>((set) => ({
  tobus: [],
  selectedTobuId: null,
  isAdmin: false,
  isMuted: true,
  userName: localStorage.getItem('tobu_user_name'),
  setTobus: (tobus) => set({ tobus }),
  selectTobu: (id) => set({ selectedTobuId: id }),
  setAdmin: (isAdmin) => set({ isAdmin }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setUserName: (name) => {
    localStorage.setItem('tobu_user_name', name);
    set({ userName: name });
  },
}));
