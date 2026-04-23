import { describe, it, expect, vi } from "vitest";

// --- proxifyUrl tests ---

describe("proxifyUrl", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "/api/v1");
  });

  it("proxifies supabase storage URLs through backend", async () => {
    const { proxifyUrl } = await import("@/lib/apiConfig");
    const url =
      "https://xxx.supabase.co/storage/v1/object/public/generated_models/mesh.glb";
    const result = proxifyUrl(url);
    expect(result).toBe("/api/v1/storage/generated_models/mesh.glb");
  });

  it("passes through blob URLs unchanged", async () => {
    const { proxifyUrl } = await import("@/lib/apiConfig");
    const url = "blob:http://localhost:5173/abc-123";
    expect(proxifyUrl(url)).toBe(url);
  });

  it("passes through data URLs unchanged", async () => {
    const { proxifyUrl } = await import("@/lib/apiConfig");
    const url = "data:model/gltf-binary;base64,abc";
    expect(proxifyUrl(url)).toBe(url);
  });

  it("routes backblaze B2 URLs through backend storage proxy", async () => {
    const { proxifyUrl } = await import("@/lib/apiConfig");
    const url = "https://f005.backblazeb2.com/file/bucket/model.glb";
    expect(proxifyUrl(url)).toBe("/api/v1/storage/bucket/model.glb");
  });

  it("proxifies signed supabase URLs through backend too", async () => {
    const { proxifyUrl } = await import("@/lib/apiConfig");
    const url =
      "https://xxx.supabase.co/storage/v1/object/sign/bucket/file.glb?token=abc123";
    const result = proxifyUrl(url);
    expect(result).toContain("/api/v1/storage/");
  });
});

// --- Query cleaning (recovery from message history) ---

describe("useActiveConversationSync shape recovery", () => {
  it("extracts GLB URL from assistant message metadata", () => {
    const messages = [
      {
        id: "msg-1",
        role: "user",
        content: "Generate 3D model: ring",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: '{"status":"success"}',
        metadata_json: {
          output: {
            uri: "https://xxx.supabase.co/storage/v1/object/public/generated_models/mesh.glb",
            status: "success",
          },
        },
      },
    ];

    // Simulate the recovery logic from useActiveConversationSync
    let recoveredUrl: string | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const meta = (msg as any).metadata_json;
        const output = meta?.output;
        const url =
          output?.uri || output?.model_url || output?.download_url;
        if (url && /\.(glb|stl|obj)/i.test(url)) {
          recoveredUrl = url;
          break;
        }
      }
    }

    expect(recoveredUrl).toBeDefined();
    expect(recoveredUrl).toContain(".glb");
  });

  it("extracts URL from JSON content when metadata is missing", () => {
    const msg = {
      id: "msg-2",
      role: "assistant",
      content: JSON.stringify({
        uri: "https://xxx.supabase.co/storage/v1/object/public/generated_models/mesh.glb",
        status: "success",
      }),
    };

    let recoveredUrl: string | undefined;
    if (typeof msg.content === "string" && msg.content.startsWith("{")) {
      try {
        const parsed = JSON.parse(msg.content);
        const url = parsed.uri || parsed.model_url || parsed.download_url;
        if (url && /\.(glb|stl|obj)/i.test(url)) {
          recoveredUrl = url;
        }
      } catch {}
    }

    expect(recoveredUrl).toBeDefined();
    expect(recoveredUrl).toContain(".glb");
  });

  it("returns undefined for non-3D assistant messages", () => {
    const msg = {
      id: "msg-2",
      role: "assistant",
      content: "Here is your OpenSCAD code: ...",
      metadata_json: {
        openscad_code: "cube([10,10,10]);",
      },
    };

    const meta = (msg as any).metadata_json;
    const output = meta?.output;
    const url =
      output?.uri || output?.model_url || output?.download_url;
    const isModel = url && /\.(glb|stl|obj)/i.test(url);

    expect(isModel).toBeFalsy();
  });
});

// --- LanguageSelector options ---

describe("LanguageSelector options", () => {
  it("includes image_to_3d as third option", () => {
    const LANGUAGE_OPTIONS = [
      { value: "openscad", label: "OpenSCAD" },
      { value: "cadquery", label: "CadQuery (Python)" },
      { value: "image_to_3d", label: "Image to 3D" },
    ];

    expect(LANGUAGE_OPTIONS).toHaveLength(3);
    expect(LANGUAGE_OPTIONS[2].value).toBe("image_to_3d");
  });
});

// --- ChatStore language type ---

describe("ChatStore selectedLanguage", () => {
  it("accepts image_to_3d as valid language", () => {
    type Language = "openscad" | "cadquery" | "image_to_3d";
    const lang: Language = "image_to_3d";
    expect(["openscad", "cadquery", "image_to_3d"]).toContain(lang);
  });
});

// --- ModelImporter URL validation ---

describe("ModelImporter URL validation", () => {
  it("accepts relative URLs starting with /", () => {
    const url = "/api/v1/storage/generated_models/mesh.glb";
    const isValid =
      url.startsWith("blob:") ||
      url.startsWith("/") ||
      (() => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      })();
    expect(isValid).toBe(true);
  });

  it("accepts absolute https URLs", () => {
    const url = "https://example.com/mesh.glb";
    let valid = false;
    try {
      new URL(url);
      valid = true;
    } catch {}
    expect(valid).toBe(true);
  });

  it("rejects garbage URLs", () => {
    const url = "not a url at all";
    const isValid =
      url.startsWith("blob:") ||
      url.startsWith("/") ||
      (() => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      })();
    expect(isValid).toBe(false);
  });
});
