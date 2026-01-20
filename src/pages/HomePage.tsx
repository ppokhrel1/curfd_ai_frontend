import { ResizablePanels } from "@/components/common/ResizablePanels";
import { StatusBar } from "@/components/common/StatusBar";
import { getDefaultShortcuts, useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAuthStore } from "@/lib/auth";
import { ChatInterface } from "@/modules/ai/components/ChatInterface";
import { GeneratedShape } from "@/modules/ai/types/chat.type";
import { SimulationPanel } from "@/modules/simulation/components/SimulationPanel";
import { ShapeModification } from "@/modules/viewer/components/ShapeModificationPanel";
import { Viewer3D } from "@/modules/viewer/components/Viewer3D";
import { ModelImporter } from "@/modules/viewer/services/ModelImporter";
import { Loader2, LogOut, MessageSquare, Minimize2, Play, Zap } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as THREE from "three";

type ViewMode = "chat-viewer" | "simulation";
type MobilePanel = "chat" | "viewer";

// Interface for ChatInterface ref
interface ChatInterfaceRef {
  sendSystemMessage: (message: string) => void;
}

const HomePage = () => {
  const { user, signOut } = useAuthStore();
  const [currentShape, setCurrentShape] = useState<GeneratedShape | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>("chat-viewer");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const chatRef = useRef<ChatInterfaceRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadedModel, setLoadedModel] = useState<THREE.Group | null>(null);
  const [modelStats, setModelStats] = useState<any>(); // Simple any to avoid rigid type issues
  const [isImporting, setIsImporting] = useState(false);
  const importer = useMemo(() => new ModelImporter(), []);

  const handleImportModel = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const loadingToast = toast.loading(`Importing ${file.name}...`);
    
    // Clear everything first to prevent "dummy" rendering during transition
    setLoadedModel(null);
    setCurrentShape(null);
    setModelStats(undefined);
    
    try {
      if (file.name.endsWith('.zip')) {
        const imported = await importer.importZip(file);
        setLoadedModel(imported.group);
        
        // Basic stats calculation
        let triCount = 0;
        let vertCount = 0;
        let matCount = new Set().size;
        let materialSet = new Set<string>();

        imported.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const geom = mesh.geometry;
            if (geom.index) triCount += geom.index.count / 3;
            else triCount += geom.attributes.position.count / 3;
            vertCount += geom.attributes.position.count;
            
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => materialSet.add(m.uuid));
            } else if (mesh.material) {
              materialSet.add(mesh.material.uuid);
            }
          }
        });
        setModelStats({ 
          triangles: Math.round(triCount), 
          vertices: vertCount,
          faces: Math.round(triCount), // Approx
          materials: materialSet.size || 1,
          fps: 60,
          drawCalls: 10
        });
        
        // Extract parts with better names from the actual meshes
        const parts: any[] = [];
        imported.group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            parts.push({
              id: child.uuid,
              name: child.name || (child.parent?.name !== imported.name ? child.parent?.name : null) || 'Solid Part',
              type: 'component' as const,
              description: `High-fidelity mesh: ${(child as THREE.Mesh).geometry.type}`,
              material: 'Standard',
            });
          }
        });

        const bbox = new THREE.Box3().setFromObject(imported.group);
        const size = bbox.getSize(new THREE.Vector3());

        const pseudoShape: GeneratedShape = {
          id: `imported-${Date.now()}`,
          name: imported.name,
          type: 'generic',
          description: `Imported model: ${imported.name}. ${imported.config ? 'Simulation-ready assembly.' : 'Static mesh collection.'}`,
          hasSimulation: true,
          geometry: {
            parts: parts,
            physics: imported.physics,
            yaml: imported.yaml,
            config: imported.config,
            specification: imported.specification,
            metadata: {
              totalVertices: vertCount,
              boundingBox: { 
                min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z }, 
                max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z } 
              }
            }
          },
          createdAt: new Date(),
        };
        
        setCurrentShape(pseudoShape);
        
        let message = `📁 **Imported Model: ${imported.name}**\n\n`;
        if (imported.config) message += `• Structure: Gazebo Model (SDF/Config detected)\n`;
        if (imported.specification) message += `• Specification: ${Object.keys(imported.specification).length} fields found\n`;
        message += `\nYou can now ask me to modify this model or use it in simulations!`;
        
        chatRef.current?.sendSystemMessage(message);
        toast.success(`${file.name} imported successfully!`, { id: loadingToast });
      } else {
        // Fallback for non-zip files if needed, or just warn
        chatRef.current?.sendSystemMessage(`Please import a .zip folder containing your model assets for full support.`);
        toast.error(`Please use .zip folders for complex models`, { id: loadingToast });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`, { id: loadingToast });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchModelFiles = useCallback(async (shape: GeneratedShape) => {
    if (!shape.sdfUrl) return;

    setIsImporting(true);
    const loadingToast = toast.loading(`Loading ${shape.name}...`);
    try {
      // Use backend proxy to avoid CORS/400 errors from direct asset access
      const API_BASE = "http://127.0.0.1:8000/api/v1";
      const proxify = (url: string) => `${API_BASE}/proxy/?url=${encodeURIComponent(url)}`;

      const imported = await importer.importFromUrl(
        proxify(shape.sdfUrl), 
        shape.yamlUrl ? proxify(shape.yamlUrl) : undefined, 
        shape.specification
      );
      
      setLoadedModel(imported.group);
      
      // Calculate stats for the loaded model
      let triCount = 0;
      let vertCount = 0;
      let materialSet = new Set<string>();

      imported.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const geom = mesh.geometry;
          if (geom.index) triCount += geom.index.count / 3;
          else triCount += geom.attributes.position.count / 3;
          vertCount += geom.attributes.position.count;
          
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => materialSet.add(m.uuid));
          } else if (mesh.material) {
            materialSet.add(mesh.material.uuid);
          }
        }
      });

      setModelStats({ 
        triangles: Math.round(triCount), 
        vertices: vertCount,
        faces: Math.round(triCount),
        materials: materialSet.size || 1,
        fps: 60,
        drawCalls: imported.group.children.length
      });

      toast.success("Model loaded successfully!", { id: loadingToast });
    } catch (err) {
      console.error("Failed to fetch model files:", err);
      toast.error("Could not load 3D model assets.", { id: loadingToast });
    } finally {
      setIsImporting(false);
    }
  }, [importer]);

  const handleShapeGenerated = useCallback((shape: GeneratedShape | null) => {
    setCurrentShape(shape);
    
    // ONLY clear the loadedModel if we are receiving a new AI-generated shape
    // that is NOT an imported one. This prevents the chat loop from clearing
    // the meshes right after a successful import.
    if (shape && !shape.id.startsWith('imported-')) {
      setLoadedModel(null); 
      setModelStats(undefined);
       
      // Trigger high-fidelity mesh fetch if we have an SDF URL
      if (shape.sdfUrl) {
         fetchModelFiles(shape);
      }
    }

    if (shape && window.innerWidth < 1024) {
      setMobilePanel("viewer");
    }
  }, [fetchModelFiles]);

  const handleOpenSimulation = useCallback(() => {
    if (currentShape?.hasSimulation) {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveView("simulation");
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentShape?.hasSimulation]);

  const handleBackToViewer = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveView("chat-viewer");
      setIsTransitioning(false);
    }, 150);
  }, []);

  const handleMobilePanelSwitch = useCallback((panel: MobilePanel) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMobilePanel(panel);
      setIsTransitioning(false);
    }, 100);
  }, []);

  // Handle modification from viewer - sync to chat
  const handleShapeModify = useCallback((mod: ShapeModification, label: string) => {
    // Update shape description to reflect modification
    if (currentShape) {
      setCurrentShape({
        ...currentShape,
        description: `${currentShape.description} | Modified: ${label}`,
      });
    }
    // Send message to chat (will be handled by ChatInterface)
    chatRef.current?.sendSystemMessage(`✓ Applied modification: ${label}`);
  }, [currentShape]);

  useKeyboardShortcuts({
    shortcuts: getDefaultShortcuts({
      goToChat: () => { setActiveView("chat-viewer"); setMobilePanel("chat"); },
      goToViewer: () => { setActiveView("chat-viewer"); setMobilePanel("viewer"); },
      goToSimulation: currentShape?.hasSimulation ? handleOpenSimulation : undefined,
      toggleFullscreen: () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      },
    }),
  });

  return (
    <div className="h-screen bg-neutral-950 flex flex-col overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.gltf,.glb,.obj,.fbx,.stl"
        onChange={handleFileImport}
        className="hidden"
      />
      
      {isImporting && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-12 h-12 text-green-400 animate-spin relative" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold text-lg">Importing Model</h3>
              <p className="text-neutral-500 text-sm">Processing ZIP and assets...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="flex-shrink-0 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
              <Zap className="w-4 h-4 text-green-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white">CURFD AI</h1>
              <p className="text-[10px] text-neutral-500">
                {user?.name?.split(" ")[0] || "User"}
              </p>
            </div>
          </div>

          {/* Center: View Toggle */}
          <div className="hidden lg:flex items-center gap-0.5 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveView("chat-viewer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                activeView === "chat-viewer"
                  ? "bg-green-500/15 text-green-400"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={handleOpenSimulation}
              disabled={!currentShape?.hasSimulation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                activeView === "simulation"
                  ? "bg-green-500/15 text-green-400"
                  : "text-neutral-400 hover:text-white disabled:opacity-40"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {currentShape && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-neutral-300 max-w-20 truncate">{currentShape.name}</span>
              </div>
            )}
            <button
              onClick={signOut}
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={`flex-1 overflow-hidden transition-opacity duration-150 relative ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
        
        {/* Chat & Viewer View */}
        <div 
          className={`absolute inset-0 z-0 ${activeView === "chat-viewer" ? "block opacity-100 placeholder-shown:visible" : "hidden opacity-0 invisible"}`}
          style={{ transition: 'opacity 0.3s' }}
        >
          {/* Desktop */}
          <div className="hidden lg:block h-full">
            <ResizablePanels
              leftPanel={
                <div className="h-full border-r border-neutral-800">
                  <ChatInterface ref={chatRef} onShapeGenerated={handleShapeGenerated} />
                </div>
              }
              rightPanel={
                <Viewer3D
                  shape={currentShape}
                  loadedModel={loadedModel}
                  customStats={modelStats}
                  onOpenSimulation={handleOpenSimulation}
                  onImportModel={handleImportModel}
                  onShapeModify={handleShapeModify}
                />
              }
                defaultLeftWidth={30}
                minLeftWidth={20}
              />
          </div>

          {/* Mobile */}
          <div className="lg:hidden h-full flex flex-col">
            <div className="flex-1 overflow-hidden relative">
              {mobilePanel === "chat" ? (
                <ChatInterface ref={chatRef} onShapeGenerated={handleShapeGenerated} />
              ) : (
                <Viewer3D
                  shape={currentShape}
                  loadedModel={loadedModel}
                  customStats={modelStats}
                  onOpenSimulation={handleOpenSimulation}
                  onImportModel={handleImportModel}
                  onShapeModify={handleShapeModify}
                />
              )}
            </div>
            
            {/* Mobile Nav */}
            <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900 p-2 flex gap-2">
              <button
                onClick={() => setMobilePanel("chat")}
                className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                  mobilePanel === "chat"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Chat
              </button>
              <button
                onClick={() => setMobilePanel("viewer")}
                className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                  mobilePanel === "viewer"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                3D View
              </button>
            </div>
          </div>
        </div>

        {/* Simulation View */}
        {activeView === "simulation" && (
          <div className="absolute inset-0 z-10 bg-neutral-950">
             <SimulationPanel 
               shape={currentShape}
               loadedModel={loadedModel}
               onBack={handleBackToViewer} 
             />
          </div>
        )}
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden flex-shrink-0 border-t border-neutral-800 bg-neutral-950 p-1.5">
        <div className="grid grid-cols-3 gap-1">
          <NavBtn icon={<MessageSquare />} label="Chat" active={mobilePanel === "chat" && activeView === "chat-viewer"} onClick={() => handleMobilePanelSwitch("chat")} />
          <NavBtn icon={<Minimize2 />} label="Viewer" active={mobilePanel === "viewer" && activeView === "chat-viewer"} onClick={() => handleMobilePanelSwitch("viewer")} />
          <NavBtn icon={<Play />} label="Simulate" active={activeView === "simulation"} onClick={handleOpenSimulation} disabled={!currentShape?.hasSimulation} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="hidden lg:block flex-shrink-0">
        <StatusBar currentShape={currentShape} activeView={activeView} onOpenSimulation={handleOpenSimulation} />
      </div>
    </div>
  );
};

const NavBtn: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; disabled?: boolean }> = ({ icon, label, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${
      active ? "bg-green-500/15 text-green-400" : "text-neutral-500 hover:text-neutral-300 disabled:opacity-40"
    }`}
  >
    <div className="w-5 h-5">{icon}</div>
    <span className="text-[10px]">{label}</span>
  </button>
);

export default HomePage;
