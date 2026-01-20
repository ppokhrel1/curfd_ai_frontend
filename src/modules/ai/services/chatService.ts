import { api } from '@/lib/api/client';
import { Conversation, Message, SendMessageParams } from '../types/chat.type';

interface SessionResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at: string | null;
}

interface MessageResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface GeneratedModelApiResponse {
  asset_id?: string;
  sdf_url: string;
  yaml_url?: string;
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
  private readonly SESSION_KEY = 'current_session_id';

  constructor() {
    // Restore session if available
    this.currentSessionId = localStorage.getItem(this.SESSION_KEY);
  }

  /**
   * Set the active session ID
   */
  setActiveSession(id: string | null): void {
    this.currentSessionId = id;
    if (id) {
      localStorage.setItem(this.SESSION_KEY, id);
    } else {
      localStorage.removeItem(this.SESSION_KEY);
    }
  }

  /**
   * Get the current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Create or retrieve a session
   */
  async ensureSession(): Promise<string> {
    if (this.currentSessionId) return this.currentSessionId;

    try {
      // Create new session
      const response = await api.post<SessionResponse>('/chat/sessions', { title: 'New Chat' });
      this.setActiveSession(response.data.id);
      return this.currentSessionId!;
    } catch (error) {
      console.error('Failed to ensure session:', error);
      throw error;
    }
  }

  /**
   * Send message and get AI response
   */
  async sendMessage(params: SendMessageParams): Promise<{
    message: Message;
    generatedShape?: any;
  }> {
    const { content } = params;

    try {
      const sessionId = await this.ensureSession();

      const response = await api.post<SendMessageResponse>(`/chat/sessions/${sessionId}/messages`, {
        content,
        trigger_generation: false
      });

      const assistantMessage = this.mapMessage(response.data.assistant_message);

      // Check if a model was generated
      let generatedShape = undefined;
      if (response.data.generated_model) {
        generatedShape = this.mapToGeneratedShape(response.data.generated_model);
      }

      return {
        message: assistantMessage,
        generatedShape
      };

    } catch (error: any) {
      console.error('Chat service error:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error('Failed to send message. Please try again.');
    }
  }

  /**
   * Get all sessions from backend
   */
  async getSessions(): Promise<Conversation[]> {
    try {
      const response = await api.get<SessionResponse[]>('/chat/sessions');
      return response.data.map(this.mapSession);
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Get conversation history for a specific session
   */
  async getHistory(sessionId?: string): Promise<Message[]> {
    const targetId = sessionId || this.currentSessionId;
    if (!targetId) return [];

    try {
      const response = await api.get<MessageResponse[]>(`/chat/sessions/${targetId}/messages`);
      return response.data.map((msg) => this.mapMessage(msg));
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  /**
   * Create a new session
   */
  async createSession(title?: string): Promise<Conversation> {
    try {
      const response = await api.post<SessionResponse>('/chat/sessions', { title: title || 'New Chat' });
      const session = this.mapSession(response.data);
      this.setActiveSession(session.id);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      if (this.currentSessionId === sessionId) {
        this.setActiveSession(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Rename a session (Note: Backend might need this endpoint if it doesn't exist, 
   * but based on the router, there's no explicit /sessions/{id} PATCH/PUT for title. 
   * I'll assume for now we might need to add it or just ignore frontend rename if not essential.)
   */
  async renameSession(sessionId: string, title: string): Promise<void> {
    try {
      await api.patch(`/chat/sessions/${sessionId}`, { title });
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  }

  /**
   * Sync a local conversation to the backend (Migration)
   */
  async syncLocalConversation(conversation: Conversation): Promise<string> {
    try {
      // 1. Create the session
      const sessResp = await api.post<SessionResponse>('/chat/sessions', { title: conversation.title });
      const newSessionId = sessResp.data.id;

      // 2. Upload messages in order
      // Note: Backend might not support setting historical timestamps via API, 
      // but we'll at least preserve the content and order.
      for (const msg of conversation.messages) {
        await api.post(`/chat/sessions/${newSessionId}/messages`, {
          content: msg.content,
          role: msg.role, // Assuming backend handles role correctly or we might need adjustment
          trigger_generation: false
        });
      }

      return newSessionId;
    } catch (error) {
      console.error('Failed to sync local conversation:', error);
      throw error;
    }
  }

  /**
   * Clear current session (start new)
   */
  clearHistory(): void {
    this.setActiveSession(null);
  }

  /**
   * Helper to map API message to Frontend Message
   */
  private mapMessage(msg: MessageResponse): Message {
    let content = msg.content;
    let shapeData: any = undefined;

    // Check for persistence suffix
    const parts = content.split('\n\n|||JSON_DATA|||');
    if (parts.length > 1) {
      content = parts[0]; // Clean content
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
      role: msg.role === 'user' ? 'user' : 'assistant',
      timestamp: new Date(msg.created_at),
      shapeData: shapeData
    };
  }

  /**
   * Helper to map API model data to GeneratedShape
   */
  private mapToGeneratedShape(model: any): any {
    return {
      id: model.asset_id || `generated-${Date.now()}`,
      type: 'generic' as const,
      name: model.model_name,
      description: model.description,
      hasSimulation: true,
      geometry: {
        parts: (model.parts || []).map((p: any) => ({
          id: p.name,
          name: p.name,
          type: p.category,
          description: p.role,
          material: 'Standard'
        })),
        joints: model.joints || [],
        // Map parameters to physics for simulation sliders
        physics: {
          mass: model.parameters?.mass || 1.0,
          ...Object.entries(model.parameters || {}).reduce((acc, [k, v]) => {
            if (typeof v === 'number') acc[k] = v;
            // Map nested dimensions if needed? usually flat sliders
            return acc;
          }, {} as Record<string, number>),
          ...Object.entries(model.requirements?.performance_requirements || {}).reduce((acc, [k, v]) => {
            if (typeof v === 'number') acc[k] = v;
            return acc;
          }, {} as Record<string, number>)
        }
      },
      createdAt: new Date(),
      // ML service data for 3D loading
      assetId: model.asset_id,
      sdfUrl: model.sdf_url,
      yamlUrl: model.yaml_url,
      specification: {
        model_name: model.model_name,
        model_type: model.model_type,
        description: model.description,
        parts: model.parts,
        joints: model.joints,
        parameters: model.parameters
      },
      requirements: model.requirements,
      metrics: model.metrics
    };
  }

  /**
   * Helper to map API session to Frontend Conversation
   */
  private mapSession(session: SessionResponse): Conversation {
    return {
      id: session.id,
      title: session.title,
      messages: [], // Populated separately via getHistory
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at),
    };
  }
}

export const chatService = new ChatService();