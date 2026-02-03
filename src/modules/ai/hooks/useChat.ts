import { chatService } from "@/modules/ai/services/chatService";
import { jobService } from "@/modules/ai/services/jobService";
import { assetService } from "@/modules/viewer/services/assetService";
import { useCallback, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import { GeneratedShape, Message } from "../types/chat.type";
import { RunpodEvent, useChatSocket } from "./useChatSocket";

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sendSystemMessage: (content: string, shapeData?: GeneratedShape) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  activeChatId: string | null;
  isGeneratingGlobally: boolean;
}

export const useChat = (
  chatId: string | null = null,
  onShapeGenerated?: (shape: GeneratedShape) => void,
  onMessageReceived?: (message: Message) => void
): UseChatReturn => {
  const {
    conversations,
    generatingChatIds,
    setGenerating,
    isGeneratingGlobally,
    updateConversation,
    addMessage,
    addJobToHistory,
    updateJobInHistory
  } = useChatStore();
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");

  // Get messages from store
  const activeConversation = conversations.find(c => c.id === chatId);
  const messages = activeConversation?.messages || [];

  // Derived loading state for THIS specific chat
  const isLoading = chatId ? generatingChatIds.has(chatId) : false;

  const handleSocketEvent = useCallback(async (event: RunpodEvent) => {
    if (!chatId) return;

    switch (event.type) {
      case 'runpod.started':
        console.log('Runpod started:', event);
        setGenerating(chatId, true, event.status || 'Initializing');
        if (event.job_id) {
          updateJobInHistory(chatId, event.job_id, { status: 'running', startedAt: new Date() });
        }
        break;
      case 'runpod.status':
        console.log('[useChat] runpod.status:', event.status);

        // Check if status is COMPLETED - backend sends this instead of runpod.completed
        if (event.status === 'COMPLETED') {
          console.log('[useChat] Status is COMPLETED, triggering completion flow');

          // Add completion message to chat if provided
          if (event.message) {
            const newMessage: Message = {
              id: event.message.id || `msg-${Date.now()}`,
              role: (event.message.role as any) || 'assistant',
              content: event.message.content || 'Model generation completed!',
              timestamp: new Date(),
            };
            console.log('[useChat] Adding completion message to chat');
            onMessageReceived?.(newMessage);
          }

          // Fetch assets with retry logic
          const jobId = event.job_id || event.runpod_id;
          if (jobId) {
            console.log('[useChat] Fetching assets for job:', jobId);
            if (chatId) updateJobInHistory(chatId, jobId, { status: 'succeeded', finishedAt: new Date() });

            try {
              // Retry fetching assets up to 3 times with delays
              let assets: any[] = [];
              let retryCount = 0;
              const maxRetries = 3;

              while (retryCount < maxRetries && assets.length === 0) {
                if (retryCount > 0) {
                  const delay = retryCount * 2000; // 2s, 4s delays
                  console.log(`[useChat] Retry ${retryCount}/${maxRetries} - waiting ${delay}ms before fetching assets...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }

                assets = await assetService.fetchAssets(jobId);
                console.log(`[useChat] Attempt ${retryCount + 1}: Fetched ${assets.length} assets`);
                retryCount++;
              }

              if (assets.length === 0) {
                console.error('[useChat] No assets found after', maxRetries, 'attempts');
                setError('Model generated but no assets were created. Please check the backend logs.');
                setGenerating(chatId, false);
                return;
              }

              const shape = await assetService.mapToGeneratedShape(jobId, assets);
              console.log('[useChat] Mapped shape:', shape?.name, 'ID:', shape?.id, 'sdfUrl:', shape?.sdfUrl, 'scadCode length:', shape?.scadCode?.length);

              if (shape && onShapeGenerated) {
                console.log('[useChat] Calling onShapeGenerated callback');
                onShapeGenerated(shape);
              } else {
                console.warn('[useChat] Shape or callback missing:', { hasShape: !!shape, hasCallback: !!onShapeGenerated });
                setError('Failed to process generated model. No valid model file found in assets.');
              }
            } catch (err) {
              console.error('[useChat] Failed to load assets after completion:', err);
              setError('Model generated but failed to load assets.');
            } finally {
              console.log('[useChat] Clearing generating status');
              setGenerating(chatId, false);
            }
          } else {
            console.warn('[useChat] No jobId in COMPLETED status event');
            setGenerating(chatId, false);
          }
        } else {
          // Regular status update
          setGenerating(chatId, true, event.status);
          if (event.job_id) {
            updateJobInHistory(chatId, event.job_id, { currentStatus: event.status });
          }

          // Display status messages in chat for better UX
          if (event.message && event.message.content) {
            const statusMessage: Message = {
              id: `status-${Date.now()}`,
              role: 'system',
              content: event.message.content,
              timestamp: new Date(),
            };
            onMessageReceived?.(statusMessage);
          }
        }
        break;
      case 'runpod.completed':
        console.log('[useChat] runpod.completed event received:', event);

        if (event.message) {
          const newMessage: Message = {
            id: event.message.id,
            role: event.message.role as any,
            content: event.message.content,
            timestamp: new Date(),
          };
          console.log('[useChat] Adding completion message to chat');
          onMessageReceived?.(newMessage);
        }

        // Fetch assets if we have a job_id or runpod_id
        const jobId = event.job_id || event.runpod_id;
        if (jobId) {
          console.log('[useChat] Fetching assets for job:', jobId);
          if (chatId) updateJobInHistory(chatId, jobId, { status: 'succeeded', finishedAt: new Date() });
          try {
            // Don't set generating to true here - we're about to complete
            const assets = await assetService.fetchAssets(jobId);
            console.log('[useChat] Fetched assets:', assets.length, 'files');

            const shape = await assetService.mapToGeneratedShape(jobId, assets);
            console.log('[useChat] Mapped shape:', shape?.name, 'ID:', shape?.id, 'sdfUrl:', shape?.sdfUrl, 'scadCode length:', shape?.scadCode?.length);

            if (shape && onShapeGenerated) {
              console.log('[useChat] Calling onShapeGenerated callback');
              onShapeGenerated(shape);
            } else {
              console.warn('[useChat] Shape or callback missing:', { hasShape: !!shape, hasCallback: !!onShapeGenerated });
            }
          } catch (err) {
            console.error('[useChat] Failed to load assets after completion:', err);
            setError('Model generated but failed to load assets.');
          } finally {
            console.log('[useChat] Clearing generating status');
            setGenerating(chatId, false);
          }
        } else {
          console.warn('[useChat] No jobId in completion event');
          setGenerating(chatId, false);
        }
        break;
      case 'runpod.failed':
      case 'runpod.timeout':
        setError(event.error || `Runpod execution ${event.type === 'runpod.timeout' ? 'timed out' : 'failed'}`);
        if (event.job_id) {
          updateJobInHistory(chatId, event.job_id, { status: 'failed', error: event.error, finishedAt: new Date() });
        }
        setGenerating(chatId, false);
        break;
      case 'error':
        setError(event.error || 'An error occurred during Runpod execution');
        setGenerating(chatId, false);
        break;
    }
  }, [chatId, onMessageReceived, onShapeGenerated, setGenerating, updateJobInHistory]);

  const { isConnected } = useChatSocket({
    chatId: chatId,
    onEvent: handleSocketEvent
  });

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);
      setLastUserMessage(content.trim());

      try {
        // 1. Ensure Session & Get/Create Chat
        let targetId = chatId;
        const { setActiveConversationId, setConversations, conversations } = useChatStore.getState();

        // LAZY CREATION: If no chat ID, create one now (first message)
        if (!targetId) {
          console.log('[useChat] Creating new chat on first message...');
          targetId = await chatService.createChat(content.trim().slice(0, 30) + "...");

          // Note: We do NOT save an AI greeting to the database per user request
          // The "Greeting" is handled by the UI empty state.

          const newConv = {
            id: targetId,
            title: content.trim().slice(0, 30),
            messages: [], // Start empty, user message will be added via optimistic update or socket
            createdAt: new Date(),
            updatedAt: new Date()
          };

          setConversations([newConv as any, ...conversations]);
          setActiveConversationId(targetId);

          // Wait a bit for WebSocket to initiate connection
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 2. Mark as generating BEFORE request
        setGenerating(targetId, true);

        // 3. Create Persistent Job Record (Deep Backend Integration)
        let jobId: string | undefined;
        try {
          const sessionId = chatService.getCurrentSessionId();
          if (sessionId) {
            const job = await jobService.createJob({
              session_id: sessionId,
              prompt: content.trim(),
              output_format: 'glb'
            });
            jobId = job.id;

            // Log to Mission Control history
            addJobToHistory(targetId, {
              ...job,
              status: 'queued',
              createdAt: new Date()
            });
          }
        } catch (jobErr) {
          console.warn("Failed to create job record, proceeding with volatile generation:", jobErr);
        }

        // 4. Start Runpod Request with Job tracking
        await chatService.startRunpodRequest(targetId, content.trim(), 'process_requirements', {
          job_id: jobId,
          source: 'curfd-chat'
        });

        // Note: Response will be handled via WebSocket (handleSocketEvent)
      } catch (err) {
        console.error('[useChat] Failed to send message:', err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        if (chatId) setGenerating(chatId, false);
      }
    },
    [chatId, setGenerating, addJobToHistory]
  );

  const sendSystemMessage = useCallback(
    async (content: string, shapeData?: GeneratedShape) => {
      if (!chatId) return;

      try {
        let finalContent = content;
        if (shapeData) {
          // Add persistence suffix for chatService to recover shapeData later
          finalContent += `\n\n|||JSON_DATA|||${JSON.stringify({
            model_id: shapeData.id,
            model_name: shapeData.name,
            description: shapeData.description,
            sdf_url: shapeData.sdfUrl,
            yaml_url: shapeData.yamlUrl,
            scad_code: shapeData.scadCode,
            parts: shapeData.geometry.parts,
            assets: shapeData.assets,
            parameters: (shapeData.geometry as any).physics || (shapeData.specification as any)?.parameters || {}
          })}`;
        }

        const savedMsg = await chatService.createMessage(chatId, finalContent, 'assistant');
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
    clearMessages,
    retryLastMessage,
    setMessages: (newMessages: any) => {
      const msgs = typeof newMessages === 'function' ? newMessages(messages) : newMessages;
      if (chatId) updateConversation(chatId, { messages: msgs });
    },
    activeChatId: chatId,
    isGeneratingGlobally: isGeneratingGlobally()
  };
};
