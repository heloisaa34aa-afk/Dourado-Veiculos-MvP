import sys
import re

with open('src/components/CarDetails.tsx', 'r') as f:
    text = f.read()

old_div = """            {/* Primary Display image with Fullscreen Lightbox trigger */}
            <div 
              onClick={() => {
                const idx = car.images.indexOf(activeImage);
                setGalleryLightboxIndex(idx >= 0 ? idx : 0);
                setGalleryZoom(1);
                setGalleryPan({ x: 0, y: 0 });
              }}
              className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 shadow-md aspect-video relative flex items-center justify-center cursor-pointer group select-none"
            >"""

new_div = """            {/* Primary Display image with Fullscreen Lightbox trigger */}
            <div 
              onClick={() => {
                if (currentItem?.type === 'image') {
                  const idx = currentItem.imageIndex;
                  setGalleryLightboxIndex(idx >= 0 ? idx : 0);
                  setGalleryZoom(1);
                  setGalleryPan({ x: 0, y: 0 });
                }
              }}
              className={`bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 shadow-md aspect-video relative flex items-center justify-center select-none ${currentItem?.type === 'image' ? 'cursor-pointer group' : ''}`}
            >"""

text = text.replace(old_div, new_div)
text = text.replace("car.images.indexOf(activeImage)", "currentItem?.type === 'image' ? currentItem.imageIndex : 0")

with open('src/components/CarDetails.tsx', 'w') as f:
    f.write(text)

