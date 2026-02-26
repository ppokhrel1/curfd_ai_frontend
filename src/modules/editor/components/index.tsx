import React, { useState, useEffect } from 'react';
import { CADEditor } from './CADEditor';
import { Code2, SlidersHorizontal } from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import { OptimizationPanel } from './OptimizationPanel';

export interface EditorContainerProps {
  className?: string;
  chatId: string; 
  token: string;  
  onBuildComplete?: (shape: GeneratedShape | null) => void;
  onGenerateShape?: (requirements: any) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  className = "",
  chatId,
  token,
  onBuildComplete,
  onGenerateShape
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'parameters'>('code');

  const { parameters } = useEditorStore();
  const hasParameters = parameters && parameters.length > 0;

  // Auto-switch TO parameters as soon as they arrive (e.g. after AI generation)
  useEffect(() => {
    if (hasParameters) {
      setActiveTab('parameters');
    }
  }, [hasParameters]);

  // Auto-switch back to code if parameters are cleared
  useEffect(() => {
    if (!hasParameters && activeTab === 'parameters') {
      setActiveTab('code');
    }
  }, [hasParameters, activeTab]);

  return (
    <div className={`flex flex-col h-full bg-neutral-950 border-r border-neutral-800 ${className}`}>
      
      {/* Selection Bar Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-center">
        
        {/* Segmented Toggle Control */}
        <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-1 w-full max-w-[300px]">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
              activeTab === 'code' 
                ? 'bg-neutral-800 text-blue-400 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Code
          </button>
          
          <button
            onClick={() => setActiveTab('parameters')}
            disabled={!hasParameters}
            title={!hasParameters ? "Generate a parameterized model first" : ""}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
              !hasParameters 
                ? 'opacity-40 cursor-not-allowed text-neutral-600' 
                : activeTab === 'parameters' 
                  ? 'bg-neutral-800 text-purple-400 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Parameters
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'code' ? (
          <CADEditor
            onBuildComplete={onBuildComplete}
            onGenerateShape={onGenerateShape}
            className="border-r-0"
          />
        ) : (
          <div className="h-full bg-neutral-950 flex flex-col">
            {/* Pass the chatId and token to the panel so it can manage its own API calls 
              via Server-Sent Events without muddying up the EditorContainer.
            */}
            <OptimizationPanel 
              onBuildComplete={onBuildComplete} 
              onSwitchToCode={() => setActiveTab('code')} 
            />
          </div>
        )}
      </div>
    </div>
  );
};