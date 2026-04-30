import { ChevronDown, Bot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";

export interface ModelOption {
  provider: string;
  model: string;
  label: string;
  thinking?: boolean;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { provider: "anthropic", model: "claude-opus-4-6", label: "Opus 4.6 (Thinking)", thinking: true },
  { provider: "anthropic", model: "claude-sonnet-4-20250514", label: "Sonnet 4 (Thinking)", thinking: true },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (Thinking)", thinking: true },
  { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash", thinking: false },
  { provider: "groq", model: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", thinking: false },
  { provider: "openai", model: "gpt-4o", label: "GPT-4o", thinking: false },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o Mini", thinking: false },
];

export const ModelSelector: React.FC = () => {
  const { selectedProvider, selectedModel, selectedThinking, setSelectedModel } = useChatStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = MODEL_OPTIONS.find(
    (m) => m.provider === selectedProvider && m.model === selectedModel
  ) || MODEL_OPTIONS[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-all"
      >
        <Bot className="w-3 h-3" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden z-50">
          {MODEL_OPTIONS.map((opt) => {
            const isActive =
              opt.provider === selectedProvider && opt.model === selectedModel;
            return (
              <button
                key={`${opt.provider}-${opt.model}`}
                onClick={() => {
                  setSelectedModel(opt.provider, opt.model, opt.thinking ?? false);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-[10px] text-neutral-500">{opt.provider} / {opt.model}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
