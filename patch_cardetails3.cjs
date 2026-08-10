const fs = require('fs');
let code = fs.readFileSync('src/components/CarDetails.tsx', 'utf8');

code = code.replace(
  "const [activeImage, setActiveImage] = useState(car.images[0] || '');",
  "const [activeImage, setActiveImage] = useState(car.images[0] || '');\n  const galleryItems = [\n    ...(exterior360.project?.status === 'completed' && exterior360.totalFrames > 0 ? [{ id: '360-exterior', type: '360', viewType: 'exterior' as const, label: '360° Externo', thumb: exterior360.project.frames![0].imageUrl }] : []),\n    ...(interior360.project?.status === 'completed' && interior360.totalFrames > 0 ? [{ id: '360-interior', type: '360', viewType: 'interior' as const, label: '360° Interno', thumb: interior360.project.frames![0].imageUrl }] : []),\n    ...car.images.map((img, idx) => ({ id: img, type: 'image', url: img, thumb: img }))\n  ];\n  const currentItem = galleryItems.find(item => item.id === activeImage) || galleryItems[0];"
);

// We need to fix the old map if it wasn't replaced properly.
code = code.replace(
  "{car.images.map((img, idx) => (",
  "{galleryItems.map((item, idx) => ("
);
code = code.replace(
  "setGalleryLightboxIndex(idx);\n                      setActiveImage(img);",
  "if (item.type === 'image') { setGalleryLightboxIndex(car.images.indexOf(item.url!)); }\n                      setActiveImage(item.id);"
);
code = code.replace(
  "galleryLightboxIndex === idx ? 'border-red-500 scale-105 shadow-lg ring-2 ring-red-500/50' : 'border-slate-800 opacity-60 hover:opacity-100'",
  "activeImage === item.id || (!activeImage && idx === 0) ? 'border-red-500 scale-105 shadow-lg ring-2 ring-red-500/50' : 'border-slate-800 opacity-60 hover:opacity-100'"
);
code = code.replace(
  "<img src={img} alt={`Thumb ${idx + 1}`} className=\"w-full h-full object-cover\" referrerPolicy=\"no-referrer\" />",
  "<img src={item.thumb} alt={`Thumb ${idx + 1}`} className=\"w-full h-full object-cover\" referrerPolicy=\"no-referrer\" />\n                    {item.type === '360' && <div className=\"absolute inset-0 flex items-center justify-center bg-black/30\"><RotateCcw className=\"w-5 h-5 text-white\" /></div>}"
);


fs.writeFileSync('src/components/CarDetails.tsx', code);
