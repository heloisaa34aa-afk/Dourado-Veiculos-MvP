import sys
import re

with open('src/hooks/useVehicle360.ts', 'r') as f:
    text = f.read()

text = text.replace("validation360.checklist360(project, project.frames)", "validation360.checklist360(project, project.frames, viewType)")

# Need to check where removeFrame is and if it's there.
with open('src/hooks/useVehicle360.ts', 'w') as f:
    f.write(text)
