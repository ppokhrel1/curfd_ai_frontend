import { ROUTES } from "@/lib/constants";
import { ChatInterface } from "@/modules/ai/components/ChatInterface";
import { Home, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const ChatPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/20">
              <Sparkles className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="font-semibold text-white">AI Assistant</h1>
              <p className="text-xs text-neutral-400">
                Ask me anything about CFD
              </p>
            </div>
          </div>
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      {/* Chat Interface */}
      <ChatInterface className="flex-1" />
    </div>
  );
};

export default ChatPage;
