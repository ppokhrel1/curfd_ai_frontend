import { Paperclip, Send, Sparkles } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

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

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-xl px-4 py-6">
      <div className="max-w-4xl mx-auto pl-12 lg:pl-0">
        <div className="flex items-end gap-3">
          {/* Attachment Button */}
          <button
            type="button"
            className="flex-shrink-0 p-3 rounded-2xl hover:bg-neutral-800 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-400 hover:text-green-400 border border-neutral-800 hover:border-green-500/30 group bg-neutral-900/50"
            disabled={disabled}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 transition-transform group-hover:rotate-12" />
          </button>

          {/* Text Input Container */}
          <div className="flex-1 relative group">
            <div
              className={`relative rounded-2xl transition-all duration-300 ${
                isFocused
                  ? "ring-2 ring-green-500/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                  : "border-neutral-800 shadow-lg"
              } border bg-neutral-900/80 backdrop-blur-md overflow-hidden hover:border-neutral-700`}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Message CURFD AI Assistant..."
                disabled={disabled}
                rows={1}
                className="w-full px-4 py-3.5 bg-transparent resize-none focus:outline-none transition-all disabled:cursor-not-allowed text-neutral-100 placeholder-neutral-500 text-[14px] leading-relaxed"
                style={{
                  minHeight: "48px",
                  maxHeight: "160px",
                }}
              />
 
              {/* AI Status Indicator */}
              <div className={`absolute right-3 bottom-3 transition-opacity duration-300 ${input.length > 0 ? "opacity-100" : "opacity-0"}`}>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20 text-[10px] text-green-400 font-bold tracking-wider uppercase">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI ready</span>
                </div>
              </div>
            </div>

            {/* Helper Text */}
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-[10px] text-neutral-500 font-medium">
                <span className="opacity-60">Press</span>
                <kbd className="mx-1 px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-400 text-[9px]">
                  Enter
                </kbd>
                <span className="opacity-60">to send</span>
              </p>
              {input.length > 0 && (
                <p className="text-[10px] text-neutral-500 font-medium opacity-60">
                  {input.length} characters
                </p>
              )}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className={`flex-shrink-0 p-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center border shadow-xl ${
              !input.trim() || disabled
                ? "bg-neutral-900 border-neutral-800 text-neutral-600 grayscale"
                : "bg-green-500 hover:bg-green-400 text-neutral-950 border-green-400/50 shadow-green-500/20 active:scale-95"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
