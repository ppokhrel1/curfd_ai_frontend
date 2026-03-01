import { formatTime } from "@/utils/formatters";
import { Bot, User, ArrowRight, FileCode2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { Message } from "../types/chat.type";

export type EditorPayloadType = "requirements" | "code";

interface MessageListProps {
  messages: Message[];
  onOpenInEditor?: (content: string, type: EditorPayloadType) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onOpenInEditor }) => {
  return (
    <div className="space-y-4 w-full pb-2">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          message={message}
          isLatest={index === messages.length - 1}
          onOpenInEditor={onOpenInEditor}
        />
      ))}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
  onOpenInEditor?: (content: string, type: EditorPayloadType) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLatest, onOpenInEditor }) => {
  const isUser = message.role === "user";
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (!isLatest || !onOpenInEditor || hasAutoOpened.current) return;

    let rawData = message.shapeData?.scadCode || "";

    if (!rawData) {
      const cleanContent = (message.content || "").split("|||JSON_DATA|||")[0].trim();
      const parts = cleanContent.split(/(```[\s\S]*?```)/g).filter(Boolean);
      const codeBlocks = parts.filter(p => p.startsWith("```") && p.endsWith("```"));

      if (codeBlocks.length > 0) {
        const lastBlock = codeBlocks[codeBlocks.length - 1];
        const lines = lastBlock.split('\n');
        lines.shift();
        if (lines[lines.length - 1]?.trim() === "```") lines.pop();
        rawData = lines.join('\n').trim();
      }
    }

    if (rawData.length > 150 && window.innerWidth >= 1024) {
      hasAutoOpened.current = true;
      setTimeout(() => {
        onOpenInEditor(rawData, "code");
      }, 100);
    }
  }, [message, isLatest, onOpenInEditor]);

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
            <span className="break-words whitespace-pre-wrap">{message.content}</span>
          ) : (
            <TypewriterContent message={message} onOpenInEditor={onOpenInEditor} />
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
}> = ({ message, onOpenInEditor }) => {
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
      setDisplayed(clean.slice(0, i));
      i += 3;
      if (i > clean.length) { clearInterval(iv); setDone(true); }
    }, 8);
    return () => clearInterval(iv);
  }, [message.content, message.shapeData]);

  return <FormattedContent message={message} content={displayed} onOpenInEditor={onOpenInEditor} />;
};

// ── Content renderer ──────────────────────────────────────────────────────────

const FormattedContent: React.FC<{
  message: Message;
  content: string;
  onOpenInEditor?: (c: string, t: EditorPayloadType) => void;
}> = ({ message, content, onOpenInEditor }) => {
  // Shape data path: show model card directly
  if (message.shapeData?.scadCode) {
    return (
      <div className="space-y-2">
        <p className="break-words whitespace-pre-wrap">{content}</p>
        <ModelCard code={message.shapeData.scadCode} onOpenInEditor={onOpenInEditor} />
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
}> = ({ code, onOpenInEditor }) => {
  const lines = code.split('\n');
  const lineCount = lines.length;
  // Count tunable variables (skip $fn, $fa, $fs, eps)
  const paramCount = (code.match(/^\s*(?!\$|eps)([a-zA-Z_]\w*)\s*=\s*[-\d.]+\s*;/gm) || []).length;
  const preview = lines.slice(0, 7).join('\n');

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-700/50 bg-neutral-950 mt-1 w-full max-w-[280px]">
      {/* Title bar — macOS-style dots */}
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
          {paramCount > 0 && <><span className="text-neutral-700">·</span><span>{paramCount}⚙</span></>}
        </div>
      </div>

      {/* Code preview */}
      <pre className="px-3 py-2.5 text-[10.5px] font-mono text-neutral-500 leading-[1.55] overflow-hidden select-none">
        <code>{preview}</code>
        {lineCount > 7 && (
          <span className="block text-neutral-700 mt-0.5">··· {lineCount - 7} more lines</span>
        )}
      </pre>

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-800/60 bg-neutral-900/40">
        <span className="text-[10px] text-neutral-700 font-mono">OpenSCAD</span>
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
