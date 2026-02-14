import { create } from 'zustand';
import type { ViewMode, MobilePanel } from '../types';

interface ViewState {
  activeView: ViewMode;
  mobilePanel: MobilePanel;
  isTransitioning: boolean;
  setActiveView: (view: ViewMode) => void;
  setMobilePanel: (panel: MobilePanel) => void;
  setIsTransitioning: (is: boolean) => void;
}

export const useViewEditor = create<ViewState>((set) => ({
  activeView: 'chat-viewer',
  mobilePanel: 'chat',
  isTransitioning: false,
  setActiveView: (view) => set({ activeView: view }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setIsTransitioning: (is) => set({ isTransitioning: is }),
}));