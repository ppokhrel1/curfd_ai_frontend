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

    let normalizedUrl = url;
    const hasToken = url.includes("token=");

    // Handle Supabase URLs
    if (url.includes("supabase.co")) {
        if (hasToken) {
            normalizedUrl = url.replace("/object/public/", "/object/sign/");
        } else {
            normalizedUrl = url.replace("/object/sign/", "/object/public/");
        }
    }

    // Return direct signed URLs
    if (normalizedUrl.includes("supabase.co") && hasToken) {
        return normalizedUrl;
    }

    try {
        const isMesh = normalizedUrl
            .toLowerCase()
            .match(/\.(stl|obj|glb|gltf|bin)$/);

        if (!isMesh && !normalizedUrl.includes("/object/sign/")) {
            return normalizedUrl;
        }

        const parsed = new URL(normalizedUrl);
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
        console.warn("Failed to proxify URL:", normalizedUrl, e);
        return normalizedUrl;
    }
};
