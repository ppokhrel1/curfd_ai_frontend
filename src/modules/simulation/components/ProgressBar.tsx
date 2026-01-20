import { AlertCircle, CheckCircle, Loader as LoaderIcon } from "lucide-react";

interface ProgressBarProps {
  progress: number;
  status: "idle" | "running" | "paused" | "completed" | "error";
  currentIteration: number;
  maxIterations: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
  currentIteration,
  maxIterations,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case "running":
        return {
          color: "from-green-500 to-emerald-500",
          icon: <LoaderIcon className="w-4 h-4 text-green-400 animate-spin" />,
          text: "Running...",
          textColor: "text-green-400",
        };
      case "completed":
        return {
          color: "from-green-500 to-emerald-500",
          icon: <CheckCircle className="w-4 h-4 text-green-400" />,
          text: "Completed",
          textColor: "text-green-400",
        };
      case "error":
        return {
          color: "from-red-500 to-rose-500",
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          text: "Error",
          textColor: "text-red-400",
        };
      case "paused":
        return {
          color: "from-yellow-500 to-amber-500",
          icon: null,
          text: "Paused",
          textColor: "text-yellow-400",
        };
      default:
        return {
          color: "from-neutral-500 to-neutral-600",
          icon: null,
          text: "Ready",
          textColor: "text-neutral-400",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-4">
      {/* Progress Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusConfig.icon}
          <span className={`text-sm font-medium ${statusConfig.textColor}`}>
            {statusConfig.text}
          </span>
        </div>
        <span className="text-sm font-semibold text-white">
          {progress.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-neutral-800/50 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${statusConfig.color} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {status === "running" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* Iteration Counter */}
      <div className="flex justify-between text-xs text-neutral-400">
        <span>
          Iteration:{" "}
          <span className="font-semibold text-neutral-300">
            {currentIteration}
          </span>{" "}
          / {maxIterations}
        </span>
        <span>{Math.max(0, maxIterations - currentIteration)} remaining</span>
      </div>
    </div>
  );
};
