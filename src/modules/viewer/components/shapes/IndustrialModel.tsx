import { usePartInteraction } from "@/modules/viewer/hooks/usePartInteraction";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { ShapeModelProps } from "../ShapeRenderer";

export const IndustrialModel: React.FC<ShapeModelProps> = ({
  wireframe = false,
  animated = true,
  selectedPart,
  onSelectPart,
  highlightedParts,
}) => {
  const conveyorRef = useRef<THREE.Group>(null);
  const gearRef = useRef<THREE.Mesh>(null);
  const pistonRef = useRef<THREE.Mesh>(null);
  const [time, setTime] = useState(0);

  const { handleInteraction, getMaterialProps, renderLabel } = usePartInteraction({
    selectedPart,
    onSelectPart,
    highlightedParts,
  });

  useFrame((state, delta) => {
    if (!animated) return;
    setTime((prev) => prev + delta);

    // Rotate gear
    if (gearRef.current) {
      gearRef.current.rotation.z += delta * 2;
    }

    // Move piston
    if (pistonRef.current) {
      pistonRef.current.position.y = 0.8 + Math.sin(time * 3) * 0.3;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {renderLabel([0, 3, 0])}

      {/* Main Platform */}
      <group {...handleInteraction("platform")}>
        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 0.1, 3]} />
          <meshStandardMaterial {...getMaterialProps("platform", "#374151", false, wireframe)} />
        </mesh>

        {/* Safety stripes on edges */}
        {[-1.9, 1.9].map((x, i) => (
          <mesh key={i} position={[x, 0.12, 0]} castShadow>
            <boxGeometry args={[0.15, 0.05, 3]} />
            <meshStandardMaterial {...getMaterialProps("platform", "#ef4444", false, wireframe)} />
          </mesh>
        ))}
      </group>

      {/* Conveyor Belt System */}
      <group ref={conveyorRef} position={[-1.2, 0.4, 0]} {...handleInteraction("conveyor")}>
        {/* Conveyor frame */}
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.15, 2.5]} />
          <meshStandardMaterial {...getMaterialProps("conveyor", "#374151", false, wireframe)} />
        </mesh>

        {/* Conveyor belt surface */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.7, 0.05, 2.4]} />
          <meshStandardMaterial {...getMaterialProps("conveyor", "#1f2937", false, wireframe)} metalness={0.3} roughness={0.8} />
        </mesh>

        {/* Belt ridges */}
        {[-1, -0.5, 0, 0.5, 1].map((z, i) => (
          <mesh key={i} position={[0, 0.13, z]} castShadow>
            <boxGeometry args={[0.7, 0.02, 0.08]} />
            <meshStandardMaterial {...getMaterialProps("conveyor", "#374151", false, wireframe)} />
          </mesh>
        ))}

        {/* Side rails */}
        {[-0.4, 0.4].map((x, i) => (
          <mesh key={i} position={[x, 0.2, 0]} castShadow>
            <boxGeometry args={[0.05, 0.15, 2.5]} />
            <meshStandardMaterial {...getMaterialProps("conveyor", "#f59e0b", true, wireframe)} />
          </mesh>
        ))}
      </group>

      {/* Hydraulic Press Assembly */}
      <group position={[0.8, 0, 0]} {...handleInteraction("press")}>
        {/* Main pillar */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[0.6, 1.4, 0.6]} />
          <meshStandardMaterial {...getMaterialProps("press", "#374151", false, wireframe)} />
        </mesh>

        {/* Top frame */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.8]} />
          <meshStandardMaterial {...getMaterialProps("press", "#374151", false, wireframe)} />
        </mesh>

        {/* Piston cylinder */}
        <mesh position={[0, 1.3, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.4, 32]} />
          <meshStandardMaterial {...getMaterialProps("press", "#f59e0b", true, wireframe)} />
        </mesh>

        {/* Moving piston */}
        <mesh ref={pistonRef} position={[0, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 32]} />
          <meshStandardMaterial {...getMaterialProps("press", "#9ca3af", false, wireframe)} metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Press plate */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial {...getMaterialProps("press", "#22c55e", true, wireframe)} />
        </mesh>

        {/* Base plate */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.1, 0.7]} />
          <meshStandardMaterial {...getMaterialProps("press", "#374151", false, wireframe)} />
        </mesh>
      </group>

      {/* Control Panel */}
      <group position={[1.6, 0.5, -0.8]} {...handleInteraction("panel")}>
        {/* Panel body */}
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.8, 0.15]} />
          <meshStandardMaterial {...getMaterialProps("panel", "#4b5563", false, wireframe)} metalness={0.5} roughness={0.6} />
        </mesh>

        {/* Screen */}
        <mesh position={[0, 0.2, 0.08]} castShadow>
          <boxGeometry args={[0.3, 0.25, 0.02]} />
          <meshStandardMaterial {...getMaterialProps("panel", "#1e3a5f", false, wireframe)} emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>

        {/* Buttons */}
        <mesh position={[-0.1, -0.15, 0.08]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial {...getMaterialProps("panel", "#22c55e", true, wireframe)} />
        </mesh>
        <mesh position={[0.1, -0.15, 0.08]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
          <meshStandardMaterial {...getMaterialProps("panel", "#ef4444", false, wireframe)} />
        </mesh>

        {/* Panel stand */}
        <mesh position={[0, -0.5, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.08, 0.25, 16]} />
          <meshStandardMaterial {...getMaterialProps("panel", "#374151", false, wireframe)} />
        </mesh>
      </group>

      {/* Large Gear */}
      <group position={[-0.3, 0.8, 1.2]} {...handleInteraction("gear")}>
        <mesh ref={gearRef} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.35, 0.08, 8, 12]} />
          <meshStandardMaterial {...getMaterialProps("gear", "#f59e0b", true, wireframe)} />
        </mesh>
        {/* Center hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.12, 32]} />
          <meshStandardMaterial {...getMaterialProps("gear", "#374151", false, wireframe)} />
        </mesh>
        {/* Mount */}
        <mesh position={[0, 0, 0.15]} castShadow>
          <boxGeometry args={[0.15, 0.15, 0.3]} />
          <meshStandardMaterial {...getMaterialProps("gear", "#374151", false, wireframe)} />
        </mesh>
      </group>

      {/* Safety cage/rails */}
      {[[-1.8, 0.7, 1.3], [-1.8, 0.7, -1.3], [1.8, 0.7, 1.3], [1.8, 0.7, -1.3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow {...handleInteraction("cage")}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 16]} />
          <meshStandardMaterial {...getMaterialProps("cage", "#f59e0b", true, wireframe)} />
        </mesh>
      ))}
    </group>
  );
};
