import { useRef, useCallback, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { useAuthStore } from '@/lib/auth';
import { useChatStore } from '@/modules/ai/stores/chatStore';
import { useChatSocket } from '@/modules/ai/hooks/useChatSocket';
import { useKeyboardShortcuts, getDefaultShortcuts } from '@/hooks/useKeyboardShortcuts';
import { StatusBar } from '@/components/common/StatusBar';
import { ModelImportOverlay } from '@/modules/viewer/components/ModelImportOverlay';

import {
  useModelCache,
  useModelImport,
  useModelFetch,
  useActiveConversationSync,
  useEditorSync,
  usePendingMessage,
  usePartSwap,
  useViewState,
} from './hooks';
import { MOBILE_TRANSITION_MS } from './constants';
import type { ChatInterfaceRef } from '@/modules/ai/components/ChatInterface';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import { DesktopLayout, HomePageHeader, MobileLayout, MobileNav } from './components';
import { STORAGE_KEYS } from '@/lib/constants';

const HomePage = () => {
  const { user, signOut } = useAuthStore();
  
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const updateConversation = useChatStore(state => state.updateConversation);
  
  const activeConv = useChatStore(useCallback(
    state => state.conversations.find(c => c.id === activeConversationId),
    [activeConversationId]
  ));

  const [currentShape, setCurrentShape] = useState<GeneratedShape | null>(null);
  const [loadedModel, setLoadedModel] = useState<THREE.Group | null>(null);
  const [modelStats, setModelStats] = useState<any>();

  const { 
    activeView, setActiveView, 
    mobilePanel, setMobilePanel, 
    isTransitioning, setIsTransitioning 
  } = useViewState();

  const chatRef = useRef<ChatInterfaceRef>(null);
  const modelCache = useModelCache();
  const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);

  const { fetchModelFiles, recoverModel } = useModelFetch({
    activeConversationId,
    addToCache: modelCache.addToCache,
  });

  // --- HELPER: Robust Extraction ---
  const extractScadCode = (shape: any): string | undefined => {
    if (!shape) return undefined;
    
    // 1. Direct Access
    if (shape.scadCode) return shape.scadCode;
    if (shape.scad_code) return shape.scad_code; 

    // 2. Metadata parsing
    let metadata = shape.metadata_json || shape.metadata;
    
    // Handle stringified metadata
    if (typeof metadata === 'string') {
        try {
            metadata = JSON.parse(metadata);
        } catch (e) {
            console.warn("Failed to parse metadata_json", e);
        }
    }

    if (metadata) {
        return metadata.scadCode || metadata.scad_code || metadata.code;
    }

    return undefined;
  };

  const handleShapeGenerated = useCallback((shape: GeneratedShape | null) => {
    // GUARD: If the editor is currently compiling, so it does not let the chat history sync overwrite the local state.
    const isCompiling = useEditorStore.getState().isCompiling;
    if (isCompiling && shape === null) {
        return;
    }

    if (!shape) {
        setCurrentShape(null);
        setLoadedModel(null);
        setModelStats(undefined);
        useEditorStore.getState().clear();
        return;
    }

    
    const scadCode = extractScadCode(shape);
    const updatedShape = { ...shape, scadCode };

    // --- Cached Path ---
    const cached = modelCache.getFromCache(shape.id);
    if (shape.id && cached) {
        setLoadedModel(cached);
        setCurrentShape(updatedShape); 
                
        if (scadCode) {
            const store = useEditorStore.getState();
            store.setOriginalCode(scadCode);
            store.setCode(scadCode); // ✅ Explicitly set active code
            if (activeView !== 'editor') setActiveView('editor');
        }
        return;
    }

    // --- Fresh Load / Non-Cached Path ---
    setCurrentShape(updatedShape);
    
    if (shape.id) {
        setLoadedModel(null);
        setModelStats(undefined);
        
        if (scadCode) {
            const store = useEditorStore.getState();
            store.setOriginalCode(scadCode);
            store.setCode(scadCode); // ✅ Explicitly set active code
            
            if (activeView !== 'editor') setActiveView('editor');
        }
        
        // Fetch files if we have a URL (standard path)
        if (shape.sdfUrl) {
            fetchModelFiles(updatedShape);
        }
    }
    
    if (window.innerWidth < 1024) setMobilePanel('viewer');
  }, [fetchModelFiles, modelCache, setActiveView, setMobilePanel, activeView]);

  const handleImportComplete = useCallback((shape: GeneratedShape, group: THREE.Group) => {
    const scadCode = extractScadCode(shape);
    const updatedShape = { ...shape, scadCode };
    
    setCurrentShape(updatedShape);
    setLoadedModel(group);
    modelCache.addToCache(shape.id, group);
    if (activeConversationId) {
      updateConversation(activeConversationId, { generatedShape: updatedShape });
    }
  }, [activeConversationId, updateConversation, modelCache]);

  const modelImport = useModelImport({
    activeConversationId,
    onImportComplete: handleImportComplete,
  });

  const handlePartSwap = usePartSwap({
    loadedModel,
    currentShape,
    setCurrentShape,
    setLoadedModel,
  });

  const handleOpenSimulation = useCallback(() => {
    toast('Simulation module is Coming Soon!', { icon: '🚀' });
  }, []);

  const handleMobilePanelSwitch = useCallback((panel: any) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMobilePanel(panel);
      setIsTransitioning(false);
    }, MOBILE_TRANSITION_MS);
  }, [setIsTransitioning, setMobilePanel]);

  const handleShapeUpdate = useCallback((updatedShape: GeneratedShape) => {
    setCurrentShape(updatedShape);
    if (activeConversationId) {
      updateConversation(activeConversationId, { generatedShape: updatedShape });
    }
  }, [activeConversationId, updateConversation]);

  usePendingMessage(chatRef);

  // Sync hook that monitors conversation/messages to load shapes
  useActiveConversationSync({
    activeConversationId,
    activeConv,
    messages: activeConv?.messages || [], // [] for TS Error
    modelCache,
    modelFetch: { fetchModelFiles, recoverModel },
    onShapeLoaded: handleShapeGenerated,
    setCurrentShape,
    setLoadedModel,
    setModelStats,
  });

  useEditorSync(activeConversationId, currentShape, handleShapeUpdate);

  const { isConnected: wsConnected } = useChatSocket({
    chatId: activeConversationId,
    sessionId: sessionId,
    onEvent: () => {},
  });

  useKeyboardShortcuts({
    shortcuts: getDefaultShortcuts({
      goToChat: () => { setActiveView('chat-viewer'); setMobilePanel('chat'); },
      goToViewer: () => { setActiveView('chat-viewer'); setMobilePanel('viewer'); },
      goToEditor: () => setActiveView('editor'),
      goToSimulation: currentShape?.hasSimulation ? handleOpenSimulation : undefined,
      toggleFullscreen: () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      },
    }),
  });


  return (
    <div className="h-screen bg-neutral-950 flex flex-col overflow-hidden">
      <input
        ref={modelImport.fileInputRef}
        type="file"
        accept=".zip,.gltf,.glb,.obj,.fbx,.stl"
        onChange={modelImport.handleFileImport}
        className="hidden"
      />
      <ModelImportOverlay
        isOpen={modelImport.isImporting}
        stage={modelImport.importStage}
        fileName={modelImport.importFileName}
      />

      <HomePageHeader
        user={user}
        activeConversationId={activeConversationId}
        wsConnected={wsConnected}
        currentShape={currentShape}
        activeView={activeView}
        onSetActiveView={setActiveView}
        onOpenSimulation={handleOpenSimulation}
        onSignOut={signOut}
      />

      <main className="flex-1 overflow-hidden relative">
        <DesktopLayout
            chatRef={chatRef}
            currentShape={currentShape}
            loadedModel={loadedModel}
            modelStats={modelStats}
            onShapeGenerated={handleShapeGenerated}
            onOpenSimulation={handleOpenSimulation}
            onImportModel={modelImport.handleImportModel}
            onSwapPart={handlePartSwap}
            setActiveView={setActiveView}
            setMobilePanel={setMobilePanel}
            activeView={activeView}
        />
        <MobileLayout
            mobilePanel={mobilePanel}
            isTransitioning={isTransitioning}
            chatRef={chatRef}
            currentShape={currentShape}
            loadedModel={loadedModel}
            modelStats={modelStats}
            onShapeGenerated={handleShapeGenerated}
            onOpenSimulation={handleOpenSimulation}
            onImportModel={modelImport.handleImportModel}
            onSwapPart={handlePartSwap}
            onMobilePanelSwitch={handleMobilePanelSwitch}
            setActiveView={setActiveView}
            setMobilePanel={setMobilePanel}
        />
    </main>

      <MobileNav
        mobilePanel={mobilePanel}
        activeView={activeView}
        onMobilePanelSwitch={handleMobilePanelSwitch}
        onOpenSimulation={handleOpenSimulation}
      />
      <StatusBar
        currentShape={currentShape}
        activeView={activeView}
        onOpenSimulation={handleOpenSimulation}
      />
    </div>
  );
};

export default HomePage;