import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { cn } from "@/utils/formatters";

const MOCK_DETAIL = {
  id: "quad-frame-160",
  name: "quad-frame-160",
  component_of: "drone-v3",
  breadcrumb: ["assets", "drone", "quad-frame-160"],
  formats: [".glb", ".stl"],
  metadata: {
    part_name: "quad-frame-160",
    component_of: "drone-v3",
    position: "[0, 0, 0]",
    "tris / verts": "4,218 / 2,112",
    bbox: "160 x 160 x 22 mm",
    volume: "18.4 cm\u00B3",
    created: "2026-04-07",
    job_id: "j_8f2a",
  },
  tags: ["structural", "fpv", "5-inch", "carbon-fiber"],
  parts: [
    { id: "arm-fl", name: "arm-front-left" },
    { id: "arm-fr", name: "arm-front-right" },
    { id: "arm-rl", name: "arm-rear-left" },
    { id: "arm-rr", name: "arm-rear-right" },
    { id: "center-plate", name: "center-plate" },
  ],
  scadPreview: `module quad_frame(size=160) {
  difference() {
    hull() {
      for (a=[45,135,225,315])
        rotate([0,0,a])
          translate([size/2,0,0])
            cylinder(h=4, r=8);
    }
    // motor mounts
    for (a=[45,135,225,315])
      rotate([0,0,a])
        translate([size/2,0,-1])
          cylinder(h=6, r=5.5);
  }
}`,
};

const TABS = ["Mesh", "SCAD Source", "Parameters"] as const;

const AssetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Mesh");

  // In a real app you'd fetch by id; for now use mock
  const asset = { ...MOCK_DETAIL, id: id || MOCK_DETAIL.id };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header bar */}
      <header className="px-4 md:px-6 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        {/* Breadcrumb */}
        <nav className="text-sm">
          {asset.breadcrumb.map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span className="text-neutral-300 mx-1.5">/</span>}
              {i < asset.breadcrumb.length - 1 ? (
                <Link to={i === 0 ? "/assets" : "#"} className="text-neutral-500 hover:text-neutral-800">
                  {crumb}
                </Link>
              ) : (
                <span className="text-neutral-800 font-medium">{crumb}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {asset.formats.map((f) => (
            <span key={f} className="px-2 py-0.5 text-[11px] font-mono border border-neutral-200 rounded-full text-neutral-500">
              {f}
            </span>
          ))}
          <button className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors">
            Download STL
          </button>
          <button className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors">
            Download GLB
          </button>
          <Link
            to="/home"
            className="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Remix in chat &rarr;
          </Link>
        </div>
      </header>

      {/* Main 2-col layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] overflow-hidden">
        {/* Left — viewer area */}
        <div className="flex flex-col border-r border-neutral-200">
          {/* Tabs */}
          <div className="flex gap-6 px-6 pt-4 border-b border-neutral-100">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-3 text-sm transition-colors",
                  activeTab === tab
                    ? "border-b-2 border-primary-500 font-semibold text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Viewport */}
          <div className="flex-1 relative m-4 bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden">
            {/* Dot grid background */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Centered placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-mono text-neutral-300">3D Viewer</span>
            </div>

            {/* SCAD peek box */}
            <div className="absolute bottom-4 left-4 bg-white border border-neutral-200 p-3 rounded-lg max-w-[280px] shadow-sm">
              <pre className="font-mono text-xs text-neutral-600 whitespace-pre-wrap leading-relaxed overflow-hidden max-h-24">
                {asset.scadPreview}
              </pre>
            </div>
          </div>
        </div>

        {/* Right — metadata */}
        <div className="overflow-y-auto p-6">
          {/* Metadata */}
          <section className="mb-8">
            <h3 className="font-mono uppercase text-xs text-neutral-400 tracking-wider mb-3">Metadata</h3>
            <div className="space-y-0">
              {Object.entries(asset.metadata).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 py-2 border-b border-dashed border-neutral-100">
                  <span className="text-xs font-mono text-neutral-400">{key}</span>
                  <span className="text-xs text-neutral-700">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tags */}
          <section className="mb-8">
            <h3 className="font-mono uppercase text-xs text-neutral-400 tracking-wider mb-3">Used for</h3>
            <div className="flex flex-wrap gap-2">
              {asset.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-mono bg-neutral-100 text-neutral-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* Parts */}
          <section>
            <h3 className="font-mono uppercase text-xs text-neutral-400 tracking-wider mb-3">Parts</h3>
            <ul className="space-y-1.5">
              {asset.parts.map((part) => (
                <li key={part.id}>
                  <Link
                    to={`/assets/${part.id}`}
                    className="text-sm font-mono text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    {part.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailPage;
