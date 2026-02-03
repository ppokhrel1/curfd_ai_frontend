import { Paperclip, Send, Sparkles } from "lucide-react";
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
    <div className="border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-xl px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2.5">
          {/* Attachment Button */}
          <button
            type="button"
            className="flex-shrink-0 p-2.5 rounded-xl hover:bg-neutral-900 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-700 group"
            disabled={disabled}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 transition-transform group-hover:rotate-12" />
          </button>

          {/* Text Input Container */}
          <div className="flex-1 relative">
            <div
              className={`relative rounded-xl transition-all duration-200 ${
                isFocused
                  ? "ring-2 ring-green-500/40 border-green-500/50"
                  : "border-neutral-800"
              } border bg-neutral-900/50 backdrop-blur-sm overflow-hidden`}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ask about CFD simulations, generate 3D models, or get analysis help..."
                disabled={disabled}
                rows={1}
                className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none transition-all disabled:cursor-not-allowed text-white placeholder-neutral-500 text-sm"
                style={{
                  minHeight: "44px",
                  maxHeight: "120px",
                }}
              />

              {/* AI Indicator */}
              {input.length > 0 && (
                <div className="absolute right-3 top-3 flex items-center gap-1.5 text-[10px] text-green-400/60 font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>AI</span>
                </div>
              )}
            </div>

            {/* Helper Text */}
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-neutral-600">
                <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-500">
                  Shift
                </kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-500">
                  Enter
                </kbd>
                {" for new line"}
              </p>
              {input.length > 0 && (
                <p className="text-[10px] text-neutral-600">
                  {input.length} characters
                </p>
              )}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="flex-shrink-0 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-neutral-800 disabled:to-neutral-800 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 border border-green-400/20 disabled:border-neutral-700 shadow-lg shadow-green-500/20 disabled:shadow-none group"
          >
            <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            <span className="hidden sm:inline text-sm">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
