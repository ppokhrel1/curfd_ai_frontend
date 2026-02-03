import { GeneratedShape } from "@/modules/ai/types/chat.type";
import { formatNumber } from "@/utils/formatters";
import { Activity, ChevronDown, Gauge, Info, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { ViewerStats } from "../types/viewer.type";

interface ModelSidebarProps {
  stats: ViewerStats;
  shape?: GeneratedShape | null;
  className?: string;
  onExport?: () => void;
}

export const ModelSidebar: React.FC<ModelSidebarProps> = ({
  stats,
  shape,
  className = "",
  onExport,
}) => {
  const [isInfoExpanded, setIsInfoExpanded] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);

  // Dynamic analysis data based on model specification or YAML
  const analysisData = useMemo(() => {
    // Physics Data (Scientific Analysis)
    const physics = shape?.geometry?.physics || {};
    const results: any[] = [];
    
    // Volume & Mass
    if (physics.volume) {
      results.push({
        label: "Volume",
        value: `${formatNumber(physics.volume, 4)} m³`,
        color: "text-blue-400",
        progress: Math.min((physics.volume / 1.0) * 100, 100), // Scale relative to 1m^3
        gradient: "from-blue-500 to-cyan-500",
        icon: <Gauge className="w-3.5 h-3.5" />,
      });
    }

    if (physics.mass) {
      results.push({
        label: "Est. Mass",
        value: `${formatNumber(physics.mass, 2)} kg`,
        color: "text-purple-400",
        progress: Math.min((physics.mass / 100) * 100, 100), // Scale relative to 100kg
        gradient: "from-purple-500 to-pink-500",
        icon: <TrendingUp className="w-3.5 h-3.5" />,
      });
    }

    // Surface Area
    if (physics.surface_area) {
      results.push({
        label: "Surface Area",
        value: `${formatNumber(physics.surface_area, 2)} m²`,
        color: "text-green-400",
        progress: Math.min((physics.surface_area / 5.0) * 100, 100),
        gradient: "from-green-500 to-emerald-500",
        icon: <Activity className="w-3.5 h-3.5" />,
      });
    }

    // Dimensions (if available)
    if (physics.dimensions) {
      const { x, y, z } = physics.dimensions;
      results.push({
        label: "Dimensions",
        value: `${formatNumber(x, 2)}×${formatNumber(y, 2)}×${formatNumber(z, 2)} m`,
        color: "text-yellow-400",
        progress: 100,
        gradient: "from-yellow-500 to-orange-500",
        icon: <Info className="w-3.5 h-3.5" />,
      });
    }

    return results;
  }, [shape]);


  return (
    <div className={`space-y-3 ${className}`}>
      {/* Model Info Card */}
      <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-right-4 duration-500">
        <button
          onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <Info className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              Model Information
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform ${
              isInfoExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {isInfoExpanded && (
          <div className="px-5 pb-5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <InfoRow
              label="Vertices"
              value={formatNumber(stats.vertices, 0)}
              highlight
            />
            <InfoRow label="Faces" value={formatNumber(stats.faces, 0)} />
            <InfoRow
              label="Triangles"
              value={formatNumber(stats.triangles, 0)}
            />
            <InfoRow label="Materials" value={stats.materials.toString()} />
          </div>
        )}
      </div>

      {/* Analysis Results Card - Only show if we have data */}
      {analysisData.length > 0 && (
        <div
          className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-right-4 duration-500"
          style={{ animationDelay: "100ms" }}
        >
          <button
            onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Physics Analysis
              </h3>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-neutral-400 transition-transform ${
                isAnalysisExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {isAnalysisExpanded && (
            <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {analysisData.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={item.color}>{item.icon}</span>
                      <span className="text-xs text-neutral-400">
                        {item.label}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                  <div className="relative w-full bg-neutral-800/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full bg-gradient-to-r ${item.gradient} transition-all duration-500 shadow-lg`}
                      style={{
                        width: `${item.progress}%`,
                        boxShadow: `0 0 10px rgba(34, 197, 94, 0.3)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions Card */}
      <div
        className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-right-4 duration-500"
        style={{ animationDelay: "200ms" }}
      >
        <h3 className="text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <ActionButton label="Export Model" icon="📥" onClick={onExport} />
          <ActionButton label="Take Screenshot" icon="📸" />
          <ActionButton label="Share Model" icon="🔗" />
          <ActionButton label="Run Simulation" icon="⚡" variant="primary" />
        </div>
      </div>

    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, highlight }) => {
  return (
    <div className="flex justify-between items-center text-xs p-2.5 rounded-lg hover:bg-neutral-800/30 transition-colors">
      <span className="text-neutral-400 font-medium">{label}:</span>
      <span
        className={`font-semibold ${
          highlight ? "text-green-400" : "text-neutral-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  icon?: string;
  variant?: "default" | "primary";
  onClick?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon,
  variant = "default",
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
        variant === "primary"
          ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30 hover:shadow-lg hover:shadow-green-500/20"
          : "bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 border border-neutral-700/50 hover:border-neutral-600"
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
};

