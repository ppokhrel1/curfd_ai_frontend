import { api } from "@/lib/api/client";

export interface GenerationJobResponse {
    job_id: string;
    status: string;
    created_at: string;
    message?: string;
}

export interface ModelStatusResponse {
    job_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress?: number;
    error?: string;
    created_at: string;
    completed_at?: string;
}

export interface ModelFilesResponse {
    sdf_url?: string;
    urdf_url?: string;
    config_url?: string;
    meshes: Array<{
        filename: string;
        url: string;
        format: string;
    }>;
    assets?: Array<{
        filename: string;
        url: string;
    }>;
}

export interface ModelResponse {
    id: string;
    name: string;
    status: string;
    files: ModelFilesResponse;
    created_at: string;
    generation_time?: number;
}

class ModelService {
    /**
     * Trigger model generation
     */
    async generateModel(sessionId: string, prompt?: string): Promise<GenerationJobResponse> {
        const response = await api.post<GenerationJobResponse>('/models/generate', {
            session_id: sessionId,
            prompt
        });
        return response.data;
    }

    /**
     * Check generation status
     */
    async getStatus(jobId: string): Promise<ModelStatusResponse> {
        const response = await api.get<ModelStatusResponse>(`/models/${jobId}/status`);
        return response.data;
    }

    /**
     * Get user models
     */
    async getModels(): Promise<ModelResponse[]> {
        const response = await api.get<ModelResponse[]>('/models');
        return response.data;
    }

    /**
     * Get specific model
     */
    async getModel(modelId: string): Promise<ModelResponse> {
        const response = await api.get<ModelResponse>(`/models/${modelId}`);
        return response.data;
    }

    /**
     * Get model files for viewer
     */
    async getModelFiles(modelId: string): Promise<ModelFilesResponse> {
        const response = await api.get<ModelFilesResponse>(`/models/${modelId}/files`);
        return response.data;
    }
}

export const modelService = new ModelService();
