import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chatService } from '../services/chatService';
import { Conversation, Message } from '../types/chat.type';

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    generatingChatIds: Set<string>;
    generatingChatStatus: Record<string, string>;
    generatingChatActions: Record<string, string>; // chatId -> action
    jobHistory: Record<string, any[]>; // chatId -> Job[]
    currentUserId: string | null; // Track current user for scoped storage

    // Actions
    setConversations: (conversations: Conversation[]) => void;
    setActiveConversationId: (id: string | null) => void;
    addMessage: (chatId: string, message: Message) => void;
    updateConversation: (id: string, updates: Partial<Conversation>) => void;
    setGenerating: (chatId: string, isGenerating: boolean, status?: string, action?: string) => void;
    addJobToHistory: (chatId: string, job: any) => void;
    updateJobInHistory: (chatId: string, jobId: string, updates: any) => void;
    isGeneratingGlobally: () => boolean;
    clearStore: () => void;
    setCurrentUserId: (userId: string | null) => void;
}

// Helper to get user-scoped storage key
const getUserStorageKey = () => {
    const userData = localStorage.getItem('curfd_user_data');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const userId = user.id || user.user_id;
            if (userId) {
                return `curfd-chat-storage-${userId}`;
            }
        } catch (e) {
            console.error('[ChatStore] Failed to parse user data:', e);
        }
    }
    return 'curfd-chat-storage'; // Fallback to default
};

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            conversations: [],
            activeConversationId: null,
            generatingChatIds: new Set<string>(),
            generatingChatStatus: {},
            generatingChatActions: {},
            jobHistory: {},
            currentUserId: null,

            setConversations: (newConversations) => set((state) => ({
                conversations: newConversations.map(nc => {
                    const existing = state.conversations.find(ec => ec.id === nc.id);
                    return {
                        ...nc,
                        messages: existing && existing.messages.length > 0 ? existing.messages : nc.messages,
                        generatedShape: existing?.generatedShape || nc.generatedShape
                    };
                })
            })),

            setActiveConversationId: (id) => {
                chatService.setActiveChat(id);
                set({ activeConversationId: id });
            },

            addMessage: (chatId, message) => set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === chatId
                        ? {
                            ...c,
                            messages: c.messages.some(m => m.id === message.id)
                                ? c.messages
                                : [...c.messages, message],
                            updatedAt: new Date()
                        }
                        : c
                )
            })),

            updateConversation: (id, updates) => set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
                )
            })),

            setGenerating: (chatId, isGenerating, status, action) => set((state) => {
                const nextIds = new Set(state.generatingChatIds);
                const nextStatus = { ...state.generatingChatStatus };
                const nextActions = { ...state.generatingChatActions };

                if (isGenerating) {
                    nextIds.add(chatId);
                    if (status) nextStatus[chatId] = status;
                    if (action) nextActions[chatId] = action;
                } else {
                    nextIds.delete(chatId);
                    delete nextStatus[chatId];
                    delete nextActions[chatId];
                }

                return {
                    generatingChatIds: nextIds,
                    generatingChatStatus: nextStatus,
                    generatingChatActions: nextActions
                };
            }),

            addJobToHistory: (chatId, job) => set((state) => ({
                jobHistory: {
                    ...state.jobHistory,
                    [chatId]: [...(state.jobHistory[chatId] || []), job]
                }
            })),

            updateJobInHistory: (chatId, jobId, updates) => set((state) => ({
                jobHistory: {
                    ...state.jobHistory,
                    [chatId]: (state.jobHistory[chatId] || []).map(j =>
                        j.id === jobId ? { ...j, ...updates } : j
                    )
                }
            })),

            isGeneratingGlobally: () => get().generatingChatIds.size > 0,

            clearStore: () => {
                console.log('[ChatStore] Clearing all data');
                set({
                    conversations: [],
                    activeConversationId: null,
                    generatingChatIds: new Set(),
                    generatingChatStatus: {},
                    generatingChatActions: {},
                    jobHistory: {},
                    currentUserId: null
                });
            },

            setCurrentUserId: (userId) => set({ currentUserId: userId }),
        }),
        {
            name: getUserStorageKey(),
            storage: createJSONStorage(() => localStorage),
            // Handle Set serialization
            partialize: (state) => ({
                conversations: state.conversations,
                activeConversationId: state.activeConversationId,
                generatingChatStatus: state.generatingChatStatus,
                generatingChatActions: state.generatingChatActions,
                jobHistory: state.jobHistory,
                generatingChatIds: Array.from(state.generatingChatIds) as any,
                currentUserId: state.currentUserId
            }),
            onRehydrateStorage: (state) => {
                return (rehydratedState) => {
                    if (rehydratedState) {
                        // Security: Validate user match before rehydrating
                        const userData = localStorage.getItem('curfd_user_data');
                        if (userData) {
                            try {
                                const user = JSON.parse(userData);
                                const currentUserId = user.id || user.user_id;

                                // If stored user doesn't match current user, clear the data
                                if (rehydratedState.currentUserId &&
                                    rehydratedState.currentUserId !== currentUserId) {
                                    console.warn('[ChatStore] User mismatch detected, clearing stale data');
                                    rehydratedState.conversations = [];
                                    rehydratedState.activeConversationId = null;
                                    rehydratedState.generatingChatIds = new Set();
                                    rehydratedState.generatingChatStatus = {};
                                    rehydratedState.generatingChatActions = {};
                                    rehydratedState.jobHistory = {};
                                }

                                rehydratedState.currentUserId = String(currentUserId);
                            } catch (e) {
                                console.error('[ChatStore] Failed to validate user:', e);
                            }
                        }

                        // Convert array back to Set
                        rehydratedState.generatingChatIds = new Set(rehydratedState.generatingChatIds as any);

                        // Sync with service
                        if (rehydratedState.activeConversationId) {
                            chatService.setActiveChat(rehydratedState.activeConversationId);
                        }

                        console.log('[ChatStore] Rehydrated state for user:', rehydratedState.currentUserId);
                    }
                };
            }
        }
    )
);
