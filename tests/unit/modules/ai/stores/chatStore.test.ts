import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from '../../../../../src/modules/ai/stores/chatStore';

describe('useChatStore', () => {
    beforeEach(() => {
        useChatStore.getState().clearStore();
        localStorage.clear();
    });

    it('should initialize with default state', () => {
        const state = useChatStore.getState();
        expect(state.conversations).toEqual([]);
        expect(state.activeConversationId).toBeNull();
        expect(state.generatingChatIds.size).toBe(0);
    });

    it('should set conversations', () => {
        const conversations: any[] = [{ id: '1', title: 'Test', messages: [], createdAt: new Date(), updatedAt: new Date() }];
        useChatStore.getState().setConversations(conversations);
        expect(useChatStore.getState().conversations).toHaveLength(1);
        expect(useChatStore.getState().conversations[0].id).toBe('1');
    });

    it('should add a message to a conversation', () => {
        const conversation: any = { id: 'c1', title: 'Test', messages: [], createdAt: new Date(), updatedAt: new Date() };
        useChatStore.getState().setConversations([conversation]);

        const message: any = { id: 'm1', content: 'hello', role: 'user', timestamp: new Date() };
        useChatStore.getState().addMessage('c1', message);

        const updated = useChatStore.getState().conversations.find(c => c.id === 'c1');
        expect(updated?.messages).toHaveLength(1);
        expect(updated?.messages[0].content).toBe('hello');
    });

    it('should clear store', () => {
        useChatStore.getState().setConversations([{ id: '1', title: 'Test', messages: [], createdAt: new Date(), updatedAt: new Date() }]);
        useChatStore.getState().clearStore();
        expect(useChatStore.getState().conversations).toEqual([]);
    });
});
