const fs = require('fs');
let code = fs.readFileSync('src/hooks/useVehicle360.ts', 'utf8');

code = code.replace(
  "export function useVehicle360(vehicleId: string, mode: 'public' | 'admin' = 'public') {",
  "export function useVehicle360(vehicleId: string, mode: 'public' | 'admin' = 'public', viewType: 'exterior' | 'interior' = 'exterior') {"
);

code = code.replace(
  "const data = mode === 'public' \n        ? await vehicle360Service.getPublishedProjectByVehicleId(vehicleId)\n        : await vehicle360Service.getProjectByVehicleId(vehicleId);",
  "const data = mode === 'public' \n        ? await vehicle360Service.getPublishedProjectByVehicleId(vehicleId, viewType)\n        : await vehicle360Service.getProjectByVehicleId(vehicleId, viewType);"
);

// We need to add the dependency to useCallback / useEffect
code = code.replace(
  "}, [vehicleId, mode]);",
  "}, [vehicleId, mode, viewType]);"
);

code = code.replace(
  "const proj = await vehicle360Service.createProject(vehicleId);",
  "const proj = await vehicle360Service.createProject(vehicleId, viewType);"
);

fs.writeFileSync('src/hooks/useVehicle360.ts', code);
