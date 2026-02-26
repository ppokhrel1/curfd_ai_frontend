import { Box, Eye, EyeOff, Move, Maximize2, RefreshCw, RotateCcw, RotateCw } from "lucide-react";
import type { ViewerState } from "../types/viewer.type";

interface ToolbarProps {
  state: ViewerState;
  onToggleWireframe: () => void;
  onToggleAxes: () => void;
  onToggleAutoRotate: () => void;
  onReset: () => void;
  // Transform tool props
  hasModel?: boolean;
  transformMode?: "translate" | "rotate" | "scale" | null;
  onSetTransformMode?: (mode: "translate" | "rotate" | "scale" | null) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  state,
  onToggleWireframe,
  onToggleAxes,
  onToggleAutoRotate,
  onReset,
  hasModel = false,
  transformMode,
  onSetTransformMode,
}) => {
  const handleTransform = (mode: "translate" | "rotate" | "scale") => {
    onSetTransformMode?.(transformMode === mode ? null : mode);
  };

  return (
    <div className="flex flex-row items-start gap-1.5">
      {/* View controls */}
      <div className="flex items-center gap-0.5 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl p-1.5 shadow-2xl">
        <ToolButton
          icon={<Box className="w-4 h-4" />}
          label="Wireframe"
          active={state.wireframe}
          onClick={onToggleWireframe}
        />
        <ToolButton
          icon={state.showAxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          label="Axes"
          active={state.showAxes}
          onClick={onToggleAxes}
        />
        <ToolButton
          icon={<RotateCw className="w-4 h-4" />}
          label="Auto Rotate"
          active={state.autoRotate}
          onClick={onToggleAutoRotate}
        />
        <div className="w-px h-6 bg-neutral-700 mx-1" />
        <ToolButton
          icon={<RotateCcw className="w-4 h-4" />}
          label="Reset View"
          onClick={onReset}
          variant="danger"
        />
      </div>

      {/* Transform tools — only shown when a model is loaded */}
      {hasModel && onSetTransformMode && (
        <div className="flex items-center gap-0.5 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl p-1.5 shadow-xl">
          <ToolButton
            icon={<Move className="w-4 h-4" />}
            label="Translate"
            active={transformMode === "translate"}
            onClick={() => handleTransform("translate")}
            activeColor="blue"
          />
          <ToolButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="Rotate"
            active={transformMode === "rotate"}
            onClick={() => handleTransform("rotate")}
            activeColor="purple"
          />
          <ToolButton
            icon={<Maximize2 className="w-4 h-4" />}
            label="Scale"
            active={transformMode === "scale"}
            onClick={() => handleTransform("scale")}
            activeColor="amber"
          />
          {transformMode && (
            <>
              <div className="w-px h-6 bg-neutral-700 mx-1" />
              <button
                onClick={() => onSetTransformMode(null)}
                className="px-2 py-1 rounded-lg text-[10px] text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Exit transform mode"
              >
                Esc
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  variant?: "default" | "danger";
  activeColor?: "green" | "blue" | "purple" | "amber";
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  active,
  onClick,
  variant = "default",
  activeColor = "green",
}) => {
  const activeClass = {
    green:  "bg-green-500/20  text-green-400  shadow-lg shadow-green-500/20",
    blue:   "bg-blue-500/20   text-blue-400   shadow-lg shadow-blue-500/20",
    purple: "bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/20",
    amber:  "bg-amber-500/20  text-amber-400  shadow-lg shadow-amber-500/20",
  }[activeColor];

  return (
    <button
      onClick={onClick}
      className={`group relative p-2.5 rounded-lg transition-all duration-200 ${
        active
          ? activeClass
          : variant === "danger"
          ? "text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
          : "text-neutral-400 hover:text-white hover:bg-neutral-800/70"
      }`}
      title={label}
    >
      {icon}
      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-neutral-700 shadow-xl z-[100]">
        {label}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-neutral-700" />
      </span>
    </button>
  );
};
