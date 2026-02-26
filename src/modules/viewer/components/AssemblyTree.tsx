import React, { useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  MoveRight,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAssemblyStore, type AssemblyPart } from "@/modules/viewer/stores/assemblyStore";

interface AssemblyTreeProps {
  /** Called when user clicks "Add Current Model" */
  onAddCurrentToAssembly?: () => void;
  /** Whether a model is currently loaded in the viewer (enables Add Current button) */
  hasCurrentModel?: boolean;
  /** Called with combined SCAD when user clicks Render Combined */
  onRenderCombined?: (scad: string) => void;
  /** Called to close the panel */
  onClose?: () => void;
  /** Currently selected assembly part id (synced with viewer) */
  selectedPartId?: string | null;
  /** Called when user selects a part in the tree */
  onSelectPart?: (id: string) => void;
}

const AxisInput: React.FC<{
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}> = ({ label, value, color, onChange }) => (
  <label className="flex flex-col gap-0.5 flex-1">
    <span className={`text-[9px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
    <input
      type="number"
      step="0.5"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-[11px] text-white w-full focus:outline-none focus:border-purple-500/60 hide-arrows text-center"
    />
  </label>
);

const PartRow: React.FC<{
  part: AssemblyPart;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}> = ({ part, index, isSelected, onSelect }) => {
  const { removePart, renamePart, toggleVisibility, updateTransform } = useAssemblyStore();
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(part.name);

  const commitRename = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== part.name) renamePart(part.id, trimmed);
    else setNameVal(part.name);
    setEditingName(false);
  };

  return (
    <div className={`rounded-lg border transition-colors ${
      isSelected
        ? "border-purple-500/60 bg-purple-500/10"
        : part.visible
          ? "border-neutral-700 bg-neutral-800/30"
          : "border-neutral-800 bg-neutral-900/40 opacity-60"
    }`}>
      {/* Part header row */}
      <div
        className="flex items-center gap-1.5 px-2 py-2 cursor-pointer"
        onClick={() => onSelect(part.id)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="text-neutral-500 hover:text-neutral-300 transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {/* Part icon + number */}
        <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] text-purple-400 font-bold">{index + 1}</span>
        </div>

        {/* Name — inline editable */}
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setNameVal(part.name); setEditingName(false); } }}
            className="flex-1 bg-neutral-900 border border-purple-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none min-w-0"
          />
        ) : (
          <span
            className="flex-1 text-xs text-white font-medium truncate min-w-0 cursor-pointer hover:text-purple-300 transition-colors"
            title="Click to rename"
            onDoubleClick={() => setEditingName(true)}
          >
            {part.name}
          </span>
        )}

        {part.isLoading && <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />}

        {/* Actions */}
        <button
          onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
          className="p-0.5 text-neutral-600 hover:text-neutral-300 transition-colors flex-shrink-0"
          title="Rename"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleVisibility(part.id); }}
          className="p-0.5 text-neutral-500 hover:text-white transition-colors flex-shrink-0"
          title={part.visible ? "Hide" : "Show"}
        >
          {part.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removePart(part.id); }}
          className="p-0.5 text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Remove"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded transform controls */}
      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-neutral-800/60 pt-2">
          {/* Position */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <MoveRight className="w-2.5 h-2.5 text-blue-400" />
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold">Position (mm)</span>
            </div>
            <div className="flex gap-1.5">
              {(["X", "Y", "Z"] as const).map((axis, i) => (
                <AxisInput
                  key={axis}
                  label={axis}
                  value={part.position[i]}
                  color={i === 0 ? "text-red-400" : i === 1 ? "text-green-400" : "text-blue-400"}
                  onChange={(v) => {
                    const pos: [number, number, number] = [...part.position];
                    pos[i] = v;
                    updateTransform(part.id, pos);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <RotateCw className="w-2.5 h-2.5 text-orange-400" />
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold">Rotation (°)</span>
            </div>
            <div className="flex gap-1.5">
              {(["X", "Y", "Z"] as const).map((axis, i) => (
                <AxisInput
                  key={axis}
                  label={axis}
                  value={part.rotation[i]}
                  color={i === 0 ? "text-red-400" : i === 1 ? "text-green-400" : "text-blue-400"}
                  onChange={(v) => {
                    const rot: [number, number, number] = [...part.rotation];
                    rot[i] = v;
                    updateTransform(part.id, undefined, rot);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AssemblyTree: React.FC<AssemblyTreeProps> = ({
  onAddCurrentToAssembly,
  hasCurrentModel,
  onRenderCombined,
  onClose,
  selectedPartId,
  onSelectPart,
}) => {
  const partsFromStore = useAssemblyStore(state => state.parts);
  const { clearAssembly, generateCombinedScad } = useAssemblyStore.getState();

  const handleExportScad = () => {
    const combined = generateCombinedScad();
    if (!combined) { toast.error("No parts with SCAD code to export"); return; }
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
    if (!combined) { toast.error("No parts with SCAD code to render"); return; }
    onRenderCombined?.(combined);
    toast.success("Combined script sent to editor");
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 bg-gradient-to-r from-purple-500/10 to-blue-500/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-500/15 rounded-lg border border-purple-500/20">
            <Box className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight">Feature Tree</h3>
            <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">
              {partsFromStore.length} {partsFromStore.length === 1 ? "part" : "parts"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add Current Model button */}
      {onAddCurrentToAssembly && (
        <div className="px-3 pt-3 flex-shrink-0">
          <button
            onClick={onAddCurrentToAssembly}
            disabled={!hasCurrentModel}
            title={!hasCurrentModel ? "Load a model first" : "Add the current 3D model to the assembly"}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-purple-300 hover:text-white text-xs font-semibold rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Current Model to Assembly
          </button>
        </div>
      )}

      {/* Parts list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {partsFromStore.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-50">
            <Box className="w-10 h-10 mb-3 text-neutral-700" />
            <p className="text-sm text-neutral-500 font-medium">No parts yet</p>
            <p className="text-xs text-neutral-600 mt-1">
              Add the current model or pick one from Mission Control
            </p>
          </div>
        ) : (
          partsFromStore.map((part, idx) => (
            <PartRow
              key={part.id}
              part={part}
              index={idx}
              isSelected={selectedPartId === part.id}
              onSelect={(id) => onSelectPart?.(id)}
            />
          ))
        )}
      </div>

      {/* Footer actions */}
      <div className="px-3 pb-3 flex-shrink-0 border-t border-neutral-800 pt-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleExportScad}
            disabled={partsFromStore.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl transition-colors"
          >
            <Download className="w-3 h-3" />
            Export SCAD
          </button>
          <button
            onClick={handleRenderCombined}
            disabled={partsFromStore.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Code2 className="w-3 h-3" />
            Render Combined
          </button>
        </div>
        {partsFromStore.length > 0 && (
          <button
            onClick={() => { clearAssembly(); toast.success("Assembly cleared"); }}
            className="w-full text-[10px] text-neutral-600 hover:text-red-400 transition-colors py-1"
          >
            Clear all parts
          </button>
        )}
      </div>
    </div>
  );
};
