import JSZip from "jszip";
import * as THREE from "three";
import { GLTFLoader, OBJLoader, STLLoader } from "three-stdlib";
import { SDFParser } from "../utils/SDFParser";

export interface ImportedModel {
  group: THREE.Group;
  name: string;
  specification?: any;
  config?: string;
  yaml?: string;
  physics?: Record<string, any>;
}

export class ModelImporter {
  private sdfParser: SDFParser;
  private stlLoader: STLLoader;
  private objLoader: OBJLoader;
  private gltfLoader: GLTFLoader;

  constructor() {
    this.sdfParser = new SDFParser();
    this.stlLoader = new STLLoader();
    this.objLoader = new OBJLoader();
    this.gltfLoader = new GLTFLoader();
  }

  /**
   * Import model from URL (for ML-generated models stored on Supabase)
   */
  async importFromUrl(sdfUrl: string, yamlUrl?: string, specification?: any): Promise<ImportedModel> {
    console.log(`ModelImporter: Loading SDF from URL: ${sdfUrl}`);

    const modelGroup = new THREE.Group();
    let modelName = "Generated Model";
    let yaml = "";
    let physics: Record<string, any> = {};

    try {
      // Fetch SDF file
      const sdfResponse = await fetch(sdfUrl);
      if (!sdfResponse.ok) {
        throw new Error(`Failed to fetch SDF: ${sdfResponse.status}`);
      }
      const sdfContent = await sdfResponse.text();

      // Extract model name from URL or SDF content
      const urlParts = sdfUrl.split('/');
      modelName = urlParts[urlParts.length - 2] || "Generated Model";

      // Parse SDF for visual elements
      const visuals = this.sdfParser.parse(sdfContent);
      console.log(`ModelImporter: Parsed ${visuals.length} visuals from SDF`);

      // Fetch YAML config if available
      if (yamlUrl) {
        try {
          const yamlResponse = await fetch(yamlUrl);
          if (yamlResponse.ok) {
            yaml = await yamlResponse.text();
            physics = this.parsePhysicsFromYaml(yaml);
          }
        } catch (e) {
          console.warn("Failed to fetch YAML config:", e);
        }
      }

      // Create visual representations for each visual in SDF
      for (const visual of visuals) {
        let geometry: THREE.BufferGeometry;

        try {
          if (visual.meshPath) {
            // Construct full URL for the mesh
            // Handle both relative paths and flattened paths with retry strategy
            const baseUrl = sdfUrl.substring(0, sdfUrl.lastIndexOf('/') + 1);
            const meshName = visual.meshPath.split('/').pop() || visual.meshPath;

            // Strategy 1: Exact path from SDF (e.g., meshes/file.stl)
            let meshUrl = baseUrl + visual.meshPath;

            let loaded = false;
            try {
              console.log(`ModelImporter: Strategy 1 - Fetching mesh from ${meshUrl}`);
              geometry = await this.loadSTL(meshUrl);
              loaded = true;
            } catch (e1) {
              // Strategy 2: Flat path (root/file.stl)
              console.warn(`Strategy 1 failed for ${visual.name}, trying flat path.`);
              try {
                meshUrl = baseUrl + meshName;
                console.log(`ModelImporter: Strategy 2 - Fetching mesh from ${meshUrl}`);
                geometry = await this.loadSTL(meshUrl);
                loaded = true;
              } catch (e2) {
                // Strategy 3: Explicit meshes/ folder (root/meshes/file.stl)
                console.warn(`Strategy 2 failed for ${visual.name}, trying meshes/ folder.`);
                try {
                  meshUrl = baseUrl + "meshes/" + meshName;
                  console.log(`ModelImporter: Strategy 3 - Fetching mesh from ${meshUrl}`);
                  geometry = await this.loadSTL(meshUrl);
                  loaded = true;
                } catch (e3) {
                  throw new Error(`All mesh loading strategies failed for ${visual.name}`);
                }
              }
            }
          } else {
            throw new Error("No mesh path");
          }
        } catch (e) {
          console.warn(`ModelImporter: Failed to load mesh for ${visual.name}, using box fallback`, e);
          geometry = new THREE.BoxGeometry(
            visual.scale.x || 0.1,
            visual.scale.y || 0.1,
            visual.scale.z || 0.1
          );
        }

        const color = this.getColorForPart(visual.name);
        const material = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0.2,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(visual.pose.position);
        mesh.rotation.copy(visual.pose.rotation);

        // Fix for Z-up to Y-up: Rotate geometry, preserve pose rotation
        if (visual.meshPath) {
          mesh.geometry.rotateX(-Math.PI / 2);
        }

        mesh.scale.copy(visual.scale);
        mesh.name = visual.name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        modelGroup.add(mesh);
      }

      // If no visuals parsed but we have specification, create from parts
      if (visuals.length === 0 && specification?.parts) {
        for (const part of specification.parts) {
          const dims = part.dimensions || { length: 0.1, width: 0.1, height: 0.1 };
          const geometry = new THREE.BoxGeometry(dims.length, dims.width, dims.height);

          const color = this.getColorForPart(part.name);
          const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.2,
          });

          const mesh = new THREE.Mesh(geometry, material);
          const placement = part.placement || { x: 0, y: 0, z: 0 };
          mesh.position.set(placement.x, placement.z, placement.y); // Convert Z-up to Y-up
          mesh.name = part.name;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          modelGroup.add(mesh);
        }
      }

      // Center and position the model
      if (modelGroup.children.length > 0) {
        const box = new THREE.Box3().setFromObject(modelGroup);
        const center = box.getCenter(new THREE.Vector3());
        modelGroup.position.x = -center.x;
        modelGroup.position.z = -center.z;
        modelGroup.position.y = -box.min.y;
      }

    } catch (error) {
      console.error("ModelImporter: Error loading from URL:", error);
      // Create a placeholder cube on error
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "Error Placeholder";
      modelGroup.add(mesh);
    }

    return {
      group: modelGroup,
      name: modelName,
      specification,
      yaml,
      physics,
    };
  }

  /**
   * Get color based on part name/type
   */
  private getColorForPart(name: string): number {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('camera') || nameLower.includes('sensor')) return 0x4ade80; // Green
    if (nameLower.includes('motor') || nameLower.includes('actuator')) return 0x60a5fa; // Blue
    if (nameLower.includes('chassis') || nameLower.includes('frame')) return 0x9ca3af; // Gray
    if (nameLower.includes('propeller') || nameLower.includes('wheel')) return 0xfbbf24; // Yellow
    if (nameLower.includes('lidar')) return 0xa855f7; // Purple
    return 0x888888; // Default gray
  }

  async importZip(file: File): Promise<ImportedModel> {
    const zip = await JSZip.loadAsync(file);
    const modelGroup = new THREE.Group();
    let modelName = file.name.replace(".zip", "");
    let specification: any = null;
    let config: string = "";
    let yaml: string = "";

    // Find core files, handling optional nesting
    const getFile = (pattern: RegExp) =>
      Object.values(zip.files).find(
        (f: any) => !f.dir && pattern.test(f.name)
      ) as any;

    const sdfFile = getFile(/\.sdf$/i);
    const configFile = getFile(/model\.config$/i);
    const yamlFile = getFile(/model\.yaml$/i);
    const specFile = Object.values(zip.files).find(
      (f: any) =>
        f.name.endsWith("specification") ||
        f.name.endsWith("specification.json")
    ) as any;

    if (specFile) {
      const specContent = await specFile.async("string");
      try {
        specification = JSON.parse(specContent);
      } catch (e) {
        specification = { raw: specContent };
      }
    }

    if (configFile) config = await configFile.async("string");
    if (yamlFile) yaml = await yamlFile.async("string");

    const physics = this.parsePhysicsFromYaml(yaml);

    if (sdfFile) {
      console.log(`SDF found: ${sdfFile.name}. Parsing visuals...`);
      const sdfContent = await sdfFile.async("string");
      const visuals = this.sdfParser.parse(sdfContent);
      console.log(`Parsed ${visuals.length} visuals from SDF.`);

      for (const visual of visuals) {
        try {
          const meshPathParts = visual.meshPath.split("/");
          const meshName = meshPathParts[meshPathParts.length - 1];

          console.log(
            `Searching for mesh: ${visual.meshPath} (filename: ${meshName})`
          );
          const meshFile = Object.values(zip.files).find(
            (f: any) =>
              !f.dir &&
              (f.name.endsWith(visual.meshPath) || f.name.endsWith(meshName))
          ) as any;

          if (meshFile) {
            console.log(`Found mesh file: ${meshFile.name}. Loading...`);
            const meshBlob = await meshFile.async("blob");
            const url = URL.createObjectURL(meshBlob);
            const extension = visual.meshPath.split(".").pop()?.toLowerCase();

            let meshGroup: THREE.Object3D | null = null;

            if (extension === "stl") {
              const geometry = await this.loadSTL(url);

              geometry.computeBoundingBox();
              geometry.computeVertexNormals();
              geometry.center();

              const box = geometry.boundingBox!;
              geometry.translate(0, 0, -box.min.z);

              const material = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.8,
                metalness: 0.1,
              });

              const mesh = new THREE.Mesh(geometry, material);

              mesh.rotation.x = -Math.PI / 2;

              mesh.castShadow = true;
              mesh.receiveShadow = true;

              meshGroup = mesh;
            } else if (extension === "obj") {
              meshGroup = await this.loadOBJ(url);
            } else if (extension === "glb" || extension === "gltf") {
              const gltf = await this.loadGLTF(url);
              meshGroup = gltf.scene;
            }

            if (meshGroup) {
              meshGroup.position.copy(visual.pose.position);
              meshGroup.rotation.copy(visual.pose.rotation);
              meshGroup.scale.copy(visual.scale);
              meshGroup.name = visual.name;
              modelGroup.add(meshGroup);
            }

            URL.revokeObjectURL(url);
          }
        } catch (err) {
          console.error(`Failed to load visual ${visual.name}:`, err);
        }
      }
    } else {
      const meshFiles = Object.values(zip.files).filter(
        (f: any) =>
          f.name.match(/\.(stl|obj|glb|gltf)$/i) && !f.name.includes("__MACOSX")
      );

      for (const meshFile of meshFiles) {
        try {
          const meshBlob = await (meshFile as any).async("blob");
          const url = URL.createObjectURL(meshBlob);
          const extension = (meshFile as any).name
            .split(".")
            .pop()
            ?.toLowerCase();

          let meshGroup: THREE.Object3D | null = null;
          if (extension === "stl") {
            const geometry = await this.loadSTL(url);
            meshGroup = new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({ color: 0x888888 })
            );
          } else if (extension === "obj") {
            meshGroup = await this.loadOBJ(url);
          } else if (extension === "glb" || extension === "gltf") {
            const gltf = await this.loadGLTF(url);
            meshGroup = gltf.scene;
          }

          if (meshGroup) {
            meshGroup.name = (meshFile as any).name;
            modelGroup.add(meshGroup);
          }
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error(
            `Failed to load mesh in fallback: ${(meshFile as any).name}`,
            err
          );
        }
      }
    }

    const initialBox = new THREE.Box3().setFromObject(modelGroup);
    const initialSize = initialBox.getSize(new THREE.Vector3());

    const hasSDF = sdfFile !== undefined && sdfFile !== null;
    const isLikelyZUp = hasSDF || initialSize.z > initialSize.y * 1.5;

    if (isLikelyZUp) {
      // Standard Gazebo to Three.js conversion: Rotate -90 on X
      console.log("ModelImporter: Detected Z-up, applied rotation.");
    } else {
      console.log(
        "ModelImporter: Detected Y-up or neutral, skipping rotation."
      );
    }

    modelGroup.updateMatrixWorld(true);

    // Calculate bounding box AFTER rotation to get correct world-space extent
    const box = new THREE.Box3().setFromObject(modelGroup);
    if (box.isEmpty()) {
      console.warn("Import warning: modelGroup has no visual meshes.");
    } else {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Alignment: Center in X/Z, sit bottom at Y=0 (the grid)
      modelGroup.position.x = -center.x;
      modelGroup.position.z = -center.z;
      modelGroup.position.y = -box.min.y;
    }

    return {
      group: modelGroup,
      name: modelName,
      specification,
      config,
      yaml,
      physics,
    };
  }

  private parsePhysicsFromYaml(yaml: string): Record<string, any> {
    if (!yaml) return {};
    const physics: Record<string, any> = {};

    // Simple regex-based YAML parser for key-value pairs
    const lines = yaml.split("\n");
    lines.forEach((line) => {
      const match = line.match(/^\s*([\w_]+)\s*:\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        let value: any = match[2].trim();

        if (!isNaN(Number(value)) && value !== "") {
          value = Number(value);
        } else if (value.toLowerCase() === "true") {
          value = true;
        } else if (value.toLowerCase() === "false") {
          value = false;
        }

        physics[key] = value;
      }
    });

    return physics;
  }

  private loadSTL(url: string): Promise<THREE.BufferGeometry> {
    return new Promise((resolve, reject) => {
      this.stlLoader.load(url, resolve, undefined, reject);
    });
  }

  private loadOBJ(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(url, resolve, undefined, reject);
    });
  }

  private loadGLTF(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, resolve, undefined, reject);
    });
  }
}
