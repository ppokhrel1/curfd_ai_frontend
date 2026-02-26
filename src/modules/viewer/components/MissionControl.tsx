import { useChatStore } from "@/modules/ai/stores/chatStore";
import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import { assetService } from "@/modules/viewer/services/assetService";
import { useAssemblyStore } from "@/modules/viewer/stores/assemblyStore";
import {
  Activity,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  Eye,
  EyeOff,
  FileCode,
  History,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";

interface MissionControlProps {
  chatId: string;
  onRecallAsset?: (shape: GeneratedShape) => void;
  onAddToAssembly?: (shape: GeneratedShape, jobId: string) => void;
  onRenderCombined?: (scad: string) => void;
  onClose?: () => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({
  chatId,
  onRecallAsset,
  onAddToAssembly,
  onRenderCombined,
  onClose,
}) => {
  const { jobHistory } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "assembly">("history");

  const { parts, removePart, toggleVisibility, updateTransform, clearAssembly, generateCombinedScad } =
    useAssemblyStore();

  const jobs = useMemo(() => {
    const filtered = (jobHistory[chatId] || []).filter(
      (j) =>
        j.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [jobHistory, chatId, searchQuery]);

  const handleRecall = async (jobId: string) => {
    const toastId = toast.loading("Recalling mission assets...");
    try {
      const assets = await assetService.fetchAssets(jobId);
      if (assets.length === 0) {
        toast.error("No assets found for this mission", { id: toastId });
        return;
      }
      const shape = await assetService.mapToGeneratedShape(jobId, assets);
      if (shape && onRecallAsset) {
        onRecallAsset(shape);
        toast.success("Mission restored to viewer", { id: toastId });
      }
    } catch (err) {
      console.error("Recall failed:", err);
      toast.error("Failed to restore assets", { id: toastId });
    }
  };

  const handleAddToAssembly = async (jobId: string) => {
    const toastId = toast.loading("Adding to assembly...");
    try {
      const assets = await assetService.fetchAssets(jobId);
      if (assets.length === 0) {
        toast.error("No assets found for this job", { id: toastId });
        return;
      }
      const shape = await assetService.mapToGeneratedShape(jobId, assets);
      if (shape && onAddToAssembly) {
        onAddToAssembly(shape, jobId);
        setActiveTab("assembly");
        toast.success("Added to assembly", { id: toastId });
      }
    } catch (err) {
      console.error("Add to assembly failed:", err);
      toast.error("Failed to add to assembly", { id: toastId });
    }
  };

  const handleExportScad = () => {
    const combined = generateCombinedScad();
    if (!combined) {
      toast.error("No parts with OpenSCAD code to export");
      return;
    }
    const blob = new Blob([combined], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assembly.scad";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported assembly.scad");
  };

  const handleRenderCombined = () => {
    const combined = generateCombinedScad();
    if (!combined) {
      toast.error("No parts with OpenSCAD code to render");
      return;
    }
    onRenderCombined?.(combined);
    toast.success("Combined script sent to editor");
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <History className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Mission Control</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
              Generation Registry
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === "history"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <History className="w-3 h-3" />
          History
        </button>
        <button
          onClick={() => setActiveTab("assembly")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === "assembly"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Layers className="w-3 h-3" />
          Assembly
          {parts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-[9px] font-bold">
              {parts.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "history" && (
        <>
          {/* Search */}
          <div className="p-4 border-b border-neutral-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search mission IDs or prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Jobs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
            {jobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Activity className="w-12 h-12 mb-3 text-neutral-700" />
                <p className="text-sm text-neutral-500 font-medium">No missions logged</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-black/40 border border-neutral-800 rounded-xl p-3 hover:border-neutral-700 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1 rounded-sm ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 truncate">
                          JOB-{job.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 font-medium line-clamp-2 leading-tight">
                        {job.prompt || "No prompt recorded"}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[9px] text-neutral-600 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(job.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {job.status === "succeeded" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRecall(job.id)}
                            className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-md text-[10px] font-bold transition-all"
                          >
                            Recall
                          </button>
                          <button
                            onClick={() => handleAddToAssembly(job.id)}
                            title="Add to Assembly"
                            className="p-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-md transition-all"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-neutral-800/50">
                    <span className="text-[9px] text-neutral-500 flex items-center gap-1">
                      <FileCode className="w-2.5 h-2.5" />
                      {job.output_format?.toUpperCase() || "GLB"}
                    </span>
                    {job.currentStatus && (
                      <span className="text-[9px] text-blue-400 font-medium flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        {job.currentStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-black/40 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 font-medium">
              Total Assets: {jobs.filter((j) => j.status === "succeeded").length}
            </span>
            <span className="text-[10px] text-neutral-600 font-mono italic">
              SYS-RELIABILITY: 99.8%
            </span>
          </div>
        </>
      )}

      {activeTab === "assembly" && (
        <>
          {/* Assembly List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
            {parts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-8">
                <Layers className="w-10 h-10 mb-3 text-neutral-700" />
                <p className="text-sm text-neutral-500 font-medium">No parts in assembly</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Go to History and click <Plus className="inline w-3 h-3" /> on a job
                </p>
              </div>
            ) : (
              parts.map((part, idx) => (
                <div
                  key={part.id}
                  className="bg-black/40 border border-neutral-800 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-purple-400 font-mono font-bold">
                        #{idx + 1}
                      </span>
                      <span className="text-xs text-white font-medium truncate max-w-[120px]">
                        {part.name}
                      </span>
                      {part.isLoading && (
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleVisibility(part.id)}
                        className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                        title={part.visible ? "Hide" : "Show"}
                      >
                        {part.visible ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => removePart(part.id)}
                        className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                        title="Remove from assembly"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Position controls */}
                  <div className="grid grid-cols-3 gap-1 mt-2">
                    {(["X", "Y", "Z"] as const).map((axis, i) => (
                      <label key={axis} className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-neutral-500 uppercase">{axis}</span>
                        <input
                          type="number"
                          step="0.5"
                          value={part.position[i]}
                          onChange={(e) => {
                            const pos: [number, number, number] = [...part.position];
                            pos[i] = parseFloat(e.target.value) || 0;
                            updateTransform(part.id, pos);
                          }}
                          className="bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-xs text-white w-full focus:outline-none focus:border-purple-500/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Assembly Footer */}
          <div className="p-3 bg-black/40 border-t border-neutral-800 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleExportScad}
                disabled={parts.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
              >
                <Download className="w-3 h-3" />
                Export SCAD
              </button>
              <button
                onClick={handleRenderCombined}
                disabled={parts.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors font-bold"
              >
                <Code2 className="w-3 h-3" />
                Render Combined
              </button>
            </div>
            {parts.length > 0 && (
              <button
                onClick={clearAssembly}
                className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors text-center"
              >
                Clear assembly
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "succeeded":
      return "bg-green-500/10 text-green-500";
    case "failed":
      return "bg-red-500/10 text-red-500";
    case "running":
      return "bg-blue-500/10 text-blue-500";
    default:
      return "bg-neutral-500/10 text-neutral-500";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "succeeded":
      return <CheckCircle2 className="w-2.5 h-2.5" />;
    case "failed":
      return <ShieldAlert className="w-2.5 h-2.5" />;
    case "running":
      return <RefreshCw className="w-2.5 h-2.5 animate-spin" />;
    default:
      return <Clock className="w-2.5 h-2.5" />;
  }
};
