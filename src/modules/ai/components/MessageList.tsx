import { formatTime } from "@/utils/formatters";
import { Bot, User } from "lucide-react";
import { Message } from "../types/chat.type";

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
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
      className={`flex gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } animate-in fade-in slide-in-from-bottom-2 duration-300`}
      style={{
        animationDelay: isLatest ? "0ms" : "0ms",
      }}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 ${
          isUser
            ? "bg-gradient-to-br from-green-500 to-emerald-500 border-green-400/20 shadow-lg shadow-green-500/20"
            : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-green-400" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 transition-all duration-200 ${
            isUser
              ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/10 ml-auto"
              : "bg-neutral-900/80 backdrop-blur-sm text-neutral-100 border border-neutral-800/50 hover:border-neutral-700/50"
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <FormattedContent content={message.content} isUser={isUser} />
          </div>
        </div>

        <p
          className={`text-[11px] mt-1.5 px-1 text-neutral-500 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

const FormattedContent: React.FC<{ content: string; isUser: boolean }> = ({
  content,
  isUser,
}) => {
  const lines = content.split("\n");

  return (
    <div
      className={`text-[13px] leading-relaxed space-y-2 ${
        isUser ? "text-white" : "text-neutral-100"
      }`}
    >
      {lines.map((line, index) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          const text = line.slice(2, -2);
          return (
            <h3
              key={index}
              className={`font-semibold text-sm mt-3 mb-2 ${
                isUser ? "text-white" : "text-green-400"
              }`}
            >
              {text}
            </h3>
          );
        }

        // Check for bullet points
        if (
          line.trim().startsWith("•") ||
          line.trim().startsWith("-") ||
          line.trim().startsWith("✓") ||
          line.trim().startsWith("✅")
        ) {
          return (
            <div key={index} className="flex gap-2 items-start">
              <span className={isUser ? "text-green-200" : "text-green-400"}>
                {line.trim()[0]}
              </span>
              <span>{line.trim().slice(1).trim()}</span>
            </div>
          );
        }

        // Check for numbered lists
        if (/^\d+\./.test(line.trim())) {
          return (
            <div key={index} className="flex gap-2 items-start">
              <span
                className={`font-medium ${
                  isUser ? "text-green-200" : "text-green-400"
                }`}
              >
                {line.trim().match(/^\d+\./)?.[0]}
              </span>
              <span>
                {line
                  .trim()
                  .replace(/^\d+\./, "")
                  .trim()}
              </span>
            </div>
          );
        }

        // Regular text with inline bold
        const formattedLine = line.split(/(\*\*.*?\*\*)/).map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong
                key={i}
                className={isUser ? "text-white" : "text-green-400"}
              >
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        return line.trim() ? (
          <p key={index} className="leading-relaxed">
            {formattedLine}
          </p>
        ) : (
          <div key={index} className="h-1" />
        );
      })}
    </div>
  );
};
