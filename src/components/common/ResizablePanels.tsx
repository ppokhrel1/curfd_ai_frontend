import { GripVertical } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface ResizablePanelsProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  minLeftWidth?: number;
  minRightWidth?: number;
  defaultLeftWidth?: number;
  storageKey?: string;
  className?: string;
}

export const ResizablePanels = ({
  leftPanel,
  rightPanel,
  minLeftWidth = 320,
  minRightWidth = 400,
  defaultLeftWidth = 50,
  storageKey = "panel-split",
  className = "",
}: ResizablePanelsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) return parseFloat(saved);
    }
    return defaultLeftWidth;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, leftWidth.toString());
    }
  }, [leftWidth, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const mouseX = e.clientX - rect.left;

      let newLeftWidth = (mouseX / containerWidth) * 100;

      // Apply constraints
      const minLeftPercent = (minLeftWidth / containerWidth) * 100;
      const minRightPercent = (minRightWidth / containerWidth) * 100;
      const maxLeftPercent = 100 - minRightPercent;

      newLeftWidth = Math.max(
        minLeftPercent,
        Math.min(maxLeftPercent, newLeftWidth)
      );

      setLeftWidth(newLeftWidth);
    },
    [isDragging, minLeftWidth, minRightWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setLeftWidth(50); // Reset to 50/50
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      {/* Left Panel */}
      <div
        className="h-full overflow-hidden transition-[width] duration-75 ease-out"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Draggable Divider */}
      <div
        className={`group relative flex-shrink-0 w-1 cursor-col-resize transition-all duration-150 ${
          isDragging || isHovering
            ? "bg-green-500/50"
            : "bg-neutral-800 hover:bg-neutral-700"
        }`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Grip Handle */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-12 rounded-full border transition-all duration-200 ${
            isDragging || isHovering
              ? "bg-green-500/20 border-green-500/40 opacity-100"
              : "bg-neutral-900 border-neutral-700 opacity-0 group-hover:opacity-100"
          }`}
        >
          <GripVertical
            className={`w-3 h-3 ${
              isDragging || isHovering ? "text-green-400" : "text-neutral-400"
            }`}
          />
        </div>

        {/* Invisible Wider Hit Area */}
        <div className="absolute inset-y-0 -left-2 -right-2" />
      </div>

      {/* Right Panel */}
      <div className="flex-1 h-full overflow-hidden">{rightPanel}</div>
    </div>
  );
};
