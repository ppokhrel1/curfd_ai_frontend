import { chatService } from "@/modules/ai/services/chatService";
import { assetService } from "@/modules/viewer/services/assetService";
import { useCallback, useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import type { GeneratedShape, Message } from "../types/chat.type";
import { useChatSocket } from "./useChatSocket";
import type { RunpodEvent } from "./useChatSocket";
import { useAuthStore } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/constants";

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sendSystemMessage: (
    content: string,
    shapeData?: GeneratedShape
  ) => Promise<void>;
  generateModel: (requirements: any) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  activeChatId: string | null;
  isGeneratingGlobally: boolean;
}

export const useChat = (
  chatId: string | null = null,
  onShapeGenerated?: (shape: GeneratedShape, chatId: string) => void,
  onMessageReceived?: (message: Message, chatId: string) => void
): UseChatReturn => {
  const {
    conversations,
    generatingChatIds,
    setGenerating,
    isGeneratingGlobally,
    updateConversation,
    addMessage,
    updateJobInHistory,
  } = useChatStore();
  
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");

  const activeConversation = conversations.find((c) => c.id === chatId);
  const messages = activeConversation?.messages || [];
  const isLoading = chatId ? generatingChatIds.has(chatId) : false;

  const completionHandledRef = useRef<Set<string>>(new Set());

  // --- 1. HANDLE COMPLETION (Asset Polling) ---
  const handleJobCompletion = useCallback(
    async (event: RunpodEvent) => {
      if (!chatId) return;
      const jobId = event.job_id || event.runpod_id;
      if (!jobId) return;

      const eventKey = `${jobId}-${event.action || "unknown"}`;
      if (completionHandledRef.current.has(eventKey)) return;
      completionHandledRef.current.add(eventKey);

      // Handle standard message output (if any)
      if (event.message) {
        const msgId = event.message.id || `msg-${Date.now()}`;
        const exists = messages.some((m) => m.id === msgId);
        if (!exists) {
          const newMessage: Message = {
            id: msgId,
            role: (event.message.role as any) || "assistant",
            content: event.message.content || "Model generation completed!",
            timestamp: new Date(),
          };
          onMessageReceived?.(newMessage, chatId);
        }
      }

      // Poll for assets if action is 'generate_scad'
      if (event.action === "generate_scad" && event.status === "COMPLETED") {
        if (jobId) {
          updateJobInHistory(chatId, jobId, {
            status: "succeeded",
            finishedAt: new Date(),
          });

          try {
            let assets: any[] = [];
            let retryCount = 0;
            const maxRetries = 20;

            while (retryCount < maxRetries && assets.length === 0) {
              const delay = Math.min(retryCount * 1000 + 1000, 5000);
              await new Promise((r) => setTimeout(r, delay));
              assets = await assetService.fetchAssets(jobId);
              if (assets.length > 0) break;
              retryCount++;
            }

            if (assets.length === 0) throw new Error("No assets found.");

            const shape = await assetService.mapToGeneratedShape(jobId, assets);

            if (shape && onShapeGenerated) {
              onShapeGenerated(shape, chatId);
            } else if (assets.length > 0 && !shape) {
              setError("Model generated but could not be displayed.");
            }
          } catch (err) {
            console.error("[useChat] ❌ Failed to load assets:", err);
            setError("Model generated but failed to load assets.");
          } finally {
            setGenerating(chatId, false);
          }
        }
      } else {
        setGenerating(chatId, false);
      }
    },
    [
      chatId,
      messages,
      onMessageReceived,
      onShapeGenerated,
      setGenerating,
      updateJobInHistory,
    ]
  );

  // --- 2. SOCKET EVENT HANDLER ---
  const handleSocketEvent = useCallback(
    async (event: RunpodEvent) => {
      if (!chatId) return;
      switch (event.type) {
        case "runpod.started":
          setGenerating(chatId, true, event.status || "Initializing");
          if (event.job_id) {
            updateJobInHistory(chatId, event.job_id, {
              status: "running",
              startedAt: new Date(),
            });
          }
          break;
        case "runpod.status":
          if (event.status === "COMPLETED") {
            await handleJobCompletion(event);
          } else {
            setGenerating(chatId, true, event.status);
            if (event.job_id) {
              updateJobInHistory(chatId, event.job_id, {
                currentStatus: event.status,
              });
            }
          }
          break;
        case "runpod.completed":
          await handleJobCompletion(event);
          break;
        case "runpod.failed":
        case "runpod.timeout":
          setError(event.error || `Runpod execution ${event.type}`);
          if (event.job_id) {
            updateJobInHistory(chatId, event.job_id, {
              status: "failed",
              error: event.error,
              finishedAt: new Date(),
            });
          }
          setGenerating(chatId, false);
          break;
        case "error":
          setError(event.error || "An error occurred");
          setGenerating(chatId, false);
          break;
      }
    },
    [chatId, handleJobCompletion, setGenerating, updateJobInHistory]
  );

  const user = useAuthStore((state) => state.user);
  const sessionId = user?.id || "anonymous-session"; // Fallback if no user is signed in


  useChatSocket({
    chatId,
    sessionId,
    onEvent: handleSocketEvent 
  });

  const sendingRef = useRef(false);

  // --- 3. GENERATE MODEL (Manual Trigger) ---
  const generateModel = useCallback(
    async (requirements: any) => {
      if (!chatId) return;

      try {
        setGenerating(chatId, true, "Generating 3D model...");
        
        await chatService.startRunpodRequest(
          chatId,
          "Generating 3D model...",
          "generate_scad",
          requirements,
          { source: "manual-trigger" }
        );
      } catch (err) {
        console.error("[useChat] Failed to manual generate model:", err);
        setError(err instanceof Error ? err.message : "Failed to generate model");
        setGenerating(chatId, false);
      }
    },
    [chatId, setGenerating]
  );

  // --- 4. SEND MESSAGE ---
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (sendingRef.current) return;

      sendingRef.current = true;
      setError(null);
      setLastUserMessage(content.trim());

      // 👉 FIX 2: Lift targetId outside try/catch so it exists in the catch block for new chats
      let targetId = chatId;

      try {
        const { setActiveConversationId, setConversations, conversations } =
          useChatStore.getState();

        // Create chat if needed
        if (!targetId) {
          targetId = await chatService.createChat(
            content.trim().slice(0, 30) + "..."
          );
          const newConv = {
            id: targetId,
            title: content.trim().slice(0, 30),
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setConversations([newConv as any, ...conversations]);
          setActiveConversationId(targetId);
        }

        setGenerating(targetId, true, "Thinking...");

        // Optimistic UI update
        const userMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content: content.trim(),
          timestamp: new Date(),
        };
        addMessage(targetId, userMsg);

        // CALL BACKEND
        const aiResponse = await chatService.processRequirements(
          targetId,
          content.trim()
        );

        if (aiResponse) {
          const aiMsg: Message = {
            id: aiResponse.id || `ai-${Date.now()}`,
            role: "assistant",
            content: aiResponse.content,
            timestamp: new Date(),
          };
          addMessage(targetId, aiMsg);

          // Extract JSON Requirements
          const metadata = aiResponse.metadata_json;
          let requirements = null;

          if (metadata) {
            requirements = metadata.requirements || metadata;
          } else {
            try {
              requirements = JSON.parse(aiResponse.content);
            } catch (e) {
              /* Content is just text */
            }
          }

          // Trigger 3D Generation if requirements found
          if (
            requirements &&
            (requirements.detailed_geometric_instructions || requirements.parts)
          ) {
            setGenerating(targetId, true, "Generating 3D model...");

            await chatService.startRunpodRequest(
              targetId,
              "Generating 3D model...",
              "generate_scad",
              requirements,
              { source: "auto-trigger" }
            );

          } else {
            setGenerating(targetId, false); // Clear if no generation triggered
          }
        } else {
          setGenerating(targetId, false); // Clear if no response
        }
      } catch (err) {
        console.error("[useChat] Failed to send message:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        if (targetId) setGenerating(targetId, false); // Fixes hanging loading on error
      } finally {
        sendingRef.current = false;
      }
    },
    [chatId, setGenerating, addMessage]
  );

  const sendSystemMessage = useCallback(
    async (content: string, shapeData?: GeneratedShape) => {
      if (!chatId) return;

      try {
        let finalContent = content;
        if (shapeData) {
          finalContent += `\n\n|||JSON_DATA|||${JSON.stringify({
            model_id: shapeData.id,
            model_name: shapeData.name,
            sdf_url: shapeData.sdfUrl,
            scad_code: shapeData.scadCode,
          })}`;
        }
        const savedMsg = await chatService.createMessage(
          chatId,
          finalContent,
          "assistant"
        );
        addMessage(chatId, savedMsg);
        if (shapeData) {
          updateConversation(chatId, { generatedShape: shapeData });
        }
      } catch (err) {
        console.error("Failed to persist system message:", err);
      }
    },
    [chatId, addMessage, updateConversation]
  );

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessage) {
      await sendMessage(lastUserMessage);
    }
  }, [lastUserMessage, sendMessage]);

  const clearMessages = useCallback(() => {
    setError(null);
    setLastUserMessage("");
    chatService.clearHistory();
    useChatStore.getState().setActiveConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendSystemMessage,
    generateModel,
    clearMessages,
    retryLastMessage,
    setMessages: (newMessages: any) => {
      const msgs =
        typeof newMessages === "function" ? newMessages(messages) : newMessages;
        if (chatId) updateConversation(chatId, { messages: msgs });
    },
    activeChatId: chatId,
    isGeneratingGlobally: isGeneratingGlobally(),
  };
};