import type { GeneratedShape, ShapeType } from "@/modules/ai/types/chat.type";
import { Check, Cog, Layers, Plus, Sparkles, Wrench } from "lucide-react";

interface ShapeModificationPanelProps {
  shape: GeneratedShape;
  onModify?: (modification: ShapeModification, label: string) => void;
  appliedMods?: string[];
}

export interface ShapeModification {
  action: "add" | "remove" | "modify";
  component: string;
  params?: Record<string, unknown>;
}

// Modifications available for each shape type
const shapeModifications: Record<ShapeType, ModificationOption[]> = {
  robotic_arm: [
    {
      id: "add-joint",
      label: "Add 7th Joint",
      component: "joint",
      action: "add",
      icon: Plus,
    },
    {
      id: "change-gripper",
      label: "Change Gripper",
      component: "gripper",
      action: "modify",
      icon: Cog,
    },
    {
      id: "add-sensor",
      label: "Add Sensor",
      component: "sensor",
      action: "add",
      icon: Layers,
    },
    {
      id: "extend-reach",
      label: "Extend Reach",
      component: "arm",
      action: "modify",
      icon: Wrench,
    },
  ],
  car: [
    {
      id: "add-spoiler",
      label: "Add Spoiler",
      component: "spoiler",
      action: "add",
      icon: Plus,
    },
    {
      id: "bigger-wheels",
      label: "Bigger Wheels",
      component: "wheels",
      action: "modify",
      icon: Cog,
    },
    {
      id: "add-sideskirts",
      label: "Side Skirts",
      component: "body",
      action: "add",
      icon: Layers,
    },
    {
      id: "sport-hood",
      label: "Sport Hood",
      component: "hood",
      action: "modify",
      icon: Wrench,
    },
  ],
  furniture: [
    {
      id: "add-headrest",
      label: "Add Headrest",
      component: "headrest",
      action: "add",
      icon: Plus,
    },
    {
      id: "wider-armrest",
      label: "Wider Arms",
      component: "armrest",
      action: "modify",
      icon: Cog,
    },
    {
      id: "add-lumbar",
      label: "Lumbar Support",
      component: "lumbar",
      action: "add",
      icon: Layers,
    },
    {
      id: "taller-back",
      label: "Taller Back",
      component: "back",
      action: "modify",
      icon: Wrench,
    },
  ],
  industrial: [
    {
      id: "add-conveyor",
      label: "Extend Belt",
      component: "conveyor",
      action: "add",
      icon: Plus,
    },
    {
      id: "add-robot",
      label: "Add Robot",
      component: "robot",
      action: "add",
      icon: Layers,
    },
    {
      id: "bigger-press",
      label: "Bigger Press",
      component: "press",
      action: "modify",
      icon: Cog,
    },
    {
      id: "add-safety",
      label: "Safety Cage",
      component: "safety",
      action: "add",
      icon: Wrench,
    },
  ],
  generic: [
    {
      id: "add-detail",
      label: "Add Detail",
      component: "detail",
      action: "add",
      icon: Plus,
    },
    {
      id: "change-material",
      label: "Material",
      component: "material",
      action: "modify",
      icon: Cog,
    },
    {
      id: "scale-up",
      label: "Scale Up",
      component: "scale",
      action: "modify",
      icon: Layers,
    },
    {
      id: "add-pattern",
      label: "Add Pattern",
      component: "pattern",
      action: "add",
      icon: Wrench,
    },
  ],
};

interface ModificationOption {
  id: string;
  label: string;
  component: string;
  action: "add" | "remove" | "modify";
  icon: React.ComponentType<{ className?: string }>;
}

export const ShapeModificationPanel: React.FC<ShapeModificationPanelProps> = ({
  shape,
  onModify,
  appliedMods = [],
}) => {
  const modifications =
    shapeModifications[shape.type] || shapeModifications.generic;

  const handleModification = (mod: ModificationOption) => {
    if (onModify) {
      onModify({ action: mod.action, component: mod.component }, mod.label);
    }
  };

  const isApplied = (label: string) => appliedMods.includes(label);

  return (
    <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-800 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-white">Customize</span>
          {appliedMods.length > 0 && (
            <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-400 px-1.5 rounded">
              {appliedMods.length} applied
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="p-1.5 space-y-0.5">
        {modifications.map((mod) => {
          const Icon = mod.icon;
          const applied = isApplied(mod.label);
          return (
            <button
              key={mod.id}
              onClick={() => !applied && handleModification(mod)}
              disabled={applied}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                applied
                  ? "bg-green-500/10 border border-green-500/20"
                  : "hover:bg-purple-500/10 border border-transparent"
              }`}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  applied
                    ? "bg-green-500/20 text-green-400"
                    : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {applied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium ${
                    applied ? "text-green-400" : "text-white"
                  }`}
                >
                  {mod.label}
                </p>
                <p className="text-[10px] text-neutral-500 capitalize">
                  {mod.action}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-neutral-800 bg-neutral-900/50">
        <p className="text-[10px] text-neutral-500 text-center">
          Or type in chat: "make wheels bigger"
        </p>
      </div>
    </div>
  );
};

export default ShapeModificationPanel;
