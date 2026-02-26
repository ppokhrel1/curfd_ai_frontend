import { useCallback, useEffect, useRef } from 'react';
import { encryptedApi as api } from "@/lib/api/encryptedClient";
import { useEditorStore, type OptimizationJob } from '@/modules/editor/stores/editorStore';

export type { OptimizationJob };

export const useOptimization = (chatId: string, token: string) => {
  const { optimizationJobs: jobs, addOptimizationJob, updateOptimizationJob } = useEditorStore();
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
  const loadedChatIdRef = useRef<string | null>(null);

  // Load persisted jobs from the backend when the chat changes
  useEffect(() => {
    if (!chatId || !token || loadedChatIdRef.current === chatId) return;
    loadedChatIdRef.current = chatId;

    const fetchJobs = async () => {
      try {
        const res = await api.get<OptimizationJob[]>(
          `/scad-genetic-algo/optimization/list/${chatId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const serverJobs: OptimizationJob[] = (res as any).data ?? (res as any) ?? [];
        // Add jobs that are not already in the store (keyed by id)
        const currentIds = new Set(useEditorStore.getState().optimizationJobs.map(j => j.id));
        for (const job of serverJobs) {
          if (!currentIds.has(job.id)) {
            addOptimizationJob(job);
          }
        }
      } catch (e) {
        console.warn('[useOptimization] Failed to load persisted jobs:', e);
      }
    };

    fetchJobs();
  }, [chatId, token, addOptimizationJob]);

  const startOptimization = useCallback(async (openscadCode: string, parameters: any[]) => {
    if (!chatId) {
      console.error("Cannot start optimization: chatId is missing or undefined.");
      return;
    }

    try {
      const payload = {
        chat_id: chatId,
        openscad_code: openscadCode,
        parameters: parameters,
        generations: 5,
        population_size: 5
      };

      const res = await api.post<OptimizationJob>(
        `/scad-genetic-algo/optimization/start`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const newJob: OptimizationJob = (res as any).data || res;
      addOptimizationJob(newJob);

      const eventSource = new EventSource(`${baseUrl}/scad-genetic-algo/optimization/stream/${newJob.id}?token=${token}`);

      eventSource.onmessage = (event) => {
        const updatedJob: OptimizationJob = JSON.parse(event.data);

        if (updatedJob.error && !updatedJob.id) {
          console.error(updatedJob.error);
          eventSource.close();
          return;
        }

        updateOptimizationJob(updatedJob.id, updatedJob);

        if (updatedJob.status.startsWith('Completed') || updatedJob.status === 'Failed') {
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
         console.error("SSE connection lost or failed to connect.");
         eventSource.close();
      };

    } catch (error) {
      console.error("Start optimization error:", error);
    }
  }, [chatId, token, addOptimizationJob, updateOptimizationJob, baseUrl]);

  return { jobs, startOptimization };
};
