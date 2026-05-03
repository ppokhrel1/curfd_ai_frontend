import React, { useCallback, useRef, useState } from "react";
import { ImagePlus, Search, Upload, Link, Loader2, Sparkles } from "lucide-react";
import { imageTo3dService } from "@/modules/ai/services/imageTo3dService";
import { useChatStore } from "@/modules/ai/stores/chatStore";

type InputMode = "search" | "upload" | "url";

export const ImageTo3DPanel: React.FC = () => {
  const [mode, setMode] = useState<InputMode>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [outputFormat, setOutputFormat] = useState<"glb" | "stl">("glb");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = useChatStore((s) => s.activeConversationId);
  const skipSegmentation = useChatStore((s) => s.imageTo3DSkipSegmentation);
  const setSkipSegmentation = useChatStore((s) => s.setImageTo3DSkipSegmentation);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!chatId) {
      setError("No active chat. Send a message first.");
      return;
    }

    let resolvedImageUrl = "";
    let resolvedPrompt = prompt.trim();

    if (mode === "upload" && uploadedImage) {
      resolvedImageUrl = uploadedImage;
    } else if (mode === "url" && imageUrl.trim()) {
      resolvedImageUrl = imageUrl.trim();
    } else if (mode === "search" && searchQuery.trim()) {
      // No image — backend will search DDG and resolve an image from the prompt
      resolvedImageUrl = "";
      resolvedPrompt = resolvedPrompt || searchQuery.trim();
    } else {
      setError("Please provide an image or search query");
      return;
    }

    // Search mode requires at least a prompt for the backend to search
    if (mode === "search" && !resolvedPrompt) {
      setError("Please enter a search query");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus(mode === "search" ? "Searching for reference image..." : "Submitting job...");

    try {
      const response = await imageTo3dService.generate(chatId, {
        image_url: resolvedImageUrl,
        prompt: resolvedPrompt,
        output_format: outputFormat,
        skip_segmentation: skipSegmentation,
      });
      setStatus(`Job queued (${response.runpod_id || "processing"}). Check viewer for results.`);
    } catch (err: any) {
      setError(err?.message || "Failed to start generation");
      setStatus(null);
    } finally {
      setIsGenerating(false);
    }
  }, [chatId, mode, uploadedImage, imageUrl, searchQuery, prompt, outputFormat, skipSegmentation]);

  const modes: { key: InputMode; label: string; icon: React.ReactNode }[] = [
    { key: "search", label: "Search", icon: <Search className="w-3.5 h-3.5" /> },
    { key: "upload", label: "Upload", icon: <Upload className="w-3.5 h-3.5" /> },
    { key: "url", label: "URL", icon: <Link className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 text-violet-400">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-semibold uppercase tracking-wider">Image to 3D</span>
      </div>

      <p className="text-xs text-neutral-500">
        Generate a 3D mesh from an image using AI. Search for reference images, upload your own, or paste a URL.
      </p>

      {/* Mode Tabs */}
      <div className="flex bg-white border border-neutral-200 rounded-lg p-1">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              mode === m.key
                ? "bg-neutral-100 text-violet-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-600"
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex flex-col gap-3">
        {mode === "search" && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g., dragon sculpture, anime character..."
            className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50"
          />
        )}

        {mode === "upload" && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-violet-500/50 transition-colors"
          >
            {uploadedImage ? (
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="max-h-32 rounded object-contain"
              />
            ) : (
              <>
                <ImagePlus className="w-8 h-8 text-neutral-600" />
                <span className="text-xs text-neutral-500">Click or drag to upload</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {mode === "url" && (
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50"
          />
        )}

        {/* Prompt — shown for all modes */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === "search" ? "Optional: refine the style (e.g., low-poly, realistic)" : "Optional: describe what you want (e.g., low-poly style)"}
          className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {/* Output Format */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">Format:</span>
        <div className="flex bg-white border border-neutral-200 rounded-lg p-0.5">
          {(["glb", "stl"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setOutputFormat(fmt)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                outputFormat === fmt
                  ? "bg-neutral-100 text-violet-400 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-600"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Segment into parts — toggle. Off = mesh only (faster). */}
      <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-neutral-700">Segment into parts</span>
          <span className="text-[11px] text-neutral-500">
            Decompose the mesh into named sub-parts ({skipSegmentation ? "off — faster" : "on — adds ~5–10s"})
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!skipSegmentation}
          onClick={() => setSkipSegmentation(!skipSegmentation)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            !skipSegmentation ? "bg-violet-500" : "bg-neutral-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              !skipSegmentation ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-100 disabled:text-neutral-500 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {mode === "search" ? "Searching & generating..." : "Generating..."}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate 3D Model
          </>
        )}
      </button>

      {/* Status */}
      {status && (
        <div className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
          {status}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="mt-auto text-[10px] text-neutral-600 leading-relaxed">
        Powered by AI image-to-3D generation. The model will appear in the 3D viewer when ready.
        Generation typically takes 2-10 minutes.
      </div>
    </div>
  );
};
