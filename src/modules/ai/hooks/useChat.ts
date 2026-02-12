import { chatService } from "@/modules/ai/services/chatService";
import { jobService } from "@/modules/ai/services/jobService";
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import { assetService } from "@/modules/viewer/services/assetService";
import { useCallback, useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import type { GeneratedShape, Message } from "../types/chat.type";
import type { RunpodEvent } from "./useChatSocket";
import { useChatSocket } from "./useChatSocket";

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sendSystemMessage: (
    content: string,
    shapeData?: GeneratedShape
  ) => Promise<void>;
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
    updateJobInHistory,
  } = useChatStore();
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");

  // Get messages from store
  const activeConversation = conversations.find((c) => c.id === chatId);
  const messages = activeConversation?.messages || [];

  // Derived loading state for THIS specific chat
  const isLoading = chatId ? generatingChatIds.has(chatId) : false;

  // Shared completion handler to avoid duplication & race conditions
  const completionHandledRef = useRef<Set<string>>(new Set());
  const generateScadTriggeredRef = useRef<Set<string>>(new Set());

  const handleJobCompletion = useCallback(
    async (event: RunpodEvent) => {
      console.log("[useChat] handleJobCompletion called with event:", {
        type: event.type,
        action: event.action,
        job_id: event.job_id,
        runpod_id: event.runpod_id,
        hasOutput: !!event.output,
        hasMessage: !!event.message,
        status: event.status,
      });

      if (!chatId) {
        console.warn("[useChat] No chatId, skipping completion");
        return;
      }

      const jobId = event.job_id || event.runpod_id;
      if (!jobId) {
        console.warn("[useChat] No jobId or runpodId in event");
        return;
      }

      const eventKey = `${jobId}-${event.action || "unknown"}`;

      if (completionHandledRef.current.has(eventKey)) {
        console.log("[useChat] Already handled completion for:", eventKey);
        return;
      }

      completionHandledRef.current.add(eventKey);
      console.log("[useChat]  Handling job completion for:", eventKey);

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
          onMessageReceived?.(newMessage);
        }
      }

      if (event.action === "process_requirements" && event.output) {
        console.log(
          "[useChat] process_requirements completed, checking for requirements..."
        );
        const requirements =
          event.output.requirements ||
          event.output.data?.requirements ||
          event.output;

        if (
          requirements &&
          typeof requirements === "object" &&
          Object.keys(requirements).length > 0
        ) {
          // Check if we already triggered generate_scad for this job
          const generateKey = `generate-${jobId}`;
          if (generateScadTriggeredRef.current.has(generateKey)) {
            console.log(
              "[useChat] generate_scad already triggered for job:",
              jobId
            );
            return;
          }

          generateScadTriggeredRef.current.add(generateKey);
          console.log(
            "[useChat]  Valid requirements found! Auto-triggering generate_scad..."
          );
          console.log(
            "[useChat] Requirements:",
            JSON.stringify(requirements, null, 2)
          );
          if (jobId)
            updateJobInHistory(chatId, jobId, {
              status: "succeeded",
              finishedAt: new Date(),
            });

          setGenerating(
            chatId,
            true,
            "Generating 3D model...",
            "generate_scad"
          );

          try {
            const assetType = "scad_zip";

            console.log(
              "[useChat]  Sending generate_scad request to backend..."
            );
            await chatService.startRunpodRequest(
              chatId,
              "Generating 3D model from requirements",
              "generate_scad",
              requirements,
              {
                source: "auto-trigger",
                job_id: jobId,
                asset_type: assetType,
                storage_provider: "b2",
              }
            );
            console.log("[useChat] generate_scad request sent successfully");

            (async () => {
              console.log(
                `[useChat]  Starting polling fallback for job: ${jobId}`
              );
              const maxPolls = 40;
              const pollInterval = 3000;

              for (let i = 0; i < maxPolls; i++) {
                const completionKey = `${jobId}-generate_scad`;
                if (completionHandledRef.current.has(completionKey)) {
                  console.log(
                    "[useChat] Polling stopped, completion already handled via socket"
                  );
                  return;
                }

                await new Promise((r) => setTimeout(r, pollInterval));

                try {
                  const assets = await assetService.fetchAssets(jobId);
                  if (assets && assets.length > 0) {
                    if (completionHandledRef.current.has(completionKey)) return;

                    console.log(
                      "[useChat] Polling found assets! Triggering synthetic completion."
                    );
                    // Create synthetic event
                    const syntheticEvent: RunpodEvent = {
                      type: "runpod.completed",
                      status: "COMPLETED",
                      job_id: jobId,
                      chat_id: chatId!,
                      action: "generate_scad",
                      output: { status: "completed_via_polling" },
                      runpod_id: event.runpod_id,
                    };

                    await handleJobCompletion(syntheticEvent);
                    return;
                  }
                } catch (pollErr) { }
              }
              console.log("[useChat] Polling timed out without finding assets");
            })();
          } catch (err) {
            console.error("[useChat] ❌ Failed to trigger generate_scad:", err);
            setError("Failed to start model generation");
            setGenerating(chatId, false);
            useEditorStore.getState().setCompiling(false);
            useEditorStore.getState().setError("Failed to start model generation");
            generateScadTriggeredRef.current.delete(generateKey);
          }
          return;
        } else {
          console.warn("[useChat] No valid requirements in output");
        }
      }

      console.log(
        "[useChat] Proceeding to asset loading phase for action:",
        event.action
      );

      if (jobId) {
        if (chatId)
          updateJobInHistory(chatId, jobId, {
            status: "succeeded",
            finishedAt: new Date(),
          });

        try {
          console.log("[useChat]  Fetching assets for job:", jobId);

          // Retry fetching assets up to 5 times with increasing delays
          let assets: any[] = [];
          let retryCount = 0;
          const maxRetries = 5;

          while (retryCount < maxRetries && assets.length === 0) {
            if (retryCount > 0) {
              const delay = retryCount * 2000;
              console.log(
                `[useChat] Retry ${retryCount}/${maxRetries} - waiting ${delay}ms...`
              );
              await new Promise((r) => setTimeout(r, delay));
            }

            assets = await assetService.fetchAssets(jobId);
            console.log(
              `[useChat] Attempt ${retryCount + 1}: Fetched ${assets.length
              } assets`
            );
            if (assets.length > 0) {
              console.log(
                "[useChat] Assets found:",
                assets.map((a) => ({
                  id: a.id,
                  type: a.asset_type,
                  uri: a.uri,
                }))
              );
              break;
            }
            retryCount++;
          }

          if (assets.length === 0) {
            console.error(
              "[useChat] ❌ No assets found after",
              maxRetries,
              "retries"
            );
            throw new Error("No assets found after polling.");
          }

          console.log(
            `[useChat] Fetched ${assets.length} assets, mapping to GeneratedShape...`
          );
          const shape = await assetService.mapToGeneratedShape(jobId, assets);

          console.log("[useChat] Mapped shape result:", {
            hasShape: !!shape,
            shapeName: shape?.name,
            shapeId: shape?.id,
            hasSdfUrl: !!shape?.sdfUrl,
            hasScadCode: !!shape?.scadCode,
            scadCodeLength: shape?.scadCode?.length || 0,
          });

          if (shape && onShapeGenerated) {
            console.log("[useChat] Calling onShapeGenerated callback");
            onShapeGenerated(shape);
          } else {
            console.warn("[useChat]  Shape is null or no callback:", {
              hasShape: !!shape,
              hasCallback: !!onShapeGenerated,
            });
            if (assets.length > 0 && !shape) {
              setError(
                "Model generated but could not be displayed (format issue)."
              );
            }
          }
        } catch (err) {
          console.error("[useChat] ❌ Failed to load assets:", err);
          if (event.action === "generate_scad") {
            setError("Model generated but failed to load assets.");
          }
        } finally {
          console.log("[useChat] Clearing generating status");
          setGenerating(chatId, false);
          useEditorStore.getState().setCompiling(false);
          const { code } = useEditorStore.getState();
          useEditorStore.getState().setCode(code); // Trigger re-sync if needed, but mostly to clear dirty
        }
      } else {
        console.log("[useChat] No jobId, just clearing generating status");
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

  const handleSocketEvent = useCallback(
    async (event: RunpodEvent) => {
      if (!chatId) return;

      switch (event.type) {
        case "runpod.started":
          console.log("Runpod started:", event);
          setGenerating(chatId, true, event.status || "Initializing");
          if (event.job_id) {
            updateJobInHistory(chatId, event.job_id, {
              status: "running",
              startedAt: new Date(),
            });
          }
          break;
        case "runpod.status":
          console.log("[useChat] runpod.status:", event.status);

          if (event.status === "COMPLETED") {
            console.log(
              "[useChat] Status is COMPLETED, triggering completion flow"
            );

            await handleJobCompletion(event);
          } else {
            setGenerating(chatId, true, event.status);
            if (event.job_id) {
              updateJobInHistory(chatId, event.job_id, {
                currentStatus: event.status,
              });
            }

            if (event.message && event.message.content) {
              const statusMessage: Message = {
                id: `status-${Date.now()}`,
                role: "system",
                content: event.message.content,
                timestamp: new Date(),
              };
              onMessageReceived?.(statusMessage);
            }
          }
          break;

        case "runpod.completed":
          console.log("[useChat] runpod.completed event received:", event);
          await handleJobCompletion(event);
          break;
        case "runpod.failed":
        case "runpod.timeout":
          setError(
            event.error ||
            `Runpod execution ${event.type === "runpod.timeout" ? "timed out" : "failed"
            }`
          );
          if (event.job_id) {
            updateJobInHistory(chatId, event.job_id, {
              status: "failed",
              error: event.error,
              finishedAt: new Date(),
            });
          }
          setGenerating(chatId, false);

          // Handle editor error reporting
          const errorMsg = event.error || "Runpod execution failed";
          const lineMatch = errorMsg.match(/line (\d+)/i);
          const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : null;

          useEditorStore.getState().setError(errorMsg, errorLine);
          useEditorStore.getState().setCompiling(false);
          break;
        case "error":
          setError(event.error || "An error occurred during Runpod execution");
          setGenerating(chatId, false);
          useEditorStore.getState().setError(event.error || "Execution error");
          useEditorStore.getState().setCompiling(false);
          break;
      }
    },
    [
      chatId,
      onMessageReceived,
      onShapeGenerated,
      setGenerating,
      updateJobInHistory,
    ]
  );

  useChatSocket({
    chatId: chatId,
    onEvent: handleSocketEvent,
  });

  const sendingRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Prevent duplicate sends
      if (sendingRef.current) {
        console.warn(
          "[useChat]  Message send already in progress, ignoring duplicate request"
        );
        return;
      }

      sendingRef.current = true;
      console.log(
        "[useChat]  Sending message:",
        content.substring(0, 50) + "..."
      );

      setError(null);
      setLastUserMessage(content.trim());

      try {
        let targetId = chatId;
        const { setActiveConversationId, setConversations, conversations } =
          useChatStore.getState();

        if (!targetId) {
          console.log("[useChat] Creating new chat on first message...");
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

          // Wait a bit for WebSocket to initiate connection
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        setGenerating(targetId, true);

        let jobId: string | undefined;
        try {
          const sessionId = chatService.getCurrentSessionId();
          if (sessionId) {
            const job = await jobService.createJob({
              session_id: sessionId,
              prompt: content.trim(),
              output_format: "glb",
            });
            jobId = job.id;

            addJobToHistory(targetId, {
              ...job,
              status: "queued",
              createdAt: new Date(),
            });
          }
        } catch (jobErr) {
          console.warn(
            "Failed to create job record, proceeding with volatile generation:",
            jobErr
          );
        }

        await chatService.startRunpodRequest(
          targetId,
          content.trim(),
          "process_requirements",
          {
            job_id: jobId,
            source: "curfd-chat",
          }
        );
      } catch (err) {
        console.error("[useChat] Failed to send message:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        if (chatId) setGenerating(chatId, false);
      } finally {
        setTimeout(() => {
          sendingRef.current = false;
        }, 1000);
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
          finalContent += `\n\n|||JSON_DATA|||${JSON.stringify({
            model_id: shapeData.id,
            model_name: shapeData.name,
            description: shapeData.description,
            sdf_url: shapeData.sdfUrl,
            yaml_url: shapeData.yamlUrl,
            scad_code: shapeData.scadCode,
            parts: shapeData.geometry.parts,
            assets: shapeData.assets,
            parameters:
              (shapeData.geometry as any).physics ||
              (shapeData.specification as any)?.parameters ||
              {},
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
