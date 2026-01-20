import { ShapeType } from "@/modules/ai/types/chat.type";
import { Activity, Cog, Fuel, Gauge, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SimulationDashboardProps {
  shapeType: ShapeType;
  isRunning: boolean;
  isPaused: boolean;
  onMetricsUpdate?: (metrics: SimulationMetrics) => void;
}

export interface SimulationMetrics {
  primary: number;
  secondary: number;
  tertiary: number;
  progress: number;
  efficiency: number;
  status: string;
}

// Type-specific configurations
const simConfigs: Record<
  ShapeType,
  {
    title: string;
    primaryLabel: string;
    primaryUnit: string;
    primaryMax: number;
    secondaryLabel: string;
    secondaryUnit: string;
    tertiaryLabel: string;
    tertiaryUnit: string;
    statusLabels: string[];
  }
> = {
  car: {
    title: "Vehicle Dynamics",
    primaryLabel: "Speed",
    primaryUnit: "km/h",
    primaryMax: 220,
    secondaryLabel: "RPM",
    secondaryUnit: "",
    tertiaryLabel: "Power",
    tertiaryUnit: "kW",
    statusLabels: ["Idle", "Accelerating", "Cruising", "Max Speed"],
  },
  robotic_arm: {
    title: "Motion Analysis",
    primaryLabel: "Position",
    primaryUnit: "°",
    primaryMax: 180,
    secondaryLabel: "Velocity",
    secondaryUnit: "°/s",
    tertiaryLabel: "Torque",
    tertiaryUnit: "Nm",
    statusLabels: ["Idle", "Moving", "Holding", "Complete"],
  },
  furniture: {
    title: "Stress Analysis",
    primaryLabel: "Load",
    primaryUnit: "kg",
    primaryMax: 200,
    secondaryLabel: "Stress",
    secondaryUnit: "MPa",
    tertiaryLabel: "Deflection",
    tertiaryUnit: "mm",
    statusLabels: ["Unloaded", "Loading", "Stressed", "Max Load"],
  },
  industrial: {
    title: "Process Simulation",
    primaryLabel: "Throughput",
    primaryUnit: "units/h",
    primaryMax: 1000,
    secondaryLabel: "Efficiency",
    secondaryUnit: "%",
    tertiaryLabel: "Energy",
    tertiaryUnit: "kWh",
    statusLabels: ["Stopped", "Warming Up", "Running", "Peak Output"],
  },
  generic: {
    title: "Physics Simulation",
    primaryLabel: "Force",
    primaryUnit: "N",
    primaryMax: 1000,
    secondaryLabel: "Velocity",
    secondaryUnit: "m/s",
    tertiaryLabel: "Energy",
    tertiaryUnit: "J",
    statusLabels: ["Rest", "Motion", "Steady", "Complete"],
  },
};

export const SimulationDashboard: React.FC<SimulationDashboardProps> = ({
  shapeType,
  isRunning,
  isPaused,
  onMetricsUpdate,
}) => {
  const config = simConfigs[shapeType] || simConfigs.generic;

  const [metrics, setMetrics] = useState<SimulationMetrics>({
    primary: 0,
    secondary: 0,
    tertiary: 0,
    progress: 0,
    efficiency: 100,
    status: config.statusLabels[0],
  });

  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const simulate = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setMetrics((prev) => {
        // Simulate progress
        const targetProgress = Math.min(
          prev.progress + 0.5 + Math.random() * 0.5,
          100
        );

        // Calculate primary metric based on progress
        const phase = Math.sin((timestamp / 3000) * Math.PI);
        const targetPrimary =
          config.primaryMax * (0.6 + phase * 0.4) * (targetProgress / 100);
        const primary = prev.primary + (targetPrimary - prev.primary) * 0.05;

        // Secondary metric
        const secondary = primary * (0.8 + Math.random() * 0.4);

        // Tertiary metric
        const tertiary = (primary * secondary) / (config.primaryMax * 2);

        // Efficiency decreases slightly over time
        const efficiency = Math.max(
          0,
          prev.efficiency - 0.01 * (elapsed / 100)
        );

        // Status based on progress
        let statusIdx = 0;
        if (targetProgress > 75) statusIdx = 3;
        else if (targetProgress > 50) statusIdx = 2;
        else if (targetProgress > 10) statusIdx = 1;

        const newMetrics = {
          primary,
          secondary,
          tertiary,
          progress: targetProgress,
          efficiency,
          status: config.statusLabels[statusIdx],
        };

        return newMetrics;
      });

      animationRef.current = requestAnimationFrame(simulate);
    },
    [config]
  );

  // Sync metrics to parent
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(simulate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, isPaused, simulate]);

  useEffect(() => {
    if (!isRunning) {
      setMetrics({
        primary: 0,
        secondary: 0,
        tertiary: 0,
        progress: 0,
        efficiency: 100,
        status: config.statusLabels[0],
      });
    }
  }, [isRunning, config.statusLabels]);

  const progressPercent = (metrics.primary / config.primaryMax) * 100;

  return (
    <div className="space-y-3">
      {/* Main Gauge */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl p-5 border border-neutral-800">
        <div className="flex items-center gap-4">
          {/* Circular Gauge */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke="#262626"
                strokeWidth="6"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${progressPercent * 3.01} 301`}
                className="transition-all duration-150"
              />
              <defs>
                <linearGradient
                  id="gaugeGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white tabular-nums">
                {Math.round(metrics.primary)}
              </span>
              <span className="text-[10px] text-neutral-500">
                {config.primaryUnit}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2">
            <Stat
              icon={<Gauge />}
              label={config.secondaryLabel}
              value={Math.round(metrics.secondary)}
              unit={config.secondaryUnit}
              color="blue"
            />
            <Stat
              icon={<Zap />}
              label={config.tertiaryLabel}
              value={Math.round(metrics.tertiary)}
              unit={config.tertiaryUnit}
              color="purple"
            />
            <Stat
              icon={<Activity />}
              label="Status"
              value={metrics.status}
              unit=""
              color="green"
              isText
            />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MiniGauge
          icon={<Cog />}
          label="Progress"
          value={metrics.progress}
          max={100}
          unit="%"
          color="green"
        />
        <MiniGauge
          icon={<Fuel />}
          label="Efficiency"
          value={metrics.efficiency}
          max={100}
          unit="%"
          color="amber"
        />
      </div>

      {/* Info */}
      <div className="bg-neutral-900/60 rounded-lg p-3 border border-neutral-800">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500">{config.title}</span>
          <span className="text-neutral-400">
            {shapeType.replace("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit: string;
  color: "blue" | "purple" | "green";
  isText?: boolean;
}> = ({ icon, label, value, unit, color, isText }) => {
  const colors = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    green: "text-green-400",
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 ${colors[color]}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-[10px] text-neutral-500">{label}</p>
        <p className={`text-sm font-medium ${colors[color]} tabular-nums`}>
          {isText ? value : `${value}${unit}`}
        </p>
      </div>
    </div>
  );
};

const MiniGauge: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  unit: string;
  color: "green" | "amber";
}> = ({ icon, label, value, max, unit, color }) => {
  const colors = {
    green: "from-green-500 to-emerald-500",
    amber: "from-amber-500 to-orange-500",
  };
  return (
    <div className="bg-neutral-900/60 rounded-lg p-3 border border-neutral-800">
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={color === "green" ? "text-green-400" : "text-amber-400"}
        >
          {icon}
        </div>
        <span className="text-[10px] text-neutral-500">{label}</span>
        <span className="ml-auto text-xs font-medium text-white">
          {value.toFixed(0)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colors[color]} rounded-full transition-all duration-200`}
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default SimulationDashboard;
