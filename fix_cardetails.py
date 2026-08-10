import sys

with open('src/components/CarDetails.tsx', 'r') as f:
    text = f.read()

text = text.replace("currentItem.viewType!", "(currentItem as any).viewType")
text = text.replace("currentItem?.url", "(currentItem as any)?.url")
text = text.replace("item.url!", "(item as any).url")

# For the remaining `img` errors, there's another `onClick` that uses `img`.
# Let's just fix it globally for the small thumbnails.
text = text.replace("setActiveImage(img);", "if (item.type === 'image') { setGalleryLightboxIndex(car.images.indexOf((item as any).url!)); } setActiveImage(item.id);")
text = text.replace("<img src={img} alt={`Thumb ${idx + 1}`}", "<img src={item.thumb} alt={`Thumb ${idx + 1}`}")

with open('src/components/CarDetails.tsx', 'w') as f:
    f.write(text)

