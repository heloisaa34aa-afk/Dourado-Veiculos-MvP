const fs = require('fs');
let content = fs.readFileSync('src/components/Admin360Module.tsx', 'utf8');

content = content.replace("car: Car as CarIcon,", "car: any,");
fs.writeFileSync('src/components/Admin360Module.tsx', content);
