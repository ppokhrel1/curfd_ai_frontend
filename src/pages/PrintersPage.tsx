import { useState } from "react";
import { SidebarNav } from "@/components/common/SidebarNav";
import { cn } from "@/utils/formatters";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PrinterStatus = "printing" | "idle" | "paused" | "offline";

interface Printer {
  id: string;
  name: string;
  driver: string;
  status: PrinterStatus;
  job?: string;
  progress?: number;
  nozzleTemp?: string;
  bedTemp?: string;
  filament?: string;
}

interface QueueJob {
  num: number;
  job: string;
  printer: string;
  state: "printing" | "queued" | "paused" | "done" | "failed";
  eta: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const PRINTERS: Printer[] = [
  {
    id: "1",
    name: "Prusa MK4",
    driver: "PrusaLink 2.1",
    status: "printing",
    job: "bracket-v3.gcode",
    progress: 62,
    nozzleTemp: "215 / 215 °C",
    bedTemp: "60 / 60 °C",
    filament: "PLA · 42 g left",
  },
  {
    id: "2",
    name: "Bambu X1C",
    driver: "Bambu Cloud",
    status: "idle",
    nozzleTemp: "24 °C",
    bedTemp: "23 °C",
    filament: "PETG · 780 g",
  },
  {
    id: "3",
    name: "Ender 3 Klipper",
    driver: "Moonraker / Klipper",
    status: "paused",
    job: "mount-plate.gcode",
    progress: 38,
    nozzleTemp: "200 / 200 °C",
    bedTemp: "55 / 60 °C",
    filament: "PLA · 310 g",
  },
  {
    id: "4",
    name: "Voron 2.4",
    driver: "Klipper USB",
    status: "offline",
    nozzleTemp: "— °C",
    bedTemp: "— °C",
    filament: "ABS · 0 g",
  },
];

const QUEUE_JOBS: QueueJob[] = [
  { num: 1, job: "bracket-v3.gcode", printer: "Prusa MK4", state: "printing", eta: "1 h 12 m" },
  { num: 2, job: "mount-plate.gcode", printer: "Ender 3 Klipper", state: "paused", eta: "2 h 05 m" },
  { num: 3, job: "enclosure-lid.gcode", printer: "Bambu X1C", state: "queued", eta: "45 m" },
  { num: 4, job: "hinge-left.gcode", printer: "—", state: "queued", eta: "20 m" },
  { num: 5, job: "fan-duct-v2.gcode", printer: "—", state: "failed", eta: "—" },
];

const FILAMENT_INVENTORY = [
  { name: "PLA Black", pct: 68 },
  { name: "PETG Clear", pct: 91 },
  { name: "TPU 95A", pct: 22 },
  { name: "ABS White", pct: 0 },
];

/* ------------------------------------------------------------------ */
/*  Status chip                                                        */
/* ------------------------------------------------------------------ */

const statusColors: Record<string, string> = {
  printing: "bg-primary-50 text-primary-700 border-primary-200",
  idle: "bg-neutral-50 text-neutral-600 border-neutral-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  offline: "bg-red-50 text-red-500 border-red-200",
  queued: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-primary-50 text-primary-700 border-primary-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

const StatusChip = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border capitalize",
      statusColors[status] ?? "bg-neutral-50 text-neutral-500 border-neutral-200"
    )}
  >
    {status}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

type Tab = "fleet" | "slice" | "queue";

const TABS: { key: Tab; label: string }[] = [
  { key: "fleet", label: "Fleet" },
  { key: "slice", label: "Slice & Send" },
  { key: "queue", label: "Print Queue" },
];

/* ------------------------------------------------------------------ */
/*  Fleet Dashboard                                                    */
/* ------------------------------------------------------------------ */

const PrinterCard = ({ p }: { p: Printer }) => (
  <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
    {/* Header */}
    <div className="flex items-center gap-3">
      <div className="w-[34px] h-[34px] bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 text-xs shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="2" width="12" height="8" rx="1" />
          <rect x="4" y="10" width="16" height="10" rx="1" />
          <line x1="8" y1="14" x2="16" y2="14" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">{p.name}</p>
        <p className="text-[11px] text-neutral-400">{p.driver}</p>
      </div>
      <StatusChip status={p.status} />
    </div>

    {/* Progress */}
    {p.job && p.progress !== undefined && (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="truncate max-w-[60%]">{p.job}</span>
          <span className="font-mono">{p.progress}%</span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#e09820] transition-all"
            style={{ width: `${p.progress}%` }}
          />
        </div>
      </div>
    )}

    {/* Telemetry */}
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Nozzle", value: p.nozzleTemp },
        { label: "Bed", value: p.bedTemp },
        { label: "Filament", value: p.filament },
      ].map((t) => (
        <div
          key={t.label}
          className="bg-neutral-50 border border-dashed border-neutral-200 rounded-lg p-2"
        >
          <p className="text-[10px] text-neutral-400 mb-0.5">{t.label}</p>
          <p className="text-xs font-mono text-neutral-700 truncate">{t.value ?? "—"}</p>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 pt-1">
      {p.status === "printing" && (
        <>
          <button className="text-xs px-3 py-1 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
            Pause
          </button>
          <button className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
            Cancel
          </button>
        </>
      )}
      {p.status === "paused" && (
        <>
          <button className="text-xs px-3 py-1 rounded-full border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors">
            Resume
          </button>
          <button className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
            Cancel
          </button>
        </>
      )}
      {p.status === "idle" && (
        <>
          <button className="text-xs px-3 py-1 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
            Send job
          </button>
          <button className="text-xs px-3 py-1 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
            Preheat
          </button>
        </>
      )}
      {p.status === "offline" && (
        <span className="text-[11px] text-neutral-400 italic">Unavailable</span>
      )}
    </div>
  </div>
);

const FleetTab = () => {
  const printingCount = PRINTERS.filter((p) => p.status === "printing").length;
  const connectedCount = PRINTERS.filter((p) => p.status !== "offline").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Printers</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {connectedCount} connected &middot; {printingCount} printing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
            + Add printer
          </button>
          <button className="text-xs px-4 py-1.5 rounded-lg bg-[#e09820] text-white font-medium hover:bg-[#c9891c] transition-colors">
            Send selection
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PRINTERS.map((p) => (
          <PrinterCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Slice & Send                                                       */
/* ------------------------------------------------------------------ */

const SliceTab = () => {
  const [selectedPrinter, setSelectedPrinter] = useState(PRINTERS[1].id);

  return (
    <div className="flex gap-5">
      {/* Left: Printer list */}
      <div className="w-[240px] shrink-0 border border-neutral-200 rounded-xl bg-white p-4 space-y-2 self-start">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
          Select printer
        </p>
        {PRINTERS.filter((p) => p.status !== "offline").map((p) => (
          <label
            key={p.id}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
              selectedPrinter === p.id
                ? "bg-amber-50 border border-[#e09820]/30"
                : "hover:bg-neutral-50"
            )}
          >
            <input
              type="radio"
              name="printer"
              value={p.id}
              checked={selectedPrinter === p.id}
              onChange={() => setSelectedPrinter(p.id)}
              className="accent-[#e09820]"
            />
            <div>
              <p className="text-sm text-neutral-800">{p.name}</p>
              <p className="text-[11px] text-neutral-400">{p.status}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Right: Settings */}
      <div className="flex-1 space-y-5">
        {/* Slicer settings */}
        <div className="border border-neutral-200 rounded-xl bg-white p-4 space-y-4">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Slicer settings
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Profile", value: "0.20mm Quality" },
              { label: "Filament", value: "PLA Generic" },
              { label: "Infill", value: "20%" },
              { label: "Supports", value: "None" },
              { label: "Brim", value: "Auto (3mm)" },
              { label: "Nozzle", value: "0.4mm" },
            ].map((s) => (
              <div key={s.label}>
                <label className="text-[11px] text-neutral-400 block mb-1">{s.label}</label>
                <select className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#e09820]/40">
                  <option>{s.value}</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Gcode preview */}
        <div className="h-36 bg-neutral-100 border border-dashed border-neutral-300 rounded-xl flex items-center justify-center">
          <span className="text-xs font-mono text-neutral-400 tracking-wider">GCODE PREVIEW</span>
        </div>

        {/* Estimates */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Est. time", value: "1 h 42 m" },
            { label: "Filament", value: "38.2 g" },
            { label: "Cost", value: "$0.76" },
          ].map((e) => (
            <div
              key={e.label}
              className="bg-white border border-neutral-200 rounded-xl p-3 text-center"
            >
              <p className="text-[11px] text-neutral-400">{e.label}</p>
              <p className="text-sm font-semibold text-neutral-800 mt-0.5">{e.value}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-[#e09820]" />
              Start immediately
            </label>
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
              <input type="checkbox" className="accent-[#e09820]" />
              Notify when done
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs px-4 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
              Cancel
            </button>
            <button className="text-xs px-5 py-1.5 rounded-lg bg-[#e09820] text-white font-medium hover:bg-[#c9891c] transition-colors">
              Slice &amp; send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Print Queue / Farm                                                 */
/* ------------------------------------------------------------------ */

const QueueTab = () => (
  <div className="space-y-5">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Print Queue</h2>
        <p className="text-xs text-neutral-400 mt-0.5">5 jobs &middot; 2 active</p>
      </div>
      <button className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
        + Add from library
      </button>
    </div>

    <div className="flex gap-5">
      {/* Queue table */}
      <div className="flex-1 border border-neutral-200 rounded-xl bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              <th className="px-4 py-2.5 w-10">#</th>
              <th className="px-4 py-2.5">Job</th>
              <th className="px-4 py-2.5">Printer</th>
              <th className="px-4 py-2.5">State</th>
              <th className="px-4 py-2.5">ETA</th>
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {QUEUE_JOBS.map((j) => (
              <tr
                key={j.num}
                className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors"
              >
                <td className="px-4 py-2.5 text-neutral-400 font-mono text-xs">{j.num}</td>
                <td className="px-4 py-2.5 text-neutral-800 font-medium">{j.job}</td>
                <td className="px-4 py-2.5 text-neutral-500">{j.printer}</td>
                <td className="px-4 py-2.5">
                  <StatusChip status={j.state} />
                </td>
                <td className="px-4 py-2.5 text-neutral-500 font-mono text-xs">{j.eta}</td>
                <td className="px-4 py-2.5 text-neutral-300 cursor-grab">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
                    <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
                    <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right sidebar */}
      <div className="w-[300px] shrink-0 space-y-4">
        {/* Machines */}
        <div className="border border-neutral-200 rounded-xl bg-white p-4 space-y-2.5">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Machines</p>
          {PRINTERS.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  p.status === "printing" && "bg-primary-500",
                  p.status === "idle" && "bg-neutral-300",
                  p.status === "paused" && "bg-amber-400",
                  p.status === "offline" && "bg-red-400"
                )}
              />
              <span className="flex-1 text-neutral-700 truncate">{p.name}</span>
              <span className="text-[11px] text-neutral-400 truncate">{p.filament?.split("·")[0]?.trim() ?? "—"}</span>
            </div>
          ))}
        </div>

        {/* Filament inventory */}
        <div className="border border-neutral-200 rounded-xl bg-white p-4 space-y-3">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Filament Inventory
          </p>
          {FILAMENT_INVENTORY.map((f) => (
            <div key={f.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-700">{f.name}</span>
                <span className="font-mono text-neutral-400">{f.pct}%</span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    f.pct > 50
                      ? "bg-primary-400"
                      : f.pct > 20
                        ? "bg-amber-400"
                        : f.pct > 0
                          ? "bg-red-400"
                          : "bg-neutral-200"
                  )}
                  style={{ width: `${f.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Smart queue note */}
        <div className="border border-dashed border-neutral-200 rounded-xl bg-neutral-50 p-3">
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Smart queue auto-assigns jobs to idle printers with matching filament.
          </p>
        </div>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const PrintersPage = () => {
  const [tab, setTab] = useState<Tab>("fleet");

  return (
    <div className="flex h-screen bg-neutral-50">
      <SidebarNav activePage="printers" />

      <main className="flex-1 overflow-y-auto">
        {/* Tab bar */}
        <div className="border-b border-neutral-200 bg-white px-6">
          <div className="flex items-center gap-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                  tab === t.key
                    ? "border-[#e09820] text-neutral-900"
                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === "fleet" && <FleetTab />}
          {tab === "slice" && <SliceTab />}
          {tab === "queue" && <QueueTab />}
        </div>
      </main>
    </div>
  );
};

export default PrintersPage;
