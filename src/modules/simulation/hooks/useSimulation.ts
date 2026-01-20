import { SIMULATION_DEFAULTS } from '@/lib/constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SimulationMetrics, SimulationParameters, SimulationState } from '../types/simulation.type';

const initialParameters: SimulationParameters = {
  timeStep: SIMULATION_DEFAULTS.timeStep,
  maxIterations: SIMULATION_DEFAULTS.maxIterations,
  convergenceCriteria: SIMULATION_DEFAULTS.convergenceCriteria,
  turbulenceModel: SIMULATION_DEFAULTS.turbulenceModel,
  meshQuality: 'medium',
  solverType: 'steady',
};

const initialState: SimulationState = {
  status: 'idle',
  progress: 0,
  currentIteration: 0,
  residuals: 1.0,
  cpuTime: 0,
  estimatedTimeRemaining: 0,
};

const initialMetrics: SimulationMetrics = {
  convergence: 1.0,
  courantNumber: 0,
  massFlowRate: 0,
  pressureDrop: 0,
  maxVelocity: 0,
};

export const useSimulation = () => {
  const [parameters, setParameters] = useState<SimulationParameters>(initialParameters);
  const [state, setState] = useState<SimulationState>(initialState);
  const [metrics, setMetrics] = useState<SimulationMetrics>(initialMetrics);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'running' }));
    
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const newIteration = prev.currentIteration + 10;
        const newProgress = (newIteration / parameters.maxIterations) * 100;
        const newCpuTime = prev.cpuTime + 0.5;
        const remaining = ((100 - newProgress) / 100) * (newCpuTime / (newProgress / 100));

        if (newProgress >= 100) {
          clearInterval(intervalRef.current!);
          return {
            ...prev,
            status: 'completed',
            progress: 100,
            currentIteration: parameters.maxIterations,
            cpuTime: newCpuTime,
            estimatedTimeRemaining: 0,
          };
        }

        return {
          ...prev,
          progress: newProgress,
          currentIteration: newIteration,
          cpuTime: newCpuTime,
          estimatedTimeRemaining: remaining,
        };
      });

      // Update metrics
      setMetrics((prev) => ({
        convergence: Math.max(0.000001, prev.convergence * 0.95),
        courantNumber: 0.5 + Math.random() * 0.5,
        massFlowRate: 1.2 + Math.random() * 0.3,
        pressureDrop: 100 + Math.random() * 50,
        maxVelocity: 10 + Math.random() * 10,
      }));
    }, 100);
  }, [parameters.maxIterations]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...prev, status: 'paused' }));
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(initialState);
    setMetrics(initialMetrics);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    parameters,
    state,
    metrics,
    setParameters,
    start,
    pause,
    reset,
  };
};