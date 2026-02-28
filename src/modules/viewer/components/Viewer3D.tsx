import { proxifyUrl } from "@/lib/apiConfig";
import { useChatStore } from "@/modules/ai/stores/chatStore";
import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import { useAssemblyStore } from "@/modules/viewer/stores/assemblyStore";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Layers,
  Maximize2,
  Play,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as THREE from "three";
import { useViewer } from "../hooks/useViewer";
import type { Asset } from "../services/assetService";
import { ModelExporter } from "../services/ModelExporter";
import { AssetSwapPanel } from "./AssetSwapPanel";
import { AssemblyTree } from "./AssemblyTree";
import { ControlsHint } from "./ControlsHint";
import { MissionControl } from "./MissionControl";
import { ModelSidebar } from "./ModelSidebar";
import { ObjectPartsPanel } from "./ObjectPartsPanel";
import { StatsDisplay } from "./StatsDisplay";
import { Toolbar } from "./Toolbar";
import { ViewerCanvas, type PartTransform } from "./ViewerCanvas";

interface Viewer3DProps {
  shape?: GeneratedShape | null;
  loadedModel?: THREE.Group | null;
  customStats?: Partial<{
    triangles: number;
    vertices: number;
    faces: number;
    materials: number;
  }>;
  onOpenSimulation?: () => void;
  onImportModel?: () => void;
  onSwapPart?: (partId: string, asset: Asset) => void;
  onAddToAssembly?: (shape: GeneratedShape, jobId: string) => void;
  className?: string;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({
  shape,
  loadedModel,
  customStats,
  onOpenSimulation,
  onImportModel,
  onSwapPart,
  onAddToAssembly,
  className = "",
}) => {
  const { activeConversationId } = useChatStore();

  const {
    state,
    stats: viewerStats,
    toggleWireframe,
    toggleAxes,
    toggleAutoRotate,
    reset,
  } = useViewer();

  const stats = customStats ? { ...viewerStats, ...customStats } : viewerStats;

  const assemblyParts = useAssemblyStore(s => s.parts);

  const handleRenderCombined = useCallback((scad: string) => {
    useEditorStore.getState().setCode(scad);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "parts" | "history" | "assembly" | "swap" | null
  >(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedAssemblyPartId, setSelectedAssemblyPartId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale" | null>(null);
  const [swappingPartId, setSwappingPartId] = useState<string | null>(null);
  const [highlightedParts, setHighlightedParts] = useState<Set<string>>(new Set());
  const [partTransforms, setPartTransforms] = useState<Record<string, PartTransform>>({});

  const exporter = useMemo(() => new ModelExporter(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { toast.error("Viewer not ready"); return; }
    // R3F preserveDrawingBuffer is not set, so we need to trigger a render first.
    // The simplest approach: capture synchronously on next animation frame.
    requestAnimationFrame(() => {
      canvas.toBlob((blob) => {
        if (!blob) { toast.error("Screenshot failed"); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${shape?.name || "model"}-screenshot.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Screenshot saved!");
      }, "image/png");
    });
  }, [shape]);

  const handleShare = useCallback(async () => {
    const modelName = shape?.name || "3D Model";
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: modelName, text: `Check out this 3D model: ${modelName}`, url });
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
      return;
    }
    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Could not copy link");
    }
  }, [shape]);

  const handleExport = async () => {
    const hasAssembly = assemblyParts.length > 0;
    if (!loadedModel && !shape && !hasAssembly) { toast.error("No model to export"); return; }
    const toastId = toast.loading("Preparing export package...");
    try {
      if (hasAssembly) {
        // Merge all visible assembly parts into a combined group for export
        const mergedGroup = new THREE.Group();
        for (const part of assemblyParts) {
          if (!part.visible || !part.model) continue;
          const clone = part.model.clone();
          const [rx, ry, rz] = part.rotation.map(d => (d * Math.PI) / 180);
          clone.position.set(part.position[0], part.position[1], part.position[2]);
          clone.rotation.set(rx, ry, rz);
          mergedGroup.add(clone);
        }
        const zipBlob = await exporter.exportToZip(mergedGroup, "assembly");
        exporter.downloadZip(zipBlob, "assembly.zip");
        toast.success(`Assembly exported (${assemblyParts.filter(p => p.visible && p.model).length} parts)`, { id: toastId });
        return;
      }
      if (!loadedModel) {
        toast.error("AI Generated placeholders cannot be exported yet.", { id: toastId });
        return;
      }
      const zipBlob = await exporter.exportToZip(
        loadedModel,
        shape?.name || "curfd-model",
        shape?.assets?.map((a) => ({ ...a, url: proxifyUrl(a.url) })),
        shape?.geometry
      );
      exporter.downloadZip(zipBlob, `${shape?.name || "model"}.zip`);
      toast.success("Model exported successfully!", { id: toastId });
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export model", { id: toastId });
    }
  };

  const handleSimulation = () => {
    if (onOpenSimulation) { onOpenSimulation(); return; }
    toast("Simulation module is Coming Soon!", {
      icon: "🚀",
      style: { borderRadius: "12px", background: "#171717", color: "#fff", border: "1px solid #262626" },
    });
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  const handleRecallAsset = useCallback((recalledShape: GeneratedShape) => {
    if (!activeConversationId) return;
    useChatStore.getState().updateConversation(activeConversationId, { generatedShape: recalledShape });
    setActivePanel("parts");
  }, [activeConversationId]);

  const handleToggleHighlight = useCallback((partId: string) => {
    setHighlightedParts((prev) => {
      const n = new Set(prev);
      if (n.has(partId)) n.delete(partId); else n.add(partId);
      return n;
    });
  }, []);

  const handlePartTransformChange = useCallback((partId: string, transform: PartTransform) => {
    setPartTransforms(prev => ({ ...prev, [partId]: transform }));
  }, []);

  const handleResetPartTransform = useCallback((partId: string) => {
    setPartTransforms(prev => {
      const next = { ...prev };
      delete next[partId];
      return next;
    });
  }, []);

  const handleInitiateSwap = (partId: string) => {
    setSwappingPartId(partId);
    setActivePanel("swap");
  };

  const handleCompleteSwap = (asset: Asset) => {
    if (swappingPartId && onSwapPart) onSwapPart(swappingPartId, asset);
    setActivePanel("parts");
    setSwappingPartId(null);
  };

  const handlePartSelection = (partId: string | null) => {
    setSelectedPart(partId);
    if (partId) setActivePanel("parts");
    else if (activePanel === "parts") setActivePanel(null);
  };

  const handleSelectAssemblyPart = useCallback((id: string) => {
    setSelectedAssemblyPartId(prev => prev === id ? null : id);
  }, []);

  const handleAssemblyTransformChange = useCallback((
    id: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ) => {
    useAssemblyStore.getState().updateTransform(id, position, rotation);
    // Reflect updated SCAD in the editor without triggering auto-compile
    const combined = useAssemblyStore.getState().generateCombinedScad();
    if (combined) useEditorStore.getState().setCodeSilent(combined);
  }, []);

  // Add the currently-loaded model directly into the assembly (no extra fetch needed)
  const handleAddCurrentToAssembly = useCallback(() => {
    if (!shape) return;
    const store = useAssemblyStore.getState();
    const id = store.addPart(shape, "current");
    if (loadedModel) {
      store.updatePartModel(id, loadedModel.clone());
    } else if (onAddToAssembly) {
      // loadedModel not available yet — fallback to the normal flow
      onAddToAssembly(shape, "current");
    }
    setActivePanel("assembly");
    toast.success(`"${shape.name}" added to assembly`);
  }, [shape, loadedModel, onAddToAssembly]);

  const togglePanel = (panel: typeof activePanel) =>
    setActivePanel(prev => (prev === panel ? null : panel));

  return (
    <div className={`relative h-full bg-neutral-950 overflow-hidden ${className}`}>
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <ViewerCanvas
          state={state}
          shape={shape}
          loadedModel={loadedModel}
          selectedPart={selectedPart}
          onSelectPart={handlePartSelection}
          highlightedParts={highlightedParts}
          transformMode={transformMode}
          assemblyParts={assemblyParts}
          selectedAssemblyPartId={selectedAssemblyPartId}
          onSelectAssemblyPart={handleSelectAssemblyPart}
          onAssemblyTransformChange={handleAssemblyTransformChange}
          onPartTransformChange={handlePartTransformChange}
          partTransforms={partTransforms}
          onCanvasReady={(c) => { canvasRef.current = c; }}
        />
      </div>

      {/* Top Left: Toolbar */}
      <div className="absolute top-3 left-3 z-10">
        <Toolbar
          state={state}
          onToggleWireframe={toggleWireframe}
          onToggleAxes={toggleAxes}
          onToggleAutoRotate={toggleAutoRotate}
          onReset={reset}
          hasModel={!!loadedModel}
          transformMode={transformMode}
          onSetTransformMode={setTransformMode}
        />
      </div>

      {/* Top Right: Stats */}
      <div className="absolute top-3 right-3 z-10">
        <StatsDisplay fps={stats.fps} triangles={stats.triangles} drawCalls={stats.drawCalls} />
      </div>

      {/* Center Top: Model Name */}
      {shape && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-full px-3 py-1 flex items-center gap-2">
            <Box className="w-3 h-3 text-green-400" />
            <span className="text-xs text-white font-medium">{shape.name}</span>
          </div>
          {/* Quick "add to assembly" pill */}
          <button
            onClick={handleAddCurrentToAssembly}
            title="Add this model to Assembly"
            className="flex items-center gap-1 bg-purple-600/80 hover:bg-purple-500 backdrop-blur-sm border border-purple-500/30 rounded-full px-2.5 py-1 text-[10px] font-bold text-white transition-all"
          >
            <Plus className="w-2.5 h-2.5" />
            Assembly
          </button>
        </div>
      )}

      {/* Left panels */}
      {/* Mission Control Panel */}
      {activeConversationId && activePanel === "history" && (
        <div className="absolute top-16 left-3 z-30 w-80 h-3/4 animate-in fade-in slide-in-from-left-2 duration-150">
          <MissionControl
            chatId={activeConversationId}
            onRecallAsset={handleRecallAsset}
            onAddToAssembly={(s, j) => { onAddToAssembly?.(s, j); setActivePanel("assembly"); }}
            onRenderCombined={handleRenderCombined}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}

      {/* Feature Tree / Assembly panel */}
      {activePanel === "assembly" && (
        <div className="absolute top-16 left-3 z-30 w-72 h-3/4 animate-in fade-in slide-in-from-left-2 duration-150">
          <AssemblyTree
            onAddCurrentToAssembly={handleAddCurrentToAssembly}
            hasCurrentModel={!!loadedModel}
            onRenderCombined={handleRenderCombined}
            onClose={() => setActivePanel(null)}
            selectedPartId={selectedAssemblyPartId}
            onSelectPart={handleSelectAssemblyPart}
          />
        </div>
      )}

      {/* Parts Panel */}
      {shape && activePanel === "parts" && (
        <div className="absolute top-16 left-3 z-20 w-56 animate-in fade-in slide-in-from-left-2 duration-150">
          <ObjectPartsPanel
            shape={shape}
            selectedPart={selectedPart}
            onSelectPart={handlePartSelection}
            highlightedParts={highlightedParts}
            onToggleHighlight={handleToggleHighlight}
            onSwapPart={handleInitiateSwap}
            partTransforms={partTransforms}
            onResetPartTransform={handleResetPartTransform}
          />
        </div>
      )}

      {/* Asset Swap Panel */}
      {activePanel === "swap" && swappingPartId && (
        <div className="absolute top-16 left-3 z-20 w-80 h-[400px] animate-in fade-in slide-in-from-left-2 duration-150">
          <AssetSwapPanel
            currentPartName={shape?.geometry.parts.find((p: any) => p.id === swappingPartId)?.name || "Part"}
            onSelectAsset={handleCompleteSwap}
            onClose={() => setActivePanel("parts")}
          />
        </div>
      )}

      {/* Bottom Left: Hints */}
      <div className="absolute bottom-16 left-3 z-10">
        <ControlsHint />
      </div>

      {/* Bottom Center: Action Bar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1.5 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl p-1.5 shadow-xl">
          <ActionBtn icon={<Upload />} label="Import" onClick={onImportModel} />

          {/* Assembly button — always visible once there are parts, or when a model is loaded */}
          <ActionBtnBadge
            icon={<Layers />}
            label="Feature Tree"
            active={activePanel === "assembly"}
            badge={assemblyParts.length > 0 ? assemblyParts.length : undefined}
            onClick={() => togglePanel("assembly")}
          />

          {shape && (
            <>
              <ActionBtn
                icon={<History />}
                label="Mission Control"
                active={activePanel === "history"}
                onClick={() => togglePanel("history")}
              />
              <ActionBtn
                icon={<Box />}
                label="Parts"
                active={activePanel === "parts"}
                onClick={() => togglePanel("parts")}
              />
            </>
          )}

          {shape?.hasSimulation && (
            <button
              onClick={handleSimulation}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg text-xs"
            >
              <Play className="w-3 h-3" />
              Simulate
            </button>
          )}

          <div className="w-px h-6 bg-neutral-700" />

          <ActionBtn icon={<RotateCcw />} label="Reset" onClick={reset} />
          <ActionBtn icon={<Download />} label="Export" onClick={handleExport} />
          <ActionBtn icon={<Maximize2 />} label="Full" onClick={handleFullscreen} />
        </div>
      </div>

      {/* Right Edge: Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-20 w-5 h-14 bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-all ${
          isSidebarOpen ? "right-64 rounded-l-lg border-r-0" : "right-0 rounded-l-lg"
        }`}
      >
        {isSidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Right: Stats Sidebar */}
      <div className={`absolute top-0 right-0 bottom-0 w-64 bg-neutral-950/95 border-l border-neutral-800 z-10 transition-transform duration-200 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-full overflow-y-auto p-4 pt-6 scrollbar-thin scrollbar-thumb-neutral-700">
          <ModelSidebar stats={stats} shape={shape} onExport={handleExport} onScreenshot={handleScreenshot} onShare={handleShare} />
        </div>
      </div>

      {/* Empty State */}
      {!shape && assemblyParts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 bg-neutral-900 rounded-2xl flex items-center justify-center border border-neutral-800">
                <Box className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Model</h3>
            <p className="text-neutral-500 text-sm mb-4">Generate or import a model</p>
            <button
              onClick={onImportModel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm pointer-events-auto"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Action button helpers ─────────────────────────────────────────────────────

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors relative group ${
      active ? "bg-purple-500/20 text-purple-400" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
    }`}
    title={label}
  >
    <div className="w-4 h-4">{icon}</div>
  </button>
);

const ActionBtnBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}> = ({ icon, label, active, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors relative group ${
      active ? "bg-purple-500/20 text-purple-400" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
    }`}
    title={label}
  >
    <div className="w-4 h-4">{icon}</div>
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-purple-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </button>
);
