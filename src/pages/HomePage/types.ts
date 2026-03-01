
export type ViewMode = 'chat-viewer' | 'simulation' | 'editor';
export type MobilePanel = 'chooser' | 'chat' | 'viewer' | 'editor';

export interface ModelStats {
  triangles: number;
  vertices: number;
  faces: number;
  materials: number;
  fps: number;
  drawCalls: number;
}