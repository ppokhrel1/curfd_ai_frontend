export type ShapeType =
  | "robotic_arm"
  | "car"
  | "furniture"
  | "industrial"
  | "generic";

export interface ModelSpecification {
  model_name?: string;
  model_type?: string;
  description?: string;
  parts?: ModelPart[];
  joints?: ModelJoint[];
  parameters?: Record<string, any>;
  assembly_notes?: string;
}

export interface ModelPart {
  id: string;
  name: string;
  category: string;
  role: string;
  dimensions?: { length: number; width: number; height: number };
  mass?: number;
  mesh_file?: string;
  mesh_format?: string;
  placement?: { x: number; y: number; z: number };
}

export interface ModelJoint {
  name: string;
  type: string;
  parent: string;
  child: string;
  axis?: string;
}

export interface GenerationMetrics {
  total_time?: number;
  stages?: Record<string, number>;
}

export interface GeneratedShape {
  id: string;
  type: ShapeType;
  name: string;
  description: string;
  hasSimulation: boolean;
  geometry: any;
  createdAt: Date;
  // ML service response data
  assetId?: string;
  jobId?: string; // Associated backend job for restoration
  assets?: { filename: string; url: string }[];
  sdfUrl?: string; // URL to model.sdf for 3D loading
  yamlUrl?: string; // URL to model.yaml config
  scadCode?: string; // OpenSCAD source code
  specification?: ModelSpecification;
  requirements?: Record<string, any>;
  metrics?: GenerationMetrics;
}
