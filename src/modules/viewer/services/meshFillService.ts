import { encryptedApi as api } from "@/lib/api/encryptedClient";

export interface FillMeshRequest {
  url: string;
  method?: "auto" | "pymeshfix" | "trimesh";
}

export interface FillMeshResponse {
  url: string;
  is_watertight: boolean;
  face_count: number;
  vertex_count: number;
  method: "pymeshfix" | "trimesh";
}

class MeshFillService {
  /**
   * Hole-fill / make-watertight a mesh on the backend so the slicer
   * actually fills the volume during 3D printing. Returns a new R2 URL
   * for the repaired mesh.
   */
  async fill(req: FillMeshRequest): Promise<FillMeshResponse> {
    // Default to "trimesh" (light, topology-preserving fill_holes), not
    // "auto" (which falls through to pymeshfix). pymeshfix is correct
    // for densely-broken single-component meshes, but Hunyuan3D output
    // has multiple loose components and pymeshfix annihilates them —
    // user saw their Buzz Lightyear become a flat blob. trimesh's
    // fill_holes only patches small boundary gaps and leaves the rest
    // of the mesh alone.
    const response = await api.post<FillMeshResponse>("/mesh/fill", {
      url: req.url,
      method: req.method ?? "trimesh",
    });
    return response.data;
  }
}

export const meshFillService = new MeshFillService();
