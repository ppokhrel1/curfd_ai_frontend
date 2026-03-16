import React, { useState, useMemo } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Download, ChevronRight, ChevronDown, X, Zap } from 'lucide-react';
import { useEditorStore, type OptimizationJob } from '../stores/editorStore';

interface FloatingJobsPanelProps {
  onApply?: (job: OptimizationJob) => void;
}

export const FloatingJobsPanel: React.FC<FloatingJobsPanelProps> = ({ onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const jobs = useEditorStore(s => s.optimizationJobs);

  const activeCount = useMemo(
    () => jobs.filter(j => j.status === 'Pending' || j.status === 'Processing').length,
    [jobs]
  );
  const completedCount = useMemo(
    () => jobs.filter(j => j.status.startsWith('Completed')).length,
    [jobs]
  );

  // Minimized: floating button (always visible)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl hover:bg-neutral-800 transition-all group"
      >
        <Zap className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold text-neutral-300">
          {jobs.length === 0
            ? 'No jobs'
            : activeCount > 0
              ? `${activeCount} running`
              : `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
        </span>
        {activeCount > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
          </span>
        )}
        {completedCount > 0 && activeCount === 0 && (
          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
            {completedCount} done
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
      </button>
    );
  }

  // Expanded: floating panel
  return (
    <div className="fixed bottom-20 right-6 z-50 w-80 max-h-[420px] flex flex-col bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-950/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Optimization Jobs</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-neutral-800 rounded-md transition-colors text-neutral-500 hover:text-neutral-300"
          title="Minimize"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Jobs list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-700">
        {jobs.length === 0 && (
          <div className="text-center py-6 text-neutral-500 text-xs">
            No optimization jobs yet. Use the <span className="text-purple-400 font-semibold">AI Optimize</span> button in the Parameters tab to start.
          </div>
        )}
        {jobs.map(job => (
          <div key={job.id} className="bg-neutral-800/60 rounded-lg p-3 text-sm border border-neutral-700/50">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-neutral-500 font-mono text-[10px]">#{job.id.slice(0, 6)}</span>
              <JobStatusBadge status={job.status} />
            </div>

            {job.status.startsWith('Completed') && job.optimized_parameters && (
              <div className="mt-2 flex flex-col gap-2 border-t border-neutral-700/40 pt-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-neutral-400">Fitness</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded text-[10px]">
                    {job.fitness_score?.toFixed(5)}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onApply?.(job)}
                    className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white text-[11px] py-1.5 rounded-md transition-colors flex items-center justify-center gap-1"
                  >
                    Apply & View <ChevronRight className="w-3 h-3" />
                  </button>
                  {job.result_url && (
                    <a
                      href={job.result_url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-neutral-700 hover:bg-neutral-600 w-7 flex items-center justify-center rounded-md text-neutral-300 transition-colors"
                      title="Download STL"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {job.status === 'Failed' && (
              <div className="text-[11px] text-rose-400 mt-2 bg-rose-950/20 p-2 rounded border border-rose-900/50">
                {job.error || "Optimization failed."}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const JobStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'Pending' || status === 'Processing') {
    return (
      <span className="flex items-center gap-1 text-blue-400 text-[10px] font-semibold bg-blue-950/30 px-1.5 py-0.5 rounded">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> {status}
      </span>
    );
  }
  if (status === 'Completed') {
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold bg-emerald-950/30 px-1.5 py-0.5 rounded">
        <CheckCircle2 className="w-2.5 h-2.5" /> Done
      </span>
    );
  }
  if (status === 'Completed (best from GA)') {
    return (
      <span className="flex items-center gap-1 text-amber-400 text-[10px] font-semibold bg-amber-950/30 px-1.5 py-0.5 rounded">
        <CheckCircle2 className="w-2.5 h-2.5" /> Best from GA
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-rose-400 text-[10px] font-semibold bg-rose-950/30 px-1.5 py-0.5 rounded">
      <AlertCircle className="w-2.5 h-2.5" /> Failed
    </span>
  );
};
