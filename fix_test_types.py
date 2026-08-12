import sys

with open('src/App.test.tsx', 'r') as f:
    text = f.read()

text = text.replace("import { describe, it, expect, vi } from 'vitest';", "import { describe, it, expect, vi } from 'vitest';\nimport '@testing-library/jest-dom';\nimport { Mock } from 'vitest';")

text = text.replace("vehicleService.getVehicleById.mockImplementation", "(vehicleService.getVehicleById as Mock).mockImplementation")
text = text.replace("vehicleService.getVehicleById.mockResolvedValue", "(vehicleService.getVehicleById as Mock).mockResolvedValue")
text = text.replace("vehicleService.getVehicleById.mockRejectedValue", "(vehicleService.getVehicleById as Mock).mockRejectedValue")

with open('src/App.test.tsx', 'w') as f:
    f.write(text)

