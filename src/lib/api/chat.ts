import { apiClient } from './client';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
        modelGenerated?: boolean;
        modelId?: string;
        simulationId?: string;
    };
}

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

export interface SendMessageRequest {
    message: string;
    conversationId?: string;
    context?: {
        currentModelId?: string;
        simulationParams?: Record<string, unknown>;
    };
}

export interface SendMessageResponse {
    message: ChatMessage;
    conversationId: string;
    generatedModel?: {
        id: string;
        type: string;
        name: string;
        description: string;
        modelUrl: string;
        thumbnailUrl?: string;
    };
    suggestions?: string[];
}

export interface StreamChunk {
    type: 'text' | 'model' | 'suggestion' | 'complete';
    content: string;
    metadata?: Record<string, unknown>;
}

export const chatApi = {
    /**
     * Send a message and get AI response
     */
    sendMessage: async (request: SendMessageRequest): Promise<SendMessageResponse> => {
        return apiClient.post('/chat/message', request);
    },

    /**
     * Send message with streaming response
     */
    sendMessageStream: async (
        request: SendMessageRequest,
        onChunk: (chunk: StreamChunk) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        const token = localStorage.getItem('auth_token');

        try {
            const response = await fetch(`${baseUrl}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Response body is not readable');
            }

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    onComplete();
                    break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter((line) => line.trim());

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            onComplete();
                            return;
                        }

                        try {
                            const parsed: StreamChunk = JSON.parse(data);
                            onChunk(parsed);
                        } catch (e) {
                            console.error('Failed to parse chunk:', e);
                        }
                    }
                }
            }
        } catch (error) {
            onError(error instanceof Error ? error : new Error('Stream failed'));
        }
    },

    /**
     * Get conversation history
     */
    getConversations: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<{ conversations: Conversation[]; total: number }> => {
        return apiClient.get('/chat/conversations', { params });
    },

    /**
     * Get specific conversation by ID
     */
    getConversation: async (conversationId: string): Promise<Conversation> => {
        return apiClient.get(`/chat/conversations/${conversationId}`);
    },

    /**
     * Delete a conversation
     */
    deleteConversation: async (conversationId: string): Promise<{ success: boolean }> => {
        return apiClient.delete(`/chat/conversations/${conversationId}`);
    },

    /**
     * Update conversation title
     */
    updateConversation: async (
        conversationId: string,
        data: { title: string }
    ): Promise<Conversation> => {
        return apiClient.patch(`/chat/conversations/${conversationId}`, data);
    },

    /**
     * Get AI suggestions based on context
     */
    getSuggestions: async (context?: {
        currentModelId?: string;
        conversationId?: string;
    }): Promise<{ suggestions: string[] }> => {
        return apiClient.post('/chat/suggestions', context);
    },
};

export default chatApi;
