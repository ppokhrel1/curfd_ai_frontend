import { formatNumber, formatScientific } from "@/utils/formatters";
import { Activity, Clock, Cpu, Zap } from "lucide-react";
import { SimulationMetrics } from "../types/simulation.type";

interface StatusBarProps {
  metrics: SimulationMetrics;
  cpuTime: number;
  estimatedTimeRemaining: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  metrics,
  cpuTime,
  estimatedTimeRemaining,
}) => {
  const statusItems = [
    {
      icon: Activity,
      label: "Residuals",
      value: formatScientific(metrics.convergence),
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      icon: Zap,
      label: "Courant",
      value: formatNumber(metrics.courantNumber, 2),
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      icon: Clock,
      label: "CPU Time",
      value: `${formatNumber(cpuTime, 1)}s`,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      icon: Cpu,
      label: "ETA",
      value: `${formatNumber(estimatedTimeRemaining, 0)}s`,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statusItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="flex items-center gap-3 p-4 bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800"
          >
            <div
              className={`p-2.5 rounded-lg ${item.bgColor} border ${item.borderColor}`}
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
