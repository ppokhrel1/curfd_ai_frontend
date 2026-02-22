import { useAuthStore } from "@/lib/auth";
import {
    Code2,
    Info,
    Play,
    RotateCcw,
    Settings2,
    Terminal,
    Box
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import { useCADCompiler } from "@/modules/ai/hooks/useCADCompiler";

interface CADEditorProps {
  className?: string;
  onBuildComplete?: (shape: GeneratedShape | null) => void;
  onGenerateShape?: (requirements: any) => void; // Added to trigger shape generation
}

export const CADEditor: React.FC<CADEditorProps> = ({ className = "", onBuildComplete, onGenerateShape }) => {
  const { 
    code, 
    setCode, 
    isCompiling, 
    isDirty, 
    reset,
    mode // Added mode
  } = useEditorStore();
  
  const { compile } = useCADCompiler(onBuildComplete);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  const isRequirements = mode === "requirements";
  const detectedLanguage = isRequirements ? "JSON" : (code.includes('import cadquery') || code.includes('from cadquery') ? 'Python (CadQuery)' : 'OpenSCAD');
  const fileExtension = isRequirements ? 'requirements.json' : (detectedLanguage === 'Python (CadQuery)' ? 'assembly.py' : 'model.scad');

  useEffect(() => {
    const lines = code.split('\n').length;
    setLineCount(lines > 0 ? lines : 1);
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      
      setCode(value.substring(0, start) + "  " + value.substring(end));
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    
    if (e.ctrlKey && e.key === 'Enter') {
      handleAction();
    }
  };

  const handleAction = () => {
    if (isRequirements) {
      try {
        const parsedContent = JSON.parse(code);
        onGenerateShape?.(parsedContent);
      } catch (e) {
        console.error("Invalid JSON format");
      }
    } else {
      compile();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-neutral-950 border-r border-neutral-800 ${className}`}>
      {/* Editor Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${isRequirements ? 'bg-purple-500/10 border-purple-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
            <Code2 className={`w-4 h-4 ${isRequirements ? 'text-purple-400' : 'text-blue-400'}`} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {isRequirements ? "Specification Editor" : "CAD Script Editor"}
            </h2>
            <div className="flex items-center gap-2">
               <span className="text-[10px] text-neutral-500 font-mono uppercase">{fileExtension}</span>
               {isDirty && (
                 <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" title="Unsaved changes" />
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            disabled={!isDirty || isCompiling}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors disabled:opacity-30"
            title="Reset to Original"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleAction}
            disabled={isCompiling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              isDirty || isRequirements
                ? (isRequirements ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20")
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            } disabled:opacity-50`}
          >
            {isCompiling ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : isRequirements ? (
              <Box className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isCompiling ? "Processing..." : (isRequirements ? "Generate Shape" : "Run Script")}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-sm group">
        <div className="flex-shrink-0 w-12 bg-neutral-900/30 border-r border-neutral-800/50 py-4 text-right pr-3 select-none text-neutral-600">
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i} className="leading-6">{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          readOnly={!useAuthStore.getState().user}
          className="flex-1 bg-transparent p-4 outline-none resize-none text-neutral-300 leading-6 caret-blue-500 scrollbar-thin scrollbar-thumb-neutral-800 selection:bg-blue-500/20 disabled:opacity-50"
          placeholder={useAuthStore.getState().user 
            ? `Enter ${detectedLanguage} script here...` 
            : "Please sign in to edit CAD scripts"}
        />
        
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 rounded-full px-3 py-1.5 flex items-center gap-2 text-[10px] text-neutral-500">
              <Terminal className={`w-3 h-3 ${isRequirements ? 'text-purple-400' : 'text-blue-400'}`} />
              <span>CTRL + ENTER to {isRequirements ? "Generate" : "Run"}</span>
           </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-green-500'}`} />
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
              {isDirty ? 'Modified' : 'Synced'}
            </span>
          </div>
          <div className="h-3 w-px bg-neutral-800" />
          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
             <Settings2 className="w-3 h-3" />
             <span>{detectedLanguage}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
           <span className="flex items-center gap-1">
             <Info className="w-3 h-3" />
             {isRequirements ? "Click 'Generate Shape' to render model" : "Click 'Run' to update 3D preview"}
           </span>
        </div>
      </div>
    </div>
  );
};