import sys
import re

with open('src/components/CarDetails.tsx', 'r') as f:
    text = f.read()

# Replace activeImage state and galleryItems
old_active_image = """  const [activeImage, setActiveImage] = useState(car.images[0] || '');
  const galleryItems = [
    ...(exterior360.project?.status === 'completed' && exterior360.totalFrames > 0 ? [{ id: '360-exterior', type: '360', viewType: 'exterior' as const, label: '360° Externo', thumb: exterior360.project.frames![0].imageUrl }] : []),
    ...(interior360.project?.status === 'completed' && interior360.totalFrames > 0 ? [{ id: '360-interior', type: '360', viewType: 'interior' as const, label: '360° Interno', thumb: interior360.project.frames![0].imageUrl }] : []),
    ...car.images.map((img, idx) => ({ id: img, type: 'image', url: img, thumb: img }))
  ];
  const currentItem = galleryItems.find(item => item.id === activeImage) || galleryItems[0];"""

new_active_image = """  type VehicleMediaItem = 
    | { id: 'vehicle-360'; type: '360'; thumbnail: string }
    | { id: string; type: 'image'; url: string; thumbnail: string; imageIndex: number };

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [userManuallySelected, setUserManuallySelected] = useState(false);

  const hasExterior = exterior360.project?.status === 'completed' && exterior360.totalFrames > 0;
  const hasInterior = interior360.project?.status === 'completed' && interior360.totalFrames > 0;
  const has360 = hasExterior || hasInterior;
  const loading360 = exterior360.loading || interior360.loading;

  const galleryItems: VehicleMediaItem[] = [];
  if (has360) {
    galleryItems.push({
      id: 'vehicle-360',
      type: '360',
      thumbnail: hasExterior ? exterior360.project!.frames![0].imageUrl : interior360.project!.frames![0].imageUrl
    });
  }
  car.images.forEach((url, idx) => {
    galleryItems.push({
      id: url,
      type: 'image',
      url,
      thumbnail: url,
      imageIndex: idx
    });
  });

  const currentItem = galleryItems.find(item => item.id === selectedMediaId) || galleryItems[0];

  // Auto select logic
  useEffect(() => {
    if (!loading360 && !userManuallySelected) {
      if (has360) {
        setSelectedMediaId('vehicle-360');
      } else if (car.images.length > 0) {
        setSelectedMediaId(car.images[0]);
      }
    }
  }, [loading360, has360, car.images, userManuallySelected]);

  // Reset manual selection when car changes
  useEffect(() => {
    setUserManuallySelected(false);
    setSelectedMediaId(null);
  }, [car.id]);"""

text = text.replace(old_active_image, new_active_image)

with open('src/components/CarDetails.tsx', 'w') as f:
    f.write(text)

