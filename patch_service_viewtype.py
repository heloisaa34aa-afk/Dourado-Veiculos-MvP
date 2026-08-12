import sys
with open('src/services/vehicle360.service.ts', 'r') as f:
    text = f.read()

text = text.replace("viewType: project.view_type,", "viewType: project.view_type as 'exterior' | 'interior' || 'exterior',")
text = text.replace("viewType: data.view_type,", "viewType: data.view_type as 'exterior' | 'interior' || 'exterior',")

with open('src/services/vehicle360.service.ts', 'w') as f:
    f.write(text)
