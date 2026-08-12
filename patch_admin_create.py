import sys
with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

import re

# Remove the useEffect that auto-creates
text = re.sub(
    r"  useEffect\(\(\) => \{\n    if \(\!project && \!loading\) \{.*?\n    \}\n  \}, \[project, loading, vehicleId, reload\]\);\n",
    "",
    text,
    flags=re.DOTALL
)

# Update loading/project check
old_loading = """  if (loading || !project) {
    return <div className="flex items-center justify-center h-[100dvh] bg-gray-50"><Loader2 className="animate-spin text-indigo-500 w-12 h-12" /></div>;
  }"""

new_loading = """  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateProject = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      await vehicle360Service.createProject(vehicleId, viewType);
      await reload();
    } catch (err: any) {
      setCreateError(err.message || "Erro ao criar projeto");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[100dvh] bg-gray-50"><Loader2 className="animate-spin text-indigo-500 w-12 h-12" /></div>;
  }

  // Assuming error is returned by useVehicle360, but if not we can just show empty state
  // We'll just show the create button if no project
  if (!project) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 h-[100dvh]">
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CarIcon size={20} className="text-indigo-600" />
                {car.brand} {car.model}
              </h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nenhum projeto 360° {viewType === 'exterior' ? 'externo' : 'interno'}
          </h2>
          <p className="text-gray-500 mb-6">
            Este veículo ainda não possui uma visão 360° {viewType === 'exterior' ? 'externa' : 'interna'}.
          </p>
          {createError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg max-w-md">
              {createError}
            </div>
          )}
          <button
            onClick={handleCreateProject}
            disabled={isCreating}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            Criar projeto 360 {viewType === 'exterior' ? 'externo' : 'interno'}
          </button>
        </div>
      </div>
    );
  }"""

text = text.replace(old_loading, new_loading)

with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)

