import { GeneratedShape, ShapeType } from "@/modules/ai/types/chat.type";
import { Suspense } from "react";
import { CarModel } from "./shapes/CarModel";
import { ChairModel } from "./shapes/ChairModel";
import { GenericModel } from "./shapes/GenericModel";
import { IndustrialModel } from "./shapes/IndustrialModel";
import { RoboticArmModel } from "./shapes/RoboticArmModel";

interface ShapeRendererProps {
  shape: GeneratedShape;
  wireframe?: boolean;
  animated?: boolean;
  selectedPart?: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts?: Set<string>;
}

// Loading fallback component
const ShapeLoading = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshStandardMaterial
      color="#22c55e"
      wireframe
      emissive="#10b981"
      emissiveIntensity={0.3}
    />
  </mesh>
);

// Common props for all shape models
export interface ShapeModelProps {
  wireframe?: boolean;
  animated?: boolean;
  selectedPart?: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts?: Set<string>;
}

// Map shape types to their 3D models
const shapeComponents: Record<ShapeType, React.FC<ShapeModelProps>> = {
  robotic_arm: RoboticArmModel,
  car: CarModel,
  furniture: ChairModel,
  industrial: IndustrialModel,
  generic: GenericModel,
};

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  wireframe = false,
  animated = true,
  selectedPart,
  onSelectPart,
  highlightedParts,
}) => {
  const ModelComponent = shapeComponents[shape.type] || GenericModel;

  return (
    <Suspense fallback={<ShapeLoading />}>
      <ModelComponent
        wireframe={wireframe}
        animated={animated}
        selectedPart={selectedPart}
        onSelectPart={onSelectPart}
        highlightedParts={highlightedParts}
      />
    </Suspense>
  );
};

export default ShapeRenderer;
