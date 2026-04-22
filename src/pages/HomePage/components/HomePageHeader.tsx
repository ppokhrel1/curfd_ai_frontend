import React from 'react';
import { LogOut, Code2, Play, Zap } from 'lucide-react';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import type { ViewMode } from '../types';
import type { User } from "@/types/global";

interface HomePageHeaderProps {
  user: User | null;
  activeConversationId: string | null;
  wsConnected: boolean;
  currentShape: GeneratedShape | null;
  activeView: ViewMode;
  onSetActiveView: (view: ViewMode) => void;
  onOpenSimulation: () => void;
  onSignOut: () => void;
}
export const HomePageHeader: React.FC<HomePageHeaderProps> = ({
  user,
  activeConversationId,
  wsConnected,
  activeView,
  onSetActiveView,
  onOpenSimulation,
  onSignOut,
}) => {
  return (
    <header className="flex-shrink-0 border-b border-neutral-200 bg-white px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary-50 rounded-lg border border-primary-100">
            <Zap className="w-4 h-4 text-primary-600" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-neutral-800 tracking-tight">curfd</h1>
            <p className="text-[10px] text-neutral-400 font-mono">
              {user?.name?.split(' ')[0] || 'workspace'}
            </p>
          </div>
        </div>

        {/* Center: Navigation */}
        <div className="hidden lg:flex items-center gap-0.5 bg-neutral-100 border border-neutral-200 rounded-lg p-0.5">
          <button
            onClick={() => onSetActiveView('editor')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeView === 'editor'
                ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Editor
          </button>

          <button
            onClick={onOpenSimulation}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            Simulate
          </button>
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-2.5">
          {activeConversationId && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
              wsConnected
                ? 'bg-primary-50 text-primary-600 border border-primary-100'
                : 'bg-red-50 text-red-500 border border-red-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-primary-500 animate-pulse' : 'bg-red-400'}`} />
              {wsConnected ? 'Live' : 'Offline'}
            </div>
          )}
          <button
            onClick={onSignOut}
            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
