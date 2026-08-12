import sys

with open('src/components/CarDetails.tsx', 'r') as f:
    text = f.read()

# Replace first map
old_map1 = """                    onClick={() => {
                      if (item.type === 'image') { setGalleryLightboxIndex(car.images.indexOf((item as any).url!)); } setActiveImage(item.id);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 group ${
                      activeImage === item.id ? 'border-red-600 shadow-md ring-2 ring-red-600/30' : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}"""

new_map1 = """                    onClick={() => {
                      setSelectedMediaId(item.id);
                      setUserManuallySelected(true);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 group ${
                      selectedMediaId === item.id ? 'border-red-600 shadow-md ring-2 ring-red-600/30' : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}"""

text = text.replace(old_map1, new_map1)

# Replace second map
old_map2 = """                    onClick={() => {
                      if (item.type === 'image') { setGalleryLightboxIndex(car.images.indexOf((item as any).url)); }
                      setActiveImage(item.id);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-16 sm:w-20 aspect-video rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImage === item.id || (!activeImage && idx === 0) ? 'border-red-500 scale-105 shadow-lg ring-2 ring-red-500/50' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}"""

new_map2 = """                    onClick={() => {
                      setSelectedMediaId(item.id);
                      setUserManuallySelected(true);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-16 sm:w-20 aspect-video rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      selectedMediaId === item.id || (!selectedMediaId && idx === 0) ? 'border-red-500 scale-105 shadow-lg ring-2 ring-red-500/50' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}"""

text = text.replace(old_map2, new_map2)

with open('src/components/CarDetails.tsx', 'w') as f:
    f.write(text)

