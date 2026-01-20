import { Activity, Fuel, Gauge, Thermometer, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CarSimulationProps {
  isRunning: boolean;
  isPaused: boolean;
  onMetricsUpdate?: (metrics: CarMetrics) => void;
}

export interface CarMetrics {
  speed: number; // km/h
  rpm: number;
  fuel: number; // percentage
  distance: number; // km
  engineTemp: number; // celsius
  power: number; // kW
  torque: number; // Nm
  gear: number;
  throttle: number;
}

export const CarSimulation: React.FC<CarSimulationProps> = ({
  isRunning,
  isPaused,
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<CarMetrics>({
    speed: 0,
    rpm: 800,
    fuel: 100,
    distance: 0,
    engineTemp: 85,
    power: 0,
    torque: 0,
    gear: 0,
    throttle: 0,
  });

  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  // Simulation loop
  const simulate = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = timestamp;

      setMetrics((prev) => {
        // Gradually increase throttle
        const targetThrottle = 0.7 + Math.sin(timestamp / 5000) * 0.3;
        const throttle =
          prev.throttle + (targetThrottle - prev.throttle) * 0.02;

        // Calculate engine RPM based on throttle
        const targetRPM = 800 + throttle * 6200;
        const rpm = prev.rpm + (targetRPM - prev.rpm) * 0.05;

        // Determine gear based on speed
        let gear = 0;
        if (prev.speed < 20) gear = 1;
        else if (prev.speed < 45) gear = 2;
        else if (prev.speed < 75) gear = 3;
        else if (prev.speed < 110) gear = 4;
        else if (prev.speed < 150) gear = 5;
        else gear = 6;

        // Calculate speed based on RPM and gear
        const gearRatios = [0, 3.5, 2.1, 1.4, 1.0, 0.8, 0.65];
        const maxSpeed = 220;
        const targetSpeed = Math.min(
          ((rpm / 7000) * maxSpeed) / gearRatios[gear],
          maxSpeed
        );
        const speed = prev.speed + (targetSpeed - prev.speed) * 0.03;

        // Calculate power and torque
        const power = (rpm * throttle * 350) / 7000; // Max 350 kW
        const torque = (power * 9549) / Math.max(rpm, 1);

        // Fuel consumption (more at higher throttle/speed)
        const fuelConsumption = (throttle * 0.005 + speed * 0.0001) * deltaTime;
        const fuel = Math.max(0, prev.fuel - fuelConsumption);

        // Distance traveled
        const distance = prev.distance + (speed / 3600) * deltaTime;

        // Engine temperature (rises with high RPM)
        const targetTemp = 85 + (rpm / 7000) * 20 + throttle * 10;
        const engineTemp =
          prev.engineTemp + (targetTemp - prev.engineTemp) * 0.01;

        const newMetrics = {
          speed,
          rpm,
          fuel,
          distance,
          engineTemp,
          power,
          torque,
          gear,
          throttle,
        };

        onMetricsUpdate?.(newMetrics);
        return newMetrics;
      });

      animationRef.current = requestAnimationFrame(simulate);
    },
    [onMetricsUpdate]
  );

  useEffect(() => {
    if (isRunning && !isPaused) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(simulate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isPaused, simulate]);

  // Reset on stop
  useEffect(() => {
    if (!isRunning) {
      setMetrics({
        speed: 0,
        rpm: 800,
        fuel: 100,
        distance: 0,
        engineTemp: 85,
        power: 0,
        torque: 0,
        gear: 0,
        throttle: 0,
      });
    }
  }, [isRunning]);

  // Calculate estimated range
  const fuelEfficiency = 12; // km per 1% fuel
  const estimatedRange = metrics.fuel * fuelEfficiency;

  return (
    <div className="space-y-4">
      {/* Speedometer - Main Display */}
      <div className="relative bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-6 border border-neutral-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />

        <div className="relative flex items-center justify-center">
          {/* Speed Circle */}
          <div className="relative w-40 h-40">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#262626"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#speedGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(metrics.speed / 220) * 440} 440`}
                className="transition-all duration-100"
              />
              <defs>
                <linearGradient
                  id="speedGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>

            {/* Speed Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white tabular-nums">
                {Math.round(metrics.speed)}
              </span>
              <span className="text-xs text-neutral-400">km/h</span>
            </div>
          </div>

          {/* Side Stats */}
          <div className="ml-6 space-y-3">
            <StatItem
              icon={<Gauge />}
              label="RPM"
              value={Math.round(metrics.rpm)}
              unit=""
              color="blue"
            />
            <StatItem
              icon={<Zap />}
              label="Power"
              value={Math.round(metrics.power)}
              unit="kW"
              color="purple"
            />
            <StatItem
              icon={<Activity />}
              label="Gear"
              value={metrics.gear}
              unit=""
              color="green"
            />
          </div>
        </div>
      </div>

      {/* Secondary Gauges */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fuel Gauge */}
        <div className="bg-neutral-900/80 rounded-xl p-4 border border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-neutral-400">Fuel</span>
            <span className="ml-auto text-sm font-medium text-white">
              {metrics.fuel.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                metrics.fuel > 30
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : metrics.fuel > 15
                  ? "bg-gradient-to-r from-orange-500 to-orange-400"
                  : "bg-gradient-to-r from-red-500 to-red-400 animate-pulse"
              }`}
              style={{ width: `${metrics.fuel}%` }}
            />
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Range: ~{Math.round(estimatedRange)} km
          </p>
        </div>

        {/* Temperature Gauge */}
        <div className="bg-neutral-900/80 rounded-xl p-4 border border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-red-400" />
            <span className="text-xs text-neutral-400">Engine</span>
            <span className="ml-auto text-sm font-medium text-white">
              {Math.round(metrics.engineTemp)}°C
            </span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                metrics.engineTemp < 100
                  ? "bg-gradient-to-r from-blue-500 to-green-500"
                  : metrics.engineTemp < 115
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                  : "bg-gradient-to-r from-orange-500 to-red-500"
              }`}
              style={{ width: `${(metrics.engineTemp / 130) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            {metrics.engineTemp < 100
              ? "Normal"
              : metrics.engineTemp < 115
              ? "Warning"
              : "Critical!"}
          </p>
        </div>
      </div>

      {/* Trip Info */}
      <div className="bg-neutral-900/80 rounded-xl p-4 border border-neutral-800">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-neutral-400">Distance</p>
            <p className="text-lg font-semibold text-white">
              {metrics.distance.toFixed(2)} km
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400">Torque</p>
            <p className="text-lg font-semibold text-purple-400">
              {Math.round(metrics.torque)} Nm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: "blue" | "purple" | "green";
}> = ({ icon, label, value, unit, color }) => {
  const colors = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    green: "text-green-400",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] text-neutral-500">{label}</p>
        <p className={`text-sm font-semibold ${colors[color]} tabular-nums`}>
          {value}
          {unit && <span className="text-xs ml-0.5">{unit}</span>}
        </p>
      </div>
    </div>
  );
};

export default CarSimulation;
