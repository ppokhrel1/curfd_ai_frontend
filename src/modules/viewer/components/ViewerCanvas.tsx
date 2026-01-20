import { GeneratedShape } from "@/modules/ai/types/chat.type";
import {
  ContactShadows,
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
import { ShapeRenderer } from "./ShapeRenderer";

interface ViewerCanvasProps {
  state: ViewerState;
  shape?: GeneratedShape | null;
  loadedModel?: THREE.Object3D | null;
  selectedPart?: string | null;
  onSelectPart?: (partId: string | null) => void;
  highlightedParts?: Set<string>;
  simState?: 'idle' | 'running' | 'paused' | 'completed';
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
      }}
      dpr={[1, 2]} // Adaptive pixel ratio
    >
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate={state.autoRotate}
        autoRotateSpeed={0.8}
        minDistance={2}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
        makeDefault
      />

      {/* Lighting Setup */}
      <Suspense fallback={null}>
        <Lighting />
      </Suspense>

      {/* Environment */}
      <Environment preset="city" />

      {/* Grid */}
      {state.showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.6}
          cellColor="#4ade80"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#22c55e"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />
      )}

      {/* Contact Shadows for better ground presence */}
      <ContactShadows
        position={[0, -0.49, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
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
             <primitive object={loadedModel} />
             <SimulationEffects model={loadedModel} simState={state.simState || 'idle'} />
          </group>
        ) : shape ? (
          <ShapeRenderer
            shape={shape}
            wireframe={state.wireframe}
            animated={!state.wireframe}
            selectedPart={selectedPart}
            onSelectPart={onSelectPart}
            highlightedParts={highlightedParts}
          />
        ) : (
          <EmptyState />
        )}
        {children}
      </Suspense>

      <AutoFit camera={true} object={loadedModel || null} />
    </Canvas>
  );
};

// Component to handle auto-fitting the camera
const AutoFit: React.FC<{ camera: boolean; object: THREE.Object3D | null }> = ({ object }) => {
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
    cameraZ *= 2.5; // Add some padding

    camera.position.set(center.x + cameraZ, center.y + cameraZ / 2, center.z + cameraZ);
    camera.lookAt(center);
    
    if (controls) {
      (controls as any).target.copy(center);
      (controls as any).update();
    }
  }, [object, camera, controls]);

  return null;
};

// Component to apply animations during simulation
const SimulationEffects: React.FC<{ model: THREE.Object3D; simState: string }> = ({ model, simState }) => {
  useFrame((state, delta) => {
    if (simState !== 'running') return;

    model.traverse((child) => {
      // Rotate things that look like propellers
      if (child.name.toLowerCase().includes('propeller') || child.name.toLowerCase().includes('rotor')) {
        child.rotation.y += delta * 20;
      }
    });

    // Subtle hover effect for drones
    if (model.name.toLowerCase().includes('drone') || model.name.toLowerCase().includes('uav')) {
      model.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.001;
    }
  });

  return null;
};

// Lighting Component
const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
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

// Loading placeholder
const LoadingModel: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4ade80" wireframe />
    </mesh>
  );
};

// Empty state - just show text
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
