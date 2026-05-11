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
import { useAssemblyStore } from "@/modules/viewer/stores/assemblyStore";
import { encryptedApi as api } from "@/lib/api/encryptedClient";

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

export interface ModelOverride {
  provider: string;
  model: string;
  thinking: boolean;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, images?: File[], modelOverride?: ModelOverride) => Promise<void>;
  sendSystemMessage: (
    content: string,
    shapeData?: GeneratedShape
  ) => Promise<void>;
  sendImageSelection: (requestId: string, imageUrl: string, prompt: string) => void;
  sendCustomImageGeneration: (requestId: string, prompt: string) => void;
  sendEditCandidate: (requestId: string, imageUrl: string, editPrompt: string) => void;
  sendMeshModification: (meshUrl: string, modification: string) => void;
  generateModel: (requirements: any) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  regenerateWithModel: (assistantMessageId: string, modelOverride: ModelOverride) => Promise<void>;
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
    addJobToHistory,
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
      console.log("[useChat] handleJobCompletion:", { type: event.type, action: event.action, status: event.status, hasOutput: !!event.output, outputKeys: event.output ? Object.keys(event.output) : [], parts: event.output?.parts?.length || event.output?.output?.parts?.length || 0 });
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

      // Handle modify_mesh completion
      if (event.action === "modify_mesh" && event.status === "COMPLETED") {
        const rawOutput = event.output?.output || event.output;
        const modifiedUrl = rawOutput?.download_url || rawOutput?.model_url;
        if (modifiedUrl && onShapeGenerated) {
          onShapeGenerated({
            id: `modified-${Date.now()}`,
            type: "generic" as any,
            name: "Modified 3D Model",
            description: rawOutput?.operation?.description || "Mesh modification applied",
            hasSimulation: false,
            sdfUrl: modifiedUrl,
            geometry: { parts: [], metadata: { totalVertices: 0, fileSize: 0 } },
            createdAt: new Date(),
          }, chatId);
        }
        setGenerating(chatId, false);
        return;
      }

      // Poll for assets if action is 'generate_scad' or 'image_to_3d'
      if ((event.action === "generate_scad" || event.action === "image_to_3d") && event.status === "COMPLETED") {
        if (jobId) {
          updateJobInHistory(chatId, jobId, {
            status: "succeeded",
            finishedAt: new Date(),
          });

          try {
            // For image_to_3d, extract model URL + parts directly from output
            if (event.action === "image_to_3d" && event.output) {
              const rawOutput = event.output?.output || event.output;
              const modelUrl = rawOutput.model_url || rawOutput.download_url;
              const texturedUrl: string | undefined = rawOutput.textured_url;
              // When the worker produced a textured GLB, prefer it as the
              // auto-loaded mesh — the user asked for a textured model and
              // expects to see colour/UV-mapped surfaces, not the raw bake.
              // The untextured URL is still kept around (passed via the
              // shape's `assets` and the message's metadata) so the model
              // card can offer a "View untextured" option if needed.
              const primaryUrl = texturedUrl || modelUrl;

              if (primaryUrl && onShapeGenerated) {
                // Extract segmented parts if the worker returned them. Same
                // textured-first logic for parts: a textured part URL wins
                // over the bare-mesh URL.
                const rawParts: any[] = rawOutput.parts || [];
                const parts = rawParts.map((p: any, i: number) => ({
                  id: p.name || `part-${i}`,
                  name: p.name || `Part ${i + 1}`,
                  category: "mesh",
                  role: p.name || "part",
                  mesh_file: p.textured_url || p.mesh_url || p.url,
                }));
                const partAssets = rawParts
                  .filter((p: any) => p.textured_url || p.mesh_url || p.url)
                  .map((p: any) => ({
                    filename: `${p.name || "part"}.glb`,
                    url: p.textured_url || p.mesh_url || p.url,
                  }));

                const shape: GeneratedShape = {
                  id: `img3d-${Date.now()}`,
                  type: "generic" as any,
                  name: "AI Generated 3D Model",
                  description: texturedUrl
                    ? `Generated from image · textured${parts.length ? ` · ${parts.length} parts` : ""}`
                    : `Generated from image${parts.length ? ` · ${parts.length} parts` : ""}`,
                  hasSimulation: false,
                  sdfUrl: primaryUrl,
                  assets: partAssets.length > 0 ? partAssets : undefined,
                  geometry: {
                    parts,
                    metadata: { totalVertices: 0, fileSize: 0 },
                  },
                  createdAt: new Date(),
                };
                onShapeGenerated(shape, chatId);

                // Auto-register of segmented parts to assemblyStore is
                // done in Model3DCard's mount effect (MessageList.tsx),
                // not here. That single source of truth covers both
                // fresh websocket events AND historical messages
                // re-rendering after page reload — eliminating the race
                // that would otherwise duplicate parts when both paths
                // dispatched concurrently.
              }
            } else {
              // Standard generate_scad asset polling
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
            }
          } catch (err) {
            console.error("[useChat] Failed to load assets:", err);
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

  // Apply a picker candidate event (pending / ready / error) to chat
  // store. Same logic for WS events and REST recovery polls — the
  // backend's `_cache_picker_result` stashes the exact payload it
  // would have WS-sent, so we just feed it through one path.
  //
  // Robust against the message having been wiped between submit and
  // apply (which can happen if useConversations re-syncs from the
  // server and the picker message — a client-only artifact — gets
  // dropped). When that happens we re-add a minimal message carrying
  // the candidate so the picker can pick up where it left off.
  const applyPickerEvent = useCallback(
    (event: any) => {
      if (!chatId || !event?.request_id) {
        console.warn("[picker apply] missing chatId or request_id", { chatId, event });
        return;
      }
      const msgId = `img-search-${event.request_id}`;
      const store = useChatStore.getState();
      const conversation = store.conversations.find((c) => c.id === chatId);
      let existing = conversation?.messages.find((m) => m.id === msgId);

      if (!existing) {
        console.warn(
          `[picker apply] message ${msgId} not found in chat ${chatId} — ` +
          `${conversation?.messages.length ?? 0} messages in store; ` +
          `re-adding minimal picker shell so the candidate can render`
        );
        // Recreate a stub message. We don't have the original `image_urls`
        // or `search_query`, but the picker only needs `candidate` /
        // `candidatePending` / `candidateError` to render the REVIEW step.
        const stub: any = {
          id: msgId,
          role: "assistant",
          content: "Generated image:",
          timestamp: new Date(),
          imageSearchPayload: {
            image_urls: [],
            search_query: "",
            request_id: event.request_id,
            prompt: event.prompt || "",
          },
        };
        store.addMessage(chatId, stub);
        const after = useChatStore
          .getState()
          .conversations.find((c) => c.id === chatId);
        existing = after?.messages.find((m) => m.id === msgId);
        if (!existing) {
          console.error(`[picker apply] failed to re-add ${msgId} — giving up`);
          return;
        }
      }
      if (!existing.imageSearchPayload) {
        // Message exists but lost its picker payload (chat history reload?
        // store rehydration?). Reconstruct a minimal payload from the event
        // so the picker can still render the candidate.
        console.warn(
          `[picker apply] ${msgId} has no imageSearchPayload — rebuilding from event`
        );
        store.updateMessage(chatId, msgId, {
          imageSearchPayload: {
            image_urls: [],
            search_query: "",
            request_id: event.request_id,
            prompt: event.prompt || "",
          } as any,
        });
        const conv2 = useChatStore
          .getState()
          .conversations.find((c) => c.id === chatId);
        const fresh = conv2?.messages.find((m) => m.id === msgId);
        if (!fresh?.imageSearchPayload) return;
        (existing as any).imageSearchPayload = fresh.imageSearchPayload;
      }

      let nextPayload = { ...existing.imageSearchPayload };
      if (event.type === "image_to_3d.candidate_pending") {
        nextPayload.candidatePending =
          event.action === "edit" ? "edit" : "generate";
        nextPayload.candidateError = undefined;
      } else if (event.type === "image_to_3d.candidate_ready") {
        nextPayload = {
          ...nextPayload,
          candidate: {
            url: event.display_url || "",
            runpod_url: event.runpod_url,
            source:
              (event.source as any) ||
              (existing.imageSearchPayload.candidate?.source ?? "ai_generated"),
            prompt: event.prompt,
          },
          candidatePending: undefined,
          candidateError: undefined,
        };
      } else if (event.type === "image_to_3d.candidate_error") {
        nextPayload.candidatePending = undefined;
        nextPayload.candidateError =
          (typeof event.message === "string" ? event.message : undefined) ||
          "Could not generate that image. Try rephrasing.";
      } else {
        return;
      }
      useChatStore
        .getState()
        .updateMessage(chatId, msgId, { imageSearchPayload: nextPayload });
    },
    [chatId]
  );

  // REST recovery for picker candidates when the WebSocket drops mid-
  // request. The backend caches the resolved candidate payload keyed by
  // request_id; we poll for it with backoff. Stops early as soon as
  // the WS delivers (chat store already has a candidate or error).
  const pickerPollsRef = useRef<Set<string>>(new Set());
  const pollPickerCandidate = useCallback(
    (requestId: string) => {
      if (!chatId || !requestId) {
        console.warn("[picker recovery] skipped — missing chatId or requestId", {
          chatId,
          requestId,
        });
        return;
      }
      if (pickerPollsRef.current.has(requestId)) {
        console.log(`[picker recovery] poll for ${requestId} already running`);
        return;
      }
      pickerPollsRef.current.add(requestId);
      console.log(`[picker recovery] starting poll for ${requestId}`);

      // Backoff schedule. The first two ticks cover the typical Gemini
      // call (~5-8s); later ticks survive longer outages (server reload
      // mid-edit, slow networks). Total wall time ~3 min, then give up.
      const delays = [2000, 3000, 4000, 5000, 7000, 10000, 15000, 20000, 30000, 45000, 45000];

      (async () => {
        try {
          let tick = 0;
          for (const delay of delays) {
            tick += 1;
            await new Promise((r) => setTimeout(r, delay));
            // Already resolved (WS got there first, or another poll)?
            const conv = useChatStore
              .getState()
              .conversations.find((c) => c.id === chatId);
            const msg = conv?.messages.find(
              (m) => m.id === `img-search-${requestId}`
            );
            const p = msg?.imageSearchPayload;
            if (p?.candidate?.url || p?.candidateError) {
              console.log(
                `[picker recovery] tick ${tick}: already resolved via WS — stopping`
              );
              return;
            }

            try {
              const { data } = await api.get<{
                status: "pending" | "found";
                payload?: any;
              }>(`/picker/candidate/${requestId}`);
              console.log(
                `[picker recovery] tick ${tick} (after ${delay}ms): status=${data?.status}`
              );
              if (data?.status === "found" && data.payload) {
                console.log(
                  `[picker recovery] recovered candidate via REST — applying`,
                  data.payload
                );
                applyPickerEvent(data.payload);
                return;
              }
            } catch (err) {
              // Network blips during poll are expected — keep trying.
              console.warn(`[picker recovery] tick ${tick} poll failed:`, err);
            }
          }
          console.warn(
            `[picker recovery] gave up after ${delays.length} ticks for ${requestId}`
          );
        } finally {
          pickerPollsRef.current.delete(requestId);
        }
      })();
    },
    [chatId, applyPickerEvent]
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
          {
            const errStr = typeof event.error === "string"
              ? event.error
              : event.error
              ? JSON.stringify(event.error)
              : `Runpod execution ${event.type}`;
            setError(errStr);
            if (event.job_id) {
              updateJobInHistory(chatId, event.job_id, {
                status: "failed",
                error: errStr,
                finishedAt: new Date(),
              });
            }
            setGenerating(chatId, false);
          }
          break;
        // ── Image-to-3D events ──
        case "image_to_3d.started":
        case "image_to_3d.queued":
          if (!chatId) break;
          setGenerating(chatId, true, "Generating 3D model from image...");
          break;
        case "image_to_3d.image_options":
          if (!chatId || !event.image_urls || !event.request_id) break;
          {
            const { image_urls, search_query, request_id, prompt } = event;
            const msg: Message = {
              id: `img-search-${request_id}`,
              role: "assistant",
              content: `I found ${image_urls.length} images for "${search_query}". Pick one to generate your 3D model:`,
              timestamp: new Date(),
              imageSearchPayload: {
                image_urls,
                search_query: search_query || "",
                request_id,
                prompt: prompt || "",
              },
            };
            useChatStore.getState().addMessage(chatId, msg);
          }
          break;
        case "image_to_3d.error":
          if (!chatId) break;
          {
            const errStr = typeof event.error === "string"
              ? event.error
              : typeof event.message === "string"
              ? event.message
              : event.error || event.message
              ? JSON.stringify(event.error || event.message)
              : "Image-to-3D generation failed";
            setError(errStr);
          }
          setGenerating(chatId, false);
          break;
        // ── Picker candidate flow (nano banana inside the picker) ──
        // The picker sends prompts back; we update its imageSearchPayload
        // so React re-renders the picker into the right step. None of these
        // touch the global isGenerating state — the picker has its own
        // local pending UI.
        case "image_to_3d.candidate_pending":
        case "image_to_3d.candidate_ready":
        case "image_to_3d.candidate_error": {
          applyPickerEvent(event);
          break;
        }
        case "image.generated":
          // Gemini generated or edited an image — surface as an inline
          // assistant message with an attached image URL.
          if (!chatId || !event.url) break;
          {
            const promptText = (event.prompt || "").trim();
            const action = event.tool === "edit_image" ? "Edited" : "Generated";
            const caption = promptText
              ? `${action}: ${promptText}`
              : `${action} image`;
            // Use the server-side message id when present so reloading the
            // chat (which fetches from the messages table) won't duplicate
            // this row alongside a fresh-from-DB copy with the real id.
            const persistedId = (event as any).message_id as string | undefined;
            useChatStore.getState().addMessage(chatId, {
              id: persistedId || `gen-img-${Date.now()}`,
              role: "assistant",
              content: caption,
              timestamp: new Date(),
              imageUrls: [event.url],
            });
            // Re-enable the chat input as soon as the picture lands. The
            // agent may keep streaming text after this (a final
            // acknowledgement, etc.) but the user has what they asked for
            // and shouldn't have to wait on the trailing text to type the
            // next message. If a later tool call needs the input blocked
            // again the openscad.tool handler will flip it back.
            setGenerating(chatId, false);
            sendingRef.current = false;
          }
          break;

        case "mesh_modification.queued":
          if (!chatId) break;
          setGenerating(chatId, true, "Modifying mesh...");
          break;
        case "mesh_modification.error":
          if (!chatId) break;
          {
            const errStr = typeof (event as any).message === "string"
              ? (event as any).message
              : "Mesh modification failed";
            setError(errStr);
          }
          setGenerating(chatId, false);
          break;

        case "error":
          if (!chatId) break;
          setError(typeof event.error === "string" ? event.error : event.error ? JSON.stringify(event.error) : "An error occurred");
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
    async (content: string, images?: File[], modelOverride?: ModelOverride) => {
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

        // Use model override if provided, otherwise use store selection
        const provider = modelOverride?.provider ?? useChatStore.getState().selectedProvider;
        const model = modelOverride?.model ?? useChatStore.getState().selectedModel;
        const thinking = modelOverride?.thinking ?? useChatStore.getState().selectedThinking;
        const codeLang = useChatStore.getState().selectedLanguage;

        // Image-to-3D mode: route through RunPod instead of the agent
        if (codeLang === "image_to_3d") {
          const { imageTo3dService } = await import("@/modules/ai/services/imageTo3dService");
          let imageUrlForRunpod = "";
          if (imagePayload?.length) {
            imageUrlForRunpod = `data:${imagePayload[0].media_type};base64,${imagePayload[0].data}`;
          }
          const promptText = content.trim();
          if (!imageUrlForRunpod && !promptText) {
            setError("Provide a prompt or attach an image for 3D generation");
            setGenerating(targetId, false);
            sendingRef.current = false;
            return;
          }
          try {
            useChatStore.getState().updateMessage(targetId, streamMsgId, {
              content: imageUrlForRunpod
                ? "Submitting image to 3D generation..."
                : "Searching for reference images...",
            });
            const response = await imageTo3dService.generate(targetId, {
              image_url: imageUrlForRunpod || undefined,
              prompt: promptText,
              output_format: "glb",
              skip_segmentation: useChatStore.getState().imageTo3DSkipSegmentation,
              with_texture: useChatStore.getState().imageTo3DWithTexture,
            });

            // Backend returned image search results for user to pick from
            if (response.status === "image_selection_required" && "image_urls" in response) {
              const searchResp = response as import("@/modules/ai/services/imageTo3dService").ImageSearchResponse;
              useChatStore.getState().updateMessage(targetId, streamMsgId, {
                content: `I found ${searchResp.image_urls.length} images for "${searchResp.search_query}". Pick one to generate your 3D model:`,
                imageSearchPayload: {
                  image_urls: searchResp.image_urls,
                  search_query: searchResp.search_query,
                  request_id: searchResp.request_id,
                  prompt: searchResp.prompt,
                },
              });
              setGenerating(targetId, false);
              sendingRef.current = false;
              return;
            }

            const genResp = response as import("@/modules/ai/services/imageTo3dService").ImageTo3DResponse;
            useChatStore.getState().updateMessage(targetId, streamMsgId, {
              content: `3D generation in progress (${genResp.runpod_id || "processing"})...`,
            });
            addJobToHistory(targetId, {
              id: genResp.runpod_id || `img3d-${Date.now()}`,
              prompt: promptText,
              output_format: "glb",
              status: "running",
              createdAt: new Date(),
              startedAt: new Date(),
            });
            setGenerating(targetId, true, "Generating 3D model...");
            sendingRef.current = false;
          } catch (err: any) {
            useChatStore.getState().updateMessage(targetId, streamMsgId, {
              content: `3D generation failed: ${err?.message || "Unknown error"}`,
            });
            setGenerating(targetId, false);
            sendingRef.current = false;
          }
          return;
        }

        const messageContent = content.trim() || (imagePayload?.length ? "Analyze the attached image(s) and generate OpenSCAD code." : "");

        // Try WebSocket first, fall back to SSE
        const wsSent = wsConnected && sendWs({
          type: "openscad.request",
          content: messageContent,
          images: imagePayload,
          options: {
            llm_provider: provider,
            llm_model: model,
            llm_thinking: thinking,
            code_language: codeLang,
          },
        });

        if (wsSent) {
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
            llm_provider: provider,
            llm_model: model,
            llm_thinking: thinking,
            code_language: useChatStore.getState().selectedLanguage,
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

  // --- Send Image Selection for Image-to-3D ---
  const sendImageSelection = useCallback(
    (requestId: string, imageUrl: string, prompt: string) => {
      if (!chatId) return;

      // Set generating state so user sees progress
      setGenerating(chatId, true, "Downloading selected image and starting 3D generation...");

      const skipSegmentation = useChatStore.getState().imageTo3DSkipSegmentation;
      const withTexture = useChatStore.getState().imageTo3DWithTexture;

      // Try WebSocket first
      if (wsConnected) {
        const sent = sendWs({
          type: "image_to_3d.image_selected",
          request_id: requestId,
          image_url: imageUrl,
          prompt,
          skip_segmentation: skipSegmentation,
          with_texture: withTexture,
        });
        if (sent) return;
      }

      // Fallback: call HTTP endpoint directly with the selected image URL
      console.warn("[useChat] WS unavailable, falling back to HTTP for image selection");
      (async () => {
        try {
          const { imageTo3dService } = await import("@/modules/ai/services/imageTo3dService");
          await imageTo3dService.generate(chatId, {
            image_url: imageUrl,
            prompt,
            output_format: "glb",
            skip_segmentation: skipSegmentation,
            with_texture: withTexture,
          });
        } catch (err: any) {
          console.error("[useChat] HTTP fallback for image selection failed:", err);
          setError(err?.response?.data?.detail || "Failed to start 3D generation");
          setGenerating(chatId, false);
        }
      })();
    },
    [chatId, sendWs, wsConnected, setGenerating, setError]
  );

  // --- Picker: generate a fresh candidate image with nano banana ---
  // Does NOT trigger RunPod. The backend returns the result via
  // image_to_3d.candidate_ready and the picker shows it for review. The
  // user must explicitly click "Use for 3D" to commit.
  //
  // We also kick off a REST recovery poll keyed by request_id — if the
  // WS drops between submit and response (server reload mid-task), the
  // poll finds the cached result and dispatches it as if it'd come
  // through the socket. Without this, the user sees a 30s timeout
  // even though the image already exists in R2 backend-side.
  const sendCustomImageGeneration = useCallback(
    (requestId: string, prompt: string) => {
      if (!chatId || !prompt.trim() || !requestId) return;
      // Always start the recovery poll — even if the WS is down right
      // now, an earlier identical submit may have made it to the backend
      // and the poll is the only path to discover that.
      pollPickerCandidate(requestId);
      if (!wsConnected) {
        setError("WebSocket disconnected — relying on REST recovery to deliver the image.");
        return;
      }
      sendWs({
        type: "image_to_3d.generate_custom",
        prompt,
        request_id: requestId,
      });
    },
    [chatId, sendWs, wsConnected, setError, pollPickerCandidate]
  );

  // --- Picker: refine the current candidate via Gemini edit ---
  const sendEditCandidate = useCallback(
    (requestId: string, imageUrl: string, editPrompt: string) => {
      if (!chatId || !editPrompt.trim() || !imageUrl || !requestId) return;
      if (!wsConnected) {
        setError("WebSocket disconnected — can't edit the candidate image.");
        return;
      }
      // Same reasoning as sendCustomImageGeneration: poll regardless of
      // WS state. The poll is the only recovery path if WS drops mid-edit.
      pollPickerCandidate(requestId);
      sendWs({
        type: "image_to_3d.edit_candidate",
        prompt: editPrompt,
        image_url: imageUrl,
        request_id: requestId,
      });
    },
    [chatId, sendWs, wsConnected, setError, pollPickerCandidate]
  );

  const sendMeshModification = useCallback(
    (meshUrl: string, modification: string) => {
      if (!chatId) {
        console.warn("[useChat] sendMeshModification: no chatId");
        setError("No active chat");
        return;
      }
      if (!wsConnected) {
        console.warn("[useChat] sendMeshModification: WS not connected");
        setError("WebSocket not connected. Try refreshing the page.");
        return;
      }
      console.log("[useChat] sendMeshModification:", { meshUrl, modification });
      const sent = sendWs({
        type: "mesh_modification.request",
        payload: { mesh_url: meshUrl, modification },
      });
      if (sent) {
        setGenerating(chatId, true, "Modifying mesh...");
      } else {
        setError("Failed to send mesh modification request");
      }
    },
    [chatId, wsConnected, sendWs, setGenerating, setError]
  );

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessage) {
      await sendMessage(lastUserMessage);
    }
  }, [lastUserMessage, sendMessage]);

  // --- 6. REGENERATE WITH DIFFERENT MODEL (in-place replacement) ---
  const regenerateWithModel = useCallback(
    async (assistantMessageId: string, modelOverride: ModelOverride) => {
      if (!chatId) return;
      if (sendingRef.current) return;

      const store = useChatStore.getState();
      const currentMessages = store.conversations.find(c => c.id === chatId)?.messages || [];

      // Find the user message that preceded this assistant message
      const assistantIdx = currentMessages.findIndex(m => m.id === assistantMessageId);
      if (assistantIdx <= 0) return;

      let userContent = "";
      for (let i = assistantIdx - 1; i >= 0; i--) {
        if (currentMessages[i].role === "user") {
          userContent = currentMessages[i].content || "";
          break;
        }
      }
      if (!userContent) return;

      sendingRef.current = true;
      setError(null);

      try {
        setGenerating(chatId, true, "Regenerating...");

        // Clear the existing assistant message in-place (reuse its ID)
        store.updateMessage(chatId, assistantMessageId, {
          content: "",
          shapeData: undefined,
          metadata: undefined,
        });

        // Set up refs so WebSocket handler streams into the existing message
        streamMsgIdRef.current = assistantMessageId;
        streamChatIdRef.current = chatId;
        streamedContentRef.current = "";

        const provider = modelOverride.provider;
        const model = modelOverride.model;
        const thinking = modelOverride.thinking ?? false;

        const wsSent = wsConnected && sendWs({
          type: "openscad.request",
          content: userContent,
          options: {
            llm_provider: provider,
            llm_model: model,
            llm_thinking: thinking,
            code_language: useChatStore.getState().selectedLanguage,
          },
        });

        if (wsSent) return;

        // Fallback: SSE streaming
        console.warn('[useChat] WebSocket not available for regen, falling back to SSE');
        streamMsgIdRef.current = null;
        streamChatIdRef.current = null;

        let streamedContent = '';
        await chatService.processRequirementsStream(
          chatId,
          userContent,
          (text: string) => {
            streamedContent += text;
            store.updateMessage(chatId, assistantMessageId, { content: streamedContent });
          },
          (data: any) => {
            const { openscad_code, parameters, model_type, message, id } = data;
            store.updateMessage(chatId, assistantMessageId, {
              id: id || assistantMessageId,
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
          (error: string) => { setError(error); },
          {
            llm_provider: provider,
            llm_model: model,
            llm_thinking: thinking,
            code_language: useChatStore.getState().selectedLanguage,
          },
        );
      } catch (err: any) {
        console.error('[useChat] regenerateWithModel failed:', err?.message);
        setError(err instanceof Error ? err.message : "Failed to regenerate");
      } finally {
        if (!streamMsgIdRef.current) {
          setGenerating(chatId, false);
          sendingRef.current = false;
        }
      }
    },
    [chatId, setGenerating, wsConnected, sendWs]
  );

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
    sendImageSelection,
    sendCustomImageGeneration,
    sendEditCandidate,
    sendMeshModification,
    generateModel,
    clearMessages,
    retryLastMessage,
    regenerateWithModel,
    setMessages: (newMessages: any) => {
      const msgs =
        typeof newMessages === "function" ? newMessages(messages) : newMessages;
        if (chatId) updateConversation(chatId, { messages: msgs });
    },
    activeChatId: chatId,
    isGeneratingGlobally: isGeneratingGlobally(),
  };
};