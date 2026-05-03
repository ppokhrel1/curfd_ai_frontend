import { encryptedApi as api } from "@/lib/api/encryptedClient";

export interface ImageTo3DRequest {
  image_url?: string;
  prompt?: string;
  output_format?: "glb" | "stl";
  // When true the worker skips Hunyuan3D-Part decomposition and returns
  // mesh-only (~5-10s faster). Default: produce parts.
  skip_segmentation?: boolean;
}

export interface ImageTo3DResponse {
  status: string;
  runpod_id: string | null;
  message_id: string;
}

export interface ImageSearchResponse {
  status: "image_selection_required";
  search_query: string;
  image_urls: string[];
  request_id: string;
  prompt: string;
}

class ImageTo3DService {
  async generate(chatId: string, request: ImageTo3DRequest): Promise<ImageTo3DResponse | ImageSearchResponse> {
    const response = await api.post<ImageTo3DResponse | ImageSearchResponse>(
      `/chats/${chatId}/image-to-3d`,
      {
        image_url: request.image_url || "",
        prompt: request.prompt || "",
        output_format: request.output_format || "glb",
        skip_segmentation: request.skip_segmentation ?? false,
      }
    );
    return response.data;
  }
}

export const imageTo3dService = new ImageTo3DService();
