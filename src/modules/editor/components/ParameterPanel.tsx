import React, { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Zap, Settings2 } from 'lucide-react';

interface Bound {
  min: number;
  max: number;
}

export const ParameterPanel = ({ onOptimizeClick }: { onOptimizeClick: (parameters: any[]) => void }) => {
  const { parameters, code, setCode, optimizationJobs } = useEditorStore();
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [bounds, setBounds] = useState<Record<string, Bound>>({});
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set());

  // Derive running state: any job that is still in-flight
  const isOptimizationRunning = useMemo(
    () => optimizationJobs.some(j => j.status === 'Pending' || j.status === 'Processing'),
    [optimizationJobs]
  );

  // Initialize bounds and selections when parameters change
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
      // Select all new params by default; keep existing selections stable
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
      <div className="p-4 text-xs text-neutral-500 italic text-center border-b border-neutral-800">
        No tunable parameters found in code.
      </div>
    );
  }

  const handleSliderChange = (paramName: string, newValue: number) => {
    setLocalValues(prev => ({ ...prev, [paramName]: newValue }));
    
    // Live update the code in the editor
    const updatedCode = code.replace(new RegExp(`(${paramName}\\s*=\\s*)[-0-9.]+;`), `$1${newValue};`);
    setCode(updatedCode);
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
    <div className="bg-neutral-900 border-b border-neutral-800 p-4 shrink-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-neutral-400" />
          Parameters
        </h3>
        <button
          onClick={handleOptimizeSubmit}
          disabled={!canOptimize}
          title={isOptimizationRunning ? "Wait for current optimization to finish" : ""}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-md shadow-lg transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          {isOptimizationRunning ? "Running…" : "AI Optimize"}
        </button>
      </div>

      <div className="space-y-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700">
        {parameters.map((param) => {
          const currentMin = bounds[param.name]?.min ?? param.min_val;
          const currentMax = bounds[param.name]?.max ?? param.max_val;
          const currentVal = localValues[param.name] ?? param.default_val;

          return (
            <div key={param.name} className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${selectedParams.has(param.name) ? 'bg-neutral-800/40 border-neutral-700' : 'bg-neutral-900/30 border-neutral-800/50 opacity-60'}`}>
              <div className="flex justify-between items-center text-xs text-neutral-300">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedParams.has(param.name)}
                    onChange={() => toggleParam(param.name)}
                    className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-blue-400">{param.name}</span>
                </label>
                <span className="font-mono bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  {currentVal.toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={currentMin}
                  onChange={(e) => handleBoundChange(param.name, 'min', parseFloat(e.target.value) || 0)}
                  className="w-12 bg-neutral-950 text-xs text-center border border-neutral-700 rounded p-1 text-neutral-300 focus:outline-none focus:border-purple-500 hide-arrows"
                  title="Search Space Minimum"
                />
                <input
                  type="range"
                  min={currentMin}
                  max={currentMax}
                  step={(currentMax - currentMin) / 100 || 0.1}
                  value={currentVal}
                  onChange={(e) => handleSliderChange(param.name, parseFloat(e.target.value))}
                  className="flex-1 accent-purple-500 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <input 
                  type="number" 
                  value={currentMax}
                  onChange={(e) => handleBoundChange(param.name, 'max', parseFloat(e.target.value) || 0)}
                  className="w-12 bg-neutral-950 text-xs text-center border border-neutral-700 rounded p-1 text-neutral-300 focus:outline-none focus:border-purple-500 hide-arrows"
                  title="Search Space Maximum"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};