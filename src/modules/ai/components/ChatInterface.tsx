import {
  AlertCircle,
  Bot,
  History,
  Menu,
  Plus,
  RefreshCcw,
  Sparkles,
  X,
  Box,
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
}

export interface ChatInterfaceRef {
  sendSystemMessage: (message: string, shapeData?: GeneratedShape) => void;
  sendUserMessage: (message: string) => void;
}

const generateTitle = (content: string): string => {
  const words = content
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4);
  return words.join(" ") + (content.split(/\s+/).length > 4 ? "..." : "");
};

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ className, onShapeGenerated, setActiveView, setMobilePanel }, ref) => {
    const { setCode, setOriginalCode } = useEditorStore();
    
    const handleViewEditor = useCallback((code: string) => {
      setOriginalCode(code);
      setCode(code);
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
      clearMessages,
      retryLastMessage,
    } = useConversations();

    const [showSidebar, setShowSidebar] = useState(false);
    const { generatingChatIds, generatingChatStatus } = useChatStore();
    const [systemMessages, setSystemMessages] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastActiveIdRef = useRef<string | null>(null);
    const activeIdRef = useRef<string | null>(activeConversationId);

    // Keep ref in sync
    useEffect(() => {
      activeIdRef.current = activeConversationId;
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
      generateModel,
      sendSystemMessage: persistSystemMessage,
    } = useChat(activeConversationId, handleInternalShapeGenerated, handleInternalMessageReceived);

    const handleSend = useCallback(
      async (content: string) => {
        if (!content.trim()) return;
        await sendMessage(content);
      },
      [sendMessage]
    );

    const renderMessageExtras = (msg: Message) => {
      if (msg.role !== "assistant") return null;

      let parsedContent = null;
      try {
        if (msg.content.trim().startsWith("{")) {
          parsedContent = JSON.parse(msg.content);
        }
      } catch (e) {
        return null;
      }

      if (!parsedContent) return null;

      const nestedScad = 
        parsedContent.scadCode || 
        parsedContent.metadata_json?.scadCode || 
        parsedContent.metadata_json?.scad_code;
      
      const isAssetMessage = !!nestedScad;
      const isSpecMessage = parsedContent.detailed_geometric_instructions || parsedContent.parts;

      if (isAssetMessage || isSpecMessage) {
        const shape = activeConversation?.generatedShape;
        const globalScadCode = 
          shape?.scadCode || 
          shape?.metadata_json?.scadCode || 
          shape?.metadata_json?.scad_code;
        
        const hasScadCode = !!nestedScad || !!globalScadCode;
        const codeToEdit = nestedScad || globalScadCode;

        return (
          <div className="mt-4 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl animate-in fade-in zoom-in-95 duration-300 w-full max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> 
                  {isAssetMessage ? "Model Generated" : "Specification Ready"}
                </p>
                <p className="text-[10px] text-neutral-500 truncate">
                  {isAssetMessage 
                    ? "Geometry ready. View in editor."
                    : "Architecture calculated. Ready to mesh."
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {hasScadCode && (
                  <button
                    onClick={() => handleViewEditor(codeToEdit)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Box className="w-4 h-4 text-green-500" />
                    Editor
                  </button>
                )}
                {!isAssetMessage && (
                  <button
                    onClick={() => generateModel(parsedContent)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-500/20 active:scale-95 whitespace-nowrap"
                  >
                    <Box className="w-4 h-4" />
                    Generate
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }
      return null;
    };

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
    }));

    useEffect(() => {
      if (activeConversation && activeConversation.id !== lastActiveIdRef.current) {
        lastActiveIdRef.current = activeConversation.id;
        const lastShapeMsg = activeConversation.messages.slice().reverse().find((m: Message) => m.shapeData);
        const shapeToLoad = lastShapeMsg?.shapeData || activeConversation.generatedShape || null;
        onShapeGenerated?.(shapeToLoad);
      } else if (!activeConversation && activeConversationId !== lastActiveIdRef.current) {
        lastActiveIdRef.current = activeConversationId;
        onShapeGenerated?.(null);
      }
    }, [activeConversationId, activeConversation, onShapeGenerated]);

    const displayMessages = activeConversation?.messages || [];

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
    }, [setActiveConversation, clearMessages, onShapeGenerated]);

    const handleSelect = useCallback((id: string) => {
      setActiveConversation(id);
      setShowSidebar(false);
    }, [setActiveConversation]);

    return (
      <div className={`relative flex flex-col h-full w-full bg-neutral-950 overflow-hidden ${className || ""}`}>
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

        {/* Overlay */}
        {showSidebar && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSidebar(false)} />
        )}

        {/* Sidebar */}
        <div className={`fixed left-0 top-0 bottom-0 w-64 bg-neutral-950 border-r border-neutral-800 z-50 transform transition-transform duration-150 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800">
              <span className="text-xs font-medium text-white">History</span>
              <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-2">
              <button onClick={handleNewChat} className="w-full flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 rounded-lg text-green-400 text-xs transition-all">
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 scrollbar-none">
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-neutral-800 bg-neutral-900/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setShowSidebar(true)} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 flex-shrink-0">
                  <Menu className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-xs font-medium text-white truncate max-w-[150px] sm:max-w-xs">{activeConversation?.title || "New Chat"}</h3>
                  <p className="text-[10px] text-neutral-500 truncate">{displayMessages.length ? `${displayMessages.length} msgs` : "Start typing"}</p>
                </div>
              </div>
              <button onClick={handleNewChat} className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-[10px] transition-all">
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </div>

          {/* Messages Viewport */}
          {/* ✅ FIXED: min-h-0 allows flex child scroll to work properly */}
          <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-4 scrollbar-thin scrollbar-thumb-neutral-700 w-full">
            {displayMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-4">
                <div className="text-center mb-6">
                  <div className="relative inline-flex mb-4">
                    <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                      <Bot className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1">Ready to Help</h2>
                  <p className="text-neutral-500 text-xs">Generate 3D models or ask questions</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-0 w-full">
                {displayMessages.map((msg, idx) => (
                  <div key={msg.id || idx} className="mb-4 w-full">
                    <MessageList messages={[msg]} />
                    {renderMessageExtras(msg)}
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

          <footer className="flex-shrink-0 p-2 sm:p-4 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent">
            <MessageInput onSendMessage={handleSend} disabled={isLoading} />
          </footer>
        </div>
      </div>
    );
  }
);

ChatInterface.displayName = "ChatInterface";