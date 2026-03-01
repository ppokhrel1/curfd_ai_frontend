import { useState } from "react";

interface PromptBoxProps {
  onAuthClick?: (mode: "signin" | "signup") => void;
}

const PromptBox = ({ onAuthClick }: PromptBoxProps) => {
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = [
    "Create a robotic arm with 6 degrees of freedom",
    "Design an aerodynamic drone chassis",
    "Generate a gear mechanism with 3:1 ratio",
    "Simulate airflow around a car body",
  ];

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    // Save prompt and trigger auth
    sessionStorage.setItem("pending_chat_message", prompt);
    if (onAuthClick) {
      onAuthClick("signup");
    } else {
      // Fallback if no auth handler (should not happen in landing page context)
      console.warn("No auth handler provided to PromptBox");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Input Box */}
      <div
        className={`relative bg-neutral-900/60 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 ${
          isFocused
            ? "border-emerald-500/50 shadow-2xl shadow-emerald-500/20 scale-[1.02]"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        {/* Gradient Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 opacity-0 transition-opacity duration-300 ${
            isFocused ? "opacity-100" : ""
          }`}
        />

        <div className="relative p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg
                  className="w-5 h-5 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="e.g. Design a robotic arm with servo motors"
              className="flex-1 bg-transparent outline-none text-base md:text-lg text-white placeholder-neutral-500 resize-none min-h-[60px] max-h-[200px]"
              rows={2}
            />

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className={`flex-shrink-0 mt-1 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                prompt.trim()
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-110"
                  : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
              }`}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${
                  prompt.trim() ? "translate-x-0.5" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>

          {/* Character Count */}
          {prompt.length > 0 && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
              <span className="text-xs text-neutral-500">
                {prompt.length} characters
              </span>
              <span className="text-xs text-neutral-500">
                Press Enter to submit
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {!isFocused && prompt.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-500 text-center">
            Try these examples:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setPrompt(suggestion)}
                className="group p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-xl text-left transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-neutral-500 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">
                    {suggestion}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptBox;
