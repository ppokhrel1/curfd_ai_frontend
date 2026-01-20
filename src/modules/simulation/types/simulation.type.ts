/**
 * Simulation parameters - user configurable settings
 */
export interface SimulationParameters {
  timeStep: number;
  maxIterations: number;
  convergenceCriteria: number;
  turbulenceModel: string;
  meshQuality: 'coarse' | 'medium' | 'fine';
  solverType: 'steady' | 'transient';
  viscosity?: number;
  density?: number;
  temperature?: number;
  pressure?: number;
}

/**
 * Simulation state - current status of simulation
 */
export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  currentIteration: number;
  residuals: number;
  cpuTime: number;
  estimatedTimeRemaining: number;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Simulation metrics - real-time performance metrics
 */
export interface SimulationMetrics {
  convergence: number;
  courantNumber: number;
  massFlowRate: number;
  pressureDrop: number;
  maxVelocity: number;
  minPressure?: number;
  maxPressure?: number;
  avgTemperature?: number;
}

/**
 * Simulation result - final output
 */
export interface SimulationResult {
  id: string;
  timestamp: Date;
  parameters: SimulationParameters;
  metrics: SimulationMetrics;
  status: string;
  duration: number;
  iterations: number;
}

/**
 * Boundary condition types
 */
export type BoundaryConditionType =
  | 'velocity-inlet'
  | 'pressure-inlet'
  | 'mass-flow-inlet'
  | 'pressure-outlet'
  | 'wall'
  | 'symmetry'
  | 'periodic';

/**
 * Boundary condition
 */
export interface BoundaryCondition {
  id: string;
  name: string;
  type: BoundaryConditionType;
  surface: string;
  values: BoundaryConditionValues;
}

/**
 * Boundary condition values
 */
export interface BoundaryConditionValues {
  velocity?: number;
  pressure?: number;
  temperature?: number;
  massFlowRate?: number;
  turbulentIntensity?: number;
  turbulentViscosityRatio?: number;
}

/**
 * Mesh settings
 */
export interface MeshSettings {
  quality: 'coarse' | 'medium' | 'fine';
  cellCount: number;
  growthRate: number;
  minCellSize: number;
  maxCellSize: number;
  surfaceRefinement: number;
  boundaryLayers: number;
}

/**
 * Solver settings
 */
export interface SolverSettings {
  type: 'steady' | 'transient';
  scheme: 'first-order' | 'second-order';
  pressureCoupling: 'SIMPLE' | 'SIMPLEC' | 'PISO';
  underRelaxationFactors: {
    pressure: number;
    momentum: number;
    turbulence: number;
  };
  convergenceCriteria: {
    residuals: number;
    monitoring: string[];
  };
}

/**
 * Material properties
 */
export interface MaterialProperties {
  name: string;
  density: number;
  viscosity: number;
  specificHeat?: number;
  thermalConductivity?: number;
  molecularWeight?: number;
}

/**
 * Turbulence model settings
 */
export interface TurbulenceModelSettings {
  model: 'laminar' | 'k-epsilon' | 'k-omega' | 'SST' | 'LES' | 'DNS';
  wallFunction: 'standard' | 'enhanced' | 'scalable';
  yPlusTarget: number;
  turbulentIntensity: number;
  turbulentLengthScale: number;
}

/**
 * Simulation configuration - complete setup
 */
export interface SimulationConfig {
  name: string;
  description?: string;
  parameters: SimulationParameters;
  boundaryConditions: BoundaryCondition[];
  mesh: MeshSettings;
  solver: SolverSettings;
  material: MaterialProperties;
  turbulence: TurbulenceModelSettings;
}

/**
 * Residual history
 */
export interface ResidualHistory {
  iteration: number;
  continuity: number;
  xVelocity: number;
  yVelocity: number;
  zVelocity: number;
  energy?: number;
  k?: number;
  epsilon?: number;
  omega?: number;
}

/**
 * Monitoring point
 */
export interface MonitoringPoint {
  id: string;
  name: string;
  position: [number, number, number];
  variables: string[];
  history: MonitoringPointData[];
}

/**
 * Monitoring point data
 */
export interface MonitoringPointData {
  iteration: number;
  time: number;
  values: Record<string, number>;
}

/**
 * Convergence criteria
 */
export interface ConvergenceCriteria {
  residualTarget: number;
  monitoringVariables: string[];
  stabilizationIterations: number;
  maxIterations: number;
}

/**
 * Post-processing options
 */
export interface PostProcessingOptions {
  computeForces: boolean;
  computeFlowRate: boolean;
  computeHeatTransfer: boolean;
  exportVTK: boolean;
  exportCSV: boolean;
  createImages: boolean;
  createAnimations: boolean;
}