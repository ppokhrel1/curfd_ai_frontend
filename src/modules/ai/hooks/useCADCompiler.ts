import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import { cadService } from '@/modules/ai/services/cadService';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';

export const useCADCompiler = (onShapeGenerated?: (shape: GeneratedShape | null) => void) => {
  const { code, setCompiling } = useEditorStore();
  
  const compile = useCallback(async () => {
    if (!code.trim()) return;

    setCompiling(true);
    const toastId = toast.loading('Submitting task...');
    
    try {
      // Step 1: Submit to /generate
      const taskId = await cadService.generate(code, 'STL');

      // Step 2: Track via WS
      cadService.connectToTask(
        taskId,
        async (filename) => {
          try {
            // Step 3: Download
            const { url, blob, filename: originalFilename } = await cadService.downloadAndCreateBlob(filename);


            const newShape: GeneratedShape = {
              id: `manual-${Date.now()}`,
              name: 'Manual Build',
              type: 'generic',
              description: 'Generated via CAD Editor',
              hasSimulation: false,
              scadCode: code,
              sdfUrl: url,
              geometry: { parts: [], 
                metadata: { totalVertices: 0, 
                    fileSize: blob.size, 
                    originalFilename 
                } },
              createdAt: new Date(),
            };

            if (onShapeGenerated) onShapeGenerated(newShape);
            toast.success('Build successful!', { id: toastId });
          } catch (err) {
            toast.error('Failed to download model.', { id: toastId });
          } finally {
            setCompiling(false);
          }
        },
        (error) => {
          // Handle structured error object: {"message": "...", "line": null}
          const displayError = typeof error === 'object' ? error.message : error;
          toast.error(`Build failed: ${displayError}`, { id: toastId });
          setCompiling(false);
        }
      );

    } catch (e: any) {
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0].msg : detail || e.message;
      toast.error(`Submission error: ${msg}`, { id: toastId });
      setCompiling(false);
    }
  }, [code, setCompiling, onShapeGenerated]);

  return { compile };
};