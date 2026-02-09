import { GeneratedShape } from "@/modules/ai/types/chat.type";
import {
  Center,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { ViewerState } from "../types/viewer.type";

interface ViewerCanvasProps {
  state: ViewerState;
  shape?: GeneratedShape | null;
  loadedModel?: THREE.Object3D | null;
  selectedPart?: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts?: Set<string>;
  simState?: "idle" | "running" | "paused" | "completed";
  children?: React.ReactNode;
}

export const ViewerCanvas: React.FC<ViewerCanvasProps> = ({
  state,
  shape,
  loadedModel,
  selectedPart,
  onSelectPart,
  highlightedParts,
  children,
}) => {
  return (
    <Canvas
      shadows
      style={{ background: state.backgroundColor }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        canvas.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          console.warn("[ViewerCanvas] WebGL Context Lost!");
        });
        canvas.addEventListener("webglcontextrestored", () => {
          console.log("[ViewerCanvas] WebGL Context Restored.");
        });
      }}
    >
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate={state.autoRotate}
        autoRotateSpeed={0.8}
        minDistance={0.1}
        maxDistance={500}
        makeDefault
      />

      <Suspense fallback={null}>
        <Lighting />
      </Suspense>

      <Environment preset="city" />

      <Grid
        infiniteGrid
        fadeDistance={50}
        fadeStrength={5}
        cellSize={0.5}
        sectionSize={2.5}
        sectionColor="#262626"
        cellColor="#171717"
        sectionThickness={1}
        cellThickness={0.5}
        position={[0, -0.01, 0]}
      />

      {/* Axes Helper */}
      {state.showAxes && (
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="white"
          />
        </GizmoHelper>
      )}

      {/* Scene Content */}
      <Suspense fallback={<LoadingModel />}>
        {loadedModel ? (
          <group>
            <Center>
              <ModelWithSelection
                model={loadedModel}
                selectedPart={selectedPart || null}
                onSelectPart={onSelectPart}
                highlightedParts={highlightedParts || new Set()}
              />
            </Center>
            <SimulationEffects
              model={loadedModel}
              simState={state.simState || "idle"}
            />
          </group>
        ) : (
          <EmptyState />
        )}
        {children}
      </Suspense>

      <AutoFit camera={true} object={loadedModel || null} />
    </Canvas>
  );
};

const AutoFit: React.FC<{ camera: boolean; object: THREE.Object3D | null }> = ({
  object,
}) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!object) return;

    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Fit camera logic
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 5.0;

    camera.position.set(
      center.x + cameraZ * 0.8,
      center.y + cameraZ * 0.5,
      center.z + cameraZ * 0.8
    );
    camera.lookAt(center);

    if (controls) {
      (controls as any).target.copy(center);
      (controls as any).update();
    }
  }, [object, camera, controls]);

  return null;
};

const SimulationEffects: React.FC<{
  model: THREE.Object3D;
  simState: string;
}> = ({ model, simState }) => {
  useFrame((state, delta) => {
    if (simState !== "running") return;

    model.traverse((child) => {
      if (
        child.name.toLowerCase().includes("propeller") ||
        child.name.toLowerCase().includes("rotor")
      ) {
        child.rotation.y += delta * 20;
      }
    });

    if (
      model.name.toLowerCase().includes("drone") ||
      model.name.toLowerCase().includes("uav")
    ) {
      model.position.setY(
        model.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.001
      );
    }
  });

  return null;
};

const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      <pointLight position={[-10, -10, -5]} intensity={0.2} color="#4ade80" />
      <hemisphereLight args={["#ffffff", "#1f2937", 0.4]} />
    </>
  );
};

const LoadingModel: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4ade80" wireframe />
    </mesh>
  );
};

const EmptyState: React.FC = () => {
  return (
    <group>
      {/* Invisible plane to receive shadows */}
      <mesh
        position={[0, -0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <shadowMaterial opacity={0.1} />
      </mesh>
    </group>
  );
};

const ModelWithSelection: React.FC<{
  model: THREE.Object3D;
  selectedPart: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts: Set<string>;
}> = ({ model, selectedPart, onSelectPart, highlightedParts }) => {
  useEffect(() => {
    if (!model) return;

    console.log("[ModelWithSelection] Applying selection:", {
      selectedPart,
      highlightedParts: Array.from(highlightedParts),
    });

    let foundSelected = false;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (!material) return;

        const originalColor = mesh.userData.originalColor;

        const isSelected = selectedPart === mesh.uuid;
        const isHighlighted = highlightedParts.has(mesh.uuid);

        if (isSelected) {
          foundSelected = true;
          console.log(
            "[ModelWithSelection] Found selected mesh:",
            mesh.name,
            mesh.uuid
          );
          // Bright blue for selected part
          material.color.setHex(0x3b82f6);
          material.emissive.setHex(0x60a5fa);
          material.emissiveIntensity = 0.6;
          material.metalness = 0.7;
          material.roughness = 0.2;
        } else if (isHighlighted) {
          // Green for highlighted parts
          material.color.setHex(0x22c55e);
          material.emissive.setHex(0x4ade80);
          material.emissiveIntensity = 0.4;
          material.metalness = 0.6;
          material.roughness = 0.3;
        } else {
          // Restore original color
          if (originalColor !== undefined) {
            material.color.setHex(originalColor);
          }
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
          material.metalness = 0.5;
          material.roughness = 0.4;
        }

        material.needsUpdate = true;
      }
    });

    if (selectedPart && !foundSelected) {
      console.warn(
        "[ModelWithSelection] Selected part not found in model:",
        selectedPart
      );
    }
  }, [model, selectedPart, highlightedParts]);

  useFrame((state) => {
    if (!model || !selectedPart) return;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.uuid === selectedPart) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material) {
          const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.6;
          material.emissiveIntensity = pulse;
        }
      }
    });
  });

  return (
    <primitive
      object={model}
      onClick={(e: any) => {
        e.stopPropagation();
        if (onSelectPart && e.object.uuid) {
          onSelectPart(selectedPart === e.object.uuid ? null : e.object.uuid);
        }
      }}
      onPointerMissed={(e: any) => {
        if (e.type === "click" && onSelectPart) {
          onSelectPart(null);
        }
      }}
    />
  );
};
