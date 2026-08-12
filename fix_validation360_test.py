import sys

with open('src/utils/validation360.test.ts', 'r') as f:
    text = f.read()

text = text.replace("validation360.checklist360(project, fewFrames)", "validation360.checklist360(project, fewFrames, 'exterior')")
text = text.replace("validation360.checklist360(project, validFrames)", "validation360.checklist360(project, validFrames, 'exterior')")
text = text.replace("Mínimo de 24 frames", "pelo menos 24 imagens")

with open('src/utils/validation360.test.ts', 'w') as f:
    f.write(text)

with open('src/components/Admin360.test.tsx', 'r') as f:
    text = f.read()

text = text.replace("screen.getByText(/frames/)", "screen.getAllByText(/frames/i)[0]")

with open('src/components/Admin360.test.tsx', 'w') as f:
    f.write(text)

