import {
  AlertCircle,
  Bot,
  History,
  Menu,
  Plus,
  RefreshCcw,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useChat } from "../hooks/useChat";
import { useConversations } from "../hooks/useConversations";
import { useChatStore } from "../stores/chatStore";
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import type { GeneratedShape, Message } from "../types/chat.type";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

interface ChatInterfaceProps {
  className?: string;
  onShapeGenerated?: (shape: GeneratedShape | null) => void;
  setActiveView: (view: any) => void;
  setMobilePanel: (panel: any) => void;
  isMinimized?: boolean;
  onMinimize?: (minimized: boolean) => void;
  children?: React.ReactNode; 
}

export interface ChatInterfaceRef {
  sendSystemMessage: (message: string, shapeData?: GeneratedShape) => void;
  sendUserMessage: (message: string) => void;
  generateModel: (requirements: any) => Promise<void>;
}

const generateTitle = (content: string): string => {
  const words = content.replace(/[^\w\s]/g, " ").trim().split(/\s+/).slice(0, 4);
  return words.join(" ") + (content.split(/\s+/).length > 4 ? "..." : "");
};

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ className, onShapeGenerated, setActiveView, setMobilePanel, isMinimized = false, onMinimize, children }, ref) => {
    const { setCode, setOriginalCode } = useEditorStore();

    const handleViewEditor = useCallback((content: string, type: "requirements" | "code") => {
      setOriginalCode(content);
      setCode(content);
      
      const editorStore = useEditorStore.getState() as any;
      if (editorStore.setMode) {
        editorStore.setMode(type);
      }

      setActiveView('editor');
      setMobilePanel('editor'); 
    }, [setActiveView, setMobilePanel, setCode, setOriginalCode]);

    const {
      conversations,
      activeConversationId,
      activeConversation,
      isLoadingChats,
      loadError,
      setActiveConversation,
      deleteConversation,
      setConversationShape,
      addMessageToConversation,
      renameConversation,
    } = useConversations();

    const [showSidebar, setShowSidebar] = useState(false);
    const { generatingChatIds, generatingChatStatus } = useChatStore();
    const [systemMessages, setSystemMessages] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastActiveIdRef = useRef<string | null>(null);
    const activeIdRef = useRef<string | null>(activeConversationId);
    
    const autoOpenedMessageId = useRef<string | null>(null);
    const lastProcessedMessageId = useRef<string | null>(null);

    useEffect(() => {
      activeIdRef.current = activeConversationId;
      // Reset the processed ID when switching conversations so the editor updates
      lastProcessedMessageId.current = null;
    }, [activeConversationId]);

    const handleInternalShapeGenerated = useCallback(
      (shape: GeneratedShape, chatId: string) => {
        setConversationShape(chatId, shape);
        if (chatId === activeConversationId) {
          onShapeGenerated?.(shape);
        }
      },
      [setConversationShape, onShapeGenerated, activeConversationId]
    );

    const handleInternalMessageReceived = useCallback(
      (message: Message, chatId: string) => {
        addMessageToConversation(message, chatId);
      },
      [addMessageToConversation]
    );

    const {
      isLoading,
      error,
      sendMessage,
      sendSystemMessage: persistSystemMessage,
      clearMessages,
      retryLastMessage,
      generateModel, // Keep this here in case you need it for manual triggers later
    } = useChat(activeConversationId, handleInternalShapeGenerated, handleInternalMessageReceived);

    const handleSend = useCallback(
      async (content: string) => {
        if (!content.trim()) return;
        await sendMessage(content);
        
        if (isMinimized && onMinimize) {
          onMinimize(false);
        }
      },
      [sendMessage, isMinimized, onMinimize]
    );

    useImperativeHandle(ref, () => ({
      sendSystemMessage: (message: string, shapeData?: GeneratedShape) => {
        setSystemMessages((prev) => [...prev, message]);
        setTimeout(() => {
          setSystemMessages((prev) => prev.slice(1));
        }, 3000);
        if (shapeData) {
          persistSystemMessage(message, shapeData);
        }
      },
      sendUserMessage: (message: string) => {
        handleSend(message);
      },
      generateModel: async (requirements: any) => {
        // --- RUNPOD DISABLED ---
        // Uncomment the line below to re-enable manual Runpod triggers
        // await generateModel(requirements);
        console.log("Runpod generation is currently disabled. Requirements:", requirements);
      },
    }));

    const displayMessages = activeConversation?.messages || [];

    // AUTO-LOAD EFFECT: Watches messages and silently updates the editor
    useEffect(() => {
      if (displayMessages.length === 0) return;
      const latestMsg = displayMessages[displayMessages.length - 1];

      // Only process if it's an assistant message AND we haven't processed it yet
      if (latestMsg.role !== "assistant") return;
      if (lastProcessedMessageId.current === latestMsg.id) return;

      const cleanContent = latestMsg.content.split("|||JSON_DATA|||")[0].trim();
      let rawData = "";
      let isJson = false;
      const parts = cleanContent.split(/(```[\s\S]*?```)/g).filter(Boolean);
      const codeBlocks = parts.filter((p) => p.startsWith("```") && p.endsWith("```"));

      if (codeBlocks.length > 0) {
        const lastBlock = codeBlocks[codeBlocks.length - 1];
        const lines = lastBlock.split("\n");
        const header = lines.shift() || "";
        if (lines[lines.length - 1]?.trim() === "```") lines.pop();
        
        rawData = lines.join("\n").trim();
        const lang = header.replace("```", "").trim().toLowerCase();
        
        if (lang === "json" || rawData.startsWith("{") || rawData.startsWith("[")) {
          try { 
            const parsed = JSON.parse(rawData); 
            const extractedCode = parsed.scadCode || parsed.openscad_code ||parsed.metadata_json?.scadCode || parsed.metadata_json?.scad_code;
            if (extractedCode) {
              rawData = extractedCode;
              isJson = false; 
            } else {
              isJson = true;
            }
          } catch (e) {
            isJson = lang === "json";
          }
        } 
      } else if (cleanContent.startsWith("{") || cleanContent.startsWith("[")) {
        // Fallback for raw JSON dumped without markdown formatting
        try {
          const parsed = JSON.parse(cleanContent);
          const extractedCode = parsed.scadCode || parsed.openscad_code || parsed.metadata_json?.scadCode || parsed.metadata_json?.scad_code;
          if (extractedCode) {
            rawData = extractedCode;
            isJson = false; // It's code, switch to code editor mode!
          } else {
            rawData = cleanContent;
            isJson = true;  // Keep as requirements
          }
        } catch (e) {
          // Parsing failed, leave rawData empty
        }
      }

      // Only update the store if we have valid data
      if (rawData.length > 50) {
        // Mark as processed so it doesn't run again on reload
        lastProcessedMessageId.current = latestMsg.id;
        
        setCode(rawData);
        setOriginalCode(rawData);

        const editorStore = useEditorStore.getState() as any;
        if (editorStore.setMode) {
          editorStore.setMode(isJson ? "requirements" : "code");
        }

        if (autoOpenedMessageId.current !== latestMsg.id) {
          autoOpenedMessageId.current = latestMsg.id;
          setActiveView("editor");
          setMobilePanel("editor");
        }
      }
    }, [displayMessages, setCode, setOriginalCode, setActiveView, setMobilePanel]);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages.length, isLoading]);

    useEffect(() => {
      const firstUserMsg = displayMessages.find((m: Message) => m.role === "user");
      if (activeConversationId && firstUserMsg && activeConversation?.title === "New Chat") {
        renameConversation(activeConversationId, generateTitle(firstUserMsg.content));
      }
    }, [displayMessages, activeConversationId, activeConversation, renameConversation]);

    const handleNewChat = useCallback(async () => {
      setActiveConversation(null);
      clearMessages();
      onShapeGenerated?.(null);
      setShowSidebar(false);
      if (isMinimized && onMinimize) onMinimize(false);
    }, [setActiveConversation, clearMessages, onShapeGenerated, isMinimized, onMinimize]);

    const handleSelect = useCallback((id: string) => {
      setActiveConversation(id);
      setShowSidebar(false);
    }, [setActiveConversation]);

    return (
      <div className={`flex flex-col h-full w-full bg-neutral-950 overflow-hidden ${className || ""}`}>
        {/* System Messages Toast */}
        {systemMessages.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-md px-4 pointer-events-none">
            {systemMessages.map((msg, idx) => (
              <div key={idx} className="bg-neutral-800 text-white px-3 py-2 rounded-lg shadow-lg text-xs border border-neutral-700 animate-in fade-in slide-in-from-top-2">
                {msg}
              </div>
            ))}
          </div>
        )}

        {/* History Overlay */}
        {showSidebar && (
          <div className="pointer-events-auto fixed inset-0 bg-black/50 z-40" onClick={() => setShowSidebar(false)} />
        )}

        {/* History Sidebar */}
        <div className={`pointer-events-auto fixed left-0 top-0 bottom-[76px] w-64 bg-neutral-950 border-r border-neutral-800 z-50 transform transition-transform duration-150 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800">
              <span className="text-xs font-medium text-white">History</span>
              <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-none">
              {isLoadingChats ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800">
                      <div className="h-3 bg-neutral-800 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-neutral-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="text-center py-6 px-4">
                  <p className="text-red-400 text-xs font-medium">Failed to load chats</p>
                  <p className="text-neutral-500 text-[10px] mt-1">{loadError}</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-6">
                  <History className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="text-[10px] text-neutral-500">No chats yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div key={conv.id} onClick={() => handleSelect(conv.id)} className={`p-2.5 rounded-lg cursor-pointer group flex items-start justify-between gap-2 ${conv.id === activeConversationId ? "bg-green-500/10 border border-green-500/20" : "hover:bg-neutral-900 border border-transparent"}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${conv.id === activeConversationId ? "text-green-400" : "text-white"}`}>{conv.title}</p>
                      <p className="text-[10px] text-neutral-500">{conv.messages.length} msgs</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-neutral-500 hover:text-red-400">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* TOP LAYOUT: Sidebar + Content */}
        <div className="flex-1 flex min-h-0 relative z-0">
          
          {/* LEFT SIDEBAR: Active Components List OR Minimized Strip */}
          {isMinimized ? (
            <div 
              className="flex-shrink-0 w-12 bg-neutral-950 border-r border-neutral-800 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-neutral-900 transition-colors z-20"
              onClick={() => onMinimize?.(false)}
            >
              <Menu className="w-5 h-5 text-neutral-400" />
              <div className="flex-1" />
              <ChevronRight className="w-5 h-5 text-neutral-500" />
            </div>
          ) : (
            <div className={`flex-shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col z-20 ${children ? 'w-[320px]' : 'w-full'}`}>
              <div className="flex-shrink-0 border-b border-neutral-800 bg-neutral-900/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowSidebar(true)} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400">
                    <Menu className="w-4 h-4" />
                  </button>
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Components</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handleNewChat} className="p-1.5 bg-green-500/10 hover:bg-green-500/20 rounded text-green-400 transition-colors" title="New Session">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {onMinimize && (
                    <button onClick={() => onMinimize?.(true)} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 transition-colors" title="Collapse Sidebar">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-4 scrollbar-thin scrollbar-thumb-neutral-700 w-full">
                {displayMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-4">
                    <div className="text-center mb-6">
                      <div className="relative inline-flex mb-4">
                        <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                          <Bot className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                      <h2 className="text-sm font-bold text-white mb-1">Ready to Help</h2>
                      <p className="text-neutral-500 text-[11px]">Generate 3D models</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-end min-h-0 w-full">
                    {displayMessages.map((msg, idx) => (
                      <div key={msg.id || idx} className="mb-4 w-full">
                        <MessageList 
                          messages={[msg]} 
                          onOpenInEditor={handleViewEditor} 
                        />
                      </div>
                    ))}
                    {error && (
                      <div className="mt-4 w-full px-2 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-400 mb-1">Error</p>
                            <p className="text-xs text-neutral-400 mb-2 truncate">{error}</p>
                            <button onClick={() => retryLastMessage()} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg text-red-400 text-[10px] font-bold uppercase">
                              <RefreshCcw className="w-3 h-3" /> Retry
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MAIN CHILDREN WORKSPACE (Editor & Viewer injected here) */}
          {children && (
            <div className="flex-1 min-w-0 h-full relative z-10">
              {children}
            </div>
          )}
        </div>

        {/* BOTTOM BAR: Minimal Full-Width Input */}
        <div className="flex-shrink-0 z-40 bg-neutral-950/90 backdrop-blur-md">
          <MessageInput onSendMessage={handleSend} disabled={isLoading} />
        </div>
      </div>
    );
  }
);

ChatInterface.displayName = "ChatInterface";