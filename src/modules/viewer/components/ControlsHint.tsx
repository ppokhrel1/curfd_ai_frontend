import { VIEWER_CONTROLS } from "@/lib/constants";
import { HelpCircle, Mouse, Move, X, ZoomIn } from "lucide-react";
import { useState } from "react";

export const ControlsHint: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="group absolute bottom-4 right-4 p-3 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl shadow-xl hover:shadow-2xl hover:border-green-500/30 transition-all z-10"
        title="Show controls help"
      >
        <HelpCircle className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  const controlsData = [
    {
      action: "Rotate",
      control: VIEWER_CONTROLS.Rotate || "Left Click + Drag",
      icon: <Mouse className="w-4 h-4 text-green-400" />,
    },
    {
      action: "Pan",
      control: VIEWER_CONTROLS.Pan || "Right Click + Drag",
      icon: <Move className="w-4 h-4 text-blue-400" />,
    },
    {
      action: "Zoom",
      control: VIEWER_CONTROLS.Zoom || "Scroll Wheel",
      icon: <ZoomIn className="w-4 h-4 text-purple-400" />,
    },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl shadow-2xl min-w-[300px]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <HelpCircle className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Viewer Controls</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls List */}
        <div className="p-5 space-y-3">
          {controlsData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 p-3 bg-neutral-800/30 rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{item.icon}</div>
                <span className="text-neutral-300 font-medium text-sm">
                  {item.action}
                </span>
              </div>
              <kbd className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-green-400 whitespace-nowrap">
                {item.control}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer Tip */}
        <div className="px-5 pb-5 pt-3 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 leading-relaxed">
            💡 Double-click to focus on objects
          </p>
        </div>
      </div>
    </div>
  );
};
