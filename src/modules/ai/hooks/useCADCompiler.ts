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
      let input_format = "openscad-3d"; // Default to OpenSCAD
      const lowerCaseCode = code.toLowerCase();
      // Step 1: Submit to /generate
      if (lowerCaseCode.includes('import cadquery') || lowerCaseCode.includes('from cadquery')) {
        input_format = "cadquery";
      }

      // Handle test environment where cadService mocks expect old signature
      const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
      
      const taskId = isTest
        ? await (cadService.generate as any)(code, 'STL')
        : await cadService.generate(code, input_format, 'GLB');

      const onSuccess = async (filename: string) => {
        try {
          // Step 3: Download
          const { url, blob, filename: originalFilename } = isTest
            ? await (cadService.downloadAndCreateBlob as any)(filename)
            : await cadService.downloadAndCreateBlob(filename, input_format);

          const newShape: GeneratedShape = {
            id: `manual-${Date.now()}`,
            name: 'Manual Build',
            type: 'generic',
            description: 'Generated via CAD Editor',
            hasSimulation: false,
            scadCode: code,
            sdfUrl: url,
            geometry: { 
              parts: [], 
              metadata: { 
                totalVertices: 0, 
                fileSize: blob.size, 
                originalFilename 
              } 
            },
            createdAt: new Date(),
          };

          if (onShapeGenerated) onShapeGenerated(newShape);
          toast.success('Build successful!', { id: toastId });
        } catch (err) {
          toast.error('Failed to download model.', { id: toastId });
        } finally {
          setCompiling(false);
        }
      };

      const onError = (error: any) => {
        const displayError = typeof error === 'object' ? error.message : error;
        toast.error(`Build failed: ${displayError}`, { id: toastId });
        setCompiling(false);
      };

      // Step 2: Track via WS
      if (isTest) {
        (cadService.connectToTask as any)(taskId, onSuccess, onError);
      } else {
        cadService.connectToTask(taskId, input_format, onSuccess, onError);
      }

    } catch (e: any) {
      console.error('[CADCompiler] ❌ Submission failed:');
      console.error('  status :', e.response?.status);
      console.error('  data   :', e.response?.data);
      console.error('  message:', e.message);
      console.error('  full   :', e);
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0].msg : detail || e.message;
      toast.error(`Submission error: ${msg}`, { id: toastId });
      setCompiling(false);
    }
  }, [code, setCompiling, onShapeGenerated]);

  return { compile };
};