import React, { useState, useEffect } from 'react';
import { ChatInterface } from '@/modules/ai/components/ChatInterface';
import { Viewer3D } from '@/modules/viewer/components/Viewer3D';
import { EditorContainer } from '@/modules/editor/components';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ChatInterfaceRef } from '@/modules/ai/components/ChatInterface';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import type { ModelStats, ViewMode } from '../types';
import * as THREE from 'three';

interface DesktopLayoutProps {
  chatId: string;
  token: string;
  chatRef: React.RefObject<ChatInterfaceRef | null>;
  currentShape: GeneratedShape | null;
  loadedModel: THREE.Group | null;
  modelStats?: ModelStats;
  onShapeGenerated: (shape: GeneratedShape | null) => void;
  onOpenSimulation: () => void;
  onImportModel: () => void;
  onSwapPart: (partId: string, asset: any) => Promise<void>;
  onAddToAssembly?: (shape: GeneratedShape, jobId: string) => void;
  setActiveView: (view: ViewMode) => void;
  setMobilePanel: (panel: any) => void;
  activeView: ViewMode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  chatId,
  token,
  chatRef,
  currentShape,
  loadedModel,
  modelStats,
  onShapeGenerated,
  onOpenSimulation,
  onImportModel,
  onSwapPart,
  onAddToAssembly,
  setActiveView,
  setMobilePanel,
  activeView,
}) => {
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  useEffect(() => {
    if (activeView === 'editor') {
      setIsEditorMinimized(false);
    }
  }, [activeView]);

  const handleMinimizeEditor = (minimized: boolean) => {
    setIsEditorMinimized(minimized);
    if (minimized) {
      setActiveView('chat-viewer');
    }
  };

  return (
    <div className="hidden lg:flex h-full w-full relative overflow-hidden bg-neutral-950">
      
      {/* The ChatInterface serves as the global flex wrapper */}
      <ChatInterface
        ref={chatRef}
        onShapeGenerated={onShapeGenerated}
        setActiveView={setActiveView}
        setMobilePanel={setMobilePanel}
        isMinimized={isChatMinimized}
        onMinimize={setIsChatMinimized}
      >
        
        {/* Everything inside this div fills the remaining workspace */}
        <div className="w-full h-full flex flex-row bg-neutral-900">
          
          {isEditorMinimized ? (
            <div className="w-full h-full flex flex-row">
              {/* Full Width Viewer (Expands when editor is minimized) */}
              <div className="flex-1 min-w-0 relative">
                <Viewer3D
                  shape={currentShape}
                  loadedModel={loadedModel}
                  customStats={modelStats}
                  onOpenSimulation={onOpenSimulation}
                  onImportModel={onImportModel}
                  onSwapPart={onSwapPart}
                  onAddToAssembly={onAddToAssembly}
                />
              </div>

              {/* Minimized Editor Strip — on the right */}
              <div
                className="w-12 flex-shrink-0 border-l border-neutral-800 bg-neutral-950 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-neutral-800 transition-colors z-20"
                onClick={() => handleMinimizeEditor(false)}
              >
                <Pencil className="w-5 h-5 text-neutral-400" />
                <div className="flex-1" />
                <ChevronLeft className="w-5 h-5 text-neutral-500" />
              </div>
            </div>
          ) : (
            
            // Standard View: Chat (left) | Viewer (center, flex-1) | Editor (right)
            <div className="w-full h-full flex flex-row">

              {/* Center: 3D Viewer */}
              <div className="flex-1 min-w-0 relative overflow-hidden bg-neutral-900">
                <Viewer3D
                  shape={currentShape}
                  loadedModel={loadedModel}
                  customStats={modelStats}
                  onOpenSimulation={onOpenSimulation}
                  onImportModel={onImportModel}
                  onSwapPart={onSwapPart}
                  onAddToAssembly={onAddToAssembly}
                />
              </div>

              {/* Right: CAD Editor */}
              <div className="w-[380px] flex-shrink-0 bg-neutral-950 flex flex-col border-l border-neutral-800">
                <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest">
                      Editor
                    </span>
                  </div>
                  <button
                    onClick={() => handleMinimizeEditor(true)}
                    className="p-1 hover:bg-neutral-800 rounded-md transition-colors"
                    title="Minimize Editor"
                  >
                    <ChevronLeft className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <EditorContainer
                    chatId={chatId}
                    token={token}
                    onBuildComplete={onShapeGenerated}
                    onGenerateShape={(reqs) => chatRef.current?.generateModel(reqs)}
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </ChatInterface>
    </div>
  );
};