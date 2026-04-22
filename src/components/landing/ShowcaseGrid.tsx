const features = [
  { title: "Text to CAD", desc: "Describe a shape in plain English. Get parametric OpenSCAD back.", tag: "OpenSCAD" },
  { title: "Image to 3D", desc: "Upload a photo or search for one. AI generates a mesh you can remix.", tag: "Hunyuan3D" },
  { title: "AI Chat", desc: "Refine designs conversationally. Adjust dimensions, add features, iterate.", tag: "Iterative" },
  { title: "Part Segmentation", desc: "Models are split into named, printable components automatically.", tag: "CoACD" },
  { title: "3D Viewer", desc: "Inspect models with orbit controls, part selection, and STL/GLB export.", tag: "Three.js" },
  { title: "Optimization", desc: "Genetic algorithms optimize parameters for strength, weight, or fit.", tag: "RunPod" },
];

export const ShowcaseGrid = () => {
  return (
    <section className="py-20 bg-neutral-50 border-t border-neutral-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-800 mb-3">
            What you can build
          </h2>
          <p className="text-neutral-500 text-sm max-w-lg mx-auto">
            Generate geometry, simulate physics, and iterate — all in one workspace.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, i) => (
            <div
              key={i}
              className="group bg-white border border-neutral-200 rounded-xl p-6 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-base font-semibold text-neutral-800 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed mb-4">
                {item.desc}
              </p>
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary-600 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded">
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
