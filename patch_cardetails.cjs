const fs = require('fs');
let code = fs.readFileSync('src/components/CarDetails.tsx', 'utf8');

// Add 360 to images in the thumbnail loop if we can detect it. But CarDetails doesn't know.
// Wait, we can fetch useVehicle360 to see if it exists.
// Wait, doing `useVehicle360` for both exterior and interior in CarDetails might cause extra loads.
// Actually, since CarDetails is displaying the car, it's fine.

if (!code.includes("const exterior360 = useVehicle360(car.id, 'public', 'exterior');")) {
  code = code.replace(
    "export default function CarDetails({ car, onBack, onSubmitLead }: CarDetailsProps) {",
    "import { useVehicle360 } from '../hooks/useVehicle360';\nexport default function CarDetails({ car, onBack, onSubmitLead }: CarDetailsProps) {\n  const exterior360 = useVehicle360(car.id, 'public', 'exterior');\n  const interior360 = useVehicle360(car.id, 'public', 'interior');"
  );
}

// Ensure the import works by placing it at the top, or we can just append it inside if it's already imported.
// Actually `ClientPoiPanel` imports `useVehicle360`. So `useVehicle360` isn't in `CarDetails` yet.

fs.writeFileSync('src/components/CarDetails.tsx', code);
