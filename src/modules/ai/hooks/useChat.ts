import { chatService } from "@/modules/ai/services/chatService";
import { assetService } from "@/modules/viewer/services/assetService";
import { useCallback, useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import type { GeneratedShape, Message } from "../types/chat.type";
import { useChatSocket } from "./useChatSocket";
import type { RunpodEvent } from "./useChatSocket";
import { useAuthStore } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/constants";
import { useEditorStore } from "@/modules/editor/stores/editorStore";

// --- HELPER: Auto-Parse OpenSCAD Variables ---
const extractParametersFromCode = (code: string) => {
  const parameters = [];
  // Matches lines like: width = 20.5; 
  const regex = /^\s*([a-zA-Z0-9_]+)\s*=\s*([-+]?[0-9]*\.?[0-9]+)\s*;/gm;
  const ignoredVars = ['$fn', '$fa', '$fs', 'eps', 'epsilon']; // Ignore system/utility vars
  
  let match;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    const val = parseFloat(match[2]);

    if (!ignoredVars.includes(name) && !isNaN(val)) {
      // Intelligently guess slider bounds (±50% of the default value)
      let min_val = val > 0 ? Math.floor(val * 0.5) : val - 10;
      let max_val = val > 0 ? Math.ceil(val * 1.5) : val + 10;
      
      // Ensure there's a usable range
      if (min_val === max_val) {
        min_val -= 5;
        max_val += 5;
      }

      parameters.push({
        name,
        default_val: val,
        min_val,
        max_val,
        description: `Auto-extracted: ${name}`
      });
    }
  }
  return parameters;
};

/** Convert a File to {data: base64, media_type: string} */
async function fileToBase64(file: File): Promise<{ data: string; media_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip "data:image/jpeg;base64," prefix
      const base64 = dataUrl.split(",")[1];
      resolve({ data: base64, media_type: file.type || "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, images?: File[]) => Promise<void>;
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

  // Refs for WebSocket streaming state
  const streamMsgIdRef = useRef<string | null>(null);
  const streamedContentRef = useRef<string>("");
  const streamChatIdRef = useRef<string | null>(null);

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
      setGenerating(chatId, false)
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
      // OpenSCAD events use refs for chat ID (works even for newly created chats)
      const activeChatId = streamChatIdRef.current || chatId;

      switch (event.type) {
        // ── OpenSCAD streaming events ──
        case "openscad.token": {
          const msgId = streamMsgIdRef.current;
          const targetChatId = streamChatIdRef.current;
          if (msgId && targetChatId && event.text) {
            streamedContentRef.current += event.text;
            useChatStore.getState().updateMessage(targetChatId, msgId, {
              content: streamedContentRef.current,
            });
          }
          break;
        }
        case "openscad.done": {
          const msgId = streamMsgIdRef.current;
          const targetChatId = streamChatIdRef.current;
          if (msgId && targetChatId && event.data) {
            const { openscad_code, parameters, model_type, message, id } = event.data;

            useChatStore.getState().updateMessage(targetChatId, msgId, {
              id: id || msgId,
              content: openscad_code
                ? "**Model Generated successfully!**\n\nClick the model card below to load it into your Editor."
                : message || streamedContentRef.current,
              shapeData: openscad_code ? {
                id: id || `shape-${Date.now()}`,
                name: model_type || 'Generated Model',
                scadCode: openscad_code,
                type: 'generic',
                description: message || '',
                hasSimulation: false,
                geometry: { parts: [], metadata: { totalVertices: 0, fileSize: 0 } },
                createdAt: new Date(),
              } as any : undefined,
            });

            if (openscad_code) {
              useEditorStore.getState().setCode(openscad_code);
              useEditorStore.getState().setOriginalCode(openscad_code);
            }
            if (parameters && Array.isArray(parameters) && parameters.length > 0) {
              useEditorStore.getState().setParameters(parameters);
            }
          }
          streamMsgIdRef.current = null;
          streamChatIdRef.current = null;
          streamedContentRef.current = "";
          if (activeChatId) setGenerating(activeChatId, false);
          sendingRef.current = false;
          break;
        }
        case "openscad.error": {
          // Backend sends "message" as string, not {content: string}
          const errorMsg = event.error || (typeof event.message === 'string' ? event.message : event.message?.content) || "Generation failed";
          setError(errorMsg as string);
          streamMsgIdRef.current = null;
          streamChatIdRef.current = null;
          streamedContentRef.current = "";
          if (activeChatId) setGenerating(activeChatId, false);
          sendingRef.current = false;
          break;
        }

        // ── RunPod events (require chatId) ──
        case "runpod.started":
          if (!chatId) break;
          setGenerating(chatId, true, event.status || "Initializing");
          if (event.job_id) {
            updateJobInHistory(chatId, event.job_id, {
              status: "running",
              startedAt: new Date(),
            });
          }
          break;
        case "runpod.status":
          if (!chatId) break;
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
          if (!chatId) break;
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
          if (!chatId) break;
          setError(event.error || "An error occurred");
          setGenerating(chatId, false);
          break;
      }
    },
    [chatId, handleJobCompletion, setGenerating, updateJobInHistory]
  );

  const user = useAuthStore((state) => state.user);
  const sessionId = user?.id || "anonymous-session";


  const { send: sendWs, isConnected: wsConnected } = useChatSocket({
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

  // --- 4. SEND MESSAGE (WebSocket) ---
  const sendMessage = useCallback(
    async (content: string, images?: File[]) => {
      if (!content.trim() && (!images || images.length === 0)) return;
      if (sendingRef.current) return;

      sendingRef.current = true;
      setError(null);
      setLastUserMessage(content.trim());

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

        // Convert images to base64 for API + create local preview URLs
        let imagePayload: { data: string; media_type: string }[] | undefined;
        let localImageUrls: string[] | undefined;
        if (images && images.length > 0) {
          imagePayload = await Promise.all(images.map(fileToBase64));
          localImageUrls = images.map(f => URL.createObjectURL(f));
        }

        // Optimistic UI: add user message with image previews
        const userMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content: content.trim() || (images?.length ? "Attached image(s)" : ""),
          timestamp: new Date(),
          imageUrls: localImageUrls,
        };
        addMessage(targetId, userMsg);

        // Create placeholder assistant message for streaming
        const streamMsgId = `stream-${Date.now()}`;
        addMessage(targetId, {
          id: streamMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        });

        // Set up refs for WebSocket event handler
        streamMsgIdRef.current = streamMsgId;
        streamChatIdRef.current = targetId;
        streamedContentRef.current = "";

        const { selectedProvider, selectedModel, selectedThinking } = useChatStore.getState();
        const messageContent = content.trim() || (imagePayload?.length ? "Analyze the attached image(s) and generate OpenSCAD code." : "");

        // Try WebSocket first, fall back to SSE
        const wsSent = wsConnected && sendWs({
          type: "openscad.request",
          content: messageContent,
          images: imagePayload,
          options: {
            llm_provider: selectedProvider,
            llm_model: selectedModel,
            llm_thinking: selectedThinking,
          },
        });

        if (wsSent) {
          // WebSocket handles everything — events arrive via handleSocketEvent
          // sendingRef and generating state are cleared in the openscad.done/error handlers
          return;
        }

        // Fallback: SSE streaming
        console.warn('[useChat] WebSocket not available, falling back to SSE');
        streamMsgIdRef.current = null;
        streamChatIdRef.current = null;

        const chatIdForStream = targetId;
        let streamedContent = '';

        await chatService.processRequirementsStream(
          chatIdForStream,
          messageContent,
          (text: string) => {
            streamedContent += text;
            useChatStore.getState().updateMessage(chatIdForStream, streamMsgId, {
              content: streamedContent,
            });
          },
          (data: any) => {
            const { openscad_code, parameters, model_type, message, id } = data;
            useChatStore.getState().updateMessage(chatIdForStream, streamMsgId, {
              id: id || streamMsgId,
              content: openscad_code
                ? "**Model Generated successfully!**\n\nClick the model card below to load it into your Editor."
                : message || streamedContent,
              shapeData: openscad_code ? {
                id: id || `shape-${Date.now()}`,
                name: model_type || 'Generated Model',
                scadCode: openscad_code,
                type: 'generic',
                description: message || '',
                hasSimulation: false,
                geometry: { parts: [], metadata: { totalVertices: 0, fileSize: 0 } },
                createdAt: new Date(),
              } as any : undefined,
            });
            if (openscad_code) {
              useEditorStore.getState().setCode(openscad_code);
              useEditorStore.getState().setOriginalCode(openscad_code);
            }
            if (parameters && Array.isArray(parameters) && parameters.length > 0) {
              useEditorStore.getState().setParameters(parameters);
            }
          },
          (error: string) => {
            setError(error);
          },
          {
            llm_provider: selectedProvider,
            llm_model: selectedModel,
            llm_thinking: selectedThinking,
            images: imagePayload,
          },
        );
      } catch (err: any) {
        console.error('[useChat] sendMessage failed:', err?.message);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
      } finally {
        // Only clean up if not using WebSocket (WS cleans up in event handlers)
        if (!streamMsgIdRef.current) {
          if (targetId) setGenerating(targetId, false);
          sendingRef.current = false;
        }
      }
    },
    [chatId, setGenerating, addMessage, wsConnected, sendWs]
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