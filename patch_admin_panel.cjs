const fs = require('fs');

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

content = content.replace(
  "useState<'dashboard' | 'vehicles' | 'messages' | 'quotes' | 'users' | 'settings' | 'vehicle360'>('dashboard');",
  "useState<'dashboard' | 'vehicles' | 'messages' | 'quotes' | 'users' | 'settings' | 'vehicle360' | 'trackingLab'>('dashboard');"
);

// Add the TrackingLab button below vehicle360 button
const vehicle360BtnRegex = /<button[\s\S]*?setActiveSection\('vehicle360'\)[\s\S]*?<\/button>/;
const vehicle360BtnMatch = content.match(vehicle360BtnRegex);

if (vehicle360BtnMatch) {
  const newBtn = `
          <button
            onClick={() => setActiveSection('trackingLab')}
            className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 \${
              activeSection === 'trackingLab'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }\`}
          >
            <Activity className={\`w-5 h-5 \${activeSection === 'trackingLab' ? 'text-white' : 'text-slate-400'}\`} />
            Tracking Lab 360
          </button>
`;
  content = content.replace(vehicle360BtnMatch[0], vehicle360BtnMatch[0] + newBtn);
}

// Add Tracking Lab title
content = content.replace(
  "{activeSection === 'vehicle360' && 'Módulo Inspetor Veículo 360°'}",
  "{activeSection === 'vehicle360' && 'Módulo Inspetor Veículo 360°'}\n              {activeSection === 'trackingLab' && 'Tracking Lab 360° (MVP)'}"
);
content = content.replace(
  "{activeSection === 'vehicle360' && 'Gerencie rotação de imagens 360° e marque os pontos de avarias para exibição pública.'}",
  "{activeSection === 'vehicle360' && 'Gerencie rotação de imagens 360° e marque os pontos de avarias para exibição pública.'}\n              {activeSection === 'trackingLab' && 'Validação e otimização do rastreamento de pontos usando TAPIR.'}"
);

// Add Tracking Lab render
content = content.replace(
  "{activeSection === 'vehicle360' && (\n          <Admin360Module cars={cars} />\n        )}",
  "{activeSection === 'vehicle360' && (\n          <Admin360Module cars={cars} />\n        )}\n        {activeSection === 'trackingLab' && (\n          <TrackingLab cars={cars} />\n        )}"
);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
