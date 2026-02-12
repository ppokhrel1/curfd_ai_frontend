import { create } from "zustand";

interface EditorState {
    code: string;
    originalCode: string;
    isDirty: boolean;
    isCompiling: boolean;
    lastCompiledCode: string | null;
    error: string | null;
    errorLine: number | null;

    setCode: (code: string) => void;
    setOriginalCode: (code: string) => void;
    setCompiling: (compiling: boolean) => void;
    setError: (error: string | null, line?: number | null) => void;
    compile: () => void;
    reset: () => void;
    clear: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    code: "",
    originalCode: "",
    isDirty: false,
    isCompiling: false,
    lastCompiledCode: null,
    error: null,
    errorLine: null,

    setCode: (code: string) => {
        set({ code, isDirty: code !== get().originalCode });
    },

    setOriginalCode: (code: string) => {
        set({ originalCode: code, code, isDirty: false, lastCompiledCode: code, error: null, errorLine: null, isCompiling: false });
    },

    setCompiling: (isCompiling: boolean) => {
        set({ isCompiling });
    },

    setError: (error: string | null, line: number | null = null) => {
        set({ error, errorLine: line });
    },

    compile: () => {
        set({ isCompiling: true, error: null, errorLine: null });

        // Note: Real compilation is triggered via chatService.startRunpodRequest
        // in components or hooks that use this store.
        // This store just tracks the compilation state.
    },

    reset: () => {
        const { originalCode } = get();
        set({ code: originalCode, isDirty: false, error: null, errorLine: null, isCompiling: false });
    },

    clear: () => {
        set({
            code: "",
            originalCode: "",
            isDirty: false,
            isCompiling: false,
            lastCompiledCode: null,
            error: null,
            errorLine: null
        });
    },
}));
