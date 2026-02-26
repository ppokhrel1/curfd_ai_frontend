import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import type { AssemblyPart } from "@/modules/viewer/stores/assemblyStore";
import {
  Center,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  PerspectiveCamera,
  TransformControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import type { ViewerState } from "../types/viewer.type";

interface ViewerCanvasProps {
  state: ViewerState;
  shape?: GeneratedShape | null;
  loadedModel?: THREE.Object3D | null;
  selectedPart?: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts?: Set<string>;
  simState?: "idle" | "running" | "paused" | "completed";
  transformMode?: "translate" | "rotate" | "scale" | null;
  assemblyParts?: AssemblyPart[];
  selectedAssemblyPartId?: string | null;
  onSelectAssemblyPart?: (id: string | null) => void;
  onAssemblyTransformChange?: (id: string, position: [number, number, number], rotation: [number, number, number]) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  children?: React.ReactNode;
}

export const ViewerCanvas: React.FC<ViewerCanvasProps> = ({
  state,
  shape,
  loadedModel,
  selectedPart,
  onSelectPart,
  highlightedParts,
  transformMode,
  assemblyParts,
  selectedAssemblyPartId,
  onSelectAssemblyPart,
  onAssemblyTransformChange,
  onCanvasReady,
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
        preserveDrawingBuffer: true,
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
        onCanvasReady?.(canvas);
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
        {/* Primary single model */}
        {loadedModel ? (
          <ModelScene
            model={loadedModel}
            selectedPart={selectedPart || null}
            onSelectPart={onSelectPart}
            highlightedParts={highlightedParts || new Set()}
            simState={state.simState || "idle"}
            transformMode={transformMode || null}
          />
        ) : (!assemblyParts || assemblyParts.length === 0) ? (
          <EmptyState />
        ) : null}

        {/* Assembly parts — each rendered with click selection + optional TransformControls */}
        {assemblyParts?.filter(p => p.visible && p.model).map(p => (
          <AssemblyPartScene
            key={p.id}
            part={p}
            isSelected={selectedAssemblyPartId === p.id}
            transformMode={transformMode || null}
            onSelect={(id) => onSelectAssemblyPart?.(id)}
            onTransformChange={(id, pos, rot) => onAssemblyTransformChange?.(id, pos, rot)}
          />
        ))}

        {children}
      </Suspense>

      <AutoFit camera={true} object={loadedModel || null} />
    </Canvas>
  );
};

// AssemblyPartScene: renders a single assembly part with click selection + TransformControls
const AssemblyPartScene: React.FC<{
  part: AssemblyPart;
  isSelected: boolean;
  transformMode: "translate" | "rotate" | "scale" | null;
  onSelect: (id: string) => void;
  onTransformChange: (id: string, position: [number, number, number], rotation: [number, number, number]) => void;
}> = ({ part, isSelected, transformMode, onSelect, onTransformChange }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const { controls } = useThree();
  const isDraggingRef = useRef(false);

  // Imperatively sync position/rotation from store (skipped while dragging to avoid R3F conflict)
  useEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return;
    const [rx, ry, rz] = part.rotation.map(d => (d * Math.PI) / 180);
    groupRef.current.position.set(part.position[0], part.position[1], part.position[2]);
    groupRef.current.rotation.set(rx, ry, rz);
  }, [part.position, part.rotation]);

  // Highlight selected part with emissive tint
  useEffect(() => {
    if (!part.model) return;
    part.model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (!mat) return;
        if (!mat.emissive) return;
        mat.emissive.setHex(isSelected ? 0x7c3aed : 0x000000);
        mat.emissiveIntensity = isSelected ? 0.35 : 0;
        mat.needsUpdate = true;
      }
    });
  }, [isSelected, part.model]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (controls) (controls as any).enabled = true;
    if (!groupRef.current) return;
    const p = groupRef.current.position;
    const r = groupRef.current.rotation;
    const toDeg = (rad: number) => parseFloat(((rad * 180) / Math.PI).toFixed(2));
    onTransformChange(
      part.id,
      [parseFloat(p.x.toFixed(3)), parseFloat(p.y.toFixed(3)), parseFloat(p.z.toFixed(3))],
      [toDeg(r.x), toDeg(r.y), toDeg(r.z)]
    );
  }, [controls, onTransformChange, part.id]);

  if (!part.model) return null;

  return (
    <>
      {/* TransformControls attaches to groupRef externally — group stays always mounted */}
      {isSelected && transformMode && (
        <TransformControls
          object={groupRef}
          mode={transformMode}
          onMouseDown={() => {
            isDraggingRef.current = true;
            if (controls) (controls as any).enabled = false;
          }}
          onMouseUp={handleMouseUp}
        />
      )}
      <group
        ref={groupRef}
        onClick={(e) => { e.stopPropagation(); onSelect(part.id); }}
      >
        <primitive object={part.model} />
      </group>
    </>
  );
};

// ModelScene: renders the model wrapped in optional TransformControls
const ModelScene: React.FC<{
  model: THREE.Object3D;
  selectedPart: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts: Set<string>;
  simState: string;
  transformMode: "translate" | "rotate" | "scale" | null;
}> = ({ model, selectedPart, onSelectPart, highlightedParts, simState, transformMode }) => {
  const { controls } = useThree();
  const groupRef = useRef<THREE.Group>(null!);

  const content = (
    <group ref={groupRef}>
      <Center>
        <ModelWithSelection
          model={model}
          selectedPart={selectedPart}
          onSelectPart={onSelectPart}
          highlightedParts={highlightedParts}
        />
      </Center>
      <SimulationEffects model={model} simState={simState} />
    </group>
  );

  if (!transformMode) return content;

  return (
    <TransformControls
      object={groupRef}
      mode={transformMode}
      onMouseDown={() => { if (controls) (controls as any).enabled = false; }}
      onMouseUp={() => { if (controls) (controls as any).enabled = true; }}
    >
      {content}
    </TransformControls>
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

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (!material) return;

        // Store original color on first encounter
        if (mesh.userData.originalColor === undefined) {
          mesh.userData.originalColor = material.color.getHex();
        }

        // Match by mesh name (shape part id) or uuid
        const meshKey = mesh.name || mesh.uuid;
        const isSelected = !!selectedPart && (
          meshKey === selectedPart ||
          mesh.uuid === selectedPart
        );
        const isHighlighted = highlightedParts.has(meshKey) || highlightedParts.has(mesh.uuid);

        if (isSelected) {
          material.color.setHex(0x3b82f6);
          material.emissive.setHex(0x60a5fa);
          material.emissiveIntensity = 0.6;
          material.metalness = 0.7;
          material.roughness = 0.2;
        } else if (isHighlighted) {
          material.color.setHex(0x22c55e);
          material.emissive.setHex(0x4ade80);
          material.emissiveIntensity = 0.4;
          material.metalness = 0.6;
          material.roughness = 0.3;
        } else {
          if (mesh.userData.originalColor !== undefined) {
            material.color.setHex(mesh.userData.originalColor);
          }
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
          material.metalness = 0.5;
          material.roughness = 0.4;
        }

        material.needsUpdate = true;
      }
    });
  }, [model, selectedPart, highlightedParts]);

  useFrame((state) => {
    if (!model || !selectedPart) return;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshKey = mesh.name || mesh.uuid;
        if (meshKey === selectedPart || mesh.uuid === selectedPart) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material) {
            const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.6;
            material.emissiveIntensity = pulse;
          }
        }
      }
    });
  });

  return (
    <primitive
      object={model}
      onClick={(e: any) => {
        e.stopPropagation();
        if (onSelectPart) {
          // Prefer the mesh name (matches shape part ids) over the THREE.js uuid
          const id = e.object.name || e.object.uuid;
          onSelectPart(selectedPart === id ? null : id);
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
