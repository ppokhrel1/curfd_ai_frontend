import { ROUTES } from "@/lib/constants";
import { ControlsHint } from "@/modules/viewer/components/ControlsHint";
import { ModelSidebar } from "@/modules/viewer/components/ModelSidebar";
import { StatsDisplay } from "@/modules/viewer/components/StatsDisplay";
import { Toolbar } from "@/modules/viewer/components/Toolbar";
import { ViewerCanvas } from "@/modules/viewer/components/ViewerCanvas";
import { useViewer } from "@/modules/viewer/hooks/useViewer";
import { Camera, Download, Home, Share2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { FBXLoader, GLTFLoader, OBJLoader, STLLoader } from "three-stdlib";

const ViewerPage: React.FC = () => {
  const {
    state,
    stats,
    toggleGrid,
    toggleWireframe,
    toggleAxes,
    toggleAutoRotate,
    reset,
    updateStats,
  } = useViewer();

  const [loadedModel, setLoadedModel] = useState<THREE.Object3D | null>(null);
  const [modelName, setModelName] = useState("No Model Loaded");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.size, file.type);

    // Validate file size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is 50MB`);
      return;
    }

    setIsImporting(true);
    const loadingToast = toast.loading(`Loading ${file.name}...`);

    try {
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      console.log('File extension:', extension);
      
      const url = URL.createObjectURL(file);
      console.log('Object URL created:', url);
      
      let model: THREE.Object3D | null = null;

      // Load based on file type
      if (extension === ".gltf" || extension === ".glb") {
        console.log('Loading GLTF/GLB...');
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            url,
            (result) => {
              console.log('GLTF loaded successfully', result);
              resolve(result);
            },
            (progress) => {
              console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%');
            },
            (error) => {
              console.error('GLTF load error:', error);
              reject(error);
            }
          );
        });
        model = gltf.scene;
      } else if (extension === ".obj") {
        console.log('Loading OBJ...');
        const loader = new OBJLoader();
        model = await new Promise<THREE.Object3D>((resolve, reject) => {
          loader.load(
            url,
            (result) => {
              console.log('OBJ loaded successfully', result);
              resolve(result);
            },
            undefined,
            (error) => {
              console.error('OBJ load error:', error);
              reject(error);
            }
          );
        });
      } else if (extension === ".fbx") {
        console.log('Loading FBX...');
        const loader = new FBXLoader();
        model = await new Promise<THREE.Object3D>((resolve, reject) => {
          loader.load(
            url,
            (result) => {
              console.log('FBX loaded successfully', result);
              resolve(result);
            },
            undefined,
            (error) => {
              console.error('FBX load error:', error);
              reject(error);
            }
          );
        });
      } else if (extension === ".stl") {
        console.log('Loading STL...');
        const loader = new STLLoader();
        const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
          loader.load(
            url,
            (result) => {
              console.log('STL loaded successfully', result);
              resolve(result);
            },
            undefined,
            (error) => {
              console.error('STL load error:', error);
              reject(error);
            }
          );
        });
        const material = new THREE.MeshStandardMaterial({
          color: 0x22c55e,
          metalness: 0.3,
          roughness: 0.4,
        });
        model = new THREE.Mesh(geometry, material);
      } else {
        throw new Error(`Unsupported file format: ${extension}`);
      }

      if (model) {
        console.log('Model loaded, processing...');
        
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 3 / maxDim;
          model.scale.multiplyScalar(scale);
        }

        // Calculate stats
        let vertices = 0;
        let faces = 0;
        const materials = new Set<THREE.Material>();

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const geometry = child.geometry;
            if (geometry.attributes.position) {
              vertices += geometry.attributes.position.count;
            }
            if (geometry.index) {
              faces += geometry.index.count / 3;
            } else if (geometry.attributes.position) {
              faces += geometry.attributes.position.count / 3;
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => materials.add(mat));
              } else {
                materials.add(child.material);
              }
            }
          }
        });

        console.log('Model stats:', { vertices, faces, materials: materials.size });

        updateStats({
          vertices: Math.round(vertices),
          faces: Math.round(faces),
          triangles: Math.round(faces),
          materials: materials.size,
        });

        setLoadedModel(model);
        setModelName(file.name);
        console.log('Model set successfully!');
        toast.success(`${file.name} loaded successfully!`, { id: loadingToast });
      }

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error loading model:", error);
      toast.error(
        `Failed to load: ${error instanceof Error ? error.message : "Unknown error"}`,
        { id: loadingToast }
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = () => {
    if (!loadedModel) {
      toast.error("No model loaded to export");
      return;
    }
    toast.success("Export feature coming soon!");
  };

  const handleScreenshot = () => {
    toast.success("Screenshot feature coming soon!");
  };

  const handleShare = () => {
    if (!loadedModel) {
      toast.error("No model loaded to share");
      return;
    }
    toast.success("Share feature coming soon!");
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md px-4 py-3 relative z-[9999]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-white">3D Viewer</h1>
            <div className="h-6 w-px bg-neutral-700" />
            <span className="text-sm text-neutral-400 truncate max-w-xs">
              {modelName}
            </span>
          </div>

          <div className="flex items-center gap-2 relative z-[10000]">
            {/* Import Button */}
            <button
              onClick={() => {
                console.log('Import button clicked!');
                console.log('File input ref:', fileInputRef.current);
                fileInputRef.current?.click();
              }}
              disabled={isImporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg ${
                isImporting
                  ? "bg-neutral-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/25 cursor-pointer"
              } text-white font-medium`}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isImporting ? "Loading..." : "Import Model"}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gltf,.glb,.obj,.fbx,.stl"
              onChange={handleFileImport}
              disabled={isImporting}
              className="hidden"
            />

            {/* Action Buttons */}
            <button
              onClick={handleExport}
              disabled={!loadedModel}
              className="p-2 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Model"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleScreenshot}
              className="p-2 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200"
              title="Take Screenshot"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={handleShare}
              disabled={!loadedModel}
              className="p-2 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-neutral-700 mx-1" />

            <Link
              to={ROUTES.HOME}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <ViewerCanvas state={state} shape={null} loadedModel={loadedModel} />

          {/* Empty State Message */}
          {!loadedModel && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
              <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="p-6 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl">
                  <Upload className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-neutral-300 mb-2">
                    No Model Loaded
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-xs">
                    Click the Import button above to load a 3D model
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {['.gltf', '.glb', '.obj', '.fbx', '.stl'].map((format) => (
                      <span
                        key={format}
                        className="px-2 py-1 bg-neutral-800/50 text-neutral-400 text-xs rounded-md"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overlay Components */}
          <div className="absolute bottom-4 left-4 z-10">
            <Toolbar
              state={state}
              onToggleGrid={toggleGrid}
              onToggleWireframe={toggleWireframe}
              onToggleAxes={toggleAxes}
              onToggleAutoRotate={toggleAutoRotate}
              onReset={reset}
            />
          </div>
          <StatsDisplay />
          <ControlsHint />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-neutral-950 border-l border-neutral-800 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
          <ModelSidebar stats={stats} />
        </div>
      </div>
    </div>
  );
};

export default ViewerPage;
