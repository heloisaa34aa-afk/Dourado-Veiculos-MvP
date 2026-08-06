const fs = require('fs');
let content = fs.readFileSync('src/services/vehicle360.service.ts', 'utf8');
content = content.replace(
  "      if (imagesError) throw imagesError;\n    }\n  },",
  "      if (imagesError) throw imagesError;\n    }\n    return insertedMarker.id;\n  },"
);
fs.writeFileSync('src/services/vehicle360.service.ts', content);

let hook = fs.readFileSync('src/hooks/useVehicle360.ts', 'utf8');
hook = hook.replace(/active: true,\n      }, images\);/, '      }, images);');
fs.writeFileSync('src/hooks/useVehicle360.ts', hook);
