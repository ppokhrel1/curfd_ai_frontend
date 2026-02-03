import "@testing-library/jest-dom";
import { vi } from "vitest";
import "vitest-canvas-mock";

global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock MatchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

if (typeof window !== "undefined" && !window.DOMParser) {
    const { DOMParser } = require("@xmldom/xmldom");
    window.DOMParser = DOMParser;
}
