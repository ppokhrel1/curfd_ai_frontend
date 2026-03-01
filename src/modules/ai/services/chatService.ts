import { api as rawApi } from "@/lib/api/client"; 
import { encryptedApi as api } from "@/lib/api/encryptedClient"; 
import type { Conversation, Message, SendMessageParams } from "../types/chat.type";

export interface SessionResponse {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageResponse {
  id: string;
  role: "user" | "assistant";
  content: string | null; // <-- Now allows null from backend
  created_at: string;
  metadata_json?: any;
}

class ChatService {
  private currentSessionId: string | null = null;
  private currentChatId: string | null = null;
  private currentUserId: string | null = null;
  private readonly SESSION_BASE_KEY = "current_session_id";
  private readonly CHAT_BASE_KEY = "current_chat_id";

  constructor() {}

  setUserId(id: string | null): void {
    this.currentUserId = id;
    if (id) {
      this.currentSessionId = localStorage.getItem(
        this.getScopedKey(this.SESSION_BASE_KEY)
      );
      this.currentChatId = localStorage.getItem(
        this.getScopedKey(this.CHAT_BASE_KEY)
      );
    } else {
      this.currentSessionId = null;
      this.currentChatId = null;
    }
  }

  private getScopedKey(key: string): string {
    return this.currentUserId ? `user_${this.currentUserId}_${key}` : key;
  }

  setActiveSession(id: string | null): void {
    this.currentSessionId = id;
    const key = this.getScopedKey(this.SESSION_BASE_KEY);
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
      this.setActiveChat(null);
    }
  }

  setActiveChat(id: string | null): void {
    this.currentChatId = id;
    const key = this.getScopedKey(this.CHAT_BASE_KEY);
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  getCurrentChatId(): string | null {
    return this.currentChatId;
  }

  async ensureSession(): Promise<string> {
    if (this.currentSessionId) return this.currentSessionId;

    try {
      const response = await api.post<SessionResponse>("/sessions", {
        status: "active",
      });
      this.setActiveSession(response.data.id);
      return this.currentSessionId!;
    } catch (error) {
      console.error("[ChatService] Failed to ensure session:", error);
      throw error;
    }
  }

  async createChat(title: string = "New Chat"): Promise<string> {
    const sessionId = await this.ensureSession();
    try {
      const response = await api.post<ChatResponse>("/chats", {
        session_id: sessionId,
        title: title,
      });
      this.setActiveChat(response.data.id);
      return response.data.id;
    } catch (error) {
      console.error("[ChatService] Failed to create chat:", error);
      throw error;
    }
  }

  async processRequirementsGeminiOpenSCAD(
    chatId: string,
    content: string,
    jobId?: string
  ): Promise<MessageResponse> { 
    try {      
      const response = await rawApi.post<MessageResponse>("/openscad/process_requirements", {
        chat_id: chatId,
        content: content,
        job_id: jobId,
        role: "user"
      });
      
      return response.data; 
    } catch (error) {
      console.error("[ChatService] Failed to request Gemini processing:", error);
      throw error;
    }
  }

  // --- OPTIMIZATION LOOP ---
  async optimizeParameters(
    openscadCode: string,
    parameters: any[],
    populationSize: number = 20, 
    generations: number = 10
  ): Promise<{ optimized_parameters: any, fitness_score: number, result: string }> {
    try {
      const response = await rawApi.post("/optimize/custom", {
        openscad_code: openscadCode,
        parameters: parameters,
        population_size: populationSize,
        generations: generations
      });

      const taskId = response.data.task_id;
      if (!taskId) throw new Error("No task ID returned from optimizer");

      return new Promise((resolve, reject) => {
        const poll = async () => {
          try {
            const statusRes = await rawApi.get(`/optimize/status/${taskId}`);
            const data = statusRes.data;

            if (data.status === "Completed") {
              if (data.result.error) {
                reject(new Error(data.result.error));
              } else {
                resolve(data.result);
              }
            } else if (data.status === "Processing" || data.status === "PENDING") {
              setTimeout(poll, 2000);
            } else {
              reject(new Error(`Unknown status: ${data.status}`));
            }
          } catch (err) {
            reject(err);
          }
        };
        setTimeout(poll, 2000); 
      });
    } catch (error) {
      console.error("[ChatService] Optimization failed:", error);
      throw error;
    }
  }

  async startRunpodRequest(
    chatId: string,
    content: string,
    action: string = "generate_scad",
    requirementsJson?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const payload: any = { action: action };

      if (action === "process_requirements" || !requirementsJson) {
        payload.content = content;
      }

      if (requirementsJson && Object.keys(requirementsJson).length > 0) {
        payload.requirements_json = requirementsJson;
      }

      if (metadata) {
        payload.metadata_json = {
          ...(payload.metadata_json || {}),
          ...metadata,
        };
      }

      await api.post(`/chats/${chatId}/runpod`, payload);
    } catch (error) {
      console.error(`[ChatService] Failed to start Runpod request:`, error);
      throw error;
    }
  }

  async createMessage(
    chatId: string,
    content: string,
    role: "user" | "assistant"
  ): Promise<Message> {
    try {
      const response = await api.post<MessageResponse>("/messages", {
        chat_id: chatId,
        content: content,
        role: role,
      });
      return this.mapMessage(response.data);
    } catch (error) {
      console.error("[ChatService] Failed to create message:", error);
      throw error;
    }
  }

  async getSessions(): Promise<SessionResponse[]> {
    try {
      const response = await api.get<SessionResponse[]>("/sessions");
      return response.data;
    } catch (error) {
      console.error("[ChatService] Failed to get sessions:", error);
      return [];
    }
  }

  async getChats(sessionId: string): Promise<ChatResponse[]> {
    try {
      const response = await api.get<ChatResponse[]>("/chats", {
        params: { session_id: sessionId },
      });
      return response.data;
    } catch (error) {
      console.error("[ChatService] Failed to get chats:", error);
      return [];
    }
  }

  async getHistory(chatId: string): Promise<Message[]> {
    try {
      const response = await api.get<MessageResponse[]>("/messages", {
        params: { chat_id: chatId },
      });
      return response.data.map((msg) => this.mapMessage(msg));
    } catch (error) {
      console.error("[ChatService] Failed to get history:", error);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`/sessions/${sessionId}`);
      if (this.currentSessionId === sessionId) {
        this.setActiveSession(null);
      }
    } catch (error) {
      console.error("[ChatService] Failed to delete session:", error);
      throw error;
    }
  }

  async renameChat(chatId: string, title: string): Promise<void> {
    try {
      await api.patch(`/chats/${chatId}`, { title });
    } catch (error) {
      console.error("[ChatService] Failed to rename chat:", error);
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    try {
      await api.delete(`/chats/${chatId}`);
      if (this.currentChatId === chatId) {
        this.setActiveChat(null);
      }
    } catch (error) {
      console.error("[ChatService] Failed to delete chat:", error);
    }
  }

  async syncLocalConversation(conversation: Conversation): Promise<string> {
    try {
      const sessResp = await api.post<SessionResponse>("/sessions", {
        status: "active",
      });
      const newSessionId = sessResp.data.id;

      const chatResp = await api.post<ChatResponse>("/chats", {
        session_id: newSessionId,
        title: conversation.title || "Migrated Chat",
      });
      const newChatId = chatResp.data.id;

      for (const msg of conversation.messages) {
        await api.post("/messages", {
          chat_id: newChatId,
          content: msg.content,
          role: msg.role,
        });
      }

      return newChatId;
    } catch (error) {
      console.error("[ChatService] Failed to sync local conversation:", error);
      throw error;
    }
  }

  clearHistory(): void {
    this.setActiveSession(null);
  }

  private mapMessage(msg: MessageResponse): Message {
    // 🔥 THE FIX: Guarantee content is ALWAYS a string to prevent `.replace` or `.split` crashes
    let content = msg.content || ""; 
    let shapeData: any = undefined;

    // 1. Legacy Fallback (for old messages)
    const parts = content.split("\n\n|||JSON_DATA|||");
    if (parts.length > 1) {
      content = parts[0];
      try {
        const modelData = JSON.parse(parts[1]);
        shapeData = this.mapToGeneratedShape(modelData);
      } catch (e) {
        console.error("Failed to parse persisted model data", e);
      }
    } 
    // 2. NEW: Parse from Structured metadata_json
    else if (msg.metadata_json) {
      let meta = msg.metadata_json;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch(e) {}
      }
      
      // If we find code in the metadata, build the shapeData object
      if (meta && (meta.openscad_code || meta.scad_code || meta.parameters)) {
        
        // Keep the text extremely short
        // if (!content || content.includes("module ") || content.includes(";") || content.includes("$fn")) {
        //   content = "Model loaded from memory."; 
        // }
        
        shapeData = {
          id: msg.id || `shape-${Date.now()}`,
          type: "generic",
          name: meta.model_type || "OpenSCAD Model",
          description: meta.message || "Generated model",
          scadCode: meta.openscad_code || meta.scad_code,
          parameters: meta.parameters || [],
          hasSimulation: false,
          geometry: { parts: [], metadata: { totalVertices: 0, fileSize: 0 } },
          createdAt: new Date(msg.created_at),
          metadata_json: meta,
        };
      }
    }

    return {
      id: msg.id,
      content: content,
      role: msg.role === "user" ? "user" : "assistant",
      timestamp: new Date(msg.created_at),
      shapeData: shapeData,
    };
  }

  private mapToGeneratedShape(model: any): any {
    return {
      id: model.model_id || model.asset_id || `generated-${Date.now()}`,
      type: "generic" as const,
      name: model.model_name,
      description: model.description,
      hasSimulation: true,
      geometry: {
        parts: (model.parts || []).map((p: any) => ({
          id: p.name,
          name: p.name,
          type: p.category,
          description: p.role,
          material: "Standard",
        })),
        joints: model.joints || [],
        physics: {
          mass: model.parameters?.mass || 1.0,
          ...Object.entries(model.parameters || {}).reduce((acc, [k, v]) => {
            if (typeof v === "number") acc[k] = v;
            return acc;
          }, {} as Record<string, number>),
        },
      },
      createdAt: new Date(),
      assetId: model.asset_id,
      jobId: model.job_id,
      sdfUrl: model.sdf_url,
      yamlUrl: model.yaml_url,
      scadCode: model.scad_code,
      assets: model.assets,
      specification: {
        model_name: model.model_name,
        model_type: model.model_type,
        description: model.description,
        parts: model.parts,
        joints: model.joints,
        parameters: model.parameters,
      },
      requirements: model.requirements,
      metrics: model.metrics,
    };
  }
}

export const chatService = new ChatService();