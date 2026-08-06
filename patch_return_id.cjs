const fs = require('fs');
let svc = fs.readFileSync('src/services/vehicle360.service.ts', 'utf8');

svc = svc.replace(
  "async createHotspot(hotspot: Omit<Vehicle360Hotspot, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {",
  "async createHotspot(hotspot: Omit<Vehicle360Hotspot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {"
);
svc = svc.replace(
  "    if (posError) throw posError;\n  },",
  "    if (posError) throw posError;\n    return inserted.id;\n  },"
);

svc = svc.replace(
  "async createDamageMarker(marker: Omit<Vehicle360DamageMarker, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {",
  "async createDamageMarker(marker: Omit<Vehicle360DamageMarker, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {"
);
svc = svc.replace(
  "    if (posError) throw posError;\n  },",
  "    if (posError) throw posError;\n    return inserted.id;\n  },"
);
fs.writeFileSync('src/services/vehicle360.service.ts', svc);

let hook = fs.readFileSync('src/hooks/useVehicle360.ts', 'utf8');
hook = hook.replace(
  "const createHotspot = async (data: {",
  "const createHotspot = async (data: {"
);
// I need to change the hook to return the ID. Let's see how createHotspot is defined in the hook.
