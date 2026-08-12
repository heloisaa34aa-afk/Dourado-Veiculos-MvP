import sys
with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

old_header = """        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CarIcon size={20} className="text-indigo-600" />
                {car.brand} {car.model}
              </h1>
              <div className="text-xs font-medium text-gray-500">{car.plateEnd} • {totalFrames} frames</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
               {project.status === 'completed' ? 'Publicado' : 'Rascunho'}
             </div>
          </div>
        </div>"""

new_header = """        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0 overflow-x-auto">
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CarIcon size={20} className="text-indigo-600" />
                {car.brand} {car.model}
              </h1>
              <div className="text-xs font-medium text-gray-500">Editando visão {viewType === 'exterior' ? 'externa' : 'interna'} • {car.plateEnd} • {totalFrames} frames</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg shrink-0 mx-4">
            <button
              onClick={() => onViewTypeChange('exterior')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewType === 'exterior' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              360° Externo
            </button>
            <button
              onClick={() => onViewTypeChange('interior')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewType === 'interior' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              360° Interno
            </button>
          </div>
          <div className="flex items-center gap-3 shrink-0">
             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
               {project.status === 'completed' ? 'Publicado' : 'Rascunho'}
             </div>
          </div>
        </div>"""

text = text.replace(old_header, new_header)

with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)

