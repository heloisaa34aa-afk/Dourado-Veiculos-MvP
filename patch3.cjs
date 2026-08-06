const fs = require('fs');
let content = fs.readFileSync('src/components/Admin360Module.tsx', 'utf8');

// fix Car icon
content = content.replace("Car, Vehicle360Hotspot", "Vehicle360Hotspot");
content = content.replace("Car,", "Car as CarIcon,");
content = content.replace(/<Car /g, "<CarIcon ");

// fix getOrCreateProject
content = content.replace(
  "  useEffect(() => {\n    if (!project && !loading) {\n      vehicle360Service.getOrCreateProject(vehicleId).then(reload);\n    }\n  }, [project, loading, vehicleId, reload]);",
  ""
);

// fix FrameUploader
content = content.replace(
  "<FrameUploader vehicleId={vehicleId} onUploadComplete={reload} />",
  "<FrameUploader projectId={project?.id || ''} onUploadComplete={reload} />"
);

fs.writeFileSync('src/components/Admin360Module.tsx', content);
