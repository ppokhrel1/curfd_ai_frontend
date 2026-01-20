import { usePartInteraction } from "@/modules/viewer/hooks/usePartInteraction";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { ShapeModelProps } from "../ShapeRenderer";

export const ChairModel: React.FC<ShapeModelProps> = ({
  wireframe = false,
  animated = true,
  selectedPart,
  onSelectPart,
  highlightedParts,
}) => {
  const chairRef = useRef<THREE.Group>(null);

  const { handleInteraction, getMaterialProps, renderLabel } = usePartInteraction({
    selectedPart,
    onSelectPart,
    highlightedParts,
  });

  useFrame((state, delta) => {
    if (!animated || !chairRef.current) return;
    // Gentle sway animation
    chairRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
  });

  return (
    <group ref={chairRef} position={[0, 0, 0]}>
      {renderLabel([0, 2, 0])}

      {/* Base with wheels */}
      <group position={[0, 0.1, 0]} {...handleInteraction("base")}>
        {/* Center hub */}
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
          <meshStandardMaterial {...getMaterialProps("base", "#374151", false, wireframe)} />
        </mesh>

        {/* 5 legs */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <group key={i} rotation={[0, (angle * Math.PI) / 180, 0]}>
            {/* Leg */}
            <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.8, 16]} />
              <meshStandardMaterial {...getMaterialProps("base", "#374151", false, wireframe)} />
            </mesh>
            {/* Wheel */}
            <mesh position={[0.8, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
              <meshStandardMaterial {...getMaterialProps("base", "#111827", false, wireframe)} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Gas cylinder */}
      <group {...handleInteraction("cylinder")}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.08, 0.5, 32]} />
          <meshStandardMaterial {...getMaterialProps("cylinder", "#374151", false, wireframe)} />
        </mesh>

        {/* Height adjustment cylinder */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 32]} />
          <meshStandardMaterial {...getMaterialProps("cylinder", "#22c55e", true, wireframe)} />
        </mesh>
      </group>

      {/* Seat base and cushion */}
      <group {...handleInteraction("seat")}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
          <meshStandardMaterial {...getMaterialProps("seat", "#374151", false, wireframe)} />
        </mesh>

        <mesh position={[0, 1, 0.05]} castShadow>
          <boxGeometry args={[0.55, 0.12, 0.55]} />
          <meshStandardMaterial {...getMaterialProps("seat", "#1f2937", false, wireframe)} />
        </mesh>

        <mesh position={[0, 1, 0.32]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.55, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial {...getMaterialProps("seat", "#1f2937", false, wireframe)} />
        </mesh>
      </group>

      {/* Backrest */}
      <group position={[0, 1.5, -0.25]} {...handleInteraction("backrest")}>
        {/* Main backrest frame */}
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.8, 0.08]} />
          <meshStandardMaterial {...getMaterialProps("backrest", "#4b5563", false, wireframe)} />
        </mesh>

        {/* Lumbar support curve */}
        <mesh position={[0, -0.15, 0.06]} castShadow>
          <boxGeometry args={[0.45, 0.25, 0.06]} />
          <meshStandardMaterial {...getMaterialProps("backrest", "#1f2937", false, wireframe)} />
        </mesh>

        {/* Headrest */}
        <mesh position={[0, 0.55, 0.05]} castShadow>
          <boxGeometry args={[0.35, 0.2, 0.1]} />
          <meshStandardMaterial {...getMaterialProps("backrest", "#1f2937", false, wireframe)} />
        </mesh>
      </group>

      {/* Armrests */}
      {/* Left armrest */}
      <group position={[-0.35, 1.2, 0]} {...handleInteraction("armrest_left")}>
        {/* Vertical support */}
        <mesh castShadow>
          <boxGeometry args={[0.05, 0.3, 0.05]} />
          <meshStandardMaterial {...getMaterialProps("armrest_left", "#374151", false, wireframe)} />
        </mesh>
        {/* Arm pad */}
        <mesh position={[0, 0.18, 0.1]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.25]} />
          <meshStandardMaterial {...getMaterialProps("armrest_left", "#1f2937", false, wireframe)} />
        </mesh>
      </group>

      {/* Right armrest */}
      <group position={[0.35, 1.2, 0]} {...handleInteraction("armrest_right")}>
        {/* Vertical support */}
        <mesh castShadow>
          <boxGeometry args={[0.05, 0.3, 0.05]} />
          <meshStandardMaterial {...getMaterialProps("armrest_right", "#374151", false, wireframe)} />
        </mesh>
        {/* Arm pad */}
        <mesh position={[0, 0.18, 0.1]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.25]} />
          <meshStandardMaterial {...getMaterialProps("armrest_right", "#1f2937", false, wireframe)} />
        </mesh>
      </group>
    </group>
  );
};
