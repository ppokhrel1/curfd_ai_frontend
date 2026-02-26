import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '../../../../../src/modules/editor/stores/editorStore';

describe('useEditorStore', () => {
    beforeEach(() => {
        useEditorStore.getState().clear();
    });

    it('should initialize with default state', () => {
        const state = useEditorStore.getState();
        expect(state.code).toBe('');
        expect(state.originalCode).toBe('');
        expect(state.isDirty).toBe(false);
        expect(state.isCompiling).toBe(false);
        expect(state.lastCompiledCode).toBeNull();
    });

    it('should update code and set dirty flag', () => {
        useEditorStore.getState().setOriginalCode('const a = 1;');
        useEditorStore.getState().setCode('const a = 2;');

        const state = useEditorStore.getState();
        expect(state.code).toBe('const a = 2;');
        expect(state.isDirty).toBe(true);
    });

    it('should compile code', () => {
        useEditorStore.getState().setCode('code');
        vi.useFakeTimers();

        useEditorStore.getState().compile();
        expect(useEditorStore.getState().isCompiling).toBe(true);

        vi.advanceTimersByTime(800);

        const state = useEditorStore.getState();
        expect(state.isCompiling).toBe(false);
        expect(state.lastCompiledCode).toBe('code');
        expect(state.isDirty).toBe(false);

        vi.useRealTimers();
    });

    it('should reset code to original', () => {
        useEditorStore.getState().setOriginalCode('original');
        useEditorStore.getState().setCode('modified');
        expect(useEditorStore.getState().isDirty).toBe(true);

        useEditorStore.getState().reset();
        const state = useEditorStore.getState();
        expect(state.code).toBe('original');
        expect(state.isDirty).toBe(false);
    });

    it('should NOT clear optimization jobs when clear() is called', () => {
        // Add an optimization job to the store
        const mockJob = {
            id: 'job-123',
            status: 'Completed' as const,
            fitness_score: 0.95,
            result_url: 'https://example.com/model.stl',
            optimized_parameters: { param1: 10 },
        };
        useEditorStore.getState().addOptimizationJob(mockJob);

        // Verify the job was added
        expect(useEditorStore.getState().optimizationJobs).toHaveLength(1);
        expect(useEditorStore.getState().optimizationJobs[0].id).toBe('job-123');

        // Clear the editor state
        useEditorStore.getState().clear();

        // Optimization jobs should persist (not be cleared)
        expect(useEditorStore.getState().optimizationJobs).toHaveLength(1);
        expect(useEditorStore.getState().optimizationJobs[0].id).toBe('job-123');
    });
});
