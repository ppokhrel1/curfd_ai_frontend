import { formatDistanceToNow } from "@/utils/formatters";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Conversation } from "../types/chat.type";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClose,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-0 bottom-0 w-72 bg-neutral-950 border-r border-neutral-800
        z-50 flex flex-col animate-in slide-in-from-left duration-200
        lg:relative lg:z-10
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-white">Conversations</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewConversation}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-green-400"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border border-green-500/20 rounded-xl text-green-400 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Chat</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">No conversations yet</p>
              <p className="text-xs text-neutral-600 mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onSelect={() => onSelectConversation(conversation.id)}
                onDelete={() => onDeleteConversation(conversation.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-3 rounded-xl transition-all duration-200 group
        ${
          isActive
            ? "bg-green-500/10 border border-green-500/20"
            : "hover:bg-neutral-900 border border-transparent"
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              isActive ? "text-green-400" : "text-white"
            }`}
          >
            {conversation.title}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {conversation.messages.length} messages •{" "}
            {formatDistanceToNow(conversation.updatedAt)}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="p-1.5 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-neutral-500 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </button>
  );
};

export default ConversationSidebar;
