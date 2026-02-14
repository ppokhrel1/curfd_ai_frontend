import React, { useState, useEffect } from 'react';
import { ResizablePanels } from '@/components/common/ResizablePanels';
import { ChatInterface } from '@/modules/ai/components/ChatInterface';
import { CADEditor } from '@/modules/editor/components/CADEditor';
import { Viewer3D } from '@/modules/viewer/components/Viewer3D';
import { MessageSquare, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ChatInterfaceRef } from '@/modules/ai/components/ChatInterface';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import type { ModelStats, ViewMode } from '../types';
import * as THREE from 'three';

interface DesktopLayoutProps {
  chatRef: React.RefObject<ChatInterfaceRef | null>;
  currentShape: GeneratedShape | null;
  loadedModel: THREE.Group | null;
  modelStats?: ModelStats;
  onShapeGenerated: (shape: GeneratedShape | null) => void;
  onOpenSimulation: () => void;
  onImportModel: () => void;
  onSwapPart: (partId: string, asset: any) => Promise<void>;
  setActiveView: (view: ViewMode) => void;
  setMobilePanel: (panel: any) => void;
  activeView: ViewMode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  chatRef,
  currentShape,
  loadedModel,
  modelStats,
  onShapeGenerated,
  onOpenSimulation,
  onImportModel,
  onSwapPart,
  setActiveView,
  setMobilePanel,
  activeView,
}) => {
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);

  // Sync state when activeView changes externally (e.g. Header button click)
  useEffect(() => {
    if (activeView === 'editor') {
      setIsEditorMinimized(false);
    }
  }, [activeView]);

  const handleMinimizeChat = (minimized: boolean) => {
    setIsChatMinimized(minimized);
    if (minimized) {
      setIsEditorMinimized(false);
      setActiveView('editor');
    }
  };

  const handleMinimizeEditor = (minimized: boolean) => {
    setIsEditorMinimized(minimized);
    if (minimized) {
      setIsChatMinimized(false);
      setActiveView('chat-viewer');
    }
  };

  return (
    <div className="hidden lg:flex h-full w-full relative overflow-hidden bg-neutral-950">
      {/* LEFT HALF: Chat + Editor */}
      <div className="flex-1 basis-0 min-w-0 border-r border-neutral-800">
        {isChatMinimized && isEditorMinimized ? (
          null
        ) : isChatMinimized ? (
          // VIEW 1: Minimized Chat + Full Editor
          <div className="h-full flex">
            {/* Minimized Chat Strip */}
            <div
              className="w-12 flex-shrink-0 border-r border-neutral-800 bg-neutral-900 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-neutral-800 transition-colors"
              onClick={() => handleMinimizeChat(false)}
            >
              <MessageSquare className="w-5 h-5 text-neutral-400" />
              <div className="flex-1" />
              <ChevronRight className="w-5 h-5 text-neutral-500" />
            </div>
            
            {/* Editor Content */}
            <div className="flex-1 min-w-0 bg-neutral-950">
              <CADEditor onBuildComplete={onShapeGenerated} />
            </div>
          </div>
        ) : isEditorMinimized ? (
          // VIEW 2: Full Chat + Minimized Editor
          <div className="h-full flex">
            {/* Chat Content */}
            <div className="flex-1 min-w-0 bg-neutral-900">
              <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest">
                    AI Assistant
                  </span>
                </div>
              </div>
              <div className="h-[calc(100%-49px)]">
                <ChatInterface
                  key="desktop-chat"
                  ref={chatRef}
                  onShapeGenerated={onShapeGenerated}
                  setActiveView={setActiveView}
                  setMobilePanel={setMobilePanel}
                />
              </div>
            </div>

            {/* Minimized Editor Strip - Added flex-shrink-0 */}
            <div
              className="w-12 flex-shrink-0 border-l border-neutral-800 bg-neutral-900 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-neutral-800 transition-colors"
              onClick={() => handleMinimizeEditor(false)}
            >
              <Pencil className="w-5 h-5 text-neutral-400" />
              <div className="flex-1" />
              <ChevronLeft className="w-5 h-5 text-neutral-500" />
            </div>
          </div>
        ) : (
          // VIEW 3: Split View (Default)
          <ResizablePanels
            storageKey="chat-editor-split"
            defaultLeftWidth={50}
            minLeftWidth={30}
            leftPanel={
              <div className="h-full bg-neutral-900 flex flex-col">
                <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest">
                      AI Assistant
                    </span>
                  </div>
                  <button
                    onClick={() => handleMinimizeChat(true)}
                    className="p-1 hover:bg-neutral-800 rounded-md transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatInterface
                    key="desktop-chat"
                    ref={chatRef}
                    onShapeGenerated={onShapeGenerated}
                    setActiveView={setActiveView}
                    setMobilePanel={setMobilePanel}
                  />
                </div>
              </div>
            }
            rightPanel={
              <div className="h-full bg-neutral-950 flex flex-col">
                <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest">
                      Editor
                    </span>
                  </div>
                  <button
                    onClick={() => handleMinimizeEditor(true)}
                    className="p-1 hover:bg-neutral-800 rounded-md transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CADEditor onBuildComplete={onShapeGenerated} />
                </div>
              </div>
            }
          />
        )}
      </div>

      {/* RIGHT HALF: Viewer */}
      <div className="w-1/2 flex-shrink-0 relative overflow-hidden bg-neutral-900">
        <Viewer3D
          shape={currentShape}
          loadedModel={loadedModel}
          customStats={modelStats}
          onOpenSimulation={onOpenSimulation}
          onImportModel={onImportModel}
          onSwapPart={onSwapPart}
        />
      </div>
    </div>
  );
};