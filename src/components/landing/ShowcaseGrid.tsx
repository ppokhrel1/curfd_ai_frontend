const features = [
  { title: "Text to CAD", desc: "Describe a shape in plain English. Get parametric OpenSCAD or CadQuery back.", tag: "OpenSCAD · CadQuery" },
  { title: "Image to 3D", desc: "Pick a reference from search, upload your own, or generate one with AI — then turn it into a mesh.", tag: "Hunyuan3D" },
  { title: "AI image generation", desc: "No reference handy? Describe the image you want and the picker makes it for you, edit-and-iterate inline.", tag: "Gemini" },
  { title: "Auto part-split", desc: "Every generated mesh is decomposed into named components. Print parts individually instead of one big lump.", tag: "P3-SAM" },
  { title: "Texture + colour", desc: "Optional UV-mapped textures so the printed parts match the reference, not a grey blob.", tag: "Hunyuan-Paint" },
  { title: "Slicer-ready output", desc: "Watertight STL or GLB per part. Drag straight into your slicer or printer host.", tag: "STL · GLB" },
];

export const ShowcaseGrid = () => {
  return (
    <section className="py-20 bg-neutral-50 border-t border-neutral-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-800 mb-3">
            From a sentence to printable parts
          </h2>
          <p className="text-neutral-500 text-sm max-w-lg mx-auto">
            Generate, segment, texture, and ship — every step lives in one chat-driven workspace.
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
