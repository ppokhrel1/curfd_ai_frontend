import { ResizablePanels } from "@/components/common/ResizablePanels";
import { StatusBar } from "@/components/common/StatusBar";
import {
  getDefaultShortcuts,
  useKeyboardShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { proxifyUrl } from "@/lib/apiConfig";
import { useAuthStore } from "@/lib/auth";
import {
  ChatInterface,
  ChatInterfaceRef,
} from "@/modules/ai/components/ChatInterface";
import { useChatSocket } from "@/modules/ai/hooks/useChatSocket";
import { chatService } from "@/modules/ai/services/chatService";
import { jobService } from "@/modules/ai/services/jobService";
import { useChatStore } from "@/modules/ai/stores/chatStore";
import { GeneratedShape } from "@/modules/ai/types/chat.type";
import { CADEditor } from "@/modules/editor/components/CADEditor";
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import {
  ImportStage,
  ModelImportOverlay,
} from "@/modules/viewer/components/ModelImportOverlay";
import { Viewer3D } from "@/modules/viewer/components/Viewer3D";
import { ModelImporter } from "@/modules/viewer/services/ModelImporter";
import { Asset, assetService } from "@/modules/viewer/services/assetService";
import { disposeObject3D } from "@/modules/viewer/utils/dispose";
import {
  Code2,
  LogOut,
  MessageSquare,
  Minimize2,
  Play,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import * as THREE from "three";

type ViewMode = "chat-viewer" | "simulation" | "editor";
type MobilePanel = "chat" | "viewer";

interface ModelStats {
  triangles: number;
  vertices: number;
  faces: number;
  materials: number;
  fps: number;
  drawCalls: number;
}

const HomePage = () => {
  const { user, signOut } = useAuthStore();
  const {
    activeConversationId,
    conversations,
    jobHistory,
    updateConversation,
  } = useChatStore();
  const [currentShape, setCurrentShape] = useState<GeneratedShape | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>("chat-viewer");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const chatRef = useRef<ChatInterfaceRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOriginalCode, setCode } = useEditorStore();

  // WebSocket connection status
  const { isConnected: wsConnected } = useChatSocket({
    chatId: activeConversationId,
    onEvent: () => {}, // Events handled in useChat hook
  });

  const [loadedModel, setLoadedModel] = useState<THREE.Group | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | undefined>();

  const handlePartSwap = async (partId: string, asset: Asset) => {
    if (!loadedModel || !currentShape) return;

    const toastId = toast.loading(`Swapping part with ${asset.name}...`);
    try {
      // Get asset URL (prefer url over uri)
      const assetUrl = asset.url || asset.uri;
      if (!assetUrl) {
        throw new Error("Asset URL not available");
      }

      // 1. Fetch asset blob
      const response = await fetch(assetUrl);
      if (!response.ok) throw new Error("Failed to download asset");
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);

      // 2. Parse geometry
      const importer = new ModelImporter();
      const newObject = await importer.loadSingleAsset(
        localUrl,
        asset.name || "New Part"
      );

      // 3. Find target part in loadedModel
      let targetMesh: THREE.Mesh | null = null;
      let targetParent: THREE.Object3D | null = null;

      loadedModel.traverse((child) => {
        if (child.uuid === partId && (child as THREE.Mesh).isMesh) {
          targetMesh = child as THREE.Mesh;
          targetParent = child.parent;
        }
      });

      if (!targetMesh || !targetParent) {
        throw new Error("Target part not found in scene");
      }

      // 4. Transform new object to match old object (preserve position/rotation/scale)
      const mesh = targetMesh as THREE.Mesh;
      newObject.position.copy(mesh.position);
      newObject.quaternion.copy(mesh.quaternion);
      newObject.scale.copy(mesh.scale);

      // Replace in scene
      (targetParent as THREE.Object3D).remove(mesh);
      (targetParent as THREE.Object3D).add(newObject);

      // 5. Update GeneratedShape
      const updatedParts = currentShape.geometry.parts.map((p: any) => {
        if (p.id === partId) {
          return {
            ...p,
            id: newObject.uuid, // Use NEW UUID
            name: newObject.name,
            assetName: asset.name, // Link to new asset
            assetUrl: asset.url,
          };
        }
        return p;
      });

      const newAssetEntry = {
        filename: asset.name,
        url: localUrl,
        blob: blob,
      };

      const updatedAssets = [...(currentShape.assets || []), newAssetEntry];

      const updatedShape = {
        ...currentShape,
        geometry: {
          ...currentShape.geometry,
          parts: updatedParts,
        },
        assets: updatedAssets,
      };

      setCurrentShape(updatedShape);

      // Trigger scene update
      setLoadedModel(loadedModel);

      toast.success("Part swapped successfully!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to swap part", { id: toastId });
    }
  };
  const [isImporting, setIsImporting] = useState(false);
  const [importStage, setImportStage] = useState<ImportStage>("idle");
  const [importFileName, setImportFileName] = useState("");
  const meshCache = useRef<Record<string, THREE.Group>>({});
  const cacheOrder = useRef<string[]>([]);
  const MAX_CACHE_SIZE = 5;

  const addToCache = useCallback((id: string, group: THREE.Group) => {
    // If already in cache, just update its position in the order
    if (meshCache.current[id]) {
      cacheOrder.current = [
        id,
        ...cacheOrder.current.filter((cacheId) => cacheId !== id),
      ];
      return;
    }

    // If cache is full, dispose the oldest entry
    if (cacheOrder.current.length >= MAX_CACHE_SIZE) {
      const oldestId = cacheOrder.current.pop();
      if (oldestId && meshCache.current[oldestId]) {
        console.log(
          `[HomePage] Evicting and disposing model from cache: ${oldestId}`
        );
        disposeObject3D(meshCache.current[oldestId]);
        delete meshCache.current[oldestId];
      }
    }

    // Add to cache
    meshCache.current[id] = group;
    cacheOrder.current = [id, ...cacheOrder.current];
  }, []);

  const warningShownRef = useRef<Set<string>>(new Set());
  const importer = useMemo(() => new ModelImporter(), []);

  // Track shape that needs to be fetched after initial render
  const [pendingFetchShape, setPendingFetchShape] =
    useState<GeneratedShape | null>(null);

  // Check for pending messages from Landing Page
  useEffect(() => {
    const pendingMessage = sessionStorage.getItem("pending_chat_message");
    if (pendingMessage && chatRef.current) {
      // Small delay to ensure chat is ready
      setTimeout(() => {
        chatRef.current?.sendUserMessage(pendingMessage);
        sessionStorage.removeItem("pending_chat_message");
      }, 500);
    }
  }, []);

  const handleImportModel = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsImporting(true);
    setImportStage("reading");
    setLoadedModel(null);
    setCurrentShape(null);
    setModelStats(undefined);

    try {
      if (file.name.endsWith(".zip")) {
        setImportStage("registering");
        const sessionId = chatService.getCurrentSessionId();
        let jobId = `local-${Date.now()}`;

        if (sessionId) {
          try {
            // Deduplicate: Check if a mission for this file already exists in this chat
            const existingJob = (
              jobHistory[activeConversationId || ""] || []
            ).find((j) => j.prompt === `Imported Model: ${file.name}`);

            if (existingJob) {
              jobId = existingJob.id;
              console.log("Reusing existing mission record:", jobId);
            } else {
              const job = await jobService.createJob({
                session_id: sessionId,
                prompt: `Imported Model: ${file.name}`,
                output_format: "glb",
                status: "succeeded",
              });
              jobId = job.id;

              // Add to store history
              const { addJobToHistory } = useChatStore.getState();
              if (activeConversationId) {
                addJobToHistory(activeConversationId, {
                  ...job,
                  status: "succeeded",
                  createdAt: new Date(),
                });
              }
            }
          } catch (e) {
            console.warn(
              "Failed to register job in backend, using local ID",
              e
            );
          }
        }

        setImportStage("extracting");
        const imported = await importer.importZip(file);

        setImportStage("analyzing");
        setLoadedModel(imported.group);

        if (imported.scad) {
          setOriginalCode(imported.scad);
          setActiveView("editor");
        }

        // Basic stats calculation
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
              mesh.material.forEach((m) => materialSet.add(m.uuid));
            } else if (mesh.material) {
              materialSet.add(mesh.material.uuid);
            }
          }
        });

        const bbox = new THREE.Box3().setFromObject(imported.group);

        setImportStage("registering");
        let assetId = `imported-${Date.now()}`;

        const isNewMission = !jobHistory[activeConversationId || ""]?.some(
          (j) => j.id === jobId
        );

        if (jobId && !jobId.startsWith("local-") && isNewMission) {
          try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onload = () => {
                const base64 = (reader.result as string).split(",")[1];
                resolve(base64);
              };
              reader.readAsDataURL(file);
            });

            const base64Data = await base64Promise;

            const asset = await assetService.createAsset({
              job_id: jobId,
              asset_type: "zip",
              uri: file.name,
              storage_provider: "base64",
              metadata_json: {
                data: base64Data,
                stats: { triangles: triCount, vertices: vertCount },
                originalName: file.name,
              },
            });
            assetId = asset.id;

            const partPromises: Promise<any>[] = [];
            imported.group.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                partPromises.push(
                  assetService.createAssetMeta({
                    asset_id: assetId,
                    part_name: child.name || "Solid Part",
                    component_of: undefined,
                    position_json: {
                      x: child.position.x,
                      y: child.position.y,
                      z: child.position.z,
                    },
                  })
                );
              }
            });
            if (partPromises.length > 0) {
              await Promise.all(partPromises.slice(0, 50));
            }
          } catch (e) {
            console.warn("Failed to register assets in backend", e);
          }
        }

        setImportStage("finalizing");

        const parts: any[] = [];
        const contentsGroup = imported.group.children.find(
          (c) => c.name === "Model Contents"
        );
        const groupToTraverse = contentsGroup || imported.group;

        groupToTraverse.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            parts.push({
              id: mesh.uuid,
              name: mesh.name || "Unnamed Part",
              category: "component",
              role: "structural",
              description: "Imported part",
              material: "Standard",
              group: "Model Components",
              assetName: mesh.userData.sourceFile || null,
            });
          }
        });

        const shapeData: GeneratedShape = {
          id: assetId,
          name: imported.name,
          type: "generic",
          description: `Imported model: ${imported.name}.`,
          hasSimulation: false,
          scadCode: imported.scad,
          jobId: jobId && !jobId.startsWith("local-") ? jobId : undefined,
          sdfUrl: URL.createObjectURL(file),
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
                max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
              },
            },
          },
          assets: imported.assets,
          createdAt: new Date(),
        };

        setCurrentShape(shapeData);

        addToCache(shapeData.id, imported.group);

        if (activeConversationId) {
          updateConversation(activeConversationId, {
            generatedShape: shapeData,
          });
        }

        setModelStats({
          triangles: Math.round(triCount),
          vertices: vertCount,
          faces: Math.round(triCount),
          materials: materialSet.size || 1,
          fps: 60,
          drawCalls: 10,
        });

        setImportStage("complete");
        setTimeout(() => setIsImporting(false), 1000);

        let message = `📁 **Imported Model: ${imported.name}**\n\n`;
        message += `Registered as Mission: \`${jobId}\`\n`;
        message += `\nYou can now analyze and modify this model in the viewer.`;

        chatRef.current?.sendSystemMessage(message, shapeData);
      } else {
        chatRef.current?.sendSystemMessage(
          `Please import a .zip folder containing your model assets for full support.`
        );
        setIsImporting(false);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsImporting(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchModelFiles = useCallback(
    async (shape: GeneratedShape) => {
      if (!shape.sdfUrl) return;

      setIsImporting(true);
      const loadingToast = toast.loading(`Loading ${shape.name}...`);
      try {
        const imported = await importer.importFromUrl(
          proxifyUrl(shape.sdfUrl),
          shape.yamlUrl ? proxifyUrl(shape.yamlUrl) : undefined,
          shape.specification,
          shape.assets?.map((a) => ({ ...a, url: proxifyUrl(a.url) })) || []
        );

        console.log(
          "[HomePage] Model imported successfully, meshes:",
          imported.group.children.length
        );
        setLoadedModel(imported.group);

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
              mesh.material.forEach((m) => materialSet.add(m.uuid));
            } else if (mesh.material) {
              materialSet.add(mesh.material.uuid);
            }
          }
        });

        const parts: any[] = [];
        imported.group.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            parts.push({
              id: child.uuid,
              name: child.name || "Solid Part",
              category: "component",
              role: "structural",
              group: "Model Components",
              assetName: child.userData.sourceFile || null,
            });
          }
        });

        setCurrentShape((prev) => {
          const updated = prev
            ? {
                ...prev,
                scadCode: imported.scad || prev.scadCode,
                geometry: {
                  ...prev.geometry,
                  parts: parts,
                  totalVertices: vertCount,
                },
              }
            : null;

          if (imported.scad) {
            setOriginalCode(imported.scad);
          }

          if (updated && activeConversationId) {
            updateConversation(activeConversationId, {
              generatedShape: updated,
            });
          }

          return updated;
        });

        setModelStats({
          triangles: Math.round(triCount),
          vertices: vertCount,
          faces: Math.round(triCount),
          materials: materialSet.size || 1,
          fps: 60,
          drawCalls: imported.group.children.length,
        });

        if (shape.id) {
          addToCache(shape.id, imported.group);
        }

        toast.success("Model loaded successfully!", { id: loadingToast });
      } catch (err) {
        console.error("Failed to fetch model files:", err);
        toast.error("Could not load 3D model assets.", { id: loadingToast });
      } finally {
        setIsImporting(false);
      }
    },
    [importer, addToCache]
  );

  useEffect(() => {
    setLoadedModel(null);
    setCurrentShape(null);
    setModelStats(undefined);
    setPendingFetchShape(null);

    if (!activeConversationId) {
      useEditorStore.getState().clear();
      return;
    }

    const activeConv = conversations.find((c) => c.id === activeConversationId);

    if (activeConv?.generatedShape?.scadCode) {
      console.log("[HomePage] Syncing editor with chat SCAD code");
      setOriginalCode(activeConv.generatedShape.scadCode);
    } else {
      console.log("[HomePage] Clearing editor for new/empty chat");
      useEditorStore.getState().clear();
    }

    if (activeConv?.generatedShape) {
      const shape = activeConv.generatedShape;
      console.log(
        "[HomePage] Attempting to restore shape:",
        shape.name,
        shape.id
      );

      if (shape.id && meshCache.current[shape.id]) {
        console.log("[HomePage] Restoring model from cache:", shape.name);
        setLoadedModel(meshCache.current[shape.id]);
        setCurrentShape(shape);
      } else if (shape.sdfUrl || (shape as any).jobId) {
        const isStaleBlob = shape.sdfUrl?.startsWith("blob:");

        if (isStaleBlob && (shape as any).jobId) {
          console.log(
            "[HomePage] Detected stale blob URL, recovering model from backend:",
            (shape as any).jobId
          );
          const recoverModel = async () => {
            setIsImporting(true);
            try {
              // Fetch assets for the job first
              const assets = await assetService.fetchAssets((shape as any).jobId!);
              const recoveredShape = await assetService.mapToGeneratedShape(
                (shape as any).jobId!,
                assets
              );
              if (recoveredShape) {
                console.log("[HomePage] Model recovered successfully");
                setCurrentShape(recoveredShape);
                fetchModelFiles(recoveredShape);
              }
            } catch (e) {
              console.error("[HomePage] Failed to recover model:", e);
            } finally {
              setIsImporting(false);
            }
          };
          recoverModel();
        } else if (shape.sdfUrl) {
          console.log(
            "[HomePage] Re-fetching model for chat session:",
            shape.name
          );
          setCurrentShape(shape);
          fetchModelFiles(shape);
        }
      } else if (shape.id) {
        console.log(
          "[HomePage] Session expired for imported model:",
          shape.name
        );
        setCurrentShape(shape);

        if (!warningShownRef.current.has(shape.id)) {
          toast.error(
            "Imported model session expired. Please re-import the file.",
            {
              duration: 5000,
              icon: "⚠️",
              id: `expiry-${shape.id}`,
            }
          );
          warningShownRef.current.add(shape.id);
        }
      }
    } else {
      warningShownRef.current.clear();
    }
  }, [
    activeConversationId,
    conversations,
    fetchModelFiles,
    setOriginalCode,
    addToCache,
  ]);

  const editorCode = useEditorStore((state) => state.code);
  useEffect(() => {
    if (!activeConversationId || !currentShape) return;

    if (editorCode === currentShape.scadCode) return;

    const timer = setTimeout(() => {
      console.log("[HomePage] Persisting editor code back to chat store");
      const updatedShape = { ...currentShape, scadCode: editorCode };
      setCurrentShape(updatedShape);
      updateConversation(activeConversationId, {
        generatedShape: updatedShape,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [editorCode, activeConversationId, currentShape, updateConversation]);

  const handleShapeGenerated = useCallback(
    (shape: GeneratedShape | null) => {
      console.log(
        "[HomePage] handleShapeGenerated called with:",
        shape?.name,
        shape?.id
      );

      if (!shape) {
        setCurrentShape(null);
        setLoadedModel(null);
        setModelStats(undefined);
        useEditorStore.getState().clear();
        return;
      }

      if (shape?.id && meshCache.current[shape.id]) {
        console.log("[HomePage] Restoring from cache:", shape.name);
        setLoadedModel(meshCache.current[shape.id]);
        setCurrentShape(shape);
        addToCache(shape.id, meshCache.current[shape.id]);

        if (shape.scadCode) {
          setOriginalCode(shape.scadCode);
        }
        return;
      }

      setCurrentShape(shape);

      if (shape && shape.id && !shape.id.startsWith("imported-")) {
        console.log("[HomePage] Processing generated shape:", shape.name);
        setLoadedModel(null);
        setModelStats(undefined);

        if (shape.scadCode) {
          console.log("[HomePage] Setting SCAD code in editor");
          setOriginalCode(shape.scadCode);
          setActiveView("editor");
        }

        if (shape.sdfUrl) {
          console.log("[HomePage] Fetching model from:", shape.sdfUrl);
          fetchModelFiles(shape);
        } else {
          console.warn("[HomePage] No sdfUrl provided for shape:", shape.name);
        }
      }

      if (shape && window.innerWidth < 1024) {
        setMobilePanel("viewer");
      }
    },
    [fetchModelFiles, addToCache, setOriginalCode]
  );

  const handleOpenSimulation = useCallback(() => {
    toast("Simulation module is Coming Soon!", {
      icon: "🚀",
      style: {
        borderRadius: "12px",
        background: "#171717",
        color: "#fff",
        border: "1px solid #262626",
      },
    });
  }, []);

  const handleMobilePanelSwitch = useCallback((panel: MobilePanel) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMobilePanel(panel);
      setIsTransitioning(false);
    }, 100);
  }, []);

  useKeyboardShortcuts({
    shortcuts: getDefaultShortcuts({
      goToChat: () => {
        setActiveView("chat-viewer");
        setMobilePanel("chat");
      },
      goToViewer: () => {
        setActiveView("chat-viewer");
        setMobilePanel("viewer");
      },
      goToEditor: () => {
        setActiveView("editor");
      },
      goToSimulation: currentShape?.hasSimulation
        ? handleOpenSimulation
        : undefined,
      toggleFullscreen: () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      },
    }),
  });

  return (
    <div className="h-screen bg-neutral-950 flex flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.gltf,.glb,.obj,.fbx,.stl"
        onChange={handleFileImport}
        className="hidden"
      />

      <ModelImportOverlay
        isOpen={isImporting}
        stage={importStage}
        fileName={importFileName}
      />

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

            {(currentShape?.scadCode || activeView === "editor") && (
              <button
                onClick={() => setActiveView("editor")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  activeView === "editor"
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
            )}

            <button
              onClick={handleOpenSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all text-neutral-400 hover:text-white"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            {activeConversationId && (
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                  wsConnected
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {wsConnected ? (
                  <Wifi className="w-3 h-3 text-green-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-400" />
                )}
                <span
                  className={`text-[10px] font-medium ${
                    wsConnected ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {wsConnected ? "Live" : "Offline"}
                </span>
              </div>
            )}

            {currentShape && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-neutral-300 max-w-20 truncate">
                  {currentShape.name}
                </span>
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
      <main
        className={`flex-1 overflow-hidden transition-opacity duration-150 relative ${isTransitioning ? "opacity-0" : "opacity-100"}`}
      >
        {/* Main Interface Flow */}
        <div className={`absolute inset-0 z-0 block opacity-100`}>
          {/* Desktop: 3-Panel Layout */}
          <div className="hidden lg:block h-full">
            <ResizablePanels
              storageKey="chat-panel-split"
              leftPanel={
                <div className="h-full border-r border-neutral-800">
                  <ChatInterface
                    key="desktop-chat"
                    ref={chatRef}
                    onShapeGenerated={handleShapeGenerated}
                  />
                </div>
              }
              rightPanel={
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0">
                    <ResizablePanels
                      storageKey="editor-viewer-split"
                      defaultLeftWidth={40}
                      minLeftWidth={20}
                      leftVisible={
                        !!currentShape?.scadCode || activeView === "editor"
                      }
                      leftPanel={
                        <div className="h-full border-r border-neutral-800">
                          <CADEditor />
                        </div>
                      }
                      rightPanel={
                        <div className="h-full relative overflow-hidden">
                          <Viewer3D
                            shape={currentShape}
                            loadedModel={loadedModel}
                            customStats={modelStats}
                            onOpenSimulation={handleOpenSimulation}
                            onImportModel={handleImportModel}
                            onSwapPart={handlePartSwap}
                          />
                        </div>
                      }
                    />
                  </div>
                </div>
              }
              defaultLeftWidth={20}
              minLeftWidth={15}
            />
          </div>

          {/* Mobile */}
          <div className="lg:hidden h-full flex flex-col">
            <div className="flex-1 overflow-hidden relative">
              {mobilePanel === "chat" ? (
                <ChatInterface
                  key="mobile-chat"
                  ref={chatRef}
                  onShapeGenerated={handleShapeGenerated}
                />
              ) : (
                <Viewer3D
                  shape={currentShape}
                  loadedModel={loadedModel}
                  customStats={modelStats}
                  onOpenSimulation={handleOpenSimulation}
                  onImportModel={handleImportModel}
                  onSwapPart={handlePartSwap}
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

        {/* Simulation View - Disabled for now */}
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden flex-shrink-0 border-t border-neutral-800 bg-neutral-950 p-1.5">
        <div className="grid grid-cols-3 gap-1">
          <NavBtn
            icon={<MessageSquare />}
            label="Chat"
            active={mobilePanel === "chat" && activeView === "chat-viewer"}
            onClick={() => handleMobilePanelSwitch("chat")}
          />
          <NavBtn
            icon={<Minimize2 />}
            label="Viewer"
            active={mobilePanel === "viewer" && activeView === "chat-viewer"}
            onClick={() => handleMobilePanelSwitch("viewer")}
          />
          <NavBtn
            icon={<Play />}
            label="Simulate"
            active={false}
            onClick={handleOpenSimulation}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="hidden lg:block flex-shrink-0">
        <StatusBar
          currentShape={currentShape}
          activeView={activeView}
          onOpenSimulation={handleOpenSimulation}
        />
      </div>
    </div>
  );
};

const NavBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ icon, label, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${
      active
        ? "bg-green-500/15 text-green-400"
        : "text-neutral-500 hover:text-neutral-300 disabled:opacity-40"
    }`}
  >
    <div className="w-5 h-5">{icon}</div>
    <span className="text-[10px]">{label}</span>
  </button>
);

export default HomePage;
