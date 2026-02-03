import { create } from "zustand";

interface EditorState {
    code: string;
    originalCode: string;
    isDirty: boolean;
    isCompiling: boolean;
    lastCompiledCode: string | null;

    setCode: (code: string) => void;
    setOriginalCode: (code: string) => void;
    setCompiling: (compiling: boolean) => void;
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

    setCode: (code: string) => {
        set({ code, isDirty: code !== get().originalCode });
    },

    setOriginalCode: (code: string) => {
        set({ originalCode: code, code, isDirty: false, lastCompiledCode: code });
    },

    setCompiling: (isCompiling: boolean) => {
        set({ isCompiling });
    },

    compile: () => {
        const { code } = get();
        set({ isCompiling: true });

        // Simulate compilation delay
        setTimeout(() => {
            set({
                lastCompiledCode: code,
                isCompiling: false,
                isDirty: false
            });
        }, 800);
    },

    reset: () => {
        const { originalCode } = get();
        set({ code: originalCode, isDirty: false });
    },

    clear: () => {
        set({
            code: "",
            originalCode: "",
            isDirty: false,
            lastCompiledCode: null
        });
    },
}));
