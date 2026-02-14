
export type ViewMode = 'chat-viewer' | 'simulation' | 'editor';
export type MobilePanel = 'chat' | 'viewer';

export interface ModelStats {
  triangles: number;
  vertices: number;
  faces: number;
  materials: number;
  fps: number;
  drawCalls: number;
}