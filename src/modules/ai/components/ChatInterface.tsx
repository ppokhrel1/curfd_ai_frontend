import { Loader } from "@/components/common/Loader";
import { Bot, History, Menu, Plus, Sparkles, X } from "lucide-react";
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
import { GeneratedShape } from "../types/chat.type";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { SuggestionChips } from "./SuggestionChips";

interface ChatInterfaceProps {
  className?: string;
  onShapeGenerated?: (shape: GeneratedShape | null) => void;
}

export interface ChatInterfaceRef {
  sendSystemMessage: (message: string) => void;
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
      createConversation,
      setActiveConversation,
      deleteConversation,
      setConversationShape,
      addMessageToConversation,
      renameConversation,
    } = useConversations();

    const [showSidebar, setShowSidebar] = useState(false);
    const [systemMessages, setSystemMessages] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastActiveIdRef = useRef<string | null>(null);
    const activeIdRef = useRef<string | null>(activeConversationId);

    // Keep ref in sync
    useEffect(() => {
      activeIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const handleInternalShapeGenerated = useCallback(
      (shape: GeneratedShape) => {
        if (activeIdRef.current) {
          setConversationShape(activeIdRef.current, shape);
        }
        onShapeGenerated?.(shape);
      },
      [setConversationShape, onShapeGenerated]
    );

    const { messages, isLoading, sendMessage, clearMessages, setMessages } =
      useChat(handleInternalShapeGenerated);

    // Expose method to parent
    useImperativeHandle(ref, () => ({
      sendSystemMessage: (message: string) => {
        setSystemMessages((prev) => [...prev, message]);
        // Auto-clear after 3 seconds
        setTimeout(() => {
          setSystemMessages((prev) => prev.slice(1));
        }, 3000);
      },
    }));

    useEffect(() => {
      // Logic for switching tabs OR if initial history loads for current active session
      if (activeConversation) {
        // If we switched tabs, always sync
        if (activeConversationId !== lastActiveIdRef.current) {
          lastActiveIdRef.current = activeConversationId;
          setMessages(activeConversation.messages);
          
          // Restore latest shape from history
          const lastShapeMsg = activeConversation.messages.slice().reverse().find(m => m.shapeData);
          const shapeToLoad = lastShapeMsg?.shapeData || activeConversation.generatedShape || null;
          
          onShapeGenerated?.(shapeToLoad);
          return;
        }

        // If we are on the same tab but history just loaded (transition from 0 to N messages)
        const currentCount = messages.filter(m => m.role !== 'assistant' || !m.content.includes('❌')).length;
        const activeCount = activeConversation.messages.length;

        if (currentCount === 0 && activeCount > 0) {
          setMessages(activeConversation.messages);
          // Also check for shape recovery on initial load
          const lastShapeMsg = activeConversation.messages.slice().reverse().find(m => m.shapeData);
          if (lastShapeMsg?.shapeData) {
            onShapeGenerated?.(lastShapeMsg.shapeData);
          }
        }
      } else if (activeConversationId !== lastActiveIdRef.current) {
        lastActiveIdRef.current = activeConversationId;
        setMessages([]);
        onShapeGenerated?.(null);
      }
    }, [
      activeConversationId,
      activeConversation,
      // We purposefully do NOT depend on activeConversation.messages here
      // to let useChat be the source of truth during an active session.
      setMessages,
      onShapeGenerated
    ]);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Save messages
    useEffect(() => {
      if (activeConversationId && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const stored = activeConversation?.messages || [];
        if (stored.length < messages.length) {
          addMessageToConversation(lastMsg);
          if (stored.length === 0 && lastMsg.role === "user") {
            renameConversation(
              activeConversationId,
              generateTitle(lastMsg.content)
            );
          }
        }
      }
    }, [
      messages,
      activeConversationId,
      activeConversation,
      addMessageToConversation,
      renameConversation,
    ]);

    const handleSend = useCallback(
      async (content: string) => {
        if (!activeConversationId) await createConversation();
        await sendMessage(content);
      },
      [activeConversationId, createConversation, sendMessage]
    );

    const handleNewChat = useCallback(async () => {
      await createConversation();
      clearMessages();
      onShapeGenerated?.(null);
      setShowSidebar(false);
    }, [createConversation, clearMessages, onShapeGenerated]);

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
                className="w-full flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 rounded-lg text-green-400 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {conversations.length === 0 ? (
                <div className="text-center py-6">
                  <History className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="text-[10px] text-neutral-500">No chats</p>
                </div>
              ) : (
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
                    {messages.length
                      ? `${messages.length} msgs`
                      : "Start typing"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-[10px]"
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
            {messages.length === 0 ? (
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
                <SuggestionChips onSuggestionClick={handleSend} />
              </div>
            ) : (
              <>
                <MessageList messages={messages} />
                {isLoading && (
                  <div className="flex justify-start mt-3">
                    <div className="bg-neutral-900/80 rounded-xl px-4 py-3 border border-neutral-800">
                      <div className="flex items-center gap-2">
                        <Loader size="sm" />
                        <span className="text-neutral-400 text-xs">
                          Generating complex 3D model... This may take a few minutes
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <MessageInput onSendMessage={handleSend} disabled={isLoading} />
        </div>
      </div>
    );
  }
);

ChatInterface.displayName = "ChatInterface";
