import sys
with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

# Update the render of Vehicle360Workspace
old_render = "return <Vehicle360Workspace vehicleId={selectedVehicleId} car={car!} viewType={selectedViewType} onBack={() => setSelectedVehicleId('')} />;"
new_render = """return (
      <Vehicle360Workspace 
        key={`${selectedVehicleId}:${selectedViewType}`} 
        vehicleId={selectedVehicleId} 
        car={car!} 
        viewType={selectedViewType} 
        onViewTypeChange={setSelectedViewType}
        onBack={() => setSelectedVehicleId('')} 
      />
    );"""

text = text.replace(old_render, new_render)

# Update Vehicle360Workspace signature
old_sig = "function Vehicle360Workspace({ vehicleId, car, viewType, onBack }: { vehicleId: string, car: Car, viewType: 'exterior' | 'interior', onBack: () => void }) {"
new_sig = "function Vehicle360Workspace({ vehicleId, car, viewType, onViewTypeChange, onBack }: { vehicleId: string, car: Car, viewType: 'exterior' | 'interior', onViewTypeChange: (v: 'exterior' | 'interior') => void, onBack: () => void }) {"
text = text.replace(old_sig, new_sig)

with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)
