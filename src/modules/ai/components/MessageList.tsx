import { formatTime } from "@/utils/formatters";
import { Bot, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Message } from "../types/chat.type";

const TypewriterEffect: React.FC<{ content: string }> = ({ content }) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const cleanContent = content.split("|||JSON_DATA|||")[0].trim();

    if (complete) {
      setDisplayedContent(cleanContent);
      return;
    }

    let i = 0;
    setDisplayedContent("");

    const interval = setInterval(() => {
      setDisplayedContent(cleanContent.slice(0, i));
      i++;
      if (i > cleanContent.length) {
        clearInterval(interval);
        setComplete(true);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [content, complete]);

  return <FormattedContent content={displayedContent} isUser={false} />;
};

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          message={message}
          isLatest={index === messages.length - 1}
        />
      ))}
    </div>
  );
};

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLatest }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-4 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } animate-in fade-in slide-in-from-bottom-2 duration-500`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
          isUser
            ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400/30 shadow-lg shadow-green-500/20"
            : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-xl"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-green-400" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
      >
        {!isUser && (
          <span className="text-[10px] font-bold text-green-500/80 mb-1 ml-1 uppercase tracking-wider">
            CURFD
          </span>
        )}
        <div
          className={`rounded-2xl px-5 py-3.5 transition-all duration-300 leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/10 ml-auto rounded-tr-none"
              : "bg-neutral-900/40 backdrop-blur-md text-neutral-100 border border-neutral-800/80 hover:border-neutral-700/80 rounded-tl-none"
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none break-words overflow-hidden">
            {isUser ? (
              <FormattedContent content={message.content} isUser={true} />
            ) : (
              <TypewriterEffect content={message.content} />
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

const FormattedContent: React.FC<{ content: string; isUser: boolean }> = ({
  content,
  isUser,
}) => {
  const cleanContent = content.split("|||JSON_DATA|||")[0].trim();
  const lines = cleanContent.split("\n");

  return (
    <div
      className={`text-[14px] leading-relaxed space-y-3 ${
        isUser ? "text-white" : "text-neutral-200"
      }`}
    >
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith("**") && line.endsWith("**")) {
          const text = line.slice(2, -2);
          return (
            <h3
              key={index}
              className={`font-bold text-[15px] pt-2 mb-1 ${
                isUser ? "text-white/90" : "text-green-400"
              }`}
            >
              {text}
            </h3>
          );
        }

        if (line.trim().startsWith("```")) {
          return null;
        }

        if (
          line.trim().startsWith("•") ||
          line.trim().startsWith("-") ||
          line.trim().startsWith("✓") ||
          line.trim().startsWith("✅") ||
          line.trim().startsWith("*")
        ) {
          const bullet = line.trim()[0];
          const text = line.trim().slice(1).trim();
          return (
            <div key={index} className="flex gap-3 items-start pl-1 group">
              <span
                className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${isUser ? "bg-white/60" : "bg-green-500/60 group-hover:bg-green-400"}`}
              />
              <span className="flex-1 opacity-90 group-hover:opacity-100 transition-opacity">
                {renderInlineFormatting(text, isUser)}
              </span>
            </div>
          );
        }

        // Check for numbered lists
        if (/^\d+\./.test(line.trim())) {
          const number = line.trim().match(/^\d+\./)?.[0];
          const text = line
            .trim()
            .replace(/^\d+\./, "")
            .trim();
          return (
            <div key={index} className="flex gap-3 items-start pl-1">
              <span
                className={`font-bold text-xs mt-0.5 ${
                  isUser ? "text-white/70" : "text-green-500/80"
                }`}
              >
                {number}
              </span>
              <span className="flex-1 opacity-90">
                {renderInlineFormatting(text, isUser)}
              </span>
            </div>
          );
        }

        // Regular text
        return line.trim() ? (
          <p key={index} className="leading-relaxed opacity-95">
            {renderInlineFormatting(line, isUser)}
          </p>
        ) : (
          <div key={index} className="h-1" />
        );
      })}
    </div>
  );
};

const renderInlineFormatting = (text: string, isUser: boolean) => {
  const parts = text.split(/(\*\*.*?\*\*|\`.*?\`)/);

  return parts.map((part, i) => {
    // Bold
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className={`font-bold ${isUser ? "text-white" : "text-green-400"}`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Inline Code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className={`px-1.5 py-0.5 rounded text-[12px] font-mono ${
            isUser
              ? "bg-white/20 text-white"
              : "bg-neutral-800 text-green-300 border border-neutral-700"
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};
