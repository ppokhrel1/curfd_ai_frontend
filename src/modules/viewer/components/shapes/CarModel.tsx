import { usePartInteraction } from "@/modules/viewer/hooks/usePartInteraction";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { ShapeModelProps } from "../ShapeRenderer";

export const CarModel: React.FC<ShapeModelProps> = ({
  wireframe = false,
  animated = true,
  selectedPart,
  onSelectPart,
  highlightedParts,
}) => {
  const wheelFLRef = useRef<THREE.Mesh>(null);
  const wheelFRRef = useRef<THREE.Mesh>(null);
  const wheelRLRef = useRef<THREE.Mesh>(null);
  const wheelRRRef = useRef<THREE.Mesh>(null);

  const { handleInteraction, getMaterialProps, renderLabel } = usePartInteraction({
    selectedPart,
    onSelectPart,
    highlightedParts,
  });

  useFrame((state, delta) => {
    if (!animated) return;

    // Rotate wheels
    const rotationSpeed = delta * 3;
    [wheelFLRef, wheelFRRef, wheelRLRef, wheelRRRef].forEach((ref) => {
      if (ref.current) {
        ref.current.rotation.x += rotationSpeed;
      }
    });
  });

  return (
    <group position={[0, 0.4, 0]}>
      {renderLabel([0, 2.5, 0])}

      {/* Main Body Group */}
      <group {...handleInteraction("body")}>
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.5, 4]} />
          <meshStandardMaterial {...getMaterialProps("body", "#dc2626", false, wireframe)} />
        </mesh>

        <mesh position={[0, 0.1, 1.5]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.3, 1.2]} />
          <meshStandardMaterial {...getMaterialProps("body", "#dc2626", false, wireframe)} />
        </mesh>

        <mesh position={[0, 0.1, -1.5]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.3, 1]} />
          <meshStandardMaterial {...getMaterialProps("body", "#dc2626", false, wireframe)} />
        </mesh>

        <mesh position={[0, 0.6, -0.2]} castShadow>
          <boxGeometry args={[1.6, 0.7, 1.8]} />
          <meshStandardMaterial {...getMaterialProps("body", "#dc2626", false, wireframe)} />
        </mesh>
      </group>

      {/* Windows Group */}
      <group {...handleInteraction("windows")}>
        <mesh position={[0, 0.65, 0.85]} rotation={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[1.5, 0.05, 1]} />
          <meshStandardMaterial {...getMaterialProps("windows", "#1e3a5f", false, wireframe)} transparent opacity={0.7} />
        </mesh>

        <mesh position={[0, 0.65, -1.2]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[1.5, 0.05, 0.9]} />
          <meshStandardMaterial {...getMaterialProps("windows", "#1e3a5f", false, wireframe)} transparent opacity={0.7} />
        </mesh>

        <mesh position={[-0.82, 0.65, -0.2]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.05, 0.5, 1.4]} />
          <meshStandardMaterial {...getMaterialProps("windows", "#1e3a5f", false, wireframe)} transparent opacity={0.7} />
        </mesh>

        <mesh position={[0.82, 0.65, -0.2]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.05, 0.5, 1.4]} />
          <meshStandardMaterial {...getMaterialProps("windows", "#1e3a5f", false, wireframe)} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Headlights */}
      <group {...handleInteraction("headlights")}>
        <mesh position={[-0.7, 0.1, 2]} castShadow>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <meshStandardMaterial {...getMaterialProps("headlights", "#fbbf24", true, wireframe)} />
        </mesh>
        <mesh position={[0.7, 0.1, 2]} castShadow>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <meshStandardMaterial {...getMaterialProps("headlights", "#fbbf24", true, wireframe)} />
        </mesh>
      </group>

      {/* Taillights */}
      <group {...handleInteraction("taillights")}>
        <mesh position={[-0.7, 0.1, -2]} castShadow>
          <boxGeometry args={[0.3, 0.15, 0.1]} />
          <meshStandardMaterial {...getMaterialProps("taillights", "#ef4444", true, wireframe)} />
        </mesh>
        <mesh position={[0.7, 0.1, -2]} castShadow>
          <boxGeometry args={[0.3, 0.15, 0.1]} />
          <meshStandardMaterial {...getMaterialProps("taillights", "#ef4444", true, wireframe)} />
        </mesh>
      </group>

      {/* Front Grille */}
      <group {...handleInteraction("grille")}>
        <mesh position={[0, -0.05, 2]} castShadow>
          <boxGeometry args={[1, 0.4, 0.05]} />
          <meshStandardMaterial {...getMaterialProps("grille", "#e5e7eb", false, wireframe)} />
        </mesh>
      </group>

      {/* Wheels */}
      {/* Front Left */}
      <group position={[-1.1, -0.25, 1.3]} {...handleInteraction("wheel_fl")}>
        <mesh ref={wheelFLRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial {...getMaterialProps("wheel_fl", "#1f2937", false, wireframe)} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.22, 6]} />
          <meshStandardMaterial {...getMaterialProps("wheel_fl", "#e5e7eb", false, wireframe)} />
        </mesh>
      </group>

      {/* Front Right */}
      <group position={[1.1, -0.25, 1.3]} {...handleInteraction("wheel_fr")}>
        <mesh ref={wheelFRRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial {...getMaterialProps("wheel_fr", "#1f2937", false, wireframe)} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.22, 6]} />
          <meshStandardMaterial {...getMaterialProps("wheel_fr", "#e5e7eb", false, wireframe)} />
        </mesh>
      </group>

      {/* Rear Left */}
      <group position={[-1.1, -0.25, -1.3]} {...handleInteraction("wheel_rl")}>
        <mesh ref={wheelRLRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial {...getMaterialProps("wheel_rl", "#1f2937", false, wireframe)} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.22, 6]} />
          <meshStandardMaterial {...getMaterialProps("wheel_rl", "#e5e7eb", false, wireframe)} />
        </mesh>
      </group>

      {/* Rear Right */}
      <group position={[1.1, -0.25, -1.3]} {...handleInteraction("wheel_rr")}>
        <mesh ref={wheelRRRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
          <meshStandardMaterial {...getMaterialProps("wheel_rr", "#1f2937", false, wireframe)} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.22, 6]} />
          <meshStandardMaterial {...getMaterialProps("wheel_rr", "#e5e7eb", false, wireframe)} />
        </mesh>
      </group>

      {/* Spoiler */}
      <group {...handleInteraction("spoiler")}>
        <mesh position={[0, 0.85, -1.8]} castShadow>
          <boxGeometry args={[1.6, 0.05, 0.3]} />
          <meshStandardMaterial {...getMaterialProps("spoiler", "#dc2626", false, wireframe)} />
        </mesh>
        <mesh position={[-0.6, 0.7, -1.8]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.2]} />
          <meshStandardMaterial {...getMaterialProps("spoiler", "#dc2626", false, wireframe)} />
        </mesh>
        <mesh position={[0.6, 0.7, -1.8]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.2]} />
          <meshStandardMaterial {...getMaterialProps("spoiler", "#dc2626", false, wireframe)} />
        </mesh>
      </group>
    </group>
  );
};
