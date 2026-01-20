import { GeneratedShape } from "@/modules/ai/types/chat.type";
import { ViewerCanvas } from "@/modules/viewer/components/ViewerCanvas";
import { useViewer } from "@/modules/viewer/hooks/useViewer";
import {
    Activity,
    AlertCircle,
    Box,
    ChevronLeft,
    Pause,
    Play,
    RefreshCw,
    Settings,
    Square,
    TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SimulationState } from "../types/simulation.type";
import { SimulationDashboard, SimulationMetrics } from "./SimulationDashboard";

interface SimulationPanelProps {
  shape: GeneratedShape | null;
  loadedModel?: THREE.Group | null;
  onBack: () => void;
}

const defaultState: SimulationState = {
  status: "idle",
  progress: 0,
  currentIteration: 0,
  residuals: 1,
  cpuTime: 0,
  estimatedTimeRemaining: 0,
};

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  shape,
  loadedModel,
  onBack,
}) => {
  const { state: viewerState } = useViewer();
  const [simState, setSimState] = useState<SimulationState>(defaultState);
  const [activeTab, setActiveTab] = useState<"controls" | "results">(
    "controls"
  );
  const [simMetrics, setSimMetrics] = useState<SimulationMetrics | null>(null);

  const handleStart = useCallback(() => {
    setSimState({ ...defaultState, status: "running", startTime: new Date() });
    setSimMetrics(null);
  }, []);

  const handlePause = useCallback(() => {
    setSimState((prev) => ({ ...prev, status: "paused" }));
  }, []);

  const handleResume = useCallback(() => {
    setSimState((prev) => ({ ...prev, status: "running" }));
  }, []);

  const handleStop = useCallback(() => {
    setSimState(defaultState);
    setSimMetrics(null);
  }, []);

  // Auto-complete when progress reaches 100
  useEffect(() => {
    if (
      simMetrics &&
      simMetrics.progress >= 100 &&
      simState.status === "running"
    ) {
      setSimState((prev) => ({ ...prev, status: "completed" }));
    }
  }, [simMetrics, simState.status]);

  const isRunning = simState.status === "running";
  const isPaused = simState.status === "paused";
  const isCompleted = simState.status === "completed";
  const isIdle = simState.status === "idle";

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-blue-500/20">
                <Box className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-white font-medium text-sm">
                  {shape?.name || "Model"}
                </h1>
                <p className="text-[10px] text-neutral-500 capitalize">
                  {shape?.type.replace("_", " ")} Simulation
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {isIdle && (
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg text-xs"
              >
                <Play className="w-3 h-3" />
                Start Flight Test
              </button>
            )}
            {isRunning && (
              <>
                <button
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs border border-amber-500/30"
                >
                  <Pause className="w-3 h-3" />
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs border border-red-500/30"
                >
                  <Square className="w-3 h-3" />
                </button>
              </>
            )}
            {isPaused && (
              <>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs border border-green-500/30"
                >
                  <Play className="w-3 h-3" />
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs border border-red-500/30"
                >
                  <Square className="w-3 h-3" />
                </button>
              </>
            )}
            {isCompleted && (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: 3D Viewer */}
        <div className="flex-1 relative bg-neutral-950">
          {shape ? (
            <ViewerCanvas 
              state={{ ...viewerState, simState: simState.status === 'error' ? 'idle' : simState.status }} 
              shape={shape} 
              loadedModel={loadedModel}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Box className="w-12 h-12 text-neutral-700" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <div
              className={`px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 text-xs ${
                isRunning
                  ? "bg-green-500/20 border border-green-500/30 text-green-400"
                  : isPaused
                  ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                  : isCompleted
                  ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                  : "bg-neutral-900/80 border border-neutral-700 text-neutral-400"
              }`}
            >
              <Activity
                className={`w-3 h-3 ${isRunning ? "animate-pulse" : ""}`}
              />
              <span className="font-medium">
                {isRunning
                  ? `${(simMetrics?.progress || 0).toFixed(0)}%`
                  : isPaused
                  ? "Paused"
                  : isCompleted
                  ? "Done"
                  : "Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls/Results Panel */}
        <div className="w-72 border-l border-neutral-800 bg-neutral-900/30 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActiveTab("controls")}
              className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors ${
                activeTab === "controls"
                  ? "text-green-400 border-b-2 border-green-400 bg-green-500/5"
                  : "text-neutral-500"
              }`}
            >
              <Settings className="w-3 h-3 inline mr-1" />
              Controls
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors ${
                activeTab === "results"
                  ? "text-green-400 border-b-2 border-green-400 bg-green-500/5"
                  : "text-neutral-500"
              }`}
            >
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Live
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-neutral-700">
            {activeTab === "controls" ? (
              <div className="space-y-3">
                <p className="text-[10px] text-neutral-500 mb-2">
                  CFD & Physics Parameters
                </p>
                <Slider
                  label="Gravity"
                  value={9.81}
                  min={0}
                  max={20}
                  unit="m/s²"
                />
                <Slider
                  label="Time Scale"
                  value={1.0}
                  min={0.1}
                  max={5}
                  unit="x"
                />
                <Slider
                  label="Accuracy"
                  value={80}
                  min={10}
                  max={100}
                  unit="%"
                />
                
                <div className="pt-2 border-t border-neutral-800">
                  <p className="text-[10px] text-neutral-500 mb-2">
                    Advanced Physics
                  </p>
                  {shape?.geometry?.physics ? (
                    <div className="space-y-3">
                      {Object.entries(shape.geometry.physics).map(([key, value]) => (
                        typeof value === 'number' && (
                          <Slider 
                            key={key}
                            label={key.replace(/_/g, ' ')} 
                            value={value} 
                            min={value / 2} 
                            max={value * 2 || 1} 
                            unit="" 
                          />
                        )
                      ))}
                    </div>
                  ) : shape?.type === 'robotic_arm' || shape?.type === 'industrial' ? (
                    <>
                      <Slider label="Joint Friction" value={0.5} min={0} max={1} unit="" />
                      <Slider label="Motor Damping" value={0.1} min={0} max={0.5} unit="" />
                      <Slider label="Max Torque" value={100} min={10} max={500} unit="Nm" />
                    </>
                  ) : shape?.type === 'car' ? (
                    <>
                      <Slider label="Tire Grip" value={0.8} min={0} max={1.5} unit="" />
                      <Slider label="Aero Drag" value={0.25} min={0} max={1} unit="Cd" />
                      <Slider label="Suspension Stiff" value={50} min={10} max={200} unit="N/m" />
                    </>
                  ) : (
                    <>
                      <Slider label="Mass Mult." value={1.0} min={0.1} max={10} unit="x" />
                      <Slider label="Surface Friction" value={0.6} min={0} max={1} unit="" />
                      <Slider label="Air Resistance" value={0.01} min={0} max={0.1} unit="" />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {(isRunning || isPaused) && shape ? (
                  <SimulationDashboard
                    shapeType={shape.type}
                    isRunning={isRunning}
                    isPaused={isPaused}
                    onMetricsUpdate={setSimMetrics}
                  />
                ) : isCompleted && simMetrics ? (
                  <div className="space-y-2">
                    <Result
                      label="Peak Value"
                      value={`${simMetrics.primary.toFixed(0)}`}
                      color="green"
                    />
                    <Result
                      label="Efficiency"
                      value={`${simMetrics.efficiency.toFixed(1)}%`}
                      color="blue"
                    />
                    <Result
                      label="Final Status"
                      value={simMetrics.status}
                      color="purple"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <AlertCircle className="w-8 h-8 text-neutral-600 mb-2" />
                    <p className="text-xs text-neutral-500">Start simulation</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
}> = ({ label, value, min, max, unit }) => (
  <div>
    <div className="flex justify-between text-[10px] mb-1">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-300">
        {value} {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={(max - min) / 100}
      defaultValue={value}
      className="w-full h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full"
    />
  </div>
);

const Result: React.FC<{
  label: string;
  value: string;
  color: "green" | "blue" | "purple";
}> = ({ label, value, color }) => {
  const colors = {
    green: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    purple: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  };
  return (
    <div
      className={`bg-gradient-to-r ${colors[color]} border rounded-lg p-2.5`}
    >
      <p className="text-[10px] text-neutral-400">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
};

export default SimulationPanel;
