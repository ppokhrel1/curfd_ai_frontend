import { useChatStore } from "@/modules/ai/stores/chatStore";
import { GeneratedShape } from "@/modules/ai/types/chat.type";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  History,
  Layers,
  Maximize2,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import * as THREE from "three";
import { useViewer } from "../hooks/useViewer";
import { Asset } from "../services/assetService";
import { ModelExporter } from "../services/ModelExporter";
import { AssetSwapPanel } from "./AssetSwapPanel";
import { ControlsHint } from "./ControlsHint";
import { MissionControl } from "./MissionControl";
import { ModelSidebar } from "./ModelSidebar";
import { ObjectPartsPanel } from "./ObjectPartsPanel";
import { StatsDisplay } from "./StatsDisplay";
import { Toolbar } from "./Toolbar";
import { ViewerCanvas } from "./ViewerCanvas";

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
  className?: string;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({
  shape,
  loadedModel,
  customStats,
  onOpenSimulation,
  onImportModel,
  onSwapPart,
  className = "",
}) => {
  const { activeConversationId, generatingChatIds, generatingChatStatus } =
    useChatStore();
  const isGenerating = activeConversationId
    ? generatingChatIds.has(activeConversationId)
    : false;
  const currentStatus = activeConversationId
    ? generatingChatStatus[activeConversationId]
    : null;

  const {
    state,
    stats: viewerStats,

    toggleWireframe,
    toggleAxes,
    toggleAutoRotate,
    reset,
  } = useViewer();

  const stats = customStats ? { ...viewerStats, ...customStats } : viewerStats;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "parts" | "history" | "swap" | null
  >(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [swappingPartId, setSwappingPartId] = useState<string | null>(null);
  const [highlightedParts, setHighlightedParts] = useState<Set<string>>(
    new Set()
  );

  const exporter = useMemo(() => new ModelExporter(), []);

  const handleExport = async () => {
    if (!loadedModel && !shape) {
      toast.error("No model to export");
      return;
    }

    const toastId = toast.loading("Preparing export package...");
    try {
      const groupToExport = loadedModel;

      if (!groupToExport) {
        toast.error(
          "AI Generated placeholders cannot be exported yet. Please wait for real model generation.",
          { id: toastId }
        );
        return;
      }

      const proxify = (url: string) => {
        if (!url) return url;
        if (url.startsWith("blob:") || url.startsWith("data:")) return url;

        const hasToken = url.includes("token=");
        let normalizedUrl = url;

        if (url.includes("supabase.co")) {
          if (hasToken) {
            normalizedUrl = url.replace("/object/public/", "/object/sign/");
          } else {
            normalizedUrl = url.replace("/object/sign/", "/object/public/");
          }
        }

        if (normalizedUrl.includes("supabase.co") && hasToken) {
          return normalizedUrl;
        }

        try {
          const isMesh = normalizedUrl
            .toLowerCase()
            .match(/\.(stl|obj|glb|gltf|bin)$/);
          if (!isMesh && !normalizedUrl.includes("/object/sign/")) {
            return normalizedUrl;
          }

          const parsed = new URL(normalizedUrl);
          const protocol = parsed.protocol.replace(":", "");
          const host = parsed.host;

          const segments = parsed.pathname.substring(1).split("/");
          const encodedPath = segments
            .map((s) => encodeURIComponent(decodeURIComponent(s)))
            .join("/");

          const path = encodedPath + parsed.search;

          const API_BASE =
            window.location.origin.includes("localhost") ||
            window.location.origin.includes("127.0.0.1")
              ? "http://127.0.0.1:8000/api/v1"
              : `${window.location.origin}/api/v1`;

          return `${API_BASE}/proxy/${protocol}/${host}/${path}`;
        } catch (e) {
          return normalizedUrl;
        }
      };

      const zipBlob = await exporter.exportToZip(
        groupToExport,
        shape?.name || "curfd-model",
        shape?.assets?.map((a) => ({ ...a, url: proxify(a.url) })),
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
    if (onOpenSimulation) {
      onOpenSimulation();
      return;
    }
    toast("Simulation module is Coming Soon!", {
      icon: "🚀",
      style: {
        borderRadius: "12px",
        background: "#171717",
        color: "#fff",
        border: "1px solid #262626",
      },
    });
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const handleRecallAsset = useCallback(
    (recalledShape: GeneratedShape) => {
      if (!activeConversationId) return;

      const { updateConversation } = useChatStore.getState();
      updateConversation(activeConversationId, {
        generatedShape: recalledShape,
      });

      setActivePanel("parts");
    },
    [activeConversationId]
  );

  const handleToggleHighlight = useCallback((partId: string) => {
    setHighlightedParts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) newSet.delete(partId);
      else newSet.add(partId);
      return newSet;
    });
  }, []);

  const handleInitiateSwap = (partId: string) => {
    setSwappingPartId(partId);
    setActivePanel("swap");
  };

  const handleCompleteSwap = (asset: Asset) => {
    if (swappingPartId && onSwapPart) {
      onSwapPart(swappingPartId, asset);
    }
    setActivePanel("parts");
    setSwappingPartId(null);
  };

  const handlePartSelection = (partId: string | null) => {
    setSelectedPart(partId);
    if (partId) {
      setActivePanel("parts");
      if (!isSidebarOpen) setIsSidebarOpen(false);
    }
  };

  return (
    <div
      className={`relative h-full bg-neutral-950 overflow-hidden ${className}`}
    >
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <ViewerCanvas
          state={state}
          shape={shape}
          loadedModel={loadedModel}
          selectedPart={selectedPart}
          onSelectPart={handlePartSelection}
          highlightedParts={highlightedParts}
        />
      </div>

      {/* Top Left: Toolbar   */}
      <div className="absolute top-3 left-3 z-10">
        <Toolbar
          state={state}
          onToggleWireframe={toggleWireframe}
          onToggleAxes={toggleAxes}
          onToggleAutoRotate={toggleAutoRotate}
          onReset={reset}
        />
      </div>

      {/* Top Right: Stats */}
      <div className="absolute top-3 right-3 z-10">
        <StatsDisplay
          fps={stats.fps}
          triangles={stats.triangles}
          drawCalls={stats.drawCalls}
        />
      </div>

      {/* Center Top: Model Name */}
      {shape && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-5">
          <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-full px-3 py-1 flex items-center gap-2">
            <Box className="w-3 h-3 text-green-400" />
            <span className="text-xs text-white font-medium">{shape.name}</span>
          </div>
        </div>
      )}

      {/* Mission Control Panel */}
      {activeConversationId && activePanel === "history" && (
        <div className="absolute top-16 left-3 z-30 w-80 h-3/4 animate-in fade-in slide-in-from-left-2 duration-150">
          <MissionControl
            chatId={activeConversationId}
            onRecallAsset={handleRecallAsset}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}

      {/* Left: Parts Panel */}
      {shape && activePanel === "parts" && (
        <div className="absolute top-16 left-3 z-20 w-56 animate-in fade-in slide-in-from-left-2 duration-150">
          <ObjectPartsPanel
            shape={shape}
            selectedPart={selectedPart}
            onSelectPart={setSelectedPart}
            highlightedParts={highlightedParts}
            onToggleHighlight={handleToggleHighlight}
            onSwapPart={handleInitiateSwap}
          />
        </div>
      )}

      {/* Left: Asset Swap Panel */}
      {activePanel === "swap" && swappingPartId && (
        <div className="absolute top-16 left-3 z-20 w-80 h-[400px] animate-in fade-in slide-in-from-left-2 duration-150">
          <AssetSwapPanel
            currentPartName={
              shape?.geometry.parts.find((p: any) => p.id === swappingPartId)
                ?.name || "Part"
            }
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

          {shape && (
            <>
              <ActionBtn
                icon={<History />}
                label="Mission Control"
                active={activePanel === "history"}
                onClick={() =>
                  setActivePanel(activePanel === "history" ? null : "history")
                }
              />
              <ActionBtn
                icon={<Layers />}
                label="Parts"
                active={activePanel === "parts"}
                onClick={() =>
                  setActivePanel(activePanel === "parts" ? null : "parts")
                }
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
          <ActionBtn
            icon={<Download />}
            label="Export"
            onClick={handleExport}
          />
          <ActionBtn
            icon={<Maximize2 />}
            label="Full"
            onClick={handleFullscreen}
          />
        </div>
      </div>

      {/* Right Edge: Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-20 w-5 h-14 bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-all ${
          isSidebarOpen
            ? "right-64 rounded-l-lg border-r-0"
            : "right-0 rounded-l-lg"
        }`}
      >
        {isSidebarOpen ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`absolute top-0 right-0 bottom-0 w-64 bg-neutral-950/95 border-l border-neutral-800 z-10 transition-transform duration-200 ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto p-4 pt-6 scrollbar-thin scrollbar-thumb-neutral-700">
          <ModelSidebar stats={stats} shape={shape} onExport={handleExport} />
        </div>
      </div>

      {/* Empty State */}
      {!shape && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 bg-neutral-900 rounded-2xl flex items-center justify-center border border-neutral-800">
                <Box className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Model</h3>
            <p className="text-neutral-500 text-sm mb-4">
              Generate or import a model
            </p>
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

      {/* Multi-stage Generation Loader Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-[2px] animate-in fade-in duration-500">
          <div className="relative max-w-sm w-full mx-6">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-green-500/10 blur-[80px] rounded-full animate-pulse" />

            <div className="relative bg-neutral-900/90 border border-green-500/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col items-center text-center">
                {/* Advanced Animated Loader */}
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-2 border-neutral-800 rounded-full" />
                  <div className="absolute inset-0 border-2 border-t-green-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                  <div className="absolute inset-2 border border-neutral-800 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu className="w-8 h-8 text-green-400 animate-pulse" />
                  </div>

                  {/* Floating Particles */}
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-5 h-5 text-green-500/50 animate-bounce" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  CURFD Intelligence
                </h3>

                <div className="flex items-center gap-2 mb-6">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-ping" />
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-ping [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-ping [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-[0.2em]">
                    Inference in Progress
                  </span>
                </div>

                {/* Status Card */}
                <div className="w-full bg-black/40 border border-neutral-800 rounded-2xl p-4 mb-6">
                  <p className="text-neutral-400 text-xs font-medium mb-1 uppercase tracking-widest opacity-60">
                    Current Sequence
                  </p>
                  <p className="text-green-400 text-sm font-bold truncate">
                    {currentStatus || "Initializing Neural Pipeline..."}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full space-y-2">
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 w-[45%] animate-progress-indefinite shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono uppercase tracking-tighter"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors relative group ${
      active
        ? "bg-purple-500/20 text-purple-400"
        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
    }`}
    title={label}
  >
    <div className="w-4 h-4">{icon}</div>
  </button>
);
