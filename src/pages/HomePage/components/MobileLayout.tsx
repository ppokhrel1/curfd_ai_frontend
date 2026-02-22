import React from 'react';
import { ChatInterface } from '@/modules/ai/components/ChatInterface';
import { Viewer3D } from '@/modules/viewer/components/Viewer3D';
import { EditorContainer } from '@/modules/editor/components'; // <-- Updated Import
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
  onOptimizeClick?: (parameters: any[]) => void;
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
    <div className={`lg:hidden h-full flex flex-col bg-neutral-950 transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex-1 overflow-hidden relative">
        {mobilePanel === 'chat' && (
          <ChatInterface
            key="mobile-chat"
            ref={chatRef}
            onShapeGenerated={onShapeGenerated}
            setActiveView={setActiveView}  
            setMobilePanel={setMobilePanel} 
          />
        )}
        
        {mobilePanel === 'viewer' && (
          <Viewer3D
            shape={currentShape}
            loadedModel={loadedModel}
            customStats={modelStats}
            onOpenSimulation={onOpenSimulation}
            onImportModel={onImportModel}
            onSwapPart={onSwapPart}
          />
        )}

        {mobilePanel === 'editor' && (
          <div className="h-full flex flex-col bg-neutral-950">
             {/* <-- Swapped to EditorContainer --> */}
             <EditorContainer 
                onBuildComplete={onShapeGenerated}
                onGenerateShape={(reqs) => chatRef.current?.generateModel(reqs)} 
                onOptimizeClick={(params) => {
                  console.log("Trigger AI Optimization for:", params);
                  // TODO: Call your /optimize/custom endpoint here
                }}
             />
          </div>
        )}
      </div>
      
      {/* Footer Navigation */}
      <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900 p-2 flex gap-1.5">
        <TabButton 
          active={mobilePanel === 'chat'} 
          onClick={() => onMobilePanelSwitch('chat')}
          label="Chat"
          color="bg-blue-500"
        />
        <TabButton 
          active={mobilePanel === 'editor'} 
          onClick={() => onMobilePanelSwitch('editor')}
          label="Editor"
          color="bg-purple-500"
        />
        <TabButton 
          active={mobilePanel === 'viewer'} 
          onClick={() => onMobilePanelSwitch('viewer')}
          label="3D View"
          color="bg-green-500"
        />
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, color }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
      active
        ? 'bg-neutral-800 text-white shadow-inner'
        : 'text-neutral-500 hover:text-neutral-300'
    }`}
  >
    <div className={`w-1.5 h-1.5 rounded-full ${active ? color : 'bg-neutral-700'}`} />
    {label}
  </button>
);