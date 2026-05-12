import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import type { AssemblyPart } from "@/modules/viewer/stores/assemblyStore";
import {
  Center,
  GizmoHelper,
  GizmoViewport,
  Grid,
  PerspectiveCamera,
  TrackballControls,
  TransformControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useCallback } from "react";
import * as THREE from "three";
import type { ViewerState } from "../types/viewer.type";

export interface PartTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

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
  /** 0..1 explode factor — passed through to AssemblyPartScene per part. */
  explodeAmount?: number;
  onSelectAssemblyPart?: (id: string | null) => void;
  onAssemblyTransformChange?: (id: string, position: [number, number, number], rotation: [number, number, number]) => void;
  onPartTransformChange?: (partId: string, transform: PartTransform) => void;
  partTransforms?: Record<string, PartTransform>;
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
  explodeAmount,
  onSelectAssemblyPart,
  onAssemblyTransformChange,
  onPartTransformChange,
  partTransforms,
  onCanvasReady,
  children,
}) => {
  return (
    <Canvas
      shadows
      style={{ background: state.backgroundColor }}
      gl={{
        antialias: true,
        // alpha must be true for the CSS background to show through —
        // otherwise WebGL clears with an opaque colour and the
        // translucent CSS layer behind it gets covered.
        alpha: true,
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

      {/* Controls — TrackballControls instead of OrbitControls so
            you can spin the model freely past vertical (no polar-
            angle clamp). OrbitControls fundamentally couldn't go
            past 180° vertically because its spherical-coord math
            degenerates at the poles; TrackballControls uses
            quaternion rotation so it spins freely around any axis.
            *
            * staticMoving=false enables damping. dynamicDampingFactor
              0.15 is the equivalent of OrbitControls's
              dampingFactor — gentle inertia after gesture release.
            * Speed knobs match what we tuned on OrbitControls.
            * autoRotate / autoRotateSpeed aren't part of
              TrackballControls; if we want them back we'd drive the
              camera manually from a useFrame in the parent. The
              `state.autoRotate` toggle currently no-ops while we
              decide if that's worth re-implementing.
        */}
      <TrackballControls
        rotateSpeed={2.5}
        zoomSpeed={1.2}
        panSpeed={0.8}
        staticMoving={false}
        dynamicDampingFactor={0.15}
        minDistance={0.01}
        maxDistance={100000}
        noRotate={false}
        noZoom={false}
        noPan={false}
        makeDefault
      />

      <Suspense fallback={null}>
        <Lighting />
      </Suspense>

      {/* Removed Environment preset="city" — it downloads potsdamer_platz HDR at runtime which fails on mobile */}

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

      {/* Scene Content. Three modes:
            1. A part is selected from chat / AssemblyTree → render
               assembly so the selected part can highlight (the
               combined mesh has no per-part hooks).
            2. No part selected, combined `loadedModel` available →
               render it (smooth, high-quality output).
            3. No combined, but assembly parts loaded → fallback to
               assembly view.
            4. Otherwise EmptyState. */}
      <Suspense fallback={<LoadingModel />}>
        {(assemblyParts && assemblyParts.length > 0 && selectedAssemblyPartId) ? (
          assemblyParts
            .filter(p => p.visible && p.model)
            .map(p => (
              <AssemblyPartScene
                key={p.id}
                part={p}
                isSelected={selectedAssemblyPartId === p.id}
                transformMode={transformMode || null}
                explodeAmount={explodeAmount}
                onSelect={(id) => onSelectAssemblyPart?.(id)}
                onTransformChange={(id, pos, rot) => onAssemblyTransformChange?.(id, pos, rot)}
              />
            ))
        ) : loadedModel ? (
          <ModelScene
            model={loadedModel}
            selectedPart={selectedPart || null}
            onSelectPart={onSelectPart}
            highlightedParts={highlightedParts || new Set()}
            simState={state.simState || "idle"}
            transformMode={transformMode || null}
            onPartTransformChange={onPartTransformChange}
            partTransforms={partTransforms}
          />
        ) : assemblyParts && assemblyParts.length > 0 ? (
          assemblyParts
            .filter(p => p.visible && p.model)
            .map(p => (
              <AssemblyPartScene
                key={p.id}
                part={p}
                isSelected={selectedAssemblyPartId === p.id}
                transformMode={transformMode || null}
                explodeAmount={explodeAmount}
                onSelect={(id) => onSelectAssemblyPart?.(id)}
                onTransformChange={(id, pos, rot) => onAssemblyTransformChange?.(id, pos, rot)}
              />
            ))
        ) : (
          <EmptyState />
        )}

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
  /** 0..1 explode factor; offset applied along the part's centroid
   *  direction from the assembly origin. */
  explodeAmount?: number;
  onSelect: (id: string) => void;
  onTransformChange: (id: string, position: [number, number, number], rotation: [number, number, number]) => void;
}> = ({ part, isSelected, transformMode, explodeAmount = 0, onSelect, onTransformChange }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const { controls } = useThree();
  const isDraggingRef = useRef(false);

  // Compute the part's centroid offset from the assembly origin (per-mount).
  // Used to push the part outward when explodeAmount > 0.
  const explodeDirection = useMemo<[number, number, number]>(() => {
    if (!part.model) return [0, 0, 0];
    const box = new THREE.Box3().setFromObject(part.model);
    if (box.isEmpty()) return [0, 0, 0];
    const center = box.getCenter(new THREE.Vector3());
    return [center.x, center.y, center.z];
  }, [part.model]);

  // Imperatively sync position/rotation from store (skipped while dragging to avoid R3F conflict).
  // explodeAmount adds an offset on top of the stored position so the user can scrub the slider
  // without overwriting their actual transforms.
  useEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return;
    const [rx, ry, rz] = part.rotation.map(d => (d * Math.PI) / 180);
    const factor = explodeAmount * 4; // 0..1 → 0..4 units of separation
    groupRef.current.position.set(
      part.position[0] + explodeDirection[0] * factor,
      part.position[1] + explodeDirection[1] * factor,
      part.position[2] + explodeDirection[2] * factor,
    );
    groupRef.current.rotation.set(rx, ry, rz);
  }, [part.position, part.rotation, explodeAmount, explodeDirection]);

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
    // Don't round — rounding here makes the model snap to the rounded
    // value when the position useEffect re-applies the stored position
    // after mouse-up (visible as an abrupt jump at the end of a
    // transform). Pass the full precision through to the store.
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    onTransformChange(
      part.id,
      [p.x, p.y, p.z],
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

// PartTransformGizmo: attaches TransformControls to a specific mesh within the model
const PartTransformGizmo: React.FC<{
  model: THREE.Object3D;
  partId: string;
  mode: "translate" | "rotate" | "scale";
  onTransformChange?: (partId: string, transform: PartTransform) => void;
}> = ({ model, partId, mode, onTransformChange }) => {
  const { controls } = useThree();
  const meshRef = useRef<THREE.Object3D | null>(null);

  // Find the target mesh by name or uuid
  useEffect(() => {
    let found: THREE.Object3D | null = null;
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const key = child.name || child.uuid;
        if (key === partId || child.uuid === partId) {
          found = child;
        }
      }
    });
    meshRef.current = found;
  }, [model, partId]);

  const handleMouseUp = useCallback(() => {
    if (controls) (controls as any).enabled = true;
    if (!meshRef.current || !onTransformChange) return;
    const p = meshRef.current.position;
    const r = meshRef.current.rotation;
    const s = meshRef.current.scale;
    const toDeg = (rad: number) => parseFloat(((rad * 180) / Math.PI).toFixed(2));
    onTransformChange(partId, {
      position: [parseFloat(p.x.toFixed(3)), parseFloat(p.y.toFixed(3)), parseFloat(p.z.toFixed(3))],
      rotation: [toDeg(r.x), toDeg(r.y), toDeg(r.z)],
      scale: [parseFloat(s.x.toFixed(3)), parseFloat(s.y.toFixed(3)), parseFloat(s.z.toFixed(3))],
    });
  }, [controls, onTransformChange, partId]);

  if (!meshRef.current) return null;

  return (
    <TransformControls
      object={meshRef.current}
      mode={mode}
      onMouseDown={() => { if (controls) (controls as any).enabled = false; }}
      onMouseUp={handleMouseUp}
    />
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
  onPartTransformChange?: (partId: string, transform: PartTransform) => void;
  partTransforms?: Record<string, PartTransform>;
}> = ({ model, selectedPart, onSelectPart, highlightedParts, simState, transformMode, onPartTransformChange, partTransforms }) => {
  const { controls } = useThree();
  const groupRef = useRef<THREE.Group>(null!);

  // Apply stored per-part transforms
  useEffect(() => {
    if (!model || !partTransforms) return;
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const key = child.name || child.uuid;
        const t = partTransforms[key] || partTransforms[child.uuid];
        if (t) {
          child.position.set(...t.position);
          child.rotation.set(
            (t.rotation[0] * Math.PI) / 180,
            (t.rotation[1] * Math.PI) / 180,
            (t.rotation[2] * Math.PI) / 180,
          );
          child.scale.set(...t.scale);
        }
      }
    });
  }, [model, partTransforms]);

  // Determine if we should apply TransformControls to individual part vs whole model
  const hasPartSelected = selectedPart && transformMode;

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

  return (
    <>
      {content}
      {/* Per-part TransformControls when a specific part is selected */}
      {hasPartSelected && (
        <PartTransformGizmo
          model={model}
          partId={selectedPart}
          mode={transformMode}
          onTransformChange={onPartTransformChange}
        />
      )}
    </>
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

    // Fit camera distance based on model size
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 3.0;

    // Update camera clipping planes to accommodate model size
    const perspCamera = camera as THREE.PerspectiveCamera;
    perspCamera.near = Math.max(0.01, maxDim * 0.001);
    perspCamera.far = Math.max(10000, maxDim * 100);
    perspCamera.updateProjectionMatrix();

    camera.position.set(
      center.x + cameraZ * 0.8,
      center.y + cameraZ * 0.5,
      center.z + cameraZ * 0.8
    );
    camera.lookAt(center);

    if (controls) {
      // Works for both OrbitControls and TrackballControls — they
      // share .target / .maxDistance / .update().
      const c = controls as any;
      c.target.copy(center);
      c.maxDistance = Math.max(10000, maxDim * 50);
      c.update();
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
  // Soft "studio softbox" rig — mimics Mac Preview's clean look
  // without needing an HDR environment (which fails on mobile, per
  // the earlier removal of the Environment preset).
  //
  // Strategy: lots of diffuse fill from every direction, very weak
  // directional. With smooth normals on the imported mesh, this
  // gives near-uniform lighting across adjacent triangles so the
  // marching-cubes tessellation doesn't read as visible bow-tie
  // patterns. The old rig had directional intensity=1 with shadow
  // casting + a green pointLight that punched chromatic bands into
  // the dark side, both of which accentuated the triangulation.
  return (
    <>
      {/* Strong ambient — base fill across the whole surface */}
      <ambientLight intensity={0.85} />

      {/* Hemisphere — sky-vs-ground gradient, soft directional cue */}
      <hemisphereLight args={["#ffffff", "#dcdde0", 0.8]} />

      {/* Very weak directional — gives just enough shape cue for the
          eye to read 3D, without harsh face-by-face shading. Shadows
          OFF: shadow maps create sharp lines along triangle edges
          which is exactly the "stripes" effect we're trying to kill. */}
      <directionalLight position={[10, 10, 5]} intensity={0.35} />

      {/* Fill from the opposite side, neutral white. Replaces the
          green pointLight which was tinting the dark side and made
          the patterning much more visible. */}
      <directionalLight position={[-8, -6, -4]} intensity={0.15} />
    </>
  );
};

const LoadingModel: React.FC = () => {
  // Subtle pulsing sphere — replaces a placeholder green wireframe cube.
  // Uses the brand violet accent and breathes via useFrame so the user
  // feels something is happening while the GLTF loader streams the model.
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + 0.08 * Math.sin(clock.elapsedTime * 2);
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[0.7, 32, 24]} />
      <meshStandardMaterial
        color="#a78bfa"
        emissive="#7c3aed"
        emissiveIntensity={0.25}
        roughness={0.4}
        metalness={0.1}
        transparent
        opacity={0.85}
      />
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
        const isHidden = highlightedParts.has(meshKey) || highlightedParts.has(mesh.uuid);

        // Toggle visibility — parts in highlightedParts set are hidden
        mesh.visible = !isHidden;

        if (isSelected) {
          material.color.setHex(0x3b82f6);
          material.emissive.setHex(0x60a5fa);
          material.emissiveIntensity = 0.6;
          material.metalness = 0.7;
          material.roughness = 0.2;
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
