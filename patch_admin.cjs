const fs = require('fs');
let newContent = fs.readFileSync('src/components/Admin360Module.new.tsx', 'utf8');
fs.writeFileSync('src/components/Admin360Module.tsx', newContent);
fs.unlinkSync('src/components/Admin360Module.new.tsx');
