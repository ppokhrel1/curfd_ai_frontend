import { useAuthStore } from '@/lib/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService } from '../services/chatService';
import { Conversation, GeneratedShape, Message } from '../types/chat.type';

const STORAGE_KEY = 'curfd-conversations';

interface UseConversationsReturn {
    conversations: Conversation[];
    activeConversationId: string | null;
    activeConversation: Conversation | null;
    createConversation: () => Promise<string>;
    setActiveConversation: (id: string) => void;
    deleteConversation: (id: string) => Promise<void>;
    addMessageToConversation: (message: Message) => void;
    setConversationShape: (id: string, shape: GeneratedShape) => void;
    clearActiveConversation: () => void;
    renameConversation: (id: string, title: string) => Promise<void>;
}

export const useConversations = (): UseConversationsReturn => {
    const { isAuthenticated, user } = useAuthStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(chatService.getCurrentSessionId());
    const isMigratingRef = useRef(false);

    // 0. Migration Effect
    useEffect(() => {
        if (!isAuthenticated || !user || isMigratingRef.current) return;

        const migrateLocalStore = async () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;

            try {
                const localConversations: Conversation[] = JSON.parse(saved);
                if (localConversations.length === 0) return;

                isMigratingRef.current = true;
                console.log(`Found ${localConversations.length} local conversations to migrate...`);

                for (const localConv of localConversations) {
                    // Check if already migrated (we can't easily, but we can check if it looks like a local-only one)
                    // If it has messages and the ID doesn't look like a standard UUID or just to be safe:
                    // We'll upload it and then clear the local storage key.
                    try {
                        await chatService.syncLocalConversation(localConv);
                    } catch (e) {
                        console.error('Migration failed for conversation:', localConv.id, e);
                    }
                }

                // Success! Clear the legacy key
                localStorage.removeItem(STORAGE_KEY);

                // Refresh remote sessions
                const remoteSessions = await chatService.getSessions();
                setConversations(remoteSessions);
            } finally {
                isMigratingRef.current = false;
            }
        };

        migrateLocalStore();
    }, [isAuthenticated, user?.id]);

    // 1. Initial Load & Auth Sync
    useEffect(() => {
        const loadConversations = async () => {
            if (isAuthenticated) {
                const remoteSessions = await chatService.getSessions();
                setConversations(remoteSessions);

                // If we have an active session ID from storage, verify it exists in remote
                const currentId = chatService.getCurrentSessionId();
                if (currentId && !remoteSessions.find(s => s.id === currentId)) {
                    if (remoteSessions.length > 0) {
                        chatService.setActiveSession(remoteSessions[0].id);
                        setActiveConversationId(remoteSessions[0].id);
                    } else {
                        chatService.setActiveSession(null);
                        setActiveConversationId(null);
                    }
                }
            } else {
                // Not authenticated - clear or load purely local if needed
                // For this app, we prioritize user sessions, so clearing is safer
                setConversations([]);
                setActiveConversationId(null);
                chatService.setActiveSession(null);
            }
        };

        loadConversations();
    }, [isAuthenticated, user?.id]);

    // 2. Fetch Messages for Active Conversation
    useEffect(() => {
        if (!activeConversationId || !isAuthenticated) return;

        let isMounted = true;
        const syncMessages = async () => {
            const history = await chatService.getHistory(activeConversationId);
            if (isMounted) {
                setConversations(prev => prev.map(c =>
                    c.id === activeConversationId ? { ...c, messages: history } : c
                ));
            }
        };

        syncMessages();
        return () => { isMounted = false; };
    }, [activeConversationId, isAuthenticated]);

    const createConversation = useCallback(async (): Promise<string> => {
        if (isAuthenticated) {
            const newConv = await chatService.createSession();
            setConversations(prev => [newConv, ...prev]);
            setActiveConversationId(newConv.id);
            return newConv.id;
        } else {
            // Fallback for non-auth if allowed, or just block
            console.warn('Cannot create conversation while unauthenticated');
            return '';
        }
    }, [isAuthenticated]);

    const setActiveConversation = useCallback((id: string) => {
        chatService.setActiveSession(id);
        setActiveConversationId(id);
    }, []);

    const deleteConversation = useCallback(async (id: string) => {
        if (isAuthenticated) {
            await chatService.deleteSession(id);
        }

        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
            const remaining = conversations.filter((c) => c.id !== id);
            const nextId = remaining.length > 0 ? remaining[0].id : null;
            chatService.setActiveSession(nextId);
            setActiveConversationId(nextId);
        }
    }, [activeConversationId, conversations, isAuthenticated]);

    const addMessageToConversation = useCallback((message: Message) => {
        if (!activeConversationId) return;

        setConversations((prev) =>
            prev.map((c) => {
                if (c.id === activeConversationId) {
                    return {
                        ...c,
                        messages: [...c.messages, message],
                        updatedAt: new Date(),
                    };
                }
                return c;
            })
        );
    }, [activeConversationId]);

    const setConversationShape = useCallback((conversationId: string, shape: GeneratedShape) => {
        setConversations((prev) =>
            prev.map((c) =>
                c.id === conversationId
                    ? { ...c, generatedShape: shape, updatedAt: new Date() }
                    : c
            )
        );
    }, []);

    const clearActiveConversation = useCallback(() => {
        if (!activeConversationId) return;
        // Optimization: optionally tell backend to clear, or just local
        setConversations((prev) =>
            prev.map((c) =>
                c.id === activeConversationId
                    ? { ...c, messages: [], generatedShape: undefined, updatedAt: new Date() }
                    : c
            )
        );
    }, [activeConversationId]);

    const renameConversation = useCallback(async (id: string, title: string) => {
        if (isAuthenticated) {
            await chatService.renameSession(id, title);
        }
        setConversations((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, title, updatedAt: new Date() } : c
            )
        );
    }, [isAuthenticated]);

    const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

    return {
        conversations,
        activeConversationId,
        activeConversation,
        createConversation,
        setActiveConversation,
        deleteConversation,
        addMessageToConversation,
        setConversationShape,
        clearActiveConversation,
        renameConversation,
    };
};
