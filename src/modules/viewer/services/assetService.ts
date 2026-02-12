import { api } from "@/lib/api/client";
import { proxifyUrl } from "@/lib/apiConfig";
import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import JSZip from "jszip";

export interface Asset {
  id: string;
  job_id: string;
  session_id: string;
  asset_type: string;
  uri: string;
  url?: string; // Optional: signed URL if backend provides it
  storage_provider?: string;
  is_public?: boolean;
  created_at: string;
  updated_at?: string;

  // Legacy/Frontend compat alias (mapped manually if needed, or derived)
  name?: string;
  type?: string;
}

export interface AssetMeta {
  id: string;
  asset_id: string;
  part_name?: string;
  component_of?: string; // UUID of parent asset
  position_json?: Record<string, any>;
  material_json?: Record<string, any>;
  image_paths_json?: any[];
  is_composite_of_json?: any[];
  used_for_json?: any[];
  metadata_json?: Record<string, any>;

  // Frontend compat aliases
  metadata?: Record<string, any>;
}

class AssetService {
  async fetchAssets(jobId?: string): Promise<Asset[]> {
    try {
      const params: any = {};
      if (jobId) params.job_id = jobId;

      const response = await api.get<Asset[]>("/assets", { params });
      // Map backend response to frontend expectations if necessary
      return response.data.map(this.normalizeAsset);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      return [];
    }
  }

  async getAsset(assetId: string): Promise<Asset | null> {
    try {
      const response = await api.get<Asset>(`/assets/${assetId}`);
      return this.normalizeAsset(response.data);
    } catch (error) {
      console.error("Failed to get asset:", error);
      return null;
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    await api.delete(`/assets/${assetId}`);
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

  async fetchAssetMeta(assetId?: string, jobId?: string): Promise<AssetMeta[]> {
    try {
      const params: any = {};
      if (assetId) params.asset_id = assetId;
      if (jobId) params.job_id = jobId;

      const response = await api.get<AssetMeta[]>("/asset-meta", {
        params: params,
      });
      return response.data.map(this.normalizeAssetMeta);
    } catch (error) {
      console.error("Failed to fetch asset metadata:", error);
      return [];
    }
  }

  async getAssetMetaById(metaId: string): Promise<AssetMeta | null> {
    try {
      const response = await api.get<AssetMeta>(`/asset-meta/${metaId}`);
      return this.normalizeAssetMeta(response.data);
    } catch (error) {
      console.error("Failed to get asset meta:", error);
      return null;
    }
  }

  async createAsset(payload: {
    job_id: string;
    asset_type: string;
    uri: string;
    storage_provider?: string;
    metadata_json?: any;
  }): Promise<Asset> {
    const response = await api.post<Asset>("/assets", payload);
    return this.normalizeAsset(response.data);
  }

  async createAssetMeta(payload: {
    asset_id: string;
    part_name?: string;
    component_of?: string;
    position_json?: Record<string, any>;
    material_json?: Record<string, any>;
    metadata_json?: Record<string, any>;
  }): Promise<AssetMeta> {
    const response = await api.post<AssetMeta>("/asset-meta", payload);
    return this.normalizeAssetMeta(response.data);
  }

  async updateAssetMeta(metaId: string, updates: Partial<AssetMeta>): Promise<AssetMeta> {
    // Ensure we send metadata_json if metadata is passed
    const payload = { ...updates };
    if (payload.metadata && !payload.metadata_json) {
      payload.metadata_json = payload.metadata;
    }
    const response = await api.patch<AssetMeta>(`/asset-meta/${metaId}`, payload);
    return this.normalizeAssetMeta(response.data);
  }

  async deleteAssetMeta(metaId: string): Promise<void> {
    await api.delete(`/asset-meta/${metaId}`);
  }

  private normalizeAsset(asset: Asset): Asset {
    return {
      ...asset,
      // Map backend asset_type to frontend type if missing
      type: asset.type || asset.asset_type,
      // Ensure name exists (fallback to file name from URI)
      name: asset.name || asset.uri.split('/').pop() || 'Unnamed Asset',
    };
  }

  private normalizeAssetMeta(meta: AssetMeta): AssetMeta {
    return {
      ...meta,
      // Map backend metadata_json to frontend metadata
      metadata: meta.metadata || meta.metadata_json,
    };
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

      const metadata = await this.fetchAssetMeta(undefined, jobId);
      console.log(
        "[AssetService] Fetched metadata for job:",
        jobId,
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

      const shape: GeneratedShape = {
        id: modelAsset.id,
        type: "generic" as const,
        name: modelAsset.name || "Generated Model",
        description: "Generated Model",
        hasSimulation: true,
        geometry: {
          parts: parts as any[],
          joints: [],
          physics: {},
        },
        createdAt: new Date(modelAsset.created_at),
        assetId: modelAsset.id,
        jobId: jobId,
        sdfUrl: modelUrl,
        scadCode: scadCode,
        assets: assets.map(a => ({
          filename: a.name || a.uri.split('/').pop(),
          url: a.url || a.uri
        })),
        specification: {
          model_name: modelAsset.name,
          parts: parts,
        },
      };

      console.log("[AssetService] Mapped shape:", shape.name, "ID:", shape.id, "Job:", shape.jobId);
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

        const proxiedUrl = proxifyUrl(scadUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(proxiedUrl, { signal: controller.signal });
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

        const proxiedUrl = proxifyUrl(zipUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(proxiedUrl, { signal: controller.signal });
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
