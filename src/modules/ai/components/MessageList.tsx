import { formatTime } from "@/utils/formatters";
import { Bot, User, ArrowRight, FileCode2, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { Message } from "../types/chat.type";
import { MODEL_OPTIONS, type ModelOption } from "./ModelSelector";
import type { ModelOverride } from "../hooks/useChat";

export type EditorPayloadType = "requirements" | "code";

interface MessageListProps {
  messages: Message[];
  onOpenInEditor?: (content: string, type: EditorPayloadType) => void;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onOpenInEditor, onRegenerate }) => {
  return (
    <div className="space-y-4 w-full pb-2">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          message={message}
          onOpenInEditor={onOpenInEditor}
          onRegenerate={onRegenerate}
        />
      ))}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  onOpenInEditor?: (content: string, type: EditorPayloadType) => void;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenInEditor, onRegenerate }) => {
  const isUser = message.role === "user";
  // Auto-open is handled by ChatInterface's AUTO-LOAD EFFECT +
  // useActiveConversationSync handles compilation — no duplicate here.

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-1 duration-200 w-full`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
        isUser
          ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm shadow-green-500/20"
          : "bg-neutral-800 border border-neutral-700"
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-green-400" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex-1 min-w-0 max-w-[88%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed w-fit max-w-full ${
          isUser
            ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-sm shadow-sm"
            : "bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-tl-sm"
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
            <TypewriterContent message={message} onOpenInEditor={onOpenInEditor} onRegenerate={onRegenerate} />
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
}> = ({ message, onOpenInEditor, onRegenerate }) => {
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

  return <FormattedContent message={message} content={displayed} onOpenInEditor={onOpenInEditor} onRegenerate={onRegenerate} />;
};

// ── Content renderer ──────────────────────────────────────────────────────────

const FormattedContent: React.FC<{
  message: Message;
  content: string;
  onOpenInEditor?: (c: string, t: EditorPayloadType) => void;
  onRegenerate?: (messageId: string, modelOverride: ModelOverride) => void;
}> = ({ message, content, onOpenInEditor, onRegenerate }) => {
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
            <pre key={i} className="px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto">
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
    <div className="rounded-xl overflow-hidden border border-neutral-700/50 bg-neutral-950 mt-1 w-full max-w-[280px]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/80 border-b border-neutral-800">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-600" />
          <span className="w-2 h-2 rounded-full bg-neutral-600" />
          <span className="w-2 h-2 rounded-full bg-green-500/80" />
        </div>
        <FileCode2 className="w-3 h-3 text-neutral-500 ml-1" />
        <span className="text-[11px] font-mono text-neutral-400 flex-1 truncate">model.scad</span>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-mono flex-shrink-0">
          <span>{lineCount}L</span>
          {paramCount > 0 && <><span className="text-neutral-700">·</span><span>{paramCount}P</span></>}
        </div>
      </div>

      {/* Code preview */}
      <pre className="px-3 py-2.5 text-[10.5px] font-mono text-neutral-500 leading-[1.55] overflow-hidden select-none">
        <code>{preview}</code>
        {lineCount > 7 && (
          <span className="block text-neutral-700 mt-0.5">... {lineCount - 7} more lines</span>
        )}
      </pre>

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-800/60 bg-neutral-900/40">
        <div>
          {messageId && onRegenerate ? (
            <>
              <button
                ref={btnRef}
                onClick={togglePicker}
                className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
                title="Regenerate with different model"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regen</span>
              </button>
              {showModelPicker && (
                <div
                  ref={dropdownRef}
                  className="fixed w-52 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl overflow-hidden z-[100]"
                  style={{ top: pickerPos.top, left: pickerPos.left }}
                >
                  <div className="px-3 py-1.5 text-[10px] text-neutral-500 border-b border-neutral-800">
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
                      className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-neutral-800 transition-colors"
                    >
                      <div className="font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <span className="text-[10px] text-neutral-700 font-mono">OpenSCAD</span>
          )}
        </div>
        <button
          onClick={() => onOpenInEditor?.(code, "code")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-400/40 transition-all group"
        >
          Open in Editor
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// ── Inline markdown ───────────────────────────────────────────────────────────

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i} className="italic text-neutral-300">{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-green-300 border border-neutral-700">{p.slice(1, -1)}</code>;
    return p;
  });
};
