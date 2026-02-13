import React from 'react';
import { LogOut, MessageSquare, Code2, Play, Wifi, WifiOff, Zap } from 'lucide-react';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import type { ViewMode } from '../types';
// ✅ Import the correct User type from your auth store
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
  currentShape,
  activeView,
  onSetActiveView,
  onOpenSimulation,
  onSignOut,
}) => {
  return (
    <header className="flex-shrink-0 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 py-2.5">
      <div className="flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
            <Zap className="w-4 h-4 text-green-400" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white uppercase tracking-tight">CURFD AI</h1>
            <p className="text-[10px] text-neutral-500">
              {user?.name?.split(' ')[0] || 'User'} — Workspace
            </p>
          </div>
        </div>

        {/* Center: Main Desktop Navigation (Editor & Simulate) */}
        <div className="hidden lg:flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
          {/* Editor Button - Now only active if explicitly in 'editor' mode */}
          <button
            onClick={() => onSetActiveView('editor')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'editor' 
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>

          <div className="w-px h-4 bg-neutral-800 mx-1" />

          {/* Simulate Button */}
          <button
            onClick={onOpenSimulation}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulate</span>
          </button>
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-3">
          {activeConversationId && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
              wsConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-[10px] font-bold ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
                {wsConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};