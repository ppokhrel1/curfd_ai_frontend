import { useCallback } from 'react';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { ModelImporter } from '@/modules/viewer/services/ModelImporter';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import { assetService, type Asset } from '@/modules/viewer/services/assetService';

interface UsePartSwapProps {
  loadedModel: THREE.Group | null;
  currentShape: GeneratedShape | null;
  setCurrentShape: (shape: GeneratedShape | null) => void;
  setLoadedModel: (model: THREE.Group | null) => void;
}

export const usePartSwap = ({
  loadedModel,
  currentShape,
  setCurrentShape,
  setLoadedModel,
}: UsePartSwapProps) => {
  return useCallback(
    async (partId: string, asset: Asset) => {
      if (!loadedModel || !currentShape) return;

      const toastId = toast.loading(`Swapping part with ${asset.name}...`);
      let localUrl: string | null = null;

      try {
        let blob: Blob;

        if (asset.asset_type === 'openscad_part') {
          // Compile individual part from parent SCAD code via backend
          blob = await assetService.compilePartToSTL(asset.id);
        } else {
          // Direct download for non-SCAD assets (GLB, STL, etc.)
          const assetUrl = asset.url || asset.uri;
          if (!assetUrl) {
            throw new Error('Asset URL not available');
          }
          const response = await fetch(assetUrl);
          if (!response.ok) throw new Error('Failed to download asset');
          blob = await response.blob();
        }

        localUrl = URL.createObjectURL(blob);

        // 2. Parse geometry
        const importer = new ModelImporter();
        const newObject = await importer.loadSingleAsset(
          localUrl,
          asset.name || 'New Part'
        );

        // 3. Find target part
        let targetMesh: THREE.Mesh | null = null;
        let targetParent: THREE.Object3D | null = null;

        loadedModel.traverse((child) => {
          if (child.uuid === partId && (child as THREE.Mesh).isMesh) {
            targetMesh = child as THREE.Mesh;
            targetParent = child.parent;
          }
        });

        if (!targetMesh || !targetParent) {
          throw new Error('Target part not found in scene');
        }

        // 4. Transform new object to match old – use non‑null assertions
        const mesh = targetMesh as THREE.Mesh;
        const parent = targetParent as THREE.Object3D;

        newObject.position.copy(mesh.position);
        newObject.quaternion.copy(mesh.quaternion);
        newObject.scale.copy(mesh.scale);

        // 5. Replace in scene
        parent.remove(mesh);
        parent.add(newObject);

        // 6. Update shape data
        const updatedParts = currentShape.geometry.parts.map((p) =>
          p.id === partId
            ? {
                ...p,
                id: newObject.uuid,
                name: newObject.name,
                assetName: asset.name,
                assetUrl: asset.url,
              }
            : p
        );

        const newAssetEntry = {
          filename: asset.name || 'Unnamed Asset',
          url: localUrl,
        };

        const updatedShape: GeneratedShape = {
          ...currentShape,
          geometry: {
            ...currentShape.geometry,
            parts: updatedParts,
          },
          assets: [...(currentShape.assets || []), newAssetEntry],
        };

        setCurrentShape(updatedShape);
        setLoadedModel(loadedModel); // scene was mutated, trigger re‑render

        toast.success('Part swapped successfully!', { id: toastId });
      } catch (e) {
        console.error(e);
        toast.error('Failed to swap part', { id: toastId });
      } finally {
        // Clean up blob URL
        if (localUrl) {
          URL.revokeObjectURL(localUrl);
        }
      }
    },
    [loadedModel, currentShape, setCurrentShape, setLoadedModel]
  );
};