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
    const response = await api.post<FillMeshResponse>("/mesh/fill", {
      url: req.url,
      method: req.method ?? "auto",
    });
    return response.data;
  }
}

export const meshFillService = new MeshFillService();
