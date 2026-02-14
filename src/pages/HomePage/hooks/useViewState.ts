import { useState } from 'react';
import type { ViewMode, MobilePanel } from '../types';

export const useViewState = () => {
  const [activeView, setActiveView] = useState<ViewMode>('chat-viewer');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('chat');
  const [isTransitioning, setIsTransitioning] = useState(false);
  return { activeView, setActiveView, mobilePanel, setMobilePanel, isTransitioning, setIsTransitioning };
};