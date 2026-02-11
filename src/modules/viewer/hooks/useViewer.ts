import { useCallback, useEffect, useState } from "react";
import type { ViewerState, ViewerStats } from "../types/viewer.type";

const initialState: ViewerState = {
  showGrid: true,
  wireframe: false,
  showAxes: true,
  autoRotate: false,
  backgroundColor: "#0a0a0a",
};

const initialStats: ViewerStats = {
  vertices: 0,
  faces: 0,
  triangles: 0,
  materials: 0,
  fps: 60,
  drawCalls: 0,
};

export const useViewer = () => {
  const [state, setState] = useState<ViewerState>(initialState);
  const [stats, setStats] = useState<ViewerStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);

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

  const updateStats = useCallback((newStats: Partial<ViewerStats>) => {
    setStats((prev) => ({ ...prev, ...newStats }));
  }, []);

  const loadModel = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await new Promise((resolve) => setTimeout(resolve, 500));

        return true;
      } catch (error) {
        console.error("Error loading model:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [updateStats]
  );

  const exportModel = useCallback(
    async (format: "gltf" | "obj" | "stl" | "fbx") => {
      try {
        console.log(`Exporting model as ${format}`);
        return true;
      } catch (error) {
        console.error("Error exporting model:", error);
        return false;
      }
    },
    []
  );

  const takeScreenshot = useCallback(async () => {
    try {
      console.log("Taking screenshot");
      return true;
    } catch (error) {
      console.error("Error taking screenshot:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    const savedPreferences = localStorage.getItem("viewer-preferences");
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        setState((prev) => ({ ...prev, ...preferences }));
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    }
  }, []);

  useEffect(() => {
    const preferencesToSave = {
      showGrid: state.showGrid,
      showAxes: state.showAxes,
      backgroundColor: state.backgroundColor,
    };
    localStorage.setItem(
      "viewer-preferences",
      JSON.stringify(preferencesToSave)
    );
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
