import type { GeneratedShape } from '@/modules/ai/types/shape.type';
import { Box, Command, Keyboard, Play, Zap } from 'lucide-react';
import { useState } from 'react';

interface StatusBarProps {
  currentShape: GeneratedShape | null;
  activeView: 'chat-viewer' | 'simulation' | 'editor';
  onOpenSimulation?: () => void;
}

export const StatusBar = ({ currentShape, activeView, onOpenSimulation }: StatusBarProps) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <div className="h-8 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-sm px-4 flex items-center justify-between text-xs">
      {/* Left side - Shape info */}
      <div className="flex items-center gap-4">
        {currentShape ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-neutral-400">Model:</span>
              <span className="text-white font-medium">{currentShape.name}</span>
            </div>
            <div className="h-3 w-px bg-neutral-800" />
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Box className="w-3 h-3" />
              <span className="capitalize">{currentShape.type.replace('_', ' ')}</span>
            </div>
            {currentShape.hasSimulation && (
              <>
                <div className="h-3 w-px bg-neutral-800" />
                <button
                  onClick={onOpenSimulation}
                  className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>Run Simulation</span>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-neutral-500">
            <Zap className="w-3 h-3" />
            <span>No model loaded — generate one from chat</span>
          </div>
        )}
      </div>

      {/* Right side - View mode & shortcuts hint */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">View:</span>
          <span className={`font-medium ${
            activeView === 'chat-viewer' ? 'text-green-400' : 
            activeView === 'editor' ? 'text-blue-400' : 'text-purple-400'
          }`}>
            {activeView === 'chat-viewer' ? 'Chat & Viewer' : 
             activeView === 'editor' ? 'CAD Script Editor' : 'Simulation'}
          </span>
        </div>

        <div className="h-3 w-px bg-neutral-800" />

        {/* Keyboard shortcuts hint */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-400 transition-colors"
            onMouseEnter={() => setShowShortcuts(true)}
            onMouseLeave={() => setShowShortcuts(false)}
          >
            <Keyboard className="w-3 h-3" />
            <span>Shortcuts</span>
          </button>

          {/* Shortcuts tooltip */}
          {showShortcuts && (
            <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="text-[11px] font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                <Command className="w-3 h-3" />
                Keyboard Shortcuts
              </div>
              <div className="space-y-1.5">
                <ShortcutRow keys={['Ctrl', '1']} action="Switch to Chat" />
                <ShortcutRow keys={['Ctrl', '2']} action="Focus Viewer" />
                <ShortcutRow keys={['Ctrl', '3']} action="Open Simulation" />
                <ShortcutRow keys={['Ctrl', 'Shift', 'F']} action="Fullscreen" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ShortcutRow = ({ keys, action }: { keys: string[]; action: string }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i}>
          <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] text-neutral-300">
            {key}
          </kbd>
          {i < keys.length - 1 && <span className="text-neutral-600 mx-0.5">+</span>}
        </span>
      ))}
    </div>
    <span className="text-neutral-500 text-[10px]">{action}</span>
  </div>
);
