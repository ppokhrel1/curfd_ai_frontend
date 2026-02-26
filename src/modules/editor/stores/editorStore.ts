import { create } from "zustand";

// Extract top-level numeric variables as tunable parameters
const extractParametersFromCode = (code: string): EditorParameter[] => {
  const params: EditorParameter[] = [];
  const regex = /^\s*([a-zA-Z0-9_]+)\s*=\s*([-+]?[0-9]*\.?[0-9]+)\s*;/gm;
  const ignored = new Set(['$fn', '$fa', '$fs', 'eps', 'epsilon']);
  let match;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    const val = parseFloat(match[2]);
    if (!ignored.has(name) && !isNaN(val)) {
      const min_val = val > 0 ? Math.floor(val * 0.5) : val - 10;
      const max_val = val > 0 ? Math.ceil(val * 1.5) : val + 10;
      params.push({ name, default_val: val, min_val: min_val === max_val ? min_val - 5 : min_val, max_val: min_val === max_val ? max_val + 5 : max_val, description: `Auto-extracted: ${name}` });
    }
  }
  return params;
};

export interface EditorParameter {
  name: string;
  min_val: number;
  max_val: number;
  default_val: number;
  description?: string;
}

export interface OptimizationJob {
  id: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Completed (best from GA)' | 'Failed';
  fitness_score?: number;
  result_url?: string;
  optimized_parameters?: Record<string, number>;
  error?: string;
}

export interface ScadVersionSummary {
  id: string;
  chat_id: string;
  version_number: number;
  label: string | null;
  created_at: string;
}

interface EditorState {
    code: string;
    originalCode: string;
    isDirty: boolean;
    isCompiling: boolean;
    lastCompiledCode: string | null;
    mode: "requirements" | "code";

    setCode: (code: string) => void;
    setCodeSilent: (code: string) => void;
    setOriginalCode: (code: string) => void;
    setCompiling: (compiling: boolean) => void;
    compile: () => void;
    reset: () => void;
    clear: () => void;
    setMode: (mode: "requirements" | "code") => void;

    parameters: EditorParameter[];
    setParameters: (params: EditorParameter[]) => void;

    compileRequested: boolean;
    requestCompile: () => void;
    clearCompileRequest: () => void;

    optimizationJobs: OptimizationJob[];
    addOptimizationJob: (job: OptimizationJob) => void;
    updateOptimizationJob: (id: string, update: Partial<OptimizationJob>) => void;

    versions: ScadVersionSummary[];
    currentVersionId: string | null;
    loadVersions: (chatId: string, token: string) => Promise<void>;
    saveVersion: (chatId: string, token: string) => Promise<void>;
    loadVersion: (chatId: string, versionId: string, token: string) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    code: "",
    originalCode: "",
    isDirty: false,
    isCompiling: false,
    lastCompiledCode: null,
    mode: "code",

    parameters: [],
    compileRequested: false,
    optimizationJobs: [],
    versions: [],
    currentVersionId: null,

    setCode: (code: string) => {
        set({ code, isDirty: code !== get().originalCode });
    },

    // Updates the visible editor code without marking dirty → auto-compile is skipped
    setCodeSilent: (code: string) => {
        set({ code, originalCode: code, isDirty: false });
    },

    setOriginalCode: (code: string) => {
        const extracted = extractParametersFromCode(code);
        set({ originalCode: code, code, isDirty: false, lastCompiledCode: code, parameters: extracted });
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
            parameters: [],
            compileRequested: false,
            // optimizationJobs are NOT cleared here — they belong to the conversation
            // and are managed separately by useOptimization (fetched per chatId).
        });
    },

    setMode: (mode: "requirements" | "code") => {
        set({ mode });
    },


    setParameters: (params: EditorParameter[]) => {
        set({ parameters: params });
    },

    requestCompile: () => set({ compileRequested: true }),
    clearCompileRequest: () => set({ compileRequested: false }),

    addOptimizationJob: (job: OptimizationJob) => {
        set(state => ({ optimizationJobs: [job, ...state.optimizationJobs] }));
    },

    updateOptimizationJob: (id: string, update: Partial<OptimizationJob>) => {
        set(state => ({
            optimizationJobs: state.optimizationJobs.map(j => j.id === id ? { ...j, ...update } : j)
        }));
    },

    loadVersions: async (chatId: string, token: string) => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        try {
            const res = await fetch(`${apiBase}/scad-versions/${chatId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const versions: ScadVersionSummary[] = await res.json();
            set({ versions });
        } catch (e) {
            console.warn('[editorStore] Failed to load versions:', e);
        }
    },

    saveVersion: async (chatId: string, token: string) => {
        const { code } = get();
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${apiBase}/scad-versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ chat_id: chatId, code })
        });
        if (!res.ok) throw new Error('Failed to save version');
        const saved = await res.json();
        const summary: ScadVersionSummary = {
            id: saved.id,
            chat_id: saved.chat_id,
            version_number: saved.version_number,
            label: saved.label,
            created_at: saved.created_at,
        };
        set(state => ({
            versions: [summary, ...state.versions],
            currentVersionId: saved.id,
            originalCode: code,
            isDirty: false,
        }));
    },

    loadVersion: async (chatId: string, versionId: string, token: string) => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${apiBase}/scad-versions/${chatId}/${versionId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load version');
        const version = await res.json();
        const extracted = extractParametersFromCode(version.code);
        set({ code: version.code, originalCode: version.code, isDirty: false, currentVersionId: versionId, parameters: extracted });
    },
}));