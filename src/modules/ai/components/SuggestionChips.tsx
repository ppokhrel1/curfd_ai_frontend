import { AI_SUGGESTIONS } from "@/lib/constants";
import { Cpu, Lightbulb, Sparkles, Zap } from "lucide-react";

interface SuggestionChipsProps {
  onSuggestionClick: (suggestion: string) => void;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  onSuggestionClick,
}) => {
  // Icons for different suggestion types
  const getIconForSuggestion = (suggestion: string) => {
    const lower = suggestion.toLowerCase();
    if (lower.includes("generate") || lower.includes("create")) return Sparkles;
    if (lower.includes("optimize") || lower.includes("mesh")) return Zap;
    if (lower.includes("turbulence") || lower.includes("explain")) return Cpu;
    return Lightbulb;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
          <Lightbulb className="w-3.5 h-3.5 text-green-400" />
        </div>
        <h3 className="text-xs font-medium text-neutral-400">
          Try these prompts to get started:
        </h3>
      </div>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {AI_SUGGESTIONS.map((suggestion, index) => {
          const Icon = getIconForSuggestion(suggestion);

          return (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="group relative text-left p-3.5 bg-neutral-900/40 border border-neutral-800/50 rounded-xl hover:border-green-500/40 hover:bg-neutral-900/60 transition-all duration-200 backdrop-blur-sm overflow-hidden"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Gradient overlay on hover */}
              <div className="relative inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/5 group-hover:to-emerald-500/5 transition-all duration-300" />

              <div className="relative flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 group-hover:border-green-500/30 flex items-center justify-center transition-all duration-200">
                  <Icon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-green-400 transition-colors" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-400 group-hover:text-green-400 transition-colors leading-relaxed">
                    {suggestion}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Hint */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-neutral-600">
          Or type your own question to get personalized AI assistance
        </p>
      </div>
    </div>
  );
};
