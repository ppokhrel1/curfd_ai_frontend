import { usePartInteraction } from "@/modules/viewer/hooks/usePartInteraction";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { ShapeModelProps } from "../ShapeRenderer";

export const GenericModel: React.FC<ShapeModelProps> = ({
  wireframe = false,
  animated = true,
  selectedPart,
  onSelectPart,
  highlightedParts,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const torusRef = useRef<THREE.Mesh>(null);
  const [time, setTime] = useState(0);

  const { handleInteraction, getMaterialProps, renderLabel } = usePartInteraction({
    selectedPart,
    onSelectPart,
    highlightedParts,
  });

  useFrame((state, delta) => {
    if (!animated) return;
    setTime((prev) => prev + delta);

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }

    if (torusRef.current) {
      torusRef.current.rotation.x += delta * 0.5;
      torusRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {renderLabel([0, 2.5, 0])}

      {/* Central Cube */}
      <mesh castShadow receiveShadow {...handleInteraction("core")}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial {...getMaterialProps("core", "#22c55e", false, wireframe)} />
      </mesh>

      {/* Corner Spheres */}
      {[
        [-0.9, 0.9, 0.9],
        [0.9, 0.9, 0.9],
        [-0.9, -0.9, 0.9],
        [0.9, -0.9, 0.9],
        [-0.9, 0.9, -0.9],
        [0.9, 0.9, -0.9],
        [-0.9, -0.9, -0.9],
        [0.9, -0.9, -0.9],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow {...handleInteraction("corners")}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial {...getMaterialProps("corners", "#4ade80", false, wireframe)} />
        </mesh>
      ))}

      {/* Rotating Torus */}
      <mesh
        ref={torusRef}
        position={[0, 0, 0]}
        castShadow
        {...handleInteraction("torus")}
      >
        <torusGeometry args={[1.3, 0.1, 16, 48]} />
        <meshStandardMaterial {...getMaterialProps("torus", "#10b981", true, wireframe)} />
      </mesh>

      {/* Connecting Cylinders */}
      <group {...handleInteraction("axis")}>
        {/* X-axis */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2, 16]} />
          <meshStandardMaterial {...getMaterialProps("axis", "#4ade80", false, wireframe)} />
        </mesh>

        {/* Y-axis */}
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2, 16]} />
          <meshStandardMaterial {...getMaterialProps("axis", "#4ade80", false, wireframe)} />
        </mesh>

        {/* Z-axis */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2, 16]} />
          <meshStandardMaterial {...getMaterialProps("axis", "#4ade80", false, wireframe)} />
        </mesh>
      </group>

      {/* Floating orbit elements */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2 + time * 0.5;
        const radius = 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <mesh
            key={i}
            position={[x, Math.sin(time + i) * 0.3, z]}
            castShadow
            {...handleInteraction("satellite")}
          >
            <octahedronGeometry args={[0.15]} />
            <meshStandardMaterial {...getMaterialProps("satellite", "#10b981", true, wireframe)} />
          </mesh>
        );
      })}
    </group>
  );
};
