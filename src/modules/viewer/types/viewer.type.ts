import * as THREE from 'three';

/**
 * Viewer state interface - controls viewer display settings
 */
export interface ViewerState {
  showGrid: boolean;
  wireframe: boolean;
  showAxes: boolean;
  autoRotate: boolean;
  backgroundColor: string;
  simState?: 'idle' | 'running' | 'paused' | 'completed';
}

/**
 * Model data structure
 */
export interface ModelData {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

/**
 * Viewer statistics
 */
export interface ViewerStats {
  vertices: number;
  faces: number;
  triangles: number;
  materials: number;
  fps?: number;
  drawCalls?: number;
}

/**
 * Camera position
 */
export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Viewer controls help text
 */
export interface ViewerControls {
  rotate: string;
  pan: string;
  zoom: string;
  reset: string;
}

/**
 * Material settings
 */
export interface MaterialSettings {
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  transparent: boolean;
  wireframe: boolean;
}

/**
 * Lighting configuration
 */
export interface LightingConfig {
  ambientIntensity: number;
  directionalIntensity: number;
  pointLightIntensity: number;
  hemisphereIntensity: number;
}

/**
 * Scene settings
 */
export interface SceneSettings {
  backgroundColor: string;
  fog: boolean;
  fogDensity: number;
  gridSize: number;
  gridDivisions: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'gltf' | 'obj' | 'stl' | 'fbx';
  binary: boolean;
  includeTextures: boolean;
  scale: number;
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  name: string;
  description?: string;
  author?: string;
  created: Date;
  modified: Date;
  fileSize?: number;
  format?: string;
  tags?: string[];
}