import sys

with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

old_thumb = """                  return (
                     <button 
                       key={f.id}
                       onClick={() => setCurrentFrame(idx)}
                       className={`relative h-12 sm:h-16 aspect-video shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === currentFrame ? 'ring-2 ring-white scale-105 z-10' : 'hover:border-gray-500'} ${frameClasses}`}
                     >
                       <img src={f.imageUrl} alt="" className="w-full h-full object-cover" />
                       <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-br font-mono">{idx + 1}</div>
                       {indicator}
                     </button>
                   );"""

new_thumb = """                  return (
                     <div 
                       key={f.id}
                       className={`relative group h-12 sm:h-16 aspect-video shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === currentFrame ? 'ring-2 ring-white scale-105 z-10' : 'hover:border-gray-500'} ${frameClasses}`}
                     >
                       <button onClick={() => setCurrentFrame(idx)} className="w-full h-full focus:outline-none">
                         <img src={f.imageUrl} alt="" className="w-full h-full object-cover" />
                       </button>
                       <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-br font-mono pointer-events-none">{idx + 1}</div>
                       {indicator}
                       
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (project.frames && project.frames.length <= 1) {
                             alert("Não é possível excluir o último frame.");
                             return;
                           }
                           if (window.confirm(`Excluir o frame ${idx + 1}? Os rastreamentos serão renumerados. Ação irreversível.`)) {
                             removeFrame(f);
                           }
                         }}
                         className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 focus:opacity-100"
                         title="Excluir frame"
                       >
                         <Trash2 size={10} />
                       </button>
                     </div>
                   );"""

text = text.replace(old_thumb, new_thumb)

with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)
