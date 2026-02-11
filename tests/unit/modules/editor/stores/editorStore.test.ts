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
});
