import { Send, Sparkles } from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  return (
    <div className="border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-xl px-2.5 py-2.5">
      <div className="w-full flex items-end gap-2">

        {/* Text Input Container */}
        <div className="flex-1 min-w-0 relative">
          <div
            className={`relative flex flex-col rounded-xl transition-all duration-200 ${
              isFocused
                ? "ring-2 ring-green-500/40 border-green-500/50"
                : "border-neutral-800"
            } border bg-neutral-900/50 backdrop-blur-sm overflow-hidden`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Describe a shape or ask a question…"
              disabled={disabled}
              rows={1}
              className="w-full px-3 py-2.5 pr-10 bg-transparent resize-none focus:outline-none transition-all disabled:cursor-not-allowed text-white placeholder-neutral-600 text-[13px]"
              style={{ minHeight: "40px", maxHeight: "120px" }}
            />

            {/* AI sparkle badge */}
            {input.length > 0 && (
              <div className="absolute right-2.5 bottom-2.5 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5 text-green-500/50" />
              </div>
            )}
          </div>
        </div>

        {/* Send Button — icon only */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-green-600 hover:bg-green-500 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm shadow-green-500/20 disabled:shadow-none group"
          title="Send (Enter)"
        >
          <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};