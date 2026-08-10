const fs = require('fs');
let code = fs.readFileSync('src/components/CarDetails.tsx', 'utf8');

// The main view is controlled by activeImage. Let's make it more generic: activeView: string
// Initial state: const [activeImage, setActiveImage] = useState<string | null>(null);
// We'll replace it with activeView, and we'll compute galleryItems

code = code.replace(
  "const [activeImage, setActiveImage] = useState<string | null>(null);",
  "const [activeImage, setActiveImage] = useState<string | null>(null);\n  const galleryItems = [\n    ...(exterior360.project?.status === 'completed' && exterior360.totalFrames > 0 ? [{ id: '360-exterior', type: '360', viewType: 'exterior' as const, label: '360° Externo', thumb: exterior360.project.frames![0].imageUrl }] : []),\n    ...(interior360.project?.status === 'completed' && interior360.totalFrames > 0 ? [{ id: '360-interior', type: '360', viewType: 'interior' as const, label: '360° Interno', thumb: interior360.project.frames![0].imageUrl }] : []),\n    ...car.images.map((img, idx) => ({ id: `img-${idx}`, type: 'image', url: img, thumb: img }))\n  ];\n  const currentItem = galleryItems.find(item => item.id === activeImage) || galleryItems[0];"
);

// Update thumbnail strip
code = code.replace(
  "{car.images.map((img, idx) => (",
  "{galleryItems.map((item, idx) => ("
);

code = code.replace(
  "onClick={() => {\n                      setGalleryLightboxIndex(idx);\n                      setActiveImage(img);\n                      setGalleryZoom(1);\n                      setGalleryPan({ x: 0, y: 0 });\n                    }}",
  "onClick={() => {\n                      if (item.type === 'image') { setGalleryLightboxIndex(car.images.indexOf(item.url!)); }\n                      setActiveImage(item.id);\n                      setGalleryZoom(1);\n                      setGalleryPan({ x: 0, y: 0 });\n                    }}"
);

code = code.replace(
  "className={`relative w-16 sm:w-20 aspect-video rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${",
  "className={`relative w-16 sm:w-20 aspect-video rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${"
);

code = code.replace(
  "galleryLightboxIndex === idx ? 'border-red-500 scale-105 shadow-lg ring-2 ring-red-500/50' : 'border-slate-800 opacity-60 hover:opacity-100'",
  "activeImage === item.id || (!activeImage && idx === 0) ? 'border-red-500 scale-105 shadow-lg ring-2 ring-red-500/50' : 'border-slate-800 opacity-60 hover:opacity-100'"
);

code = code.replace(
  "<img src={img} alt={`Thumb ${idx + 1}`} className=\"w-full h-full object-cover\" referrerPolicy=\"no-referrer\" />",
  "<img src={item.thumb} alt={`Thumb ${idx + 1}`} className=\"w-full h-full object-cover\" referrerPolicy=\"no-referrer\" />\n                    {item.type === '360' && <div className=\"absolute inset-0 flex items-center justify-center bg-black/30\"><RotateCcw className=\"w-5 h-5 text-white\" /></div>}"
);

// Replace main stage rendering
const mainStageBlock = `<AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={activeImage || car.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'}
                  alt={car.model}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>`;

const newMainStageBlock = `
              <AnimatePresence mode="wait">
                {currentItem?.type === '360' ? (
                  <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                  >
                    <ClientPoiPanel vehicleId={car.id} viewType={currentItem.viewType!} embedded={true} />
                  </motion.div>
                ) : (
                  <motion.img
                    key={currentItem?.id || 'default'}
                    src={currentItem?.url || car.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'}
                    alt={car.model}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    referrerPolicy="no-referrer"
                  />
                )}
              </AnimatePresence>
`;
code = code.replace(mainStageBlock, newMainStageBlock);

// Remove the separate ClientPoiPanel block
const oldPoiPanel = `{/* VISUALIZAÇÃO 360 */}
        <section className="mb-20">
          <ClientPoiPanel vehicleId={car.id} />
        </section>`;
code = code.replace(oldPoiPanel, "");

// Modify ClientPoiPanel to support viewType prop
code = code.replace(
  "<ClientPoiPanel vehicleId={car.id} viewType={currentItem.viewType!} embedded={true} />",
  "<ClientPoiPanel vehicleId={car.id} viewType={currentItem.viewType!} embedded={true} />"
);

fs.writeFileSync('src/components/CarDetails.tsx', code);
