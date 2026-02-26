import { useAuthStore } from "@/lib/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatService } from "../services/chatService";
import { useChatStore } from "../stores/chatStore";
import type { Conversation, GeneratedShape, Message } from "../types/chat.type";

interface UseConversationsReturn {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  isLoadingChats: boolean;
  loadError: string | null;
  createConversation: () => Promise<string>;
  setActiveConversation: (id: string | null) => void;
  deleteConversation: (id: string) => Promise<void>;
  addMessageToConversation: (message: Message, id?: string) => void;
  setConversationShape: (id: string, shape: GeneratedShape) => void;
  clearActiveConversation: () => void;
  renameConversation: (id: string, title: string) => Promise<void>;
}

export const useConversations = (): UseConversationsReturn => {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    setConversations,
    setActiveConversationId,
    addMessage,
    updateConversation,
  } = useChatStore();

  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isMigratingRef = useRef(false);
  const lastUserIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || isMigratingRef.current) return;

    const migrateLocalStore = async () => {
      const saved = localStorage.getItem("curfd-conversations");
      if (!saved) return;

      try {
        isMigratingRef.current = true;
        const localConversations: Conversation[] = JSON.parse(saved);
        if (localConversations.length === 0) return;

        console.log(
          `[Migration] Found ${localConversations.length} local conversations to migrate...`
        );

        for (const localConv of localConversations) {
          try {
            await chatService.syncLocalConversation(localConv);
          } catch (e) {
            console.error(
              "[Migration] Failed for conversation:",
              localConv.id,
              e
            );
          }
        }

        localStorage.removeItem("curfd-conversations");
        console.log("[Migration] Successfully migrated conversations");
      } catch (error) {
        console.error("[Migration] Failed:", error);
      } finally {
        isMigratingRef.current = false;
      }
    };

    migrateLocalStore();
  }, [isAuthenticated, user?.id, setConversations]);

  const loadingRef = useRef(false);
  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!isAuthenticated) {
        if (!isAuthLoading) {
          console.log("[useConversations] User logged out, clearing state");
          setConversations([]);
          setActiveConversationId(null);
          chatService.setActiveSession(null);
          lastUserIdRef.current = null;
          setLoadError(null);
        }
        return;
      }

      if (!user) {
        console.warn("[useConversations] No user object, waiting for auth...");
        return;
      }

      const currentUserId = user.id || (user as any).user_id;

      if (!currentUserId) {
        console.warn(
          "[useConversations] User object exists but no ID yet, waiting..."
        );
        return;
      }

      if (lastUserIdRef.current !== currentUserId) {
        if (loadingRef.current) {
          console.log(
            "[useConversations] Already loading, skipping duplicate request"
          );
          return;
        }

        console.log(
          `[useConversations] User changed from ${lastUserIdRef.current} to ${currentUserId}, reloading chats...`
        );
        lastUserIdRef.current = currentUserId;
        loadingRef.current = true;
        setIsLoadingChats(true);
        setLoadError(null);

        try {
          const sessions = await chatService.getSessions();

          console.log(
            `[useConversations] Fetching chats for ${sessions.length} sessions...`
          );

          // If the backend returned no sessions (e.g. fresh local DB), keep the
          // localStorage-persisted conversations rather than overwriting with [].
          if (sessions.length === 0) {
            console.log(
              "[useConversations] No sessions found — preserving local conversations"
            );
            return;
          }

          const chatPromises = sessions.map(async (session) => {
            if (!session || !session.id) {
              console.warn(
                "[useConversations] Invalid session returned from backend:",
                session
              );
              return [];
            }

            try {
              return await chatService.getChats(session.id);
            } catch (err) {
              console.warn(
                `[useConversations] Failed to load chats for session ${session.id}`,
                err
              );
              return [];
            }
          });

          const chatsArrays = await Promise.all(chatPromises);
          const allBackendChats = chatsArrays.flat();

          const allConversations: Conversation[] = allBackendChats
            .filter((chat) => {
              const isValid = chat && chat.id && chat.title;
              if (!isValid)
                console.warn(
                  "[useConversations] Invalid chat data dropped:",
                  chat
                );
              return isValid;
            })
            .map((chat) => ({
              id: String(chat.id),
              title: String(chat.title).substring(0, 200),
              messages: [],
              createdAt: new Date(chat.created_at),
              updatedAt: chat.updated_at
                ? new Date(chat.updated_at)
                : new Date(chat.created_at),
            }));

          allConversations.sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
          );

          console.log(
            `[useConversations] Loaded ${allConversations.length} chats for user ${currentUserId}`
          );
          setConversations(allConversations);

          const currentChatId = chatService.getCurrentChatId();
          if (
            currentChatId &&
            allConversations.some((c) => c.id === currentChatId)
          ) {
            console.log(
              `[useConversations] Restoring active chat: ${currentChatId}`
            );
            setActiveConversationId(currentChatId);
          } else if (allConversations.length > 0) {
            console.log(
              `[useConversations] Setting first chat as active: ${allConversations[0].id}`
            );
            setActiveConversationId(allConversations[0].id);
          } else {
            console.log("[useConversations] No chats found for user");
            setActiveConversationId(null);
          }

          setLoadError(null);
        } catch (error) {
          console.error("[useConversations] Failed to load chats:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load chat history";
          setLoadError(errorMessage);
        } finally {
          setIsLoadingChats(false);
          loadingRef.current = false;
        }
      }
    };

    loadWorkspaces();
  }, [
    isAuthenticated,
    user?.id,
    isAuthLoading,
    setConversations,
    setActiveConversationId,
  ]);
  const fetchingMessagesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeConversationId || !isAuthenticated) return;

    if (fetchingMessagesRef.current.has(activeConversationId)) {
      console.log(
        `[useConversations] Already fetching messages for ${activeConversationId}, skipping`
      );
      return;
    }

    let isMounted = true;
    const syncMessages = async () => {
      fetchingMessagesRef.current.add(activeConversationId);
      try {
        console.log(
          `[useConversations] Fetching messages for chat: ${activeConversationId}`
        );
        const history = await chatService.getHistory(activeConversationId);

        if (!isMounted) return;

        const validatedHistory = history.filter((msg) => {
          if (!msg || !msg.id || !msg.content) {
            console.warn("[useConversations] Invalid message data, skipping");
            return false;
          }
          return true;
        });

        const latestShape = [...validatedHistory]
          .reverse()
          .find((m) => m.shapeData)?.shapeData;

        if (latestShape) {
          console.log(
            `[useConversations] Restoring model for chat ${activeConversationId}:`,
            latestShape.name
          );
        }

        // Only replace messages if the server returned history OR the conversation
        // has no local messages yet. Prevents wiping optimistic user messages that
        // were added before the server persisted them (race condition on new chats).
        const existingMsgs = useChatStore.getState().conversations.find(c => c.id === activeConversationId)?.messages ?? [];
        if (validatedHistory.length > 0 || existingMsgs.length === 0) {
          updateConversation(activeConversationId, {
            messages: validatedHistory,
            generatedShape: latestShape,
          });
        } else if (latestShape) {
          updateConversation(activeConversationId, { generatedShape: latestShape });
        }

        console.log(
          `[useConversations] Loaded ${validatedHistory.length} messages for chat ${activeConversationId}`
        );
      } catch (error) {
        console.error(
          `[useConversations] Failed to fetch messages for chat ${activeConversationId}:`,
          error
        );
      } finally {
        fetchingMessagesRef.current.delete(activeConversationId);
      }
    };

    syncMessages();
    return () => {
      isMounted = false;
    };
  }, [activeConversationId, isAuthenticated, updateConversation]);

  const createConversation = useCallback(async (): Promise<string> => {
    if (!isAuthenticated) {
      console.warn(
        "[useConversations] Cannot create conversation while unauthenticated"
      );
      throw new Error("User must be authenticated to create a conversation");
    }

    if (!user || !user.id) {
      console.error("[useConversations] Invalid user object");
      throw new Error("Invalid user session");
    }

    try {
      const chatId = await chatService.createChat();

      const sessionId = chatService.getCurrentSessionId();
      if (!sessionId) {
        throw new Error("No active session found");
      }

      const chats = await chatService.getChats(sessionId);
      const newChat = chats.find((c) => c.id === chatId);

      if (newChat) {
        const conv: Conversation = {
          id: String(newChat.id),
          title: String(newChat.title).substring(0, 200),
          messages: [],
          createdAt: new Date(newChat.created_at),
          updatedAt: new Date(newChat.updated_at),
        };

        setConversations([conv, ...conversations]);
        setActiveConversationId(conv.id);
        console.log(`[useConversations] Created new conversation: ${conv.id}`);
        return conv.id;
      }

      console.log(
        `[useConversations] Created chat but couldn't fetch details: ${chatId}`
      );
      return chatId;
    } catch (error) {
      console.error("[useConversations] Failed to create conversation:", error);
      throw error;
    }
  }, [
    isAuthenticated,
    user,
    conversations,
    setConversations,
    setActiveConversationId,
  ]);

  const setActiveConversation = useCallback(
    (id: string | null) => {
      setActiveConversationId(id);
    },
    [setActiveConversationId]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!id || typeof id !== "string") {
        console.error("[useConversations] Invalid conversation ID");
        return;
      }

      try {
        if (isAuthenticated) {
          await chatService.deleteChat(id);
          console.log(`[useConversations] Deleted chat from backend: ${id}`);
        }

        const remaining = conversations.filter((c) => c.id !== id);
        setConversations(remaining);

        if (activeConversationId === id) {
          const nextId = remaining.length > 0 ? remaining[0].id : null;
          setActiveConversationId(nextId);
          console.log(`[useConversations] Switched to next chat: ${nextId}`);
        }
      } catch (error) {
        console.error(
          `[useConversations] Failed to delete conversation ${id}:`,
          error
        );
        throw error;
      }
    },
    [
      activeConversationId,
      conversations,
      isAuthenticated,
      setConversations,
      setActiveConversationId,
    ]
  );

  const addMessageToConversation = useCallback(
    (message: Message, id?: string) => {
      const targetId = id || activeConversationId;
      if (targetId) {
        addMessage(targetId, message);
      }
    },
    [activeConversationId, addMessage]
  );

  const setConversationShape = useCallback(
    (conversationId: string, shape: GeneratedShape) => {
      updateConversation(conversationId, { generatedShape: shape });
    },
    [updateConversation]
  );

  const clearActiveConversation = useCallback(() => {
    if (activeConversationId) {
      updateConversation(activeConversationId, {
        messages: [],
        generatedShape: undefined,
      });
    }
  }, [activeConversationId, updateConversation]);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      if (!id || typeof id !== "string") {
        console.error("[useConversations] Invalid conversation ID");
        return;
      }

      const sanitizedTitle = String(title).trim().substring(0, 200);
      if (!sanitizedTitle) {
        console.error("[useConversations] Invalid title");
        return;
      }

      try {
        if (isAuthenticated) {
          await chatService.renameChat(id, sanitizedTitle);
          console.log(
            `[useConversations] Renamed chat ${id} to: ${sanitizedTitle}`
          );
        }
        updateConversation(id, { title: sanitizedTitle });
      } catch (error) {
        console.error(
          `[useConversations] Failed to rename conversation ${id}:`,
          error
        );
        throw error;
      }
    },
    [isAuthenticated, updateConversation]
  );

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isLoadingChats,
    loadError,
    createConversation,
    setActiveConversation,
    deleteConversation,
    addMessageToConversation,
    setConversationShape,
    clearActiveConversation,
    renameConversation,
  };
};
