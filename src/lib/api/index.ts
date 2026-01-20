
export const API_CONFIG = {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    timeout: 30000,
    retries: 3,
};

/**
 * HTTP Client with common configuration
 */
class ApiClient {
    private baseUrl: string;
    private timeout: number;

    constructor(config: typeof API_CONFIG) {
        this.baseUrl = config.baseUrl;
        this.timeout = config.timeout;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, data: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T>(endpoint: string, data: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const apiClient = new ApiClient(API_CONFIG);

/**
 * Chat API Interface
 * Implement these endpoints on your backend
 * 
 * POST /api/chat/message
 * GET  /api/chat/conversations
 * GET  /api/chat/conversations/:id
 * DELETE /api/chat/conversations/:id
 */
export interface ChatApiRequest {
    message: string;
    conversationId?: string;
    context?: {
        currentShapeId?: string;
        simulationParams?: Record<string, unknown>;
    };
}

export interface ChatApiResponse {
    message: string;
    conversationId: string;
    generatedShape?: {
        id: string;
        type: string;
        name: string;
        description: string;
        hasSimulation: boolean;
        geometryUrl?: string; // URL to fetch 3D geometry data
    };
    suggestions?: string[];
}

/**
 * Shape API Interface
 * 
 * POST /api/shapes/generate
 * GET  /api/shapes/:id
 * GET  /api/shapes/:id/geometry
 * PUT  /api/shapes/:id/modify
 */
export interface ShapeGenerationRequest {
    prompt: string;
    baseShapeId?: string;
    modifications?: ShapeModification[];
}

export interface ShapeModification {
    type: 'add' | 'remove' | 'modify';
    component: string;
    params?: Record<string, unknown>;
}

export interface ShapeGeometryResponse {
    id: string;
    format: 'gltf' | 'glb' | 'obj' | 'json';
    data: unknown; // Geometry data or URL
    metadata: {
        vertices: number;
        faces: number;
        materials: number;
    };
}

/**
 * Simulation API Interface
 * 
 * POST /api/simulations/start
 * GET  /api/simulations/:id/status
 * GET  /api/simulations/:id/results
 * DELETE /api/simulations/:id (cancel)
 * WS   /api/simulations/:id/stream (real-time updates)
 */
export interface SimulationStartRequest {
    shapeId: string;
    parameters: {
        timeStep: number;
        maxIterations: number;
        convergenceCriteria: number;
        turbulenceModel: string;
        meshQuality: 'coarse' | 'medium' | 'fine';
        solverType: 'steady' | 'transient';
    };
}

export interface SimulationStatusResponse {
    id: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    currentIteration: number;
    estimatedTimeRemaining: number;
    metrics?: {
        residuals: number;
        courantNumber: number;
        convergence: number;
    };
}

export interface SimulationResultsResponse {
    id: string;
    metrics: {
        maxVelocity: number;
        pressureDrop: number;
        massFlowRate: number;
        convergence: number;
    };
    visualizations?: {
        type: 'contour' | 'vector' | 'streamline';
        dataUrl: string;
    }[];
    exportOptions?: {
        csv: string;
        vtk: string;
    };
}


/**
 *  Connect Chat to Backend
 * Replace  implementation in chatService.ts with this:
 * 
 * ```typescript
 * import { apiClient, ChatApiRequest, ChatApiResponse } from '@/lib/api';
 * 
 * async sendMessage(params: SendMessageParams): Promise<ChatResponse> {
 *   const request: ChatApiRequest = {
 *     message: params.content,
 *     conversationId: params.conversationId,
 *   };
 *   
 *   const response = await apiClient.post<ChatApiResponse>('/chat/message', request);
 *   
 *   return {
 *     message: {
 *       id: generateId(),
 *       content: response.message,
 *       role: 'assistant',
 *       timestamp: new Date(),
 *     },
 *     conversationId: response.conversationId,
 *     generatedShape: response.generatedShape ? {
 *       ...response.generatedShape,
 *       createdAt: new Date(),
 *       geometry: null, // Fetch separately
 *     } : undefined,
 *   };
 * }
 * ```
 */

/**
 *  Load 3D Model from Backend
 * In your ShapeRenderer, you can load geometry from the API:
 * 
 * ```typescript
 * import { useGLTF } from '@react-three/drei';
 * import { apiClient } from '@/lib/api';
 * 
 * // If backend provides GLTF/GLB URLs:
 * const { scene } = useGLTF(shape.geometryUrl);
 * 
 * // Or if backend provides raw geometry data:
 * const geometry = await apiClient.get(`/shapes/${shape.id}/geometry`);
 * ```
 */

/**
 *  Real-time Simulation Updates
 * Use WebSocket for live simulation progress:
 * 
 * ```typescript
 * const ws = new WebSocket(`ws://localhost:8000/api/simulations/${jobId}/stream`);
 * 
 * ws.onmessage = (event) => {
 *   const update = JSON.parse(event.data);
 *   setSimulationState(update);
 * };
 * ```
 */

export default apiClient;
