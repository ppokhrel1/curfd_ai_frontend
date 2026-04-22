import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/formatters";
import { SidebarNav } from "@/components/common/SidebarNav";

interface Asset {
  id: string;
  name: string;
  size: string;
  format: string;
  category: string;
  watertight: boolean;
}

const MOCK_ASSETS: Asset[] = [
  { id: "quad-frame-160", name: "Quad Frame 160mm", size: "1.2 MB", format: ".glb", category: "drone", watertight: true },
  { id: "motor-mount-v2", name: "Motor Mount v2", size: "340 KB", format: ".stl", category: "drone", watertight: true },
  { id: "prop-guard-5in", name: "Prop Guard 5in", size: "890 KB", format: ".scad", category: "drone", watertight: false },
  { id: "pi-case-snap", name: "Pi Case (Snap)", size: "420 KB", format: ".stl", category: "electronics", watertight: true },
  { id: "shelf-bracket-l", name: "Shelf Bracket L", size: "180 KB", format: ".stl", category: "home", watertight: true },
  { id: "servo-horn-25t", name: "Servo Horn 25T", size: "95 KB", format: ".glb", category: "robotics", watertight: false },
  { id: "battery-tray-3s", name: "Battery Tray 3S", size: "560 KB", format: ".glb", category: "drone", watertight: true },
  { id: "gear-spur-32t", name: "Spur Gear 32T", size: "210 KB", format: ".scad", category: "robotics", watertight: true },
  { id: "cable-clip-6mm", name: "Cable Clip 6mm", size: "42 KB", format: ".stl", category: "home", watertight: false },
];

const FORMAT_OPTIONS = [".stl", ".glb", ".scad"];
const CATEGORY_OPTIONS = ["drone", "electronics", "home", "robotics"];
const PRINT_OPTIONS = ["watertight", "supports ok"];

const AssetsPage = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formatFilters, setFormatFilters] = useState<Set<string>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [printFilters, setPrintFilters] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const filtered = MOCK_ASSETS.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (formatFilters.size > 0 && !formatFilters.has(a.format)) return false;
    if (categoryFilters.size > 0 && !categoryFilters.has(a.category)) return false;
    if (printFilters.has("watertight") && !a.watertight) return false;
    return true;
  });

  return (
    <div className="h-screen flex bg-white">
      <SidebarNav activePage="assets" />

      {/* Filter sidebar */}
      <aside className="hidden md:block w-[180px] shrink-0 p-4 border-r border-neutral-200 overflow-y-auto">
        <p className="text-xs font-mono uppercase text-neutral-400 tracking-wider mb-3">Filter</p>

        {/* Format */}
        <p className="text-xs font-medium text-neutral-600 mb-2">Format</p>
        {FORMAT_OPTIONS.map((f) => (
          <label key={f} className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={formatFilters.has(f)}
              onChange={() => toggleFilter(formatFilters, f, setFormatFilters)}
              className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-xs text-neutral-600 font-mono">{f}</span>
          </label>
        ))}

        <hr className="my-3 border-neutral-100" />

        {/* Category */}
        <p className="text-xs font-medium text-neutral-600 mb-2">Category</p>
        {CATEGORY_OPTIONS.map((c) => (
          <label key={c} className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={categoryFilters.has(c)}
              onChange={() => toggleFilter(categoryFilters, c, setCategoryFilters)}
              className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-xs text-neutral-600">{c}</span>
          </label>
        ))}

        <hr className="my-3 border-neutral-100" />

        {/* Print Ready */}
        <p className="text-xs font-medium text-neutral-600 mb-2">Print Ready</p>
        {PRINT_OPTIONS.map((p) => (
          <label key={p} className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={printFilters.has(p)}
              onChange={() => toggleFilter(printFilters, p, setPrintFilters)}
              className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-xs text-neutral-600">{p}</span>
          </label>
        ))}
      </aside>

      {/* Main grid */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Asset Library</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {filtered.length} of {MOCK_ASSETS.length}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 w-full sm:w-48"
            />
            <div className="flex border border-neutral-200 rounded-lg overflow-hidden">
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono capitalize",
                    viewMode === mode
                      ? "bg-neutral-50 text-white"
                      : "text-neutral-500 hover:bg-neutral-50"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button className="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
              + Upload
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            : "flex flex-col gap-2"
        )}>
          {filtered.map((asset) => (
            <Link
              key={asset.id}
              to={`/assets/${asset.id}`}
              className={cn(
                "bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow group",
                viewMode === "list" && "flex items-center"
              )}
            >
              {/* Thumbnail */}
              <div
                className={cn(
                  "bg-neutral-100 relative flex items-center justify-center",
                  viewMode === "grid" ? "h-32" : "w-20 h-16 shrink-0"
                )}
              >
                {/* Diagonal lines pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id={`diag-${asset.id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#diag-${asset.id})`} />
                </svg>
                <span className="text-[10px] font-mono text-neutral-300 z-10">{asset.format}</span>

                {/* Watertight badge */}
                {asset.watertight && viewMode === "grid" && (
                  <span className="absolute top-2 right-2 text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-mono">
                    &#10003; watertight
                  </span>
                )}
              </div>

              {/* Info */}
              <div className={cn("p-3", viewMode === "list" && "flex-1 flex items-center justify-between")}>
                <div>
                  <p className="font-medium text-sm text-neutral-800 group-hover:text-primary-700 transition-colors">
                    {asset.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">{asset.size}</p>
                </div>
                {viewMode === "list" && asset.watertight && (
                  <span className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-mono">
                    &#10003; watertight
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-neutral-400">No assets found</div>
        )}
      </main>
    </div>
  );
};

export default AssetsPage;
