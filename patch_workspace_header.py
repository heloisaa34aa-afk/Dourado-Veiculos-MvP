import sys
with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

# Replace the header title
old_title = """              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CarIcon size={20} className="text-indigo-600" />"""
new_title = """              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CarIcon size={20} className="text-indigo-600" />
                {car.brand} {car.model}
              </h1>
              <p className="text-sm text-gray-500">Editando visão {viewType === 'exterior' ? 'externa' : 'interna'}</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => onViewTypeChange('exterior')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewType === 'exterior' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              360° Externo
            </button>
            <button
              onClick={() => onViewTypeChange('interior')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewType === 'interior' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              360° Interno
            </button>
          </div>
          <div className="hidden sm:block">
            {/* placeholder for balancing flex-between */}
          </div>"""

# I need to be careful with what I replace
