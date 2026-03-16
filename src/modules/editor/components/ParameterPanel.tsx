import React, { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Zap } from 'lucide-react';

interface Bound {
  min: number;
  max: number;
}

export const ParameterPanel = ({ onOptimizeClick }: { onOptimizeClick: (parameters: any[]) => void }) => {
  const { parameters, code, setCode, optimizationJobs } = useEditorStore();
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [bounds, setBounds] = useState<Record<string, Bound>>({});
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set());

  const isOptimizationRunning = useMemo(
    () => optimizationJobs.some(j => j.status === 'Pending' || j.status === 'Processing'),
    [optimizationJobs]
  );

  useEffect(() => {
    if (parameters) {
      const initialBounds: Record<string, Bound> = {};
      const newNames = new Set<string>();
      parameters.forEach(p => {
        if (!bounds[p.name]) {
          initialBounds[p.name] = { min: p.min_val, max: p.max_val };
        }
        newNames.add(p.name);
      });
      setBounds(prev => ({ ...prev, ...initialBounds }));
      setSelectedParams(prev => {
        const next = new Set(prev);
        newNames.forEach(n => { if (!prev.has(n)) next.add(n); });
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameters]);

  if (!parameters || parameters.length === 0) {
    return (
      <div className="p-3 text-xs text-neutral-500 italic text-center">
        No tunable parameters found in code.
      </div>
    );
  }

  const handleSliderChange = (paramName: string, newValue: number) => {
    setLocalValues(prev => ({ ...prev, [paramName]: newValue }));
    const updatedCode = code.replace(new RegExp(`(${paramName}\\s*=\\s*)[-0-9.]+;`), `$1${newValue};`);
    setCode(updatedCode);
  };

  const handleValueInput = (paramName: string, rawValue: string) => {
    const val = parseFloat(rawValue);
    if (!isNaN(val)) handleSliderChange(paramName, val);
  };

  const handleBoundChange = (paramName: string, type: 'min' | 'max', value: number) => {
    setBounds(prev => ({
      ...prev,
      [paramName]: { ...prev[paramName], [type]: value }
    }));
  };

  const toggleParam = (name: string) => {
    setSelectedParams(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleOptimizeSubmit = () => {
    const payload = parameters
      .filter(p => selectedParams.has(p.name))
      .map(p => ({
        name: p.name,
        min_val: bounds[p.name]?.min ?? p.min_val,
        max_val: bounds[p.name]?.max ?? p.max_val
      }));
    if (payload.length === 0) return;
    onOptimizeClick(payload);
  };

  const canOptimize = !isOptimizationRunning && parameters.some(p => selectedParams.has(p.name));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Parameter list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700">
        {parameters.map((param) => {
          const currentMin = bounds[param.name]?.min ?? param.min_val;
          const currentMax = bounds[param.name]?.max ?? param.max_val;
          const currentVal = localValues[param.name] ?? param.default_val;
          const isSelected = selectedParams.has(param.name);

          return (
            <div
              key={param.name}
              className={`px-3 py-1.5 border-b border-neutral-800/40 transition-colors ${
                !isSelected ? 'opacity-35' : 'hover:bg-neutral-800/20'
              }`}
            >
              {/* Top: checkbox + name + editable value */}
              <div className="flex items-center gap-1.5 mb-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleParam(param.name)}
                  className="accent-purple-500 w-3 h-3 cursor-pointer flex-shrink-0"
                />
                <span className="font-mono text-[11px] text-blue-400 truncate flex-1 min-w-0">
                  {param.name}
                </span>
                <input
                  type="number"
                  value={currentVal}
                  onChange={(e) => handleValueInput(param.name, e.target.value)}
                  className="w-14 font-mono text-[11px] text-right text-neutral-200 bg-neutral-800 border border-neutral-700 rounded px-1 py-0.5 focus:outline-none focus:border-purple-500 hide-arrows flex-shrink-0"
                />
              </div>
              {/* Bottom: min — slider — max */}
              <div className="flex items-center gap-1 pl-[18px]">
                <input
                  type="number"
                  value={currentMin}
                  onChange={(e) => handleBoundChange(param.name, 'min', parseFloat(e.target.value) || 0)}
                  className="w-9 bg-transparent text-[9px] text-neutral-500 text-center focus:outline-none focus:text-neutral-300 hide-arrows flex-shrink-0"
                />
                <input
                  type="range"
                  min={currentMin}
                  max={currentMax}
                  step={(currentMax - currentMin) / 100 || 0.1}
                  value={currentVal}
                  onChange={(e) => handleSliderChange(param.name, parseFloat(e.target.value))}
                  className="flex-1 accent-purple-500 h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  value={currentMax}
                  onChange={(e) => handleBoundChange(param.name, 'max', parseFloat(e.target.value) || 0)}
                  className="w-9 bg-transparent text-[9px] text-neutral-500 text-center focus:outline-none focus:text-neutral-300 hide-arrows flex-shrink-0"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with optimize button */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-neutral-800 bg-neutral-950/60">
        <button
          onClick={handleOptimizeSubmit}
          disabled={!canOptimize}
          title={isOptimizationRunning ? "Wait for current optimization to finish" : ""}
          className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-medium py-1.5 rounded transition-colors"
        >
          <Zap className="w-3 h-3" />
          {isOptimizationRunning ? "Running…" : "AI Optimize"}
        </button>
      </div>
    </div>
  );
};
