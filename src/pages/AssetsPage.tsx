import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/formatters";
import { SidebarNav } from "@/components/common/SidebarNav";
import { assetService, type Asset } from "@/modules/viewer/services/assetService";
import { Loader2 } from "lucide-react";

function formatBytes(uri: string): string {
  // We don't have file size from the API — show format instead
  return uri?.split(".").pop()?.toUpperCase() || "FILE";
}

function getFormat(asset: Asset): string {
  const uri = asset.uri || asset.url || "";
  // For openscad:// URIs, the format is .scad
  if (uri.startsWith("openscad://")) return ".scad";
  // For B2/HTTP URLs, extract file extension
  const path = uri.split("?")[0];
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (ext && ext.length <= 5 && !ext.includes("/")) return `.${ext}`;
  return asset.asset_type || "file";
}

function getCategory(asset: Asset): string {
  return asset.asset_type?.replace(/_/g, " ") || "unknown";
}

const AssetsPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [formatFilters, setFormatFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await assetService.fetchAssets();
      setAssets(data);
      setLoading(false);
    })();
  }, []);

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  // Derive unique formats from real data
  const allFormats = [...new Set(assets.map(getFormat))].sort();

  const filtered = assets.filter((a) => {
    const name = a.name || a.uri || a.id;
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (formatFilters.size > 0 && !formatFilters.has(getFormat(a))) return false;
    return true;
  });

  return (
    <div className="h-screen flex bg-white">
      <SidebarNav activePage="assets" />

      {/* Filter sidebar */}
      <aside className="hidden md:block w-[180px] shrink-0 p-4 border-r border-neutral-200 overflow-y-auto">
        <p className="text-xs font-mono uppercase text-neutral-400 tracking-wider mb-3">Filter</p>

        <p className="text-xs font-medium text-neutral-600 mb-2">Format</p>
        {allFormats.map((f) => (
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
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Asset Library</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {loading ? "Loading..." : `${filtered.length} of ${assets.length}`}
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
                      ? "bg-neutral-100 text-neutral-800"
                      : "text-neutral-500 hover:bg-neutral-50"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            <div className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                : "flex flex-col gap-2"
            )}>
              {filtered.map((asset) => {
                const format = getFormat(asset);
                const displayName = asset.name || asset.uri?.split("/").pop() || asset.id;
                const category = getCategory(asset);

                return (
                  <Link
                    key={asset.id}
                    to={`/assets/${asset.id}`}
                    className={cn(
                      "bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow group",
                      viewMode === "list" && "flex items-center"
                    )}
                  >
                    <div
                      className={cn(
                        "bg-neutral-100 relative flex items-center justify-center",
                        viewMode === "grid" ? "h-32" : "w-20 h-16 shrink-0"
                      )}
                    >
                      <span className="text-[10px] font-mono text-neutral-300 z-10">{format}</span>
                    </div>

                    <div className={cn("p-3", viewMode === "list" && "flex-1 flex items-center justify-between")}>
                      <div>
                        <p className="font-medium text-sm text-neutral-800 group-hover:text-primary-700 transition-colors truncate max-w-[200px]">
                          {displayName}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">{category}</p>
                      </div>
                      {viewMode === "list" && (
                        <span className="text-[10px] text-neutral-400 font-mono">{format}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-neutral-400">
                {assets.length === 0 ? "No assets yet. Generate a model to see it here." : "No assets found"}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AssetsPage;
