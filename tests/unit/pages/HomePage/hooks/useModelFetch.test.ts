import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useModelFetch } from "@/pages/HomePage/hooks/useModelFetch"; 
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import { useChatStore } from "@/modules/ai/stores/chatStore";
import { ModelImporter } from "@/modules/viewer/services/ModelImporter";
import { assetService } from "@/modules/viewer/services/assetService";
import toast from "react-hot-toast";
import * as THREE from "three";

// 1. Mock External Dependencies
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn() },
}));

vi.mock("@/lib/apiConfig", () => ({
  proxifyUrl: (url: string) => `proxy/${url}`,
}));

vi.mock("@/modules/editor/stores/editorStore", () => ({
  useEditorStore: vi.fn(),
}));

vi.mock("@/modules/ai/stores/chatStore", () => ({
  useChatStore: vi.fn(),
}));

// 2. Mock ModelImporter Class
// We define methods on the class so they appear on the prototype
vi.mock("@/modules/viewer/services/ModelImporter", () => {
  return {
    ModelImporter: class {
      importFromUrl() { return Promise.resolve({} as any); }
    },
  };
});

// 3. Mock AssetService
vi.mock("@/modules/viewer/services/assetService", () => ({
  assetService: {
    fetchAssets: vi.fn(),
    mapToGeneratedShape: vi.fn(),
  },
}));

describe("useModelFetch", () => {
  const mockAddToCache = vi.fn();
  const mockOnModelLoaded = vi.fn();
  const mockOnShapeUpdated = vi.fn();
  const mockSetOriginalCode = vi.fn();
  const mockUpdateConversation = vi.fn();
  const mockImportFromUrl = vi.fn();

  // Helper to create a dummy THREE.Group
  const createMockGroup = () => {
    const group = new THREE.Group();
    const geom = new THREE.BufferGeometry();
    // 3 vertices = 1 triangle
    geom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
    );
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = "Test Part";
    mesh.userData = { sourceFile: "test.stl" };
    group.add(mesh);
    return group;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Store Mocks
    (useEditorStore as any).mockReturnValue({
      setOriginalCode: mockSetOriginalCode,
    });
    (useChatStore as any).mockReturnValue({
      updateConversation: mockUpdateConversation,
    });

    // Setup Importer Spy
    // Since we mocked ModelImporter as a class with a method, we can spy on the prototype
    mockImportFromUrl.mockReset();
    vi.spyOn(ModelImporter.prototype, 'importFromUrl').mockImplementation(mockImportFromUrl);
  });

  it("returns fetchModelFiles and recoverModel functions", () => {
    const { result } = renderHook(() =>
      useModelFetch({ addToCache: mockAddToCache })
    );

    expect(result.current.fetchModelFiles).toBeInstanceOf(Function);
    expect(result.current.recoverModel).toBeInstanceOf(Function);
  });

  describe("fetchModelFiles", () => {
    it("does nothing if sdfUrl is missing", async () => {
      const { result } = renderHook(() =>
        useModelFetch({ addToCache: mockAddToCache })
      );

      await act(async () => {
        await result.current.fetchModelFiles({} as any);
      });

      expect(mockImportFromUrl).not.toHaveBeenCalled();
    });

    it("imports model, calculates stats, and updates stores on success", async () => {
      const mockGroup = createMockGroup();
      mockImportFromUrl.mockResolvedValue({
        group: mockGroup,
        scad: "cube(10);",
      });

      const { result } = renderHook(() =>
        useModelFetch({
          activeConversationId: "conv-1",
          addToCache: mockAddToCache,
          onModelLoaded: mockOnModelLoaded,
          onShapeUpdated: mockOnShapeUpdated,
        })
      );

      const shape = {
        id: "shape-1",
        sdfUrl: "http://test.com/model.sdf",
        geometry: { metadata: { originalFilename: "test.sdf" } },
      } as any;

      await act(async () => {
        await result.current.fetchModelFiles(shape);
      });

      expect(mockImportFromUrl).toHaveBeenCalledWith(
        "proxy/http://test.com/model.sdf",
        undefined,
        undefined,
        [],
        "test.sdf"
      );

      expect(mockSetOriginalCode).toHaveBeenCalledWith("cube(10);");
      expect(mockUpdateConversation).toHaveBeenCalledWith("conv-1", {
        generatedShape: expect.objectContaining({
          id: "shape-1",
          sdfUrl: "http://test.com/model.sdf",
          scadCode: "cube(10);",
          geometry: expect.objectContaining({
            metadata: { 
              originalFilename: "test.sdf",
              totalVertices: 3 
            },
            parts: expect.arrayContaining([
              expect.objectContaining({ 
                name: "Test Part",
                assetName: "test.stl",
                category: "component",
                group: "Model Components",
                role: "structural"
              }),
            ]),
          }),
        }),
      });

      expect(mockAddToCache).toHaveBeenCalledWith("shape-1", mockGroup);
      expect(mockOnShapeUpdated).toHaveBeenCalled();
      expect(mockOnModelLoaded).toHaveBeenCalledWith(
        mockGroup,
        expect.objectContaining({
          triangles: 1,
          materials: 1,
        }),
        expect.anything()
      );
    });

    it("handles errors gracefully and shows toast", async () => {
      mockImportFromUrl.mockRejectedValue(new Error("Import Failed"));

      const { result } = renderHook(() =>
        useModelFetch({ addToCache: mockAddToCache })
      );

      await act(async () => {
        try {
          await result.current.fetchModelFiles({ sdfUrl: "valid" } as any);
        } catch (e) {
          expect(e).toBeDefined();
        }
      });

      expect(toast.error).toHaveBeenCalledWith("Could not load 3D model assets.");
    });
  });

  describe("recoverModel", () => {
    it("fetches assets and maps to shape if recovery is needed", async () => {
      const { result } = renderHook(() =>
        useModelFetch({ addToCache: mockAddToCache })
      );

      const recoveredShape = { sdfUrl: "recovered.sdf", id: "rec-1" };
      (assetService.fetchAssets as any).mockResolvedValue(["asset1"]);
      (assetService.mapToGeneratedShape as any).mockResolvedValue(recoveredShape);

      mockImportFromUrl.mockResolvedValue({
        group: new THREE.Group(),
        scad: "recovered;",
      });

      await act(async () => {
        await result.current.recoverModel("job-123");
      });

      expect(assetService.fetchAssets).toHaveBeenCalledWith("job-123");
      expect(assetService.mapToGeneratedShape).toHaveBeenCalledWith(
        "job-123",
        ["asset1"]
      );
      
      expect(mockImportFromUrl).toHaveBeenCalledWith(
        "proxy/recovered.sdf",
        undefined,
        undefined,
        expect.anything(),
        undefined
      );
    });

    it("shows toast on recovery failure", async () => {
      (assetService.fetchAssets as any).mockRejectedValue(new Error("Network Error"));

      const { result } = renderHook(() =>
        useModelFetch({ addToCache: mockAddToCache })
      );

      await act(async () => {
        await result.current.recoverModel("job-fail");
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to recover model from backend.");
    });
  });
});