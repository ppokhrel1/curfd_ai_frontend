import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { ROUTES } from "@/lib/constants";
import { ParameterPanel } from "@/modules/simulation/components/ParameterPanel";
import { ProgressBar } from "@/modules/simulation/components/ProgressBar";
import { StatusBar } from "@/modules/simulation/components/StatusBar";
import { useSimulation } from "@/modules/simulation/hooks/useSimulation";
import { Home, Pause, Play, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

const SimulationPage: React.FC = () => {
  const { parameters, state, metrics, setParameters, start, pause, reset } =
    useSimulation();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-white">CFD Simulation</h1>
            <div className="h-6 w-px bg-neutral-700" />
            <span className="text-sm text-neutral-400">Airfoil Analysis</span>
          </div>
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Control Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Simulation Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6">
                    {state.status === "idle" || state.status === "paused" ? (
                      <button
                        onClick={start}
                        disabled={state.status === "completed"}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-neutral-700 disabled:to-neutral-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg shadow-green-500/25"
                      >
                        <Play className="w-4 h-4" />
                        {state.status === "paused" ? "Resume" : "Start"}
                      </button>
                    ) : (
                      <button
                        onClick={pause}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-yellow-500/25"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-6 py-3 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  </div>

                  {/* Progress */}
                  <ProgressBar
                    progress={state.progress}
                    status={state.status}
                    currentIteration={state.currentIteration}
                    maxIterations={parameters.maxIterations}
                  />

                  <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
                    <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                      <p className="text-neutral-400 mb-1">Iteration</p>
                      <p className="text-2xl font-bold text-white">
                        {state.currentIteration}
                      </p>
                    </div>
                    <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                      <p className="text-neutral-400 mb-1">Max Iterations</p>
                      <p className="text-2xl font-bold text-white">
                        {parameters.maxIterations}
                      </p>
                    </div>
                    <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                      <p className="text-neutral-400 mb-1">Status</p>
                      <p
                        className={`text-2xl font-bold ${
                          state.status === "running"
                            ? "text-green-400"
                            : state.status === "completed"
                            ? "text-blue-400"
                            : "text-neutral-400"
                        }`}
                      >
                        {state.status.charAt(0).toUpperCase() +
                          state.status.slice(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Convergence Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatusBar
                    metrics={metrics}
                    cpuTime={state.cpuTime}
                    estimatedTimeRemaining={state.estimatedTimeRemaining}
                  />

                  {/* Residual Chart Placeholder */}
                  <div className="mt-6 bg-neutral-900/30 border border-neutral-800 rounded-xl p-6 h-48 flex items-center justify-center">
                    <p className="text-neutral-500">
                      Residual convergence chart
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings Panel */}
            <div>
              <ParameterPanel
                parameters={parameters}
                onChange={setParameters}
                disabled={state.status === "running"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;
