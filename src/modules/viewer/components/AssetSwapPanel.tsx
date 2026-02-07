import { Box, FileCode, Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Asset, assetService } from "../services/assetService";

function useDebounce<T>(value: T, delay: number): [T] {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue];
}

interface AssetSwapPanelProps {
  currentPartName: string;
  onSelectAsset: (asset: Asset) => void;
  onClose: () => void;
}

export const AssetSwapPanel: React.FC<AssetSwapPanelProps> = ({
  currentPartName,
  onSelectAsset,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-search based on part name initially, or just show recent
  useEffect(() => {
    // Initial search or empty
    handleSearch("");
  }, []);

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery]);

  const handleSearch = async (q: string) => {
    setIsLoading(true);
    try {
      const results = await assetService.searchAssets(q);
      setAssets(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/95 backdrop-blur-md border-l border-neutral-800 shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div>
          <h3 className="text-sm font-medium text-white">Swap Part</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Replacing:{" "}
            <span className="text-neutral-300">{currentPartName}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-neutral-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search assets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Searching library...</span>
          </div>
        ) : assets.length > 0 ? (
          assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-all group text-left"
            >
              <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-700 transition-colors">
                {(asset.url || asset.uri)?.endsWith(".glb") || (asset.url || asset.uri)?.endsWith(".gltf") ? (
                  <Box className="w-5 h-5 text-blue-400" />
                ) : (
                  <FileCode className="w-5 h-5 text-neutral-400 group-hover:text-neutral-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {asset.name || (asset.url || asset.uri)?.split("/").pop()}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-neutral-500 uppercase">
                    {asset.type || (asset.url || asset.uri)?.split(".").pop()}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500 text-xs">
            {query ? "No assets found." : "Type to search..."}
          </div>
        )}
      </div>
    </div>
  );
};
