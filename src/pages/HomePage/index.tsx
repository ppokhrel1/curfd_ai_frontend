import { useRef, useCallback, useState } from 'react';
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
import { useEditorStore, type EditorParameter } from '@/modules/editor/stores/editorStore'; 
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
    if (shape.scadCode) return shape.scadCode;
    if (shape.scad_code) return shape.scad_code; 

    let metadata = shape.metadata_json || shape.metadata;
    if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } 
        catch (e) { console.warn("Failed to parse metadata_json", e); }
    }

    if (metadata) return metadata.scadCode || metadata.scad_code || metadata.code || metadata.openscad_code;
    return undefined;
  };

  // --- NEW: The Regex Auto-Parser for History Loading ---
  const extractParametersFromCode = (code: string): EditorParameter[] => {
    if (!code) return [];
    const parameters: EditorParameter[] = [];
    const regex = /^\s*([a-zA-Z0-9_]+)\s*=\s*([-+]?[0-9]*\.?[0-9]+)\s*;/gm;
    const ignoredVars = ['$fn', '$fa', '$fs', 'eps', 'epsilon'];
    
    let match;
    while ((match = regex.exec(code)) !== null) {
      const name = match[1];
      const val = parseFloat(match[2]);

      if (!ignoredVars.includes(name) && !isNaN(val)) {
        let min_val = val > 0 ? Math.floor(val * 0.5) : val - 10;
        let max_val = val > 0 ? Math.ceil(val * 1.5) : val + 10;
        if (min_val === max_val) {
          min_val -= 5;
          max_val += 5;
        }
        parameters.push({
          name,
          default_val: val,
          min_val,
          max_val,
          description: `Auto-extracted: ${name}`
        });
      }
    }
    return parameters;
  };

  // --- HELPER: Extract Parameters from History DB ---
  const extractParameters = (shape: any): EditorParameter[] => {
    if (!shape) return [];
    let metadata = shape.metadata_json || shape.metadata;
    if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch (e) {}
    }
    return metadata?.parameters && Array.isArray(metadata.parameters) ? metadata.parameters : [];
  };

  const handleShapeGenerated = useCallback((shape: GeneratedShape | null) => {
    const store = useEditorStore.getState();
    const isCompiling = store.isCompiling;
    if (isCompiling && shape === null) return;

    if (!shape) {
        setCurrentShape(null);
        setLoadedModel(null);
        setModelStats(undefined);
        store.clear();
        return;
    }

    const scadCode = extractScadCode(shape);
    let params = extractParameters(shape); 

    // 🔥 THE FIX: Auto-parsing parameters from code during history load
    if ((!params || params.length === 0) && scadCode) {
        console.log("History Load: Auto-parsing parameters from code...");
        params = extractParametersFromCode(scadCode);
    }

    const updatedShape = { ...shape, scadCode };

    // --- Cached Path ---
    const cached = modelCache.getFromCache(shape.id);
    if (shape.id && cached) {
        setLoadedModel(cached);
        setCurrentShape(updatedShape); 
                
        if (scadCode) {
            store.setOriginalCode(scadCode);
            store.setCode(scadCode); 
            // Safe execution check for the test environment
            if (typeof store.setParameters === 'function') {
              store.setParameters([]); 
              if (params.length > 0) store.setParameters(params); 
            }
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
            store.setOriginalCode(scadCode);
            store.setCode(scadCode); 
            // Safe execution check for the test environment
            if (typeof store.setParameters === 'function') {
              store.setParameters([]); 
              if (params.length > 0) store.setParameters(params); 
            }
            if (activeView !== 'editor') setActiveView('editor');
        }
        
        if (shape.sdfUrl && updatedShape) {
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

  // --- NEW: Optimization Handler ---
  const handleOptimizeClick = useCallback(async (parameters: any[]) => {
    const currentCode = useEditorStore.getState().code;
    toast.success('Optimization task initiated. Check console for now.');
    console.log("SENDING TO API:", { code: currentCode, parameters });
    
    // TODO: Add your fetch("/optimize/custom") polling logic here in the next step!
  }, []);

  usePendingMessage(chatRef);

  useActiveConversationSync({
    activeConversationId,
    activeConv,
    messages: activeConv?.messages || [], 
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
            onOptimizeClick={handleOptimizeClick} 
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
            onOptimizeClick={handleOptimizeClick} 
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