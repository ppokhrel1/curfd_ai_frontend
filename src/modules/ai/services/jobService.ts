import { encryptedApi as api } from "@/lib/api/encryptedClient";

export interface Job {
    id: string;
    session_id: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    prompt?: string;
    input_image_uri?: string;
    spec_json?: Record<string, any>;
    output_format?: string;
    started_at?: string;
    finished_at?: string;
    error?: string;
    created_at: string;
    updated_at: string;
}

export interface JobCreate {
    session_id: string;
    prompt?: string;
    input_image_uri?: string;
    spec_json?: Record<string, any>;
    output_format?: string;
    status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
}

class JobService {
    async createJob(payload: JobCreate): Promise<Job> {
        const response = await api.post<Job>('/jobs', payload);
        return response.data;
    }

    async getJobs(sessionId?: string): Promise<Job[]> {
        const response = await api.get<Job[]>('/jobs', {
            params: { session_id: sessionId }
        });
        return response.data;
    }

    async getJob(jobId: string): Promise<Job> {
        const response = await api.get<Job>(`/jobs/${jobId}`);
        return response.data;
    }

    async updateJob(jobId: string, updates: Partial<Job>): Promise<Job> {
        const response = await api.patch<Job>(`/jobs/${jobId}`, updates);
        return response.data;
    }

    async startJob(jobId: string): Promise<Job> {
        const response = await api.post<Job>(`/jobs/${jobId}/start`);
        return response.data;
    }

    async completeJob(jobId: string, success: boolean = true): Promise<Job> {
        const response = await api.post<Job>(`/jobs/${jobId}/complete`, null, {
            params: { success }
        });
        return response.data;
    }
}

export const jobService = new JobService();
