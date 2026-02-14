import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import * as THREE from "three";
import { useActiveConversationSync } from "@/pages/HomePage/hooks";

// 1. Mock the editor store
vi.mock("@/modules/editor/stores/editorStore", () => ({
  useEditorStore: {
    getState: vi.fn(),
  },
}));

// 2. Mock Three.js Group
vi.mock("three", () => ({
  Group: class {},
}));

describe("useActiveConversationSync", () => {
  // Mock implementations for props
  const mockModelCache = {
    getFromCache: vi.fn(),
    hasInCache: vi.fn(),
  };

  const mockModelFetch = {
    fetchModelFiles: vi.fn(),
    recoverModel: vi.fn(),
  };

  const mockCallbacks = {
    onShapeLoaded: vi.fn(),
    setCurrentShape: vi.fn(),
    setLoadedModel: vi.fn(),
    setModelStats: vi.fn(),
  };

  const mockEditorStore = {
    isCompiling: false,
    code: "",
    originalCode: "",
    clear: vi.fn(),
    setCode: vi.fn(),
    setOriginalCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default store mock behavior
    (useEditorStore.getState as any).mockReturnValue(mockEditorStore);
    
    // Reset mutable editor store mock state
    mockEditorStore.isCompiling = false;
    mockEditorStore.code = "";
    mockEditorStore.originalCode = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create props
  const createProps = (overrides = {}) => ({
    activeConversationId: "conv-1",
    activeConv: { generatedShape: { id: "shape-1", scadCode: "cube(10);" } },
    messages: [],
    modelCache: mockModelCache,
    modelFetch: mockModelFetch,
    ...mockCallbacks,
    ...overrides,
  });

  it("syncs editor code when a conversation with a shape is loaded", () => {
    const props = createProps();

    renderHook(() => useActiveConversationSync(props));

    // Verify editor hydration
    expect(mockEditorStore.setOriginalCode).toHaveBeenCalledWith("cube(10);");
    expect(mockEditorStore.setCode).toHaveBeenCalledWith("cube(10);");
  });

  it("does NOT sync editor code if the compiler is active (Guard Check)", () => {
    // Enable the guard
    mockEditorStore.isCompiling = true;
    
    const props = createProps();
    renderHook(() => useActiveConversationSync(props));

    // Should NOT touch the editor code
    expect(mockEditorStore.setCode).not.toHaveBeenCalled();
    expect(mockEditorStore.setOriginalCode).not.toHaveBeenCalled();
  });

  it("loads model from cache if available", async () => {
    const cachedModel = new THREE.Group();
    mockModelCache.hasInCache.mockReturnValue(true);
    mockModelCache.getFromCache.mockReturnValue(cachedModel);

    const props = createProps();
    renderHook(() => useActiveConversationSync(props));

    // Wait for the async loadModel effect
    await new Promise(process.nextTick);

    expect(mockCallbacks.setLoadedModel).toHaveBeenCalledWith(cachedModel);
    // Should call onShapeLoaded with the shape including code
    expect(mockCallbacks.onShapeLoaded).toHaveBeenCalledWith(
      expect.objectContaining({ id: "shape-1", scadCode: "cube(10);" })
    );
  });

  it("attempts to recover model if jobId exists but no URL (legacy/processing state)", async () => {
    mockModelCache.hasInCache.mockReturnValue(false);
    
    const props = createProps({
      activeConv: { 
        generatedShape: { 
          id: "shape-pending", 
          scadCode: "sphere(5);", 
          jobId: "job-123" // Missing sdfUrl implies pending/failed
        } 
      }
    });

    renderHook(() => useActiveConversationSync(props));

    await new Promise(process.nextTick);

    expect(mockModelFetch.recoverModel).toHaveBeenCalledWith(
      "job-123",
      expect.objectContaining({ id: "shape-pending" })
    );
  });

  it("derives shape from messages if activeConv.generatedShape is missing", () => {
    const props = createProps({
      activeConv: {}, // No direct shape
      messages: [
        { role: "user", content: "Hi" },
        { 
          role: "assistant", 
          generatedShape: { id: "msg-shape", scadCode: "cylinder(10);" } 
        }
      ]
    });

    renderHook(() => useActiveConversationSync(props));

    expect(mockEditorStore.setCode).toHaveBeenCalledWith("cylinder(10);");
  });

  it("extracts code from metadata_json if scadCode is missing", () => {
    const props = createProps({
      activeConv: {
        generatedShape: {
          id: "meta-shape",
          metadata_json: JSON.stringify({ scadCode: "metadata_cube();" })
        }
      }
    });

    renderHook(() => useActiveConversationSync(props));

    expect(mockEditorStore.setCode).toHaveBeenCalledWith("metadata_cube();");
  });

  it("prevents infinite loops by checking lastSyncedId and lastSyncedCode", () => {
    const props = createProps();
    const { rerender } = renderHook(() => useActiveConversationSync(props));

    // First render triggers sync
    expect(mockEditorStore.setCode).toHaveBeenCalledTimes(1);

    // Rerender with same props
    rerender();

    // Should NOT trigger sync again
    expect(mockEditorStore.setCode).toHaveBeenCalledTimes(1);
  });

  it("updates editor when conversation ID changes even if code is the same (context switch)", () => {
    const props = createProps();
    const { rerender } = renderHook((p) => useActiveConversationSync(p), {
      initialProps: props
    });

    expect(mockEditorStore.setCode).toHaveBeenCalledTimes(1);

    // Switch conversation, but same code content
    const newProps = {
      ...props,
      activeConversationId: "conv-2",
      activeConv: { generatedShape: { id: "shape-2", scadCode: "cube(10);" } }
    };

    rerender(newProps);

    // Should trigger again because ID changed
    expect(mockEditorStore.setCode).toHaveBeenCalledTimes(2);
  });

  it("preserves unsaved editor changes if the history shape is empty", () => {
    const props = createProps({
      activeConv: null,
      messages: [] // No shapes anywhere
    });

    renderHook(() => useActiveConversationSync(props));

    // Should NOT clear or set code
    expect(mockEditorStore.setCode).not.toHaveBeenCalled();
    expect(mockEditorStore.clear).not.toHaveBeenCalled();
  });
});