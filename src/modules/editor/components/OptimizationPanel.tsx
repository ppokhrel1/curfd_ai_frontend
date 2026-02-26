import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, Download, ChevronRight } from 'lucide-react';

import { useChatStore } from '@/modules/ai/stores/chatStore';
import { STORAGE_KEYS } from '@/lib/constants';
import { useEditorStore } from '../stores/editorStore';
import { useOptimization, type OptimizationJob } from './OptimizationPanel/hooks/useOptimization';
import { ParameterPanel } from './ParameterPanel';

// 🚨 Added props to control the viewer and tabs
export const OptimizationPanel = ({ 
  onBuildComplete, 
  onSwitchToCode 
}: { 
  onBuildComplete?: (shape: any) => void, 
  onSwitchToCode?: () => void 
}) => {
  const { code, setOriginalCode, compile } = useEditorStore();
  
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || ""; 
  const chatId = useChatStore(state => state.activeConversationId) || "";

  const { jobs, startOptimization } = useOptimization(chatId, token);

  if (!chatId) {
    return (
      <div className="flex flex-col h-full bg-neutral-900 w-full flex-shrink-0 items-center justify-center p-6 text-center border-l border-neutral-800">
        <AlertCircle className="w-8 h-8 text-rose-500/80 mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">Optimization Locked</h3>
        <p className="text-xs text-neutral-400">
          You must send a message to start a chat session before you can run AI optimizations.
        </p>
      </div>
    );
  }

  const handleOptimizeRequest = (optimizedParamsPayload: any[]) => {
    startOptimization(code, optimizedParamsPayload);
  };

  // 🚨 Updated function to handle the full job object
  const applyOptimizedCode = (job: OptimizationJob) => {
    if (!job.optimized_parameters) return;

    let updatedCode = code;
    // 1. Inject the new optimized values back into the OpenSCAD code
    for (const [key, val] of Object.entries(job.optimized_parameters)) {
       updatedCode = updatedCode.replace(new RegExp(`(${key}\\s*=\\s*)[-0-9.]+;`), `$1${val.toFixed(2)};`);
    }
    setOriginalCode(updatedCode);
    compile();

    // 2. Trigger viewer update with optimized OpenSCAD code
    // The viewer will compile and display the code with optimized parameters
    if (onBuildComplete) {
      onBuildComplete({
        id: `opt-${job.id}`,
        type: 'generic',
        name: 'Optimized Shape',
        scadCode: updatedCode,
        parameters: Object.entries(job.optimized_parameters).map(([k, v]) => ({ name: k, default_val: v }))
      });
    }

    // 3. Auto-switch back to the Code tab for a seamless UX
    if (onSwitchToCode) {
      onSwitchToCode();
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 w-full flex-shrink-0 border-l border-neutral-800">
      
      <ParameterPanel onOptimizeClick={handleOptimizeRequest} />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 sticky top-0 bg-neutral-900 py-1">
          Optimization Jobs
        </h3>
        
        {jobs.length === 0 && (
          <div className="text-xs text-neutral-500 italic text-center mt-4">
            No optimization jobs run yet.
          </div>
        )}

        {jobs.map(job => (
          <div key={job.id} className="bg-neutral-800 rounded-lg p-3 text-sm border border-neutral-700 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-400 font-mono text-xs">#{job.id.slice(0, 6)}</span>
              
              {job.status === 'Pending' || job.status === 'Processing' ? (
                <span className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold bg-blue-950/30 px-2 py-1 rounded">
                  <Loader2 className="w-3 h-3 animate-spin" /> {job.status}
                </span>
              ) : job.status === 'Completed' ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold bg-emerald-950/30 px-2 py-1 rounded">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              ) : job.status === 'Completed (best from GA)' ? (
                <span className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold bg-amber-950/30 px-2 py-1 rounded">
                  <CheckCircle2 className="w-3 h-3" /> Best from GA
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold bg-rose-950/30 px-2 py-1 rounded">
                  <AlertCircle className="w-3 h-3" /> Failed
                </span>
              )}
            </div>

            {job.status.startsWith('Completed') && job.optimized_parameters && (
              <div className="mt-3 flex flex-col gap-2 border-t border-neutral-700/50 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Fitness Score</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    {job.fitness_score?.toFixed(5)}
                  </span>
                </div>
                
                <div className="flex gap-2 mt-1">
                  {/* 🚨 Updated to pass the full job object */}
                  <button 
                    onClick={() => applyOptimizedCode(job)}
                    className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white text-xs py-1.5 rounded-md transition-colors flex items-center justify-center gap-1"
                  >
                    Apply & View <ChevronRight className="w-3 h-3" />
                  </button>
                  {job.result_url && (
                    <a 
                      href={job.result_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-neutral-700 hover:bg-neutral-600 w-8 flex items-center justify-center rounded-md text-neutral-300 transition-colors"
                      title="Download raw STL"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {job.status === 'Failed' && (
              <div className="text-xs text-rose-400 mt-2 bg-rose-950/20 p-2 rounded border border-rose-900/50">
                {job.error || "Optimization failed during processing."}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};