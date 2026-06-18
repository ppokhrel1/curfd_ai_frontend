/**
 * API Configuration Utilities
 * Centralized API URL management controlled via environment variables
 */


export const getApiBaseUrl = (): string => {
    return import.meta.env.VITE_API_URL;
};

export const getWsBaseUrl = (): string => {
    return import.meta.env.VITE_WS_URL;
};

/**
 * Proxify external URLs through the backend proxy
 * Handles Supabase URLs and other external resources
 */
export const proxifyUrl = (url: string): string => {
    if (!url) return url;
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;

    // Route Supabase Storage URLs through backend proxy (private bucket)
    // e.g. https://xxx.supabase.co/storage/v1/object/public/bucket/file.glb
    //   → /api/v1/storage/bucket/file.glb
    if (url.includes("supabase.co") && url.includes("/storage/v1/object/")) {
        try {
            const parsed = new URL(url);
            // Extract path after /storage/v1/object/public/ or /storage/v1/object/
            const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public\/)?(.+)/);
            if (match) {
                const apiBase = getApiBaseUrl();
                return `${apiBase}/storage/${match[1]}`;
            }
        } catch {}
    }

    // Return direct signed Supabase URLs
    if (url.includes("supabase.co") && url.includes("token=")) {
        return url;
    }

    // B2 URLs — route through backend storage proxy (bucket is private)
    // e.g. https://f005.backblazeb2.com/file/nooriat-models/generated_models/foo.glb
    //   → {apiBase}/storage/nooriat-models/generated_models/foo.glb
    if (url.includes("backblazeb2.com") && url.includes("/file/")) {
        try {
            const parsed = new URL(url);
            // Extract everything after /file/ (bucket/path)
            const match = parsed.pathname.match(/\/file\/(.+)/);
            if (match) {
                const apiBase = getApiBaseUrl();
                return `${apiBase}/storage/${match[1]}`;
            }
        } catch {}
        return url;
    }

    // Cloudflare R2 URLs.
    //
    // We ALWAYS rewrite to /api/v1/storage/... regardless of whether the
    // URL is presigned. Hitting r2.cloudflarestorage.com directly from
    // the browser triggers a CORS preflight that the bucket doesn't
    // answer with the right Access-Control headers — the GLTFLoader
    // fetch then bubbles up as `TypeError: Failed to fetch` with no
    // useful detail. Going through the backend proxy gives us a
    // same-origin response (with our CORS middleware attached) and
    // costs ~1s of extra hop for the file the user can't otherwise
    // load at all.
    //
    // If we ever ship a Cloudflare custom domain in front of R2, we
    // should let those URLs (matched by the custom hostname) pass
    // through — the CDN handles CORS correctly.
    if (url.includes("r2.cloudflarestorage.com")) {
        try {
            const parsed = new URL(url);
            // Drop the X-Amz-* query string — the backend re-signs with
            // its own credentials before fetching from R2.
            const path = parsed.pathname.replace(/^\//, "");
            if (path) {
                const apiBase = getApiBaseUrl();
                return `${apiBase}/storage/${path}`;
            }
        } catch {}
        return url;
    }

    try {
        let pathForExtCheck = url;
        try { pathForExtCheck = new URL(url).pathname; } catch {}
        const isMesh = pathForExtCheck
            .toLowerCase()
            .match(/\.(stl|obj|glb|gltf|bin)$/);

        if (!isMesh) {
            return url;
        }

        const parsed = new URL(url);
        const protocol = parsed.protocol.replace(":", "");
        const host = parsed.host;

        const segments = parsed.pathname.substring(1).split("/");
        const encodedPath = segments
            .map((s) => encodeURIComponent(decodeURIComponent(s)))
            .join("/");

        const path = encodedPath + parsed.search;

        const apiBase = getApiBaseUrl();
        return `${apiBase}/proxy/${protocol}/${host}/${path}`;
    } catch (e) {
        console.warn("Failed to proxify URL:", url, e);
        return url;
    }
};
