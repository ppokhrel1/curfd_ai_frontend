export const APP_CONFIG = {
  name: 'CURFD AI',
  version: '1.0.0',
  description: 'Advanced CFD simulation and AI-powered analysis platform',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
} as const;

export const ROUTES = {
  LANDING: '/',
  SIGNIN: '/signin',
  SIGNUP: '/signup',
  HOME: '/home',
  CHAT: '/chat',
  VIEWER: '/viewer',
  SIMULATION: '/simulation',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'curfd_auth_token',
  USER_DATA: 'curfd_user_data',
  THEME: 'curfd_theme',
} as const;

export const SIMULATION_DEFAULTS = {
  timeStep: 0.001,
  maxIterations: 1000,
  convergenceCriteria: 1e-6,
  turbulenceModel: 'k-epsilon',
} as const;

export const VIEWER_CONTROLS = {
  Rotate: "Left Click + Drag",
  Pan: "Right Click + Drag",
  Zoom: "Scroll Wheel",
  Reset: "Double Click",
} as const;

export const EXPORT_FORMATS = [
  { value: 'gltf', label: 'GLTF (.gltf)', binary: false },
  { value: 'glb', label: 'GLB (.glb)', binary: true },
  { value: 'obj', label: 'OBJ (.obj)', binary: false },
  { value: 'stl', label: 'STL (.stl)', binary: true },
  { value: 'fbx', label: 'FBX (.fbx)', binary: true },
] as const;

export const BACKGROUND_PRESETS = [
  { name: 'Dark', color: '#0a0a0a' },
  { name: 'Neutral', color: '#1f2937' },
  { name: 'Light', color: '#f3f4f6' },
  { name: 'Blue', color: '#1e3a8a' },
  { name: 'Purple', color: '#581c87' },
] as const;

export const GRID_SETTINGS = {
  size: 20,
  divisions: 20,
  cellSize: 1,
  sectionSize: 5,
  fadeDistance: 30,
} as const;

export const CAMERA_SETTINGS = {
  fov: 50,
  near: 0.1,
  far: 1000,
  minDistance: 2,
  maxDistance: 50,
  defaultPosition: [5, 5, 5] as [number, number, number],
} as const;

export const PERFORMANCE_THRESHOLDS = {
  fps: {
    excellent: 60,
    good: 30,
    poor: 15,
  },
  triangles: {
    low: 10000,
    medium: 50000,
    high: 100000,
  },
} as const;


export const MODEL_VALIDATION = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFormats: ['.gltf', '.glb', '.obj', '.fbx', '.stl'],
  maxVertices: 1000000,
  maxTriangles: 500000,
} as const;

export const AI_SUGGESTIONS = [
  "Generate a 6-DOF robotic arm with gripper",
  "Create a sports car model with animations",
  "Design a modern ergonomic office chair",
  "Help me optimize mesh quality for CFD",
  "Explain turbulence modeling for my simulation",
  "Generate industrial conveyor system",
] as const;