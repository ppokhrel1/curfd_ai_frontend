import { Boxes } from "lucide-react";
import { useChatStore } from "../stores/chatStore";

/**
 * Toggle for Hunyuan3D-Part decomposition. Only renders when the selected
 * generation language is "image_to_3d" — the only path where parts apply.
 *
 * Off (default): mesh-only output, faster, lower VRAM. ~30s per request.
 * On: each part is a separate sub-mesh in the response. Adds ~10s and
 *     ~12 GB VRAM, which can OOM on 32 GB GPUs — see worker logs if it fails.
 */
export const SegmentationToggle: React.FC = () => {
  const language = useChatStore((s) => s.selectedLanguage);
  const skip = useChatStore((s) => s.imageTo3DSkipSegmentation);
  const setSkip = useChatStore((s) => s.setImageTo3DSkipSegmentation);

  if (language !== "image_to_3d") return null;

  const enabled = !skip;

  return (
    <button
      type="button"
      onClick={() => setSkip(!skip)}
      title={
        enabled
          ? "Hunyuan3D-Part will decompose the mesh into named sub-parts (~+10s, ~+12GB VRAM)"
          : "Mesh-only output (faster, no part decomposition)"
      }
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
        enabled
          ? "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20"
          : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
      }`}
    >
      <Boxes className="w-3 h-3" />
      <span>{enabled ? "Parts on" : "Parts off"}</span>
    </button>
  );
};
