import { useAuthStore } from "@/lib/auth";
import { chatService } from "@/modules/ai/services/chatService";
import { jobService } from "@/modules/ai/services/jobService";
import { useChatStore } from "@/modules/ai/stores/chatStore";
import {
  Code2,
  Info,
  Play,
  RotateCcw,
  Settings2,
  Terminal,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useEditorStore } from "../stores/editorStore";

interface CADEditorProps {
  className?: string;
}

export const CADEditor: React.FC<CADEditorProps> = ({ className = "" }) => {
  const {
    code,
    setCode,
    compile,
    isCompiling,
    isDirty,
    reset,
    error,
    errorLine,
    setCompiling,
    setError,
  } = useEditorStore();

  const { activeConversationId } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  const detectedLanguage =
    code.includes("import cadquery") || code.includes("from cadquery")
      ? "Python (CadQuery)"
      : "OpenSCAD";

  const fileExtension =
    detectedLanguage === "Python (CadQuery)" ? "assembly.py" : "model.scad";

  useEffect(() => {
    const lines = code.split("\n").length;
    setLineCount(lines > 0 ? lines : 1);
  }, [code]);

  const handleCompile = useCallback(async () => {
    if (!code.trim()) {
      toast.error("Please enter some code before running.");
      return;
    }

    if (isCompiling) return;

    compile();

    try {
      const {
        setActiveConversationId,
        setConversations,
        conversations,
        addJobToHistory,
        setGenerating,
      } = useChatStore.getState();

      let targetChatId = activeConversationId;

      const sessionId = await chatService.ensureSession();

      if (!targetChatId) {
        targetChatId = await chatService.createChat(
          `Script: ${detectedLanguage}`
        );

        const newConv = {
          id: targetChatId,
          title: `Script: ${detectedLanguage}`,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setConversations([newConv as any, ...conversations]);
        setActiveConversationId(targetChatId);

        await new Promise((r) => setTimeout(r, 500));
      }

      setGenerating(targetChatId, true, "Running script...");

      const job = await jobService.createJob({
        session_id: sessionId,
        prompt: `Execute ${detectedLanguage} script`,
        output_format: "glb",
      });

      addJobToHistory(targetChatId, {
        ...job,
        status: "queued",
        createdAt: new Date(),
      });

      await chatService.startRunpodRequest(
        targetChatId,
        code,
        "generate_scad",
        {
          model_type:
            detectedLanguage === "Python (CadQuery)" ? "python" : "scad",
          custom_code: code,
          job_id: job.id,
        }
      );
    } catch (err: any) {
      console.error("[CADEditor] Compilation failed:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to start compilation";
      setError(errorMsg);
      setCompiling(false);
      if (activeConversationId) {
        useChatStore.getState().setGenerating(activeConversationId, false);
      }
    }
  }, [
    activeConversationId,
    code,
    isCompiling,
    compile,
    detectedLanguage,
    setError,
    setCompiling,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      setCode(value.substring(0, start) + "  " + value.substring(end));

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }

    if (e.ctrlKey && e.key === "Enter") {
      handleCompile();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-neutral-950 border-r border-neutral-800 ${className}`}
    >
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Code2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">CAD Script Editor</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500 font-mono uppercase">
                {fileExtension}
              </span>
              {isDirty && (
                <span
                  className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"
                  title="Unsaved changes"
                />
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
            onClick={handleCompile}
            disabled={isCompiling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              isDirty
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            } disabled:opacity-50`}
          >
            {isCompiling ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isCompiling ? "Compiling..." : "Run Script"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex overflow-hidden font-mono text-sm group">
        <div className="flex-shrink-0 w-12 bg-neutral-900/30 border-r border-neutral-800/50 py-4 text-right pr-3 select-none text-neutral-600">
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div
              key={i}
              className={`leading-6 transition-colors ${
                errorLine === i + 1
                  ? "text-red-500 font-bold bg-red-500/10 -mr-[1px] border-r border-red-500"
                  : ""
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          readOnly={!useAuthStore.getState().user}
          className={`flex-1 bg-transparent p-4 outline-none resize-none text-neutral-300 leading-6 caret-blue-500 scrollbar-thin scrollbar-thumb-neutral-800 selection:bg-blue-500/20 disabled:opacity-50 ${
            error ? "bg-red-500/5" : ""
          }`}
          placeholder={
            useAuthStore.getState().user
              ? `Enter ${detectedLanguage} script here...`
              : "Please sign in to edit CAD scripts"
          }
        />

        {error && (
          <div className="absolute top-4 right-4 max-w-[300px] animate-in fade-in slide-in-from-top-2">
            <div className="bg-red-900/90 backdrop-blur-md border border-red-500/50 rounded-lg p-3 text-xs text-red-200 shadow-xl flex gap-2">
              <Info className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <p className="font-bold mb-1 uppercase tracking-wider">
                  Compilation Error
                </p>
                <p className="leading-relaxed opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 rounded-full px-3 py-1.5 flex items-center gap-2 text-[10px] text-neutral-500">
            <Terminal className="w-3 h-3 text-blue-400" />
            <span>CTRL + ENTER to Run</span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${isDirty ? "bg-amber-500" : "bg-green-500"}`}
            />
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
              {isDirty ? "Modified" : "Synced"}
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
            Click 'Run' to update 3D preview
          </span>
        </div>
      </div>
    </div>
  );
};
