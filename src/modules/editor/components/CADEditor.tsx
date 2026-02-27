import { useAuthStore } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/constants";
import {
  Box,
  Circle,
  Code2,
  Minus,
  MoveRight,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Terminal,
  FlipHorizontal2,
  Maximize2,
  ArrowUpFromLine,
  Loader2,
  Save,
  History,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useChatStore } from "@/modules/ai/stores/chatStore";
import type { GeneratedShape } from "@/modules/ai/types/chat.type";
import { useCADCompiler } from "@/modules/ai/hooks/useCADCompiler";

interface CADEditorProps {
  className?: string;
  onBuildComplete?: (shape: GeneratedShape | null) => void;
  onGenerateShape?: (requirements: any) => void;
}

// ── Snippet definitions ───────────────────────────────────────────────────────

const SHAPES = [
  { label: "Box",    icon: <Box className="w-3 h-3" />,     snippet: "cube([10, 10, 10], center=true);\n" },
  { label: "Sphere", icon: <Circle className="w-3 h-3" />,  snippet: "sphere(r=5, $fn=64);\n" },
  { label: "Cyl",    icon: <div className="w-3 h-3 flex items-center justify-center text-[9px] font-bold leading-none">⬤</div>, snippet: "cylinder(h=10, r=5, $fn=64);\n" },
  { label: "Cone",   icon: <div className="w-3 h-3 flex items-center justify-center text-[9px] leading-none">▲</div>, snippet: "cylinder(h=10, r1=5, r2=0, $fn=64);\n" },
  { label: "Text",   icon: <div className="w-3 h-3 flex items-center justify-center text-[9px] font-bold leading-none">T</div>, snippet: 'linear_extrude(height=3)\n  text("Hello", size=10);\n' },
];

const OPS = [
  { label: "Union", icon: <Plus className="w-3 h-3" />,  snippet: "union() {\n  // shape A\n  // shape B\n}\n" },
  { label: "Diff",  icon: <Minus className="w-3 h-3" />, snippet: "difference() {\n  // base\n  // cutout\n}\n" },
  { label: "Inter", icon: <div className="w-3 h-3 flex items-center justify-center text-[9px] leading-none">∩</div>, snippet: "intersection() {\n  // shape A\n  // shape B\n}\n" },
  { label: "Hull",  icon: <div className="w-3 h-3 flex items-center justify-center text-[9px] leading-none">⊔</div>, snippet: "hull() {\n  // points\n}\n" },
];

const TRANSFORMS = [
  { label: "Move",    icon: <MoveRight className="w-3 h-3" />,       snippet: "translate([0, 0, 0]) " },
  { label: "Rotate",  icon: <RotateCw className="w-3 h-3" />,        snippet: "rotate([0, 0, 0]) " },
  { label: "Scale",   icon: <Maximize2 className="w-3 h-3" />,       snippet: "scale([1, 1, 1]) " },
  { label: "Mirror",  icon: <FlipHorizontal2 className="w-3 h-3" />, snippet: "mirror([1, 0, 0]) " },
  { label: "Extrude", icon: <ArrowUpFromLine className="w-3 h-3" />, snippet: "linear_extrude(height=5) " },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const CADEditor: React.FC<CADEditorProps> = ({ className = "", onBuildComplete, onGenerateShape }) => {
  const { code, setCode, isCompiling, isDirty, reset, mode, compileRequested, clearCompileRequest, versions, currentVersionId, loadVersions, saveVersion, loadVersion } = useEditorStore();
  const { compile } = useCADCompiler(onBuildComplete);
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || "";
  const chatId = useChatStore(state => state.activeConversationId) || "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMountedRef = useRef(false);
  const [lineCount, setLineCount] = useState(1);
  const [compilePending, setCompilePending] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const loadedVersionsChatRef = useRef<string | null>(null);

  const isRequirements = mode === "requirements";
  const isCadQuery = code.includes("import cadquery") || code.includes("from cadquery");
  const detectedLanguage = isRequirements ? "JSON" : (isCadQuery ? "Python (CadQuery)" : "OpenSCAD");
  const fileExtension = isRequirements ? "requirements.json" : (isCadQuery ? "assembly.py" : "model.scad");

  useEffect(() => {
    setLineCount(Math.max(code.split("\n").length, 1));
  }, [code]);

  // Keep a stable ref to the latest compile function to avoid stale closures
  const compileRef = useRef(compile);
  useEffect(() => { compileRef.current = compile; }, [compile]);

  // Respond to external compile requests (e.g. "Open in Editor" from chat)
  useEffect(() => {
    if (compileRequested && code.trim() && !isRequirements) {
      clearCompileRequest();
      isMountedRef.current = true; // Ensure auto-compile guard is armed
      compileRef.current();
    }
  }, [compileRequested, code, isRequirements, clearCompileRequest]);

  // Load saved versions when chat changes
  useEffect(() => {
    if (!chatId || !token || loadedVersionsChatRef.current === chatId) return;
    loadedVersionsChatRef.current = chatId;
    loadVersions(chatId, token);
  }, [chatId, token, loadVersions]);

  const handleSaveVersion = async () => {
    if (!chatId || !token || isSavingVersion) return;
    setIsSavingVersion(true);
    try {
      await saveVersion(chatId, token);
    } catch {
      /* silent */
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleVersionChange = async (versionId: string) => {
    if (!chatId || !token || versionId === currentVersionId) return;
    try {
      await loadVersion(chatId, versionId, token);
    } catch { /* silent */ }
  };

  // Auto-compile: debounce 1.5s after last code change (OpenSCAD/CadQuery only)
  // Only compile when user manually edits (isDirty=true), not when loading from history
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (isRequirements || !code.trim()) {
      setCompilePending(false);
      return;
    }

    // Only auto-compile on user edits (isDirty), not programmatic changes
    // This prevents multiple compiles when loading shapes from conversation history
    const state = useEditorStore.getState();
    if (!state.isDirty) return;

    setCompilePending(true);
    const timer = setTimeout(() => {
      setCompilePending(false);
      compileRef.current();
    }, 1500);
    return () => { clearTimeout(timer); setCompilePending(false); };
  }, [code, isRequirements]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const val = ta.value;
      setCode(val.slice(0, s) + "  " + val.slice(ta.selectionEnd));
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = s + 2;
        }
      }, 0);
    }
    // Ctrl+Enter: immediate manual compile
    if (e.ctrlKey && e.key === "Enter") {
      if (isRequirements) {
        try { onGenerateShape?.(JSON.parse(code)); } catch { /* bad json */ }
      } else {
        compile();
      }
    }
  };

  // Insert snippet at cursor; preserves focus
  const insertSnippet = useCallback((snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const prefix = (pos === 0 || code[pos - 1] === "\n") ? "" : "\n";
    const newCode = code.slice(0, pos) + prefix + snippet + code.slice(pos);
    setCode(newCode);
    setTimeout(() => {
      ta.focus();
      const newPos = pos + prefix.length + snippet.length;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  }, [code, setCode]);

  const SnippetBtn = ({ label, icon, snippet }: { label: string; icon: React.ReactNode; snippet: string }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); insertSnippet(snippet); }}
      title={`Insert ${label}`}
      className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium text-neutral-500 hover:text-white hover:bg-neutral-700/60 transition-colors whitespace-nowrap flex-shrink-0"
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className={`flex flex-col h-full bg-neutral-950 ${className}`}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${isRequirements ? "bg-purple-500/10 border-purple-500/20" : "bg-blue-500/10 border-blue-500/20"}`}>
            <Code2 className={`w-3.5 h-3.5 ${isRequirements ? "text-purple-400" : "text-blue-400"}`} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white">
              {isRequirements ? "Specification Editor" : "CAD Script Editor"}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-500 font-mono">{fileExtension}</span>
              {isDirty && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Version selector + Save */}
          {!isRequirements && chatId && (
            <div className="flex items-center gap-1">
              {versions.length > 0 && (
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg px-1.5 py-1">
                  <History className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                  <select
                    value={currentVersionId || ""}
                    onChange={(e) => handleVersionChange(e.target.value)}
                    className="bg-transparent text-[10px] text-neutral-400 outline-none cursor-pointer max-w-[80px]"
                    title="Select version"
                  >
                    {currentVersionId === null && (
                      <option value="">Current</option>
                    )}
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.label || `v${v.version_number}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleSaveVersion}
                disabled={isSavingVersion || !code.trim()}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Save as new version"
              >
                {isSavingVersion
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Save className="w-3 h-3" />
                }
                <span>{isSavingVersion ? "Saving…" : "Save"}</span>
              </button>
            </div>
          )}

          <button
            onClick={reset}
            disabled={!isDirty || isCompiling}
            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors disabled:opacity-30"
            title="Reset to Original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Requirements mode: keep an explicit Generate button */}
          {isRequirements && (
            <button
              onClick={() => { try { onGenerateShape?.(JSON.parse(code)); } catch { /* bad json */ } }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-purple-600 hover:bg-purple-500 text-white transition-all"
            >
              <Box className="w-3 h-3" />
              <span>Generate</span>
            </button>
          )}

          {/* Run button + auto-compile status badge (code mode only) */}
          {!isRequirements && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => compile()}
                disabled={isCompiling || !code.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
                title="Run (Ctrl+Enter)"
              >
                {isCompiling
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Play className="w-3 h-3" />
                }
                <span>{isCompiling ? "Building…" : "Run"}</span>
              </button>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-500">
                {compilePending
                  ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  : <div className="w-2 h-2 rounded-full bg-green-500" />
                }
                <span className={compilePending ? "text-blue-400" : "text-neutral-600"}>
                  {compilePending ? "Auto…" : "Live"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Snippet Toolbar (OpenSCAD / CadQuery only) ── */}
      {!isRequirements && (
        <div className="flex-shrink-0 border-b border-neutral-800/60 bg-neutral-900/25 px-1.5 py-0.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5 w-max">
            {SHAPES.map((s) => <SnippetBtn key={s.label} {...s} />)}
            <div className="w-px h-3.5 bg-neutral-700/50 mx-1 flex-shrink-0" />
            {OPS.map((s) => <SnippetBtn key={s.label} {...s} />)}
            <div className="w-px h-3.5 bg-neutral-700/50 mx-1 flex-shrink-0" />
            {TRANSFORMS.map((s) => <SnippetBtn key={s.label} {...s} />)}
          </div>
        </div>
      )}

      {/* ── Editor Body ── */}
      <div className="flex-1 relative flex overflow-hidden font-mono group">
        {/* Line numbers */}
        <div className="flex-shrink-0 w-9 bg-neutral-900/20 border-r border-neutral-800/40 py-4 text-right pr-2 select-none text-neutral-700 text-[11px] leading-6">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          readOnly={!useAuthStore.getState().user}
          className="flex-1 bg-transparent py-4 px-3 outline-none resize-none text-neutral-300 text-[13px] leading-6 caret-blue-400 scrollbar-thin scrollbar-thumb-neutral-800 selection:bg-blue-500/20"
          placeholder={
            useAuthStore.getState().user
              ? `Enter ${detectedLanguage} script here…`
              : "Sign in to edit CAD scripts"
          }
        />

        {/* Shortcut hint */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-neutral-500">
            <Terminal className={`w-2.5 h-2.5 ${isRequirements ? "text-purple-400" : "text-blue-400"}`} />
            <span>Ctrl+Enter to {isRequirements ? "generate" : "run"}</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900/30 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            {isCompiling || compilePending
              ? <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />
              : <div className={`w-1.5 h-1.5 rounded-full ${isDirty ? "bg-amber-500" : "bg-green-500"}`} />
            }
            <span className={`font-medium uppercase tracking-widest ${isCompiling || compilePending ? "text-blue-400" : "text-neutral-500"}`}>
              {isCompiling ? "Building" : compilePending ? "Pending…" : isDirty ? "Modified" : "Synced"}
            </span>
          </div>
          <div className="w-px h-3 bg-neutral-800" />
          <span className="text-neutral-600">{detectedLanguage}</span>
          <div className="w-px h-3 bg-neutral-800" />
          <span className="text-neutral-700">{lineCount}L</span>
        </div>
        <span className="text-[10px] text-neutral-700">
          {isRequirements ? "Ctrl+Enter → Generate" : "Auto-compiles on change"}
        </span>
      </div>
    </div>
  );
};
