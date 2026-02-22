import React, { useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Play, Zap } from 'lucide-react';

export const ParameterPanel = ({ onOptimizeClick }: { onOptimizeClick: (parameters: any[]) => void }) => {
  const { parameters, code, setCode } = useEditorStore();
  const [localValues, setLocalValues] = useState<Record<string, number>>({});

  if (!parameters || parameters.length === 0) return null;

  // Handle manual slider changes
  const handleSliderChange = (paramName: string, newValue: number) => {
    setLocalValues(prev => ({ ...prev, [paramName]: newValue }));
    
    // Optional: Regex replace the value in the raw code so it updates in real-time
    const updatedCode = code.replace(new RegExp(`(${paramName}\\s*=\\s*)[0-9.]+;`), `$1${newValue};`);
    setCode(updatedCode);
  };

  return (
    <div className="bg-neutral-900 border-t border-neutral-800 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tunable Parameters</h3>
        
        {/* The Magic Button that triggers your Celery Worker! */}
        <button 
          onClick={() => onOptimizeClick(parameters)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-md shadow-lg transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          AI Optimize
        </button>
      </div>

      <div className="space-y-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
        {parameters.map((param) => (
          <div key={param.name} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className="font-mono">{param.name}</span>
              <span>{localValues[param.name] ?? param.default_val}</span>
            </div>
            <input
              type="range"
              min={param.min_val}
              max={param.max_val}
              step={(param.max_val - param.min_val) / 100} // Smooth sliding
              value={localValues[param.name] ?? param.default_val}
              onChange={(e) => handleSliderChange(param.name, parseFloat(e.target.value))}
              className="w-full accent-blue-500"
              title={param.description}
            />
          </div>
        ))}
      </div>
    </div>
  );
};