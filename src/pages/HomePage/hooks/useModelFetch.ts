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

        // Step 3: Build updated parts list locally
        const parts: any[] = [];
        imported.group.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            parts.push({
              id: child.uuid,
              name: child.name || 'Solid Part',
              category: 'component',
              role: 'structural',
              group: 'Model Components',
              assetName: child.userData.sourceFile || null,
            });
          }
        });

        // Step 4: Construct the final shape object before any state updates
        const updatedShape: GeneratedShape = {
          ...shape,
          scadCode: imported.scad || shape.scadCode,
          geometry: {
            ...shape.geometry,
            parts: parts,
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
        console.error('Failed to fetch model files:', err);
        toast.error('Could not load 3D model assets.');
        throw err;
      }
    },
    [importer, addToCache, setOriginalCode, activeConversationId, updateConversation, onShapeUpdated, onModelLoaded]
  );


    const recoverModel = useCallback(
    async (jobId: string, existingShape?: GeneratedShape) => {
        // If we already have a complete shape, just load it directly
        if (existingShape?.sdfUrl && existingShape.scadCode) {
        await fetchModelFiles(existingShape);
        return;
        }

        try {
        // Fetch assets for the job from the backend
        const assets = await assetService.fetchAssets(jobId);
        const recoveredShape = await assetService.mapToGeneratedShape(jobId, assets);

        if (recoveredShape) {
            await fetchModelFiles(recoveredShape);
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
