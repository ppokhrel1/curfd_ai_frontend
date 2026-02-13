import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import { cadService } from '@/modules/ai/services/cadService';
import toast from 'react-hot-toast';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import { useCADCompiler } from '@/modules/ai/hooks/useCADCompiler';

// --- Mocks ---
vi.mock('@/modules/editor/stores/editorStore', () => ({
  useEditorStore: vi.fn(),
}));

vi.mock('@/modules/ai/services/cadService', () => ({
  cadService: {
    generate: vi.fn(),
    connectToTask: vi.fn(),
    downloadAndCreateBlob: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useCADCompiler', () => {
  const mockSetCompiling = vi.fn();
  const mockOnShapeGenerated = vi.fn();
  const mockCode = 'cube(10);';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default store mock
    (useEditorStore as any).mockReturnValue({
      code: mockCode,
      setCompiling: mockSetCompiling,
    });
  });

  it('should not compile if code is empty', () => {
    (useEditorStore as any).mockReturnValue({
      code: '',
      setCompiling: mockSetCompiling,
    });

    const { result } = renderHook(() => useCADCompiler(mockOnShapeGenerated));
    const { compile } = result.current;

    act(() => {
      compile();
    });

    expect(mockSetCompiling).not.toHaveBeenCalled();
    expect(toast.loading).not.toHaveBeenCalled();
    expect(cadService.generate).not.toHaveBeenCalled();
  });

  describe('successful compilation', () => {
    const mockTaskId = 'task-123';
    const mockFilename = 'model.stl';
    const mockBlob = new Blob(['fake stl']);
    const mockUrl = 'blob:mock-url';
    const mockDownloadResult = {
      url: mockUrl,
      blob: mockBlob,
      filename: mockFilename,
    };

    beforeEach(() => {
      (cadService.generate as any).mockResolvedValue(mockTaskId);
      (cadService.downloadAndCreateBlob as any).mockResolvedValue(mockDownloadResult);
    });

    it('should compile successfully and call onShapeGenerated', async () => {
      // Simulate connectToTask calling the success callback
      (cadService.connectToTask as any).mockImplementation((taskId, onSuccess, onError) => {
        // Immediately call onSuccess with filename
        onSuccess(mockFilename);
      });

      const { result } = renderHook(() => useCADCompiler(mockOnShapeGenerated));
      const { compile } = result.current;

      act(() => {
        compile();
      });

      // Check initial loading state
      expect(mockSetCompiling).toHaveBeenCalledWith(true);
      expect(toast.loading).toHaveBeenCalledWith('Submitting task...');

      // Wait for async operations
      await waitFor(() => {
        expect(cadService.generate).toHaveBeenCalledWith(mockCode, 'STL');
        expect(cadService.connectToTask).toHaveBeenCalledWith(
          mockTaskId,
          expect.any(Function),
          expect.any(Function)
        );
        expect(cadService.downloadAndCreateBlob).toHaveBeenCalledWith(mockFilename);
        expect(mockOnShapeGenerated).toHaveBeenCalledTimes(1);
      });

      const generatedShape = mockOnShapeGenerated.mock.calls[0][0] as GeneratedShape;
      expect(generatedShape).toMatchObject({
        id: expect.stringMatching(/^manual-/),
        name: 'Manual Build',
        scadCode: mockCode,
        sdfUrl: mockUrl,
        geometry: {
          parts: [],
          metadata: {
            fileSize: mockBlob.size,
            originalFilename: mockFilename,
          },
        },
      });

      expect(toast.success).toHaveBeenCalledWith('Build successful!', { id: 'toast-id' });
      expect(mockSetCompiling).toHaveBeenCalledWith(false);
    });

    it('should handle download error inside connectToTask', async () => {
      (cadService.connectToTask as any).mockImplementation((taskId, onSuccess, onError) => {
        // Simulate success callback but download fails
        onSuccess(mockFilename);
      });
      (cadService.downloadAndCreateBlob as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCADCompiler(mockOnShapeGenerated));
      const { compile } = result.current;

      act(() => {
        compile();
      });

      await waitFor(() => {
        expect(cadService.downloadAndCreateBlob).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Failed to download model.', { id: 'toast-id' });
        expect(mockSetCompiling).toHaveBeenCalledWith(false);
        expect(mockOnShapeGenerated).not.toHaveBeenCalled();
      });
    });

    it('should handle task error callback', async () => {
      const errorObj = { message: 'Invalid syntax', line: 5 };
      (cadService.connectToTask as any).mockImplementation((taskId, onSuccess, onError) => {
        // Call error callback
        onError(errorObj);
      });

      const { result } = renderHook(() => useCADCompiler(mockOnShapeGenerated));
      const { compile } = result.current;

      act(() => {
        compile();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Build failed: Invalid syntax', { id: 'toast-id' });
        expect(mockSetCompiling).toHaveBeenCalledWith(false);
        expect(mockOnShapeGenerated).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle submission error (generate throws)', async () => {
      const error = {
        response: {
          data: {
            detail: [{ msg: 'Model too complex' }],
          },
        },
        message: 'Network error',
      };
      (cadService.generate as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCADCompiler(mockOnShapeGenerated));
      const { compile } = result.current;

      act(() => {
        compile();
      });

      expect(mockSetCompiling).toHaveBeenCalledWith(true);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Submission error: Model too complex', { id: 'toast-id' });
        expect(mockSetCompiling).toHaveBeenCalledWith(false);
      });
    });

    it('should handle submission error with string detail', async () => {
      const error = {
        response: {
          data: {
            detail: 'Bad request',
          },
        },
      };
      (cadService.generate as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCADCompiler(mockOnShapeGenerated));
      const { compile } = result.current;

      act(() => {
        compile();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Submission error: Bad request', { id: 'toast-id' });
      });
    });

    it('should handle submission error without response detail', async () => {
      const error = new Error('Network failure');
      (cadService.generate as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCADCompiler(mockOnShapeGenerated));
      const { compile } = result.current;

      act(() => {
        compile();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Submission error: Network failure', { id: 'toast-id' });
      });
    });
  });

  it('should work without onShapeGenerated callback', async () => {
    (cadService.generate as any).mockResolvedValue('task-123');
    (cadService.downloadAndCreateBlob as any).mockResolvedValue({
      url: 'blob:url',
      blob: new Blob(),
      filename: 'model.stl',
    });
    (cadService.connectToTask as any).mockImplementation((taskId, onSuccess) => {
      onSuccess('model.stl');
    });

    const { result } = renderHook(() => useCADCompiler());
    const { compile } = result.current;

    act(() => {
      compile();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      // No onShapeGenerated to call, but should not throw
    });
  });
});