import { usePartInteraction } from "@/modules/viewer/hooks/usePartInteraction";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { ShapeModelProps } from "../ShapeRenderer";

export const RoboticArmModel: React.FC<ShapeModelProps> = ({
  wireframe = false,
  animated = true,
  selectedPart,
  onSelectPart,
  highlightedParts,
}) => {
  const baseRef = useRef<THREE.Group>(null);
  const joint1Ref = useRef<THREE.Group>(null);
  const joint2Ref = useRef<THREE.Group>(null);
  const joint3Ref = useRef<THREE.Group>(null);
  const gripperRef = useRef<THREE.Group>(null);
  const [time, setTime] = useState(0);

  const { handleInteraction, getMaterialProps, renderLabel } = usePartInteraction({
    selectedPart,
    onSelectPart,
    highlightedParts,
  });

  useFrame((state, delta) => {
    if (!animated) return;
    setTime((prev) => prev + delta * 0.5);

    // Animate joints smoothly
    if (joint1Ref.current) {
      joint1Ref.current.rotation.y = Math.sin(time) * 0.5;
    }
    if (joint2Ref.current) {
      joint2Ref.current.rotation.z = Math.sin(time * 0.7) * 0.3 - 0.3;
    }
    if (joint3Ref.current) {
      joint3Ref.current.rotation.z = Math.sin(time * 0.5 + 1) * 0.4;
    }
    if (gripperRef.current) {
      gripperRef.current.rotation.x = Math.sin(time * 2) * 0.2;
    }
  });

  return (
    <group ref={baseRef} position={[0, -1, 0]}> {/* Adjusted position to center better */}
      {renderLabel([0, 4, 0])}

      {/* Base Platform */}
      <group {...handleInteraction("base")}>
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 1.4, 0.2, 32]} />
          <meshStandardMaterial {...getMaterialProps("base", "#1f2937", false, wireframe)} />
        </mesh>
        <mesh position={[0, 0.22, 0]} castShadow>
          <torusGeometry args={[1.1, 0.05, 16, 32]} />
          <meshStandardMaterial {...getMaterialProps("base", "#1f2937", true, wireframe)} />
        </mesh>
      </group>

      {/* Joint 1 - Base Rotation */}
      <group ref={joint1Ref} position={[0, 0.2, 0]}>
        <group {...handleInteraction("joint_1")}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.6, 0.8, 32]} />
            <meshStandardMaterial {...getMaterialProps("joint_1", "#374151", false, wireframe)} />
          </mesh>
        </group>

        {/* Joint 2 - Shoulder */}
        <group ref={joint2Ref} position={[0, 0.9, 0]}>
          <group {...handleInteraction("joint_2")}>
            <mesh castShadow>
              <sphereGeometry args={[0.35, 32, 32]} />
              <meshStandardMaterial {...getMaterialProps("joint_2", "#4b5563", false, wireframe)} />
            </mesh>
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[0.3, 2, 0.3]} />
              <meshStandardMaterial {...getMaterialProps("joint_2", "#1f2937", false, wireframe)} />
            </mesh>
            <mesh position={[0.16, 1, 0]} castShadow>
              <boxGeometry args={[0.02, 1.8, 0.25]} />
              <meshStandardMaterial {...getMaterialProps("joint_2", "#22c55e", true, wireframe)} />
            </mesh>
          </group>

          {/* Joint 3 - Elbow */}
          <group ref={joint3Ref} position={[0, 2, 0]}>
            <group {...handleInteraction("joint_3")}>
              <mesh castShadow>
                <sphereGeometry args={[0.25, 32, 32]} />
                <meshStandardMaterial {...getMaterialProps("joint_3", "#4b5563", false, wireframe)} />
              </mesh>
              <mesh position={[0, 0.8, 0]} castShadow>
                <boxGeometry args={[0.25, 1.5, 0.25]} />
                <meshStandardMaterial {...getMaterialProps("joint_3", "#1f2937", false, wireframe)} />
              </mesh>
            </group>

            {/* Wrist */}
            <group position={[0, 1.6, 0]}>
              <group {...handleInteraction("wrist")}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.2, 0.2, 0.3, 32]} />
                  <meshStandardMaterial {...getMaterialProps("wrist", "#4b5563", false, wireframe)} />
                </mesh>
              </group>

              {/* Gripper Assembly */}
              <group ref={gripperRef} position={[0, 0.25, 0]} {...handleInteraction("gripper")}>
                <mesh castShadow>
                  <boxGeometry args={[0.4, 0.15, 0.3]} />
                  <meshStandardMaterial {...getMaterialProps("gripper", "#1f2937", false, wireframe)} />
                </mesh>
                <mesh position={[-0.15, 0.25, 0]} castShadow>
                  <boxGeometry args={[0.08, 0.4, 0.15]} />
                  <meshStandardMaterial {...getMaterialProps("gripper", "#22c55e", true, wireframe)} />
                </mesh>
                <mesh position={[0.15, 0.25, 0]} castShadow>
                  <boxGeometry args={[0.08, 0.4, 0.15]} />
                  <meshStandardMaterial {...getMaterialProps("gripper", "#22c55e", true, wireframe)} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
