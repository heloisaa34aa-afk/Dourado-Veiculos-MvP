const fs = require('fs');
let content = fs.readFileSync('src/components/Admin360Module.tsx', 'utf8');

content = content.replace("import { Vehicle360Hotspot, Vehicle360DamageMarker, Vehicle360MarkerPosition } from '../types';", "import { Car, Vehicle360Hotspot, Vehicle360DamageMarker, Vehicle360MarkerPosition } from '../types';");

content = content.replace(
  "<FrameUploader projectId={project?.id || ''} onUploadComplete={reload} />",
  "<FrameUploader onUpload={uploadFrames} uploading={uploading} progress={uploadProgress} />"
);

content = content.replace("<CarIcon size={20} className=\"text-indigo-600\" />", "<Car size={20} className=\"text-indigo-600\" />");

// wait, the Lucide import: "import { ... Car as CarIcon, ... } from 'lucide-react';"
// Let's replace the lucide import back to normal, but rename Car to CarIcon
content = content.replace("Car as CarIcon,", "Car as CarIcon,"); // it's already CarIcon
// Wait, if it is Car as CarIcon, then the component should use <CarIcon ... />
// Let's check how lucide is imported
let lines = content.split('\n');
let lucideLine = lines.findIndex(l => l.includes('lucide-react'));
if (lucideLine > -1) {
  lines[lucideLine - 1] = lines[lucideLine - 1].replace("Car as CarIcon,", "Car as CarIcon,");
}
content = lines.join('\n');
fs.writeFileSync('src/components/Admin360Module.tsx', content);

