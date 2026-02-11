import { Box, Eye, EyeOff, RotateCcw, RotateCw } from "lucide-react";
import type { ViewerState } from "../types/viewer.type";

interface ToolbarProps {
  state: ViewerState;

  onToggleWireframe: () => void;
  onToggleAxes: () => void;
  onToggleAutoRotate: () => void;
  onReset: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  state,
  onToggleWireframe,
  onToggleAxes,
  onToggleAutoRotate,
  onReset,
}) => {
  return (
    <div className="flex items-center gap-0.5 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ToolButton
        icon={<Box className="w-4 h-4" />}
        label="Wireframe Mode"
        active={state.wireframe}
        onClick={onToggleWireframe}
      />

      <ToolButton
        icon={
          state.showAxes ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )
        }
        label="Toggle Axes"
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
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  active,
  onClick,
  variant = 'default',
}) => (
  <button
    onClick={onClick}
    className={`group relative p-2.5 rounded-lg transition-all duration-200 ${
      active
        ? "bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20"
        : variant === 'danger'
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
