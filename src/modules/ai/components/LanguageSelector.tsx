import { ChevronDown, FileCode2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../stores/chatStore";

const LANGUAGE_OPTIONS = [
  { value: "openscad" as const, label: "OpenSCAD", description: "CSG-based 3D modeling" },
  { value: "cadquery" as const, label: "CadQuery (Python)", description: "Python + OpenCascade" },
  { value: "image_to_3d" as const, label: "Image to 3D", description: "AI mesh from prompt/image" },
];

export const LanguageSelector: React.FC = () => {
  const { selectedLanguage, setSelectedLanguage } = useChatStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGE_OPTIONS.find((o) => o.value === selectedLanguage) || LANGUAGE_OPTIONS[0];

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
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-all"
      >
        <FileCode2 className="w-3 h-3" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-52 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl overflow-hidden z-50">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSelectedLanguage(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                opt.value === selectedLanguage
                  ? "bg-green-600/20 text-green-400"
                  : "text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-[10px] text-neutral-500">{opt.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
