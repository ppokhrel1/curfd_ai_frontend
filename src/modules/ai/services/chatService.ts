import { api } from "@/lib/api/client";
import { Conversation, Message, SendMessageParams } from "../types/chat.type";

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
  content: string;
  created_at: string;
}

interface GeneratedModelApiResponse {
  asset_id?: string;
  sdf_url: string;
  yaml_url?: string;
  assets?: { filename: string; url: string }[];
  model_name: string;
  model_type: string;
  description: string;
  parts: any[];
  joints: any[];
  parameters: Record<string, any>;
  requirements: Record<string, any>;
  metrics: Record<string, any>;
}

interface SendMessageResponse {
  user_message: MessageResponse;
  assistant_message: MessageResponse;
  generated_model?: GeneratedModelApiResponse;
}

class ChatService {
  private currentSessionId: string | null = null;
  private currentChatId: string | null = null;
  private currentUserId: string | null = null;
  private readonly SESSION_BASE_KEY = "current_session_id";
  private readonly CHAT_BASE_KEY = "current_chat_id";

  constructor() {
    // Initial restoration will be handled by setUserId when auth initializes
  }

  /**
   * Set the user ID for scoping local storage
   */
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

  /**
   * Helper to get user-scoped key
   */
  private getScopedKey(key: string): string {
    return this.currentUserId ? `user_${this.currentUserId}_${key}` : key;
  }

  /**
   * Set the active session ID
   */
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

  /**
   * Set the active chat ID
   */
  setActiveChat(id: string | null): void {
    this.currentChatId = id;
    const key = this.getScopedKey(this.CHAT_BASE_KEY);
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
  }

  /**
   * Get the current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get the current chat ID
   */
  getCurrentChatId(): string | null {
    return this.currentChatId;
  }

  /**
   * Create or retrieve a session
   */
  async ensureSession(): Promise<string> {
    if (this.currentSessionId) return this.currentSessionId;

    try {
      // Create new session
      const response = await api.post<SessionResponse>("/sessions", {
        status: "active",
      });
      this.setActiveSession(response.data.id);
      return this.currentSessionId!;
    } catch (error) {
      console.error("Failed to ensure session:", error);
      throw error;
    }
  }

  /**
   * Create a new chat within a session
   */
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
      console.error("Failed to create chat:", error);
      throw error;
    }
  }

  /**
   * Start a Runpod request
   */
  async startRunpodRequest(
    chatId: string,
    content: string,
    action: string = "generate_scad",
    requirementsJson?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Build payload conditionally based on action
      const payload: any = {
        action: action,
      };

      // Handle content: Required for process_requirements, but backend might also take it as fallback
      if (action === "process_requirements" || !requirementsJson) {
        payload.content = content;
      }

      if (requirementsJson && Object.keys(requirementsJson).length > 0) {
        if (
          action === "process_requirements" &&
          requirementsJson.job_id &&
          !metadata
        ) {
          payload.metadata_json = requirementsJson;
        } else {
          payload.requirements_json = requirementsJson;
        }
      }

      // Explicit metadata override
      if (metadata) {
        payload.metadata_json = {
          ...(payload.metadata_json || {}),
          ...metadata,
        };
      }

      console.log(
        `[ChatService] Sending Runpod request to /chats/${chatId}/runpod:`,
        JSON.stringify(payload, null, 2)
      );

      await api.post(`/chats/${chatId}/runpod`, payload);

      console.log(
        `[ChatService] Runpod request sent successfully for action="${action}"`
      );
    } catch (error) {
      console.error(
        `[ChatService] Failed to start Runpod request for action="${action}":`,
        error
      );
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
      console.error("Failed to create message:", error);
      throw error;
    }
  }

  /**
   * Send message (legacy placeholder, now handled via WebSocket flow)
   */
  async sendMessage(params: SendMessageParams): Promise<{
    message: Message;
    generatedShape?: any;
  }> {
    throw new Error(
      "sendMessage is deprecated. Use startRunpodRequest and WebSocket instead."
    );
  }

  /**
   * Get all sessions from backend - FIXED: Return strict type
   */
  async getSessions(): Promise<SessionResponse[]> {
    try {
      const response = await api.get<SessionResponse[]>("/sessions");
      return response.data;
    } catch (error) {
      console.error("Failed to get sessions:", error);
      return [];
    }
  }

  /**
   * Get all chats for a specific session - FIXED: Return strict type
   */
  async getChats(sessionId: string): Promise<ChatResponse[]> {
    try {
      const response = await api.get<ChatResponse[]>("/chats", {
        params: { session_id: sessionId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get chats:", error);
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
      console.error("Failed to get history:", error);
      return [];
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`/sessions/${sessionId}`);
      if (this.currentSessionId === sessionId) {
        this.setActiveSession(null);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      throw error;
    }
  }

  /**
   * Rename a chat
   */
  async renameChat(chatId: string, title: string): Promise<void> {
    try {
      await api.patch(`/chats/${chatId}`, { title });
    } catch (error) {
      console.error("Failed to rename chat:", error);
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<void> {
    try {
      await api.delete(`/chats/${chatId}`);
    } catch (error) {
      console.error("Failed to delete chat:", error);
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
      console.error("Failed to sync local conversation:", error);
      throw error;
    }
  }

  clearHistory(): void {
    this.setActiveSession(null);
  }

  private mapMessage(msg: MessageResponse): Message {
    let content = msg.content;
    let shapeData: any = undefined;

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
          ...Object.entries(
            model.requirements?.performance_requirements || {}
          ).reduce((acc, [k, v]) => {
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

  private mapSession(session: SessionResponse): Conversation {
    return {
      id: session.id,
      title: "Session",
      messages: [],
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at),
    };
  }
}

export const chatService = new ChatService();
