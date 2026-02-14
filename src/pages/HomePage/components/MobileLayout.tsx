import React from 'react';
import { ChatInterface } from '@/modules/ai/components/ChatInterface';
import { Viewer3D } from '@/modules/viewer/components/Viewer3D';
import type { ChatInterfaceRef } from '@/modules/ai/components/ChatInterface';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import type { MobilePanel, ModelStats } from '../types';
import * as THREE from 'three';


interface MobileLayoutProps {
  mobilePanel: MobilePanel;
  isTransitioning: boolean;
  chatRef: React.RefObject<ChatInterfaceRef | null>;
  currentShape: GeneratedShape | null;
  loadedModel: THREE.Group | null;
  modelStats?: ModelStats;
  onShapeGenerated: (shape: GeneratedShape | null) => void;
  onOpenSimulation: () => void;
  onImportModel: () => void;
  onSwapPart: (partId: string, asset: any) => Promise<void>;
  onMobilePanelSwitch: (panel: MobilePanel) => void;
  setActiveView: (view: any) => void;
  setMobilePanel: (panel: any) => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  mobilePanel,
  isTransitioning,
  chatRef,
  currentShape,
  loadedModel,
  modelStats,
  onShapeGenerated,
  onOpenSimulation,
  onImportModel,
  onSwapPart,
  onMobilePanelSwitch,
  setActiveView,    
  setMobilePanel,
}) => {
  return (
    <div className={`lg:hidden h-full flex flex-col transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex-1 overflow-hidden relative">
        {mobilePanel === 'chat' ? (
          <ChatInterface
            key="mobile-chat"
            ref={chatRef}
            onShapeGenerated={onShapeGenerated}
            setActiveView={setActiveView}  
            setMobilePanel={setMobilePanel} 
          />
        ) : (
          <Viewer3D
            shape={currentShape}
            loadedModel={loadedModel}
            customStats={modelStats}
            onOpenSimulation={onOpenSimulation}
            onImportModel={onImportModel}
            onSwapPart={onSwapPart}
          />
        )}
      </div>
      <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900 p-2 flex gap-2">
        <button
          onClick={() => onMobilePanelSwitch('chat')}
          className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
            mobilePanel === 'chat'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Chat
        </button>
        <button
          onClick={() => onMobilePanelSwitch('viewer')}
          className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
            mobilePanel === 'viewer'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          3D View
        </button>
      </div>
    </div>
  );
};