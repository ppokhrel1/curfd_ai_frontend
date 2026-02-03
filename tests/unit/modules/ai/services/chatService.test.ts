import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../../../src/lib/api/client';
import { ChatResponse, chatService, MessageResponse, SessionResponse } from '../../../../../src/modules/ai/services/chatService';

// Mock the API client
vi.mock('../../../../../src/lib/api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
    },
}));

describe('ChatService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Reset private fields if possible or re-instantiate if needed
        // For singleton, we might need to rely on public setters
        chatService.setUserId(null);
    });

    describe('ensureSession', () => {
        it('should return existing session ID if available', async () => {
            chatService.setActiveSession('existing-session');
            const sessionId = await chatService.ensureSession();
            expect(sessionId).toBe('existing-session');
            expect(api.post).not.toHaveBeenCalled();
        });

        it('should create new session if none exists', async () => {
            const mockSession: SessionResponse = {
                id: 'new-session',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            (api.post as any).mockResolvedValueOnce({ data: mockSession });

            const sessionId = await chatService.ensureSession();

            expect(sessionId).toBe('new-session');
            expect(api.post).toHaveBeenCalledWith('/sessions', { status: 'active' });
            expect(chatService.getCurrentSessionId()).toBe('new-session');
        });
    });

    describe('createChat', () => {
        it('should create a chat and set it as active', async () => {
            const mockSession: SessionResponse = {
                id: 'session-123',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const mockChat: ChatResponse = {
                id: 'chat-123',
                session_id: 'session-123',
                title: 'New Chat',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Mock ensureSession implicitly by setting current session or mocking api response for it
            // Since ensureSession calls api.post if no session, let's just set one
            chatService.setActiveSession('session-123');

            (api.post as any).mockResolvedValueOnce({ data: mockChat });

            const chatId = await chatService.createChat('My Chat');

            expect(chatId).toBe('chat-123');
            expect(api.post).toHaveBeenCalledWith('/chats', {
                session_id: 'session-123',
                title: 'My Chat',
            });
            expect(chatService.getCurrentChatId()).toBe('chat-123');
        });
    });

    describe('sendMessage', () => {
        it('should throw error as it is deprecated', async () => {
            await expect(chatService.sendMessage({ content: 'hi', chatId: '1' }))
                .rejects.toThrow("sendMessage is deprecated");
        });
    });

    describe('startRunpodRequest', () => {
        it('should call the correct endpoint', async () => {
            (api.post as any).mockResolvedValueOnce({});

            await chatService.startRunpodRequest('chat-123', 'hello', 'process_requirements', { foo: 'bar' });

            expect(api.post).toHaveBeenCalledWith('/chats/chat-123/runpod', {
                content: 'hello',
                action: 'process_requirements',
                metadata_json: { foo: 'bar' }
            });
        });
    });

    describe('mapMessage', () => {
        // Access private method via casting or testing public wrapper like getHistory
        it('should correctly parse model data from message content', async () => {
            const mockMessage: MessageResponse = {
                id: 'msg-1',
                role: 'assistant',
                content: 'Here is the model:\n\n|||JSON_DATA|||{"model_name":"TestBot"}',
                created_at: new Date().toISOString()
            };

            (api.get as any).mockResolvedValueOnce({ data: [mockMessage] });

            const history = await chatService.getHistory('chat-1');
            expect(history[0].content).toBe('Here is the model:');
            expect(history[0].shapeData).toBeDefined();
            expect(history[0].shapeData.name).toBe('TestBot');
        });
    });
});
