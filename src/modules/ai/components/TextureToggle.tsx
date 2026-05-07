import { Palette } from "lucide-react";
import { useChatStore } from "../stores/chatStore";

/**
 * Toggle for Hunyuan3D-Paint (texture / UV / albedo generation).
 * Only renders when the selected generation language is "image_to_3d".
 *
 * Off (default): mesh is returned untextured (just geometry).
 * On: a textured GLB (with embedded UV-mapped albedo) is returned alongside
 *     the plain mesh under `output.textured_url`. Adds ~30-90s per request
 *     and ~12-16 GB VRAM peak (sequential after Part is released, so still
 *     fits 32 GB cards).
 */
export const TextureToggle: React.FC = () => {
  const language = useChatStore((s) => s.selectedLanguage);
  const enabled = useChatStore((s) => s.imageTo3DWithTexture);
  const setEnabled = useChatStore((s) => s.setImageTo3DWithTexture);

  if (language !== "image_to_3d") return null;

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      title={
        enabled
          ? "Hunyuan3D-Paint will texture the mesh (~+30-90s, ~+12-16 GB VRAM)"
          : "Mesh-only output (no UV/textures)"
      }
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
        enabled
          ? "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20"
          : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
      }`}
    >
      <Palette className="w-3 h-3" />
      <span>{enabled ? "Texture on" : "Texture off"}</span>
    </button>
  );
};
