import {
  AlertCircle,
  Bot,
  History,
  Menu,
  Plus,
  RefreshCcw,
  Sparkles,
  X,
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
import { GeneratedShape, Message } from "../types/chat.type";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

interface ChatInterfaceProps {
  className?: string;
  onShapeGenerated?: (shape: GeneratedShape | null) => void;
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
  ({ className, onShapeGenerated }, ref) => {
    const {
      conversations,
      activeConversationId,
      activeConversation,
      isLoadingChats,
      loadError,
      createConversation,
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

    // Keep ref in sync
    useEffect(() => {
      activeIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const handleInternalShapeGenerated = useCallback(
      (shape: GeneratedShape, chatId: string) => {
        setConversationShape(chatId, shape);
        // Only trigger global callback if it's the active chat
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
      isGeneratingGlobally,
    } = useChat(activeConversationId);

    // Expose method to parent
    useImperativeHandle(ref, () => ({
      sendSystemMessage: (message: string, shapeData?: GeneratedShape) => {
        setSystemMessages((prev) => [...prev, message]);
        // Auto-clear toast after 3 seconds
        setTimeout(() => {
          setSystemMessages((prev) => prev.slice(1));
        }, 3000);

        // Also persist if requested
        if (shapeData) {
          persistSystemMessage(message, shapeData);
        }
      },
      sendUserMessage: (message: string) => {
        handleSend(message);
      },
    }));

    useEffect(() => {
      // Sync messages from active conversation to the viewer/state
      if (
        activeConversation &&
        activeConversation.id !== lastActiveIdRef.current
      ) {
        lastActiveIdRef.current = activeConversation.id;

        // Find latest message with shape data to restore viewer state
        const lastShapeMsg = activeConversation.messages
          .slice()
          .reverse()
          .find((m: Message) => m.shapeData);
        const shapeToLoad =
          lastShapeMsg?.shapeData || activeConversation.generatedShape || null;

        onShapeGenerated?.(shapeToLoad);
      } else if (
        !activeConversation &&
        activeConversationId !== lastActiveIdRef.current
      ) {
        lastActiveIdRef.current = activeConversationId;
        onShapeGenerated?.(null);
      }
    }, [activeConversationId, activeConversation, onShapeGenerated]);

    // Use activeConversation.messages as the source of truth
    const displayMessages = activeConversation?.messages || [];

    // Auto-scroll on new messages
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages.length]);

    // Update conversation title on first user message
    useEffect(() => {
      const firstUserMsg = displayMessages.find(
        (m: Message) => m.role === "user"
      );
      if (
        activeConversationId &&
        firstUserMsg &&
        activeConversation?.title === "New Chat"
      ) {
        renameConversation(
          activeConversationId,
          generateTitle(firstUserMsg.content)
        );
      }
    }, [
      displayMessages,
      activeConversationId,
      activeConversation,
      renameConversation,
    ]);

    const handleSend = useCallback(
      async (content: string) => {
        if (!content.trim()) return;

        await sendMessage(content);
      },
      [sendMessage, addMessageToConversation]
    );

    const handleNewChat = useCallback(async () => {
      // Lazy creation: Don't create backend chat until first message
      setActiveConversation(null);
      clearMessages();
      onShapeGenerated?.(null);
      setShowSidebar(false);
    }, [setActiveConversation, clearMessages, onShapeGenerated]);

    const handleSelect = useCallback(
      (id: string) => {
        setActiveConversation(id);
        setShowSidebar(false);
      },
      [setActiveConversation]
    );

    return (
      <div className={`relative flex h-full bg-neutral-950 ${className || ""}`}>
        {/* Overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed left-0 top-0 bottom-0 w-64 bg-neutral-950 border-r border-neutral-800 z-50 transform transition-transform duration-150 ${
            showSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800">
              <span className="text-xs font-medium text-white">History</span>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 rounded-lg text-green-400 text-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {/* Loading State */}
              {isLoadingChats ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800"
                    >
                      <div className="h-3 bg-neutral-800 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-neutral-800 rounded w-1/2"></div>
                    </div>
                  ))}
                  <p className="text-center text-[10px] text-neutral-500 mt-4">
                    Loading your chats...
                  </p>
                </div>
              ) : loadError ? (
                /* Error State */
                <div className="text-center py-6">
                  <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-[10px] text-red-400 mb-1">
                    Failed to load chats
                  </p>
                  <p className="text-[9px] text-neutral-600">{loadError}</p>
                </div>
              ) : conversations.length === 0 ? (
                /* Empty State */
                <div className="text-center py-6">
                  <History className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="text-[10px] text-neutral-500">No chats yet</p>
                  <p className="text-[9px] text-neutral-600 mt-1">
                    Start a new conversation
                  </p>
                </div>
              ) : (
                /* Chat List */
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelect(conv.id)}
                    className={`p-2.5 rounded-lg cursor-pointer group flex items-start justify-between gap-2 ${
                      conv.id === activeConversationId
                        ? "bg-green-500/10 border border-green-500/20"
                        : "hover:bg-neutral-900 border border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium truncate ${
                          conv.id === activeConversationId
                            ? "text-green-400"
                            : "text-white"
                        }`}
                      >
                        {conv.title}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        {conv.messages.length} msgs
                        {conv.generatedShape && " • Model"}
                        {generatingChatIds.has(conv.id) && (
                          <span className="flex flex-col gap-1 mt-1">
                            <span className="flex items-center gap-1.5 text-green-500 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              <span className="text-[9px] uppercase font-bold tracking-tighter">
                                Generating...
                              </span>
                            </span>
                            {generatingChatStatus[conv.id] && (
                              <span className="text-[8px] text-neutral-500 italic truncate max-w-[120px]">
                                {generatingChatStatus[conv.id]}
                              </span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-neutral-500 hover:text-red-400"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-neutral-800 bg-neutral-900/50 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-xs font-medium text-white truncate max-w-[150px]">
                    {activeConversation?.title || "New Chat"}
                  </h3>
                  <p className="text-[10px] text-neutral-500">
                    {displayMessages.length
                      ? `${displayMessages.length} msgs`
                      : "Start typing"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-[10px] transition-all"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            </div>
          </div>

          {/* System Messages Toast */}
          {systemMessages.length > 0 && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 space-y-1">
              {systemMessages.map((msg, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-xs animate-in fade-in slide-in-from-top-2"
                >
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-neutral-700">
            {displayMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center mb-6">
                  <div className="relative inline-flex mb-4">
                    <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                      <Bot className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                      <Sparkles className="w-2.5 h-2.5 text-green-400" />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1">
                    Ready to Help
                  </h2>
                  <p className="text-neutral-500 text-xs">
                    Generate 3D models or ask questions
                  </p>
                </div>
                {/* Suggestions removed */}
              </div>
            ) : (
              <div className="flex flex-col min-h-full">
                <MessageList messages={displayMessages} />

                {/* Suggestions removed as per user request */}

                {isLoading && (
                  <div className="flex justify-start mt-4 max-w-4xl mx-auto w-full px-4 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="bg-neutral-900 shadow-2xl rounded-2xl px-5 py-4 border border-green-500/20 w-fit">
                      <div className="flex items-start gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-green-500/20 blur-lg rounded-full animate-pulse" />
                          <Bot className="relative w-5 h-5 text-green-400 mt-1" />
                        </div>
                        <div className="flex-1 min-w-[280px]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" />
                            </div>
                            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">
                              CURFD Intelligence
                            </span>
                          </div>
                          <p className="text-neutral-300 text-sm leading-relaxed mb-3">
                            {generatingChatStatus[activeConversationId || ""] ||
                              "Analyzing requirements and architecting your 3D model..."}
                          </p>
                          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-progress origin-left" />
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-neutral-500 italic">
                              Usually takes 60-90 seconds for mesh generation
                            </p>
                            <span className="text-[9px] text-neutral-600 font-mono">
                              {generatingChatStatus[activeConversationId || ""]
                                ? "LIVE FEED"
                                : "QUEUED"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 max-w-4xl mx-auto w-full px-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 flex items-start gap-4">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-400 mb-1">
                          Generation Interrupted
                        </p>
                        <p className="text-xs text-neutral-400 leading-relaxed mb-2">
                          {error}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => retryLastMessage()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all"
                          >
                            <RefreshCcw className="w-3 h-3" />
                            Retry Generation
                          </button>
                          <span className="text-[10px] text-neutral-600 italic">
                            Refreshes the current request pipeline
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <MessageInput onSendMessage={handleSend} disabled={isLoading} />
        </div>
      </div>
    );
  }
);

ChatInterface.displayName = "ChatInterface";
