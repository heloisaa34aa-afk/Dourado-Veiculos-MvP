const fs = require('fs');
let content = fs.readFileSync('src/components/Admin360Module.tsx', 'utf8');

content = content.replace(/<Car size=\{20\}/g, "<CarIcon size={20}");
fs.writeFileSync('src/components/Admin360Module.tsx', content);
