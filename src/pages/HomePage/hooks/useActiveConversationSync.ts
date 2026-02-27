import { useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import * as THREE from "three";

interface UseActiveConversationSyncProps {
  activeConversationId: string | null;
  activeConv: any;
  messages: any[];
  modelCache: {
    getFromCache: (id: string) => THREE.Group | undefined;
    hasInCache: (id: string) => boolean;
  };
  modelFetch: {
    fetchModelFiles: (shape: GeneratedShape) => Promise<void>;
    recoverModel: (jobId: string, existingShape?: GeneratedShape) => Promise<void>;
  };
  onShapeLoaded: (shape: GeneratedShape | null) => void;
  setCurrentShape: (shape: GeneratedShape | null) => void;
  setLoadedModel: (model: THREE.Group | null) => void;
  setModelStats: (stats: any) => void;
}

export const useActiveConversationSync = ({
  activeConversationId,
  activeConv,
  messages,
  modelCache,
  modelFetch,
  onShapeLoaded,
  setCurrentShape,
  setLoadedModel,
  setModelStats,
}: UseActiveConversationSyncProps) => {
  const warningShownRef = useRef<Set<string>>(new Set());
  
  const callbacksRef = useRef({
    onShapeLoaded,
    setCurrentShape,
    setLoadedModel,
    setModelStats,
    modelFetch 
  });

  useEffect(() => {
    callbacksRef.current = {
      onShapeLoaded,
      setCurrentShape,
      setLoadedModel,
      setModelStats,
      modelFetch
    };
  });

  const lastSyncedId = useRef<string | null>(null);
  const lastSyncedCode = useRef<string | null>(null);
  const lastConvId = useRef<string | null>(null);

  // 1. Stable Shape Derivation
  const shape = useMemo(() => {
    if (activeConv?.generatedShape) {
      return activeConv.generatedShape as GeneratedShape;
    }
    if (messages && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const candidate = msg.generatedShape || msg.metadata?.generatedShape || msg.attachment?.shape;
        if (candidate) return candidate as GeneratedShape;
      }
    }
    return undefined;
  }, [activeConv, messages]);

  // 2. Code Extraction Helper
  const getCode = (s: any) => {
    if (!s) return undefined;
    let c = s.scadCode || s.scad_code;
    if (!c && (s.metadata_json || s.metadata)) {
      try {
        const meta = typeof s.metadata_json === 'string' ? JSON.parse(s.metadata_json) : (s.metadata_json || s.metadata);
        c = meta?.scadCode || meta?.scad_code || meta?.code;
      } catch (e) {}
    }
    return c;
  };

  useEffect(() => {
    const { onShapeLoaded, setCurrentShape, setLoadedModel, setModelStats, modelFetch } = callbacksRef.current;
    
    // 🛡️ THE GUARD: Get the compiler status from the editor store
    const editorStore = useEditorStore.getState();

    // A. Handle Conversation Switch
    if (activeConversationId !== lastConvId.current) {
      lastConvId.current = activeConversationId;
      lastSyncedId.current = null;
      lastSyncedCode.current = null;
      
      setLoadedModel(null);
      setCurrentShape(null);
      setModelStats(undefined);

      if (!activeConversationId) {
        editorStore.clear();
        return;
      }
    }

    // COMPILER GUARD: If the user is running a script, ignore history sync updates.
    // This prevents the chat.history event from overwriting the current editor code.
    if (editorStore.isCompiling) {
      return;
    }

    // B. Handle Empty History
    if (!shape) {
      // Only clear the editor if it's not compiling and we truly have no data.
      if (!editorStore.isCompiling && !activeConv?.generatedShape) {
        // Stay quiet here if there's an active ID to avoid losing unsaved progress
        console.log("[Sync] No shape in history; preserving current editor buffer.");
      }
      return;
    }

    // C. LOOP BREAKER
    const currentCode = getCode(shape);
    const isSameId = lastSyncedId.current === shape.id;
    const isSameCode = lastSyncedCode.current === currentCode;

    if (isSameId && (isSameCode || (!lastSyncedCode.current && !currentCode))) {
      return;
    }

    const shapeWithCode = currentCode ? { ...shape, scadCode: currentCode } : shape;

    // --- D. Sync Editor (with Guard) ---
    if (currentCode) {
      // Double check guard before modifying state
      if (!editorStore.isCompiling) {
        if (editorStore.code !== currentCode || editorStore.originalCode !== currentCode) {
          console.log("[Sync] Hydrating editor from conversation history.");
          editorStore.setOriginalCode(currentCode);
          editorStore.setCode(currentCode);
        }
      }
    }

    // --- E. Load Model ---
    const loadModel = async () => {
      // Skip calling onShapeLoaded if we already loaded this exact shape
      // (onShapeLoaded triggers handleShapeGenerated which auto-compiles)
      const alreadyLoadedThisShape = lastSyncedId.current === shape.id;

      if (shape.id && modelCache.hasInCache(shape.id)) {
        const cached = modelCache.getFromCache(shape.id)!;
        setLoadedModel(cached);
        setCurrentShape(shapeWithCode);
        if (!alreadyLoadedThisShape) onShapeLoaded(shapeWithCode);
      }
      else if ((shape as any).jobId && (!shape.sdfUrl || shape.sdfUrl.startsWith('blob:'))) {
        if (!alreadyLoadedThisShape) onShapeLoaded(shapeWithCode);
        await modelFetch.recoverModel((shape as any).jobId, shapeWithCode);
      }
      else if (shape.sdfUrl?.startsWith('blob:')) {
        // Blob URLs are revoked after page reload; restore the shape to UI
        // and let CADEditor's auto-compile re-render the model from scadCode.
        setCurrentShape(shapeWithCode);
        console.log("[Sync] Blob URL invalid after reload; auto-compile will re-render model.");
      }
      else if (shape.sdfUrl || shape.id) {
        if (!alreadyLoadedThisShape) onShapeLoaded(shapeWithCode);
      }
      else {
        setCurrentShape(shapeWithCode);
        if (shape.id && !warningShownRef.current.has(shape.id)) {
          warningShownRef.current.add(shape.id);
        }
      }
    };

    loadModel().catch(err => console.error("[Sync] Model load error:", err));

    lastSyncedId.current = shape.id;
    lastSyncedCode.current = currentCode || null;

  }, [activeConversationId, shape?.id, shape?.scadCode, messages.length, modelCache]);
};