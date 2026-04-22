import { Activity, Cpu, Layers } from "lucide-react";
import { useState } from "react";

interface StatsDisplayProps {
  fps?: number;
  triangles?: number;
  drawCalls?: number;
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  fps = 60,
  triangles = 0,
  drawCalls = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const currentFps = fps;

  const getFpsColor = (fps: number) => {
    if (fps >= 60) return "text-primary-500";
    if (fps >= 30) return "text-yellow-400";
    return "text-red-400";
  };

  const getFpsStatus = (fps: number) => {
    if (fps >= 60) return "Excellent";
    if (fps >= 30) return "Good";
    return "Poor";
  };

  // UX Refinement: Hide completely if no data (realism)
  if (!triangles && !drawCalls) {
    return null;
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="absolute top-4 right-4 z-10 group"
      >
        <div className="p-2.5 bg-neutral-50 backdrop-blur-md border border-neutral-200 rounded-xl shadow-xl hover:border-primary-500/30 transition-all">
          <Activity className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
        </div>
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-white/95 backdrop-blur-md border border-neutral-200 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-50 rounded-lg border border-primary-500/20">
              <Activity className="w-3.5 h-3.5 text-primary-500" />
            </div>
            <span className="font-semibold text-white text-xs">
              Performance
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-neutral-500 hover:text-white transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Stats Content */}
        <div className="p-4 space-y-3 font-mono">
          {/* FPS with Status */}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Activity className={`w-3.5 h-3.5 ${getFpsColor(currentFps)}`} />
              <span className="text-neutral-400 text-xs">FPS:</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold text-sm ${getFpsColor(currentFps)}`}
              >
                {currentFps}
              </span>
              <span className="text-[10px] text-neutral-500">
                {getFpsStatus(currentFps)}
              </span>
            </div>
          </div>

          {/* Triangles */}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-neutral-400 text-xs">Triangles:</span>
            </div>
            <span className="font-semibold text-blue-400 text-sm">
              {triangles.toLocaleString()}
            </span>
          </div>

          {/* Draw Calls */}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-neutral-400 text-xs">Draw Calls:</span>
            </div>
            <span className="font-semibold text-purple-400 text-sm">
              {drawCalls}
            </span>
          </div>
        </div>

        {/* Performance Bar */}
        <div className="px-4 pb-3">
          <div className="w-full bg-neutral-800/50 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 rounded-full bg-gradient-to-r ${
                currentFps >= 60
                  ? "from-primary-500 to-primary-500"
                  : currentFps >= 30
                  ? "from-yellow-500 to-orange-500"
                  : "from-red-500 to-pink-500"
              } transition-all duration-300`}
              style={{ width: `${Math.min((currentFps / 60) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
