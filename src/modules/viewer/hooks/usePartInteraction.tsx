import { Html } from "@react-three/drei";
import { useState } from "react";

interface UsePartInteractionProps {
  selectedPart?: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts?: Set<string>;
}

export const usePartInteraction = ({
  selectedPart,
  onSelectPart,
  highlightedParts,
}: UsePartInteractionProps) => {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  const handleInteraction = (partId: string) => ({
    onClick: (e: any) => {
      e.stopPropagation();
      onSelectPart?.(selectedPart === partId ? null : partId);
    },
    onPointerOver: (e: any) => {
      e.stopPropagation();
      setHoveredPart(partId);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: (e: any) => {
      e.stopPropagation();
      setHoveredPart(null);
      document.body.style.cursor = "auto";
    },
  });

  const getMaterialProps = (
    partId: string,
    baseColor: string,
    isAccent = false,
    wireframe = false
  ) => {
    const isSelected = selectedPart === partId;
    const isHighlighted = highlightedParts?.has(partId);
    const isHovered = hoveredPart === partId;

    let color = baseColor;
    let emissive = isAccent ? "#10b981" : "#000000";
    let emissiveIntensity = isAccent ? 0.3 : 0;

    if (isSelected) {
      color = "#3b82f6";
      emissive = "#60a5fa";
      emissiveIntensity = 0.5;
    } else if (isHighlighted || isHovered) {
      color = "#22c55e";
      emissive = "#4ade80";
      emissiveIntensity = 0.3;
    }

    return {
      color,
      emissive,
      emissiveIntensity,
      wireframe,
      metalness: 0.6,
      roughness: 0.3,
    };
  };

  const renderLabel = (position: [number, number, number] = [0, 4, 0]) =>
    selectedPart ? (
      <Html position={position} center className="pointer-events-none">
        <div className="bg-neutral-900/90 backdrop-blur-md border border-green-500/50 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap shadow-xl">
          <span className="font-bold text-green-400 mr-2">Selected:</span>
          {selectedPart
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")}
        </div>
      </Html>
    ) : null;

  return { handleInteraction, getMaterialProps, renderLabel };
};
