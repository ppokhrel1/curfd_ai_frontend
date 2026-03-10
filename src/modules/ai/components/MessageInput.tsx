import { Send, Sparkles, ImagePlus, X } from "lucide-react";
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ModelSelector } from "./ModelSelector";

const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface MessageInputProps {
  onSendMessage: (content: string, images?: File[]) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!input.trim() && selectedImages.length === 0) || disabled) return;
    onSendMessage(input.trim(), selectedImages.length > 0 ? selectedImages : undefined);
    setInput("");
    setSelectedImages([]);
    setPreviews([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        console.warn(`[MessageInput] Skipping ${f.name}: exceeds 5MB`);
        return false;
      }
      return f.type.startsWith("image/");
    });

    setSelectedImages(prev => {
      const combined = [...prev, ...validFiles].slice(0, MAX_IMAGES);
      return combined;
    });

    // Reset input so the same file can be re-selected
    e.target.value = "";
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Generate previews when selectedImages changes
  useEffect(() => {
    const urls = selectedImages.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [selectedImages]);

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

  const canSend = (input.trim() || selectedImages.length > 0) && !disabled;

  return (
    <div className="border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-xl px-2.5 py-2.5">
      <div className="flex items-center mb-1.5 px-1">
        <ModelSelector />
      </div>

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 px-1 mb-2 overflow-x-auto">
          {previews.map((src, i) => (
            <div key={i} className="relative flex-shrink-0 group">
              <img
                src={src}
                alt={`Upload ${i + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-neutral-700"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-neutral-800 border border-neutral-600 rounded-full text-neutral-400 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="w-full flex items-end gap-2">
        {/* Image Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || selectedImages.length >= MAX_IMAGES}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-neutral-500 hover:text-green-400 disabled:text-neutral-700 disabled:cursor-not-allowed rounded-xl transition-all hover:bg-neutral-800/50"
          title="Attach image"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

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
              placeholder={selectedImages.length > 0 ? "Describe what you want from this image…" : "Describe a shape or ask a question…"}
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
          disabled={!canSend}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-green-600 hover:bg-green-500 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm shadow-green-500/20 disabled:shadow-none group"
          title="Send (Enter)"
        >
          <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
