import { formatTime } from "@/utils/formatters";
import { Bot, User, Code2, Box } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { Message } from "../types/chat.type";

export type EditorPayloadType = "requirements" | "code";

interface MessageListProps {
  messages: Message[];
  onOpenInEditor?: (content: string, type: EditorPayloadType) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onOpenInEditor }) => {
  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-2">
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

    const cleanContent = message.content.split("|||JSON_DATA|||")[0].trim();
    const parts = cleanContent.split(/(```[\s\S]*?```)/g).filter(Boolean);
    const codeBlocks = parts.filter(p => p.startsWith("```") && p.endsWith("```"));
    
    let rawData = "";
    let isJson = false;

    if (codeBlocks.length > 0) {
      const lastBlock = codeBlocks[codeBlocks.length - 1];
      const lines = lastBlock.split('\n');
      const header = lines.shift() || ""; 
      if (lines[lines.length - 1]?.trim() === "```") lines.pop(); 
      
      rawData = lines.join('\n').trim();
      const lang = header.replace("```", "").trim().toLowerCase();
      
      if (lang === "json" || rawData.startsWith("{") || rawData.startsWith("[")) {
        try { 
          const parsed = JSON.parse(rawData); 
          const extractedCode = parsed.scadCode || parsed.metadata_json?.scadCode || parsed.metadata_json?.scad_code;
          if (extractedCode) {
            rawData = extractedCode;
            isJson = false; 
          } else {
            isJson = true; 
          }
        } catch (e) {
          isJson = lang === "json";
        }
      }
    } else if (cleanContent.startsWith("{") && cleanContent.endsWith("}")) {
       try { 
          const parsed = JSON.parse(cleanContent); 
          const extractedCode = parsed.scadCode || parsed.metadata_json?.scadCode || parsed.metadata_json?.scad_code;
          if (extractedCode) {
            rawData = extractedCode;
            isJson = false; 
          } else {
            rawData = cleanContent;
            isJson = true; 
          }
        } catch (e) {}
    }

    if (rawData.length > 150) {
      hasAutoOpened.current = true;
      setTimeout(() => {
        onOpenInEditor(rawData, isJson ? "requirements" : "code");
      }, 100);
    }
  }, [message.content, isLatest, onOpenInEditor]);

  return (
    <div className={`flex gap-3 sm:gap-4 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-300 w-full`}>
      <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${
          isUser
            ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400/30 shadow-lg shadow-green-500/20"
            : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-xl"
        }`}
      >
        {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />}
      </div>

      <div className={`flex-1 min-w-0 max-w-[90%] sm:max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <span className="text-[10px] font-bold text-green-500/80 mb-1 ml-1 uppercase tracking-wider">
            CURFD
          </span>
        )}
        <div className={`rounded-2xl px-4 py-3 transition-all duration-300 w-full ${
            isUser
              ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/10 ml-auto rounded-tr-none"
              : "bg-neutral-900/40 backdrop-blur-md text-neutral-100 border border-neutral-800/80 hover:border-neutral-700/80 rounded-tl-none"
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap">
            {isUser ? (
              <FormattedContent content={message.content} isUser={true} onOpenInEditor={onOpenInEditor} />
            ) : (
              <TypewriterEffect content={message.content} onOpenInEditor={onOpenInEditor} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 px-1">
          <p className="text-[10px] text-neutral-500 font-medium">
            {formatTime(message.timestamp)}
          </p>
          {!isUser && isLatest && (
            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

const TypewriterEffect: React.FC<{ content: string; onOpenInEditor?: (content: string, type: EditorPayloadType) => void }> = ({ content, onOpenInEditor }) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const cleanContent = content.split("|||JSON_DATA|||")[0].trim();
    const hasLargeCodeBlock = cleanContent.includes("```") && cleanContent.length > 200;
    const looksLikeLargeJson = (cleanContent.startsWith("{") || cleanContent.startsWith("[")) && cleanContent.length > 150;

    if (content.length < 5 || hasLargeCodeBlock || looksLikeLargeJson) {
      setDisplayedContent(cleanContent);
      setComplete(true);
      return;
    }

    if (complete) {
      setDisplayedContent(cleanContent);
      return;
    }

    let i = 0;
    setDisplayedContent("");
    
    const interval = setInterval(() => {
      setDisplayedContent(cleanContent.slice(0, i));
      i += 2; 
      if (i > cleanContent.length) {
        clearInterval(interval);
        setComplete(true);
      }
    }, 5);

    return () => clearInterval(interval);
  }, [content, complete]);

  return <FormattedContent content={displayedContent} isUser={false} onOpenInEditor={onOpenInEditor} />;
};

const FormattedContent: React.FC<{ content: string; isUser: boolean; onOpenInEditor?: (content: string, type: EditorPayloadType) => void }> = ({ 
  content, 
  isUser, 
  onOpenInEditor 
}) => {
  if (isUser) {
    return <div className="text-[13px] sm:text-[14px] leading-relaxed text-white">{content}</div>;
  }

  const cleanContent = content.split("|||JSON_DATA|||")[0].trim();
  
  // 1. Detect if the ENTIRE response is just an unformatted JSON block
  if ((cleanContent.startsWith("{") && cleanContent.endsWith("}")) || (cleanContent.startsWith("[") && cleanContent.endsWith("]"))) {
    if (cleanContent.length > 150) {
      let isJson = true;
      let rawData = cleanContent;
      try { 
        const parsed = JSON.parse(cleanContent); 
        const extractedCode = parsed.scadCode || parsed.metadata_json?.scadCode || parsed.metadata_json?.scad_code;
        if (extractedCode) {
          rawData = extractedCode;
          isJson = false; 
        }
      } catch (e) {}
      return <ClickablePayloadPill isRequirements={isJson} rawData={rawData} onOpenInEditor={onOpenInEditor} />;
    }
  }

  // 2. Otherwise, parse Markdown chunks so we keep any conversational text the AI sent
  const parts = cleanContent.split(/(```[\s\S]*?```)/g).filter(Boolean);

  return (
    <div className="space-y-3 w-full">
      {parts.map((part, index) => {
        // Handle Code Blocks
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.split('\n');
          const header = lines.shift() || ""; 
          if (lines[lines.length - 1]?.trim() === "```") lines.pop(); 
          
          let rawData = lines.join('\n').trim();
          const lang = header.replace("```", "").trim().toLowerCase();
          
          let isJson = lang === "json";
          
          if (lang === "json" || rawData.startsWith("{") || rawData.startsWith("[")) {
            try { 
              const parsed = JSON.parse(rawData); 
              const extractedCode = parsed.scadCode || parsed.metadata_json?.scadCode || parsed.metadata_json?.scad_code;
              if (extractedCode) {
                rawData = extractedCode;
                isJson = false; 
              } else {
                isJson = true;
              }
            } catch (e) {
              isJson = lang === "json";
            }
          }

          if (rawData.length > 150) {
            return <ClickablePayloadPill key={index} isRequirements={isJson} rawData={rawData} onOpenInEditor={onOpenInEditor} />;
          }

          return (
            <pre key={index} className="p-3 my-2 bg-neutral-950 rounded-lg overflow-x-auto border border-neutral-800 text-[12px] font-mono text-neutral-300">
              <code>{rawData}</code>
            </pre>
          );
        }

        // Handle Regular Text blocks
        const textLines = part.split("\n");
        return textLines.map((line, lineIndex) => {
          const uniqueKey = `${index}-${lineIndex}`;
          if (!line.trim()) return <div key={uniqueKey} className="h-1" />;
          
          if (line.startsWith("**") && line.endsWith("**")) {
            return <h3 key={uniqueKey} className="font-bold text-sm sm:text-[15px] pt-2 mb-1 text-green-400">{line.slice(2, -2)}</h3>;
          }

          if (/^[•\-✓✅*]/.test(line.trim())) {
            const text = line.trim().replace(/^[•\-✓✅*]/, '').trim();
            return (
              <div key={uniqueKey} className="flex gap-2 sm:gap-3 items-start pl-1 group">
                <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500/60 group-hover:bg-green-400" />
                <span className="flex-1 min-w-0 break-words opacity-90 group-hover:opacity-100 transition-opacity">
                  {renderInlineFormatting(text)}
                </span>
              </div>
            );
          }

          return <p key={uniqueKey} className="leading-relaxed opacity-95 break-words">{renderInlineFormatting(line)}</p>;
        });
      })}
    </div>
  );
};

// Extracted the reusable clickable UI pill
const ClickablePayloadPill: React.FC<{ isRequirements: boolean; rawData: string; onOpenInEditor?: (c: string, t: EditorPayloadType) => void }> = ({ isRequirements, rawData, onOpenInEditor }) => (
  <button
    onClick={() => onOpenInEditor?.(rawData, isRequirements ? "requirements" : "code")}
    className="w-full text-left p-3 my-2 bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all group"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <Code2 className="w-3 h-3" />
          {isRequirements ? "Specification Ready" : "Model Generated"}
        </p>
        <p className="text-[10px] text-neutral-500 group-hover:text-neutral-300 transition-colors">
          Click to load into editor
        </p>
      </div>
      <div className="p-1.5 rounded-lg bg-neutral-900 group-hover:bg-neutral-700 border border-neutral-800 group-hover:border-neutral-600 transition-colors">
        <Box className="w-3.5 h-3.5 text-neutral-500 group-hover:text-green-400" />
      </div>
    </div>
  </button>
);

const renderInlineFormatting = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\`.*?\`)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-green-400">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 rounded text-[11px] sm:text-[12px] font-mono break-all bg-neutral-800 text-green-300 border border-neutral-700">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};