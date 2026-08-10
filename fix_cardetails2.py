import sys

with open('src/components/CarDetails.tsx', 'r') as f:
    text = f.read()

text = text.replace("activeImage === img ?", "activeImage === item.id ?")
text = text.replace("<img src={img} alt={`Thumb ${idx}`}", "<img src={item.thumb} alt={`Thumb ${idx}`}")

# also there's a setGalleryLightboxIndex(idx) from the old onClick
text = text.replace("setGalleryLightboxIndex(idx);\n                      setGalleryZoom(1);", "setGalleryZoom(1);")

with open('src/components/CarDetails.tsx', 'w') as f:
    f.write(text)

