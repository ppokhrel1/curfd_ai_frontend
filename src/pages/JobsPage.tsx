import { useState } from "react";
import { cn } from "@/utils/formatters";
import { SidebarNav } from "@/components/common/SidebarNav";

type StatusKey = "running" | "queued" | "done" | "failed";

interface Job {
  id: string;
  session: string;
  action: string;
  status: StatusKey;
  progress: number; // 0-100
  time: string;
}

const MOCK_JOBS: Job[] = [
  { id: "j_8f2a", session: "Drone Frame v3", action: "generate_scad", status: "running", progress: 62, time: "1m 14s" },
  { id: "j_3b7c", session: "Motor Mount", action: "compile_stl", status: "done", progress: 100, time: "42s" },
  { id: "j_a1d4", session: "Propeller Guard", action: "generate_scad", status: "queued", progress: 0, time: "—" },
  { id: "j_c9e0", session: "Battery Tray", action: "optimize", status: "failed", progress: 34, time: "2m 01s" },
  { id: "j_f5b8", session: "Landing Gear", action: "generate_scad", status: "running", progress: 88, time: "3m 22s" },
  { id: "j_72da", session: "Camera Gimbal", action: "compile_stl", status: "done", progress: 100, time: "1m 05s" },
];

const FILTERS = ["All", "Running", "Queued", "Done", "Failed"] as const;

const STATUS_STYLES: Record<StatusKey, string> = {
  running: "bg-primary-100 text-primary-700",
  queued: "bg-neutral-100 text-neutral-600",
  done: "bg-primary-100 text-primary-700",
  failed: "bg-red-100 text-red-700",
};

const JobsPage = () => {
  const [filter, setFilter] = useState<string>("All");

  const filtered =
    filter === "All"
      ? MOCK_JOBS
      : MOCK_JOBS.filter((j) => j.status === filter.toLowerCase());

  return (
    <div className="h-screen flex bg-white">
      <SidebarNav activePage="jobs" />

      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Jobs</h2>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 text-xs font-mono rounded-full border transition-colors",
                    filter === f
                      ? "bg-neutral-50 text-white border-neutral-900"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table (desktop) */}
          <div className="w-full">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[80px_1.5fr_1fr_100px_1.5fr_100px] gap-4 px-4 pb-2 border-b border-neutral-200">
              {["ID", "Session", "Action", "Status", "Progress", "Actions"].map((col) => (
                <span key={col} className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">
                  {col}
                </span>
              ))}
            </div>

            {/* Desktop data rows */}
            {filtered.map((job) => (
              <div
                key={job.id}
                className="hidden md:grid grid-cols-[80px_1.5fr_1fr_100px_1.5fr_100px] gap-4 px-4 py-3 border-b border-dashed border-neutral-200 items-center"
              >
                <span className="font-mono text-xs text-neutral-400">{job.id}</span>
                <span className="font-medium text-neutral-800 text-sm">{job.session}</span>
                <span className="font-mono text-xs text-neutral-600">{job.action}</span>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full w-fit",
                    STATUS_STYLES[job.status]
                  )}
                >
                  {job.status}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-neutral-400 whitespace-nowrap">{job.time}</span>
                </div>
                <div className="flex gap-2">
                  {job.status === "running" && (
                    <button className="text-xs font-mono text-neutral-400 hover:text-neutral-700">Cancel</button>
                  )}
                  {job.status === "failed" && (
                    <button className="text-xs font-mono text-neutral-400 hover:text-neutral-700">Retry</button>
                  )}
                  {job.status === "done" && (
                    <button className="text-xs font-mono text-primary-600 hover:text-primary-800">Open</button>
                  )}
                </div>
              </div>
            ))}

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 mt-2">
              {filtered.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-neutral-200 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-neutral-400">{job.id}</span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        STATUS_STYLES[job.status]
                      )}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="font-medium text-neutral-800 text-sm">{job.session}</p>
                  <p className="font-mono text-xs text-neutral-600">{job.action}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-neutral-400 whitespace-nowrap">{job.time}</span>
                  </div>
                  <div className="flex gap-3 pt-1">
                    {job.status === "running" && (
                      <button className="text-xs font-mono text-neutral-400 hover:text-neutral-700">Cancel</button>
                    )}
                    {job.status === "failed" && (
                      <button className="text-xs font-mono text-neutral-400 hover:text-neutral-700">Retry</button>
                    )}
                    {job.status === "done" && (
                      <button className="text-xs font-mono text-primary-600 hover:text-primary-800">Open</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-neutral-400">
                No jobs matching "{filter.toLowerCase()}"
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobsPage;
