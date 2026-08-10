const fs = require('fs');
let code = fs.readFileSync('src/services/vehicle360.service.ts', 'utf8');

code = code.replace(
  /async removeFrame\([\s\S]*?\}\,/,
  "async removeFrame(projectId: string, frameId: string): Promise<void> {\n    const { error } = await supabase.rpc('remove_vehicle_360_frame', {\n      p_project_id: projectId,\n      p_frame_id: frameId\n    });\n    if (error) throw error;\n  },"
);

fs.writeFileSync('src/services/vehicle360.service.ts', code);
