import { useState, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { chatService } from '@/modules/ai/services/chatService';
import { jobService } from '@/modules/ai/services/jobService';
import { assetService } from '@/modules/viewer/services/assetService';
import { ModelImporter } from '@/modules/viewer/services/ModelImporter';
import { useChatStore } from '@/modules/ai/stores/chatStore';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import type { ImportStage } from '@/modules/viewer/components/ModelImportOverlay';

interface UseModelImportProps {
  activeConversationId: string | null;
  onImportComplete: (shape: GeneratedShape, group: THREE.Group) => void;
}

export const useModelImport = ({ activeConversationId, onImportComplete }: UseModelImportProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStage, setImportStage] = useState<ImportStage>('idle');
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importer = useMemo(() => new ModelImporter(), []);

  const { jobHistory, addJobToHistory } = useChatStore();
  const { setOriginalCode } = useEditorStore();

  const handleImportModel = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImportFileName(file.name);
      setIsImporting(true);
      setImportStage('reading');

      try {
        // Only support .zip files for full import
        if (!file.name.endsWith('.zip')) {
          toast.error('Please import a .zip folder containing your model assets for full support.');
          setIsImporting(false);
          return;
        }

        setImportStage('registering');
        const sessionId = chatService.getCurrentSessionId();
        let jobId = `local-${Date.now()}`;

        // Deduplicate: Check if a mission for this file already exists in this chat
        if (sessionId) {
          const existingJob = (jobHistory[activeConversationId || ''] || []).find(
            (j) => j.prompt === `Imported Model: ${file.name}`
          );

          if (existingJob) {
            jobId = existingJob.id;
          } else {
            try {
              const job = await jobService.createJob({
                session_id: sessionId,
                prompt: `Imported Model: ${file.name}`,
                output_format: 'glb',
                status: 'succeeded',
              });
              jobId = job.id;

              if (activeConversationId) {
                addJobToHistory(activeConversationId, {
                  ...job,
                  status: 'succeeded',
                  createdAt: new Date(),
                });
              }
            } catch (e) {
              console.warn('Failed to register job in backend, using local ID', e);
            }
          }
        }

        setImportStage('extracting');
        const imported = await importer.importZip(file);

        setImportStage('analyzing');

        // Set SCAD code if present
        if (imported.scad) {
          setOriginalCode(imported.scad);
        }

        // Calculate stats
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

        const bbox = new THREE.Box3().setFromObject(imported.group);

        setImportStage('registering');
        let assetId = `imported-${Date.now()}`;
        const isNewMission =
          jobId && !jobId.startsWith('local-') && !jobHistory[activeConversationId || '']?.some((j) => j.id === jobId);

        if (isNewMission) {
          try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
              };
              reader.readAsDataURL(file);
            });

            const base64Data = await base64Promise;

            const asset = await assetService.createAsset({
              job_id: jobId,
              asset_type: 'zip',
              uri: file.name,
              storage_provider: 'base64',
              metadata_json: {
                data: base64Data,
                stats: { triangles: triCount, vertices: vertCount },
                originalName: file.name,
              },
            });
            assetId = asset.id;

            // Register part metadata (limit to 50 to avoid overloading)
            const partPromises: Promise<any>[] = [];
            imported.group.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                partPromises.push(
                  assetService.createAssetMeta({
                    asset_id: assetId,
                    part_name: child.name || 'Solid Part',
                    component_of: undefined,
                    position_json: {
                      x: child.position.x,
                      y: child.position.y,
                      z: child.position.z,
                    },
                  })
                );
              }
            });
            if (partPromises.length > 0) {
              await Promise.all(partPromises.slice(0, 50));
            }
          } catch (e) {
            console.warn('Failed to register assets in backend', e);
          }
        }

        setImportStage('finalizing');

        // Build parts list
        const parts: any[] = [];
        const contentsGroup = imported.group.children.find((c) => c.name === 'Model Contents');
        const groupToTraverse = contentsGroup || imported.group;

        groupToTraverse.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            parts.push({
              id: mesh.uuid,
              name: mesh.name || 'Unnamed Part',
              category: 'component',
              role: 'structural',
              description: 'Imported part',
              material: 'Standard',
              group: 'Model Components',
              assetName: mesh.userData.sourceFile || null,
            });
          }
        });

        const shapeData: GeneratedShape = {
          id: assetId,
          name: imported.name,
          type: 'generic',
          description: `Imported model: ${imported.name}.`,
          hasSimulation: false,
          scadCode: imported.scad,
          jobId: jobId && !jobId.startsWith('local-') ? jobId : undefined,
          sdfUrl: URL.createObjectURL(file),
          geometry: {
            parts: parts,
            physics: imported.physics,
            yaml: imported.yaml,
            config: imported.config,
            specification: imported.specification,
            metadata: {
              totalVertices: vertCount,
              boundingBox: {
                min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
                max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
              },
            },
          },
          assets: imported.assets,
          createdAt: new Date(),
        };

        // Notify parent that import is complete
        onImportComplete(shapeData, imported.group);

        setImportStage('complete');
        setTimeout(() => setIsImporting(false), 1000);
      } catch (error) {
        console.error('Import error:', error);
        toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsImporting(false);
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [activeConversationId, importer, jobHistory, addJobToHistory, setOriginalCode, onImportComplete]
  );

  return {
    isImporting,
    importStage,
    importFileName,
    fileInputRef,
    handleImportModel,
    handleFileImport,
  };
};