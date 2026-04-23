import { useAuthStore } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { api } from "@/lib/api/client";
import {
  Archive,
  CreditCard,
  FileBox,
  FolderOpen,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

/* ── Curfd isometric-cube logo ── */
function CurfdLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 30,10 16,18 2,10" fill="#e09820" opacity="0.95" />
      <polygon points="2,10 16,18 16,30 2,22" fill="#c07a18" opacity="0.85" />
      <polygon points="30,10 16,18 16,30 30,22" fill="#9a5e14" opacity="0.75" />
      <line x1="8" y1="6" x2="24" y2="14" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="12" y1="4" x2="28" y2="12" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    </svg>
  );
}

/* ── Types ── */
type NavItem = { label: string; icon: React.ElementType; id: string; route?: string };
type Filter = "all" | "active" | "archived";

interface Session {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  chatCount?: number;
}

interface Chat {
  id: string;
  session_id: string;
  title: string | null;
  created_at: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Sessions", icon: LayoutGrid, id: "sessions" },
  { label: "Assets", icon: FileBox, id: "assets", route: "/assets" },
  { label: "Jobs", icon: Archive, id: "jobs", route: "/jobs" },
  { label: "Billing", icon: CreditCard, id: "billing", route: "/pricing" },
  { label: "Settings", icon: Settings, id: "settings" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ── Session Card ── */
const SessionCard = ({ session, onClick }: { session: Session; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-white border border-neutral-200 rounded-xl hover:shadow-sm hover:border-neutral-300 transition-all group"
  >
    <div className="relative h-28 bg-neutral-100 rounded-t-xl overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <FolderOpen className="w-8 h-8 text-neutral-300" />
      </div>
      <span
        className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          session.status === "active"
            ? "bg-primary-100 text-primary-700"
            : "bg-neutral-200 text-neutral-500"
        }`}
      >
        {session.status}
      </span>
    </div>
    <div className="p-3.5">
      <h3 className="text-sm font-semibold text-neutral-800 group-hover:text-neutral-900 truncate">
        {session.name || "Untitled Session"}
      </h3>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-neutral-400">
          {session.chatCount ?? 0} chats
        </span>
        <span className="text-xs text-neutral-400">{timeAgo(session.last_active_at || session.updated_at)}</span>
      </div>
    </div>
  </button>
);

/* ── Empty State ── */
const EmptyState = ({ onNew }: { onNew: () => void }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
      <FolderOpen className="w-7 h-7 text-neutral-300" />
    </div>
    <h3 className="text-lg font-semibold text-neutral-800 mb-1">No sessions yet</h3>
    <p className="text-sm text-neutral-500 mb-8 max-w-xs">
      Start a new session to begin designing with AI.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
      {[
        { label: "Blank session", icon: Plus, action: onNew },
        { label: "Upload model", icon: Upload, action: onNew },
        { label: "Pick template", icon: LayoutGrid, action: onNew },
      ].map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="flex flex-col items-center gap-2 p-5 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <item.icon className="w-5 h-5 text-neutral-400" />
          <span className="text-xs font-medium text-neutral-600">{item.label}</span>
        </button>
      ))}
    </div>
  </div>
);

/* ── Main Page ── */
const DashboardPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState("sessions");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);
      try {
        // Fetch sessions
        const sessResp = await api.get<Session[]>("/sessions");
        const sessData = sessResp.data || [];

        // Fetch chats to count per session
        const chatCounts: Record<string, number> = {};
        for (const sess of sessData) {
          try {
            const chatResp = await api.get<Chat[]>("/chats", { params: { session_id: sess.id } });
            chatCounts[sess.id] = chatResp.data?.length || 0;
          } catch {
            chatCounts[sess.id] = 0;
          }
        }

        setSessions(sessData.map((s) => ({ ...s, chatCount: chatCounts[s.id] || 0 })));
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to={ROUTES.LANDING} replace />;

  const filteredSessions = sessions.filter((s) => {
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "archived" && s.status === "active") return false;
    if (search && !(s.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = sessions.filter((s) => s.status === "active").length;

  const handleNewSession = () => {
    navigate(ROUTES.HOME);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 w-[200px] bg-neutral-50 border-r border-neutral-200 flex flex-col z-30">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-neutral-200">
          <CurfdLogo size={20} />
          <span className="text-sm font-semibold text-neutral-900 tracking-tight font-mono lowercase">
            curfd
          </span>
        </div>

        <div className="px-3 pt-4 pb-2 space-y-2">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New session
          </button>
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg transition-colors"
          >
            Back to Workspace
          </button>
        </div>

        <div className="mx-3 my-2 border-t border-neutral-200" />

        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  if (item.route) navigate(item.route);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-white border border-neutral-200 font-semibold text-neutral-800 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="ml-[200px] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-800">Your sessions</h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {loading ? "Loading..." : `${activeCount} active`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions..."
                className="pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 w-48 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1">
              {(["all", "active", "archived"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                    filter === f
                      ? "bg-neutral-800 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState onNew={handleNewSession} />
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-sm">
            No sessions match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => navigate(ROUTES.HOME)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
