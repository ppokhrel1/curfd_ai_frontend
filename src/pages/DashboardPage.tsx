import { useAuthStore } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import {
  Archive,
  CreditCard,
  FileBox,
  FolderOpen,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { useState } from "react";
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
type NavItem = { label: string; icon: React.ElementType; id: string };
type Filter = "all" | "active" | "archived";

interface Session {
  id: string;
  title: string;
  chatCount: number;
  partCount: number;
  status: "active" | "idle";
  updatedAgo: string;
}

/* ── Mock data ── */
const MOCK_SESSIONS: Session[] = [
  { id: "1", title: "Drone Frame v3", chatCount: 5, partCount: 12, status: "active", updatedAgo: "12m ago" },
  { id: "2", title: "Gear Assembly", chatCount: 3, partCount: 7, status: "active", updatedAgo: "2h ago" },
  { id: "3", title: "Enclosure Prototype", chatCount: 2, partCount: 4, status: "idle", updatedAgo: "1d ago" },
  { id: "4", title: "Bracket Optimization", chatCount: 8, partCount: 3, status: "active", updatedAgo: "30m ago" },
  { id: "5", title: "Hinge Mechanism", chatCount: 1, partCount: 2, status: "idle", updatedAgo: "3d ago" },
  { id: "6", title: "Turbine Blade Study", chatCount: 4, partCount: 9, status: "active", updatedAgo: "5h ago" },
];

const NAV_ITEMS: (NavItem & { route?: string })[] = [
  { label: "Sessions", icon: LayoutGrid, id: "sessions" },
  { label: "Assets", icon: FileBox, id: "assets", route: "/assets" },
  { label: "Jobs", icon: Archive, id: "jobs", route: "/jobs" },
  { label: "Billing", icon: CreditCard, id: "billing", route: "/pricing" },
  { label: "Settings", icon: Settings, id: "settings" },
];

/* ── Session Card ── */
const SessionCard = ({ session, onClick }: { session: Session; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-white border border-neutral-200 rounded-xl hover:shadow-sm hover:border-neutral-300 transition-all group"
  >
    {/* Thumbnail */}
    <div className="relative h-28 bg-neutral-100 rounded-t-xl overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <FolderOpen className="w-8 h-8 text-neutral-300" />
      </div>
      {/* Status chip */}
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

    {/* Info */}
    <div className="p-3.5">
      <h3 className="text-sm font-semibold text-neutral-800 group-hover:text-neutral-900 truncate">
        {session.title}
      </h3>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-neutral-400">
          {session.chatCount} chats &middot; {session.partCount} parts
        </span>
        <span className="text-xs text-neutral-400">{session.updatedAgo}</span>
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
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState("sessions");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showEmpty] = useState(false); // flip to true to preview empty state

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to={ROUTES.LANDING} replace />;

  const usedGens = 18;
  const maxGens = 25;

  const filteredSessions = MOCK_SESSIONS.filter((s) => {
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "archived" && s.status !== "idle") return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = MOCK_SESSIONS.filter((s) => s.status === "active").length;

  const handleNewSession = () => {
    navigate(ROUTES.HOME);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 w-[200px] bg-neutral-50 border-r border-neutral-200 flex flex-col z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-14 border-b border-neutral-200">
          <CurfdLogo size={20} />
          <span className="text-sm font-semibold text-neutral-900 tracking-tight font-mono lowercase">
            curfd
          </span>
        </div>

        {/* New session */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New session
          </button>
        </div>

        <div className="mx-3 my-2 border-t border-neutral-200" />

        {/* Nav items */}
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

        {/* Usage box */}
        <div className="px-3 pb-4">
          <div className="p-3 bg-white border border-neutral-200 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-neutral-500">Usage</span>
              <span className="text-[11px] font-mono text-neutral-400">
                {usedGens} / {maxGens} gens
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${(usedGens / maxGens) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="ml-[200px] p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-800">Your sessions</h2>
            <p className="text-sm text-neutral-400 mt-0.5">{activeCount} active</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
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

            {/* Filter chips */}
            <div className="flex items-center gap-1">
              {(["all", "active", "archived"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                    filter === f
                      ? "bg-neutral-50 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {showEmpty ? (
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
