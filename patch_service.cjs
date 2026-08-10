const fs = require('fs');
let code = fs.readFileSync('src/services/vehicle360.service.ts', 'utf8');

code = code.replace(
  "async getPublishedProjectByVehicleId(vehicleId: string): Promise<Vehicle360Project | null> {",
  "async getPublishedProjectByVehicleId(vehicleId: string, viewType: 'exterior' | 'interior' = 'exterior'): Promise<Vehicle360Project | null> {"
).replace(
  ".eq('vehicle_id', vehicleId)\n      .eq('status', 'completed')",
  ".eq('vehicle_id', vehicleId)\n      .eq('view_type', viewType)\n      .eq('status', 'completed')"
);

code = code.replace(
  "async getProjectByVehicleId(vehicleId: string): Promise<Vehicle360Project | null> {",
  "async getProjectByVehicleId(vehicleId: string, viewType: 'exterior' | 'interior' = 'exterior'): Promise<Vehicle360Project | null> {"
).replace(
  ".eq('vehicle_id', vehicleId)\n      .maybeSingle();",
  ".eq('vehicle_id', vehicleId)\n      .eq('view_type', viewType)\n      .maybeSingle();"
);

code = code.replace(
  "async createProject(vehicleId: string): Promise<Vehicle360Project> {",
  "async createProject(vehicleId: string, viewType: 'exterior' | 'interior' = 'exterior'): Promise<Vehicle360Project> {"
).replace(
  "const existing = await this.getProjectByVehicleId(vehicleId);",
  "const existing = await this.getProjectByVehicleId(vehicleId, viewType);"
).replace(
  ".insert({ vehicle_id: vehicleId, status: 'draft' })",
  ".insert({ vehicle_id: vehicleId, view_type: viewType, status: 'draft' })"
).replace(
  "const concurrentExisting = await this.getProjectByVehicleId(vehicleId);",
  "const concurrentExisting = await this.getProjectByVehicleId(vehicleId, viewType);"
);

// add viewType to the returned mapped object for getProjectByVehicleId and getPublishedProjectByVehicleId
code = code.replace(
  "vehicleId: project.vehicle_id,",
  "vehicleId: project.vehicle_id,\n      viewType: project.view_type,"
);
code = code.replace(
  "vehicleId: project.vehicle_id,", // There are two mapping blocks, one in each get method
  "vehicleId: project.vehicle_id,\n      viewType: project.view_type,"
);

code = code.replace(
  "vehicleId: data.vehicle_id,",
  "vehicleId: data.vehicle_id,\n      viewType: data.view_type,"
);

fs.writeFileSync('src/services/vehicle360.service.ts', code);
