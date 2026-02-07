import { api } from "@/lib/api/client";
import { GeneratedShape } from "@/modules/ai/types/chat.type";
import JSZip from "jszip";

export interface Asset {
  id: string;
  name: string;
  type: string;
  url?: string;
  uri?: string;
  job_id: string;
  session_id: string;
  created_at: string;
}

export interface AssetMeta {
  id: string;
  asset_id: string;
  part_name?: string;
  component_of?: string;
  position_json?: Record<string, any>;
  material_json?: Record<string, any>;
  image_paths_json?: any[];
  is_composite_of_json?: any[];
  used_for_json?: any[];
  metadata?: Record<string, any>;
}

class AssetService {
  async fetchAssets(jobId?: string): Promise<Asset[]> {
    try {
      const params: any = {};
      if (jobId) params.job_id = jobId;

      const response = await api.get<Asset[]>("/assets", { params });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      return [];
    }
  }

  async searchAssets(query: string): Promise<Asset[]> {
    if (!query || query.length < 2) return [];

    try {
      const allAssets = await this.fetchAssets();
      const lowerQuery = query.toLowerCase();

      return allAssets.filter((asset) => {
        const matchesName = asset.name?.toLowerCase().includes(lowerQuery);
        const assetUrl = (asset.uri || asset.url)?.toLowerCase();
        const matchesUri = assetUrl?.includes(lowerQuery);

        return matchesName || matchesUri;
      });
    } catch (error) {
      console.error("Failed to search assets:", error);
      return [];
    }
  }

  async fetchAssetMeta(assetId: string): Promise<AssetMeta[]> {
    try {
      const response = await api.get<AssetMeta[]>("/asset-meta", {
        params: { asset_id: assetId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch asset metadata:", error);
      return [];
    }
  }

  async createAsset(payload: {
    job_id: string;
    asset_type: string;
    uri: string;
    storage_provider: string;
    metadata_json?: any;
  }): Promise<Asset> {
    const response = await api.post<Asset>("/assets", payload);
    return response.data;
  }

  async createAssetMeta(payload: {
    asset_id: string;
    part_name?: string;
    component_of?: string;
    position_json?: Record<string, any>;
    material_json?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<AssetMeta> {
    const response = await api.post<AssetMeta>("/asset-meta", payload);
    return response.data;
  }

  async mapToGeneratedShape(
    jobId: string,
    assets: Asset[]
  ): Promise<GeneratedShape | null> {
    console.log(
      "[AssetService] mapToGeneratedShape called for job:",
      jobId,
      "with",
      assets.length,
      "assets"
    );

    try {
      const modelAsset = assets.find((a) => {
        const assetUrl = (a.uri || a.url)?.toLowerCase();
        return (
          assetUrl?.endsWith(".sdf") ||
          assetUrl?.endsWith(".glb") ||
          assetUrl?.endsWith(".zip")
        );
      });

      if (!modelAsset) {
        console.warn(
          "[AssetService] No model asset found in:",
          assets.map((a) => a.uri || a.url)
        );
        return null;
      }

      const modelUrl = modelAsset.uri || modelAsset.url;
      console.log("[AssetService] Found model asset:", modelUrl);

      const metadata = await this.fetchAssetMeta(jobId);
      console.log(
        "[AssetService] Fetched metadata:",
        metadata.length,
        "entries"
      );

      const parts = metadata.map((m) => ({
        id: m.id,
        name: m.part_name || "Unnamed Part",
        category: m.component_of ? "Component" : "Main Structure",
        role: "structural" as const,
        placement: m.position_json
          ? {
              x: m.position_json.x || 0,
              y: m.position_json.y || 0,
              z: m.position_json.z || 0,
            }
          : undefined,
        mesh_file: m.asset_id,
      }));

      const scadCode = await this.fetchScadContent(assets);
      console.log(
        "[AssetService] SCAD code fetched:",
        scadCode ? `${scadCode.length} chars` : "none"
      );

      const shape = {
        id: modelAsset.id,
        type: "generic" as const,
        name: modelAsset.name,
        description: "Generated Model",
        hasSimulation: true,
        geometry: {
          parts: parts,
          joints: [],
          physics: {},
        },
        createdAt: new Date(modelAsset.created_at),
        assetId: modelAsset.id,
        sdfUrl: modelUrl,
        scadCode: scadCode,
        specification: {
          model_name: modelAsset.name,
          parts: parts,
        },
      };

      console.log("[AssetService] Mapped shape:", shape.name, "ID:", shape.id);
      return shape;
    } catch (err) {
      console.error("[AssetService] Error mapping assets to shape:", err);
      return null;
    }
  }

  // Helper to find and fetch SCAD or Python code from assets
  private async fetchScadContent(assets: Asset[]): Promise<string | undefined> {
    const scadAsset = assets.find((a) => {
      const url = (a.uri || a.url)?.toLowerCase();
      return url?.endsWith(".scad");
    });

    if (scadAsset) {
      try {
        const scadUrl = scadAsset.uri || scadAsset.url;
        if (!scadUrl) return undefined;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(scadUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) return await response.text();
      } catch (e) {
        console.warn("Failed to fetch SCAD content from .scad file:", e);
      }
    }

    const zipAsset = assets.find((a) => {
      const url = (a.uri || a.url)?.toLowerCase();
      return url?.endsWith(".zip");
    });

    if (zipAsset) {
      try {
        const zipUrl = zipAsset.uri || zipAsset.url;
        if (!zipUrl) return undefined;

        console.log("[AssetService] Extracting code from ZIP:", zipUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(zipUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Failed to download ZIP");

        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);

        let codeFile = zip.file("assembly.py");

        if (!codeFile) {
          codeFile = Object.values(zip.files).find(
            (f: any) => f.name.toLowerCase().endsWith(".py") && !f.dir
          ) as any;
        }

        if (!codeFile) {
          codeFile = Object.values(zip.files).find(
            (f: any) => f.name.toLowerCase().endsWith(".scad") && !f.dir
          ) as any;
        }

        if (codeFile) {
          console.log("[AssetService] Found code file in zip:", codeFile.name);
          return await codeFile.async("string");
        } else {
          console.warn(
            "[AssetService] No .py or .scad found in zip:",
            Object.keys(zip.files)
          );
        }
      } catch (e) {
        console.warn("Failed to extract content from ZIP:", e);
      }
    }

    return undefined;
  }
}

export const assetService = new AssetService();
