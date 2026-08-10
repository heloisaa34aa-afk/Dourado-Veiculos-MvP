const fs = require('fs');
let code = fs.readFileSync('src/components/Admin360Module.tsx', 'utf8');

// Inside Admin360Module
// Add state: const [selectedViewType, setSelectedViewType] = useState<'exterior' | 'interior'>('exterior');
code = code.replace(
  "const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');",
  "const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');\n  const [selectedViewType, setSelectedViewType] = useState<'exterior' | 'interior'>('exterior');"
);

code = code.replace(
  "return <Vehicle360Workspace vehicleId={selectedVehicleId} car={car!} onBack={() => setSelectedVehicleId('')} />;",
  "return <Vehicle360Workspace vehicleId={selectedVehicleId} car={car!} viewType={selectedViewType} onBack={() => setSelectedVehicleId('')} />;"
);

// Add the viewType selector to the car selection UI
code = code.replace(
  "</select>\n            </div>",
  "</select>\n            </div>\n            <div>\n              <label className=\"block text-sm font-medium text-gray-700 mb-2\">Tipo de Visão</label>\n              <select \n                value={selectedViewType}\n                onChange={e => setSelectedViewType(e.target.value as 'exterior' | 'interior')}\n                className=\"w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500\"\n              >\n                <option value=\"exterior\">Exterior (360° fora)</option>\n                <option value=\"interior\">Interior (360° dentro)</option>\n              </select>\n            </div>"
);

// Change Vehicle360Workspace signature
code = code.replace(
  "function Vehicle360Workspace({ vehicleId, car, onBack }: { vehicleId: string, car: Car, onBack: () => void }) {",
  "function Vehicle360Workspace({ vehicleId, car, viewType, onBack }: { vehicleId: string, car: Car, viewType: 'exterior' | 'interior', onBack: () => void }) {"
);

code = code.replace(
  "} = useVehicle360(vehicleId, 'admin');",
  "} = useVehicle360(vehicleId, 'admin', viewType);"
);

// Update title in workspace to show viewType
code = code.replace(
  "Gerenciar Visão 360° - {car.brand} {car.model}",
  "Gerenciar Visão 360° ({viewType === 'exterior' ? 'Exterior' : 'Interior'}) - {car.brand} {car.model}"
);


fs.writeFileSync('src/components/Admin360Module.tsx', code);
