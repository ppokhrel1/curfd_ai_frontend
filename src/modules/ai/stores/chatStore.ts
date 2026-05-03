import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chatService } from '../services/chatService';
import type { Conversation, Message } from '../types/chat.type';

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    generatingChatIds: Set<string>;
    generatingChatStatus: Record<string, string>;
    generatingChatActions: Record<string, string>; // chatId -> action
    jobHistory: Record<string, any[]>; // chatId -> Job[]
    currentUserId: string | null; // Track current user for scoped storage

    // Model selection
    selectedProvider: string;
    selectedModel: string;
    selectedThinking: boolean;
    selectedLanguage: "openscad" | "cadquery" | "image_to_3d";

    // Actions
    setConversations: (conversations: Conversation[]) => void;
    setActiveConversationId: (id: string | null) => void;
    addMessage: (chatId: string, message: Message) => void;
    updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
    updateConversation: (id: string, updates: Partial<Conversation>) => void;
    setGenerating: (chatId: string, isGenerating: boolean, status?: string, action?: string) => void;
    addJobToHistory: (chatId: string, job: any) => void;
    updateJobInHistory: (chatId: string, jobId: string, updates: any) => void;
    isGeneratingGlobally: () => boolean;
    clearStore: () => void;
    setCurrentUserId: (userId: string | null) => void;
    setSelectedModel: (provider: string, model: string, thinking: boolean) => void;
    setSelectedLanguage: (language: "openscad" | "cadquery" | "image_to_3d") => void;
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
            selectedProvider: "anthropic",
            selectedModel: "claude-opus-4-6",
            selectedThinking: true,
            selectedLanguage: "openscad",

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

            updateMessage: (chatId, messageId, updates) => set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === chatId
                        ? {
                            ...c,
                            messages: c.messages.map((m) =>
                                m.id === messageId ? { ...m, ...updates } : m
                            ),
                        }
                        : c
                )
            })),

            updateConversation: (id, updates) => set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
                )
            })),

            setGenerating: (chatId: string, isGenerating: boolean, status?: string) =>
                set((state) => {
                // 1. Create a brand new Set based on the old one
                const newGeneratingIds = new Set(state.generatingChatIds);

                // 2. Add or remove the ID
                if (isGenerating) {
                    newGeneratingIds.add(chatId);
                } else {
                    newGeneratingIds.delete(chatId);
                }

                // 3. Return the NEW Set so React knows to re-render the UI
                return { 
                    generatingChatIds: newGeneratingIds,
                    generatingStatus: status || "",
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

            setSelectedModel: (provider, model, thinking) => set({
                selectedProvider: provider,
                selectedModel: model,
                selectedThinking: thinking,
            }),

            setSelectedLanguage: (language) => set({ selectedLanguage: language }),
        }),
        {
            name: getUserStorageKey(),
            // Bumping the version invalidates persisted state on every client.
            // Do this whenever stored conversations may reference assets that
            // no longer exist (e.g. after a server-side wipe or a storage
            // backend migration). On version mismatch Zustand drops the
            // saved state and starts fresh.
            version: 2,
            storage: createJSONStorage(() => localStorage),
            // Handle Set serialization
            partialize: (state) => ({
                conversations: state.conversations,
                activeConversationId: state.activeConversationId,
                generatingChatStatus: state.generatingChatStatus,
                generatingChatActions: state.generatingChatActions,
                jobHistory: state.jobHistory,
                generatingChatIds: Array.from(state.generatingChatIds) as any,
                currentUserId: state.currentUserId,
                selectedProvider: state.selectedProvider,
                selectedModel: state.selectedModel,
                selectedThinking: state.selectedThinking,
                selectedLanguage: state.selectedLanguage,
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

                        // Always start fresh — never restore in-progress generating state
                        rehydratedState.generatingChatIds = new Set();

                        // Sync with service
                        if (rehydratedState.activeConversationId) {
                            chatService.setActiveChat(rehydratedState.activeConversationId);
                        }

                    }
                };
            }
        }
    )
);
