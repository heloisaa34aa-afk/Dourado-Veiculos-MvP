const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPoiPanel.tsx', 'utf8');

code = code.replace(
  "interface ClientPoiPanelProps {\n  vehicleId: string;\n  embedded?: boolean;\n}",
  "interface ClientPoiPanelProps {\n  vehicleId: string;\n  embedded?: boolean;\n  viewType?: 'exterior' | 'interior';\n}"
);

code = code.replace(
  "export function ClientPoiPanel({ vehicleId, embedded = false }: ClientPoiPanelProps) {",
  "export function ClientPoiPanel({ vehicleId, embedded = false, viewType = 'exterior' }: ClientPoiPanelProps) {"
);

code = code.replace(
  "= useVehicle360(vehicleId, 'public');",
  "= useVehicle360(vehicleId, 'public', viewType);"
);

fs.writeFileSync('src/components/ClientPoiPanel.tsx', code);
