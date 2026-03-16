import React, { useState, useEffect } from 'react';
import { CADEditor } from './CADEditor';
import { Code2, SlidersHorizontal } from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { useChatStore } from '@/modules/ai/stores/chatStore';
import { STORAGE_KEYS } from '@/lib/constants';
import type { GeneratedShape } from '@/modules/ai/types/chat.type';
import { ParameterPanel } from './ParameterPanel';
import { useOptimization } from './OptimizationPanel/hooks/useOptimization';

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

  const { parameters, compileRequested, code } = useEditorStore();
  const hasParameters = parameters && parameters.length > 0;

  // Optimization hook — loads persisted jobs + provides startOptimization
  const resolvedChatId = chatId || useChatStore.getState().activeConversationId || "";
  const resolvedToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || "";
  const { startOptimization } = useOptimization(resolvedChatId, resolvedToken);

  const handleOptimizeRequest = (optimizedParamsPayload: any[]) => {
    startOptimization(code, optimizedParamsPayload);
  };

  // Auto-switch TO parameters as soon as they arrive (e.g. after AI generation)
  // BUT skip when a compile is pending — keep Code tab so CADEditor can handle it
  useEffect(() => {
    if (hasParameters && !compileRequested) {
      setActiveTab('parameters');
    }
  }, [hasParameters, compileRequested]);

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

      {/* Main Content Area — both panels stay mounted to prevent unmount mid-compile */}
      <div className="flex-1 overflow-hidden relative">
        <div className={`h-full ${activeTab === 'code' ? '' : 'hidden'}`}>
          <CADEditor
            onBuildComplete={onBuildComplete}
            onGenerateShape={onGenerateShape}
            className="border-r-0"
          />
        </div>
        <div className={`h-full bg-neutral-950 flex flex-col overflow-y-auto ${activeTab === 'parameters' ? '' : 'hidden'}`}>
          <ParameterPanel onOptimizeClick={handleOptimizeRequest} />
        </div>
      </div>
    </div>
  );
};
