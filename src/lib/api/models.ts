import { apiClient } from "./client";

export interface ModelUploadResponse {
  id: string;
  filename: string;
  size: number;
  format: string;
  status: "processing" | "ready" | "failed";
  uploadedAt: string;
}

export interface ModelDetails {
  id: string;
  name: string;
  filename: string;
  format: string;
  size: number;
  status: "processing" | "ready" | "failed";
  metadata: {
    vertices: number;
    faces: number;
    materials: number;
    boundingBox: {
      min: [number, number, number];
      max: [number, number, number];
    };
  };
  thumbnailUrl?: string;
  modelUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnhanceOptions {
  meshQuality: "low" | "medium" | "high" | "ultra";
  optimizeTopology: boolean;
  smoothSurface: boolean;
  fixNormals: boolean;
  removeInternalGeometry: boolean;
  targetPolyCount?: number;
}

export interface EnhancementJob {
  id: string;
  modelId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  options: EnhanceOptions;
  result?: {
    enhancedModelId: string;
    improvements: {
      verticesReduced: number;
      facesOptimized: number;
      qualityScore: number;
    };
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ModelGenerationRequest {
  prompt: string;
  style?: "realistic" | "stylized" | "technical";
  complexity?: "simple" | "medium" | "complex";
  includeTextures?: boolean;
}

export interface ModelGenerationJob {
  id: string;
  status: "queued" | "generating" | "completed" | "failed";
  progress: number;
  prompt: string;
  result?: {
    modelId: string;
    modelUrl: string;
    thumbnailUrl: string;
  };
  error?: string;
  estimatedTime?: number;
  createdAt: string;
}

export const modelApi = {
  /**
   * Upload a 3D model file
   */
  upload: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ModelUploadResponse> => {
    return apiClient.upload<ModelUploadResponse>(
      "/models/upload",
      file,
      onProgress
    );
  },

  /**
   * Get list of user's models
   */
  list: async (params?: {
    page?: number;
    limit?: number;
    format?: string;
    status?: string;
  }): Promise<{
    models: ModelDetails[];
    total: number;
    page: number;
    limit: number;
  }> => {
    return apiClient.get("/models", { params });
  },

  /**
   * Get model details by ID
   */
  getById: async (modelId: string): Promise<ModelDetails> => {
    return apiClient.get(`/models/${modelId}`);
  },

  /**
   * Delete a model
   */
  delete: async (modelId: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/models/${modelId}`);
  },

  /**
   * Update model metadata
   */
  update: async (
    modelId: string,
    data: { name?: string; description?: string }
  ): Promise<ModelDetails> => {
    return apiClient.patch(`/models/${modelId}`, data);
  },

  /**
   * Download model file
   */
  download: async (modelId: string, filename: string): Promise<void> => {
    return apiClient.download(`/models/${modelId}/download`, filename);
  },

  /**
   * Request AI enhancement for a model
   */
  enhance: async (
    modelId: string,
    options: EnhanceOptions
  ): Promise<EnhancementJob> => {
    return apiClient.post(`/models/${modelId}/enhance`, options);
  },

  /**
   * Get enhancement job status
   */
  getEnhancementStatus: async (jobId: string): Promise<EnhancementJob> => {
    return apiClient.get(`/models/enhancement-jobs/${jobId}`);
  },

  /**
   * Generate 3D model from text prompt using RAG
   */
  generateFromPrompt: async (
    request: ModelGenerationRequest
  ): Promise<ModelGenerationJob> => {
    return apiClient.post("/models/generate", request);
  },

  /**
   * Get model generation job status
   */
  getGenerationStatus: async (jobId: string): Promise<ModelGenerationJob> => {
    return apiClient.get(`/models/generation-jobs/${jobId}`);
  },

  /**
   * Get AI suggestions for model improvement
   */
  getSuggestions: async (
    modelId: string
  ): Promise<{
    suggestions: Array<{
      type: string;
      description: string;
      impact: "low" | "medium" | "high";
      estimatedTime: number;
    }>;
  }> => {
    return apiClient.get(`/models/${modelId}/suggestions`);
  },

  /**
   * Validate model before upload
   */
  validate: (file: File): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const maxSize = 50 * 1024 * 1024; // 50MB
    const supportedFormats = [".gltf", ".glb", ".obj", ".fbx", ".stl"];

    // Check file size
    if (file.size > maxSize) {
      errors.push(
        `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(
          2
        )}MB)`
      );
    }

    // Check file format
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!supportedFormats.includes(extension)) {
      errors.push(
        `Unsupported format: ${extension}. Supported: ${supportedFormats.join(
          ", "
        )}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

export default modelApi;
