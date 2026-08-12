import sys
import re

with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

# Add to the footer
old_footer = """        <div className="p-4 border-t border-gray-200 bg-white shrink-0">
          <button onClick={() => setMode('checklist')} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 shadow-sm transition-transform active:scale-95">
             <CheckCircle2 size={18} /> Resumo e Publicação
          </button>
        </div>"""

new_footer = """        <div className="p-4 border-t border-gray-200 bg-white shrink-0 space-y-2">
          <button onClick={() => {
            if (totalFrames <= 1) {
              alert("Não é possível excluir o último frame.");
              return;
            }
            if (window.confirm(`Excluir o frame ${currentFrame + 1}? Os frames seguintes e os rastreamentos serão renumerados. Esta ação não poderá ser desfeita.`)) {
              if (currentFrameData) removeFrame(currentFrameData);
            }
          }} className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 shadow-sm transition-colors text-sm">
             <Trash2 size={16} /> Excluir frame atual
          </button>
          
          <button onClick={() => setMode('upload')} className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 shadow-sm transition-colors text-sm">
             <UploadCloud size={16} /> Adicionar/Substituir Imagens
          </button>

          <button onClick={() => setMode('checklist')} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 shadow-sm transition-transform active:scale-95 mt-2">
             <CheckCircle2 size={18} /> Resumo e Publicação
          </button>
        </div>"""

text = text.replace(old_footer, new_footer)

# Now I need to add mode === 'upload' handler in renderRightPanel
old_mode = """    if (mode === 'checklist') {"""
new_mode = """    if (mode === 'upload') {
      return (
        <div className="p-6 h-full flex flex-col overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-900">Upload de Imagens</h3>
             <button onClick={() => setMode('idle')} className="text-gray-400 hover:text-gray-700"><X size={20}/></button>
          </div>
          <FrameUploader viewType={viewType} currentFrameCount={totalFrames} onUpload={async (files, m) => { await uploadFrames(files, m); setMode('idle'); }} uploading={uploading} progress={uploadProgress} />
        </div>
      );
    }
    
    if (mode === 'checklist') {"""
text = text.replace(old_mode, new_mode)


# Change mode type
text = text.replace("'idle' | 'add_poi_pick' | 'add_damage_pick' | 'form' | 'tracking' | 'review' | 'manual_adjust' | 'checklist'", "'idle' | 'add_poi_pick' | 'add_damage_pick' | 'form' | 'tracking' | 'review' | 'manual_adjust' | 'checklist' | 'upload'")

with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)
