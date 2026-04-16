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

        // Recover image_to_3d shapes from assistant message metadata or content
        if (msg.role === "assistant") {
          const findModelUrl = (): string | undefined => {
            // 1. Check metadata_json.output (persisted by _runpod_poll_and_emit)
            const meta = msg.metadata_json || msg.metadata;
            if (meta) {
              const output = meta.output;
              const url = output?.uri || output?.model_url || output?.download_url
                || output?.metadata_json?.model_url
                || meta.model_url || meta.download_url;
              if (url && /\.(glb|stl|obj)/i.test(url)) return url;
            }
            // 2. Parse content as JSON (backend stores asset JSON as message content)
            if (typeof msg.content === 'string' && msg.content.startsWith('{')) {
              try {
                const parsed = JSON.parse(msg.content);
                const url = parsed.uri || parsed.model_url || parsed.download_url
                  || parsed.metadata_json?.model_url;
                if (url && /\.(glb|stl|obj)/i.test(url)) return url;
              } catch {}
            }
            return undefined;
          };

          const modelUrl = findModelUrl();
          if (modelUrl) {
            // Recover parts data from metadata if available
            const meta = (msg as any).metadata_json || (msg as any).metadata;
            const output = meta?.output;
            const recoveredParts = output?.parts || meta?.parts || [];
            if (recoveredParts.length > 0) {
              console.log("[Sync] Recovered image_to_3d with", recoveredParts.length, "parts from history");
            } else {
              console.log("[Sync] Recovered image_to_3d model URL from history:", modelUrl);
            }
            return {
              id: `recovered-${msg.id}`,
              type: 'generic',
              name: 'AI Generated 3D Model',
              description: recoveredParts.length > 0
                ? `${recoveredParts.length} parts: ${recoveredParts.map((p: any) => p.name).join(', ')}`
                : 'Recovered from history',
              hasSimulation: false,
              sdfUrl: modelUrl,
              geometry: {
                parts: recoveredParts.map((p: any) => ({
                  name: p.name,
                  meshUrl: p.mesh_url,
                  primitive: p.primitive,
                  faceCount: p.face_count,
                  isWatertight: p.is_watertight,
                })),
                metadata: { totalVertices: 0, fileSize: 0 },
              },
              createdAt: new Date(msg.timestamp || msg.created_at),
            } as GeneratedShape;
          }
        }
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

    // C. LOOP BREAKER — once we've synced a shape ID, don't re-process it
    //    (prevents double compile when shape re-derives with new code availability)
    const currentCode = getCode(shape);

    if (lastSyncedId.current === shape.id) {
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
        // Blob URLs are revoked after page reload; restore the shape and
        // trigger a compile so the model re-renders from scadCode.
        setCurrentShape(shapeWithCode);
        const code = getCode(shapeWithCode);
        if (code) {
          const es = useEditorStore.getState();
          es.setOriginalCode(code);
          es.setCode(code);
          // Small delay so the CADEditor mounts before the compile request fires
          setTimeout(() => useEditorStore.getState().requestCompile(), 300);
          console.log("[Sync] Blob URL expired; triggering recompile from scadCode.");
        } else {
          console.log("[Sync] Blob URL invalid and no scadCode available.");
        }
      }
      else if (shape.sdfUrl || shape.id) {
        if (!alreadyLoadedThisShape) onShapeLoaded(shapeWithCode);
      }
      else {
        // No sdfUrl, no jobId — set the shape and try to compile from code
        setCurrentShape(shapeWithCode);
        const code = getCode(shapeWithCode);
        if (code) {
          const es = useEditorStore.getState();
          es.setOriginalCode(code);
          es.setCode(code);
          setTimeout(() => useEditorStore.getState().requestCompile(), 300);
          console.log("[Sync] No sdfUrl; triggering compile from scadCode.");
        } else if (shape.id && !warningShownRef.current.has(shape.id)) {
          warningShownRef.current.add(shape.id);
        }
      }
    };

    loadModel().catch(err => console.error("[Sync] Model load error:", err));

    lastSyncedId.current = shape.id;
    lastSyncedCode.current = currentCode || null;

  }, [activeConversationId, shape?.id, shape?.scadCode, modelCache]);
};