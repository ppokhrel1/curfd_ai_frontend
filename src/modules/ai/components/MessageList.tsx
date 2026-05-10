import { formatTime } from "@/utils/formatters";
import { Bot, User, ArrowRight, Download, FileCode2, RefreshCw, Box } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { Message } from "../types/chat.type";
import { MODEL_OPTIONS, type ModelOption } from "./ModelSelector";
import type { ModelOverride } from "../hooks/useChat";
import { ImageSearchPicker } from "./ImageSearchPicker";
import { proxifyUrl } from "@/lib/apiConfig";
import { STORAGE_KEYS } from "@/lib/constants";
import { useAssemblyStore } from "@/modules/viewer/stores/assemblyStore";

export type EditorPayloadType = "requirements" | "code";

/** Fetch a URL with auth token and trigger a browser file download.
 *  Refuses HTML/JSON responses for binary asset extensions — otherwise an
 *  error page would land on disk as `model.glb` and produce a confusing
 *  "UTF-8 decoding" failure when the user tries to open it. */
function downloadFile(url: string, filename: string) {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(async (resp) => {
      if (!resp.ok) {
        throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
      }
      const ct = (resp.headers.get("content-type") || "").toLowerCase();
      const isBinaryAsset = /\.(glb|stl|obj|gltf|step|stp|3mf)$/i.test(filename);
      if (isBinaryAsset && (ct.startsWith("text/html") || ct.startsWith("application/json"))) {
        const preview = (await resp.text()).slice(0, 200);
        throw new Error(`Server returned ${ct} instead of a binary asset: ${preview}`);
      }
      return resp.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.style.display = "none";
      // Some browsers (Firefox, older Chrome) ignore .click() on a detached
      // <a>. Attach it before clicking, then clean up after a tick — revoking
      // the object URL synchronously after click() races the browser's
      // deferred download start and silently aborts large downloads.
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    })
    .catch((err) => {
      console.error("Download failed:", err);
      alert(`Download failed: ${err.message || err}`);
    });
}

interface MessageListProps {
  messages: Message[];
  onOpenInEditor?: (content: string, type: EditorPayloadType) => void;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
  onViewIn3D?: (modelUrl: string) => void;
  onImageSelect?: (requestId: string, imageUrl: string, prompt: string) => void;
  onModifyMesh?: (meshUrl: string, modification: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onOpenInEditor, onRegenerate, onViewIn3D, onImageSelect, onModifyMesh }) => {
  return (
    <div className="space-y-4 w-full pb-2">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          message={message}
          onOpenInEditor={onOpenInEditor}
          onRegenerate={onRegenerate}
          onViewIn3D={onViewIn3D}
          onImageSelect={onImageSelect}
          onModifyMesh={onModifyMesh}
        />
      ))}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  onOpenInEditor?: (content: string, type: EditorPayloadType) => void;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
  onViewIn3D?: (modelUrl: string) => void;
  onImageSelect?: (requestId: string, imageUrl: string, prompt: string) => void;
  onModifyMesh?: (meshUrl: string, modification: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenInEditor, onRegenerate, onViewIn3D, onImageSelect, onModifyMesh }) => {
  const isUser = message.role === "user";
  // Auto-open is handled by ChatInterface's AUTO-LOAD EFFECT +
  // useActiveConversationSync handles compilation — no duplicate here.

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-1 duration-200 w-full`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
        isUser
          ? "bg-primary-500 shadow-sm shadow-primary-500/20"
          : "bg-neutral-100 border border-neutral-200"
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-primary-600" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex-1 min-w-0 max-w-[90%] sm:max-w-[88%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed w-fit max-w-full ${
          isUser
            ? "bg-primary-50 text-neutral-800 border border-primary-200 rounded-tr-sm shadow-sm"
            : "bg-white text-neutral-800 border border-neutral-200 rounded-tl-sm"
        }`}>
          {isUser ? (
            <div>
              {message.imageUrls && message.imageUrls.length > 0 && (
                <div className={`grid gap-1.5 mb-2 ${message.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {message.imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Attached ${i + 1}`}
                      className="rounded-lg max-h-[150px] w-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(url, '_blank')}
                      onError={(e) => {
                        // Persisted chat-image URLs from /tmp may 404 after the
                        // backend restarts (uploads dir wiped). Hide rather
                        // than render a broken-image icon for every old msg.
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}
              <span className="break-words whitespace-pre-wrap">{message.content}</span>
            </div>
          ) : (
            <TypewriterContent message={message} onOpenInEditor={onOpenInEditor} onRegenerate={onRegenerate} onViewIn3D={onViewIn3D} onImageSelect={onImageSelect} onModifyMesh={onModifyMesh} />
          )}
        </div>

        <span className="text-[10px] text-neutral-600 mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};

// ── Typewriter for AI messages ────────────────────────────────────────────────

const TypewriterContent: React.FC<{
  message: Message;
  onOpenInEditor?: (c: string, t: EditorPayloadType) => void;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
  onViewIn3D?: (modelUrl: string) => void;
  onImageSelect?: (requestId: string, imageUrl: string, prompt: string) => void;
  onModifyMesh?: (meshUrl: string, modification: string) => void;
}> = ({ message, onOpenInEditor, onRegenerate, onViewIn3D, onImageSelect, onModifyMesh }) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const clean = (message.content || "").split("|||JSON_DATA|||")[0].trim();
    // Skip animation for code-heavy or long messages
    if (message.shapeData || clean.includes("```") || clean.length > 250) {
      setDisplayed(clean);
      setDone(true);
      return;
    }
    let i = 0;
    const iv = setInterval(() => {
      i += 3;
      setDisplayed(clean.slice(0, i));
      if (i >= clean.length) { clearInterval(iv); setDone(true); }
    }, 8);
    return () => clearInterval(iv);
  }, [message.content, message.shapeData]);

  return <FormattedContent message={message} content={displayed} onOpenInEditor={onOpenInEditor} onRegenerate={onRegenerate} onViewIn3D={onViewIn3D} onImageSelect={onImageSelect} onModifyMesh={onModifyMesh} />;
};

// ── Content renderer ──────────────────────────────────────────────────────────

const FormattedContent: React.FC<{
  message: Message;
  content: string;
  onOpenInEditor?: (c: string, t: EditorPayloadType) => void;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
  onViewIn3D?: (modelUrl: string) => void;
  onImageSelect?: (requestId: string, imageUrl: string, prompt: string) => void;
  onModifyMesh?: (meshUrl: string, modification: string) => void;
}> = ({ message, content, onOpenInEditor, onRegenerate, onViewIn3D, onImageSelect, onModifyMesh }) => {
  // Handle image search results — text in bubble, picker below it (outside bubble)
  if (message.imageSearchPayload && message.role === "assistant") {
    return (
      <div>
        <p className="break-words whitespace-pre-wrap text-sm mb-1">{content}</p>
        <ImageSearchPicker
          payload={message.imageSearchPayload}
          onSelect={(imageUrl) => {
            if (onImageSelect) {
              onImageSelect(
                message.imageSearchPayload!.request_id,
                imageUrl,
                message.imageSearchPayload!.prompt
              );
            }
          }}
        />
      </div>
    );
  }

  // Check for 3D model URL + parts + textured variant in metadata or content.
  const { modelUrl, stlUrl, meshParts, texturedUrl } = (() => {
    const meta = (message as any).metadata_json || (message as any).metadata;
    const output = meta?.output;
    const url = output?.uri || output?.model_url || output?.download_url
      || meta?.model_url || meta?.download_url;
    const stl = output?.stl_url || meta?.stl_url;
    // Worker emits textured_url at top of output; backend's
    // _persist_image_to_3d_asset also stuffs it in metadata_json.
    const tex = output?.textured_url
      || output?.metadata_json?.textured_url
      || meta?.textured_url;
    const partsList = (output?.parts || meta?.parts) as
      | { name?: string; mesh_url?: string; url?: string }[]
      | undefined;
    if (url && /\.(glb|stl|obj)/i.test(url)) {
      return { modelUrl: url, stlUrl: stl || null, meshParts: partsList, texturedUrl: tex || null };
    }
    if (typeof content === "string" && content.startsWith("{")) {
      try {
        const parsed = JSON.parse(content);
        const pUrl = parsed.uri || parsed.model_url || parsed.download_url;
        if (pUrl && /\.(glb|stl|obj)/i.test(pUrl)) {
          return {
            modelUrl: pUrl,
            stlUrl: parsed.stl_url || null,
            meshParts: parsed.parts as typeof partsList,
            texturedUrl: parsed.textured_url || null,
          };
        }
      } catch {}
    }
    return { modelUrl: null, stlUrl: null, meshParts: undefined, texturedUrl: null };
  })();

  if (modelUrl && message.role === "assistant") {
    return (
      <div className="space-y-2">
        <p className="break-words whitespace-pre-wrap text-sm text-neutral-600">
          3D model generated successfully
          {meshParts && meshParts.length > 0 ? ` — ${meshParts.length} parts` : ""}
          {texturedUrl ? " · textured" : ""}
        </p>
        <Model3DCard
          modelUrl={modelUrl}
          stlUrl={stlUrl}
          parts={meshParts}
          texturedUrl={texturedUrl}
          onViewIn3D={onViewIn3D}
          onModifyMesh={onModifyMesh}
        />
      </div>
    );
  }

  // Shape data path: show model card directly
  if (message.shapeData?.scadCode) {
    return (
      <div className="space-y-2">
        <p className="break-words whitespace-pre-wrap">{content}</p>
        <ModelCard
          code={message.shapeData.scadCode}
          onOpenInEditor={onOpenInEditor}
          messageId={message.id}
          onRegenerate={onRegenerate}
        />
      </div>
    );
  }

  const clean = content.split("|||JSON_DATA|||")[0].trim();
  const parts = clean.split(/(```[\s\S]*?```)/g).filter(Boolean);

  return (
    <div className="space-y-2 w-full">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.split('\n');
          lines.shift();
          if (lines[lines.length - 1]?.trim() === "```") lines.pop();
          const raw = lines.join('\n').trim();

          if (raw.length > 150) {
            return <ModelCard key={i} code={raw} onOpenInEditor={onOpenInEditor} />;
          }
          return (
            <pre key={i} className="px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] font-mono text-neutral-600 overflow-x-auto">
              <code>{raw}</code>
            </pre>
          );
        }
        return (
          <p key={i} className="break-words whitespace-pre-wrap">
            {renderInline(part)}
          </p>
        );
      })}
    </div>
  );
};

// ── Model Card ────────────────────────────────────────────────────────────────

const ModelCard: React.FC<{
  code: string;
  onOpenInEditor?: (c: string, t: EditorPayloadType) => void;
  messageId?: string;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
}> = ({ code, onOpenInEditor, messageId, onRegenerate }) => {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lines = code.split('\n');
  const lineCount = lines.length;
  const paramCount = (code.match(/^\s*(?!\$|eps)([a-zA-Z_]\w*)\s*=\s*[-\d.]+\s*;/gm) || []).length;
  const preview = lines.slice(0, 7).join('\n');

  const togglePicker = () => {
    if (!showModelPicker && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowModelPicker(!showModelPicker);
  };

  useEffect(() => {
    if (!showModelPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelPicker]);

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white mt-1 w-full max-w-[280px]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
          <span className="w-2 h-2 rounded-full bg-primary-500" />
        </div>
        <FileCode2 className="w-3 h-3 text-neutral-500 ml-1" />
        <span className="text-[11px] font-mono text-neutral-500 flex-1 truncate">model.scad</span>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono flex-shrink-0">
          <span>{lineCount}L</span>
          {paramCount > 0 && <><span className="text-neutral-300">·</span><span>{paramCount}P</span></>}
        </div>
      </div>

      {/* Code preview */}
      <pre className="px-3 py-2.5 text-[10.5px] font-mono text-neutral-500 leading-[1.55] overflow-hidden select-none">
        <code>{preview}</code>
        {lineCount > 7 && (
          <span className="block text-neutral-400 mt-0.5">... {lineCount - 7} more lines</span>
        )}
      </pre>

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200 bg-neutral-50/50">
        <div>
          {messageId && onRegenerate ? (
            <>
              <button
                ref={btnRef}
                onClick={togglePicker}
                className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
                title="Regenerate with different model"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regen</span>
              </button>
              {showModelPicker && (
                <div
                  ref={dropdownRef}
                  className="fixed w-52 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden z-[100]"
                  style={{ top: pickerPos.top, left: pickerPos.left }}
                >
                  <div className="px-3 py-1.5 text-[10px] text-neutral-500 border-b border-neutral-200">
                    Regenerate with...
                  </div>
                  {MODEL_OPTIONS.map((opt) => (
                    <button
                      key={`${opt.provider}-${opt.model}-${opt.thinking}`}
                      onClick={() => {
                        setShowModelPicker(false);
                        onRegenerate(messageId, {
                          provider: opt.provider,
                          model: opt.model,
                          thinking: opt.thinking ?? false,
                        });
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <div className="font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <span className="text-[10px] text-neutral-400 font-mono">OpenSCAD</span>
          )}
        </div>
        <button
          onClick={() => onOpenInEditor?.(code, "code")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 hover:border-primary-300 transition-all group"
        >
          Open in Editor
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// ── Inline markdown ───────────────────────────────────────────────────────────

// ── 3D Model Card ────────────────────────────────────────────────────────────

const Model3DCard: React.FC<{
  modelUrl: string;
  stlUrl?: string | null;
  parts?: { name?: string; mesh_url?: string; url?: string }[];
  texturedUrl?: string | null;
  onViewIn3D?: (url: string) => void;
  onModifyMesh?: (meshUrl: string, modification: string) => void;
}> = ({ modelUrl, stlUrl, parts, texturedUrl, onViewIn3D, onModifyMesh }) => {
  const filename = modelUrl.split("/").pop() || "model.glb";
  const format = filename.split(".").pop()?.toUpperCase() || "GLB";
  const [showModify, setShowModify] = useState(false);
  const [modText, setModText] = useState("");
  const [showParts, setShowParts] = useState(false);

  // Selection sync: read selectedPartId from the assembly store so this list
  // shows which part is currently active in the 3D viewer, and click here
  // sets it (so AssemblyTree + viewer canvas highlight the same part).
  const selectedPartId = useAssemblyStore((s) => s.selectedPartId);
  const assemblyParts = useAssemblyStore((s) => s.parts);
  const partsWithUrl = (parts || []).filter((p) => p.mesh_url || p.url);

  // Auto-register parts to assemblyStore when this card mounts with parts
  // metadata. The websocket auto-register in useChat.ts only fires for
  // freshly-completed image_to_3d events; historical messages (chat
  // reloaded from backend, multi-tab, browser refresh) still need their
  // parts in the store so the viewer renders them as a multi-part
  // assembly instead of falling back to the combined model_url.
  useEffect(() => {
    if (partsWithUrl.length === 0) return;
    const store = useAssemblyStore.getState();
    const alreadyRegistered = partsWithUrl.every((p) => {
      const url = p.mesh_url || p.url;
      return store.parts.some((ap) => ap.shape.sdfUrl === url);
    });
    if (alreadyRegistered) return;

    // Replace the assembly with this card's parts so we don't accumulate
    // across messages.
    store.clearAssembly();
    import("@/modules/viewer/services/ModelImporter").then(
      ({ ModelImporter }) => {
        const importer = new ModelImporter();
        partsWithUrl.forEach((p, i) => {
          const partUrl = (p.mesh_url || p.url)!;
          const partShape = {
            id: `img3d-part-${Date.now()}-${i}`,
            type: "generic" as any,
            name: p.name || `Part ${i + 1}`,
            description: `Segmented part ${i + 1} of ${partsWithUrl.length}`,
            hasSimulation: false,
            sdfUrl: partUrl,
            geometry: { parts: [], metadata: { totalVertices: 0, fileSize: 0 } },
            createdAt: new Date(),
          };
          const id = useAssemblyStore.getState().addPart(partShape, `img3d-${Date.now()}`);
          // X-Part decomposition: every part should sit at the origin
          // so they reassemble into the original mesh. addPart's default
          // position offsets each part along X for an assembly-builder
          // workflow, which is wrong for our use case.
          useAssemblyStore.getState().updateTransform(id, [0, 0, 0], [0, 0, 0]);
          importer
            .importFromUrl(proxifyUrl(partUrl), undefined, undefined, [], `part_${i}.glb`)
            .then((imp) => {
              useAssemblyStore.getState().updatePartModel(id, imp.group);
            })
            .catch((err) => {
              console.warn(`[Model3DCard] failed to load part ${p.name || i}:`, err);
            });
        });
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partsWithUrl.map((p) => p.mesh_url || p.url).join("|")]);

  const handleModifySubmit = () => {
    const text = modText.trim();
    if (!text) return;
    console.log("[Model3DCard] Modify submit:", { modelUrl, text, hasHandler: !!onModifyMesh });
    if (!onModifyMesh) {
      console.warn("[Model3DCard] onModifyMesh is undefined");
      return;
    }
    onModifyMesh(modelUrl, text);
    setModText("");
    setShowModify(false);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white mt-1 w-full max-w-[340px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border-b border-neutral-200">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
          <span className="w-2 h-2 rounded-full bg-violet-500" />
        </div>
        <Box className="w-3 h-3 text-neutral-500 ml-1" />
        <span className="text-[11px] font-mono text-neutral-500 flex-1 truncate">{filename}</span>
        <span className="text-[10px] text-neutral-500 font-mono">{format}</span>
      </div>
      <div className="px-3 py-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-neutral-500">
          <Box className="w-8 h-8 text-violet-400" />
          <div className="text-[11px]">
            <p className="text-neutral-600 font-medium">3D Model Ready</p>
            <p className="text-neutral-500">
              {partsWithUrl.length > 0
                ? `${partsWithUrl.length} parts • click to load`
                : "Click to load in viewer"}
            </p>
          </div>
        </div>
      </div>
      {partsWithUrl.length > 0 && (
        <div className="border-t border-neutral-200">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowParts((v) => !v); }}
            className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <span>{showParts ? "Hide" : "Show"} {partsWithUrl.length} parts</span>
            <span className="text-neutral-400">{showParts ? "▲" : "▼"}</span>
          </button>
          {showParts && (
            <div className="px-3 pb-2 max-h-40 overflow-y-auto space-y-1">
              {/* Explicit "back to combined view" affordance — clicking
                  the same part twice also deselects, but that toggle
                  isn't discoverable. Only show this button when
                  something is actually selected. */}
              {selectedPartId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    useAssemblyStore.getState().selectPart(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-left text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 border border-dashed border-neutral-200 transition-colors"
                  title="Deselect — show the combined model"
                >
                  <Box className="w-3 h-3 shrink-0 text-neutral-400" />
                  <span className="truncate">← Show full object</span>
                </button>
              )}
              {partsWithUrl.map((p, i) => {
                const url = (p.mesh_url || p.url)!;
                const label = p.name || `Part ${i + 1}`;
                // Match this list entry to its assemblyStore counterpart by URL.
                const asmPart = assemblyParts.find((ap) => ap.shape.sdfUrl === url);
                const isActive = !!asmPart && asmPart.id === selectedPartId;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const store = useAssemblyStore.getState();
                      if (asmPart) {
                        // Already in the store — just toggle selection.
                        store.selectPart(isActive ? null : asmPart.id);
                        return;
                      }
                      // Not in store yet (historical chat / store cleared).
                      // Register the part synchronously, then kick off the
                      // model fetch in the background. Fire-and-forget so
                      // the popup doesn't reflow during await.
                      const newShape = {
                        id: `img3d-part-${Date.now()}-${i}`,
                        type: "generic" as any,
                        name: label,
                        description: `Segmented part ${i + 1} of ${partsWithUrl.length}`,
                        hasSimulation: false,
                        sdfUrl: url,
                        geometry: { parts: [], metadata: { totalVertices: 0, fileSize: 0 } },
                        createdAt: new Date(),
                      };
                      const newId = store.addPart(newShape, `img3d-${Date.now()}`);
                      store.selectPart(newId);
                      import("@/modules/viewer/services/ModelImporter")
                        .then(({ ModelImporter }) =>
                          new ModelImporter().importFromUrl(
                            proxifyUrl(url),
                            undefined,
                            undefined,
                            [],
                            `part_${i}.glb`
                          )
                        )
                        .then((imp) => {
                          useAssemblyStore.getState().updatePartModel(newId, imp.group);
                        })
                        .catch((err) => {
                          console.warn(`[Model3DCard] failed to load part ${label}:`, err);
                        });
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-left transition-colors ${
                      isActive
                        ? "bg-violet-100 text-violet-700"
                        : "text-neutral-600 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                    title={isActive ? "Click to deselect" : "Click to highlight in viewer"}
                  >
                    <Box className={`w-3 h-3 shrink-0 ${isActive ? "text-violet-600" : "text-violet-400"}`} />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {showModify && (
        <div className="px-3 pb-2 flex gap-1.5">
          <input
            autoFocus
            type="text"
            value={modText}
            onChange={(e) => setModText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleModifySubmit(); if (e.key === "Escape") setShowModify(false); }}
            placeholder="e.g. add two M3 holes on top"
            className="flex-1 text-[11px] px-2 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:border-violet-400"
          />
          <button
            onClick={handleModifySubmit}
            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-violet-500 text-white hover:bg-violet-600 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200 bg-neutral-50/50 gap-1">
        {onModifyMesh && (
          <button
            onClick={() => setShowModify((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 border border-transparent transition-all"
          >
            Modify
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => downloadFile(proxifyUrl(modelUrl), modelUrl.split("/").pop() || "model.glb")}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-all"
            title="Download GLB (for viewing)"
          >
            <Download className="w-3 h-3" />
            GLB
          </button>
          <button
            onClick={() => {
              const stl = stlUrl
                ? proxifyUrl(stlUrl)
                : `${import.meta.env.VITE_API_URL || "/api/v1"}/convert/stl?url=${encodeURIComponent(modelUrl)}`;
              const name = (modelUrl.split("/").pop() || "model").replace(/\.\w+$/, "") + ".stl";
              downloadFile(stl, name);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-all"
            title="Download STL (for 3D printing)"
          >
            <Download className="w-3 h-3" />
            STL
          </button>
          {texturedUrl && (
            <button
              onClick={() => onViewIn3D?.(texturedUrl)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-violet-500 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 hover:border-violet-500/50 transition-all whitespace-nowrap shrink-0"
              title="View the textured (UV-mapped) variant"
            >
              View textured
            </button>
          )}
          <button
            onClick={() => onViewIn3D?.(modelUrl)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-400/40 transition-all group whitespace-nowrap shrink-0"
          >
            View in 3D
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Inline markdown ──────────────────────────────────────────────────────────

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold text-neutral-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i} className="italic text-neutral-600">{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono bg-neutral-100 text-primary-700 border border-neutral-200">{p.slice(1, -1)}</code>;
    return p;
  });
};
