import React from 'react';
import { MessageSquare, Pencil, Box } from 'lucide-react';
import type { MobilePanel } from '../types';

interface MobileChooserProps {
  onSelect: (panel: MobilePanel) => void;
}

const panels = [
  {
    key: 'chat' as MobilePanel,
    icon: MessageSquare,
    label: 'AI Chat',
    description: 'Describe what you want to build',
    color: 'bg-blue-500',
    borderColor: 'border-blue-500/30',
    hoverBg: 'hover:bg-blue-500/10',
  },
  {
    key: 'editor' as MobilePanel,
    icon: Pencil,
    label: 'Code Editor',
    description: 'Write and edit OpenSCAD code',
    color: 'bg-purple-500',
    borderColor: 'border-purple-500/30',
    hoverBg: 'hover:bg-purple-500/10',
  },
  {
    key: 'viewer' as MobilePanel,
    icon: Box,
    label: '3D Viewer',
    description: 'View and interact with your model',
    color: 'bg-green-500',
    borderColor: 'border-green-500/30',
    hoverBg: 'hover:bg-green-500/10',
  },
] as const;

export const MobileChooser: React.FC<MobileChooserProps> = ({ onSelect }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-neutral-950 px-6 gap-4">
      <h2 className="text-neutral-400 text-sm font-medium uppercase tracking-wider mb-2">
        Choose a view
      </h2>

      {panels.map(({ key, icon: Icon, label, description, color, borderColor, hoverBg }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`w-full max-w-sm flex items-center gap-4 p-5 rounded-xl border ${borderColor} ${hoverBg} bg-neutral-900/50 transition-all active:scale-[0.98]`}
        >
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-white font-semibold text-base">{label}</div>
            <div className="text-neutral-500 text-sm">{description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
