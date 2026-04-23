import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Home, MessageSquare, Pencil, Play } from 'lucide-react';
import type { ViewMode, MobilePanel } from '../types';

interface MobileNavProps {
  mobilePanel: MobilePanel;
  activeView: ViewMode;
  onMobilePanelSwitch: (panel: MobilePanel) => void;
  onOpenSimulation: () => void;
}

const NavBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ icon, label, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${
      active
        ? 'bg-primary-500/15 text-primary-500'
        : 'text-neutral-500 hover:text-neutral-300 disabled:opacity-40'
    }`}
  >
    <div className="w-5 h-5">{icon}</div>
    <span className="text-[10px]">{label}</span>
  </button>
);


export const MobileNav: React.FC<MobileNavProps> = ({
  mobilePanel,
  activeView,
  onMobilePanelSwitch,
  onOpenSimulation,
}) => {
  const navigate = useNavigate();
  if (mobilePanel === 'chooser') return null;

  return (
    <div className="lg:hidden flex-shrink-0 border-t border-neutral-200 bg-white p-1.5">
      <div className="grid grid-cols-5 gap-1">
        <NavBtn
          icon={<Home />}
          label="Home"
          active={false}
          onClick={() => navigate('/dashboard')}
        />
        <NavBtn
          icon={<MessageSquare />}
          label="AI Chat"
          active={mobilePanel === 'chat'}
          onClick={() => onMobilePanelSwitch('chat')}
        />
        <NavBtn
          icon={<Pencil />}
          label="Editor"
          active={mobilePanel === 'editor'}
          onClick={() => onMobilePanelSwitch('editor')}
        />
        <NavBtn
          icon={<Box />}
          label="Viewer"
          active={mobilePanel === 'viewer'}
          onClick={() => onMobilePanelSwitch('viewer')}
        />
        <NavBtn
          icon={<Play />}
          label="Simulate"
          active={false}
          onClick={onOpenSimulation}
        />
      </div>
    </div>
  );
};