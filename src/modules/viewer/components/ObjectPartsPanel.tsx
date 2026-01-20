import { GeneratedShape } from "@/modules/ai/types/chat.type";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ObjectPartsPanelProps {
  shape: GeneratedShape;
  selectedPart: string | null;
  onSelectPart: (partId: string | null) => void;
  highlightedParts: Set<string>;
  onToggleHighlight: (partId: string) => void;
}

// Fallback parts if none found
const defaultGenericParts: PartDefinition[] = [
  { id: "main", name: "Main Body", group: "Structure" },
];

interface PartDefinition {
  id: string;
  name: string;
  group: string;
}

export const ObjectPartsPanel: React.FC<ObjectPartsPanelProps> = ({
  shape,
  selectedPart,
  onSelectPart,
  highlightedParts,
  onToggleHighlight,
}) => {
  // Determine parts: Use shape.geometry.parts if available, otherwise fallback
  const parts = (shape.geometry.parts && shape.geometry.parts.length > 0) 
    ? shape.geometry.parts.map((p: any) => ({
        id: p.id,
        name: p.name,
        group: p.group || "Model Components"
      }))
    : defaultGenericParts;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["Structure", "Model Components", "Core"])
  );

  // Group parts by their group
  const groupedParts = parts.reduce((acc: Record<string, PartDefinition[]>, part: PartDefinition) => {
    if (!acc[part.group]) {
      acc[part.group] = [];
    }
    acc[part.group].push(part);
    return acc;
  }, {} as Record<string, PartDefinition[]>);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
        <h3 className="text-sm font-medium text-white">Object Parts</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          {parts.length} components • Click to select
        </p>
      </div>

      {/* Parts List */}
      <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
        {Object.entries(groupedParts).map(([group, groupParts]) => (
          <div key={group}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 text-left border-b border-neutral-800/50"
            >
              <span className="text-xs font-medium text-neutral-400">
                {group}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">
                  {groupParts.length}
                </span>
                {expandedGroups.has(group) ? (
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-neutral-500" />
                )}
              </div>
            </button>

            {/* Group Parts */}
            {expandedGroups.has(group) && (
              <div className="py-1">
                {(groupParts as PartDefinition[]).map((part) => (
                  <div
                    key={part.id}
                    className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-all ${
                      selectedPart === part.id
                        ? "bg-blue-500/20 border-l-2 border-blue-400"
                        : "hover:bg-neutral-800/50 border-l-2 border-transparent"
                    }`}
                    onClick={() =>
                      onSelectPart(selectedPart === part.id ? null : part.id)
                    }
                  >
                    <span
                      className={`text-sm ${
                        selectedPart === part.id
                          ? "text-blue-400 font-medium"
                          : "text-neutral-300"
                      }`}
                    >
                      {part.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHighlight(part.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        highlightedParts.has(part.id)
                          ? "text-blue-400 bg-blue-500/20"
                          : "text-neutral-500 hover:text-neutral-300"
                      }`}
                      title={highlightedParts.has(part.id) ? "Hide" : "Show"}
                    >
                      {highlightedParts.has(part.id) ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selection Info */}
      {selectedPart && (
        <div className="px-4 py-3 border-t border-neutral-800 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">Selected</p>
              <p className="text-sm text-blue-400 font-medium">
                {parts.find((p: PartDefinition) => p.id === selectedPart)?.name}
              </p>
            </div>
            <button
              onClick={() => onSelectPart(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectPartsPanel;
