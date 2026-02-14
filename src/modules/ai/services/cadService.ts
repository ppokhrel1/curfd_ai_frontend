import api from '@/lib/api/client';

interface GenerateResponse {
  task_id: string;
  status: string;
}

export const cadService = {
  /**
   * Matches @router.post("/generate")
   * Expected payload: { script: string, format: "STL" | "GLTF" | ... }
   */
  async generate(script: string, format: string = 'GLTF'): Promise<string> {
    const response = await api.post<GenerateResponse>('/cadquery/generate', { 
      script: script,
      format: format.toUpperCase() // Must be uppercase to pass Literal check
    });
    return response.data.task_id;
  },

  /**
   * Matches @router.post("/upload")
   * Expected payload: FormData with 'file' and 'output_format'
   */
  async upload(file: File, format: string = 'GLTF'): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('output_format', format.toUpperCase());

    const response = await api.post<GenerateResponse>('/cadquery/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.task_id;
  },

  /**
   * Step 2: WebSocket Monitoring
   */
  connectToTask(
    taskId: string, 
    onComplete: (filename: string) => void, 
    onError: (err: string | any) => void,
    retryCount = 0
  ) {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://clownfish-app-ipxaa.ondigitalocean.app/api/v1';
    const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl.replace(/\/$/, '')}/cadquery/ws/${taskId}`;

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle "Task not found" (Wait for manager to register task)
        if (data.error === "Task not found" && retryCount < 3) {
          socket.close();
          setTimeout(() => this.connectToTask(taskId, onComplete, onError, retryCount + 1), 1500);
          return;
        }

        if (data.error) {
          socket.close();
          onError(data.error);
          return;
        }

        const status = data.status?.toUpperCase();
        if (status === 'SUCCESS') {
          socket.close();
          onComplete(data.result);
        } else if (status === 'FAILURE') {
          socket.close();
          onError(data.error || "Unknown processing error");
        }
      } catch (e) {
        console.error("[CAD Service] Parse Error", e);
      }
    };

    socket.onerror = () => { if (retryCount >= 3) onError("Connection failed"); };
    return socket;
  },

  async downloadAndCreateBlob(filename: string): Promise<{ url: string; blob: Blob; filename: string }> {
    const response = await api.get(`/cadquery/download/${filename}`, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    return { url: URL.createObjectURL(blob), blob, filename };
  }
};