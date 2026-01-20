import { apiClient } from './client';

export interface SimulationParameters {
    timeStep: number;
    maxIterations: number;
    convergenceCriteria: number;
    turbulenceModel: 'k-epsilon' | 'k-omega' | 'k-omega-sst' | 'les' | 'rsm';
    meshQuality: 'coarse' | 'medium' | 'fine' | 'ultra';
    solverType: 'steady' | 'transient';
    boundaryConditions?: {
        inlet?: {
            velocity: number;
            temperature?: number;
        };
        outlet?: {
            pressure: number;
        };
        walls?: {
            type: 'no-slip' | 'slip' | 'moving';
            velocity?: number;
        };
    };
}

export interface SimulationJob {
    id: string;
    modelId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    currentIteration: number;
    parameters: SimulationParameters;
    metrics?: {
        residuals: number;
        courantNumber: number;
        convergence: number;
        maxVelocity?: number;
        pressureDrop?: number;
        massFlowRate?: number;
    };
    estimatedTimeRemaining?: number;
    cpuTime?: number;
    error?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

export interface SimulationResults {
    id: string;
    jobId: string;
    metrics: {
        maxVelocity: number;
        minVelocity: number;
        avgVelocity: number;
        maxPressure: number;
        minPressure: number;
        pressureDrop: number;
        massFlowRate: number;
        convergence: number;
        iterations: number;
        cpuTime: number;
    };
    visualizations: Array<{
        type: 'contour' | 'vector' | 'streamline' | 'isosurface';
        variable: 'velocity' | 'pressure' | 'temperature' | 'turbulence';
        dataUrl: string;
        thumbnailUrl?: string;
    }>;
    exportOptions: {
        csv?: string;
        vtk?: string;
        paraview?: string;
    };
    convergenceHistory: Array<{
        iteration: number;
        residual: number;
        timestamp: string;
    }>;
}

export interface SimulationUpdate {
    jobId: string;
    status: SimulationJob['status'];
    progress: number;
    currentIteration: number;
    metrics?: SimulationJob['metrics'];
    estimatedTimeRemaining?: number;
}

export const simulationApi = {
    /**
     * Start a new simulation
     */
    start: async (modelId: string, parameters: SimulationParameters): Promise<SimulationJob> => {
        return apiClient.post('/simulations/start', {
            modelId,
            parameters,
        });
    },

    /**
     * Get simulation job status
     */
    getStatus: async (jobId: string): Promise<SimulationJob> => {
        return apiClient.get(`/simulations/${jobId}`);
    },

    /**
     * Get simulation results
     */
    getResults: async (jobId: string): Promise<SimulationResults> => {
        return apiClient.get(`/simulations/${jobId}/results`);
    },

    /**
     * Cancel a running simulation
     */
    cancel: async (jobId: string): Promise<{ success: boolean }> => {
        return apiClient.delete(`/simulations/${jobId}`);
    },

    /**
     * Get list of user's simulations
     */
    list: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
        modelId?: string;
    }): Promise<{ simulations: SimulationJob[]; total: number }> => {
        return apiClient.get('/simulations', { params });
    },

    /**
     * Download simulation results
     */
    downloadResults: async (jobId: string, format: 'csv' | 'vtk' | 'paraview'): Promise<void> => {
        return apiClient.download(`/simulations/${jobId}/export/${format}`, `simulation_${jobId}.${format}`);
    },

    /**
     * Get convergence history
     */
    getConvergenceHistory: async (jobId: string): Promise<{
        history: Array<{
            iteration: number;
            residual: number;
            timestamp: string;
        }>;
    }> => {
        return apiClient.get(`/simulations/${jobId}/convergence`);
    },

    /**
     * Validate simulation parameters
     */
    validateParameters: (params: SimulationParameters): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (params.timeStep <= 0) {
            errors.push('Time step must be positive');
        }

        if (params.maxIterations < 1) {
            errors.push('Max iterations must be at least 1');
        }

        if (params.convergenceCriteria <= 0 || params.convergenceCriteria >= 1) {
            errors.push('Convergence criteria must be between 0 and 1');
        }

        if (params.boundaryConditions?.inlet?.velocity && params.boundaryConditions.inlet.velocity < 0) {
            errors.push('Inlet velocity must be non-negative');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    },
};

/**
 * WebSocket client for real-time simulation updates
 */
export class SimulationWebSocket {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    connect(
        jobId: string,
        onUpdate: (update: SimulationUpdate) => void,
        onError?: (error: Error) => void
    ): void {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
        const token = localStorage.getItem('auth_token');

        this.ws = new WebSocket(`${wsUrl}/simulations/${jobId}/stream?token=${token}`);

        this.ws.onopen = () => {
            console.log('Simulation WebSocket connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const update: SimulationUpdate = JSON.parse(event.data);
                onUpdate(update);
            } catch (error) {
                console.error('Failed to parse simulation update:', error);
            }
        };

        this.ws.onerror = (event) => {
            console.error('Simulation WebSocket error:', event);
            onError?.(new Error('WebSocket connection error'));
        };

        this.ws.onclose = () => {
            console.log('Simulation WebSocket closed');
            this.attemptReconnect(jobId, onUpdate, onError);
        };
    }

    private attemptReconnect(
        jobId: string,
        onUpdate: (update: SimulationUpdate) => void,
        onError?: (error: Error) => void
    ): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                this.connect(jobId, onUpdate, onError);
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            onError?.(new Error('Max reconnection attempts reached'));
        }
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

export default simulationApi;
