const fs = require('fs');
let content = fs.readFileSync('src/components/360/MarkerTrackingEditor.tsx', 'utf8');

content = content.replace(/    id: 'tracker',\n    x: currentPos\.posX,\n    y: currentPos\.posY,\n    content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg bg-indigo-500\/80 animate-pulse flex items-center justify-center text-xs text-white font-bold">{currentPos\.isKeyframe \? 'K' : ''}<\/div>\n  }\] : \[\];/g, '');

content = content.replace(/{!currentPos\?\.visible && currentPos\?\.isKeyframe && \(/, '{!currentActivePos?.visible && currentActivePos?.isKeyframe && (');

content = content.replace(/const currentPos = positions\.find\(p => p\.frameNumber === currentFrame\);/g, 'const currentPos = positions.find(p => p.frameNumber === currentFrame);');

fs.writeFileSync('src/components/360/MarkerTrackingEditor.tsx', content);
