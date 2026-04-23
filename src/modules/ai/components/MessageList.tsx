import { formatTime } from "@/utils/formatters";
import { Bot, User, ArrowRight, FileCode2, RefreshCw, Box } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { Message } from "../types/chat.type";
import { MODEL_OPTIONS, type ModelOption } from "./ModelSelector";
import type { ModelOverride } from "../hooks/useChat";
import { ImageSearchPicker } from "./ImageSearchPicker";

export type EditorPayloadType = "requirements" | "code";

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

  // Check for 3D model URL in message metadata or content
  const { modelUrl, stlUrl } = (() => {
    const meta = (message as any).metadata_json || (message as any).metadata;
    const output = meta?.output;
    const url = output?.uri || output?.model_url || output?.download_url
      || meta?.model_url || meta?.download_url;
    const stl = output?.stl_url || meta?.stl_url;
    if (url && /\.(glb|stl|obj)/i.test(url)) return { modelUrl: url, stlUrl: stl || null };
    if (typeof content === "string" && content.startsWith("{")) {
      try {
        const parsed = JSON.parse(content);
        const pUrl = parsed.uri || parsed.model_url || parsed.download_url;
        if (pUrl && /\.(glb|stl|obj)/i.test(pUrl)) return { modelUrl: pUrl, stlUrl: parsed.stl_url || null };
      } catch {}
    }
    return { modelUrl: null, stlUrl: null };
  })();

  if (modelUrl && message.role === "assistant") {
    return (
      <div className="space-y-2">
        <p className="break-words whitespace-pre-wrap text-sm text-neutral-600">3D model generated successfully</p>
        <Model3DCard modelUrl={modelUrl} stlUrl={stlUrl} onViewIn3D={onViewIn3D} onModifyMesh={onModifyMesh} />
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
  onViewIn3D?: (url: string) => void;
  onModifyMesh?: (meshUrl: string, modification: string) => void;
}> = ({ modelUrl, stlUrl, onViewIn3D, onModifyMesh }) => {
  const filename = modelUrl.split("/").pop() || "model.glb";
  const format = filename.split(".").pop()?.toUpperCase() || "GLB";
  const [showModify, setShowModify] = useState(false);
  const [modText, setModText] = useState("");

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
    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white mt-1 w-full max-w-[280px]">
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
            <p className="text-neutral-500">Click to load in viewer</p>
          </div>
        </div>
      </div>
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
          {stlUrl && (
            <a
              href={stlUrl}
              download
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-all"
            >
              STL
            </a>
          )}
          <button
            onClick={() => onViewIn3D?.(modelUrl)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-400/40 transition-all group"
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
