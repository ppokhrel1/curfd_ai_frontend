import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { proxifyUrl } from '@/lib/apiConfig';
import { assetService } from '@/modules/viewer/services/assetService';
import { ModelImporter } from '@/modules/viewer/services/ModelImporter';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import { useChatStore } from '@/modules/ai/stores/chatStore';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import type { ModelStats } from '../types';

interface UseModelFetchProps {
  activeConversationId?: string | null;
  addToCache: (id: string, group: THREE.Group) => void;
  // Optional callbacks to notify parent component about state changes
  onModelLoaded?: (group: THREE.Group, stats: ModelStats, shape: GeneratedShape) => void;
  onShapeUpdated?: (shape: GeneratedShape) => void;
}

export const useModelFetch = ({
  activeConversationId,
  addToCache,
  onModelLoaded,
  onShapeUpdated,
}: UseModelFetchProps) => {
  const importer = useMemo(() => new ModelImporter(), []);
  const { setOriginalCode } = useEditorStore();
  const { updateConversation } = useChatStore();

  const fetchModelFiles = useCallback(
    async (shape: GeneratedShape) => {
      if (!shape.sdfUrl) return;
      const originalFilename = shape.geometry?.metadata?.originalFilename;

      const tryCompileFromCode = (reason: string): boolean => {
        const code = shape.scadCode;
        if (!code) return false;
        const es = useEditorStore.getState();
        es.setOriginalCode(code);
        es.setCode(code);
        // Defer slightly so the editor mounts before compile fires
        setTimeout(() => useEditorStore.getState().requestCompile(), 300);
        console.warn(`[useModelFetch] ${reason} — falling back to compile from scadCode.`);
        toast('3D file unavailable — rebuilding from code…', { icon: 'ℹ️' });
        return true;
      };

      try {
        // Step 1: Perform the full import from the URL first
        const imported = await importer.importFromUrl(
          proxifyUrl(shape.sdfUrl),
          shape.yamlUrl ? proxifyUrl(shape.yamlUrl) : undefined,
          shape.specification,
          shape.assets?.map((a) => ({ ...a, url: proxifyUrl(a.url) })) || [],
          originalFilename
        );

        // Step 2: Calculate stats locally (not in state)
        let triCount = 0;
        let vertCount = 0;
        const materialSet = new Set<string>();

        imported.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const geom = mesh.geometry;
            if (geom.index) triCount += geom.index.count / 3;
            else triCount += geom.attributes.position.count / 3;
            vertCount += geom.attributes.position.count;

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => materialSet.add(m.uuid));
            } else if (mesh.material) {
              materialSet.add(mesh.material.uuid);
            }
          }
        });

        const stats: ModelStats = {
          triangles: Math.round(triCount),
          vertices: vertCount,
          faces: Math.round(triCount),
          materials: materialSet.size || 1,
          fps: 60,
          drawCalls: imported.group.children.length,
        };

        // Step 3: Build parts list from THREE.js scene graph
        // For segmented models, the GLB contains named sub-meshes (temple, gates, etc.)
        // that THREE.js discovers automatically. For single-mesh models, we get 1 part.
        const sceneParts: any[] = [];
        imported.group.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const partId = child.name || child.uuid;
            sceneParts.push({
              id: partId,
              name: child.name || 'Solid Part',
              category: 'component',
              role: 'structural',
              group: 'Model Components',
              assetName: child.userData.sourceFile || null,
            });
          }
        });

        // If scene graph found named parts, use those (they link to actual 3D objects).
        // Fall back to API-provided parts only if scene graph has just 1 unnamed mesh.
        const existingApiParts = shape.geometry?.parts || [];
        const finalParts = sceneParts.length > 1 ? sceneParts
          : existingApiParts.length > 1 ? existingApiParts
          : sceneParts;

        // Step 4: Construct the final shape object before any state updates
        const updatedShape: GeneratedShape = {
          ...shape,
          scadCode: imported.scad || shape.scadCode,
          geometry: {
            ...shape.geometry,
            parts: finalParts,
            metadata: {
              ...shape.geometry.metadata,
              totalVertices: vertCount,
            },
          },
        };

        // Step 5: BATCH UPDATES. 
        // We update the Editor and Conversation stores only after all processing is done.
        if (imported.scad) {
          setOriginalCode(imported.scad);
        }

        if (activeConversationId) {
          updateConversation(activeConversationId, {
            generatedShape: updatedShape,
          });
        }

        // Cache the model to prevent redundant fetches
        if (shape.id) {
          addToCache(shape.id, imported.group);
        }

        // Final notifications to parent components
        onShapeUpdated?.(updatedShape);
        onModelLoaded?.(imported.group, stats, updatedShape);
        
      } catch (err) {
        const msg = (err as Error)?.message || String(err);
        const isMissing = /\b404\b|not found/i.test(msg);
        const isNetwork = /\b(?:5\d{2}|fetch|network|failed to fetch)\b/i.test(msg);
        console.error('Failed to fetch model files:', err);

        if ((isMissing || isNetwork) && tryCompileFromCode(isMissing ? '3D file missing (404)' : 'Network error')) {
          return; // recovered via compile fallback — don't throw
        }
        toast.error(isMissing ? 'The 3D file is no longer available.' : 'Could not load 3D model assets.');
        throw err;
      }
    },
    [importer, addToCache, setOriginalCode, activeConversationId, updateConversation, onShapeUpdated, onModelLoaded]
  );


    const recoverModel = useCallback(
    async (jobId: string, existingShape?: GeneratedShape) => {
        // If we already have a complete shape, just load it directly.
        // fetchModelFiles handles its own URL-failure → scadCode fallback.
        if (existingShape?.sdfUrl) {
            try { await fetchModelFiles(existingShape); } catch {}
            return;
        }

        try {
            const assets = await assetService.fetchAssets(jobId);
            const recoveredShape = await assetService.mapToGeneratedShape(jobId, assets);
            if (recoveredShape) {
                try { await fetchModelFiles(recoveredShape); } catch {}
            } else if (existingShape?.scadCode) {
                // No assets came back but we have code — compile from it.
                const es = useEditorStore.getState();
                es.setOriginalCode(existingShape.scadCode);
                es.setCode(existingShape.scadCode);
                setTimeout(() => useEditorStore.getState().requestCompile(), 300);
            }
        } catch (e) {
            console.error('[useModelFetch] Failed to recover model:', e);
            toast.error('Failed to recover model from backend.');
        }
    },
    [fetchModelFiles]
    );

  return { fetchModelFiles, recoverModel };
};
