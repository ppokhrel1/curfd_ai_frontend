import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/formatters";
import { LayoutDashboard, Briefcase, Box, Printer } from "lucide-react";

interface SidebarNavProps {
  activePage?: "home" | "jobs" | "assets" | "printers";
}

const navItems = [
  { key: "home" as const, label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { key: "jobs" as const, label: "Jobs", path: "/jobs", icon: Briefcase },
  { key: "assets" as const, label: "Assets", path: "/assets", icon: Box },
  { key: "printers" as const, label: "Printers", path: "/printers", icon: Printer },
];

export const SidebarNav = ({ activePage }: SidebarNavProps) => {
  const location = useLocation();

  const resolvedActive =
    activePage ??
    navItems.find((n) => location.pathname.startsWith(n.path))?.key ??
    "home";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[200px] shrink-0 border-r border-neutral-200 bg-white h-full flex-col">
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-neutral-100">
          <Link to="/dashboard" className="text-sm font-semibold tracking-tight text-neutral-900">
            CURFD
          </Link>
          <p className="text-[10px] font-mono text-neutral-400 mt-0.5">ai cad platform</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = resolvedActive === item.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-600 font-medium"
                    : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-100">
          <p className="text-[10px] font-mono text-neutral-300">v0.1.0</p>
        </div>
      </aside>

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = resolvedActive === item.key;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                isActive
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
