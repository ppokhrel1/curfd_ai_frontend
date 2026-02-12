import type { ModelSpecification } from "@/modules/ai/types/shape.type";
import JSZip from "jszip";
import * as THREE from "three";
import { GLTFLoader, OBJLoader, STLLoader } from "three-stdlib";
import { GeometryAnalyzer } from "../utils/GeometryAnalyzer";
import type { SDFVisual } from "../utils/SDFParser";
import { SDFParser } from "../utils/SDFParser";

export interface ImportedModel {
  group: THREE.Group;
  name: string;
  specification?: ModelSpecification;
  config?: string;
  yaml?: string;
  scad?: string;
  python?: string;
  physics?: Record<string, any>;
  assets?: { filename?: string; url: string; blob?: Blob }[];
}

export class ModelImporter {
  private sdfParser: SDFParser = new SDFParser();
  private stlLoader: STLLoader = new STLLoader();
  private objLoader: OBJLoader = new OBJLoader();
  private gltfLoader: GLTFLoader = new GLTFLoader();
  private analyzer: GeometryAnalyzer = new GeometryAnalyzer();

  private assets: { filename?: string; url: string }[] = [];

  async importFromUrl(
    sdfUrl: string,
    yamlUrl?: string,
    specification?: any,
    assets: { filename?: string; url: string }[] = []
  ): Promise<ImportedModel> {
    try {
      if (!sdfUrl.startsWith("blob:")) {
        new URL(sdfUrl);
      }
      if (yamlUrl && !yamlUrl.startsWith("blob:")) {
        new URL(yamlUrl);
      }
    } catch (e) {
      throw new Error("Invalid model URL provided");
    }

    this.assets = assets;
    const modelGroup = new THREE.Group();
    const contentsGroup = new THREE.Group();
    contentsGroup.name = "Model Contents";
    modelGroup.add(contentsGroup);

    let modelName = "Model";
    let yaml = "";

    try {
      if (yamlUrl) {
        const resp = await fetch(yamlUrl);
        if (resp.ok) yaml = await resp.text();
      }

      const isZipFile = sdfUrl.toLowerCase().endsWith(".zip");
      const isMeshFile =
        sdfUrl.toLowerCase().match(/\.(glb|gltf|stl|obj)$/) ||
        sdfUrl.startsWith("blob:");

      if (isZipFile) {
        console.log("ModelImporter: Loading from ZIP URL:", sdfUrl);
        const resp = await fetch(sdfUrl);
        if (!resp.ok) {
          const errorText = await resp.text().catch(() => resp.statusText);
          throw new Error(`Failed to fetch ZIP (${resp.status}): ${errorText}`);
        }
        const blob = await resp.blob();
        const file = new File([blob], sdfUrl.split("/").pop() || "model.zip", {
          type: "application/zip",
        });
        return await this.importZip(file);
      } else if (isMeshFile) {
        console.log("ModelImporter: Loading mesh file directly:", sdfUrl);
        const fileName = sdfUrl.startsWith("blob:")
          ? "model.glb"
          : sdfUrl.split("/").pop() || "model";
        const visualObj = await this.loadSingleAsset(sdfUrl, fileName);
        if (visualObj) contentsGroup.add(visualObj);
      } else {
        const resp = await fetch(sdfUrl);
        if (!resp.ok) {
          const errorText = await resp.text().catch(() => resp.statusText);
          throw new Error(`Failed to fetch SDF (${resp.status}): ${errorText}`);
        }
        const sdfContent = await resp.text();

        if (!sdfContent || sdfContent.trim().length === 0) {
          throw new Error("SDF file is empty");
        }

        const visuals = this.sdfParser.parse(sdfContent);
        console.log(`ModelImporter: Parsed ${visuals.length} visuals from SDF`);

        if (visuals.length === 0) {
          console.warn("ModelImporter: No visuals found in SDF file");
        }

        for (const visual of visuals) {
          const visualObj = await this.loadVisual(visual, sdfUrl);
          if (visualObj) contentsGroup.add(visualObj);
        }
      }
    } catch (e) {
      console.error("ModelImporter: Failed to load from URL", e);
      throw e;
    }

    this.finalizeModel(contentsGroup);

    return {
      group: modelGroup,
      name: specification?.model_name || modelName,
      specification,
      yaml,
      assets,
    };
  }

  private getMaterialProperties(
    name: string
  ): THREE.MeshStandardMaterialParameters {
    const n = name.toLowerCase();
    const baseColor = this.getColorForPart(name);

    const props: THREE.MeshStandardMaterialParameters = {
      color: baseColor,
      roughness: 0.5,
      metalness: 0.3,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
    };

    if (
      n.includes("frame") ||
      n.includes("chassis") ||
      n.includes("metal") ||
      n.includes("steel") ||
      n.includes("aluminum") ||
      n.includes("bracket") ||
      n.includes("link") ||
      n.includes("motor")
    ) {
      props.metalness = 0.85;
      props.roughness = 0.25;
      props.envMapIntensity = 1.0;
    }
    if (
      n.includes("tire") ||
      n.includes("rubber") ||
      n.includes("tread") ||
      n.includes("wheel")
    ) {
      props.metalness = 0.05;
      props.roughness = 0.95;
      props.color = new THREE.Color(0x1a1a1a);
      props.envMapIntensity = 0.2;
    }

    //GLASS / OPTICS
    if (
      n.includes("glass") ||
      n.includes("window") ||
      n.includes("lens") ||
      n.includes("transparent") ||
      n.includes("screen")
    ) {
      props.metalness = 0.9;
      props.roughness = 0.05;
      props.transparent = true;
      props.opacity = 0.3;
      props.color = new THREE.Color(0x88ccff);
      props.side = THREE.DoubleSide;
    }

    if (
      n.includes("light") ||
      n.includes("led") ||
      n.includes("lamp") ||
      n.includes("glow") ||
      n.includes("indicator")
    ) {
      props.emissive = new THREE.Color(baseColor);
      props.emissiveIntensity = 2.0;
      props.toneMapped = false;
      props.color = new THREE.Color(0xffffff);
    }

    if (
      n.includes("cover") ||
      n.includes("shell") ||
      n.includes("case") ||
      n.includes("propeller") ||
      n.includes("blade")
    ) {
      props.metalness = 0.1;
      props.roughness = 0.2;
    }

    if (n.includes("carbon")) {
      props.metalness = 0.4;
      props.roughness = 0.4;
      props.color = new THREE.Color(0x111111);
    }

    return props;
  }

  async loadSingleAsset(
    url: string,
    filename: string
  ): Promise<THREE.Object3D> {
    const loadedObject = await this.loadMeshAsObject(url, filename);
    const cleanPartName = this.extractPartName(filename);
    const materialProps = this.getMaterialProperties(cleanPartName);
    const material = new THREE.MeshStandardMaterial(materialProps);

    loadedObject.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = material;
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.originalColor = material.color.getHex();
        child.userData.sourceFile = filename.split("/").pop() || filename;
        if (!child.name || child.name === "") {
          child.name = cleanPartName;
        }
      }
    });

    loadedObject.name = cleanPartName;
    return loadedObject;
  }

  async importZip(file: File): Promise<ImportedModel> {
    const zip = await JSZip.loadAsync(file);
    const modelGroup = new THREE.Group();
    const contentsGroup = new THREE.Group();
    contentsGroup.name = "Model Contents";
    modelGroup.add(contentsGroup);

    let modelName = file.name.replace(".zip", "");
    let yaml = "";
    let scad = "";
    let specification: any = null;
    let config = "";

    const sdfFile = Object.values(zip.files).find(
      (f) => !f.dir && f.name.endsWith(".sdf")
    ) as any;
    const yamlFile = Object.values(zip.files).find(
      (f) => !f.dir && f.name.endsWith(".yaml")
    ) as any;
    const specFile = Object.values(zip.files).find(
      (f) => !f.dir && f.name.endsWith("specification.json")
    ) as any;
    const scadsFile = Object.values(zip.files).find(
      (f) => !f.dir && f.name.endsWith(".scad")
    ) as any;

    // Priority: assembly.py > any .py > .scad
    let pythonFile = zip.file("assembly.py");
    if (!pythonFile) {
      pythonFile = Object.values(zip.files).find(
        (f) => !f.dir && f.name.toLowerCase().endsWith(".py")
      ) as any;
    }

    const configFile = Object.values(zip.files).find(
      (f) => !f.dir && f.name.endsWith(".config")
    ) as any;

    if (specFile) {
      try {
        const specContent = await specFile.async("string");
        specification = JSON.parse(specContent);
        if (specification.model_name) {
          modelName = specification.model_name;
        }
      } catch (e) {
        console.warn("Failed to parse specification:", e);
      }
    }

    if (configFile) {
      config = await configFile.async("string");
    }

    if (yamlFile) yaml = await yamlFile.async("string");

    // Extract Python code (CadQuery) or SCAD code
    if (pythonFile) {
      scad = await pythonFile.async("string");
      console.log('[ModelImporter] Extracted Python code from:', pythonFile.name);
    } else if (scadsFile) {
      scad = await scadsFile.async("string");
      console.log('[ModelImporter] Extracted SCAD code from:', scadsFile.name);
    }

    let physics = this.parsePhysicsFromYaml(yaml);

    // Extract mesh files (STL or GLB)
    const meshFiles = Object.values(zip.files).filter((f) => {
      const fileName = f.name.toLowerCase();
      const isMesh =
        !f.dir &&
        (fileName.endsWith(".stl") || fileName.endsWith(".glb") || fileName.endsWith(".gltf")) &&
        !f.name.includes("__MACOSX");

      if (isMesh && f.name.includes("..")) {
        console.warn(
          "Security Warning: Blocked zip entry with path traversal:",
          f.name
        );
        return false;
      }
      return isMesh;
    });

    console.log('[ModelImporter] Found mesh files in ZIP:', meshFiles.map(f => f.name));

    if (sdfFile) {
      console.log("ModelImporter: Loading using SDF file");
      const sdfContent = await sdfFile.async("string");
      const visuals = this.sdfParser.parse(sdfContent);
      console.log(`ModelImporter: Parsed ${visuals.length} visuals from SDF`);

      if (visuals.length === 0 && meshFiles.length > 0) {
        console.warn(
          "ModelImporter: SDF has no visuals, falling back to direct mesh loading"
        );
        await this.loadMeshesDirectly(meshFiles, contentsGroup);
      } else {
        for (const visual of visuals) {
          try {
            const meshName = visual.meshPath.split("/").pop() || "";
            const meshFile = Object.values(zip.files).find(
              (f) =>
                !f.dir &&
                (f.name.endsWith(visual.meshPath) || f.name.endsWith(meshName))
            ) as any;

            if (meshFile) {
              const meshBlob = await meshFile.async("blob");
              const url = URL.createObjectURL(meshBlob);
              const partName = this.extractPartName(meshName);
              const loadedObject = await this.createVisualObject(
                url,
                meshName,
                visual,
                partName
              );
              if (loadedObject) contentsGroup.add(loadedObject);
              URL.revokeObjectURL(url);
            }
          } catch (err) {
            console.warn(`Failed to load visual ${visual.name}:`, err);
          }
        }
      }
    } else if (meshFiles.length > 0) {
      console.log(
        `ModelImporter: No SDF, loading ${meshFiles.length} mesh files directly`
      );
      await this.loadMeshesDirectly(meshFiles, contentsGroup);
    }

    console.log(
      `ModelImporter: importZip finalized with ${contentsGroup.children.length} meshes`
    );
    if (contentsGroup.children.length === 0) {
      console.error("ModelImporter: No meshes were loaded from the ZIP");
    }

    this.finalizeModel(contentsGroup);

    const analysis = this.analyzer.analyze(contentsGroup);
    physics = {
      volume: analysis.volume,
      surface_area: analysis.surfaceArea,
      dimensions: analysis.dimensions,
      mass: physics.mass || analysis.volume * 1000,
      ...physics,
    };

    const importedAssets: { filename?: string; url: string; blob?: Blob }[] = [];

    if (meshFiles.length > 0) {
      for (const meshFile of meshFiles) {
        try {
          const blob = await meshFile.async("blob");
          const url = URL.createObjectURL(blob);
          const filename = meshFile.name;
          importedAssets.push({ filename, url, blob });
        } catch (e) {
          console.warn("Failed to process asset blob:", meshFile.name);
        }
      }
    }

    if (this.assets && this.assets.length > 0) {
      this.assets.forEach(a => {
        importedAssets.push({
          filename: a.filename,
          url: a.url
        });
      });
    }

    return {
      group: modelGroup,
      name: specification?.model_name || modelName,
      specification,
      config,
      yaml,
      scad,
      physics,
      assets: importedAssets,
    };
  }

  private async loadMeshesDirectly(meshFiles: any[], contentsGroup: THREE.Group) {
    console.log(
      `ModelImporter: Loading ${meshFiles.length} mesh files directly`
    );
    for (const meshFile of meshFiles) {
      try {
        const meshBlob = await meshFile.async("blob");
        const url = URL.createObjectURL(meshBlob);
        const fileName = meshFile.name.split("/").pop() || "";
        const partName = this.extractPartName(fileName);
        const ext = fileName.split(".").pop()?.toLowerCase();

        let loadedObject: THREE.Object3D;

        if (ext === "stl") {
          const geometry = await this.loadSTL(url);
          const materialProps = this.getMaterialProperties(partName);
          const material = new THREE.MeshStandardMaterial(materialProps);
          loadedObject = new THREE.Mesh(geometry, material);
        } else if (ext === "glb" || ext === "gltf") {
          const gltf = await this.loadGLTF(url);
          loadedObject = gltf.scene;

          // Apply materials to GLB
          const materialProps = this.getMaterialProperties(partName);
          const material = new THREE.MeshStandardMaterial(materialProps);
          loadedObject.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).material = material;
              child.castShadow = true;
              child.receiveShadow = true;
              child.userData.originalColor = material.color.getHex();
            }
          });
        } else {
          console.warn(`Unsupported mesh format: ${ext}`);
          URL.revokeObjectURL(url);
          continue;
        }

        loadedObject.name = partName;
        loadedObject.traverse((child) => {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.sourceFile = fileName;
        });

        console.log(`ModelImporter: Added ${ext?.toUpperCase()} mesh ${partName} to group`);
        contentsGroup.add(loadedObject);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn(`Failed to load ${meshFile.name}:`, err);
      }
    }
  }

  private async loadVisual(
    visual: SDFVisual,
    sdfUrl: string
  ): Promise<THREE.Object3D | null> {
    try {
      if (visual.meshPath) {
        const meshName = visual.meshPath.split("/").pop() || visual.meshPath;
        const asset = this.assets.find((a) => a.filename?.endsWith(meshName));
        const meshUrl = asset
          ? asset.url
          : sdfUrl.substring(0, sdfUrl.lastIndexOf("/") + 1) + visual.meshPath;
        return await this.createVisualObject(meshUrl, meshName, visual);
      }
    } catch (e) {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xff9800 })
      );
      this.applyVisualTransform(fallback, visual);
      return fallback;
    }
    return null;
  }

  private async createVisualObject(
    meshUrl: string,
    meshName: string,
    visual: SDFVisual,
    partName?: string
  ): Promise<THREE.Object3D | null> {
    const loadedObject = await this.loadMeshAsObject(meshUrl, meshName);
    const cleanPartName = partName || this.extractPartName(meshName);
    const materialProps = this.getMaterialProperties(cleanPartName);
    const material = new THREE.MeshStandardMaterial(materialProps);

    loadedObject.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = material;
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.originalColor = material.color.getHex();
        child.userData.sourceFile = meshName;
        if (!child.name || child.name === "") {
          child.name = cleanPartName;
        }
      }
    });

    loadedObject.name = cleanPartName;
    this.applyVisualTransformWithoutName(loadedObject, visual);
    return loadedObject;
  }

  private extractPartName(filename: string): string {
    let name = filename.replace(/\.(stl|obj|glb|gltf)$/i, "");
    name = name.split("/").pop() || name;
    name = name.replace(/[_-]/g, " ");
    name = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    return name;
  }

  private applyVisualTransform(
    object: THREE.Object3D,
    visual: SDFVisual
  ): void {
    object.position.copy(visual.pose.position);
    object.quaternion.copy(visual.pose.quaternion);
    object.scale.copy(visual.scale);
    if (!object.name || object.name === "") {
      object.name = visual.name;
    }
  }

  private applyVisualTransformWithoutName(
    object: THREE.Object3D,
    visual: SDFVisual
  ): void {
    object.position.copy(visual.pose.position);
    object.quaternion.copy(visual.pose.quaternion);
    object.scale.copy(visual.scale);
  }

  private finalizeModel(group: THREE.Group): void {
    group.updateMatrixWorld(true);
    group.rotation.x = -Math.PI / 2;
    group.updateWorldMatrix(true, true);

    console.log(
      "ModelImporter: Finalized model with standard coordinate transformation"
    );
  }

  private getColorForPart(name: string): number {
    const n = name.toLowerCase();

    if (n.includes("base") || n.includes("frame") || n.includes("chassis")) {
      return 0x4a5568;
    }
    if (n.includes("body") || n.includes("hull") || n.includes("shell")) {
      return 0x718096;
    }
    if (n.includes("main") || n.includes("core") || n.includes("center")) {
      return 0x5a6978;
    }

    if (n.includes("wheel") || n.includes("tire") || n.includes("tread")) {
      return 0x2d3748; // Dark Charcoal - Rubber/tire look
    }
    if (n.includes("motor") || n.includes("engine") || n.includes("drive")) {
      return 0x2563eb; // Vibrant Blue - Power/energy
    }
    if (
      n.includes("propeller") ||
      n.includes("prop") ||
      n.includes("rotor") ||
      n.includes("blade")
    ) {
      return 0x0891b2; // Cyan 600 - Fast-moving parts
    }
    if (n.includes("actuator") || n.includes("servo")) {
      return 0x3b82f6; // Blue 500 - Mechanical action
    }

    if (n.includes("joint") || n.includes("hinge") || n.includes("pivot")) {
      return 0x7c3aed; // Violet 600 - Articulation points
    }
    if (
      n.includes("connector") ||
      n.includes("coupling") ||
      n.includes("link")
    ) {
      return 0x8b5cf6; // Violet 500 - Connection elements
    }

    if (
      n.includes("sensor") ||
      n.includes("camera") ||
      n.includes("lidar") ||
      n.includes("radar")
    ) {
      return 0x059669;
    }
    if (
      n.includes("circuit") ||
      n.includes("board") ||
      n.includes("pcb") ||
      n.includes("electronic")
    ) {
      return 0x10b981; // Emerald 500 - Electronics
    }
    if (
      n.includes("antenna") ||
      n.includes("receiver") ||
      n.includes("transmitter")
    ) {
      return 0x34d399; // Emerald 400 - Communication
    }

    if (n.includes("battery") || n.includes("power") || n.includes("cell")) {
      return 0xd97706; // Amber 600 - Energy storage
    }
    if (n.includes("solar") || n.includes("panel")) {
      return 0xf59e0b; // Amber 500 - Solar energy
    }
    if (n.includes("fuel") || n.includes("tank")) {
      return 0xea580c; // Orange 600 - Fuel systems
    }

    if (
      n.includes("mount") ||
      n.includes("bracket") ||
      n.includes("holder") ||
      n.includes("clamp")
    ) {
      return 0xbe185d; // Pink 700 - Mounting hardware
    }
    if (
      n.includes("adapter") ||
      n.includes("interface") ||
      n.includes("fixture")
    ) {
      return 0xdb2777; // Pink 600 - Adapters
    }

    if (n.includes("arm") || n.includes("limb") || n.includes("appendage")) {
      return 0x0d9488; // Teal 600 - Arm structures
    }
    if (
      n.includes("gripper") ||
      n.includes("hand") ||
      n.includes("claw") ||
      n.includes("finger")
    ) {
      return 0x14b8a6; // Teal 500 - End effectors
    }

    if (
      n.includes("cover") ||
      n.includes("lid") ||
      n.includes("cap") ||
      n.includes("housing")
    ) {
      return 0xcbd5e1; // Slate 300 - Protective covers
    }
    if (
      n.includes("shell") ||
      n.includes("casing") ||
      n.includes("enclosure")
    ) {
      return 0x94a3b8; // Slate 400 - Outer casing
    }

    if (n.includes("link")) {
      const linkMatch = n.match(/link[_\s]?(\d+)/i);
      if (linkMatch) {
        const linkNum = parseInt(linkMatch[1]);
        const colors = [
          0x1e3a8a, // Blue 900
          0x1e40af, // Blue 800
          0x1d4ed8, // Blue 700
          0x2563eb, // Blue 600
          0x3b82f6, // Blue 500
          0x60a5fa, // Blue 400
          0x93c5fd, // Blue 300
        ];
        return colors[linkNum % colors.length];
      }
      return 0x3b82f6; // Default link color
    }

    const hash = this.hashString(n);
    return this.generateHarmonicColor(hash);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private generateHarmonicColor(hash: number): number {
    const hue = (hash * 137.508) % 360;
    const saturation = 55 + (hash % 20); // 55-75% saturation
    const lightness = 45 + (hash % 15); // 45-60% lightness

    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return (
      (Math.round(r * 255) << 16) +
      (Math.round(g * 255) << 8) +
      Math.round(b * 255)
    );
  }

  private async loadMeshAsObject(
    url: string,
    filename: string
  ): Promise<THREE.Object3D> {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "stl") return new THREE.Mesh(await this.loadSTL(url));
    if (ext === "obj") return await this.loadOBJ(url);
    if (ext === "glb" || ext === "gltf" || url.startsWith("blob:"))
      return (await this.loadGLTF(url)).scene;
    throw new Error(`Unsupported: ${ext}`);
  }

  private loadSTL(url: string): Promise<THREE.BufferGeometry> {
    return new Promise((res, rej) =>
      this.stlLoader.load(url, res, undefined, rej)
    );
  }

  private loadOBJ(url: string): Promise<THREE.Group> {
    return new Promise((res, rej) =>
      this.objLoader.load(url, res, undefined, rej)
    );
  }

  private loadGLTF(url: string): Promise<any> {
    return new Promise((res, rej) =>
      this.gltfLoader.load(url, res, undefined, rej)
    );
  }

  private parsePhysicsFromYaml(yaml: string): Record<string, any> {
    const physics: Record<string, any> = {};
    if (!yaml) return physics;
    yaml.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w_]+)\s*:\s*(.+)$/);
      if (match) {
        let val: any = match[2].trim();
        if (!isNaN(Number(val))) val = Number(val);
        physics[match[1].trim()] = val;
      }
    });
    return physics;
  }
}
