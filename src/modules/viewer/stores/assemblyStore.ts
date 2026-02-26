import { create } from "zustand";
import * as THREE from "three";
import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import { encryptedApi as api } from "@/lib/api/encryptedClient";

export interface AssemblyPart {
  id: string;
  jobId: string;
  name: string;
  shape: GeneratedShape;
  model: THREE.Group | null;
  isLoading: boolean;
  position: [number, number, number];
  rotation: [number, number, number]; // degrees XYZ
  visible: boolean;
}

interface AssemblyState {
  parts: AssemblyPart[];
  addPart: (shape: GeneratedShape, jobId: string) => string;
  removePart: (id: string) => void;
  updatePartModel: (id: string, model: THREE.Group) => void;
  updateTransform: (
    id: string,
    position?: [number, number, number],
    rotation?: [number, number, number]
  ) => void;
  renamePart: (id: string, name: string) => void;
  toggleVisibility: (id: string) => void;
  clearAssembly: () => void;
  generateCombinedScad: () => string | null;
  saveToBackend: (chatId: string, token: string) => Promise<void>;
  loadFromBackend: (chatId: string, token: string) => Promise<void>;
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useAssemblyStore = create<AssemblyState>((set, get) => ({
  parts: [],

  addPart: (shape, jobId) => {
    const id = `asm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newPart: AssemblyPart = {
      id,
      jobId,
      name: shape.name || `Part ${get().parts.length + 1}`,
      shape,
      model: null,
      isLoading: true,
      position: [get().parts.length * 2, 0, 0], // offset each new part slightly
      rotation: [0, 0, 0],
      visible: true,
    };
    set(state => ({ parts: [...state.parts, newPart] }));
    return id;
  },

  removePart: (id) => {
    set(state => ({ parts: state.parts.filter(p => p.id !== id) }));
  },

  updatePartModel: (id, model) => {
    set(state => ({
      parts: state.parts.map(p =>
        p.id === id ? { ...p, model, isLoading: false } : p
      ),
    }));
  },

  updateTransform: (id, position, rotation) => {
    set(state => ({
      parts: state.parts.map(p => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...(position !== undefined ? { position } : {}),
          ...(rotation !== undefined ? { rotation } : {}),
        };
      }),
    }));
  },

  renamePart: (id, name) => {
    set(state => ({
      parts: state.parts.map(p => p.id === id ? { ...p, name } : p),
    }));
  },

  toggleVisibility: (id) => {
    set(state => ({
      parts: state.parts.map(p =>
        p.id === id ? { ...p, visible: !p.visible } : p
      ),
    }));
  },

  clearAssembly: () => {
    set({ parts: [] });
  },

  generateCombinedScad: () => {
    const { parts } = get();
    const withCode = parts.filter(p => {
      const code = p.shape.scadCode || p.shape.metadata_json?.scadCode || p.shape.metadata_json?.scad_code;
      return !!code;
    });
    if (withCode.length === 0) return null;

    const blocks = withCode.map(p => {
      const code = (p.shape.scadCode || p.shape.metadata_json?.scadCode || p.shape.metadata_json?.scad_code || "").trim();
      const [x, y, z] = p.position;
      const [rx, ry, rz] = p.rotation;
      return `// Part: ${p.name}\ntranslate([${x}, ${y}, ${z}])\nrotate([${rx}, ${ry}, ${rz}])\n{\n${code}\n}`;
    });

    return `// Combined Assembly — ${new Date().toLocaleDateString()}\nunion() {\n${blocks.join("\n\n")}\n}\n`;
  },

  saveToBackend: async (chatId, token) => {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      try {
        const { parts } = get();
        // Strip THREE.Group (not serialisable) before sending
        const serialisable = parts.map(({ model, isLoading, ...rest }) => rest);
        await api.post(
          "/assembly",
          { chat_id: chatId, name: "My Assembly", parts: serialisable },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.warn("[assemblyStore] Failed to persist assembly:", err);
      }
    }, 1000);
  },

  loadFromBackend: async (chatId, token) => {
    try {
      const res = await api.get<any>(`/assembly/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (res as any).data || res;
      if (data?.parts && Array.isArray(data.parts)) {
        // Re-hydrate parts without model (models will be loaded on demand)
        const hydrated: AssemblyPart[] = data.parts.map((p: any) => ({
          ...p,
          model: null,
          isLoading: false,
        }));
        set({ parts: hydrated });
      }
    } catch {
      // 404 = no saved assembly yet — silently ignore
    }
  },
}));
