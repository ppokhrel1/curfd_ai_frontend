import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useModelImport } from "@/pages/HomePage/hooks/useModelImport"; // Adjust path
import { useChatStore } from "@/modules/ai/stores/chatStore";
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import { chatService } from "@/modules/ai/services/chatService";
import { jobService } from "@/modules/ai/services/jobService";
import { assetService } from "@/modules/viewer/services/assetService";
import { ModelImporter } from "@/modules/viewer/services/ModelImporter";
import toast from "react-hot-toast";
import * as THREE from "three";

// --- Mocks ---

// 1. External Utils
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn() },
}));

// 2. Stores
vi.mock("@/modules/ai/stores/chatStore", () => ({
  useChatStore: vi.fn(),
}));

vi.mock("@/modules/editor/stores/editorStore", () => ({
  useEditorStore: vi.fn(),
}));

// 3. Services
vi.mock("@/modules/ai/services/chatService", () => ({
  chatService: { getCurrentSessionId: vi.fn() },
}));

vi.mock("@/modules/ai/services/jobService", () => ({
  jobService: { createJob: vi.fn() },
}));

vi.mock("@/modules/viewer/services/assetService", () => ({
  assetService: {
    createAsset: vi.fn(),
    createAssetMeta: vi.fn(),
  },
}));

// 4. ModelImporter
vi.mock("@/modules/viewer/services/ModelImporter", () => {
  return {
    ModelImporter: class {
      importZip(file: File) {
        return Promise.resolve({
          name: "MockModel",
          group: new THREE.Group(),
          scad: "",
          assets: [],
        });
      }
    },
  };
});

// 5. Global Mocks (FileReader, URL)
const mockReadAsDataURL = vi.fn();
class MockFileReader {
  readAsDataURL = mockReadAsDataURL;
  onload: any = null;
  result = "data:application/zip;base64,mockbase64content";
}
vi.stubGlobal("FileReader", MockFileReader);
vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test-url") });

describe("useModelImport", () => {
  // Store Mock Functions
  const mockAddJobToHistory = vi.fn();
  const mockSetOriginalCode = vi.fn();
  const mockOnImportComplete = vi.fn();
  
  // Importer Mock Function (Spy)
  const mockImportZip = vi.fn();

  // Mock Data
  const activeConversationId = "conv-123";
  const mockJobHistory: any[] = [];

  // Helper to create a dummy THREE structure
  const createMockThreeGroup = () => {
    const group = new THREE.Group();
    // Add a mesh to traverse
    // 9 floats = 3 vertices (x,y,z * 3)
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    mesh.name = "TestMesh";
    group.add(mesh);
    return group;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Store Returns
    (useChatStore as any).mockReturnValue({
      jobHistory: { [activeConversationId]: mockJobHistory },
      addJobToHistory: mockAddJobToHistory,
    });
    (useEditorStore as any).mockReturnValue({
      setOriginalCode: mockSetOriginalCode,
    });

    // Connect the spy to the class prototype method
    vi.spyOn(ModelImporter.prototype, "importZip").mockImplementation(mockImportZip);

    // Default successful import response
    mockImportZip.mockResolvedValue({
      name: "TestModel",
      group: createMockThreeGroup(),
      scad: "cube(10);",
      assets: [],
    });

    // Default service responses
    (chatService.getCurrentSessionId as any).mockReturnValue("session-1");
    (jobService.createJob as any).mockResolvedValue({ id: "job-new-1" });
    (assetService.createAsset as any).mockResolvedValue({ id: "asset-1" });
    
    // Simulate FileReader success immediately when called
    mockReadAsDataURL.mockImplementation(function (this: MockFileReader) {
      if (this.onload) this.onload({ target: { result: this.result } } as any);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() =>
      useModelImport({ activeConversationId, onImportComplete: mockOnImportComplete })
    );

    expect(result.current.isImporting).toBe(false);
    expect(result.current.importStage).toBe("idle");
    expect(result.current.importFileName).toBe("");
  });

  it("triggering handleImportModel clicks the referenced input", () => {
    const { result } = renderHook(() =>
      useModelImport({ activeConversationId, onImportComplete: mockOnImportComplete })
    );

    const clickSpy = vi.fn();
    // Manually assign current to simulate ref attachment
    (result.current.fileInputRef as any).current = { click: clickSpy };

    act(() => {
      result.current.handleImportModel();
    });

    expect(clickSpy).toHaveBeenCalled();
  });

  it("validates file extension and errors on non-zip files", async () => {
    const { result } = renderHook(() =>
      useModelImport({ activeConversationId, onImportComplete: mockOnImportComplete })
    );

    const file = new File(["content"], "model.obj", { type: "text/plain" });
    const event = { target: { files: [file] } } as any;

    await act(async () => {
      await result.current.handleFileImport(event);
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(".zip folder"));
    expect(mockImportZip).not.toHaveBeenCalled();
    expect(result.current.isImporting).toBe(false);
  });

  it("handles a successful new import flow", async () => {
    const { result } = renderHook(() =>
      useModelImport({ activeConversationId, onImportComplete: mockOnImportComplete })
    );

    const file = new File(["zipcontent"], "model.zip", { type: "application/zip" });
    const event = { target: { files: [file] } } as any;

    await act(async () => {
      await result.current.handleFileImport(event);
    });

    // 1. Job Creation
    expect(jobService.createJob).toHaveBeenCalledWith(expect.objectContaining({
      prompt: "Imported Model: model.zip",
      status: "succeeded"
    }));
    expect(mockAddJobToHistory).toHaveBeenCalled();

    // 2. Import Logic
    expect(mockImportZip).toHaveBeenCalledWith(file);
    expect(mockSetOriginalCode).toHaveBeenCalledWith("cube(10);");

    // 3. Asset Upload (New Mission Logic)
    expect(assetService.createAsset).toHaveBeenCalledWith(expect.objectContaining({
      job_id: "job-new-1",
      storage_provider: "base64",
      metadata_json: expect.objectContaining({
        originalName: "model.zip",
      })
    }));

    // 4. Completion
    expect(mockOnImportComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "asset-1",
        name: "TestModel",
        scadCode: "cube(10);",
        jobId: "job-new-1",
        // Check computed stats from geometry metadata
        // 9 floats in buffer / 3 floats per vertex = 3 vertices
        geometry: expect.objectContaining({
          metadata: expect.objectContaining({ totalVertices: 3 })
        })
      }),
      expect.any(THREE.Group)
    );
    
    expect(result.current.importStage).toBe("complete");
  });

  it("deduplicates jobs if model was already imported in this session", async () => {
    const existingJobId = "job-existing-123";
    
    // Setup history to contain this file
    (useChatStore as any).mockReturnValue({
      jobHistory: {
        [activeConversationId]: [
          { id: existingJobId, prompt: "Imported Model: model.zip" }
        ]
      },
      addJobToHistory: mockAddJobToHistory,
    });

    const { result } = renderHook(() =>
      useModelImport({ activeConversationId, onImportComplete: mockOnImportComplete })
    );

    const file = new File(["zipcontent"], "model.zip", { type: "application/zip" });
    const event = { target: { files: [file] } } as any;

    await act(async () => {
      await result.current.handleFileImport(event);
    });

    // Should NOT create a new job
    expect(jobService.createJob).not.toHaveBeenCalled();
    
    // Should NOT upload new assets (deduplication logic)
    expect(assetService.createAsset).not.toHaveBeenCalled();

    // Should still complete the local import
    expect(mockImportZip).toHaveBeenCalled();
    expect(mockOnImportComplete).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: existingJobId }),
      expect.any(THREE.Group)
    );
  });

  it("handles import errors gracefully", async () => {
    mockImportZip.mockRejectedValue(new Error("Corrupt Zip"));

    const { result } = renderHook(() =>
      useModelImport({ activeConversationId, onImportComplete: mockOnImportComplete })
    );

    const file = new File(["bad"], "bad.zip", { type: "application/zip" });
    const event = { target: { files: [file] } } as any;

    await act(async () => {
      await result.current.handleFileImport(event);
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Corrupt Zip"));
    expect(result.current.isImporting).toBe(false);
    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });
});