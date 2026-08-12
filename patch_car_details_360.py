import sys
import re

with open('src/components/CarDetails.tsx', 'r') as f:
    text = f.read()

# I need to add state for active360ViewType
old_state = """  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [userManuallySelected, setUserManuallySelected] = useState(false);"""

new_state = """  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [userManuallySelected, setUserManuallySelected] = useState(false);
  const [active360ViewType, setActive360ViewType] = useState<'exterior' | 'interior'>('exterior');"""

text = text.replace(old_state, new_state)

# I need to set initial active360ViewType
old_effect = """  // Auto select logic
  useEffect(() => {
    if (!loading360 && !userManuallySelected) {
      if (has360) {
        setSelectedMediaId('vehicle-360');
      } else if (car.images.length > 0) {
        setSelectedMediaId(car.images[0]);
      }
    }
  }, [loading360, has360, car.images, userManuallySelected]);"""

new_effect = """  // Auto select logic
  useEffect(() => {
    if (!loading360 && !userManuallySelected) {
      if (has360) {
        setSelectedMediaId('vehicle-360');
        setActive360ViewType(hasExterior ? 'exterior' : 'interior');
      } else if (car.images.length > 0) {
        setSelectedMediaId(car.images[0]);
      }
    }
  }, [loading360, has360, hasExterior, car.images, userManuallySelected]);"""

text = text.replace(old_effect, new_effect)

# Render ClientPoiPanel with buttons
old_render = """                {currentItem?.type === '360' ? (
                  <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                  >
                    <ClientPoiPanel vehicleId={car.id} viewType={(currentItem as any).viewType} embedded={true} />
                  </motion.div>
                ) : ("""

new_render = """                {currentItem?.type === '360' ? (
                  <motion.div
                    key={`${currentItem.id}-${active360ViewType}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-10"
                  >
                    <ClientPoiPanel vehicleId={car.id} viewType={active360ViewType} embedded={true} />
                    {hasExterior && hasInterior && (
                      <div className="absolute top-4 right-4 z-50 flex bg-black/50 p-1 rounded-lg backdrop-blur">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActive360ViewType('exterior'); }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${active360ViewType === 'exterior' ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                        >
                          Externo
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActive360ViewType('interior'); }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${active360ViewType === 'interior' ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                        >
                          Interno
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : ("""

text = text.replace(old_render, new_render)

# Remove the Hover overlay prompt when showing 360
old_hover = """              {/* Hover overlay prompt */}
              <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 text-white font-bold text-xs border border-slate-700/60 shadow-2xl">
                  <Maximize2 className="w-4 h-4 text-red-500" />
                  <span>Clique para ampliar em Tela Cheia</span>
                </div>
              </div>"""

new_hover = """              {/* Hover overlay prompt */}
              {currentItem?.type === 'image' && (
                <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 text-white font-bold text-xs border border-slate-700/60 shadow-2xl">
                    <Maximize2 className="w-4 h-4 text-red-500" />
                    <span>Clique para ampliar em Tela Cheia</span>
                  </div>
                </div>
              )}"""

text = text.replace(old_hover, new_hover)


with open('src/components/CarDetails.tsx', 'w') as f:
    f.write(text)

