import { create } from "zustand";

export interface EditorParameter {
  name: string;
  min_val: number;
  max_val: number;
  default_val: number;
  description?: string;
}

interface EditorState {
    code: string;
    originalCode: string;
    isDirty: boolean;
    isCompiling: boolean;
    lastCompiledCode: string | null;
    mode: "requirements" | "code";

    setCode: (code: string) => void;
    setOriginalCode: (code: string) => void;
    setCompiling: (compiling: boolean) => void;
    compile: () => void;
    reset: () => void;
    clear: () => void;
    setMode: (mode: "requirements" | "code") => void;


    parameters: EditorParameter[];
    setParameters: (params: EditorParameter[]) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    code: "",
    originalCode: "",
    isDirty: false,
    isCompiling: false,
    lastCompiledCode: null,
    mode: "code", 


    parameters: [],

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
            lastCompiledCode: null,
            mode: "code",

            parameters: [] 
        });
    },

    setMode: (mode: "requirements" | "code") => {
        set({ mode });
    },


    setParameters: (params: EditorParameter[]) => {
        set({ parameters: params });
    }
}));