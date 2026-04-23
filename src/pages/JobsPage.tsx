import { useEffect, useState } from "react";
import { cn } from "@/utils/formatters";
import { SidebarNav } from "@/components/common/SidebarNav";
import { jobService, type Job } from "@/modules/ai/services/jobService";
import { Loader2 } from "lucide-react";

type StatusKey = "running" | "queued" | "succeeded" | "failed" | "cancelled";

const FILTERS = ["All", "Running", "Queued", "Succeeded", "Failed"] as const;

const STATUS_STYLES: Record<string, string> = {
  running: "bg-primary-100 text-primary-700",
  queued: "bg-neutral-100 text-neutral-600",
  succeeded: "bg-primary-100 text-primary-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-100 text-neutral-500",
};

function formatDuration(job: Job): string {
  // Backend sets started_at = finished_at = now() at persistence time,
  // so use created_at → updated_at as the wall-clock approximation
  const start = new Date(job.created_at).getTime();
  const end = job.updated_at ? new Date(job.updated_at).getTime() : Date.now();
  const diff = Math.max(0, end - start);
  if (diff < 1000) return job.status === "running" || job.status === "queued" ? "running..." : "--";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem.toString().padStart(2, "0")}s`;
}

function progressForStatus(status: string): number {
  if (status === "succeeded") return 100;
  if (status === "failed" || status === "cancelled") return 100;
  if (status === "running") return 50;
  return 0;
}

const JobsPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await jobService.getJobs();
      setJobs(data);
      setLoading(false);
    })();
  }, []);

  const filtered =
    filter === "All"
      ? jobs
      : jobs.filter((j) => j.status === filter.toLowerCase());

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
                      ? "bg-neutral-800 text-white border-neutral-800"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <div className="w-full">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-[80px_1.5fr_1fr_100px_1.5fr_100px] gap-4 px-4 pb-2 border-b border-neutral-200">
                {["ID", "Prompt", "Format", "Status", "Duration", "Actions"].map((col) => (
                  <span key={col} className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">
                    {col}
                  </span>
                ))}
              </div>

              {/* Desktop rows */}
              {filtered.map((job) => {
                const status = job.status as StatusKey;
                const duration = formatDuration(job);
                const progress = progressForStatus(status);

                return (
                  <div
                    key={job.id}
                    className="hidden md:grid grid-cols-[80px_1.5fr_1fr_100px_1.5fr_100px] gap-4 px-4 py-3 border-b border-dashed border-neutral-200 items-center"
                  >
                    <span className="font-mono text-xs text-neutral-400 truncate" title={job.id}>
                      {job.id.slice(0, 8)}
                    </span>
                    <span className="font-medium text-neutral-800 text-sm truncate">
                      {job.prompt || "—"}
                    </span>
                    <span className="font-mono text-xs text-neutral-600">
                      {job.output_format || "—"}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full w-fit",
                        STATUS_STYLES[status] || "bg-neutral-100 text-neutral-600"
                      )}
                    >
                      {status}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            status === "failed" ? "bg-red-400" : "bg-primary-500"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-neutral-400 whitespace-nowrap">{duration}</span>
                    </div>
                    <div className="flex gap-2">
                      {status === "failed" && job.error && (
                        <span className="text-xs text-red-500 truncate" title={job.error}>error</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 mt-2">
                {filtered.map((job) => {
                  const status = job.status as StatusKey;
                  const duration = formatDuration(job);
                  const progress = progressForStatus(status);

                  return (
                    <div key={job.id} className="bg-white border border-neutral-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-neutral-400">{job.id.slice(0, 8)}</span>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[status] || "bg-neutral-100")}>
                          {status}
                        </span>
                      </div>
                      <p className="font-medium text-neutral-800 text-sm truncate">{job.prompt || "—"}</p>
                      <p className="font-mono text-xs text-neutral-600">{job.output_format || "—"}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", status === "failed" ? "bg-red-400" : "bg-primary-500")}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-neutral-400 whitespace-nowrap">{duration}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="py-12 text-center text-sm text-neutral-400">
                  {jobs.length === 0 ? "No jobs yet. Generate a model to see jobs here." : `No jobs matching "${filter.toLowerCase()}"`}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default JobsPage;
