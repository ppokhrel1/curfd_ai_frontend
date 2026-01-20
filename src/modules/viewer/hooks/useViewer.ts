import { useCallback, useEffect, useState } from 'react';
import { ViewerState, ViewerStats } from '../types/viewer.type';

const initialState: ViewerState = {
  showGrid: true,
  wireframe: false,
  showAxes: true,
  autoRotate: false,
  backgroundColor: '#0a0a0a',
};

const initialStats: ViewerStats = {
  vertices: 2450,
  faces: 4820,
  triangles: 2450,
  materials: 2,
  fps: 60,
  drawCalls: 3,
};

export const useViewer = () => {
  const [state, setState] = useState<ViewerState>(initialState);
  const [stats, setStats] = useState<ViewerStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle functions with smooth state updates
  const toggleGrid = useCallback(() => {
    setState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleWireframe = useCallback(() => {
    setState((prev) => ({ ...prev, wireframe: !prev.wireframe }));
  }, []);

  const toggleAxes = useCallback(() => {
    setState((prev) => ({ ...prev, showAxes: !prev.showAxes }));
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setState((prev) => ({ ...prev, autoRotate: !prev.autoRotate }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const setBackgroundColor = useCallback((color: string) => {
    setState((prev) => ({ ...prev, backgroundColor: color }));
  }, []);

  // Update stats dynamically
  const updateStats = useCallback((newStats: Partial<ViewerStats>) => {
    setStats((prev) => ({ ...prev, ...newStats }));
  }, []);

  // Load model function
  const loadModel = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      // Simulate model loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update stats with new model data
      updateStats({
        vertices: Math.floor(Math.random() * 10000),
        faces: Math.floor(Math.random() * 20000),
        triangles: Math.floor(Math.random() * 10000),
        materials: Math.floor(Math.random() * 5) + 1,
      });
      
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  // Export model function
  const exportModel = useCallback(async (format: 'gltf' | 'obj' | 'stl' | 'fbx') => {
    try {
      // Implement export logic here
      console.log(`Exporting model as ${format}`);
      return true;
    } catch (error) {
      console.error('Error exporting model:', error);
      return false;
    }
  }, []);

  // Take screenshot
  const takeScreenshot = useCallback(async () => {
    try {
      // Implement screenshot logic
      console.log('Taking screenshot');
      return true;
    } catch (error) {
      console.error('Error taking screenshot:', error);
      return false;
    }
  }, []);

  // Save viewer preferences to localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('viewer-preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        setState(prev => ({ ...prev, ...preferences }));
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []);

  // Save preferences when state changes
  useEffect(() => {
    const preferencesToSave = {
      showGrid: state.showGrid,
      showAxes: state.showAxes,
      backgroundColor: state.backgroundColor,
    };
    localStorage.setItem('viewer-preferences', JSON.stringify(preferencesToSave));
  }, [state.showGrid, state.showAxes, state.backgroundColor]);

  return {
    state,
    stats,
    isLoading,
    toggleGrid,
    toggleWireframe,
    toggleAxes,
    toggleAutoRotate,
    reset,
    setBackgroundColor,
    updateStats,
    loadModel,
    exportModel,
    takeScreenshot,
  };
};